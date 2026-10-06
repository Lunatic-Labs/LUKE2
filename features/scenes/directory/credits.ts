/**
 * Credits content, ported from the `semesters` and `people` arrays in
 * DirectoryCredits.pde. To add a semester, append a "team" page here.
 */

export type CreditMember = {
  name: string;
  role: string;
};

export type CreditsPage =
  | { kind: "about"; title: string; body: string }
  | { kind: "team"; title: string; members: CreditMember[] };

export const CREDITS_PAGES: CreditsPage[] = [
  {
    kind: "about",
    title: "About L.U.K.E.",
    body:
      "The Lipscomb University Kiosk Experience (L.U.K.E.) is developed using Processing 4, a software that runs on Java. L.U.K.E. is made to present information to visitors to Lipscomb University or to those who do not know about our campus.",
  },
  {
    kind: "team",
    title: "Spring Semester 2024",
    members: [
      { name: "Justin T. Alexander", role: "Team Lead" },
      { name: "Evan Lipé", role: "Dev 2" },
      { name: "Karen Soria", role: "Dev 2" },
      { name: "Mehrab Babor", role: "Dev 2" },
      { name: "Mason Mitchell", role: "Dev 2" },
    ],
  },
  {
    kind: "team",
    title: "Fall Semester 2024",
    members: [
      { name: "Justin T. Alexander", role: "Team Lead" },
      { name: "Karen Soria", role: "Dev 2" },
      { name: "Mason Mitchell", role: "Dev 2" },
      { name: "Lincoln Keele", role: "Jr. Dev" },
      { name: "Carlos Diaz", role: "Jr. Dev" },
    ],
  },
  {
    kind: "team",
    title: "Spring Semester 2025",
    members: [
      { name: "Justin T. Alexander", role: "Team Lead" },
      { name: "Carlos Diaz", role: "Dev 1" },
    ],
  },
];