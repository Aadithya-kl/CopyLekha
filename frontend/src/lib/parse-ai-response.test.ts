import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createImportTitle,
  describeReply,
  type ParsedResponse,
  parseAiResponse,
  removeMarkdown,
} from "@/lib/parse-ai-response";
import { tokenize } from "@/lib/tokenize";

// The fixture is a reply in the prompt's format, as ChatGPT's copy button gives it.
// The text comes from a real ChatGPT reply (Day 1); the layout (code fences, "- " lines,
// the Markdown table) was written out by hand from the screen.
const FIXTURE = readFileSync(
  resolve(process.cwd(), "src/lib/parse-ai-response.fixture.txt"),
  "utf8",
);

const reply = (lines: string[]) => lines.join("\n");

const expectAiReply = (parsed: ParsedResponse) => {
  if (parsed.kind !== "ai-reply") {
    throw new Error(`Expected an AI reply, got ${parsed.kind}`);
  }
  return parsed;
};

describe("parseAiResponse: a full reply", () => {
  const parsed = expectAiReply(parseAiResponse(FIXTURE));
  const [task1, task2] = parsed.tasks;

  it("finds the day and both tasks", () => {
    expect(parsed.day).toBe(1);
    expect(parsed.tasks.map((task) => task.task)).toEqual(["task1", "task2"]);
  });

  it("keeps each answer without its code fence, with its paragraphs", () => {
    expect(task1?.text.startsWith("The table compares the proportions")).toBe(true);
    expect(task1?.text.endsWith("below the other three nations.")).toBe(true);
    expect(task1?.text.includes("```")).toBe(false);
    expect(task1?.text.split("\n\n")).toHaveLength(4);
    expect(tokenize(task1?.text ?? "")).toHaveLength(170);
    expect(tokenize(task2?.text ?? "")).toHaveLength(288);
  });

  it("keeps the question as text, the data table included", () => {
    expect(task1?.question?.startsWith("The table below shows the percentage")).toBe(true);
    expect(task1?.question?.includes("| Sweden | 50% | 68% | 85% |")).toBe(true);
    expect(task2?.question?.startsWith("Some people believe")).toBe(true);
  });

  it("splits each vocabulary line at the first colon", () => {
    expect(task1?.vocabulary).toHaveLength(4);
    expect(task1?.vocabulary[3]).toEqual({
      phrase: "across the board",
      meaning: "affecting all the groups or categories",
    });
    expect(task2?.vocabulary).toHaveLength(5);
  });
});

