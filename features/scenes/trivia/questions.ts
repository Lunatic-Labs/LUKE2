/**
 * Trivia question bank.
 *
 * Ported from `src/luke_java/data/triviaQuestions.txt`, one line per question in
 * `prompt=correctAnswer=wrong=wrong=wrong` form (the correct answer is always
 * first in the source file; `Engagement` shuffles it into the response order at
 * render time). One malformed source line — missing the separator between the
 * prompt and its first answer — is dropped here exactly as
 * `Options.readQuestions()` silently skipped it (`parts.length < 5`).
 */

export interface TriviaQuestion {
  prompt: string;
  /** First element is the correct answer, pre-shuffle. */
  responses: [string, string, string, string];
}

export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  { prompt: "Which of the following Nashville universities was founded the earliest?", responses: ["Fisk", "Lipscomb", "Belmont", "Vanderbilt"] },
  { prompt: "In what year did 1950s pop icon Pat Boone write a “new” version of Lipscomb’s alma mater?", responses: ["2015", "1955", "1974", "2003"] },
  { prompt: "In machine learning, which of the following is NOT considered by the Bellman equation?", responses: ["Distance", "Reward", "Action", "State"] },
  { prompt: "Which of the following is NOT a course in the Lipscomb Bible general education requirements?", responses: ["The Story of God", "The Story of Jesus", "The Story of Israel", "The Story of the Church"] },
  { prompt: "What is the name of Lipscomb’s fall orientation week, required for all freshmen?", responses: ["Quest Week", "Bison Week", "Purple and Gold Week", "Freshman Orientation"] },
  { prompt: "Which of the following Lipscomb dorm halls was opened the earliest?", responses: ["Sewell Hall", "High Rise", "Johnson Hall", "Bison Hall"] },
  { prompt: "What is the founding year of Lipscomb?", responses: ["1891", "1918", "1988", "1984"] },
  { prompt: "Who is the Dean of Lipscomb’s College of Engineering?", responses: ["David Elrod", "Leon Rodel", "Michael Dean", "John Engineering"] },
  { prompt: "What Bible Verse does Lipscomb’s motto come from?", responses: ["John 8:32", "John 3:16", "Matthew 7:7", "Philippians 4:13"] },
  { prompt: "What was the Original Name of Lipscomb University?", responses: ["Nashville Bible College", "David Lipscomb College", "Lipscomb Bible College", "Church of Christ Bible College"] },
  { prompt: "Which Undergraduate program is not offered by the School of Computing?", responses: ["Game Development", "Software Engineering", "Computer Science", "Cybersecurity"] },
  { prompt: "Who was the first President of Lipscomb?", responses: ["James A. Harding", "David Lipscomb", "Candice McQueen", "Batsell Baxter"] },
  { prompt: "As of 2025, how many people have been a President of Lipscomb University?", responses: ["14", "16", "15", "18"] },
  { prompt: "How many places of interest are noted on Lipscomb’s map?", responses: ["50", "45", "28", "62"] },
  { prompt: "What is the title of the annual day of rest given to Lipscomb students?", responses: ["Beautiful Day", "Rest Day", "Day Off", "Good Day"] },
  { prompt: "How many students did Lipscomb University have in its first year?", responses: ["9", "15", "24", "13"] },
  { prompt: "How many students did Lipscomb University have in 2021?", responses: ["4,778", "2,119", "3,084", "5,607"] },
  { prompt: "Which of the following was not invented by a (formally educated) engineer?", responses: ["The electric motor", "The snowboard", "The Ferris wheel", "The water slide"] },
  { prompt: "What was the second food to be deliberately cooked in a microwave?", responses: ["Egg", "Popcorn", "Cake", "Chocolate"] },
  { prompt: "Which of the following is approximately equal to 2 to the 16th power?", responses: ["64K", "1M", "32K", "4K"] },
  { prompt: "Which of the following is not considered a branch of engineering?", responses: ["Microplastic Engineering", "Mining Engineering", "Textile Engineering", "Optical Engineering"] },
  { prompt: "What does GPT (as in ChatGPT) stand for?", responses: ["Generative Pre-trained Transformer", "Generative Prompt Translator", "Generalized Phonetic Technology", "Great Peas of Texas"] },
  { prompt: "Which programming language is commonly used in a Playstation console?", responses: ["C/C++", "Python", "Java", "Rust"] },
  { prompt: "Which team is not in the ASUN Conference?", responses: ["Sewanee", "Lipscomb", "Stetson", "Austin Peay"] },
  { prompt: "What year was Lipscomb University founded?", responses: ["1891", "1918", "1864", "1887"] },
  { prompt: "What was the math. proposition for a machine that can compute any algorithm originally named?", responses: ["The A-machine", "The Turing Machine", "The bombe", "The computer"] },
  { prompt: "What is the name of Lipscomb University’s mascot?", responses: ["Lou the Bison", "Mr. Bison", "Bison Bill", "Luke Bison"] },
  { prompt: "Current always travels through the path of...?", responses: ["Least resistance", "Most resistance", "Least distance", "Densest wiring"] },
  { prompt: "How many megabytes are in one gigabyte?", responses: ["1000", "10000", "100", "10"] },
  { prompt: "In 2019, 100% of the world’s supercomputers ran on which operating system?", responses: ["Linux", "Windows", "MacOS", "Git"] },
  { prompt: "Which term refers to information sent from a browser to a web server?", responses: ["Cookie", "Byte", "Internet", "IP"] },
  { prompt: "Which acronym refers to the naming convention for websites?", responses: ["DNS", "IBS", "WAN", "NAT"] },
  { prompt: "What is the ASCII value for the character \"a\"?", responses: ["097", "001", "065", "000"] },
  { prompt: "What is the common method for storing negative integers in binary called?", responses: ["Two's complement", "Inverted bits", "Base 10", "Bitwise negation"] },
  { prompt: "Which planet is the furthest from Jupiter?", responses: ["Uranus", "Saturn", "Mars", "Mercury"] },
  { prompt: "Which of the following is NOT one of the 7 SI base units of measurement?", responses: ["Ounce", "Meter", "Kelvin", "Mole"] },
  { prompt: "Approximately how long does it take sunlight to reach Earth, in minutes?", responses: ["8", "12", "5", "2"] },
  { prompt: "In what year did David Lipscomb Elementary School's first kindergarten class begin?", responses: ["1946", "1891", "1923", "1994"] },
  { prompt: "In 1891, how much was tuition at Lipscomb?", responses: ["$3/month", "$100/month", "$300/year", "$2/week"] },
  { prompt: "In 1995, Andy McQueen was named college basketball's all-time leading 3-point shooter. How many career 3s did he score?", responses: ["515", "624", "315", "605"] },
  { prompt: "Which of the following is not a Lipscomb athletics Hall of Fame member?", responses: ["Stephan Bolt", "Andy McQueen", "Jim Allen", "Lynn Dearing"] },
  { prompt: "Which of the following is not a Lipscomb athletics Hall of Fame member?", responses: ["Sydney Jones", "Eugene Boyce", "Brett McNutt", "Bob Parsons"] },
  { prompt: "Which former Lipscomb athlete funded construction of the campus's Allen Bell Tower?", responses: ["Jim Allen", "Harry Moneypenny", "Candace McQueen", "Tom Ingram"] },
  { prompt: "A carillon is an instrument made up of bells. How many bells are in the Allen Bell Tower's carillon?", responses: ["35", "12", "95", "6"] },
  { prompt: "There are three carillons in Nashville, TN. Which of the following is not one of them?", responses: ["Vanderbilt University", "Belmont University", "Bicentennial Capitol Mall", "Lipscomb University"] },
  { prompt: "Lipscomb is home to the annual holiday concert The Lighting of Green. What is the name of its host?", responses: ["Amy Grant", "Logan Bennett", "Vince Gill", "Natalie Grant"] },
  { prompt: "Lipscomb is home to the annual holiday concert The Lighting of Green. What year was the first one?", responses: ["2004", "2017", "1999", "2008"] },
  { prompt: "Lipscomb hosts the annual film competition Five Minute Film Festival. What year was the first one?", responses: ["2013", "2005", "2008", "1999"] },
  { prompt: "The Battle of the Boulevard sees Lipscomb facing its rival school Belmont in basketball. What year was the first one?", responses: ["1953", "1960", "1984", "1973"] },
  { prompt: "The largest Battle of the Boulevard (basketball game) was held on 2/17/1990. Where was it held?", responses: ["Vanderbilt University", "Bridgestone Arena", "Lipscomb University", "Belmont University"] },
  { prompt: "In which country did Lipscomb's first engineering mission trip take place?", responses: ["Honduras", "Mexico", "Guatemala", "Nicaragua"] },
  { prompt: "What was constructed during Lipscomb's first engineering mission trip in 2004?", responses: ["Water tower", "Pedestrian bridge", "Solar panels", "Wind tunnel"] },
  { prompt: "Lipscomb is home to an annual Halloween sports tournament. What sport is played?", responses: ["Dodgeball", "Basketball", "Kickball", "Volleyball"] },
  { prompt: "What Christian denomination is Lipscomb associated with?", responses: ["Church of Christ", "Baptist", "Catholic", "Nondenominational"] },
  { prompt: "In what year was the first computer mouse prototype developed?", responses: ["1964", "1972", "1871", "1902"] },
  { prompt: "Who is regarded as the first computer programmer for their work with the Analytical Engine?", responses: ["Ada Lovelace", "Charles Babbage", "Bill English", "Alan Turing"] },
  { prompt: "What did the word \"computer\" first refer to?", responses: ["Job title", "Calculator", "Abacus", "Television"] },
  { prompt: "What year was Lipscomb’s fight song “Bisons, Horns Up!” written?", responses: ["2024", "1960", "1986", "2003"] },
  { prompt: "Fill in the blanks of Lipscomb’s motto: “___ Shall Make You Free”", responses: ["The Truth", "Faith", "Knowledge", "God’s Love"] },
  { prompt: "Lipscomb’s first African-American student was named James Fitzgerald. What year did he enroll?", responses: ["1966", "1974", "1954", "1970"] },
  { prompt: "In 1982, Lipscomb hired its first African-American instructor. What was his name?", responses: ["Robert Jackson", "Jack Michaels", "Jimmie Hampton", "Chris Simmons"] },
  { prompt: "Who is Lipscomb’s College of Engineering named after?", responses: ["Raymond B. Jones", "Ray Jonesboro", "Raymond Jackson", "Ray D. Johnson"] },
  { prompt: "Which of the following is not an Engineering society offered at Lipscomb?", responses: ["ASAE", "ASCE", "ASME", "IEEE"] },
  { prompt: "Which of the following is not an Engineering society offered at Lipscomb?", responses: ["ISSE", "ACM", "SWE", "ASHRAE"] },
  { prompt: "During what month is Lipscomb’s annual Welcome to Our World (WOW) week?", responses: ["October", "August", "September", "November"] },
  { prompt: "In what year was Lipscomb’s Student Government Association founded?", responses: ["1924", "1920", "1934", "1910"] },
  { prompt: "Traditionally, what instrument is played at Lipscomb’s convocation?", responses: ["Bagpipes", "Carillon", "Piano", "Trumpet"] },
  { prompt: "Which traditional event marks the start of each school year with an address from Lipscomb’s president?", responses: ["Convocation", "Initium", "Graduation", "Beautiful Day"] },
  { prompt: "Which Lipscomb building was built the latest?", responses: ["Shinn Center", "Allen Bell Tower", "Swang Center", "Collins Auditorium"] },
  { prompt: "Which water-related competition does Lipscomb’s engineering department participate in each year?", responses: ["Concrete Canoe", "Water Brawl", "Get Wet", "Hydro Heist"] },
  { prompt: "Which racing competition does Lipscomb’s engineering department participate in each year?", responses: ["Baja SAE", "Hot Wheels", "Monster Jam", "Dash FAST"] },
  { prompt: "What year was the School of Computing added to the Raymond B. Jones College of Engineering?", responses: ["2022", "2019", "2020", "2021"] },
];
