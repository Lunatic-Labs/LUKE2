"use client";

import { useMemo, useState } from "react";
import { SceneFrame } from "@/components/SceneFrame";
import type { SceneComponentProps } from "@/features/kiosk/types";

interface StaffRecord {
  name: string;
  bio: string;
  category: string;
  image: string;
}

const STAFF_RECORDS: StaffRecord[] = [
  {
    name: "Amy Algood",
    bio: "After graduating from David Lipscomb College in 1987 with a BS in Office Administration and earning her CPS, Amy joined the HCA family as an Administrative Assistant. Currently, Amy is serving as the Project Coordinator for undergrad and graduate studies in the School of Computing at Lipscomb University. Prior to that, she was the Assistant to the Associate Dean in the School of Computing.",
    category: "Computing",
    image: "Algood_Amy_web3.jpg",
  },
  {
    name: "Daniela Baugh",
    bio: "Daniela is a Lipscomb University Civil and Environmental Engineering graduate that now works as the Director of Operations for the Peugeot Center for Engineering Service. Before joining the Peugeot Center, she worked for 4 years as a consultant in stormwater modeling and land development.",
    category: "Peugeot Center",
    image: "Baugh_Daniella_web3.jpg",
  },
  {
    name: "Erin Ferree",
    bio: "Erin is Director of Professional Development for the College of Engineering at Lipscomb University. She combines experience in human resources, recruiting policy and higher education career development to support students in the admissions process, throughout their professional development journey and beyond. She is a Certified University Career Coach with The Academies and MBTI-Certified.",
    category: "Support Team",
    image: "Ferree_Erin_web3.jpg",
  },
  {
    name: "Janice Cato",
    bio: "Janice has worked for Lipscomb University for 21 years. She began working in the Human Resource office as an HR Assistant. In 2018 she began working as the Assistant to the Dean in the Raymond B. Jones College of Engineering.",
    category: "Support Team",
    image: "Cato_Janice_web3.jpg",
  },
  {
    name: "Mark Chandler",
    bio: "Mark has served as machinist for the Raymond B. Jones College of Engineering since 2007. He’s been gifted by the Lord in such a way as to see, understand, and make things work through design and machine strategy. He works one-on-one to teach students how to use any of the equipment in our machine shop and guides them to create whatever they imagine.",
    category: "Support Team",
    image: "Chandler_Mark_web3.jpg",
  },
  {
    name: "Bryan Crawley",
    bio: "Bryan brings to Lipscomb more than 40 years of experience as a software professional. In addition to serving many years as a computer science professor, he has worked in software development and quality assurance for Hewlett-Packard, the IBM Corporation, and the U.S. Department of Veterans Affairs. He earned his Ph.D. in computer science from the University of Kentucky.",
    category: "Computing",
    image: "Crawley_Bryan_web3.jpg",
  },
  {
    name: "David Collao",
    bio: "Collao is a Lipscomb alumnus who graduated with a BSc degree in Mechanical Engineering. Next, he earned MSc and Ph.D. degrees from UT Chattanooga in Computational Engineering. His work experience includes aerodynamic analysis of class-8 trucks, engineering software with applications in computational geometry, 3D printing and stress analysis on wooden trusses.",
    category: "Mechanical Engin.",
    image: "Collao_David_web3.jpg",
  },
  {
    name: "David Davidson",
    bio: "Prior to coming to Lipscomb, he was the CEO at Barge Waggoner Sumner & Cannon in Nashville and brings 31 years of experience in the civil engineering/consulting field to the classroom. Davidson’s special knowledge areas include executive management, project management, government, contracting, structural analysis, and design of buildings and bridges.",
    category: "Civil Engineering",
    image: "Davidson_David_web3.jpg",
  },
  {
    name: "Kirsten Dodson",
    bio: "Dodson is the Raymond B. Jones College of Engineering's first faculty member to have received an undergraduate engineering degree from Lipscomb to return to teaching at the college full-time. With a focus in microfluidics, she developed devices that fit on a microscope slide which allow biologists to better study cells or tissue.",
    category: "Mechanical Engin.",
    image: "Dodson_Kirsten_web3.jpg",
  },
  {
    name: "David Elrod II",
    bio: "A Lipscomb graduate, Elrod brings 39 years of engineering and leadership experience from the aerospace and defense industry. Elrod served as a vice president of Jacobs Technology and general manager of Aerospace Testing Alliance, a joint venture that operated and maintained the world’s largest collection of aerospace ground test facilities for the USAF.",
    category: "Support Team",
    image: "Elrod_David_web3.jpg",
  },
  {
    name: "Richard Gregory",
    bio: "Gregory has spent all but one of his years teaching at Lipscomb. He brings four years of industry experience in the automotive industry, working on the design and testing of components for passenger car hydraulic steering systems. His specific areas of interest include: Solid Mechanics, Material Science, and Mechatronics.",
    category: "Mechanical Engin.",
    image: "Gregory_Richard_web3.jpg",
  },
  {
    name: "Susan Hammond",
    bio: "Dr. Susan Hammond has been working in academia since January 2012. She loves working with students to help them develop their skills in the area of computing. Prior to joining the academy, she spent 13 years in industry as a software developer and project manager.",
    category: "Computing",
    image: "Hammond_Susan_web3.jpg",
  },
  {
    name: "John Hutson",
    bio: "Hutson comes to us from Northrop Grumman Corporation where he worked as a Reliability and Systems Engineer. He has worked as a research assistant at Vanderbilt University School of Engineering studying radiation effects and working in the reliability group as well as having been a member of the technical staff at Aerospace Corporation.",
    category: "Electrical/Computing",
    image: "Hutson_John_web3.jpg",
  },
  {
    name: "John Hutton",
    bio: "Professor John Hutton joined the Electrical and Computer Engineering department in August of 2022. He teaches a range of courses including computer architecture and embedded systems as well as circuits and special topics. Hutton completed his masters in 1997 at Colorado State University.",
    category: "Electrical/Computing",
    image: "Hutton_John_web3.jpg",
  },
  {
    name: "Todd Lynn",
    bio: "With over 20 years of experience with pavement materials testing, design, research and product development, Todd Lynn comes to Lipscomb University from Thunderhead Testing, LLC, a construction materials testing and engineering company that he and his wife started in 2000.",
    category: "Civil Engineering",
    image: "Lynn_Todd_web3.jpg",
  },
  {
    name: "Ken Mayer, Jr.",
    bio: "Ken has completed his undergraduate coursework at Harding University, an MBA from University of Dallas, and his doctoral work, with a focus in privacy, at Capitol Technology University. He had the opportunity to work with several Fortune 500 companies before coming to Lipscomb University.",
    category: "Computing",
    image: "Mayer_Kenneth_web2.jpg",
  },
  {
    name: "Steve Nordstrom",
    bio: "Dr. Nordstrom has served in several teaching and administrative roles in engineering and computing since joining the faculty of Lipscomb University in 2008. He currently serves as Associate Dean of the School of Computing.",
    category: "Computing",
    image: "Nordstrom_Steve_web3.jpg",
  },
  {
    name: "Juan Rojas",
    bio: "Dr. Juan Rojas studied Electrical and Computer Engineering (EECE) at Vanderbilt University for his BSc ‘02, MSc ‘04, and Ph.D. ’09. Dr. Rojas' doctoral research was sponsored by NASA. It consisted of learning how to coordinate teams of heterogeneous robots to autonomously assemble structures that could potentially be built in space.",
    category: "Electrical/Computing",
    image: "Rojas_Juan_web3.jpg",
  },
  {
    name: "Monica Sartain",
    bio: "Monica Sartain, PE, MBA is an Assistant Professor in the Civil Engineering Department of the Raymond B. Jones College of Engineering at Lipscomb University in Nashville, TN. Ms. Sartain is a licensed professional engineer with over twenty years of experience providing engineering, management, and operational services.",
    category: "Civil Engineering",
    image: "Sartain_Monica_web3.jpg",
  },
  {
    name: "Chris Simmons",
    bio: "Chris Simmons is an Associate Professor in the School of Computing. He obtained his Bachelor's degree from Tennessee State University, followed by a Master's degree in Information Technology from Carnegie Mellon University. Chris completed his doctorate in Computer Science from the University of Memphis.",
    category: "Computing",
    image: "SImmons_Chris_web3.jpg",
  },
  {
    name: "Steve Sherman",
    bio: "Steve Sherman received his B.A. from Harding University (1975) and a M.A.R. from Harding University Graduate School of Religion (1983), and his Doctor of Ministry degree in Missions at Gordon Conwell University (2012).",
    category: "Peugeot Center",
    image: "Sherman_Steve_web3.jpg",
  },
  {
    name: "Dwayne Towell",
    bio: "Dwayne represented Abilene Christian University as part of their International Computer Programming Contest team, placing 6th before graduating with a BS in Computer Science and moving to the Pacific Northwest, where he led teams developing many popular cross-platform CD-ROM edutainment titles for companies such as Hasbro, Mattel, Intel, and Disney.",
    category: "Computing",
    image: "Towell_Dwayne_web3.jpg",
  },
  {
    name: "Stephanie Weeden-Wright",
    bio: "Weed-Wright received her Ph.D. from Vanderbilt University where she specialized in radiation hardening of emerging memory technologies. Before joining Lipscomb Engineering, Weed-Wright was an instructor at the School for Science and Math at Vanderbilt.",
    category: "Electrical/Computing",
    image: "Weed_Wright_Stephanie_web3.jpg",
  },
  {
    name: "Jordan Wilson",
    bio: "Wilson received his undergraduate degree in Mechanical Engineering from Lipscomb University and M.S. and Ph.D. in Civil and Environmental Engineering from Colorado State University. His research interests include CFD applications to water treatment systems and environmental systems.",
    category: "Civil Engineering",
    image: "Wilson_Jordan_web3.jpg",
  },
  {
    name: "Samuel Wright",
    bio: "Samuel Wright came to Lipscomb having worked for Trane, Inc. designing large commercial HVAC units. He now supports all lab activities for all three engineering departments: Civil and Environmental Engineering, Electrical and Computer Engineering, and Mechanical Engineering.",
    category: "Mechanical Engin.",
    image: "Wright_Sam_web3.jpg",
  },
  {
    name: "Heidi Wright",
    bio: "Wright is a Lipscomb Mechanical Engineering graduate who now tutors in the Raymond B. Jones College of Engineering and at Lipscomb Academy. She manages student tutors as well as tutoring in mech. and civil engineering, math, physics, study skills, and time management. She has industry experience in light commercial HVAC product design and testing, as well as estimating and project management.",
    category: "Support Team",
    image: "Wright_Heidi_web3.jpg",
  },
];

