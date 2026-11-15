import { CAMPUS_PLACES, type CampusPlace } from "./buildings";
import {
  acronym,
  allowedTypos,
  buildIndex,
  editDistance,
  MAX_SUGGESTIONS,
  matchHint,
  normalize,
  PLACE_INDEX,
  RANK_TIERS,
  searchPlaces,
  significantWords,
  suggestPlaces,
} from "./search";

describe("normalize", () => {
  it.each([
    ["lowercases", "Beaman Library", "beaman library"],
    ["reads & as and", "Bison Hall & Bison Inn", "bison hall and bison inn"],
    ["treats a hyphen as a space", "check-in", "check in"],
    ["treats a dash or slash as a space", "Huston–Marsh/Griffith", "huston marsh griffith"],
    ["drops accents", "Café", "cafe"],
    ["joins across an apostrophe", "Veterans' Resource Center", "veterans resource center"],
    ["joins across a curly apostrophe", "Veterans’ Resource Center", "veterans resource center"],
    ["joins across periods", "A.M. Burton", "am burton"],
    ["drops other punctuation", "History, Politics, and Philosophy", "history politics and philosophy"],
    ["collapses and trims spaces", "  the   caf  ", "the caf"],
    ["keeps digits", "Room 204", "room 204"],
  ])("%s", (_, input, expected) => {
    expect(normalize(input)).toBe(expected);
  });

  it("returns an empty string for blank or punctuation-only input", () => {
    expect(normalize("")).toBe("");
    expect(normalize("   ")).toBe("");
    expect(normalize("--?!")).toBe("");
  });

  it("gives the same result when applied twice", () => {
    // The index normalizes names once and the query on every keystroke; both
    // must land on the same form.
    for (const place of CAMPUS_PLACES) {
      const once = normalize(place.name);
      expect(normalize(once)).toBe(once);
    }
  });

  it("leaves every alias as it is", () => {
    // Aliases are stored lowercase and trimmed already; normalizing one
    // shouldn't change it, or the alias would never match what's typed.
    const changed = CAMPUS_PLACES.flatMap((place) =>
      place.aliases.filter((alias) => normalize(alias) !== alias).map((alias) => `${place.id}: ${alias}`),
    );
    expect(changed).toEqual([]);
  });
});

describe("acronym", () => {
  it.each([
    ["Bennett Campus Center", "bcc"],
    ["Fields Engineering Center", "fec"],
    ["Bison Hall & Bison Inn", "bhbi"],
    ["Bison Square & Osman Fountain", "bsof"],
  ])("turns %s into %s", (name, expected) => {
    expect(acronym(name)).toBe(expected);
  });

  it.each(["Ward Hall", "The Village", "Gymnasium"])("gives %s none, being too short", (name) => {
    expect(acronym(name)).toBeNull();
  });
});

describe("buildIndex", () => {
  const place = (overrides: Partial<CampusPlace> = {}): CampusPlace => ({
    id: "test-hall",
    name: "Test Hall",
    kind: "building",
    category: "academics",
    aliases: [],
    map: { x: 0.5, y: 0.5 },
    geo: { lat: 36.105, lng: -86.798 },
    ...overrides,
  });
  const terms = (overrides: Partial<CampusPlace>) =>
    buildIndex([place(overrides)])[0].terms.map(({ text, source }) => [text, source]);

  it("indexes the name, then aliases, departments and the acronym", () => {
    expect(
      terms({ name: "Rose Music Center", aliases: ["the music building"], departments: ["School of Music"] }),
    ).toEqual([
      ["rose music center", "name"],
      ["the music building", "alias"],
      ["school of music", "department"],
      ["rmc", "acronym"],
    ]);
  });

  it("keeps the original text and splits each term into words", () => {
    const [, department] = buildIndex([place({ departments: ["Bible & Theology"] })])[0].terms;
    expect(department).toEqual({
      text: "bible and theology",
      words: ["bible", "and", "theology"],
      source: "department",
      original: "Bible & Theology",
    });
  });

  it("keeps a repeated term once, from its best source", () => {
    expect(terms({ name: "Rose Music Center", aliases: ["rmc"], departments: ["Rose Music Center"] })).toEqual([
      ["rose music center", "name"],
      ["rmc", "alias"],
    ]);
  });
});

