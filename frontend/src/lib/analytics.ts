import type { AnswerSource, Task } from "@/lib/types";

// The only events the app sends, each with only these
// properties. An event never carries answer text, typed text, a title or anything personal.
type AnalyticsEvents = {
  practice_start: { task: Task };
  practice_finish: { task: Task; complete: boolean };
  answer_import: { source: Exclude<AnswerSource, "sample">; count: 1 | 2 };
  prompt_copy: undefined;
  open_chatgpt: undefined;
};

export type AnalyticsEventName = keyof AnalyticsEvents;

type EventData = Record<string, string | number | boolean>;

// The part of the Umami script the app uses. Declaration merging adds it to window.
type Umami = {
  track: (eventName: string, data?: EventData) => void;
};

declare global {
  interface Window {
    umami?: Umami;
  }
}

// Events with properties need them; events without properties take none.
type TrackArguments<Name extends AnalyticsEventName> = AnalyticsEvents[Name] extends undefined
  ? [name: Name]
  : [name: Name, data: AnalyticsEvents[Name]];

// Sends an event when Umami is loaded (production, with a website id); otherwise does nothing.
// Analytics never breaks the app, so any error from the script is ignored.
export const track = <Name extends AnalyticsEventName>(...args: TrackArguments<Name>): void => {
  if (typeof window === "undefined" || window.umami === undefined) {
    return;
  }
  const [name, data] = args;
  try {
    if (data === undefined) {
      window.umami.track(name);
    } else {
      window.umami.track(name, data);
    }
  } catch {
    // Nothing to do: a failed count must not affect practice.
  }
};
