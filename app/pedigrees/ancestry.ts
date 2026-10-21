import type { HorseDetails } from "../pedigree/pedigree-data";

export type PedigreeSource = {
  id: string;
  name: string;
  horses: HorseDetails[];
};

const TOTAL_HORSES = 15;

export function normalizeHorseName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bv\/?h\b/g, "van het")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function descendants(
  sourceHorses: HorseDetails[],
  sourceIndex: number,
  targetIndex: number,
): { sourceIndex: number; targetIndex: number; horse: HorseDetails }[] {
  const output: { sourceIndex: number; targetIndex: number; horse: HorseDetails }[] = [];
  const queue = [{ sourceIndex, targetIndex }];

  while (queue.length) {
    const current = queue.shift()!;
    for (let branch = 1; branch <= 2; branch++) {
      const from = current.sourceIndex * 2 + branch;
      const to = current.targetIndex * 2 + branch;
      if (from >= TOTAL_HORSES || to >= TOTAL_HORSES) continue;
      const horse = sourceHorses[from];
      if (!horse) continue;
      output.push({ sourceIndex: from, targetIndex: to, horse });
      queue.push({ sourceIndex: from, targetIndex: to });
    }
  }
  return output;
}

export function autocompleteAncestors(
  horses: HorseDetails[],
  nameIndex: number,
  library: PedigreeSource[],
  currentDraftId: string,
): { horses: HorseDetails[]; filled: number; sourceName?: string } {
  if (nameIndex < 1 || nameIndex > 6) return { horses, filled: 0 };
  const key = normalizeHorseName(horses[nameIndex]?.name || "");
  if (key.length < 3) return { horses, filled: 0 };

  let best: {
    source: PedigreeSource;
    index: number;
    score: number;
    entries: ReturnType<typeof descendants>;
  } | null = null;

  for (const source of library) {
    if (source.id === currentDraftId) continue;
    for (let index = 0; index < 7; index++) {
      if (normalizeHorseName(source.horses[index]?.name || "") !== key) continue;
      const entries = descendants(source.horses, index, nameIndex);
      const score = entries.reduce((count, entry) => count + (entry.horse.name.trim() ? 1 : 0), 0);
      // Match a horse that actually has known ancestors; prefer fullest lineage.
      if (score > 0 && (!best || score > best.score)) {
        best = { source, index, score, entries };
      }
    }
  }

  if (!best) return { horses, filled: 0 };
  const chosen = best as {
    source: PedigreeSource;
    index: number;
    score: number;
    entries: ReturnType<typeof descendants>;
  };
  let filled = 0;
  const next = horses.map((horse) => ({ ...horse }));
  const matchingHorse = chosen.source.horses[chosen.index];

  // Keep manually entered details; only complete missing information.
  for (const field of ["year", "level"] as const) {
    if (!next[nameIndex][field].trim() && matchingHorse[field].trim()) {
      next[nameIndex][field] = matchingHorse[field];
      filled++;
    }
  }

  for (const { targetIndex, horse } of chosen.entries) {
    for (const field of ["name", "year", "level"] as const) {
      if (!next[targetIndex][field].trim() && horse[field].trim()) {
        next[targetIndex][field] = horse[field];
        filled++;
      }
    }
  }

  return { horses: next, filled, sourceName: chosen.source.name };
}

export function knownAncestorNames(library: PedigreeSource[], currentDraftId: string): string[] {
  const distinct = new Map<string, string>();
  for (const source of library) {
    if (source.id === currentDraftId) continue;
    for (let i = 0; i < 7; i++) {
      const horse = source.horses[i];
      if (!horse?.name.trim()) continue;
      const normalized = normalizeHorseName(horse.name);
      if (!distinct.has(normalized) && descendants(source.horses, i, 1).some(d => d.horse.name.trim())) {
        distinct.set(normalized, horse.name.trim());
      }
    }
  }
  return [...distinct.values()].sort((a, b) => a.localeCompare(b));
}