describe("PLACE_INDEX", () => {
  it("covers every place, in order", () => {
    expect(PLACE_INDEX.map(({ place }) => place.id)).toEqual(CAMPUS_PLACES.map((place) => place.id));
  });

  it("stores every term normalized and non-empty", () => {
    for (const { terms } of PLACE_INDEX) {
      for (const term of terms) {
        expect(term.text).not.toBe("");
        expect(normalize(term.text)).toBe(term.text);
        expect(term.words.join(" ")).toBe(term.text);
      }
    }
  });

  it("keeps the Student Activities Center's sac as an alias, not also as an acronym", () => {
    const sac = PLACE_INDEX.find(({ place }) => place.id === "student-activities-center")!;
    expect(sac.terms.filter((term) => term.text === "sac").map((term) => term.source)).toEqual(["alias"]);
  });
});

describe("searchPlaces", () => {
  /** The ids found for a query, best first. */
  const ids = (query: string) => searchPlaces(query).map((result) => result.place.id);
  const first = (query: string) => searchPlaces(query)[0];

  it.each(["", "   ", "?!"])("finds nothing for %j", (query) => {
    expect(searchPlaces(query)).toEqual([]);
  });

  it("finds an alias typed in full (exact)", () => {
    expect(first("the caf")).toMatchObject({ tier: "exact", place: { id: "bennett-campus-center" } });
    expect(first("The Caf").place.id).toBe("bennett-campus-center");
  });

  it("finds a name or alias from its start (prefix)", () => {
    expect(first("mcf")).toMatchObject({ tier: "prefix", place: { id: "mcfarland-science-center" } });
  });

  it("finds a department", () => {
    expect(first("history")).toMatchObject({
      tier: "department",
      place: { id: "ezell-center" },
      matched: { original: "History, Politics, and Philosophy" },
    });
  });

  it("finds a place from the start of each word (word prefix)", () => {
    expect(first("bison inn")).toMatchObject({ tier: "word-prefix", place: { id: "bison-hall-and-bison-inn" } });
    expect(first("bcc")).toMatchObject({ tier: "word-prefix", matched: { source: "acronym" } });
  });

  it("needs every query word to match", () => {
    expect(ids("beaman zzz")).toEqual([]);
  });

  it("puts every result of a better tier first", () => {
    const tiers = searchPlaces("music").map((result) => RANK_TIERS.indexOf(result.tier));
    expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
    // McMeen's alias "music building" starts with "music"; the Contemporary
    // Music House only has it as a later word of its name.
    const music = ids("music");
    expect(music.indexOf("thomas-james-mcmeen-music-center")).toBeLessThan(
      music.indexOf("contemporary-music-house"),
    );
  });

  it("ranks a department ahead of a later word in a name", () => {
    // A deliberate consequence of the tiers: "eng" starts the English
    // department (Ezell) and the College of Engineering (Fields), so both land
    // in the department tier, where alphabetical order decides.
    expect(ids("eng").slice(0, 2)).toEqual(["ezell-center", "fields-engineering-center"]);
  });

  it("lists each place once, at its best match", () => {
    const found = searchPlaces("bison");
    expect(new Set(found.map((result) => result.place.id)).size).toBe(found.length);
    const hall = found.find((result) => result.place.id === "bison-hall-and-bison-inn");
    expect(hall).toMatchObject({ tier: "prefix", matched: { source: "name" } });
  });

  it("returns every place that shares an alias", () => {
    expect(ids("health sciences building").slice(0, 2).sort()).toEqual([
      "a-m-burton-health-sciences-center",
      "nursing-and-health-sciences-center",
    ]);
  });

  it("breaks ties by where the match came from, then alphabetically", () => {
    const place = (id: string, name: string, aliases: string[] = []): CampusPlace => ({
      id,
      name,
      kind: "building",
      category: "academics",
      aliases,
      map: { x: 0.5, y: 0.5 },
      geo: { lat: 36.105, lng: -86.798 },
    });
    // All three match "rose" in the prefix tier: two by name, one by alias.
    const index = buildIndex([
      place("by-alias", "Zed Hall", ["rose garden"]),
      place("rose-hall", "Rose Hall"),
      place("rose-annex", "Rose Annex"),
    ]);
    expect(searchPlaces("rose", index).map((result) => result.place.id)).toEqual([
      "rose-annex",
      "rose-hall",
      "by-alias",
    ]);
  });
});

