export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`demo-badge ${className}`.trim()}>
      <span aria-hidden="true" className="h-1 w-1 rounded-full bg-vermilion" />
      Demo
    </span>
  );
}
