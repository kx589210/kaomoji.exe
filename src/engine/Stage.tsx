import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { useCurrentFrame, useDelayRender } from 'remotion';
import * as THREE from 'three';
import { mountRoot } from './mount.ts';
import { Pipeline } from './pipeline.ts';
import type { Quality, Renderable } from './types.ts';

/**
 * Lives inside <ThreeCanvas>. Each run of its setup effect builds a fresh root
 * with `create` (keep `create` stable: a module-level function or useCallback)
 * and a pipeline, then draws the root for the current Remotion frame whenever
 * R3F renders (via advance() while rendering, via invalidate() in the Studio).
 */
export const Stage: React.FC<{ create: () => Renderable; quality: Quality; startFrame?: number }> = ({ create, quality, startFrame = 0 }) => {
  const frame = useCurrentFrame() + startFrame;
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const { gl, invalidate } = useThree();
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [live, setLive] = useState<{ pipeline: Pipeline; root: Renderable } | null>(null);

  useEffect(() => {
    const handle = delayRender('Building the kaomoji.exe pipeline', { timeoutInMilliseconds: 180_000 });
    let alive = true;
    let released = false;
    const release = () => {
      if (!released) {
        released = true;
        continueRender(handle);
      }
    };
    const mounted = mountRoot(create);
    const size = gl.getDrawingBufferSize(new THREE.Vector2());
    const p = new Pipeline(gl, { quality });
    mounted.root
      .init(gl, { width: size.x, height: size.y })
      .then(() => {
        if (!alive) return;
        p.renderFrame(mounted.root, frameRef.current);
        setLive({ pipeline: p, root: mounted.root });
        release();
      })
      .catch((err: unknown) => cancelRender(err instanceof Error ? err : new Error(String(err))));
    return () => {
      alive = false;
      release();
      setLive(null);
      p.dispose();
      mounted.release();
    };
  }, [gl, create, quality, delayRender, continueRender, cancelRender]);

  useFrame(() => {
    if (live) live.pipeline.renderFrame(live.root, frameRef.current);
  }, 1);

  useEffect(() => {
    invalidate();
  }, [frame, live, invalidate]);

  return null;
};
