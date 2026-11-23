import { ClipboardPaste, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

// Shown when the Library is empty. It says where answers come from.

type EmptyStateProps = {
  onGetAnswers: () => void;
  onPaste: () => void;
};

export const EmptyState = ({ onGetAnswers, onPaste }: EmptyStateProps) => (
  <div className="flex flex-col items-center gap-4 rounded-lg border bg-card px-6 py-16 text-center">
    {/* The page's main heading: with no answer open there is no title in the top bar. */}
    <h1 className="text-xl font-semibold">Add your first model answer</h1>
    <p className="text-muted-foreground">
      Get model answers from your own AI chat, or paste one you already have.
    </p>
    <div className="flex flex-wrap justify-center gap-2">
      <Button size="lg" onClick={onGetAnswers}>
        <Sparkles aria-hidden="true" />
        Get answers from AI
      </Button>
      <Button variant="outline" size="lg" onClick={onPaste}>
        <ClipboardPaste aria-hidden="true" />
        Paste answer
      </Button>
    </div>
  </div>
);
