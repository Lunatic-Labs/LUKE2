"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { SceneFrame } from "@/components/SceneFrame";
import type { SceneComponentProps } from "@/features/kiosk/types";

interface StaffRecord {
  name: string;
  bio: string;
  category: string | string[];
  title?: string;
  image: string;
  phone?: string;
  contactEmail?: string;
}

const STAFF_RECORDS: StaffRecord[] = [
  {
    name: "David Elrod II",
    bio: "A Lipscomb graduate, Elrod brings 39 years of engineering and leadership experience from the aerospace and defense industry. Elrod served as a vice president of Jacobs Technology and general manager of Aerospace Testing Alliance, a joint venture that operated and maintained the world’s largest collection of aerospace ground test facilities for the USAF. Elrod's last six years in industry were spent leading business development efforts supporting strategic growth and serving nationally critical needs. Being part of a family with four generations of Lipscomb graduates, Elrod appreciates the importance of a faith-based education. Elrod serves as a shepherd and teacher at church and enjoys reading, camping, farming and spending time with his family.",
    category: "Admin",
    title: "Dean, College of Engineering",
    image: "Elrod_David_web3.jpg",
    phone: "(615) 966-5887",
    contactEmail: "david.elrod@lipscomb.edu",
  },
  {
    name: "Mark Chandler",
    bio: "Mark has served as machinist for the Raymond B. Jones College of Engineering since 2007. He’s been gifted by the Lord in such a way as to see, understand, and make things work through design and machine strategy. His motto for our students is, “I’ll take an idea and put it in your hands,” and he loves working with students and helping them understand the bridge between theory and reality. \n\n He works one-on-one to teach students how to use any of the equipment in our machine shop and guides them to create whatever they imagine (from titanium chopsticks to reciprocating engines). Mark and his wife, Angelisa, have 2 beautiful children: Jayde and Lucas.",
    category: "Admin",
    title: "Machinist",
    image: "Chandler_Mark_web3.jpg",
    phone: "(615) 966-7038",
    contactEmail: "mark.chandler@lipscomb.edu",
  },
  {
    name: "David Collao",
    bio: "Collao is a Lipscomb alumnus who graduated with a Bachelor of Science degree in Mechanical Engineering. Next, he earned Master of Science and Ph.D. degrees from The University of Tennessee at Chattanooga in Computational Engineering. His work experience includes performing aerodynamic analysis of class-8 trucks (18 wheelers), and developing engineering software with applications in computational geometry, 3D printing and stress analysis on wooden trusses. His areas of interest include fluid mechanics, thermodynamics, CFD (computational fluid dynamics), and computational geometry. Professor Collao enjoys spending time with his family and friends, and he also enjoys helping and getting to know his students.",
    category: "Mechanical Engineering",
    title: "Assistant Professor",
    image: "Collao_David_web3.jpg",
    phone: "",
    contactEmail: "max.collao@lipscomb.edu",
  },
  {
    name: "Kennedy Corder",
    bio: "Kennedy Corder earned her Bachelor's of Social Work degree from Freed-Hardeman University in 2017 and went on to complete her Master's in Social Work from the University of Tennessee in 2020. She worked for the Lipscomb College of Pharmacy before moving on to become a Social Worker at Alive Hospice. Kennedy returned to Lipscomb to work with the College of Engineering. She is married to her husband Cole, and they have beautiful twin daughters, Millie and Ruby. ",
    category: "Admin",
    title: "Assistant to the Dean",
    image: "Corder_Kennedy_web3.jpg",
    phone: "(615) 966-6244",
    contactEmail: "Kari.Corder@lipscomb.edu",
  },
  {
    name: "David Davidson ",
    bio: "Davidson teaches in our civil engineering program. Prior to coming to Lipscomb, he was the CEO at Barge Waggoner Sumner & Cannon in Nashville and brings 31 years of experience in the civil engineering/consulting field to the classroom. Davidson’s special knowledge areas include executive management, project management, government, contracting, structural analysis, and design of buildings and bridges.",
    category: "Civil Engineering",
    title: "Professor",
    image: "Davidson_David_web3.jpg",
    phone: "(615) 966-5071",
    contactEmail: "david.davidson@lipscomb.edu",
  },
  {
    name: "Kirsten Dodson ",
    bio: "Dodson is the Raymond B. Jones College of Engineering's first faculty member to have received an undergraduate engineering degree from Lipscomb to return to teaching at the college full-time. Dodson obtained her Ph.D. in Mechanical Engineering at Vanderbilt University. With a focus in microfluidics, she developed devices that fit on a microscope slide which allow biologists to better study cells or tissue. During her time at Lipscomb as an undergraduate student and throughout her studies at Vanderbilt, Dodson has devoted much of her time to engineering missions with The Peugeot Center and currently serves as its Associate Director for Research and Education. With her husband Stephen, she is a regular team leader and is excited to continue serving. Dodson also enjoys live music, traveling, and outdoor activities, especially spending time with her dog Leia.",
    category: "Mechanical Engineering",
    title: "Associate Professor & Chair",
    image: "Dodson_Kirsten_web3.jpg",
    phone: "(615) 966-1333",
    contactEmail: "kirsten.dodson@lipscomb.edu",
  },
  {
    name: "Jacob Dyer ",
    bio: "Jacob Dyer brings a decade worth of industry and research experience in power electronics, pulsed-power systems, and smart power grid applications. He has led electronic hardware design/development, thermal and power system analysis, and team/project execution for high performance circuit card (CCA) systems. His research and technical contributions focus on wide bandgap (WBG) semiconductor device applications and compact, high-frequency power converters. He is an author on multiple IEEE publications and holds the rank of Senior Member with the IEEE. In Christ, Jacob is involved in the local church and enjoys time with his wife and two daughters.",
    category: ["Electrical Engineering", "Computer Engineering"],
    title: "Professor of Practice",
    image: "Dyer_Jacob_web3.jpg",
    phone: "(615) 966-6610",
    contactEmail: "jacob.dyer@lipscomb.edu",
  },
  {
    name: "",
    bio: "",
    category: "",
    image: "",
    phone: "",
    contactEmail: "",
  },
  {
    name: "",
    bio: "",
    category: "",
    image: "",
    phone: "",
    contactEmail: "",
  },
  {
    name: "",
    bio: "",
    category: "",
    image: "",
    phone: "",
    contactEmail: "",
  },
  {
    name: "",
    bio: "",
    category: "",
    image: "",
    phone: "",
    contactEmail: "",
  },
  {
    name: "",
    bio: "",
    category: "",
    image: "",
    phone: "",
    contactEmail: "",
  },
  {
    name: "",
    bio: "",
    category: "",
    image: "",
    phone: "",
    contactEmail: "",
  },
  {
    name: "",
    bio: "",
    category: "",
    image: "",
    phone: "",
    contactEmail: "",
  },
  {
    name: "",
    bio: "",
    category: "",
    image: "",
    phone: "",
    contactEmail: "",
  },
  {
    name: "",
    bio: "",
    category: "",
    image: "",
    phone: "",
    contactEmail: "",
  },
  {
    name: "",
    bio: "",
    category: "",
    image: "",
    phone: "",
    contactEmail: "",
  },
  {
    name: "",
    bio: "",
    category: "",
    image: "",
    phone: "",
    contactEmail: "",
  },
  {
    name: "",
    bio: "",
    category: "",
    image: "",
    phone: "",
    contactEmail: "",
  },
  {
    name: "",
    bio: "",
    category: "",
    image: "",
    phone: "",
    contactEmail: "",
  },
  {
    name: "",
    bio: "",
    category: "",
    image: "",
    phone: "",
    contactEmail: "",
  },
  {
    name: "",
    bio: "",
    category: "",
    image: "",
    phone: "",
    contactEmail: "",
  },
  {
    name: "",
    bio: "",
    category: "",
    image: "",
    phone: "",
    contactEmail: "",
  },
  {
    name: "",
    bio: "",
    category: "",
    image: "",
    phone: "",
    contactEmail: "",
  },
  {
    name: "",
    bio: "",
    category: "",
    image: "",
    phone: "",
    contactEmail: "",
  },
  {
    name: "",
    bio: "",
    category: "",
    image: "",
    phone: "",
    contactEmail: "",
  },
  {
    name: "",
    bio: "",
    category: "",
    image: "",
    phone: "",
    contactEmail: "",
  },
  {
    name: "",
    bio: "",
    category: "",
    image: "",
    phone: "",
    contactEmail: "",
  },
];

