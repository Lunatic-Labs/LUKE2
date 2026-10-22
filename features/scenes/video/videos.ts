/**
 * Turns the file names from /api/videos into what the Video Player shows.
 */

export type KioskVideo = {
  /** File name inside public/videos/. */
  file: string;
  /** Shown above the video. */
  title: string;
};

/** Friendlier titles for known videos. Any file not listed gets a title made from its name. */
const TITLES: Record<string, string> = {
  "0_FieldsWalkthrough_Floor2.mp4": "Fields Walkthrough: Floor 2",
  "2_FieldsWalkthrough_Floor3.mp4": "Fields Walkthrough: Floor 3",
  "3_FieldsWalkthrough_Floor4.mp4": "Fields Walkthrough: Floor 4",
  "Z_FieldsWalkthrough_Floor1.mp4": "Fields Walkthrough: Floor 1",
  "Alumni_DrMcQueen.mov": "Alumni: Dr. McQueen",
  "CollegeOfEngineering_LabTour.mp4": "College of Engineering Lab Tour",
  "DrMcQueen_OneYear.mp4": "Dr. McQueen: One Year",
  "EducationPartnership_News.mp4": "Education Partnership",
  "HIGHLIGHT_VIDEO.mp4": "Highlights",
  "LookInside_CoELabs.mp4": "A Look Inside the Engineering Labs",
  "People_Helping_People.mp4": "People Helping People",
  "TPW_Graduation_2019_Sixth_Cut.mov": "TPW Graduation 2019",
  "Trailer_CollegeOfEngineering.mp4": "College of Engineering Trailer",
};

/** "0_FieldsWalkthrough_Floor2.mp4" becomes "Fields Walkthrough Floor 2". */
export function titleFromFile(file: string): string {
  return file
    .replace(/\.[^.]+$/, "") // drop the extension
    .replace(/^[^_]_/, "") // drop a one-character ordering prefix like "0_" or "Z_"
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z0-9])/g, "$1 $2") // split joined words
    .trim();
}

export function toKioskVideo(file: string): KioskVideo {
  return { file, title: TITLES[file] ?? titleFromFile(file) };
}