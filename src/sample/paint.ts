import { TECH_SAMPLE_TEXT } from '../content/text.ts';
import { cssStack } from '../engine/fonts.ts';
import { ease, lerp, prog } from '../engine/math.ts';
import { STATUS_FRAMES, typedCount, typeFrames } from '../score/techSample.ts';

/** The terminal: header, typed prompt with a block cursor, status lines, and a big kaomoji. */
export function paintTerminal(c: CanvasRenderingContext2D, frame: number): void {
  c.fillStyle = '#0c0f0e';
  c.fillRect(0, 0, 1920, 1080);
  c.font = `500 34px ${cssStack('mono')}`;
  c.textBaseline = 'alphabetic';
  c.fillStyle = '#5c7a66';
  c.fillText(TECH_SAMPLE_TEXT.header, 120, 130);
  const prompt = '> ' + TECH_SAMPLE_TEXT.prompt.slice(0, typedCount(frame));
  c.fillStyle = '#4cf08c';
  c.font = `700 56px ${cssStack('mono')}`;
  c.fillText(prompt, 120, 250);
  const typing = frame < typeFrames[typeFrames.length - 1] + 6;
  if (typing || Math.floor(frame / 12) % 2 === 0) c.fillRect(120 + c.measureText(prompt).width + 10, 204, 30, 58);
  c.font = `500 40px ${cssStack('mono')}`;
  TECH_SAMPLE_TEXT.status.forEach((line, i) => {
    if (frame < STATUS_FRAMES[i]) return;
    c.fillStyle = '#d8f5e1';
    c.fillText(line, 120, 350 + i * 64);
  });
  const pop = prog(frame, 76, 88, ease.outBack);
  if (pop > 0) {
    c.save();
    c.translate(1500, 820);
    c.scale(pop, pop);
    c.font = `800 190px ${cssStack('rounded')}`;
    c.textAlign = 'center';
    c.fillStyle = '#4cf08c';
    c.fillText('(•ω•)', 0, 0);
    c.restore();
  }
}

/** The Swiss poster: grid, red disc, huge numerals, small info type. */
export function paintSwiss(c: CanvasRenderingContext2D, frame: number): void {
  c.fillStyle = '#f1eee7';
  c.fillRect(0, 0, 1920, 1080);
  const draw = prog(frame, 120, 150, ease.outExpo);
  c.strokeStyle = 'rgba(17,17,17,0.14)';
  c.lineWidth = 1.5;
  for (let i = 1; i < 12; i++) {
    const x = (1920 / 12) * i;
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, 1080 * draw);
    c.stroke();
  }
  for (let j = 1; j < 6; j++) {
    const y = (1080 / 6) * j;
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(1920 * draw, y);
    c.stroke();
  }
  c.fillStyle = '#e8402b';
  c.beginPath();
  c.arc((1920 / 12) * discColumn(frame), 400, 230, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#111111';
  c.font = `900 520px ${cssStack('display')}`;
  c.textBaseline = 'alphabetic';
  c.fillText(TECH_SAMPLE_TEXT.swiss[0], 90, 1020);
  c.font = `600 44px ${cssStack('display')}`;
  c.fillText(TECH_SAMPLE_TEXT.swiss[1], 1010, 1010);
  c.font = `500 26px ${cssStack('display')}`;
  TECH_SAMPLE_TEXT.swiss.slice(2, 5).forEach((t, i) => c.fillText(t, 1500, 90 + i * 36));
  c.font = `700 30px ${cssStack('display')}`;
  c.fillText(TECH_SAMPLE_TEXT.swiss[5], 90, 90);
}

/** Grid column of the Swiss poster's red disc: one column right on each beat, and from the last column it glides back to the first. */
export function discColumn(frame: number): number {
  const beat = Math.max(0, Math.floor((frame - 120) / 24));
  const hop = prog(frame - 120 - beat * 24, 0, 10, ease.outExpo);
  return lerp(7 + (beat % 4), 7 + ((beat + 1) % 4), hop);
}
