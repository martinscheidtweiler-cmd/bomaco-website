export type HorseDetails = {
  name: string;
  level: string;
  year: string;
};

export const PEDIGREE_COUNT = 15;

const entry = (name = "", year = "", level = ""): HorseDetails => ({
  name,
  year,
  level,
});

export const CACACHA: HorseDetails[] = [
  entry("Cacacha van het Schaeck", "2008"),
  entry("Bamako de Muze", "2001"),
  entry("Fortis Fortuna", "2005"),
  entry("Darco", "1980"),
  entry("Fragance de Chalus", "1993"),
  entry("Quidam de Revel", "1982"),
  entry("Coco 't Laerhof Z", "2000"),
  entry("Lugano van la Roche", "1963"),
  entry("Ocoucha", "1968"),
  entry("Jalisco B", "1975"),
  entry("Nifrane", "1979"),
  entry("Jalisco B", "1975"),
  entry("Dirka", "1969"),
  entry("Carthago Z", "1987"),
  entry("Lhasa", "1988"),
];

export const EMPTY_PEDIGREE: HorseDetails[] =
  Array.from({ length: PEDIGREE_COUNT }, () => entry());

export const HORSE_POSITIONS = [
  "Horse", "Sire", "Dam", "Sire's sire", "Sire's dam", "Dam's sire",
  "Dam's dam", "Sire's sire's sire", "Sire's sire's dam",
  "Sire's dam's sire", "Sire's dam's dam", "Dam's sire's sire",
  "Dam's sire's dam", "Dam's dam's sire", "Dam's dam's dam",
];

export function cleanHorses(value: unknown): HorseDetails[] | null {
  if (!Array.isArray(value) || value.length !== PEDIGREE_COUNT) return null;
  const result: HorseDetails[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const raw = item as Record<string, unknown>;
    if (
      typeof raw.name !== "string" || raw.name.length > 120 ||
      typeof raw.year !== "string" || raw.year.length > 8 ||
      typeof raw.level !== "string" || raw.level.length > 30
    ) return null;
    result.push({
      name: raw.name,
      year: raw.year,
      level: raw.level,
    });
  }
  return result;
}

/** Self-contained, portable URL: no public write API or database needed. */
export function encodePedigree(horses: HorseDetails[]): string {
  const data = JSON.stringify({ v: 1, h: horses });
  const bytes = new TextEncoder().encode(data);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodePedigree(code: string | undefined): HorseDetails[] | null {
  if (!code || code.length > 10000 || !/^[a-zA-Z0-9_-]+$/.test(code)) return null;
  try {
    const padded = code.replace(/-/g, "+").replace(/_/g, "/")
      .padEnd(Math.ceil(code.length / 4) * 4, "=");
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as { v?: unknown; h?: unknown };
    return obj.v === 1 ? cleanHorses(obj.h) : null;
  } catch {
    return null;
  }
}
