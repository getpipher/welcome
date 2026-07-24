import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { classifyKey } from "./forward-key.ts";

/**
 * SPIKE (B2 model) — prove explicit dismiss works in real pi.
 * Renders a one-line overlay; any key dismisses (no forwarding).
 *   - menu key → (in real HomePage) act + dismiss; here just dismiss
 *   - Esc / Enter / any other key → dismiss, focus returns to native editor
 * The user then types natively into the now-focused editor (zero lost chars).
 * Temporary wiring; replaced by HomePage in Task 10.
 */
export async function spikeOverlay(ctx: ExtensionContext): Promise<void> {
  await ctx.ui.custom<void>((_tui, theme, _kb, done) => {
    let disposed = false;
    return {
      render: (_width: number) => [
        theme.fg("accent", "SPIKE (B2) — press Esc/Enter to dismiss, then type natively"),
      ],
      handleInput: (_data: string) => {
        if (disposed) return;
        disposed = true;
        // B2: classify for logging/no-op; always dismiss, never forward.
        void classifyKey(_data);
        done(undefined);
      },
      invalidate: () => {},
      dispose: () => {},
    };
  }, { overlay: true });
}