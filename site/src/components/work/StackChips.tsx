/** Tools, set small and quiet — evidence rather than headline. */
export function StackChips({ stack }: { stack: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {stack.map((item) => (
        <li
          key={item}
          className="border border-line px-2 py-1 font-mono text-[10.5px] tracking-[0.06em] text-ink-muted"
        >
          {item}
        </li>
      ))}
    </ul>
  )
}
