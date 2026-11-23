"use client";

import { useId } from "react";

import { isAnalyticsOn } from "@/components/Analytics";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// About the app, the author's links and what happens to the learner's data.

const AUTHOR_GITHUB_URL = "https://github.com/hossain101199";
const AUTHOR_LINKEDIN_URL = "https://www.linkedin.com/in/hossain1011/";
const SOURCE_URL = "https://github.com/hossain101199/CopyLekha";
const ISSUES_URL = `${SOURCE_URL}/issues`;

// Every external link opens in a new tab, and says so to screen readers.
const ExternalLink = ({ href, children }: { href: string; children: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="rounded-sm text-primary underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-3 focus-visible:ring-ring/50"
  >
    {children}
    <span className="sr-only"> (opens in a new tab)</span>
  </a>
);

type AboutPopoverProps = {
  // Called instead of the popover's own focus return, so focus can go to the typing box.
  onCloseAutoFocus: (event: Event) => void;
};

export const AboutPopover = ({ onCloseAutoFocus }: AboutPopoverProps) => {
  const titleId = useId();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="link" size="lg" className="px-1 text-muted-foreground">
          About
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        aria-labelledby={titleId}
        className="flex w-80 flex-col gap-3 text-sm"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <h2 id={titleId} className="font-semibold">
          About CopyLekha
        </h2>
        <p>CopyLekha: copywork practice for IELTS Academic Writing.</p>
        <p>
          Built by Hossain: <ExternalLink href={AUTHOR_GITHUB_URL}>GitHub</ExternalLink> ·{" "}
          <ExternalLink href={AUTHOR_LINKEDIN_URL}>LinkedIn</ExternalLink>
        </p>
        <p>
          <ExternalLink href={SOURCE_URL}>View source on GitHub</ExternalLink> ·{" "}
          <ExternalLink href={ISSUES_URL}>Report an issue</ExternalLink>
        </p>
        <p className="text-muted-foreground">
          Your answers and progress stay in your browser.
          {/* Only builds with an Umami id count anything (local runs and forks don't). */}
          {isAnalyticsOn &&
            " We count anonymous usage (no cookies, no personal data) to improve the app."}
        </p>
      </PopoverContent>
    </Popover>
  );
};
