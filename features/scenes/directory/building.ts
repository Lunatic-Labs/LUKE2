/**
 * Floors shown in the Directory's "Our Building" view.
 *
 * Ported from data/engineeringBuilding.txt (Name=Description=Water=Food=Bathroom),
 * which upstream loaded into DirectoryMap.pde. Floors are listed top floor first,
 * the same order they appear on screen.
 */

export type Floor = {
  name: string;
  description: string;
  water: boolean;
  food: boolean;
  restrooms: boolean;
};

export const BUILDING_NAME = "Fields Engineering Center";

export const FLOORS: Floor[] = [
  {
    name: "Floor 3",
    description:
      "The third floor contains faculty offices, a student lounge area, and two information desks. There are two gendered bathrooms and one water fountain.",
    water: true,
    food: false,
    restrooms: true,
  },
  {
    name: "Floor 2",
    description:
      "The second floor contains classrooms, a student lounge area, and our tutoring office. There is one all-gender bathroom and one water fountain.",
    water: true,
    food: true,
    restrooms: true,
  },
  {
    name: "Floor 1",
    description:
      "The first floor contains classrooms, various labs and facilities, and our Peugeot Center. There are two gendered bathrooms.",
    water: false,
    food: false,
    restrooms: true,
  },
  {
    name: "Basement",
    description:
      "The basement contains various labs and facilities related to the diverse fields of Engineering offered in Fields.",
    water: false,
    food: false,
    restrooms: false,
  },
];

/** The amenity tags to show for a floor, in a fixed order. */
export function amenitiesFor(floor: Floor): string[] {
  const amenities: string[] = [];
  if (floor.restrooms) amenities.push("Restrooms");
  if (floor.water) amenities.push("Water fountain");
  if (floor.food) amenities.push("Food");
  return amenities;
}