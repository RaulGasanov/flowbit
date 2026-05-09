import { cn } from "@/shared/lib/cn";

interface AvatarProps {
  name: string;
  src?: string;
  className?: string;
}

const initialsFromName = (name: string): string =>
  name
    .split(" ")
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase() ?? "")
    .join("");

export const Avatar = ({ name, src, className }: AvatarProps) => (
  <div
    className={cn(
      "inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-panel-muted text-xs font-semibold text-muted ring-1 ring-border/70",
      className,
    )}
    title={name}
>
    {src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="h-full w-full object-cover" src={src} alt={name} />
    ) : (
      initialsFromName(name)
    )}
  </div>
);
