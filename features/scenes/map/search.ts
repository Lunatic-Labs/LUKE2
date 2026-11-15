/**
 * Search over the campus places: what a visitor types on the Find screen,
 * matched against names, aliases and departments.
 */
import { CAMPUS_PLACES, type CampusPlace } from "./buildings";

/** Combining accent marks, as left behind once `normalize("NFKD")` splits them off. */
const ACCENTS = /[\u0300-\u036f]/g;

/** Marks that sit inside a word: "Veterans'" is "veterans", "A.M." is "am". */
const JOINING = /['\u2018\u2019`.]/g;

/** Anything else that isn't a letter or digit separates words, hyphens included. */
const SEPARATING = /[^a-z0-9]+/g;

/**
 * Text reduced to the form search compares: lowercase, no accents, "&" read as
 * "and", and words separated by single spaces. Applied to both the query and
 * everything it's matched against, so "Bison Hall & Bison Inn", "bison hall and
 * bison inn" and "BISON-HALL AND BISON INN" all come out the same.
 */
export function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(ACCENTS, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(JOINING, "")
    .replace(SEPARATING, " ")
    .trim();
}

/** Where a searchable term came from, best first; ranking and the match hint both use it. */
export const TERM_SOURCES = ["name", "alias", "department", "acronym"] as const;
export type TermSource = (typeof TERM_SOURCES)[number];

/** One thing a place can be found by. */
export interface IndexTerm {
  /** Normalized, as a query is compared against it. */
  text: string;
  /** `text` split into words, for word-prefix and typo matching. */
  words: string[];
  source: TermSource;
  /** As written in `places.json`, for showing which term matched. */
  original: string;
}

export interface IndexedPlace {
  place: CampusPlace;
  terms: IndexTerm[];
}

/** Words an acronym skips: "Bison Hall and Bison Inn" is "bhbi", not "bhabi". */
const ACRONYM_SKIPS = new Set(["the", "and", "of"]);

/**
 * Shorter acronyms would outrank real words: "sh" for Sewell Hall would come
 * before Shamblin Theatre for a visitor who has typed "sh" so far.
 */
const MIN_ACRONYM_LETTERS = 3;

/** First letters of a name's words, or null when that's too short to be useful. */
export function acronym(name: string): string | null {
  const letters = normalize(name)
    .split(" ")
    .filter((word) => word && !ACRONYM_SKIPS.has(word))
    .map((word) => word[0])
    .join("");
  return letters.length >= MIN_ACRONYM_LETTERS ? letters : null;
}

/**
 * Every place with the terms it can be found by, worked out once rather than
 * on every keystroke. A term that comes from more than one source keeps only
 * the best one, so "sac" is the Student Activities Center's alias, not also
 * its acronym.
 */
export function buildIndex(places: CampusPlace[]): IndexedPlace[] {
  return places.map((place) => {
    const candidates: [TermSource, string][] = [
      ["name", place.name],
      ...place.aliases.map((alias): [TermSource, string] => ["alias", alias]),
      ...(place.departments ?? []).map((department): [TermSource, string] => ["department", department]),
    ];
    const short = acronym(place.name);
    if (short) candidates.push(["acronym", short]);

    const terms: IndexTerm[] = [];
    const seen = new Set<string>();
    for (const [source, original] of candidates) {
      const text = normalize(original);
      if (!text || seen.has(text)) continue;
      seen.add(text);
      terms.push({ text, words: text.split(" "), source, original });
    }
    return { place, terms };
  });
}

/** The search index for the campus map. */
export const PLACE_INDEX = buildIndex(CAMPUS_PLACES);

/**
 * How well a place matched, best first. Every result in an earlier tier comes
 * before every result in a later one.
 *
 * - `exact`: the whole query is a name or alias ("the caf")
 * - `prefix`: a name or alias starts with the query ("mcf" for McFarland)
 * - `department`: each query word starts a word of a department ("history")
 * - `word-prefix`: each query word starts a word of one name, alias or acronym
 *   ("bison inn", "bcc")
 * - `typo`: each query word is within a few letters of a word of one name,
 *   alias, department or acronym ("beeman"), or the query matches once spaces
 *   are ignored ("checkin" for "check in")
 */
export const RANK_TIERS = ["exact", "prefix", "department", "word-prefix", "typo"] as const;
export type RankTier = (typeof RANK_TIERS)[number];

export interface SearchResult {
  place: CampusPlace;
  /** The term it matched, for showing why it's in the results. */
  matched: IndexTerm;
  tier: RankTier;
}

/** Whether every query word starts some word of the term. */
function wordsStartWith(term: IndexTerm, queryWords: string[]): boolean {
  return queryWords.every((queryWord) => term.words.some((word) => word.startsWith(queryWord)));
}

/**
 * Edits a query word of this length may be off by: none for short words, where
 * one wrong letter is usually a different word, more for long ones.
 */
export function allowedTypos(word: string): number {
  if (word.length >= 8) return 2;
  if (word.length >= 4) return 1;
  return 0;
}

/**
 * Edit distance between two words, counting a swap of neighbouring letters as
 * one edit ("baemna" is one from "beaman"). Gives up and returns `max + 1` once
 * the words can't be within `max` of each other.
 */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  // Rows of the distance table: two back, one back and the one being filled.
  let older: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowBest = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, older[j - 2] + 1);
      }
      current.push(value);
      rowBest = Math.min(rowBest, value);
    }
    if (rowBest > max) return max + 1;
    older = previous;
    previous = current;
  }
  return previous[b.length];
}

