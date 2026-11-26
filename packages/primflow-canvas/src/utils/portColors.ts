/**
 * Resolve the colour of a link from the colours of the ports it joins.
 *
 * A link carries no colour of its own: it takes the colour of the port type it
 * connects, so ports and links always agree. `any` matches every type, so the
 * concrete side decides the colour; a link between two `any` ports, or between
 * types without a colour, falls back to the link stroke.
 */
export function resolveLinkColor(
  colors: Record<string, string> | undefined,
  fallback: string,
  sourceType: string,
  targetType: string
): string {
  if (!colors) return fallback
  const type = sourceType !== 'any' ? sourceType : targetType
  return colors[type] ?? fallback
}
