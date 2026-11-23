"use client";

import { ClipboardPaste, Copy, ExternalLink } from "lucide-react";
import { useId, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AI_PROMPT, getChatGptUrl } from "@/lib/ai-prompt";
import { track } from "@/lib/analytics";

// How to get model answers from the learner's own AI chat.

type AiPromptModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // The day to ask the AI for: one after the newest day in the Library, else 1.
  nextDay: number;
  // Step 3: closes this modal and opens the Paste modal.
  onPasteReply: () => void;
  // Called instead of the dialog's own focus return, so focus can go to the typing box.
  onCloseAutoFocus: (event: Event) => void;
};

export const AiPromptModal = ({
  open,
  onOpenChange,
  nextDay,
  onPasteReply,
  onCloseAutoFocus,
}: AiPromptModalProps) => {
  const promptId = useId();
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = async () => {
    track("prompt_copy");
    try {
      await navigator.clipboard.writeText(AI_PROMPT);
      toast("Prompt copied");
    } catch {
      // The browser refused the clipboard: select the prompt so the learner can copy it.
      promptRef.current?.focus();
      promptRef.current?.select();
      toast("The prompt couldn't be copied. It is selected, so press Ctrl/Cmd + C.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-160" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle className="text-lg">Get answers from AI</DialogTitle>
          <DialogDescription>
            Use your own AI chat, such as ChatGPT, Claude or Gemini.
          </DialogDescription>
        </DialogHeader>

        <ol className="flex list-inside list-decimal flex-col gap-1">
          <li>Give your AI the prompt below.</li>
          {nextDay === 1 ? (
            <li>
              Write <strong>Start Day 1</strong>. The next day, write <strong>Start Day 2</strong>{" "}
              in the same chat.
            </li>
          ) : (
            // The Library already has days, so the learner is told which one comes next.
            <li>
              Write <strong>Start Day {nextDay}</strong> in the same chat as before.
            </li>
          )}
          <li>
            Copy the whole reply, then click <strong>Paste the reply</strong>.
          </li>
        </ol>

        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor={promptId}>Prompt</Label>
          <Textarea
            id={promptId}
            ref={promptRef}
            value={AI_PROMPT}
            readOnly
            className="field-sizing-fixed h-64 font-mono text-xs md:text-xs"
          />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" size="lg" onClick={onPasteReply} className="sm:mr-auto">
            <ClipboardPaste aria-hidden="true" />
            Paste the reply
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a
              href={getChatGptUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("open_chatgpt")}
            >
              <ExternalLink aria-hidden="true" />
              Open in ChatGPT
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Button>
          <Button size="lg" onClick={handleCopy} autoFocus>
            <Copy aria-hidden="true" />
            Copy prompt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
