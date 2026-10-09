/** Junta classes condicionalmente: cn("a", cond && "b", ["c", null]) → "a b c" */
export function cn(...parts) {
  return parts.flat(Infinity).filter(Boolean).join(" ");
}