describe("parseAiResponse: marker rules", () => {
  it("matches markers in another case and with extra spaces", () => {
    const parsed = expectAiReply(
      parseAiResponse(
        reply([
          "  ===  day 7 ===",
          "===task 2   Answer===",
          "Cities grow.",
          "=== Task 2 question ===",
        ]),
      ),
    );

    expect(parsed.day).toBe(7);
    expect(parsed.tasks).toEqual([
      { task: "task2", question: null, text: "Cities grow.", vocabulary: [] },
    ]);
  });

  it("removes a code fence with or without a language name", () => {
    const parsed = expectAiReply(
      parseAiResponse(
        reply([
          "=== TASK 1 ANSWER ===",
          "```",
          "First line.",
          "```",
          "=== TASK 2 ANSWER ===",
          "```plaintext",
          "Second line.",
          "```",
        ]),
      ),
    );

    expect(parsed.tasks.map((task) => task.text)).toEqual(["First line.", "Second line."]);
  });

  it("cleans the answer", () => {
    const parsed = expectAiReply(
      parseAiResponse(reply(["=== TASK 1 ANSWER ===", "It’s  well—known…", "", "", "", "End."])),
    );

    expect(parsed.tasks[0]?.text).toBe("It's well-known...\n\nEnd.");
  });

  it("imports only the task that has an answer", () => {
    const parsed = expectAiReply(
      parseAiResponse(
        reply([
          "=== DAY 2 ===",
          "=== TASK 1 QUESTION ===",
          "A chart.",
          "=== TASK 1 ANSWER ===",
          "",
          "=== TASK 2 QUESTION ===",
          "An essay.",
          "=== TASK 2 ANSWER ===",
          "The essay.",
        ]),
      ),
    );

    expect(parsed.tasks).toEqual([
      { task: "task2", question: "An essay.", text: "The essay.", vocabulary: [] },
    ]);
  });

  it("leaves the vocabulary empty when it is missing", () => {
    const parsed = expectAiReply(parseAiResponse(reply(["=== TASK 1 ANSWER ===", "Text."])));

    expect(parsed.tasks[0]?.vocabulary).toEqual([]);
    expect(parsed.day).toBeNull();
  });

  it("skips vocabulary lines that don't fit, and splits at the first colon only", () => {
    const parsed = expectAiReply(
      parseAiResponse(
        reply([
          "=== TASK 1 ANSWER ===",
          "Text.",
          "=== TASK 1 VOCABULARY ===",
          "- a ratio: 2:1 or so",
          "a line without a dash: skipped",
          "- no colon here",
          "- : no phrase",
          "(3 to 4 items)",
        ]),
      ),
    );

    expect(parsed.tasks[0]?.vocabulary).toEqual([{ phrase: "a ratio", meaning: "2:1 or so" }]);
  });

  it("ignores text before the first marker and after the last section", () => {
    const parsed = expectAiReply(
      parseAiResponse(
        reply([
          "Sure! Here is Day 4.",
          "=== DAY 4 ===",
          "Some words after the day.",
          "=== TASK 1 ANSWER ===",
          "Text.",
          "=== TASK 1 VOCABULARY ===",
          "- a phrase: a meaning",
          "",
          "Good luck with your practice!",
        ]),
      ),
    );

    expect(parsed.day).toBe(4);
    expect(parsed.tasks).toEqual([
      {
        task: "task1",
        question: null,
        text: "Text.",
        vocabulary: [{ phrase: "a phrase", meaning: "a meaning" }],
      },
    ]);
  });

  it("accepts Windows line breaks", () => {
    const parsed = expectAiReply(
      parseAiResponse("=== DAY 3 ===\r\n=== TASK 1 ANSWER ===\r\nOne.\r\n\r\nTwo."),
    );

    expect(parsed.day).toBe(3);
    expect(parsed.tasks[0]?.text).toBe("One.\n\nTwo.");
  });
});

describe("parseAiResponse: no markers", () => {
  it("treats the text as one plain answer, with Markdown removed and cleaned", () => {
    const parsed = parseAiResponse(
      reply([
        "## Model answer",
        "```",
        "The **graph** shows __two__ lines.",
        "",
        "- It rose.",
        "> It fell.",
        "```",
      ]),
    );

    expect(parsed).toEqual({
      kind: "plain",
      text: "Model answer\nThe graph shows two lines.\n\nIt rose.\nIt fell.",
    });
  });

  it("treats markers without an answer as no task found", () => {
    const parsed = parseAiResponse(reply(["=== TASK 1 QUESTION ===", "A chart."]));

    expect(parsed.kind).toBe("plain");
  });

  it("keeps a plain answer that has no Markdown as it is", () => {
    expect(parseAiResponse("In 2000, 40% rose.\n\nThen -5% fell.")).toEqual({
      kind: "plain",
      text: "In 2000, 40% rose.\n\nThen -5% fell.",
    });
  });
});

describe("removeMarkdown", () => {
  it("removes a line-start dash only when a space follows it", () => {
    expect(removeMarkdown("- one\n-5% two")).toBe("one\n-5% two");
  });

  it("keeps a # that is not a heading", () => {
    expect(removeMarkdown("#1 in the ranking")).toBe("#1 in the ranking");
  });
});

describe("createImportTitle", () => {
  it("names the day and the task", () => {
    expect(createImportTitle(3, "task1")).toBe("Day 3 · Task 1");
  });

  it("names only the task without a day", () => {
    expect(createImportTitle(null, "task2")).toBe("Task 2");
  });
});

describe("describeReply", () => {
  it("says what was found in the full reply", () => {
    const parsed = expectAiReply(parseAiResponse(FIXTURE));

    expect(describeReply(parsed.day, parsed.tasks)).toBe(
      "Day 1: Task 1, 170 words · Task 2, 288 words",
    );
  });

  it("leaves out the day when there is none, and counts one word", () => {
    const parsed = expectAiReply(parseAiResponse(reply(["=== TASK 2 ANSWER ===", "Hello."])));

    expect(describeReply(parsed.day, parsed.tasks)).toBe("Task 2, 1 word");
  });
});
