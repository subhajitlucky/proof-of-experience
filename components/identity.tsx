export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({
  name,
  src,
  large = false,
}: {
  name: string;
  src?: string | null;
  large?: boolean;
}) {
  return (
    <span
      className={`avatar${large ? " avatar--lg" : ""}`}
      aria-hidden={src ? undefined : true}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