const categories = [
  "All Staff",
  ...Array.from(
    new Set(
      STAFF_RECORDS.flatMap((person) => (Array.isArray(person.category) ? person.category : [person.category])).filter(
        (category) => category.length > 0,
      ),
    ),
  ),
];

export function DirectoryScene({ handle }: SceneComponentProps) {
  const [selectedCategory, setSelectedCategory] = useState("All Staff");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [failedImage, setFailedImage] = useState<string | null>(null);

  const visiblePeople = useMemo(() => {
    if (selectedCategory === "All Staff") {
      return STAFF_RECORDS;
    }
    return STAFF_RECORDS.filter((person) =>
      Array.isArray(person.category)
        ? person.category.includes(selectedCategory)
        : person.category === selectedCategory,
    );
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
      </div>

      {activePerson ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white px-8 py-7 sm:px-12 sm:py-10">
          <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col overflow-y-auto">
            <div className="relative mx-auto mb-7 aspect-[3/4] w-full max-w-xs overflow-hidden border border-[#AD8C45]/40 bg-[#F6F3EB]">
              {failedImage === activePerson.image ? (
                <div className="flex h-full items-center justify-center px-4 text-center text-sm text-[#2B0A54]/70">
                  Photo unavailable
                </div>
              ) : (
                <Image
                  src={`/directory/${activePerson.image}`}
                  alt={activePerson.name}
                  fill
                  sizes="(max-width: 640px) 80vw, 320px"
                  className="object-cover"
                  onError={() => setFailedImage(activePerson.image)}
                />
              )}
            </div>
            <h2 className="text-4xl font-semibold leading-tight text-[#2B0A54]">{activePerson.name}</h2>
            <div className="mt-3 space-y-1 text-base text-black">
              <p>{Array.isArray(activePerson.category) ? activePerson.category.join(" & ") : activePerson.category}</p>
              {activePerson.title ? <p>{activePerson.title}</p> : null}
            </div>

            <section className="mt-8">
              <h3 className="mb-3 text-2xl font-bold text-[#2B0A54]">Biography</h3>
              <p className="whitespace-pre-line font-serif text-base leading-relaxed text-black sm:text-lg">{activePerson.bio}</p>
            </section>

            <section className="mt-8">
              <h3 className="text-lg font-bold text-[#2B0A54]">Contact Information</h3>
              <div className="mt-3 h-1 w-full bg-[#AD8C45]" />
              {activePerson.phone || activePerson.contactEmail ? (
                <div className="mt-3 space-y-1 text-base text-black">
                  {activePerson.phone ? <p>{activePerson.phone}</p> : null}
                  {activePerson.contactEmail ? <p>{activePerson.contactEmail}</p> : null}
                </div>
              ) : null}
            </section>
          </div>

          <div className="-mx-3 mt-4 grid flex-none grid-cols-[1fr_auto_1fr] items-center pb-1 sm:-mx-7">
            <div />
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => shiftPerson(-1)}
                className="rounded-md border border-[#2B0A54]/40 bg-white px-5 py-2 text-sm font-medium text-[#2B0A54] transition-colors hover:border-[#AD8C45] hover:bg-[#AD8C45]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD8C45]"
              >
                Prev
              </button>
              <span
                aria-label={`Page ${selectedIndex + 1} of ${visiblePeople.length}`}
                className="flex min-w-20 items-center justify-center rounded-full bg-[#F3F3F3] px-3 py-2 text-sm font-medium text-black"
              >
                {selectedIndex + 1} / {visiblePeople.length}
              </span>
              <button
                type="button"
                onClick={() => shiftPerson(1)}
                className="rounded-md border border-[#2B0A54]/40 bg-white px-5 py-2 text-sm font-medium text-[#2B0A54] transition-colors hover:border-[#AD8C45] hover:bg-[#AD8C45]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD8C45]"
              >
                Next
              </button>
            </div>
            <div className="relative h-10 w-56 justify-self-end">
              <div
                onKeyDown={(event) => {
                  if (event.key === "Escape") setIsCategoryOpen(false);
                }}
                className={`absolute bottom-0 right-0 z-20 flex w-full flex-col overflow-hidden rounded-xl border border-[#2B0A54]/40 bg-white shadow-md transition-[max-height] duration-300 ease-in-out ${isCategoryOpen ? "max-h-80" : "max-h-10"}`}
              >
                <div
                  id="staff-category-options"
                  role="group"
                  aria-label="Categories"
                  aria-hidden={!isCategoryOpen}
                  className={`overflow-y-auto transition-[max-height,opacity] duration-300 ease-in-out ${isCategoryOpen ? "max-h-64 opacity-100" : "pointer-events-none max-h-0 opacity-0"}`}
                >
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      tabIndex={isCategoryOpen ? 0 : -1}
                      aria-pressed={selectedCategory === category}
                      onClick={() => {
                        changeCategory(category);
                        setIsCategoryOpen(false);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm font-medium text-[#2B0A54] transition-colors hover:bg-[#AD8C45]/10 focus-visible:bg-[#AD8C45]/10 focus-visible:outline-none"
                    >
                      {category}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label={`Filter by category: ${selectedCategory}`}
                  aria-expanded={isCategoryOpen}
                  aria-controls="staff-category-options"
                  onClick={() => setIsCategoryOpen((open) => !open)}
                  className="flex w-full items-center justify-between border-t border-[#2B0A54]/15 bg-white px-4 py-2 text-sm font-medium text-[#2B0A54] transition-colors hover:bg-[#AD8C45]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#AD8C45]"
                >
                  <span>{selectedCategory}</span>
                  <span
                    aria-hidden="true"
                    className={`ml-3 h-2 w-2 rotate-45 border-r-2 border-t-2 border-current transition-transform duration-300 ${isCategoryOpen ? "rotate-[135deg]" : ""}`}
                  />
                </button>
              </div>
            </div>
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
