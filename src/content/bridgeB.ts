// Bridge B's strings (v08, the crash taking time: src/score/bridgeB.ts). The camera's fps line runs down under drop 2's frozen one (E9's
// grammar: src/content/drop2.ts fpsLine, CAMERA_FPS_LINE), and the corrupted blocks print the field's own bytes in hex (the dump the
// ending decodes on outro 1.1). Every character here is in drop 2's mono atlas already (src/shots/drop2Overload.ts OVERLOAD_STRINGS),
// so the bridge draws with drop 2's layers and adds nothing to them.
import { CAMERA_FPS_LINE } from './drop2.ts';
import type { TextItem } from './text.ts';

/** The camera's line at `fps` (honest, src/score/bridgeB.ts cameraFps): still rolling at 60, dropping frames below, not responding frozen. */
export function cameraLine(fps: number, frozen: boolean): string {
  if (frozen) return 'camera 0.0 fps · not responding';
  if (fps >= 60) return CAMERA_FPS_LINE;
  return `camera ${fps.toFixed(1)} fps · dropping frames`;
}
/** The hex digits a corrupted block prints (lower case, as the ending's dump does not: its bytes are its own; these are the field's). */
export const HEX_DIGITS = '0123456789abcdef';
/** A cell's character as the two hex digits of its code (ASCII: '@' → 40, '=' → 3d). */
export const hexOf = (ch: string): string => (ch.codePointAt(0) ?? 0x3f).toString(16).padStart(2, '0').slice(-2);

export const BRIDGE_B_TEXTS: readonly TextItem[] = [
  { role: 'mono', text: cameraLine(30, false), where: 'bridge B: the camera’s fps line, dropping frames' },
  { role: 'mono', text: cameraLine(0, true), where: 'bridge B: the camera’s fps line, frozen' },
  { role: 'mono', text: `${HEX_DIGITS} `, where: 'bridge B: the corrupted blocks’ hex' },
];
