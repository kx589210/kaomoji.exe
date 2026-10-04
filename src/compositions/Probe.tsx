import { ThreeCanvas } from '@remotion/three';
import { useState } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

// A lit, spinning torus knot. If this renders in a headless still,
// WebGL works through Remotion. The corner shows which GPU WebGL runs on
// (it must name ANGLE and the graphics card, not SwiftShader).
export const Probe: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const [renderer, setRenderer] = useState('…');
  return (
    <AbsoluteFill style={{ backgroundColor: '#0c0f0e' }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ fov: 40, position: [0, 0, 6] }}
        onCreated={({ gl }) => {
          const ctx = gl.getContext();
          const info = ctx.getExtension('WEBGL_debug_renderer_info');
          const name = info ? String(ctx.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'renderer info unavailable';
          console.log(`WEBGL_RENDERER ${name}`);
          setRenderer(name);
        }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[3, 4, 5]} intensity={2.5} />
        <mesh rotation={[frame / 40, frame / 55, 0]}>
          <torusKnotGeometry args={[1.2, 0.38, 256, 48]} />
          <meshStandardMaterial color="#4cf08c" roughness={0.3} metalness={0.2} />
        </mesh>
      </ThreeCanvas>
      <div style={{ position: 'absolute', left: 40, bottom: 36, color: '#d8f5e1', fontFamily: 'monospace', fontSize: 26 }}>{renderer}</div>
    </AbsoluteFill>
  );
};
