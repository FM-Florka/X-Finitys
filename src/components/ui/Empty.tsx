import { cn } from "@/lib/utils";

export function Empty({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "row-soft flex flex-col items-center justify-center px-6 py-10 text-center",
        className,
      )}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-sm text-muted">
        —
      </div>
      <p className="text-sm font-semibold">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      ) : null}
    </div>
  );
}
