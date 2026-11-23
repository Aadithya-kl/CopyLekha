import { ClipboardPaste, Library, Sparkles, Volume2, VolumeOff } from "lucide-react";
import { type ReactNode, useCallback, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type Answer, TASK_LABELS, type TimeLimit } from "@/lib/types";

const SOUND_NOT_SUPPORTED = "Sound isn't supported in this browser.";

// The top bar. The page passes the speaker, timer and Settings controls
// as children; they come after Library. Paste and Library show only their icon, with the
// name in a tooltip, so the whole bar fits on one line from 1024 px up.

// Tooltips render inside <main>, so they stay in a landmark (axe's "region" rule).
const useMainContainer = () => {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const attach = useCallback(
    (element: HTMLElement | null) =>
      setContainer(element === null ? null : element.closest("main")),
    [],
  );
  return { attach, container: container ?? undefined };
};

type IconButtonProps = {
  label: string;
  // What the guided tour calls this button.
  tourId: string;
  icon: ReactNode;
  disabled?: boolean;
  onClick: () => void;
};

const IconButton = ({ label, tourId, icon, disabled = false, onClick }: IconButtonProps) => {
  const { attach, container } = useMainContainer();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          ref={attach}
          variant="outline"
          size="icon-lg"
          aria-label={label}
          data-tour={tourId}
          disabled={disabled}
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent container={container}>{label}</TooltipContent>
    </Tooltip>
  );
};

type TopBarProps = {
  // Null while loading or when the Library is empty.
  answer: Answer | null;
  // False until the stored answers are read.
  isReady: boolean;
  onPaste: () => void;
  onGetAnswers: () => void;
  onOpenLibrary: () => void;
  children?: ReactNode;
};

export const TopBar = ({
  answer,
  isReady,
  onPaste,
  onGetAnswers,
  onOpenLibrary,
  children,
}: TopBarProps) => (
  <header className="flex min-h-10 flex-wrap items-center gap-x-4 gap-y-2 lg:flex-nowrap">
    <p className="text-lg font-semibold text-primary">CopyLekha</p>
    {answer !== null && (
      <div className="flex min-w-0 items-center gap-2 lg:flex-1">
        <span className="shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium">
          {TASK_LABELS[answer.task]}
        </span>
        <h1 className="truncate font-medium">{answer.title}</h1>
      </div>
    )}
    <div className="ml-auto flex flex-wrap gap-2 lg:shrink-0 lg:flex-nowrap">
      <IconButton
        label="Paste"
        tourId="paste"
        icon={<ClipboardPaste aria-hidden="true" />}
        disabled={!isReady}
        onClick={onPaste}
      />
      <Button
        variant="outline"
        size="lg"
        data-tour="get-answers"
        // The next day comes from the stored answers, so it waits for them like the others.
        disabled={!isReady}
        onClick={onGetAnswers}
      >
        <Sparkles aria-hidden="true" />
        Get answers from AI
      </Button>
      <IconButton
        label="Library"
        tourId="library"
        icon={<Library aria-hidden="true" />}
        disabled={!isReady}
        onClick={onOpenLibrary}
      />
      {children}
    </div>
  </header>
);

type SoundButtonProps = {
  isOn: boolean;
  isSupported: boolean;
  isReady: boolean;
  onToggle: () => void;
};

// A disabled button gets no pointer or focus events, so a wrapper holds the tooltip.
const UnsupportedSoundButton = () => {
  const { attach, container } = useMainContainer();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span ref={attach} tabIndex={0} className="rounded-md">
          <Button variant="outline" size="icon-lg" aria-label="Sound" disabled>
            <VolumeOff aria-hidden="true" />
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent container={container}>{SOUND_NOT_SUPPORTED}</TooltipContent>
    </Tooltip>
  );
};

// Turns speaking each word on and off; on by default.
export const SoundButton = ({ isOn, isSupported, isReady, onToggle }: SoundButtonProps) => {
  if (!isSupported) {
    return <UnsupportedSoundButton />;
  }

  return (
    <Button
      variant="outline"
      size="icon-lg"
      aria-label="Sound"
      aria-pressed={isOn}
      disabled={!isReady}
      onClick={onToggle}
    >
      {isOn ? <Volume2 aria-hidden="true" /> : <VolumeOff aria-hidden="true" />}
    </Button>
  );
};

const TIME_LIMIT_OPTIONS: readonly { value: TimeLimit; label: string }[] = [
  { value: 0, label: "No limit" },
  { value: 20, label: "20 min" },
  { value: 40, label: "40 min" },
];

type TimerOptionsProps = {
  value: TimeLimit;
  // True once typing has started: a new limit then restarts the attempt.
  needsRestart: boolean;
  isReady: boolean;
  onChange: (limit: TimeLimit) => void;
  // Called instead of the dialog's own focus return, so focus can go to the typing box.
  onCloseAutoFocus: (event: Event) => void;
};

// No limit, 20 min or 40 min. After the first key a change asks first.
export const TimerOptions = ({
  value,
  needsRestart,
  isReady,
  onChange,
  onCloseAutoFocus,
}: TimerOptionsProps) => {
  const [pendingLimit, setPendingLimit] = useState<TimeLimit | null>(null);

  const handleChoose = (limit: TimeLimit) => {
    if (limit === value) {
      return;
    }
    if (needsRestart) {
      setPendingLimit(limit);
      return;
    }
    onChange(limit);
  };

  return (
    <>
      <div role="group" aria-label="Time limit" className="flex rounded-md border">
        {TIME_LIMIT_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant="ghost"
            size="lg"
            aria-pressed={option.value === value}
            disabled={!isReady}
            onClick={() => handleChoose(option.value)}
            // The chosen limit is a quiet green, so it doesn't look like the main button.
            className="rounded-none first:rounded-l-md last:rounded-r-md aria-pressed:bg-selected aria-pressed:font-semibold aria-pressed:text-selected-foreground aria-pressed:hover:bg-selected aria-pressed:hover:text-selected-foreground"
          >
            {option.label}
          </Button>
        ))}
      </div>

      <AlertDialog
        open={pendingLimit !== null}
        onOpenChange={(isOpen) => !isOpen && setPendingLimit(null)}
      >
        <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart with the new time limit?</AlertDialogTitle>
            <AlertDialogDescription>
              The attempt you started won&apos;t be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingLimit !== null && onChange(pendingLimit)}>
              Restart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
