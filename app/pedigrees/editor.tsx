"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import PedigreeChart from "../pedigree/PedigreeChart";
import {
  CACACHA, EMPTY_PEDIGREE, HORSE_POSITIONS, cleanHorses,
  encodePedigree, type HorseDetails,
} from "../pedigree/pedigree-data";
import styles from "./editor.module.css";
import { autocompleteAncestors, knownAncestorNames, type PedigreeSource } from "./ancestry";

type Draft = {
  id: string;
  ownerId?: string;
  publicToken?: string;
  isPublished?: boolean;
  name: string;
  updatedAt: string;
  horses: HorseDetails[];
};

const STORAGE_KEY = "optimus-auction-pedigree-drafts-v1";
const ACTIVE_KEY = "optimus-auction-pedigree-current-v1";
const MIGRATION_KEY = "optimus-auction-pedigree-cloud-imported-v1";

const cloud = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )
  : null;

type CloudRow = {
  id: string;
  owner_id: string;
  public_token: string;
  is_published: boolean;
  name: string;
  updated_at: string;
  horses: unknown;
};

function draftFromCloud(row: CloudRow): Draft | null {
  const horses = cleanHorses(row.horses);
  if (!horses || typeof row.id !== "string") return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    publicToken: row.public_token,
    isPublished: row.is_published,
    name: row.name,
    updatedAt: row.updated_at,
    horses,
  };
}

const example: Draft = {
  id: "cacacha",
  name: "Cacacha van het Schaeck",
  updatedAt: "",
  horses: CACACHA,
};

// Composite keys avoid collisions when two colleagues import the same draft ID.
function draftKey(draft: Draft): string {
  return `${draft.ownerId ?? "local"}:${draft.id}`;
}

function readDrafts(): Draft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [example];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [example];
    const valid = data.slice(0, 100).flatMap((item): Draft[] => {
      if (!item || typeof item !== "object") return [];
      const draft = item as Record<string, unknown>;
      const horses = cleanHorses(draft.horses);
      if (!horses || typeof draft.id !== "string" || draft.id.length > 100) return [];
      return [{
        id: draft.id,
        ownerId: typeof draft.ownerId === "string" ? draft.ownerId : undefined,
        publicToken: typeof draft.publicToken === "string" ? draft.publicToken : undefined,
        isPublished: draft.isPublished === true,
        name: typeof draft.name === "string" ? draft.name.slice(0, 120) : "Untitled",
        updatedAt: typeof draft.updatedAt === "string" ? draft.updatedAt : "",
        horses,
      }];
    });
    return valid.length ? valid : [example];
  } catch {
    return [example];
  }
}

function remember(drafts: Draft[], selected: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    localStorage.setItem(ACTIVE_KEY, selected);
  } catch {
    // A generated link remains usable even when browser storage is disabled.
  }
}

function formatDate(value: string) {
  if (!value) return "Example";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Saved" : date.toLocaleDateString("nl-BE");
}

