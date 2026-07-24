export interface LayoutConfig {
  layout: "narrow" | "medium" | "wide"; // <90 | 90-149 | >=150
  recentsColumns: 1 | 2; // 1 if narrow, else 2
  sessionsCount: number;
  projectsCount: number;
  logo: "wordmark" | "full";
  recentsTotal: number;
}

export const FULL_LOGO_LINES = 6; // ASCII block height
export const CHROME_ROWS = 9; // header(2) + blank(1) + menu(5) + footer(1) — tuned by QA

const NARROW = { sessions: 3, projects: 2 };
const MEDIUM = { sessions: 4, projects: 4 };
const WIDE = { sessions: 6, projects: 6 };

/**
 * Decide the home-page layout from terminal cols/rows.
 * cols → layout tier + column count + logo variant.
 * rows → how many recent entries fit after the chrome + logo are subtracted.
 */
export function layoutFor(cols: number, rows: number): LayoutConfig {
  const layout: LayoutConfig["layout"] = cols < 90 ? "narrow" : cols < 150 ? "medium" : "wide";
  const recentsColumns: 1 | 2 = layout === "narrow" ? 1 : 2;
  const logo: LayoutConfig["logo"] = layout === "narrow" ? "wordmark" : "full";

  const caps = layout === "narrow" ? NARROW : layout === "medium" ? MEDIUM : WIDE;

  // Row budget = rows minus fixed chrome + logo. At >=2 columns the two
  // recents sections render SIDE-BY-SIDE, so each section can independently
  // use up to `budget` rows. At narrow (1 column) they STACK, so projects
  // take the leftover after sessions fill their cap.
  const budget = Math.max(0, rows - CHROME_ROWS - FULL_LOGO_LINES);
  const sessionsCount = Math.min(caps.sessions, budget);
  const projectsCount =
    recentsColumns === 2
      ? Math.min(caps.projects, budget)
      : Math.min(caps.projects, Math.max(0, budget - sessionsCount));

  return {
    layout,
    recentsColumns,
    sessionsCount,
    projectsCount,
    logo,
    recentsTotal: sessionsCount + projectsCount,
  };
}