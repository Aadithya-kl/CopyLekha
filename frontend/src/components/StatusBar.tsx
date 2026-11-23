import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatDuration } from "@/lib/stats";

// One line with the time, the word count, a progress bar, Restart and Finish.
// No live WPM or accuracy while typing. The Result takes its place when the attempt ends.

// With a time limit, the time left turns red in the last two minutes, as a test clock would.
const TIME_WARNING_MS = 2 * 60_000;

type StatusBarProps = {
  elapsedMs: number;
  // Null without a time limit; then the time counts up.
  remainingMs: number | null;
  wordsTyped: number;
  wordsTotal: number;
  onRestart: () => void;
  onFinish: () => void;
};

export const StatusBar = ({
  elapsedMs,
  remainingMs,
  wordsTyped,
  wordsTotal,
  onRestart,
  onFinish,
}: StatusBarProps) => {
  const progress = wordsTotal === 0 ? 0 : Math.round((wordsTyped / wordsTotal) * 100);
  const isCountingDown = remainingMs !== null;
  const isTimeRunningOut = isCountingDown && remainingMs <= TIME_WARNING_MS;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <p className="tabular-nums">
        <span className="text-muted-foreground">{isCountingDown ? "Time left " : "Time "}</span>
        <span
          data-warning={isTimeRunningOut}
          className="data-[warning=true]:font-semibold data-[warning=true]:text-error"
        >
          {formatDuration(isCountingDown ? remainingMs : elapsedMs)}
        </span>
      </p>
      <p className="tabular-nums">
        <span className="sr-only">Words typed: </span>
        {wordsTyped} / {wordsTotal}
      </p>
      <Progress value={progress} aria-label="Progress" className="min-w-24 flex-1" />

      <div className="flex gap-2">
        <Button variant="outline" size="lg" onClick={onRestart}>
          <RotateCcw aria-hidden="true" />
          Restart
        </Button>
        <Button variant="outline" size="lg" onClick={onFinish}>
          Finish
        </Button>
      </div>
    </div>
  );
};