describe("allowedTypos", () => {
  it.each([
    ["gym", 0],
    ["caf", 0],
    ["bison", 1],
    ["shamblin", 2],
  ])("allows %s %i edits", (word, expected) => {
    expect(allowedTypos(word)).toBe(expected);
  });
});

describe("editDistance", () => {
  it.each([
    ["beaman", "beaman", 0],
    ["beeman", "beaman", 1],
    ["beman", "beaman", 1],
    ["beamman", "beaman", 1],
    ["baeman", "beaman", 1],
    ["mcfralnd", "mcfarland", 2],
  ])("puts %s at %i from %s", (a, b, expected) => {
    expect(editDistance(a, b, 3)).toBe(expected);
  });

  it("gives up past the limit", () => {
    expect(editDistance("beaman", "shamblin", 1)).toBe(2);
    expect(editDistance("a", "abcdef", 2)).toBe(3);
  });
});

describe("searchPlaces typo tier", () => {
  const first = (query: string) => searchPlaces(query)[0];

  it.each([
    ["beeman", "beaman-library"],
    ["baeman library", "beaman-library"],
    ["mcfralnd", "mcfarland-science-center"],
    ["shamblim", "shamblin-theatre"],
  ])("finds %s despite the typo", (query, id) => {
    expect(first(query)).toMatchObject({ tier: "typo", place: { id } });
  });

  it("allows a typo in a word that's only partly typed", () => {
    expect(first("mcfr")).toMatchObject({ tier: "typo", place: { id: "mcfarland-science-center" } });
  });

  it("finds a phrase typed without its space", () => {
    expect(first("checkin")).toMatchObject({ tier: "typo", place: { id: "george-shinn-center" } });
  });

  it("allows no typos in short words", () => {
    expect(searchPlaces("gim")).toEqual([]);
  });

  it("ranks typo matches after real ones", () => {
    // "ward" is Ward Hall's alias, and one edit from "hard", the start of Harding.
    expect(searchPlaces("ward").map((result) => [result.place.id, result.tier])).toEqual([
      ["ward-hall", "exact"],
      ["harding-hall", "typo"],
    ]);
  });
});

describe("significantWords", () => {
  it.each([
    [["psychology", "department"], ["psychology"]],
    [["the", "ezell", "hall"], ["ezell"]],
    [["fields", "building"], ["fields"]],
    [["hall"], ["hall"]],
    [["the", "center"], ["the", "center"]],
  ])("keeps %j as %j", (words, expected) => {
    expect(significantWords(words)).toEqual(expected);
  });
});

describe("searchPlaces filler words", () => {
  const first = (query: string) => searchPlaces(query)[0];

  it("finds a department named with the word department", () => {
    expect(first("psychology department")).toMatchObject({
      tier: "department",
      place: { id: "ezell-center" },
    });
  });

  it("finds a place called the wrong kind of building", () => {
    expect(first("ezell hall")?.place.id).toBe("ezell-center");
    expect(first("fields building")?.place.id).toBe("fields-engineering-center");
  });

  it("lists every hall for a query of only filler", () => {
    const halls = CAMPUS_PLACES.filter((place) => normalize(place.name).split(" ").includes("hall"));
    expect(searchPlaces("hall").map((result) => result.place.id).sort()).toEqual(
      halls.map((place) => place.id).sort(),
    );
  });

  it("still matches a whole query that includes filler", () => {
    expect(first("the caf")).toMatchObject({ tier: "exact", place: { id: "bennett-campus-center" } });
    expect(first("johnson hall")).toMatchObject({ tier: "exact", place: { id: "johnson-hall" } });
    expect(first("the village")).toMatchObject({ tier: "exact", place: { id: "the-village" } });
  });
});

