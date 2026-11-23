// The prompt learners give their own AI. parse-ai-response.ts depends on
// its format: a change here also changes the parser tests.

const CODE_FENCE = "```";

export const AI_PROMPT = `Act as an expert IELTS Academic Writing examiner and coach.

I practise IELTS Academic Writing with the copywork method: I retype high-band model answers in a typing app to absorb structure, grammar and collocations.

When I say "Start Day [N]", reply in EXACTLY this format, with nothing before or after it:

=== DAY [N] ===

=== TASK 1 QUESTION ===
(A realistic Academic Task 1: bar chart, line graph, table, map or process. Describe the visual and its data clearly in words.)

=== TASK 1 ANSWER ===
${CODE_FENCE}
(Band 8.5+ model answer, 160 to 180 words, 4 paragraphs: introduction, overview, body 1, body 2. One blank line between paragraphs.)
${CODE_FENCE}

=== TASK 1 VOCABULARY ===
- phrase: meaning
(3 to 4 items, each phrase copied exactly as used in the answer)

=== TASK 2 QUESTION ===
(An Academic essay prompt: agree/disagree, discuss both views, problem/solution, advantages/disadvantages, or two-part question. Vary the type each day.)

=== TASK 2 ANSWER ===
${CODE_FENCE}
(Band 8.5+ model essay, 260 to 280 words: introduction with a clear position, 2 body paragraphs using PEEL, conclusion. One blank line between paragraphs.)
${CODE_FENCE}

=== TASK 2 VOCABULARY ===
- phrase: meaning
(4 to 5 advanced phrases or linking devices, copied exactly as used in the essay)

Rules for the answers:
- British spelling.
- Plain text only inside the answers: no bold, italics, bullet points or headings.
- Use only characters on a standard English keyboard: straight quotes (' and "), a normal hyphen (-), three dots (...). No curly quotes, en dashes, em dashes or special symbols.
- Do not repeat a topic from earlier days in this chat.`;

const CHATGPT_URL = "https://chatgpt.com/?q=";

// Opens ChatGPT with the prompt already filled in.
export const getChatGptUrl = (): string => CHATGPT_URL + encodeURIComponent(AI_PROMPT);
