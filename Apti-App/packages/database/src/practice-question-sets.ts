import { z } from "zod";
import type { PrismaClient } from "./index.js";
import { questionInputSchema } from "./question-sets.js";

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type Media = z.input<typeof questionInputSchema>["media"];
type FourOptions = readonly [string, string, string, string];

const OPTION_IDS = ["a", "b", "c", "d"] as const;

function question(
  text: string,
  topic: string,
  difficulty: Difficulty,
  options: FourOptions,
  correctIndex: 0 | 1 | 2 | 3,
  media?: Media,
) {
  return {
    text,
    topic,
    difficulty,
    options: options.map((optionText, index) => ({ id: OPTION_IDS[index], text: optionText })),
    correctOptionId: OPTION_IDS[correctIndex],
    ...(media ? { media } : {}),
  };
}

const quarterlySales: Media = {
  table: {
    headers: ["Quarter", "Laptops (₹ lakh)", "Phones (₹ lakh)", "Tablets (₹ lakh)"],
    rows: [
      ["Q1", "40", "60", "20"],
      ["Q2", "50", "55", "25"],
      ["Q3", "45", "70", "30"],
      ["Q4", "65", "75", "25"],
    ],
  },
};

const sectionResults: Media = {
  table: {
    headers: ["Section", "Appeared", "Passed"],
    rows: [
      ["A", "50", "40"],
      ["B", "60", "48"],
      ["C", "40", "34"],
      ["D", "50", "35"],
    ],
  },
};

const quantitative = [
  question(
    "Simple interest on ₹5,000 at 8% a year for 3 years is:",
    "Simple interest",
    "EASY",
    ["₹1,000", "₹1,200", "₹1,400", "₹1,600"],
    1,
  ),
  question(
    "An article costs ₹400. It is sold at a 20% profit. The selling price is:",
    "Profit and loss",
    "EASY",
    ["₹420", "₹460", "₹500", "₹480"],
    3,
  ),
  question(
    "A can finish a job in 12 days and B in 6 days. Working together, they finish it in:",
    "Time and work",
    "EASY",
    ["3 days", "6 days", "4 days", "9 days"],
    2,
  ),
  question(
    "Two numbers are in the ratio 3 : 5 and their sum is 64. The larger number is:",
    "Ratio and proportion",
    "EASY",
    ["40", "24", "32", "48"],
    0,
  ),
  question(
    "The average of 5 numbers is 24. When one number, 14, is removed, the average of the other 4 is:",
    "Averages",
    "MEDIUM",
    ["25", "26", "27", "26.5"],
    3,
  ),
  question(
    "A 150 m long train crosses a pole in 10 seconds. Its speed is:",
    "Trains",
    "MEDIUM",
    ["36 km/h", "60 km/h", "54 km/h", "72 km/h"],
    2,
  ),
  question(
    "A price rises by 20% and then falls by 20%. The net change in the price is:",
    "Percentages",
    "MEDIUM",
    ["No change", "4% decrease", "4% increase", "2% decrease"],
    1,
  ),
  question(
    "Pipe A fills a tank in 10 hours and pipe B in 15 hours. Open together, they fill it in:",
    "Pipes and cisterns",
    "MEDIUM",
    ["5 hours", "7.5 hours", "12 hours", "6 hours"],
    3,
  ),
  question(
    "A boat does 15 km/h in still water and the stream flows at 5 km/h. Going downstream, it covers 40 km in:",
    "Boats and streams",
    "MEDIUM",
    ["2 hours", "2.5 hours", "3 hours", "4 hours"],
    0,
  ),
  question(
    "In how many distinct ways can the letters of the word LEVEL be arranged?",
    "Permutations",
    "HARD",
    ["60", "120", "30", "15"],
    2,
  ),
  question(
    "Two fair dice are rolled. The probability that the sum is 8 is:",
    "Probability",
    "HARD",
    ["1/6", "7/36", "1/9", "5/36"],
    3,
  ),
  question(
    "On ₹10,000 at 10% a year for 2 years, compound interest (compounded yearly) exceeds simple interest by:",
    "Compound interest",
    "HARD",
    ["₹50", "₹100", "₹110", "₹200"],
    1,
  ),
];

