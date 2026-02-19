import { Learning } from "@/types/memory";
import { Check, X, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";

function getRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);
  
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffInSeconds) < 60) {
    return rtf.format(diffInSeconds, 'second');
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (Math.abs(diffInMinutes) < 60) {
    return rtf.format(diffInMinutes, 'minute');
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (Math.abs(diffInHours) < 24) {
    return rtf.format(diffInHours, 'hour');
  }
  const diffInDays = Math.floor(diffInHours / 24);
  return rtf.format(diffInDays, 'day');
}

interface RecentLearningItemProps {
  learning: Learning;
  onConfirm: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}

export function RecentLearningItem({
  learning,
  onConfirm,
  onReject,
}: RecentLearningItemProps) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-border border-l-4 border-l-[var(--color-imessage-blue)] shadow-sm hover:shadow-md bg-card transition-all">
      <div className="mt-1 bg-primary/10 p-2 rounded-full">
        <BrainCircuit className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium leading-none">
          New {learning.category} insight
        </p>
        <p className="text-sm text-muted-foreground">
          {learning.fact}
        </p>
        <p className="text-xs text-muted-foreground pt-1">
          Learned {getRelativeTime(learning.learnedAt)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-200 dark:hover:border-red-900"
          onClick={() => onReject(learning.id)}
          title="Reject"
        >
          <X className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 hover:border-green-200 dark:hover:border-green-900"
          onClick={() => onConfirm(learning.id)}
          title="Confirm"
        >
          <Check className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
