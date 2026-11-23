import { describe, expect, it } from "vitest";

import { cleanText, hasHardToTypeCharacters } from "@/lib/clean-text";

describe("cleanText", () => {
  it("turns Windows and old Mac line breaks into \\n", () => {
    expect(cleanText("one\r\ntwo\rthree")).toBe("one\ntwo\nthree");
  });

  it("turns curly single quotes into a straight one", () => {
    expect(cleanText("‘It’s’")).toBe("'It's'");
  });

  it("turns curly double quotes into a straight one", () => {
    expect(cleanText("“well-known”")).toBe('"well-known"');
  });

  it("turns en and em dashes into a hyphen", () => {
    expect(cleanText("2000–2020 — a rise")).toBe("2000-2020 - a rise");
  });

  it("turns the ellipsis character into three dots", () => {
    expect(cleanText("and so on…")).toBe("and so on...");
  });

  it("turns non-breaking spaces, the narrow one and tabs into a normal space", () => {
    expect(cleanText("40 %\tof people")).toBe("40 % of people");
  });

  it("turns repeated spaces into one", () => {
    expect(cleanText("the    chart  shows")).toBe("the chart shows");
  });

  it("turns a non-breaking space next to a space into one space", () => {
    expect(cleanText("the  chart")).toBe("the chart");
  });

  it("trims every line", () => {
    expect(cleanText("  first line  \n\tsecond line ")).toBe("first line\nsecond line");
  });

  it("keeps one blank line between paragraphs", () => {
    expect(cleanText("first\n\nsecond")).toBe("first\n\nsecond");
  });

  it("turns two or more blank lines into one", () => {
    expect(cleanText("first\n\n\nsecond\n\n\n\n\nthird")).toBe("first\n\nsecond\n\nthird");
  });

  it("treats a line with only spaces as a blank line", () => {
    expect(cleanText("first\n   \n \t \nsecond")).toBe("first\n\nsecond");
  });

  it("keeps a single line break", () => {
    expect(cleanText("first\nsecond")).toBe("first\nsecond");
  });

  it("removes blank lines at the start and end", () => {
    expect(cleanText("\n\n  \nThe chart shows a rise.\n\n \n")).toBe("The chart shows a rise.");
  });

  it("returns an empty string for text with only spaces and line breaks", () => {
    expect(cleanText(" \r\n\t \n ")).toBe("");
  });

  it("leaves clean text unchanged", () => {
    const text = "The graph shows 40% of people.\n\nOverall, it rose.";
    expect(cleanText(text)).toBe(text);
  });

  it("cleans a pasted answer with every rule at once", () => {
    const pasted =
      "\r\n  The chart shows how “screen time” changed…  \r\n" +
      "\r\n\r\n\r\n" +
      "\tFrom 2000–2020, children’s use  rose — sharply.  \r\n";

    expect(cleanText(pasted)).toBe(
      'The chart shows how "screen time" changed...\n\n' +
        "From 2000-2020, children's use rose - sharply.",
    );
  });
});

describe("hasHardToTypeCharacters", () => {
  it("accepts keyboard characters, line breaks and the pound sign", () => {
    expect(hasHardToTypeCharacters('It cost £500 (40%) - "well-known"...\n\nEnd.')).toBe(false);
  });

  it("finds letters and symbols outside a standard English keyboard", () => {
    expect(hasHardToTypeCharacters("a café")).toBe(true);
    expect(hasHardToTypeCharacters("10 €")).toBe(true);
    expect(hasHardToTypeCharacters("লেখা")).toBe(true);
  });
});