const logical = [
  question(
    "Which one does not belong: Apple, Mango, Potato, Banana?",
    "Odd one out",
    "EASY",
    ["Apple", "Mango", "Banana", "Potato"],
    3,
  ),
  question(
    "Find the next number: 3, 6, 12, 24, ?",
    "Number series",
    "EASY",
    ["36", "42", "48", "54"],
    2,
  ),
  question(
    "Find the next number: 2, 6, 12, 20, 30, ?",
    "Number series",
    "EASY",
    ["40", "42", "44", "48"],
    1,
  ),
  question(
    "If A = 1, B = 2, C = 3 and so on, the letters of FACE add up to:",
    "Coding and decoding",
    "MEDIUM",
    ["13", "16", "15", "17"],
    2,
  ),
  question(
    'Pointing to a man, a woman says, "His mother is the only daughter of my mother." How is the woman related to the man?',
    "Blood relations",
    "MEDIUM",
    ["Sister", "Mother", "Aunt", "Grandmother"],
    1,
  ),
  question(
    "Ravi walks 5 km north, then 3 km east, then 5 km south. How far is he from where he started?",
    "Directions",
    "MEDIUM",
    ["3 km", "5 km", "8 km", "13 km"],
    0,
  ),
  question(
    "In a race, P finished before Q, R finished after Q, and S finished before P. Who finished last?",
    "Ordering",
    "MEDIUM",
    ["P", "Q", "S", "R"],
    3,
  ),
  question(
    "Five people each shake hands once with every other person. How many handshakes happen?",
    "Combinatorial reasoning",
    "MEDIUM",
    ["10", "20", "15", "25"],
    0,
  ),
  question(
    "5 March 2024 was a Tuesday. What day of the week was 5 April 2024?",
    "Calendars",
    "MEDIUM",
    ["Wednesday", "Thursday", "Friday", "Saturday"],
    2,
  ),
  question(
    "What is the smaller angle between the hands of a clock at 3:30?",
    "Clocks",
    "HARD",
    ["60°", "75°", "90°", "105°"],
    1,
  ),
  question(
    'A says "B is a liar." B says "A and I are both truthful." Each person is either always truthful or always lying. Who is truthful?',
    "Truth and lies",
    "HARD",
    ["Both", "Neither", "Only B", "Only A"],
    3,
  ),
  question(
    "A cube painted red on all faces is cut into 27 equal small cubes. How many small cubes have exactly two red faces?",
    "Cubes",
    "HARD",
    ["8", "6", "12", "24"],
    2,
  ),
];

