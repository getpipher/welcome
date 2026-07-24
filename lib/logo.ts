// RECTOR LABS ASCII logo variants for the welcome home page.

/** Full 6-line ASCII block. Each line <= 64 chars (fits medium/wide panes). */
const FULL_LOGO: readonly string[] = [
  "  ██████╗ ███████╗ ██████╗████████╗ ██████╗ ██████╗     ██╗      █████╗",
  "  ██╔══██╗██╔════╝██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗    ██║     ██╔══██╗",
  "  ██████╔╝█████╗  ██║        ██║   ██║   ██║██████╔╝    ██║     ███████║",
  "  ██╔══██╗██╔══╝  ██║        ██║   ██║   ██║██╔══██╗    ██║     ██╔══██║",
  "  ██║  ██║███████╗╚██████╗   ██║   ╚██████╔╝██║  ██║    ███████╗██║  ██║",
  "  ╚═╝  ╚═╝╚══════╝ ╚═════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝    ╚══════╝╚═╝  ╚═╝",
];

/** Compact 1-line wordmark for narrow panes. */
const WORDMARK: readonly string[] = ["R E C T O R   L A B S"];

export function fullLogo(): string[] {
  return [...FULL_LOGO];
}

export function wordmark(): string[] {
  return [...WORDMARK];
}

export function logoFor(kind: "full" | "wordmark"): string[] {
  return kind === "full" ? fullLogo() : wordmark();
}