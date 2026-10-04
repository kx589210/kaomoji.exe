import { Audio } from '@remotion/media';
import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, staticFile, useVideoConfig } from 'remotion';
import { Stage } from '../engine/Stage.tsx';
import type { Quality } from '../engine/types.ts';
import { TechSampleRoot } from '../sample/techSampleRoot.ts';

const createTechSample = () => new TechSampleRoot();

export const TechSample: React.FC<{ quality: Quality }> = ({ quality }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <ThreeCanvas width={width} height={height} flat frameloop="demand" gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}>
        <Stage create={createTechSample} quality={quality} />
      </ThreeCanvas>
      <Audio src={staticFile('audio/tech-sample.wav')} />
    </AbsoluteFill>
  );
};