const verbal = [
  question(
    "Choose the word closest in meaning to ABUNDANT:",
    "Synonyms",
    "EASY",
    ["Scarce", "Plentiful", "Meagre", "Rare"],
    1,
  ),
  question(
    "Choose the word opposite in meaning to TRANSPARENT:",
    "Antonyms",
    "EASY",
    ["Clear", "Thin", "Opaque", "Bright"],
    2,
  ),
  question(
    "Fill in the blank: She ____ to the market every Sunday.",
    "Grammar",
    "EASY",
    ["goes", "go", "going", "gone"],
    0,
  ),
  question(
    "Fill in the blank: She is allergic ____ peanuts.",
    "Prepositions",
    "EASY",
    ["with", "to", "of", "from"],
    1,
  ),
  question(
    'Which single word means "present everywhere"?',
    "One-word substitution",
    "MEDIUM",
    ["Omniscient", "Omnipotent", "Omnivorous", "Omnipresent"],
    3,
  ),
  question(
    'What does the idiom "to bite the bullet" mean?',
    "Idioms",
    "MEDIUM",
    [
      "To face something unpleasant with courage",
      "To eat too quickly",
      "To speak angrily",
      "To give up early",
    ],
    0,
  ),
  question(
    "Choose the word opposite in meaning to BENEVOLENT:",
    "Antonyms",
    "MEDIUM",
    ["Generous", "Kind", "Malevolent", "Gentle"],
    2,
  ),
  question(
    "Fill in the blank: Neither the manager nor the employees ____ present at the meeting.",
    "Subject-verb agreement",
    "MEDIUM",
    ["was", "were", "is", "has been"],
    1,
  ),
  question(
    "Choose the correct sentence.",
    "Subject-verb agreement",
    "MEDIUM",
    [
      "Each of the students has submitted the assignment.",
      "Each of the students have submitted the assignment.",
      "Each of the students are submitting the assignment.",
      "Each of the student have submitted the assignment.",
    ],
    0,
  ),
  question(
    'Read the passage: "Honey never spoils. Archaeologists have found edible honey in ancient Egyptian tombs thousands of years old. Its low moisture and high acidity stop bacteria from growing." Why does honey not spoil?',
    "Reading comprehension",
    "MEDIUM",
    [
      "It is stored in tombs",
      "It is sealed from air",
      "It is very sweet",
      "Low moisture and acidity stop bacterial growth",
    ],
    3,
  ),
  question(
    "Choose the word closest in meaning to EPHEMERAL:",
    "Synonyms",
    "HARD",
    ["Short-lived", "Ancient", "Fragile", "Mysterious"],
    0,
  ),
  question(
    "Choose the word closest in meaning to PRAGMATIC:",
    "Synonyms",
    "HARD",
    ["Idealistic", "Practical", "Stubborn", "Cautious"],
    1,
  ),
];

const dataInterpretation = [
  question(
    "What were Phones sales in Q3?",
    "Table reading",
    "EASY",
    ["₹55 lakh", "₹60 lakh", "₹75 lakh", "₹70 lakh"],
    3,
    quarterlySales,
  ),
  question(
    "What were the total sales of all three products in Q2?",
    "Table reading",
    "EASY",
    ["₹130 lakh", "₹125 lakh", "₹135 lakh", "₹120 lakh"],
    0,
    quarterlySales,
  ),
  question(
    "In which quarter were total sales of all three products the highest?",
    "Table reading",
    "EASY",
    ["Q1", "Q2", "Q3", "Q4"],
    3,
    quarterlySales,
  ),
  question(
    "Which product had the highest sales over the full year?",
    "Table reading",
    "EASY",
    ["Laptops", "Phones", "Tablets", "All were equal"],
    1,
    quarterlySales,
  ),
  question(
    "What is the pass percentage of Section C?",
    "Percentages",
    "EASY",
    ["80%", "85%", "90%", "75%"],
    1,
    sectionResults,
  ),
  question(
    "By what percentage did Tablet sales grow from Q1 to Q3?",
    "Percentage change",
    "MEDIUM",
    ["25%", "40%", "50%", "60%"],
    2,
    quarterlySales,
  ),
  question(
    "What was the average quarterly sales of Phones?",
    "Averages",
    "MEDIUM",
    ["₹60 lakh", "₹65 lakh", "₹70 lakh", "₹62.5 lakh"],
    1,
    quarterlySales,
  ),
  question(
    "What is the ratio of full-year Laptop sales to full-year Tablet sales?",
    "Ratios",
    "MEDIUM",
    ["3 : 2", "5 : 2", "2 : 1", "3 : 1"],
    2,
    quarterlySales,
  ),
  question(
    "Which section had the lowest pass percentage?",
    "Percentages",
    "MEDIUM",
    ["Section A", "Section B", "Section C", "Section D"],
    3,
    sectionResults,
  ),
  question(
    "How many students failed across all four sections?",
    "Table reading",
    "MEDIUM",
    ["43", "41", "45", "47"],
    0,
    sectionResults,
  ),
  question(
    "What was the overall pass percentage across all four sections?",
    "Percentages",
    "HARD",
    ["78%", "80%", "78.5%", "79.5%"],
    2,
    sectionResults,
  ),
  question(
    "How many more students in Section D would have to pass for its pass percentage to equal Section A's?",
    "Percentages",
    "HARD",
    ["3", "5", "10", "4"],
    1,
    sectionResults,
  ),
];

