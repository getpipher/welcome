import type { Theme, ThemeColor } from "@earendil-works/pi-coding-agent";

export interface HomeColors {
  logo: (t: string) => string; // accent
  key: (t: string) => string; // accent
  dim: (t: string) => string; // dim
  muted: (t: string) => string; // muted
  warning: (t: string) => string;
  error: (t: string) => string;
  success: (t: string) => string;
  text: (t: string) => string;
  /** Generic escape hatch for any ThemeColor. */
  fg: (c: ThemeColor, t: string) => string;
}

/** Map semantic home-page color names to pi theme tokens (dark/light/custom aware). */
export function colors(theme: Theme): HomeColors {
  const fg = (c: ThemeColor, t: string) => theme.fg(c, t);
  return {
    logo: (t) => fg("accent", t),
    key: (t) => fg("accent", t),
    dim: (t) => fg("dim", t),
    muted: (t) => fg("muted", t),
    warning: (t) => fg("warning", t),
    error: (t) => fg("error", t),
    success: (t) => fg("success", t),
    text: (t) => fg("text", t),
    fg,
  };
}