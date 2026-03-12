export function interpolateColors(
  highlightColors: Record<string, any>,
  fromColor: string,
  toColor: string,
  value: number,
): string | undefined {
  const colorMap = highlightColors[fromColor]
  if (!colorMap) return undefined
  const interpolator = colorMap[toColor]
  if (typeof interpolator !== 'function') return undefined
  return interpolator(value)
}