/**
 * Whether a query word is a near miss for a term word: close to the whole
 * word, or to as much of it as has been typed ("mcfr" while typing "mcfarland").
 */
function nearMiss(queryWord: string, word: string): boolean {
  const max = allowedTypos(queryWord);
  if (max === 0) return false;
  return (
    editDistance(queryWord, word, max) <= max ||
    editDistance(queryWord, word.slice(0, queryWord.length), max) <= max
  );
}

/** Whether every query word starts, or nearly matches, some word of the term. */
function wordsNearlyMatch(term: IndexTerm, queryWords: string[]): boolean {
  return queryWords.every((queryWord) =>
    term.words.some((word) => word.startsWith(queryWord) || nearMiss(queryWord, word)),
  );
}

const withoutSpaces = (text: string) => text.replace(/ /g, "");

/** The best tier a term reaches for this query, or null if it doesn't match. */
function tierFor(term: IndexTerm, query: string, queryWords: string[]): RankTier | null {
  const nameOrAlias = term.source === "name" || term.source === "alias";
  if (nameOrAlias && term.text === query) return "exact";
  if (nameOrAlias && term.text.startsWith(query)) return "prefix";
  if (wordsStartWith(term, queryWords)) return term.source === "department" ? "department" : "word-prefix";
  // A missing or extra space ("checkin", "bell tower" as "belltower").
  if (withoutSpaces(term.text).startsWith(withoutSpaces(query))) return "typo";
  if (wordsNearlyMatch(term, queryWords)) return "typo";
  return null;
}

const tierRank = (tier: RankTier) => RANK_TIERS.indexOf(tier);
const sourceRank = (term: IndexTerm) => TERM_SOURCES.indexOf(term.source);

/**
 * Places matching what a visitor typed, best first: by tier, then by where the
 * match came from (a name before an alias, before a department, before an
 * acronym), then alphabetically. Each place appears once, at its best match.
 * An empty query matches nothing.
 */
export function searchPlaces(query: string, index: IndexedPlace[] = PLACE_INDEX): SearchResult[] {
  const normalized = normalize(query);
  if (!normalized) return [];
  const queryWords = normalized.split(" ");

  const results: SearchResult[] = [];
  for (const { place, terms } of index) {
    let best: SearchResult | null = null;
    for (const term of terms) {
      const tier = tierFor(term, normalized, queryWords);
      if (!tier) continue;
      const better =
        !best ||
        tierRank(tier) < tierRank(best.tier) ||
        (tier === best.tier && sourceRank(term) < sourceRank(best.matched));
      if (better) best = { place, matched: term, tier };
    }
    if (best) results.push(best);
  }

  return results.sort(
    (a, b) =>
      tierRank(a.tier) - tierRank(b.tier) ||
      sourceRank(a.matched) - sourceRank(b.matched) ||
      a.place.name.localeCompare(b.place.name),
  );
}
