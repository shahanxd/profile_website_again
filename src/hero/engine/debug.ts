import type { Vec2 } from '../scene/types';
import type { Quality } from './quality';

/**
 * URL switches for looking closely at the scene. This machine cannot record
 * video, so motion is reviewed as frozen frames:
 *
 *   ?freeze=2         draw the frame for scene time 2 s, then stop
 *   ?pointer=0.5,-1   hold the pointer there (-1..1 each way), to see parallax in a frozen frame
 *   ?q=low|mid|high   force a quality tier
 *   ?air=0            leave the particles out, to look at one sprite's own movement
 *   ?debug=1          show the readout, and put snapshot tools on window.__garden
 *
 * ?dissolve=0.5 (hold a split switch half way) belongs to the whole page, not
 * only the garden: see heldDissolve in src/split/dissolve.ts.
 */
export interface Switches {
  freeze?: number;
  pointer?: Vec2;
  quality?: Quality;
  air: boolean;
  debug: boolean;
}

export function readSwitches(search: string): Switches {
  const params = new URLSearchParams(search);
  const freeze = params.get('freeze') ? Number(params.get('freeze')) : NaN;
  const pointer = (params.get('pointer') ?? '').split(',').map(Number);
  const q = params.get('q');
  return {
    freeze: Number.isFinite(freeze) ? Math.max(0, freeze) : undefined,
    pointer: pointer.length === 2 && pointer.every(Number.isFinite) ? [pointer[0], pointer[1]] : undefined,
    quality: q === 'low' || q === 'mid' || q === 'high' ? q : undefined,
    air: params.get('air') !== '0',
    debug: params.get('debug') === '1',
  };
}

export interface Readout {
  show(lines: string[]): void;
  destroy(): void;
}

/** A small panel in the corner of the scene. */
export function createReadout(canvas: HTMLCanvasElement): Readout {
  const panel = document.createElement('pre');
  panel.style.cssText =
    'position:absolute;left:8px;bottom:8px;z-index:50;margin:0;padding:6px 8px;pointer-events:none;' +
    'font:11px/1.4 ui-monospace,monospace;color:#f6eedd;background:rgb(20 18 43 / 0.85)';
  canvas.parentElement?.append(panel);
  return {
    show: (lines) => {
      panel.textContent = lines.join('\n');
    },
    destroy: () => panel.remove(),
  };
}

/** Makes tools reachable from the console and from test scripts as window.__garden. */
export function exposeForDebug(tools: object | null) {
  const host = window as unknown as { __garden?: object };
  if (tools) host.__garden = tools;
  else delete host.__garden;
}
