import { ArrowRight, Library, RotateCcw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/stats";
import type { Attempt, ErrorKind, VocabularyItem } from "@/lib/types";
import { cn } from "@/lib/utils";

// The Result, in place of the two boxes when an attempt ends.

const ERROR_KINDS: ErrorKind[] = ["spelling", "case", "punctuation"];

const KIND_LABEL: Record<ErrorKind, string> = {
  spelling: "Spelling",
  case: "Capital letters",
  punctuation: "Punctuation",
};

// The cards come in one after another, unless the system asks for less motion.
const STAT_CARD_ENTRANCE =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:fill-mode-both";
const STAT_CARD_DELAYS = [
  "motion-safe:delay-0",
  "motion-safe:delay-75",
  "motion-safe:delay-150",
  "motion-safe:delay-225",
] as const;

const StatCard = ({
  label,
  value,
  position,
  isAccent = false,
}: {
  label: string;
  value: string;
  position: number; // the card's place in the row, for its entrance delay
  isAccent?: boolean;
}) => (
  <div
    className={cn(
      "rounded-lg border bg-card px-4 py-3",
      STAT_CARD_ENTRANCE,
      STAT_CARD_DELAYS[position],
    )}
  >
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className={cn("text-2xl font-semibold tabular-nums", isAccent && "text-primary")}>
      {value}
    </dd>
  </div>
);

const ComparisonLine = ({
  accuracy,
  previousAccuracy,
}: {
  accuracy: number;
  previousAccuracy: number | null;
}) => (
  <p className="text-muted-foreground">
    {previousAccuracy === null
      ? "First attempt on this answer"
      : `Last time ${previousAccuracy}%, this time ${accuracy}%`}
  </p>
);

// The personal best on this answer; nothing for a first attempt.
const BestLine = ({
  accuracy,
  bestAccuracy,
}: {
  accuracy: number;
  bestAccuracy: number | null;
}) => {
  if (bestAccuracy === null) {
    return null;
  }
  return accuracy > bestAccuracy ? (
    <p className="font-semibold text-primary">New best accuracy on this answer</p>
  ) : (
    <p className="text-muted-foreground">Your best on this answer: {bestAccuracy}%</p>
  );
};

const Mistakes = ({ errors }: { errors: Attempt["errors"] }) => (
  <section aria-labelledby="mistakes-heading" className="flex flex-col gap-3">
    <h3 id="mistakes-heading" className="text-lg font-semibold">
      Mistakes
    </h3>

    <ul className="flex flex-wrap gap-x-6 gap-y-1">
      {ERROR_KINDS.map((kind) => (
        <li key={kind}>
          {KIND_LABEL[kind]}{" "}
          <span className="font-semibold tabular-nums">
            {errors.filter((error) => error.kind === kind).length}
          </span>
        </li>
      ))}
    </ul>

    {errors.length === 0 ? (
      <p>No mistakes in this attempt.</p>
    ) : (
      <div
        className="max-h-80 overflow-y-auto rounded-lg border bg-card"
        tabIndex={0}
        role="region"
        aria-label="List of mistakes"
      >
        <table className="w-full text-left">
          <thead className="text-sm text-muted-foreground">
            <tr className="border-b">
              <th scope="col" className="px-4 py-2 font-medium">
                Correct
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                You typed
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Kind
              </th>
            </tr>
          </thead>
          <tbody>
            {errors.map((error) => (
              // A word's position in the model answer is its identity.
              <tr key={error.index} className="border-b last:border-b-0">
                <td className="px-4 py-2">{error.expected}</td>
                <td className="px-4 py-2 text-error">{error.typed}</td>
                <td className="px-4 py-2">{KIND_LABEL[error.kind]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

// A phrase with a wrong word inside it is highlighted, and says so in words too.
const Vocabulary = ({
  vocabulary,
  hasMistake,
}: {
  vocabulary: VocabularyItem[];
  hasMistake: boolean[];
}) => (
  <section aria-labelledby="vocabulary-heading" className="flex flex-col gap-3">
    <h3 id="vocabulary-heading" className="text-lg font-semibold">
      Vocabulary
    </h3>
    <dl className="flex flex-col gap-2">
      {vocabulary.map((item, position) => (
        // The list comes from the answer and never reorders.
        <div
          key={position}
          className={cn(
            "rounded-md px-3 py-2",
            hasMistake[position] ? "bg-warning text-warning-foreground" : "border bg-card",
          )}
        >
          <dt className="font-semibold">
            {item.phrase}
            {hasMistake[position] && (
              <span className="ml-2 text-sm font-normal">(mistake here)</span>
            )}
          </dt>
          <dd className={cn(!hasMistake[position] && "text-muted-foreground")}>{item.meaning}</dd>
        </div>
      ))}
    </dl>
  </section>
);

type ResultViewProps = {
  attempt: Attempt;
  // Null for the first attempt on this answer.
  previousAccuracy: number | null;
  // The highest accuracy of the earlier attempts on this answer; null for a first attempt.
  bestAccuracy: number | null;
  vocabulary: VocabularyItem[];
  // For each vocabulary item, whether it holds a wrong word.
  vocabularyWithMistakes: boolean[];
  onTryAgain: () => void;
  onChooseAnother: () => void;
  // The answer after this one in the daily order (Day 1 Task 1, Day 1 Task 2 ...), if any.
  next: { title: string; onStart: () => void } | null;
  // Set after practising a sample answer: the next step is to get answers from AI.
  onGetAnswers: (() => void) | null;
};

// After a sample answer, the learner learns where their own answers come from.
const NextStep = ({ onGetAnswers }: { onGetAnswers: () => void }) => (
  <div className="flex flex-col items-start gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
    <p>Get a new Task 1 and Task 2 every day from your own AI chat.</p>
    <Button variant="outline" size="lg" onClick={onGetAnswers}>
      <Sparkles aria-hidden="true" />
      Get answers from AI
    </Button>
  </div>
);

export const ResultView = ({
  attempt,
  previousAccuracy,
  bestAccuracy,
  vocabulary,
  vocabularyWithMistakes,
  onTryAgain,
  onChooseAnother,
  next,
  onGetAnswers,
}: ResultViewProps) => (
  <section
    aria-labelledby="result-heading"
    className="flex flex-col gap-6 motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in-0"
  >
    <div className="flex flex-col gap-1">
      <h2 id="result-heading" className="text-2xl font-semibold">
        {attempt.complete ? "Result" : "Incomplete attempt"}
      </h2>
      <ComparisonLine accuracy={attempt.accuracy} previousAccuracy={previousAccuracy} />
      <BestLine accuracy={attempt.accuracy} bestAccuracy={bestAccuracy} />
    </div>

    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="WPM" value={String(attempt.wpm)} position={0} />
      <StatCard label="Accuracy" value={`${attempt.accuracy}%`} position={1} isAccent />
      <StatCard label="Time" value={formatDuration(attempt.durationMs)} position={2} />
      <StatCard
        label="Words"
        value={`${attempt.wordsTyped} / ${attempt.wordsTotal}`}
        position={3}
      />
    </dl>

    <div className="flex flex-wrap gap-2">
      {/* Focus moves here when the Result appears, so Enter tries again. */}
      <Button size="lg" onClick={onTryAgain} autoFocus>
        <RotateCcw aria-hidden="true" />
        Try again
      </Button>
      {next !== null && (
        <Button variant="outline" size="lg" onClick={next.onStart}>
          Start {next.title}
          <ArrowRight aria-hidden="true" />
        </Button>
      )}
      <Button variant="outline" size="lg" onClick={onChooseAnother}>
        <Library aria-hidden="true" />
        Choose another answer
      </Button>
    </div>

    {onGetAnswers !== null && <NextStep onGetAnswers={onGetAnswers} />}

    <Mistakes errors={attempt.errors} />

    {vocabulary.length > 0 && (
      <Vocabulary vocabulary={vocabulary} hasMistake={vocabularyWithMistakes} />
    )}
  </section>
);
