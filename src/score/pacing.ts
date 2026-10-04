// Shot-length rules from spec §3, checked on every change.
import type { Shot } from './shots.ts';
import { TOTAL_BARS } from './tempo.ts';

export const MAX_SHOT_BARS = 2.5;

export type PacingIssue = { shot: string; problem: string };

export const checkPacing = (shots: readonly Shot[], totalBars: number = TOTAL_BARS): PacingIssue[] => {
  const issues: PacingIssue[] = [];
  let expected = 1;
  for (const shot of shots) {
    if (shot.fromBar !== expected) issues.push({ shot: shot.id, problem: `starts at bar ${shot.fromBar}, expected ${expected}` });
    if (shot.toBar < shot.fromBar) issues.push({ shot: shot.id, problem: `ends (bar ${shot.toBar}) before it starts (bar ${shot.fromBar})` });
    const bars = shot.toBar - shot.fromBar + 1;
    if (bars > MAX_SHOT_BARS) issues.push({ shot: shot.id, problem: `${bars} bars is longer than ${MAX_SHOT_BARS}` });
    expected = shot.toBar + 1;
  }
  if (expected !== totalBars + 1) issues.push({ shot: '(end)', problem: `shots end at bar ${expected - 1}, the film has ${totalBars}` });
  return issues;
};