const warmUp = [
  question("What is 15% of 200?", "Percentages", "EASY", ["30", "25", "35", "20"], 0),
  question(
    "Find the next number: 5, 10, 20, 40, ?",
    "Number series",
    "EASY",
    ["60", "70", "80", "100"],
    2,
  ),
  question(
    "Choose the word closest in meaning to BRAVE:",
    "Synonyms",
    "EASY",
    ["Timid", "Courageous", "Careless", "Quiet"],
    1,
  ),
  question(
    "Which one does not belong: Triangle, Square, Cube, Circle?",
    "Odd one out",
    "EASY",
    ["Triangle", "Square", "Circle", "Cube"],
    3,
  ),
  question(
    "A car travels at 60 km/h for 2.5 hours. How far does it go?",
    "Speed and distance",
    "EASY",
    ["120 km", "150 km", "140 km", "180 km"],
    1,
  ),
  question("What is the LCM of 12 and 18?", "Number system", "MEDIUM", ["24", "72", "36", "6"], 2),
  question(
    "What is the next prime number after 23?",
    "Number system",
    "MEDIUM",
    ["25", "27", "31", "29"],
    3,
  ),
  question("If 2x − 7 = 15, what is x?", "Algebra", "MEDIUM", ["11", "4", "8", "22"], 0),
  question(
    "Choose the word opposite in meaning to EXPAND:",
    "Antonyms",
    "MEDIUM",
    ["Grow", "Contract", "Stretch", "Spread"],
    1,
  ),
  question(
    "Through how many degrees does the minute hand of a clock turn in 10 minutes?",
    "Clocks",
    "MEDIUM",
    ["30°", "45°", "60°", "90°"],
    2,
  ),
  question(
    "Today is Monday. What day of the week will it be 100 days from today?",
    "Calendars",
    "HARD",
    ["Tuesday", "Wednesday", "Thursday", "Friday"],
    1,
  ),
  question(
    "How many diagonals does a hexagon have?",
    "Geometry",
    "HARD",
    ["6", "12", "9", "15"],
    2,
  ),
];

export const PRACTICE_QUESTION_SETS = [
  { id: "starter-quantitative-aptitude", title: "Quantitative aptitude", questions: quantitative },
  { id: "starter-logical-reasoning", title: "Logical reasoning", questions: logical },
  { id: "starter-verbal-ability", title: "Verbal ability", questions: verbal },
  {
    id: "starter-data-interpretation",
    title: "Data interpretation",
    questions: dataInterpretation,
  },
  { id: "starter-campus-warm-up", title: "Campus warm-up mix", questions: warmUp },
] as const;

function mediaData(media: unknown) {
  return media ? { media: media as object } : {};
}

export function seedPracticeQuestionSets(db: PrismaClient) {
  return Promise.all(
    PRACTICE_QUESTION_SETS.map((set) => {
      const questions = z.array(questionInputSchema).parse(set.questions);
      return db.questionSet.upsert({
        where: { id: set.id },
        update: {},
        create: {
          id: set.id,
          ownerId: null,
          isStarter: true,
          title: set.title,
          questions: {
            create: questions.map((item, position) => ({
              position,
              text: item.text,
              options: item.options,
              correctOptionId: item.correctOptionId,
              topic: item.topic,
              difficulty: item.difficulty,
              ...mediaData(item.media),
            })),
          },
        },
      });
    }),
  );
}