describe("searchPlaces offices", () => {
  const place = (overrides: Partial<CampusPlace>): CampusPlace => ({
    id: "test",
    name: "Test",
    kind: "building",
    category: "admin",
    aliases: [],
    map: { x: 0.5, y: 0.5 },
    geo: { lat: 36.105, lng: -86.798 },
    ...overrides,
  });
  const index = buildIndex([
    place({ id: "crisman", name: "Crisman Administration Building" }),
    place({ id: "registrar", name: "Registrar", kind: "office", withinBuildingId: "crisman", aliases: ["transcripts"] }),
    place({ id: "lost", name: "Lost Office", kind: "office", withinBuildingId: "nowhere" }),
  ]);

  it("returns an office with the building it's inside", () => {
    const [registrar] = searchPlaces("transcripts", index);
    expect(registrar).toMatchObject({ place: { id: "registrar" }, within: { id: "crisman" } });
  });

  it("gives buildings no within", () => {
    const [crisman] = searchPlaces("crisman", index);
    expect(crisman.place.id).toBe("crisman");
    expect(crisman).not.toHaveProperty("within");
  });

  it("leaves within out when the building can't be found", () => {
    // validatePlaces rejects this in places.json; search shouldn't crash on it.
    const [lost] = searchPlaces("lost office", index);
    expect(lost.place.id).toBe("lost");
    expect(lost).not.toHaveProperty("within");
  });
});

describe("match hints", () => {
  const hint = (query: string) => searchPlaces(query)[0]?.hint;

  it("gives no hint for a match by name, even with a typo", () => {
    expect(hint("beaman library")).toBeNull();
    expect(hint("beeman")).toBeNull();
  });

  it("shows the alias that matched", () => {
    expect(hint("the caf")).toBe("the caf");
  });

  it("shows a department as written", () => {
    expect(hint("history")).toBe("History, Politics, and Philosophy");
  });

  it("shows an acronym in capitals", () => {
    expect(hint("bcc")).toBe("BCC");
  });

  it("is what matchHint gives for the matched term", () => {
    for (const result of searchPlaces("music")) {
      expect(result.hint).toBe(matchHint(result.matched));
    }
  });
});

describe("suggestPlaces", () => {
  const ids = (query: string) => suggestPlaces(query).map((result) => result.place.id);

  it("suggests close matches that search alone misses", () => {
    // "bemen" is two edits from "beaman"; search allows one for a 5-letter word.
    expect(searchPlaces("bemen")).toEqual([]);
    expect(ids("bemen")[0]).toBe("beaman-library");
  });

  it("allows a typo in a three-letter word", () => {
    expect(searchPlaces("gim")).toEqual([]);
    // Whole-word near misses ("gym") come before ones against the start of a
    // longer word ("gymnasium", or "girls" in Elam's "girls dorm").
    expect(ids("gim")).toEqual(["mcquiddy-gym", "student-activities-center", "gymnasium"]);
  });

  it("returns suggestions shaped like search results", () => {
    const [suggestion] = suggestPlaces("bemen");
    expect(suggestion).toMatchObject({ tier: "typo", hint: null, matched: { source: "name" } });
  });

  it("offers at most a few", () => {
    expect(suggestPlaces("hal").length).toBeLessThanOrEqual(MAX_SUGGESTIONS);
  });

  it("suggests nothing for nonsense or an empty query", () => {
    expect(suggestPlaces("zzzzzz")).toEqual([]);
    expect(suggestPlaces("")).toEqual([]);
  });

  it("puts the closest first", () => {
    const place = (id: string, name: string): CampusPlace => ({
      id,
      name,
      kind: "building",
      category: "academics",
      aliases: [],
      map: { x: 0.5, y: 0.5 },
      geo: { lat: 36.105, lng: -86.798 },
    });
    // "brimley" is one edit from "bromley" and two from "bremlay".
    const index = buildIndex([place("two", "Bremlay Hall"), place("one", "Bromley Hall")]);
    expect(suggestPlaces("brimley", index).map((result) => result.place.id)).toEqual(["one", "two"]);
  });
});
