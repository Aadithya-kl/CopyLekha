import { AboutPopover } from "@/components/AboutPopover";
import { Button } from "@/components/ui/button";

// One line with the author, How it works and the About link.

type SiteFooterProps = {
  onOpenHowItWorks: () => void;
  // Called instead of the About popover's own focus return, so focus can go to the typing box.
  onCloseAutoFocus: (event: Event) => void;
};

export const SiteFooter = ({ onOpenHowItWorks, onCloseAutoFocus }: SiteFooterProps) => (
  <footer className="mx-auto flex w-full max-w-245 flex-wrap items-center justify-center gap-2 px-4 pb-4 text-sm text-muted-foreground">
    <p>Built by Hossain. Bangladesh.</p>
    <span aria-hidden="true">·</span>
    <Button
      variant="link"
      size="lg"
      className="px-1 text-muted-foreground"
      onClick={onOpenHowItWorks}
    >
      How it works
    </Button>
    <span aria-hidden="true">·</span>
    <AboutPopover onCloseAutoFocus={onCloseAutoFocus} />
  </footer>
);
