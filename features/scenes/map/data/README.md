# Campus places

`places.json` is the list of every place on the kiosk's campus map: its name,
the other names people use for it, and where its marker sits on
`public/map/LUJustMap.jpg`. `../buildings.ts` loads it as `CAMPUS_PLACES`, and
the Map scene reads everything from there, so editing this file is all it takes
to change a name, add an alias or add a place.

```json
{
  "id": "beaman-library",
  "name": "Beaman Library",
  "kind": "building",
  "aliases": ["beaman", "library", "the library"],
  "map": { "x": 0.19773, "y": 0.50083 }
}
```

## Fields

| Field | Required | What it holds |
| --- | --- | --- |
| `id` | yes | Lowercase words joined by dashes, unique. See the rules below. |
| `name` | yes | The official name, unique. Shown on the map and in the place list. |
| `aliases` | yes | Other names people use. Can be empty: `[]`. |
| `map` | yes | Marker position as fractions of the image: `x` from 0 (left) to 1 (right), `y` from 0 (top) to 1 (bottom). |
| `kind` | not yet | `building`, `office`, `venue` or `field`. |
| `category` | not yet | `admissions-visitors`, `academics`, `student-life`, `athletics`, `housing`, `admin`, `arts` or `health`. |
| `withinBuildingId` | no | For an `office` inside another place: that place's `id`. |
| `entrances` | no | Doors visitors use. Leave it out until a place has one. |
| `photo` | no | Deferred; leave it out. |

`kind` and `category` become required once every place has one. The allowed
values for both are `PLACE_KINDS` and `PLACE_CATEGORIES` in `../buildings.ts`;
add a new value there first.

**Kinds.** A `building` is a standalone structure, even if it's mostly offices.
An `office` is a destination inside another place, so it needs
`withinBuildingId`. A `venue` hosts events but isn't an enclosed building (an
amphitheater, a square). A `field` is an outdoor sports ground.

## Aliases

- Lowercase only, no spaces at either end. Search compares lowercase text, so
  "SAC" would never match; write "sac".
- Don't repeat the place's own name or list the same alias twice.
- Prefer words a visitor would actually type: "the caf", "food", "girls dorm".
- An alias normally belongs to one place. If several places really should share
  one ("food" for Bennett and the SAC), also add it to `SHARED_ALIASES` in
  `../buildings.test.ts`, so the overlap is a decision rather than an accident.

## Adding a place

Add an entry with `id`, `name`, `aliases` and `map`, plus `kind` and `category`
if you know them. To find `map`, open `LUJustMap.jpg` in an image editor, note
the marker's pixel position, and divide by the image size (4663 × 4800): a
marker at pixel (922, 2404) is `{ "x": 0.19773, "y": 0.50083 }`. An office
inside an existing building can reuse that building's position.

## Rules

- **Never change or reuse an `id`.** Other code refers to places by id. To
  rename a place, change `name` and add the old name as an alias.
- Run `npm test` before opening a pull request. `validatePlaces` checks ids,
  names, kinds, categories, aliases, positions and entrances, and the tests
  fail with a message naming the place and the problem.
- Changes reach the kiosk on the next deploy; the file is bundled into the app.
