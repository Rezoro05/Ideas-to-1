/** Which phrase a rotating line shows next. Pure. */
export function nextIndex(current: number, count: number): number {
  return count > 0 ? (current + 1) % count : 0;
}

/** "a, b, c and d": the full list for screen readers and for visitors who prefer no motion. */
export function joinWithAnd(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