export default function PedigreeEditor() {
  const [drafts, setDrafts] = useState<Draft[]>([example]);
  const [activeId, setActiveId] = useState(draftKey(example));
  const [horses, setHorses] = useState<HorseDetails[]>(CACACHA);
  const [origin, setOrigin] = useState("");
  const [status, setStatus] = useState("");
  const [dirty, setDirty] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [authNotice, setAuthNotice] = useState("");

  useEffect(() => {
    const loaded = readDrafts();
    const remembered = localStorage.getItem(ACTIVE_KEY);
    const selected = loaded.find((draft) => draftKey(draft) === remembered || draft.id === remembered) ?? loaded[0];
    setDrafts(loaded);
    setActiveId(draftKey(selected));
    setHorses(selected.horses.map((horse) => ({ ...horse })));
    setOrigin(window.location.origin);

    if (!cloud) {
      setAuthNotice("Cloud storage is not configured.");
      return;
    }

    let disposed = false;
    let loadSequence = 0;
    let currentAccount: string | null = null;

    async function loadCloud(accountId: string) {
      const sequence = ++loadSequence;
      setCloudBusy(true);
      setCloudReady(false);
      setAuthNotice("");

      const { data: isMember, error: memberError } =
        await cloud!.rpc("optimus_is_pedigree_member");
      if (disposed || sequence !== loadSequence) return;
      if (memberError || !isMember) {
        setAuthNotice(memberError?.message ?? "This account is not yet authorized for the Optimus pedigree team. Ask a team member for access.");
        setCloudBusy(false);
        return;
      }

      const { data, error } = await cloud!.from("optimus_pedigrees")
        .select("id,owner_id,name,updated_at,horses,public_token,is_published")
        .order("updated_at", { ascending: false })
        .limit(200);

      if (disposed || sequence !== loadSequence) return;
      if (error) {
        setAuthNotice(`Could not load cloud pedigrees: ${error.message}`);
        setCloudBusy(false);
        return;
      }

      let all = ((data ?? []) as CloudRow[])
        .map(draftFromCloud)
        .filter((draft): draft is Draft => draft !== null);

      // Transfer old browser-only drafts once, to the first signed-in account.
      // Cloud copies win if a pedigree with the same ID already exists.
      if (!localStorage.getItem(MIGRATION_KEY)) {
        const legacy = localStorage.getItem(STORAGE_KEY);
        if (legacy) {
          const existingIds = new Set(all.map((draft) => draft.id));
          const missing = readDrafts().filter((draft) => !draft.ownerId && !existingIds.has(draft.id));
          if (missing.length) {
            const { data: imported, error: migrationError } = await cloud!.from("optimus_pedigrees")
              .insert(missing.map((draft) => ({
                id: draft.id,
                owner_id: accountId,
                name: draft.name,
                horses: draft.horses,
                updated_at: draft.updatedAt || new Date().toISOString(),
              })))
              .select("id,owner_id,name,updated_at,horses,public_token,is_published");

            if (disposed || sequence !== loadSequence) return;
            if (migrationError) {
              setAuthNotice(`Browser import failed: ${migrationError.message}. Your browser copies are preserved.`);
              setCloudBusy(false);
              return;
            }
            all = [...all, ...((imported ?? []) as CloudRow[])
              .map(draftFromCloud).filter((draft): draft is Draft => draft !== null)];
          }
        }
        localStorage.setItem(MIGRATION_KEY, "1");
      }

      if (all.length === 0) all = [example];
      const lastSelected = localStorage.getItem(ACTIVE_KEY);
      const current = all.find((draft) => draftKey(draft) === lastSelected || draft.id === lastSelected) ?? all[0];
      setDrafts(all);
      setActiveId(draftKey(current));
      setHorses(current.horses.map((horse) => ({ ...horse })));
      setDirty(false);
      setCloudReady(true);
      setCloudBusy(false);
      remember(all, draftKey(current));
    }

    function changeAccount(id: string | null, email = "") {
      if (currentAccount === id) return;
      currentAccount = id;
      ++loadSequence;
      setUserId(id);
      setUserEmail(email);
      setCloudReady(false);
      if (id) {
        void loadCloud(id);
      } else {
        setCloudBusy(false);
        // Do not leave a different team account's drafts visible after signing out.
        const locals = readDrafts().filter((draft) => !draft.ownerId);
        const safe = locals.length ? locals : [example];
        setDrafts(safe);
        setActiveId(draftKey(safe[0]));
        setHorses(safe[0].horses.map((horse) => ({ ...horse })));
        setDirty(false);
        remember(safe, draftKey(safe[0]));
      }
    }

    void cloud.auth.getSession().then(({ data: { session }, error }) => {
      if (disposed) return;
      if (error) setAuthNotice(error.message);
      changeAccount(session?.user.id ?? null, session?.user.email ?? "");
    });

    const { data: { subscription } } = cloud.auth.onAuthStateChange((event, session) => {
      if (disposed) return;
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "INITIAL_SESSION") {
        changeAccount(session?.user.id ?? null, session?.user.email ?? "");
      }
    });

    return () => {
      disposed = true;
      subscription.unsubscribe();
    };
  }, []);

  const shareCode = useMemo(() => encodePedigree(horses), [horses]);
  const activeDraft = drafts.find((draft) => draftKey(draft) === activeId);
  const staticUrl = origin ? `${origin}/pedigree/view?d=${shareCode}` : "";
  const permanentUrl = origin && activeDraft?.publicToken
    ? `${origin}/pedigree/live/${activeDraft.publicToken}`
    : "";
  const viewUrl = activeDraft?.isPublished && permanentUrl ? permanentUrl : staticUrl;
  const iframeForUrl = (url: string) =>
    `<iframe src="${url}" width="100%" height="650" style="border:0;display:block;width:100%;max-width:100%;overflow:hidden" scrolling="no" loading="lazy" title="Horse pedigree"></iframe>`;
  const iframeCode = iframeForUrl(viewUrl);
  const title = horses[0].name.trim() || "Untitled pedigree";

  // Look up lineages across the shared team library (and the example).
  const library = useMemo<PedigreeSource[]>(
    () => [...drafts, { id: "__cacacha_example__", name: "Cacacha van het Schaeck (example)", horses: CACACHA }],
    [drafts],
  );
  const knownNames = useMemo(
    () => knownAncestorNames(library, activeId),
    [library, activeId],
  );

  function updateHorse(index: number, key: keyof HorseDetails, value: string) {
    const edited = horses.map((horse, i) => i === index ? { ...horse, [key]: value } : { ...horse });
    setDirty(true);
    if (key === "name" && index >= 1 && index <= 6) {
      const result = autocompleteAncestors(edited, index, library, activeId);
      setHorses(result.horses);
      setStatus(result.filled > 0
        ? `Automatically filled ${result.filled} details from ${result.sourceName}. Save to keep changes.`
        : "Unsaved changes");
      return;
    }
    setHorses(edited);
    setStatus("Unsaved changes");
  }

  function selectDraft(id: string) {
    const draft = drafts.find((item) => draftKey(item) === id);
    if (!draft) return;
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    setActiveId(draftKey(draft));
    setHorses(draft.horses.map((horse) => ({ ...horse })));
    setStatus("");
    setDirty(false);
    remember(drafts, id);
  }

  function addDraft() {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    const id = crypto.randomUUID();
    const newDraft: Draft = {
      id, ownerId: userId ?? undefined, name: "Untitled pedigree", updatedAt: "",
      horses: EMPTY_PEDIGREE.map((horse) => ({ ...horse })),
    };
    const next = [...drafts, newDraft];
    setDrafts(next);
    setActiveId(draftKey(newDraft));
    setHorses(newDraft.horses);
    setStatus("New pedigree — not yet saved");
    setDirty(false);
    remember(next, draftKey(newDraft));
  }

  async function saveDraft(): Promise<Draft | null> {
    if (cloudBusy || (userId && !cloudReady)) {
      setStatus("Please wait until the shared pedigrees have loaded.");
      return null;
    }

    const existing = drafts.find((draft) => draftKey(draft) === activeId);
    const ownerId = existing?.ownerId ?? userId ?? undefined;
    const updated: Draft = {
      id: existing?.id ?? crypto.randomUUID(),
      ownerId,
      publicToken: existing?.publicToken,
      isPublished: existing?.isPublished,
      name: title,
      updatedAt: new Date().toISOString(),
      horses: horses.map((horse) => ({ ...horse })),
    };
    const next = existing
      ? drafts.map((draft) => draftKey(draft) === activeId ? updated : draft)
      : [...drafts, updated];
    setDrafts(next);
    setActiveId(draftKey(updated));
    remember(next, draftKey(updated));

    if (!userId || !cloud) {
      setDirty(false);
      setStatus("Saved in this browser only. Sign in for a permanent iframe link.");
      return updated;
    }

    setCloudBusy(true);
    const payload = {
      name: updated.name,
      horses: updated.horses,
      updated_at: updated.updatedAt,
    };
    const outcome = ownerId !== userId
      ? await cloud.from("optimus_pedigrees").update(payload)
          .eq("owner_id", ownerId!).eq("id", updated.id)
          .select("id,public_token,is_published").single()
      : await cloud.from("optimus_pedigrees").upsert({
          ...payload, id: updated.id, owner_id: userId,
        }, { onConflict: "owner_id,id" })
          .select("id,public_token,is_published").single();
    setCloudBusy(false);
    setDirty(Boolean(outcome.error));
    if (outcome.error || !outcome.data) {
      setStatus(`Cloud save failed: ${outcome.error?.message || "Unknown error"}. A browser copy remains; please retry.`);
      return null;
    }
    const confirmed = {
      ...updated,
      publicToken: outcome.data.public_token as string,
      isPublished: outcome.data.is_published as boolean,
    };
    const synced = next.map((draft) => draftKey(draft) === draftKey(updated) ? confirmed : draft);
    setDrafts(synced);
    remember(synced, draftKey(confirmed));
    setStatus("Saved to Supabase ✓ Published iframe links will show these changes.");
    return confirmed;
  }

  async function publishAndCopy(kind: "iframe" | "link") {
    if (!cloud || !userId) {
      const content = kind === "iframe" ? iframeForUrl(staticUrl) : staticUrl;
      await copy(content, kind === "iframe" ? "Static iframe code" : "Static pedigree link");
      setStatus("Copied a fixed snapshot. Sign in to publish a permanently updating link.");
      return;
    }
    // Always save the current form first, so the live link immediately shows
    // exactly what is visible in the editor, including unsaved changes.
    const saved = await saveDraft();
    if (!saved || !saved.ownerId) return;

    setCloudBusy(true);
    const { data, error } = await cloud.from("optimus_pedigrees")
      .update({ is_published: true })
      .eq("owner_id", saved.ownerId)
      .eq("id", saved.id)
      .select("public_token,is_published")
      .single();
    setCloudBusy(false);
    if (error || !data?.public_token) {
      setStatus(`Could not publish pedigree: ${error?.message || "Unknown error"}`);
      return;
    }

    const published: Draft = {
      ...saved,
      publicToken: data.public_token as string,
      isPublished: true,
    };
    setDrafts((previous) => {
      const next = previous.map((draft) =>
        draftKey(draft) === draftKey(published) ? published : draft
      );
      remember(next, draftKey(published));
      return next;
    });

    const url = `${window.location.origin}/pedigree/live/${published.publicToken}`;
    const content = kind === "iframe" ? iframeForUrl(url) : url;
    try {
      await navigator.clipboard.writeText(content);
      setStatus("Published ✓ Permanent link copied. Future saves update this same iframe.");
    } catch {
      setStatus(`Published ✓ Your permanent link: ${url}. Select and copy it manually if needed.`);
    }
  }

  async function deleteDraft() {
    if (cloudBusy || (userId && !cloudReady)) return;
    const selected = drafts.find((draft) => draftKey(draft) === activeId);
    if (!selected) return;
    if (!window.confirm(`Delete "${title}" permanently${userId ? " from the team library" : " from this browser"}?`)) return;

    if (userId && cloud && selected.ownerId) {
      setCloudBusy(true);
      const { error } = await cloud.from("optimus_pedigrees")
        .delete()
        .eq("owner_id", selected.ownerId)
        .eq("id", selected.id);
      setCloudBusy(false);
      if (error) {
        setStatus(`Could not delete team pedigree: ${error.message}`);
        return;
      }
    }

    const remaining = drafts.filter((draft) => draftKey(draft) !== activeId);
    const next = remaining.length ? remaining : [{
      id: crypto.randomUUID(),
      ownerId: userId ?? undefined,
      name: "Untitled pedigree",
      updatedAt: "",
      horses: EMPTY_PEDIGREE.map((horse) => ({ ...horse })),
    }];
    const current = next[0];
    setDrafts(next);
    setActiveId(draftKey(current));
    setHorses(current.horses.map((horse) => ({ ...horse })));
    setStatus(userId ? "Deleted from the shared Supabase library" : "Deleted from this browser");
    setDirty(false);
    remember(next, draftKey(current));
  }

  function refreshShared() {
    if (dirty && !window.confirm("Discard unsaved changes and refresh the team pedigrees?")) return;
    window.location.reload();
  }

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cloud || !loginEmail.trim() || !loginPassword) return;
    setAuthBusy(true);
    setAuthNotice("");
    const { error } = await cloud.auth.signInWithPassword({
      email: loginEmail.trim(), password: loginPassword,
    });
    setAuthBusy(false);
    if (error) setAuthNotice(error.message);
    else {
      setLoginPassword("");
      setAuthNotice("Signed in. Loading your saved pedigrees...");
    }
  }

  async function signUp() {
    if (!cloud || !loginEmail.trim() || loginPassword.length < 6) {
      setAuthNotice("Enter your email and a password of at least 6 characters.");
      return;
    }
    setAuthBusy(true);
    setAuthNotice("");
    const { data, error } = await cloud.auth.signUp({
      email: loginEmail.trim(), password: loginPassword,
    });
    setAuthBusy(false);
    if (error) setAuthNotice(error.message);
    else if (!data.session) {
      setAuthNotice("Check your email to confirm your account, then sign in.");
    } else {
      setAuthNotice("Account created. Loading cloud pedigrees...");
    }
    if (!error) setLoginPassword("");
  }

  async function signOut() {
    if (!cloud) return;
    if (dirty && !window.confirm("Discard unsaved changes and sign out?")) return;
    setAuthBusy(true);
    const { error } = await cloud.auth.signOut();
    setAuthBusy(false);
    if (error) setAuthNotice(error.message);
    else setAuthNotice("Signed out. You can still use local drafts.");
  }

  async function copy(value: string, what: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setStatus(`${what} copied`);
    } catch {
      setStatus("Select and copy the text manually");
    }
  }

  const groups = [
    { label: "Horse", indices: [0] },
    { label: "Parents", indices: [1, 2] },
    { label: "Grandparents", indices: [3, 4, 5, 6] },
    { label: "Great-grandparents", indices: [7, 8, 9, 10, 11, 12, 13, 14] },
  ];

  return (
    <main className={styles.page}>
      <div className={styles.top}>
        <div>
          <p className={styles.overline}>OPTIMUS AUCTION · PEDIGREE BUILDER</p>
          <h1>Pedigree editor</h1>
          <p>Enter names, jumping levels and optional birth years. Matching a saved sire or dam automatically fills its known ancestors.</p>
        </div>
        <a className={styles.back} href="/">↗ BACK TO AUCTION</a>
      </div>

      <section className={styles.account} aria-label="Supabase cloud storage">
        <div>
          <strong>{userId ? "☁ Cloud pedigrees" : "☁ Save pedigrees to Supabase"}</strong>
          <p>{userId
            ? `${userEmail} · ${cloudReady ? "Shared team library — every colleague's pedigrees are visible." : "Loading team pedigrees..."}`
            : "Sign in to access the shared Optimus pedigree library. Team membership is required; your existing local drafts are imported on first sign-in."}</p>
        </div>
        {userId ? (
          <button type="button" className={styles.lightButton} onClick={signOut} disabled={authBusy}>SIGN OUT</button>
        ) : (
          <form className={styles.loginForm} onSubmit={signIn}>
            <input type="email" value={loginEmail} required autoComplete="email" placeholder="Email"
              onChange={(event) => setLoginEmail(event.target.value)} aria-label="Email" />
            <input type="password" value={loginPassword} required autoComplete="current-password" placeholder="Password"
              onChange={(event) => setLoginPassword(event.target.value)} aria-label="Password" />
            <button type="submit" disabled={authBusy || !cloud}>SIGN IN</button>
            <button type="button" disabled={authBusy || !cloud} onClick={signUp}>CREATE ACCOUNT</button>
          </form>
        )}
        {authNotice && <p className={styles.authNotice} role="status">{authNotice}</p>}
      </section>

      <section className={styles.toolbar} aria-label="Saved pedigrees">
        <label className={styles.selectLabel}>
          SAVED PEDIGREES
          <select value={activeId} onChange={(event) => selectDraft(event.target.value)}>
            {drafts.map((draft) => <option key={draftKey(draft)} value={draftKey(draft)}>
              {draft.name} · {formatDate(draft.updatedAt)}
            </option>)}
          </select>
        </label>
        <div className={styles.actions}>
          <button type="button" className={styles.lightButton} onClick={addDraft} disabled={cloudBusy || (Boolean(userId) && !cloudReady)}>+ NEW</button>
          {userId && <button type="button" className={styles.lightButton} onClick={refreshShared} disabled={cloudBusy}>↻ REFRESH</button>}
          <button type="button" className={styles.darkButton} onClick={saveDraft} disabled={cloudBusy}>SAVE {userId ? "TO CLOUD" : "LOCALLY"}</button>
          <button type="button" className={styles.deleteButton} onClick={deleteDraft} disabled={cloudBusy}>DELETE</button>
        </div>
      </section>

      <datalist id="optimus-saved-ancestors">
        {knownNames.map((name) => <option value={name} key={name} />)}
      </datalist>

      <div className={styles.sections}>
        {groups.map((group) => (
          <section key={group.label} className={styles.group}>
            <div className={styles.groupTitle}>
              <h2>{group.label}</h2>
              <span>{group.indices.length} {group.indices.length === 1 ? "horse" : "horses"}</span>
            </div>
            <div className={styles.fields}>
              {group.indices.map((index) => (
                <div className={styles.entry} key={index}>
                  <div className={styles.fieldHint}>{HORSE_POSITIONS[index]}</div>
                  <label className={styles.nameField}>
                    <span>NAME</span>
                    <input type="text" maxLength={120} placeholder="Horse name"
                      list={index >= 1 && index <= 6 ? "optimus-saved-ancestors" : undefined}
                      value={horses[index].name}
                      onChange={(event) => updateHorse(index, "name", event.target.value)} />
                  </label>
                  <label>
                    <span>LEVEL</span>
                    <input type="text" maxLength={30} placeholder="e.g. 1m60"
                      value={horses[index].level}
                      onChange={(event) => updateHorse(index, "level", event.target.value)} />
                  </label>
                  <label className={styles.yearField}>
                    <span>YEAR · OPTIONAL</span>
                    <input type="text" inputMode="numeric" maxLength={8} placeholder="2008"
                      value={horses[index].year}
                      onChange={(event) => updateHorse(index, "year", event.target.value)} />
                  </label>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className={styles.preview}>
        <div className={styles.groupTitle}>
          <h2>Live preview</h2>
          <span>Without heading · Desktop and mobile</span>
        </div>
        <div className={styles.previewInner}><PedigreeChart horses={horses} /></div>
      </section>

      <section className={styles.export}>
        <div className={styles.groupTitle}>
          <h2>Embed on your website</h2>
          <span>Permanent Supabase link · Updates after every save</span>
        </div>
        <p>{userId
          ? activeDraft?.isPublished
            ? "This iframe always shows the latest saved pedigree. You only need to paste it into Pweb once."
            : "Click PUBLISH & COPY IFRAME to save your pedigree and generate its permanent link."
          : "Sign in to Supabase to generate a permanent iframe. Without sign-in the link is only a static snapshot."}</p>
        <textarea readOnly spellCheck={false} value={iframeCode} rows={5} aria-label="Iframe HTML code" />
        <div className={styles.exportActions}>
          <button type="button" className={styles.darkButton} disabled={cloudBusy || (Boolean(userId) && !cloudReady)}
            onClick={() => void publishAndCopy("iframe")}>
            {userId ? "PUBLISH & COPY IFRAME" : "COPY STATIC IFRAME"}
          </button>
          <button type="button" className={styles.lightButton} disabled={cloudBusy || (Boolean(userId) && !cloudReady)}
            onClick={() => void publishAndCopy("link")}>
            {userId ? "COPY LIVE LINK" : "COPY STATIC LINK"}
          </button>
          {viewUrl && <a className={styles.lightButton} href={viewUrl} target="_blank" rel="noreferrer">OPEN PEDIGREE ↗</a>}
        </div>
        {status && <p role="status" className={styles.status}>{status}</p>}
        <p className={styles.note}>
          Signed-in Optimus team members can view and edit all pedigrees in the shared Supabase library. Use REFRESH to load changes made by colleagues.
          Without sign-in, saves are browser-only. Auto-fill uses all team pedigrees and the example pedigree. The generated iframe contains its own data and works for visitors on any device.
          Once published, the iframe's URL remains the same forever. Just press SAVE TO CLOUD after editing, and reload the horse page to see the latest pedigree. Older ?d= snapshot embeds must be replaced one final time.
        </p>
      </section>
    </main>
  );
}
