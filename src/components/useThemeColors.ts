import { useEffect, useState } from 'react'

const NAMES = ['accent', 'surface', 'separator', 'label', 'label-2'] as const
export type ThemeColors = Record<(typeof NAMES)[number], string>

function read(): ThemeColors {
  const style = getComputedStyle(document.documentElement)
  return Object.fromEntries(NAMES.map((n) => [n, style.getPropertyValue(`--${n}`).trim()])) as ThemeColors
}

/**
 * The theme's colours as concrete values, for SVG attributes (charts), which
 * can't be relied on to resolve CSS variables. Updates when light/dark changes.
 */
export function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState(read)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const update = () => setColors(read())
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return colors
}
