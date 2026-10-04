import { Audio } from '@remotion/media';
import { ThreeCanvas } from '@remotion/three';
import { useCallback } from 'react';
import { AbsoluteFill, staticFile, useVideoConfig } from 'remotion';
import { Director } from './director.ts';
import { Stage } from './engine/Stage.tsx';
import type { Quality } from './engine/types.ts';
import { filmScenes } from './scenes/index.ts';
import { ENERGY } from './score/energy.ts';
import type { Drop2Threads } from './shots/drop2Threads.ts';

/**
 * The film, or a section of it: film frames [from, to) on one canvas; `energy` false leaves out the camera energy (punches, shakes,
 * flashes), for continuity checks; `drop2` turns on drop 2's picture switches for a preview (src/shots/drop2Threads.ts; absent: the film).
 */
export const Film: React.FC<{ quality: Quality; from: number; to: number; energy?: boolean; drop2?: Partial<Drop2Threads> }> = ({ quality, from, to, energy = true, drop2 }) => {
  const { width, height } = useVideoConfig();
  const threads = drop2 ? JSON.stringify(drop2) : '';
  const create = useCallback(() => new Director(filmScenes(threads ? (JSON.parse(threads) as Partial<Drop2Threads>) : undefined), { from, to }, energy ? ENERGY : undefined), [from, to, energy, threads]);
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <ThreeCanvas width={width} height={height} flat frameloop="demand" gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}>
        <Stage create={create} quality={quality} startFrame={from} />
      </ThreeCanvas>
      <Audio src={staticFile('audio/bgm.wav')} trimBefore={from} />
    </AbsoluteFill>
  );
};
