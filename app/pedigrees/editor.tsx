"use client";

import { useEffect, useMemo, useState } from "react";
import PedigreeChart from "../pedigree/PedigreeChart";
import {
  CACACHA, EMPTY_PEDIGREE, HORSE_POSITIONS, cleanHorses,
  encodePedigree, type HorseDetails,
} from "../pedigree/pedigree-data";
import styles from "./editor.module.css";
import { autocompleteAncestors, knownAncestorNames, type PedigreeSource } from "./ancestry";

type Draft = {
  id: string;
  name: string;
  updatedAt: string;
  horses: HorseDetails[];
};

const STORAGE_KEY = "optimus-auction-pedigree-drafts-v1";
const ACTIVE_KEY = "optimus-auction-pedigree-current-v1";

const example: Draft = {
  id: "cacacha",
  name: "Cacacha van het Schaeck",
  updatedAt: "",
  horses: CACACHA,
};

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
  const [activeId, setActiveId] = useState(example.id);
  const [horses, setHorses] = useState<HorseDetails[]>(CACACHA);
  const [origin, setOrigin] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const loaded = readDrafts();
    const remembered = localStorage.getItem(ACTIVE_KEY);
    const selected = loaded.find((draft) => draft.id === remembered) ?? loaded[0];
    setDrafts(loaded);
    setActiveId(selected.id);
    setHorses(selected.horses.map((horse) => ({ ...horse })));
    setOrigin(window.location.origin);
  }, []);

  const shareCode = useMemo(() => encodePedigree(horses), [horses]);
  const viewUrl = origin ? `${origin}/pedigree/view?d=${shareCode}` : "";
  const iframeCode = `<iframe src="${viewUrl}" width="100%" height="620" style="border:0;display:block;width:100%;max-width:100%;overflow:hidden" scrolling="no" loading="lazy" title="Horse pedigree"></iframe>`;
  const title = horses[0].name.trim() || "Untitled pedigree";

  // Look up lineages from other pedigrees saved on this device.
  // The original Cacacha example is available as a fallback.
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
    const draft = drafts.find((item) => item.id === id);
    if (!draft) return;
    if (status === "Unsaved changes" && !window.confirm("Discard unsaved changes?")) return;
    setActiveId(id);
    setHorses(draft.horses.map((horse) => ({ ...horse })));
    setStatus("");
    remember(drafts, id);
  }

  function addDraft() {
    if (status === "Unsaved changes" && !window.confirm("Discard unsaved changes?")) return;
    const id = crypto.randomUUID();
    const newDraft: Draft = {
      id, name: "Untitled pedigree", updatedAt: "",
      horses: EMPTY_PEDIGREE.map((horse) => ({ ...horse })),
    };
    const next = [...drafts, newDraft];
    setDrafts(next);
    setActiveId(id);
    setHorses(newDraft.horses);
    setStatus("New pedigree — not yet saved");
    remember(next, id);
  }

  function saveDraft() {
    const next = drafts.map((draft) => draft.id === activeId ? {
      ...draft,
      name: title,
      updatedAt: new Date().toISOString(),
      horses: horses.map((horse) => ({ ...horse })),
    } : draft);
    setDrafts(next);
    remember(next, activeId);
    setStatus("Saved on this device");
  }

  function deleteDraft() {
    if (!window.confirm(`Delete "${title}" from this browser?`)) return;
    const remaining = drafts.filter((draft) => draft.id !== activeId);
    const next = remaining.length ? remaining : [{
      id: crypto.randomUUID(),
      name: "Untitled pedigree",
      updatedAt: "",
      horses: EMPTY_PEDIGREE.map((horse) => ({ ...horse })),
    }];
    const current = next[0];
    setDrafts(next);
    setActiveId(current.id);
    setHorses(current.horses.map((horse) => ({ ...horse })));
    setStatus("");
    remember(next, current.id);
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

      <section className={styles.toolbar} aria-label="Saved pedigrees">
        <label className={styles.selectLabel}>
          SAVED PEDIGREES
          <select value={activeId} onChange={(event) => selectDraft(event.target.value)}>
            {drafts.map((draft) => <option key={draft.id} value={draft.id}>
              {draft.name} · {formatDate(draft.updatedAt)}
            </option>)}
          </select>
        </label>
        <div className={styles.actions}>
          <button type="button" className={styles.lightButton} onClick={addDraft}>+ NEW</button>
          <button type="button" className={styles.darkButton} onClick={saveDraft}>SAVE</button>
          <button type="button" className={styles.deleteButton} onClick={deleteDraft}>DELETE</button>
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
          <span>Iframe height: 620 px · No internal scrolling</span>
        </div>
        <p>Copy this HTML into the source-code box of your CMS:</p>
        <textarea readOnly spellCheck={false} value={iframeCode} rows={5} aria-label="Iframe HTML code" />
        <div className={styles.exportActions}>
          <button type="button" className={styles.darkButton} onClick={() => copy(iframeCode, "Iframe code")}>COPY IFRAME CODE</button>
          <button type="button" className={styles.lightButton} onClick={() => copy(viewUrl, "Pedigree link")}>COPY LINK</button>
          {viewUrl && <a className={styles.lightButton} href={viewUrl} target="_blank" rel="noreferrer">OPEN PEDIGREE ↗</a>}
        </div>
        {status && <p role="status" className={styles.status}>{status}</p>}
        <p className={styles.note}>
          Auto-fill uses other pedigrees saved in this browser (and the example pedigree). Saved drafts are stored on this device, not shared across devices. The generated iframe contains its own data and works for visitors on any device.
          After changing a pedigree, copy the updated iframe code into your CMS again.
        </p>
      </section>
    </main>
  );
}