const categories = ["All Staff", ...Array.from(new Set(STAFF_RECORDS.map((person) => person.category)))];

export function DirectoryScene({ handle }: SceneComponentProps) {
  const [selectedCategory, setSelectedCategory] = useState("All Staff");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const visiblePeople = useMemo(() => {
    if (selectedCategory === "All Staff") {
      return STAFF_RECORDS;
    }
    return STAFF_RECORDS.filter((person) => person.category === selectedCategory);
  }, [selectedCategory]);

  const activePerson = visiblePeople[selectedIndex] ?? visiblePeople[0] ?? null;

  function changeCategory(category: string) {
    handle.reportActivity();
    setSelectedCategory(category);
    setSelectedIndex(0);
  }

  function shiftPerson(direction: number) {
    handle.reportActivity();
    if (!visiblePeople.length) return;
    setSelectedIndex((current) => {
      const nextIndex = current + direction;
      if (nextIndex < 0) return visiblePeople.length - 1;
      if (nextIndex >= visiblePeople.length) return 0;
      return nextIndex;
    });
  }

  return (
    <SceneFrame className="bg-white text-black">
      <div className="flex items-center justify-between border-b border-black/15 px-5 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black">Our Faculty and Staff</p>
          <h1 className="text-2xl font-semibold text-black">Directory</h1>
        </div>
        <div className="relative">
          <label className="sr-only" htmlFor="staff-category">
            Filter by category
          </label>
          <select
            id="staff-category"
            value={selectedCategory}
            onChange={(event) => changeCategory(event.target.value)}
            className="rounded-full border border-black bg-white px-3 py-2 text-sm font-medium text-black outline-none"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activePerson ? (
        <div className="flex flex-1 flex-col gap-4 overflow-hidden p-5">
          <div className="flex items-center justify-center rounded-2xl border border-black/10 bg-white p-4">
            <div className="flex h-40 w-40 items-center justify-center rounded-full border-4 border-black bg-white text-4xl font-bold text-black shadow-lg">
              {activePerson.name
                .split(" ")
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/10 bg-white p-4">
            <div className="mb-3">
              <p className="text-sm uppercase tracking-[0.18em] text-black">{activePerson.category}</p>
              <h2 className="mt-2 text-3xl font-semibold text-black">{activePerson.name}</h2>
            </div>

            <p className="flex-1 overflow-y-auto pr-2 text-base leading-7 text-black">{activePerson.bio}</p>
          </div>

          <div className="mt-auto flex justify-center gap-3 pb-1">
            <button
              type="button"
              onClick={() => shiftPerson(-1)}
              className="rounded-full border border-black bg-white px-5 py-2 text-sm font-medium text-black"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => shiftPerson(1)}
              className="rounded-full border border-black bg-white px-5 py-2 text-sm font-medium text-black"
            >
              Next
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-8 text-lg text-zinc-200">
          No faculty or staff match this category.
        </div>
      )}
    </SceneFrame>
  );
}
