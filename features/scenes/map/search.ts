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
 * - `typo`: close spelling; not matched yet
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

/** The best tier a term reaches for this query, or null if it doesn't match. */
function tierFor(term: IndexTerm, query: string, queryWords: string[]): RankTier | null {
  const nameOrAlias = term.source === "name" || term.source === "alias";
  if (nameOrAlias && term.text === query) return "exact";
  if (nameOrAlias && term.text.startsWith(query)) return "prefix";
  if (!wordsStartWith(term, queryWords)) return null;
  return term.source === "department" ? "department" : "word-prefix";
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
