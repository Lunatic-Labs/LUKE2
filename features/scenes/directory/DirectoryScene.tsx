"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { SceneFrame } from "@/components/SceneFrame";
import type { SceneComponentProps } from "@/features/kiosk/types";
import { CreditsView } from "./CreditsView";

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
    name: "Richard Gregory",
    bio: "Gregory has spent all but one of his years teaching at Lipscomb. He brings four years of industry experience in the automotive industry, working on the design and testing of components for passenger car hydraulic steering systems. His specific areas of interest include: Solid Mechanics, Material Science, and Mechatronics.",
    category: "Mechanical Engineering",
    title: "Professor",
    image: "Gregory_Richard_web3.jpg",
    phone: "",
    contactEmail: "richard.gregory@lipscomb.edu",
  },
  {
    name: "John Hutson",
    bio: "Hutson comes to us from Northrop Grumman Corporation where he worked as a Reliability and Systems Engineer. He has worked as a research assistant at Vanderbilt University School of Engineering studying radiation effects and working in the reliability group as well as having been a member of the technical staff at Aerospace Corporation.",
    category: ["Electrical Engineering", "Computer Engineering"],
    title: "Professor",
    image: "Hutson_John_web3.jpg",
    phone: "(615) 966-5192",
    contactEmail: "john.hutson@lipscomb.edu",
  },
  {
    name: "Todd Lynn",
    bio: "With over 20 years of experience with pavement materials testing, design, research and product development, Todd Lynn comes to Lipscomb University from Thunderhead Testing, LLC, a construction materials testing and engineering company that he and his wife started in 2000. Lynn has worked full-time in business since 2010 and plans to continue consulting while at Lipscomb. Lynn's primary area of interest in asphalt pavement design and construction; however, he also has experience with quality control program auditing and training for materials engineers and technicians. He holds three patents and was part of the construction team that completed the Kansas Speedway. Lynn is a registered professional engineer in Oklahoma, Texas, and Tennessee.",
    category: "Civil Engineering",
    title: "Associate Professor and Chair",
    image: "Lynn_Todd_web3.jpg",
    phone: "(615) 966-5178",
    contactEmail: "todd.lynn@lipscomb.edu",
  },
  {
    name: "Hannah Pauls",
    bio: "",
    category: "Admin",
    title: "Director of Operations",
    image: "Pauls_Hannah_web3.jpg",
    phone: "",
    contactEmail: "hannah.pauls@lipscomb.edu",
  },
  {
    name: "Rich Pearce",
    bio: "Richard is a graduate from the University of Missouri-Rolla with a Bachelor of Science in Mechanical Engineering in 1986 with an emphasis in robotics. In 1996, he graduated from the University of Missouri-Columbia obtaining a Master of Science degree in Mechanical Engineering with an emphasis in thermal fluids. Finally in 2005, he graduated with an Interdisciplinary Doctor of Philosophy in Mechanical Engineering and Mathematics. He began his working career with the Russell Stover Candies Company. He changed fields from manufacturing to the power industry by taking a position with Kansas City Power and Light/Evergy. He spent 32 years at KCPL in Kansas City, Missouri growing from a reliability engineer working on steam turbines to Senior Manager of Engineering when he retired. Richard went right back to work by giving back to the next generation of engineers. For 2021 and 2022 academic years, he was a professor instructing Mechanical Engineering courses at Abilene Christian University. Richard started at Lipscomb University in August of 2023 as the Associate Dean of Engineering. Richard has been a member of ASME (American Society of Mechanical Engineers) and ASHRAE (American Society of Heating, Refrigeration and Air-Conditioning Engineering) for 20+ years each. He is a fellow of ASME.",
    category: "Mechanical Engineering",
    title: "Associate Dean of Engineering",
    image: "Pearce_Rich_web3.jpg",
    phone: "(615) 966-6144",
    contactEmail: "Richard.Pearce@lipscomb.edu",
  },
  {
    name: "Juan Rojas Suarez del Real",
    bio: "Dr. Juan Rojas earned his B.S. ('02), M.S. ('04), and Ph.D. ('09) in Electrical and Computer Engineering from Vanderbilt University, where he also played football for the Commodores. His NASA-sponsored doctoral research focused on autonomous space structure assembly using heterogeneous robot teams. Following a fellowship at Japan’s AIST developing robot controllers and introspection methods, he joined Sun Yat-Sen University as an Assistant Professor, led ROS education initiatives in China, and programmed the ATLAS humanoid for the 2015 DARPA Robotics Challenge. \n\n He later served as a 100 Young Scholars Research Associate Professor at Guangdong University of Technology, co-leading the Intelligent Manipulation Lab before becoming an IEEE Senior Member in 2018. In August 2020, Dr. Rojas joined the Chinese University of Hong Kong (CUHK) as a Research Assistant Professor in Mechanical and Automation Engineering, affiliated with the CUHK T Stone Robotics Institute and the Hong Kong Center for Logistics Robotics. His research focuses on encoding intelligence through abstractions for complex dexterous manipulation and efficient learning. He has authored over 60 peer-reviewed publications and serves as an Associate Editor and committee member for major IEEE robotics venues.",
    category: ["Electrical Engineering", "Computer Engineering"],
    title: "Associate Professor",
    image: "Rojas_Suarez_del_Real_Juan_web3.jpg",
    phone: "(615) 966-5800",
    contactEmail: "juan.rojas@lipscomb.edu",
  },
  {
    name: "Anand Samuel",
    bio: "",
    category: "Admin",
    title: "Director of Professional Development",
    image: "Anand_Samuel_web3.jpg",
    phone: "(615) 966-5039",
    contactEmail: "anand.samuel@lipscomb.edu",
  },
  {
    name: "Monica Sartain",
    bio: "Monica Sartain, PE, MBA, is an Assistant Professor in Civil Engineering at Lipscomb University and serves as the Faculty Advisor for its ASCE chapter. A licensed professional engineer with over 20 years of experience, her background includes environmental compliance and design for government, public, and private sectors, as well as construction management across commercial, industrial, and transportation projects. \n\n Prior to joining Lipscomb in 2012, Ms. Sartain served as Chief Operating Officer for a national engineering firm in Sumner County. In this role, she managed overall operations, large technical contracts, and major corporate initiatives—including an accounting system upgrade and the firm's transition to an ESOP. She also served on the firm's Board of Directors as Board Secretary from 2017 to 2021.",
    category: "Civil Engineering",
    title: "Assistant Professor",
    image: "Sartain_Monica_web3.jpg",
    phone: "(615) 966-5360",
    contactEmail: "monica.sartain@lipscomb.edu",
  },
  {
    name: "Steve Sherman",
    bio: "Steve Sherman earned a B.A. from Harding University (1975), a M.A.R. from the Harding University Graduate School of Religion (1983), and a Doctor of Ministry in Missions from Gordon-Conwell Theological Seminary (2012). From 1979 to 1981, he worked as a missionary in Guatemala with Health Talents International before moving to Belize from 1984 to 1988 to direct a medical mission and a countrywide Malaria Prevention Program. He returned to Guatemala in 1989 as the Country Director for Health Talents International until 1997, when he transitioned to full-time church planting in Guatemala City. Throughout his missionary work from 1982 to 2002, he was supported by the Otter Creek Church of Christ in Nashville. \n\n Following a successful church plant, Steve and his family returned to the United States in 2001. He then served as the Missions Minister at Otter Creek Church of Christ and worked alongside Lipscomb University as a Missionary in Residence teaching missions—a role he held at Otter Creek until his retirement in March 2022. Since 2019, Steve has served as the Executive Director for the Peugeot Center for Engineering Service to Developing Communities, the non-profit arm of Lipscomb's Raymond B. Jones College of Engineering, leveraging his extensive experience in community development and appropriate technology. He and his wife, Magdalena, have three daughters (Lisa, Sara, and Amy), three sons-in-law, and seven grandchildren.",
    category: "Admin",
    title: "Executive Director of Peugeot Center",
    image: "Sherman_Steve_web3.jpg",
    phone: "",
    contactEmail: "steve.sherman@lipscomb.edu",
  },
  {
    name: "Jordan Wilson",
    bio: "Wilson received his undergraduate degree in mechanical engineering from Lipscomb University and M.S. and Ph.D. in civil and environmental engineering from Colorado State University. As a consulting water resources engineering, Wilson worked extensively in surface water modeling, computational fluid dynamics (CFD), distribution system modeling, treatment plant hydraulic modeling, and hydrologic modeling supporting a wide variety of projects and clients. \n\n His research interests include CFD applications to water treatment systems and environmental systems. He enjoys traveling with his family and running, especially marathons.",
    category: "Civil Engineering",
    title: "Assistant Professor",
    image: "Wilson_Jordan_web3.jpg",
    phone: "(615) 966-6244",
    contactEmail: "jordan.wilson@lipscomb.edu",
  },
  {
    name: "Samuel Wright",
    bio: "Samuel Wright came to Lipscomb having worked for Trane, Inc. designing large commercial HVAC units. He now supports all lab activities for all three engineering departments: Civil and Environmental Engineering, Electrical and Computer Engineering, and Mechanical Engineering. \n\n Wright is responsible for ensuring equipment is maintained for student use in educational labs and supplies are readily available. He advises students and mission trip coordinators on designs and projects and manages our innovation lab. He supports the Music City BEST robotics competition and BisonBot Robot Camps hosted by the Raymond B. Jones College of Engineering each year. \n\n Wright also serves as an instructor in the mechanical engineering department.",
    category: "Admin",
    title: "Assistant Professor",
    image: "Wright_Samuel_web3.jpg",
    phone: "",
    contactEmail: "Samuel.Wright@lipscomb.edu",
  },
  {
    name: "Amy Algood ",
    bio: "",
    category: "School of Computing",
    title: "Program Coordinator",
    image: "Algood_Amy_web3.jpg",
    phone: "(615) 966-1194",
    contactEmail: "amy.algood@lipscomb.edu",
  },
  {
    name: "Bryan Crawley",
    bio: "Bryan Crawley brings to Lipscomb more than 40 years of experience as a software professional. In addition to serving many years as a computer science professor, he has worked in software development and quality assurance for Hewlett-Packard, the IBM Corporation, and the U.S. Department of Veterans Affairs. He earned his Ph.D. in computer science from the University of Kentucky. Crawley’s primary computer science interests are the design and implementation of programming languages and teaching the fundamentals of programming. In addition to his work as a computer scientist, he has a wide variety of interests, including Bible study, history, and music of all sorts — especially classical and bluegrass.",
    category: "School of Computing",
    title: "Associate Professor",
    image: "Crawley_Bryan_web3.jpg",
    phone: "(615) 966-5158",
    contactEmail: "bryan.crawley@lipscomb.edu",
  },
  {
    name: "Susan Hammond",
    bio: "Dr. Susan Hammond has been working in academia since January 2012. She loves working with students to help them develop their skills in the area of computing. Prior to joining the academy, she spent 13 years in industry as a software developer and project manager. \n\n Dr. Hammond believes in the value of Christian education. As a graduate of a Christian school, she was greatly influenced by her professors, both from the knowledge she gained from them as well as the mentoring and encouragement she received from them. She strives to pass on these same experiences to her students as well.",
    category: "School of Computing",
    title: "Professor",
    image: "Hammond_Susan_web3.jpg",
    phone: "(615) 966-6240",
    contactEmail: "susan.hammond@lipscomb.edu",
  },
  {
    name: "Steve Nordstrom",
    bio: "Dr. Nordstrom has served in several teaching and administrative roles in engineering and computing since joining the faculty of Lipscomb University in 2008. He currently serves as Associate Dean of the School of Computing where he leads a talented and dedicated group of faculty and staff in their mission to prepare students for their future as servant leaders in the computing profession. He is also an avid guitarist and musician, with a passion for exploring the intersection between musicianship and the technical mindset.",
    category: "School of Computing",
    title: "Associate Dean",
    image: "Nordstrom_Steve_web3.jpg",
    phone: "",
    contactEmail: "steve.nordstrom@lipscomb.edu",
  },
  {
    name: "Chris Simmons",
    bio: "Chris Simmons is an Associate Professor in the School of Computing. He obtained his Bachelor's degree from Tennessee State University, followed by a Master's degree in Information Technology from Carnegie Mellon University. Chris completed his doctorate in Computer Science from the University of Memphis. Prior to pursuing a Ph.D., Chris held positions as a Software Engineer and Sr. Programmer Analyst for companies such as the Boeing Company and FedEx. \n\n Simmons' research involves enhancing secure software development standards and the development of knowledge management systems for secure software and cyber-attack response. His work has appeared in Journal of Computing Sciences in Colleges and Decision Sciences Journal of Innovative Education, among others. Simmons has a passion for increasing technology usage in underprivileged communities and developing countries.",
    category: "School of Computing",
    title: "Associate Professor",
    image: "Simmons_Chris_web3.jpg",
    phone: "(615) 966-5082",
    contactEmail: "chris.simmons@lipscomb.edu",
  },
  {
    name: "Dwayne Towell ",
    bio: "Dwayne caught the programming bug before the personal computing era. He represented Abilene Christian University as part of their International Computer Programming Contest team, placing sixth before graduating with a BS in Computer Science and moving to the Pacific Northwest where he led teams developing many popular cross-platform CD-ROM edutainment titles, for companies such as Hasbro, Matel, Intel, and Disney. He married Lydia and they raised a son and daughter.  \n\n Later he helped found Docket Navigator where he created and deployed a suite of web-based tools to monitor, report, and analyze action in every US patent case. He occasionally acts as legal consultant in the area of software development and holds one granted patent and several pending patents on business software processes, but his first love is teaching.",
    category: "School of Computing",
    title: "Associate Professor",
    image: "Towell_Dwayne_web3.jpg",
    phone: "(615) 966-5842",
    contactEmail: "dwayne.towell@lipscomb.edu",
  },
  {
    name: "Leslie Corbo",
    bio: "",
    category: "School of Computing",
    title: "Department Chair",
    image: "Corbo_Leslie_web3.jpg",
    phone: "",
    contactEmail: "leslie.corbo@lipscomb.edu",
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
  const [showCredits, setShowCredits] = useState(false);

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

  if (showCredits) {
    return (
      <SceneFrame className="bg-white text-black">
        <CreditsView onBack={() => setShowCredits(false)} onActivity={() => handle.reportActivity()} />
      </SceneFrame>
    );
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
                        <button
              type="button"
              onClick={() => {
                handle.reportActivity();
                setShowCredits(true);
              }}
              className="justify-self-start rounded-md border border-[#2B0A54]/40 bg-white px-5 py-2 text-sm font-medium text-[#2B0A54] transition-colors hover:border-[#AD8C45] hover:bg-[#AD8C45]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD8C45]"
            >
              Credits
            </button>
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
                  onClick={() => {
                    handle.reportActivity();
                    setIsCategoryOpen((open) => !open);
                  }}
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
