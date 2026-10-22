/**
 * Majors shown in the Directory's "Our Majors" view.
 *
 * Ported from data/engineeringMajors.txt (one "Name=Description" per line),
 * which upstream loaded through options.txt into DirectoryMajors.pde.
 * Upstream kept descriptions under about 450 characters so they fit on screen.
 * To add or change a major, edit this list; no other code needs to change.
 */

export type Major = {
  name: string;
  description: string;
};

export const MAJORS: Major[] = [
  {
    name: "Civil Engineering",
    description:
      "Skyscrapers, bridges, roads, fresh water systems and wastewater treatment plants are all designed and constructed with the input of civil engineers. This continually-evolving process is one that has been revered since ancient times, and engineers remain a cornerstone of society. Study everything civil engineering encompasses: structural, environmental, geotechnical, hydraulic and more. Hone the technical skills of design and construction in our Fields Engineering Center.",
  },
  {
    name: "Electrical and Computer Engineering",
    description:
      "In today’s world, almost everything involves computers in one way or another. The field of electrical and computer engineering has played a major role in that shift, creating a more accessible world using breakthrough technology — which only continues to advance. Gain extensive hands-on experience through coursework and projects in our Fields Engineering Center's state-of-the-art labs and resources, and be a part of innovating the future.",
  },
  {
    name: "Mechanical Engineering",
    description:
      "At our core, engineers are professional problem solvers. We see unmet needs, understand the constraints on choices, use mathematics to solve simplified models and get our hands dirty to test for solutions. Mechanical engineers design, develop, build, and test mechanical and thermal sensors and devices, including tools, engines, and machines. They must have a broad fundamental knowledge of the way things work so that they can synthesize solutions.",
  },
  {
    name: "Computer Science",
    description:
      "Computer science is at the core of new technology, so open the door to opportunities for a high-paying career. The skills you grow under the guidance of our experienced faculty will let you enter any field of your choice, whether it's games, media, healthcare, or another industry. We'll help connect you to professionals and Nashville-area industry executives who will pour into your potential, and you'll develop long-lasting connections with your professors, too.",
  },
  {
    name: "Cybersecurity",
    description:
      "The field of cybersecurity has evolved significantly in recent years. Professionals ensure the confidentiality, integrity, and availability of data regardless of the form it takes. Currently, only 3% of US bachelor degree grads have cyber-related skills, so students with this training are in high demand. Our program focuses on security challenges, threats and requirements for operating systems, computer architectures, and networking protocols.",
  },
  {
    name: "Information Technology",
    description:
      "Computer technology is at the core of nearly every modern enterprise, so let us teach you to study, design, create, utilize, support and manage computer-based systems, software applications, and computer hardware. This program's about all things modern — embedded systems in automobiles, smart homes and even mobile and distributed systems. Our professional connections and the opportunities will leave you well-connected to the IT industry in Middle Tennessee.",
  },
  {
    name: "Software Engineering",
    description:
      "Software engineering is your ticket to the career path of your choosing. Software is present in most technology we use every day, so it's no surprise that people with software development skills are in high demand. Our program will expose you to the theory and practical aspect of software development in a Christian context. Our graduates cover the spectrum from scientists to games, to media and health care. There is no limit to your opportunities.",
  },
  {
    name: "Applied Artificial Intelligence",
    description:
      "AI has exploded in capability and popularity, disrupting many established industries and leaving urgent knowledge and skills gaps in its wake. Our graduate program is the first of its kind in Nashville, giving professionals the chance to amplify their industry-specific experience with modern computing skills without requiring an undergraduate degree in computer science. It focuses on the use and application of AI tools and techniques to solve practical problems.",
  },
];