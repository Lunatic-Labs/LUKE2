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
  "category": "academics",
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
| `category` | yes | `admissions-visitors`, `academics`, `student-life`, `athletics`, `housing`, `admin`, `arts` or `health`. The section it appears under on the Find screen. |
| `map` | yes | Marker position as fractions of the image: `x` from 0 (left) to 1 (right), `y` from 0 (top) to 1 (bottom). |
| `geo` | yes | Real-world `lat` and `lng` of the place's centre. See Coordinates below. |
| `kind` | not yet | `building`, `office`, `venue` or `field`. |
| `withinBuildingId` | no | For an `office` inside another place: that place's `id`. |
| `entrances` | no | Doors visitors use. Leave it out until a place has one. |
| `photo` | no | Deferred; leave it out. |

`kind` becomes required once every place has one. The allowed values for `kind`
and `category` are `PLACE_KINDS` and `PLACE_CATEGORIES` in `../buildings.ts`;
add a new value there first.

**Kinds.** A `building` is a standalone structure, even if it's mostly offices.
An `office` is a destination inside another place, so it needs
`withinBuildingId`. A `venue` hosts events but isn't an enclosed building (an
amphitheater, a square). A `field` is an outdoor sports ground.

## Coordinates

`geo` comes from [OpenStreetMap](https://www.openstreetmap.org/copyright),
© OpenStreetMap contributors, available under the Open Database License. Take
new coordinates from OpenStreetMap or public-domain imagery such as USGS NAIP,
not from Google Maps, whose terms don't allow reusing its data in another map.
Values outside the box around campus in `../buildings.ts` fail the tests.

Six have no named OpenStreetMap feature, so they were worked out from their
position on `LUJustMap.jpg` and are approximate: University Theatre, Thomas James
McMeen Music Center, Veterans' Resource Center, Alumni Relations, Lipscomb Family
Therapy Center and Reese Smith Athletic Complex. Correct them if you can confirm
a better position.

## Aliases

- Lowercase only, no spaces at either end. Search compares lowercase text, so
  "SAC" would never match; write "sac".
- Don't repeat the place's own name or list the same alias twice.
- Prefer words a visitor would actually type: "the caf", "food", "girls dorm".
- An alias normally belongs to one place. If several places really should share
  one ("food" for Bennett and the SAC), also add it to `SHARED_ALIASES` in
  `../buildings.test.ts`, so the overlap is a decision rather than an accident.

## Adding a place

Add an entry with `id`, `name`, `category`, `aliases`, `map` and `geo`, plus `kind`
if you know it. To find `map`, open `LUJustMap.jpg` in an image editor, note
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
