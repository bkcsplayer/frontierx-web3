export function CountdownTimer({ seconds }: { seconds: bigint }) {
  const remaining = Number(seconds);

  if (remaining <= 0) {
    return <span className="text-[var(--accent-green)]">Ready to draw</span>;
  }

  const hours = Math.floor(remaining / 3_600);
  const minutes = Math.floor((remaining % 3_600) / 60);
  const secs = remaining % 60;

  return (
    <time dateTime={`PT${remaining}S`} className="font-[var(--font-jetbrains-mono)]">
      {hours.toString().padStart(2, "0")}:{minutes.toString().padStart(2, "0")}:
      {secs.toString().padStart(2, "0")}
    </time>
  );
}
