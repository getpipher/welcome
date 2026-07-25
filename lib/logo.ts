// RECTOR LABS ASCII logo variants for the welcome home page.

/** Full 6-line ASCII block. Each line <= 72 visible cells (fits wide panes). */
const FULL_LOGO: readonly string[] = [
  "  ██████╗ ███████╗ ██████╗████████╗ ██████╗ ██████╗     ██╗      █████╗",
  "  ██╔══██╗██╔════╝██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗    ██║     ██╔══██╗",
  "  ██████╔╝█████╗  ██║        ██║   ██║   ██║██████╔╝    ██║     ███████║",
  "  ██╔══██╗██╔══╝  ██║        ██║   ██║   ██║██╔══██╗    ██║     ██╔══██║",
  "  ██║  ██║███████╗╚██████╗   ██║   ╚██████╔╝██║  ██║    ███████╗██║  ██║",
  "  ╚═╝  ╚═╝╚══════╝ ╚═════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝    ╚══════╝╚═╝  ╚═╝",
];

/**
 * Compact 4-line ASCII logo (figlet `small` font). Each line <= 49 visible
 * cells — roughly half the full block. Uses plain ASCII (no East-Asian-Width
 * Ambiguous box-drawing chars), so it renders as 1 cell in every terminal/font
 * and dodges the "RECTOR LA" clip caused by CJK fonts rendering █/╗/╔ as 2 cells.
 */
const SMALL_LOGO: readonly string[] = [
  " ___ ___ ___ _____ ___  ___   _      _   ___ ___ ",
  "| _ \\ __/ __|_   _/ _ \\| _ \\ | |    /_\\ | _ ) __|",
  "|   / _| (__  | || (_) |   / | |__ / _ \\| _ \\__ \\",
  "|_|_\\___\\___| |_| \\___/|_|_\\ |____/_/ \\_\\___/___/",
];

/** Compact 1-line wordmark for narrow panes. */
const WORDMARK: readonly string[] = ["R E C T O R   L A B S"];

export function fullLogo(): string[] {
  return [...FULL_LOGO];
}

export function smallLogo(): string[] {
  return [...SMALL_LOGO];
}

export function wordmark(): string[] {
  return [...WORDMARK];
}

export function logoFor(kind: "full" | "small" | "wordmark"): string[] {
  return kind === "full" ? fullLogo() : kind === "small" ? smallLogo() : wordmark();
}