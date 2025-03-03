import { cn } from "@/lib/utils";

// Component - just to place tighter text (letters closer to each other)
export function TighterText({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <p className={cn("tracking-tighter", className)}>{children}</p>;
}
