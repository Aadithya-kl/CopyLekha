import type { Answer } from "@/lib/types";

// Two sample answers, written for this project, added on the very first visit
// only. The learner can delete them like any answer. The texts are already clean.

type SampleAnswer = Omit<Answer, "id" | "createdAt">;

const SAMPLE_TASK_1: SampleAnswer = {
  title: "Sample · Task 1",
  task: "task1",
  source: "sample",
  day: null,
  question:
    "The line graph below shows the percentage of commuters in one city who travelled to work by car, bus and train between 2000 and 2020. Cars fell from 60% in 2000 to 50% in 2010 and 38% in 2020. Buses rose from 25% to 30% in 2010, then fell to 27%. Trains rose steadily from 15% to 20% and then 35%.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  text: [
    "The line graph illustrates the proportion of commuters in one city who travelled to work by car, bus and train over a twenty-year period, from 2000 to 2020.",
    "Overall, the car remained the most popular means of transport throughout the period, although its share declined considerably. In contrast, rail travel became far more common, and by 2020 it was almost as popular as driving.",
    "In 2000, 60% of commuters drove to work, while buses and trains accounted for 25% and 15% respectively. Over the following decade, the figure for cars fell to 50%, whereas bus use rose to a peak of 30% and the share of train passengers increased to 20%.",
    "Between 2010 and 2020, car use continued to decline, reaching 38% at the end of the period. Bus travel dropped slightly to 27%, but the proportion of people commuting by train grew steadily, climbing to 35%, more than double its level in 2000 and just three percentage points below the figure for cars.",
  ].join("\n\n"),
  vocabulary: [
    { phrase: "means of transport", meaning: "a way of travelling from one place to another" },
    { phrase: "accounted for", meaning: "made up a part of a total" },
    { phrase: "respectively", meaning: "in the same order as the things already mentioned" },
    { phrase: "rose to a peak of", meaning: "increased to its highest point" },
  ],
};

const SAMPLE_TASK_2: SampleAnswer = {
  title: "Sample · Task 2",
  task: "task2",
  source: "sample",
  day: null,
  question:
    "Some people believe that university education should be free for all students, while others think that students should pay for their own studies.\n\nDiscuss both views and give your own opinion.",
  text: [
    "In many countries, the cost of higher education has risen sharply in recent decades, and this has led to a debate about who should pay for it. While some argue that students should cover their own fees, I believe that university education should be free, as its benefits extend far beyond the individual.",
    "On the one hand, there are reasonable arguments for asking students to pay. Graduates usually earn higher salaries than people without a degree, so it seems fair that they should bear at least part of the cost. Moreover, fees may encourage students to take their studies seriously and to choose courses that lead to employment. Finally, funding universities entirely from taxes places a heavy burden on public budgets, which could otherwise be spent on other vital services such as hospitals or schools.",
    "On the other hand, free higher education offers clear advantages for society as a whole. When tuition is free, talented young people from low-income families are not prevented from studying simply because of their financial background. This creates a fairer society in which success depends on ability and effort rather than wealth. In addition, a well-educated workforce drives innovation and economic growth, and the extra tax that graduates pay over their careers can help to repay the initial investment.",
    "In conclusion, although charging fees may reduce public spending and motivate some students, I am convinced that free university education is the better choice. Governments should regard it not as a cost but as an investment in the future of the whole nation, since everyone eventually benefits from a more skilled and better-informed population.",
  ].join("\n\n"),
  vocabulary: [
    { phrase: "extend far beyond", meaning: "reach much further than" },
    { phrase: "places a heavy burden on", meaning: "puts a lot of cost or pressure on" },
    { phrase: "financial background", meaning: "how much money a person's family has" },
    { phrase: "rather than", meaning: "instead of" },
    { phrase: "drives innovation", meaning: "makes new ideas and methods happen" },
  ],
};

export const SAMPLE_ANSWERS: readonly SampleAnswer[] = [SAMPLE_TASK_1, SAMPLE_TASK_2];

// The Task 2 sample is the one loaded on the first visit.
export const FIRST_VISIT_SAMPLE_TASK = "task2";

export const createSampleAnswers = (createdAt: string): Answer[] =>
  SAMPLE_ANSWERS.map((sample) => ({ ...sample, id: crypto.randomUUID(), createdAt }));
