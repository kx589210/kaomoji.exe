// KX-ClubInk: the comic club "INK" (the part 'club', club 1.1 → break 1.1) on its own, as the film will draw it — the club's scene under a
// Director with the club's own camera energy (src/score/club.ts CLUB_ACCENTS) — so its builders can take stills and cut it before it goes
// live (the film still draws the v04 club there). Frame 0 is club 1.1 (film 1920 on the 58-bar map). `audio`: a WAV under public/ to
// play with it in the Studio (renders take theirs from render.mjs --audio).
//   node scripts/stills.mjs --comp KX-ClubInk --frames 0,48,96 --name club-ink-a [--final]
import { Audio } from '@remotion/media';
import { ThreeCanvas } from '@remotion/three';
import { useCallback } from 'react';
import { AbsoluteFill, staticFile, useVideoConfig } from 'remotion';
import { Director } from '../director.ts';
import { Stage } from '../engine/Stage.tsx';
import type { Quality } from '../engine/types.ts';
import { ClubInkScene } from '../scenes/clubInk.ts';
import { CLUB } from '../score/club.ts';
import { INK_ENERGY } from '../shots/clubInk.ts';

export const ClubInk: React.FC<{ quality: Quality; energy?: boolean; audio?: string }> = ({ quality, energy = true, audio }) => {
  const { width, height } = useVideoConfig();
  const create = useCallback(() => new Director([{ from: CLUB.from, to: CLUB.to, make: () => new ClubInkScene() }], { from: CLUB.from, to: CLUB.to }, energy ? INK_ENERGY : undefined), [energy]);
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <ThreeCanvas width={width} height={height} flat frameloop="demand" gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}>
        <Stage create={create} quality={quality} startFrame={CLUB.from} />
      </ThreeCanvas>
      {audio ? <Audio src={staticFile(audio)} /> : null}
    </AbsoluteFill>
  );
};
