import { Skeleton } from "@/components/ui/skeleton";

// Shown until the stored answers are read.
export const PracticeSkeleton = () => (
  // A status, so screen readers announce the label while the answer loads.
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading your answer"
    className="flex flex-col gap-4"
  >
    <Skeleton className="h-6 w-2/3" />
    <Skeleton className="h-56 w-full" />
    <Skeleton className="h-40 w-full" />
  </div>
);
