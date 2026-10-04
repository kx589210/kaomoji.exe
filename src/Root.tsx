import { Composition } from 'remotion';
import { ClubInk } from './compositions/ClubInk.tsx';
import { Probe } from './compositions/Probe.tsx';
import { TechSample } from './compositions/TechSample.tsx';
import { TestCRT } from './compositions/TestCRT.tsx';
import { TestFlat } from './compositions/TestFlat.tsx';
import { TestGlass } from './compositions/TestGlass.tsx';
import { TestGlyphField } from './compositions/TestGlyphField.tsx';
import { TestGlyphs } from './compositions/TestGlyphs.tsx';
import { TestGrain } from './compositions/TestGrain.tsx';
import { TestInk } from './compositions/TestInk.tsx';
import { TestKosmos } from './compositions/TestKosmos.tsx';
import { TestLayer } from './compositions/TestLayer.tsx';
import { Film } from './Film.tsx';
import { CLUB } from './score/club.ts';
import { DROP1_START, SMASH } from './score/drop1.ts';
import { ARCADE, DROP2_END, DROP2_START, SWITCH } from './score/drop2.ts';
import { partFrame } from './score/film.ts';
import { PART_COMPOSITIONS, SECTIONS } from './score/shots.ts';
import { FRAMES_PER_BAR, TOTAL_FRAMES, barFrame } from './score/tempo.ts';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="KaomojiExe" component={Film} durationInFrames={TOTAL_FRAMES} fps={60} width={1920} height={1080} defaultProps={{ quality: 'draft' as const, from: 0, to: TOTAL_FRAMES, energy: true }} />
      {SECTIONS.map((s) => (
        <Composition
          key={s.id}
          id={s.composition}
          component={Film}
          durationInFrames={(s.toBar - s.fromBar + 1) * FRAMES_PER_BAR}
          fps={60}
          width={1920}
          height={1080}
          defaultProps={{ quality: 'draft' as const, from: barFrame(s.fromBar), to: barFrame(s.toBar + 1), energy: true }}
        />
      ))}
      {/* The cosmos and the club on their own (KX-Cosmos, KX-Club): drop 1 is both, so each part's builder can render just theirs. */}
      {PART_COMPOSITIONS.map((p) => (
        <Composition
          key={p.composition}
          id={p.composition}
          component={Film}
          durationInFrames={(p.toBar - p.fromBar + 1) * FRAMES_PER_BAR}
          fps={60}
          width={1920}
          height={1080}
          defaultProps={{ quality: 'draft' as const, from: barFrame(p.fromBar), to: barFrame(p.toBar + 1), energy: true }}
        />
      ))}
      {/* v08's bridges with a bar of each neighbour (output/qa/v08/MAP-CONTRACT.md): cosmos 6 → bridge A → club 1, and drop 2's bar 20 → bridge B → outro 1, so their builders render each seam whole. */}
      <Composition id="KX-BridgeA-Seam" component={Film} durationInFrames={partFrame('club', 2) - partFrame('cosmos', 6)} fps={60} width={1920} height={1080} defaultProps={{ quality: 'draft' as const, from: partFrame('cosmos', 6), to: partFrame('club', 2), energy: true }} />
      <Composition id="KX-BridgeB-Seam" component={Film} durationInFrames={partFrame('outro', 2) - partFrame('drop2', 20)} fps={60} width={1920} height={1080} defaultProps={{ quality: 'draft' as const, from: partFrame('drop2', 20), to: partFrame('outro', 2), energy: true }} />
      {/* Drop 1 up to the last frame before the glass gives way on break 1.1 (SMASH), where the break (KX-Break) takes over and owns the glass falling away. The same frames as KX-Drop1; kept so the scripts and renders that name it still work. */}
      <Composition id="KX-Drop1-Smash" component={Film} durationInFrames={SMASH - DROP1_START} fps={60} width={1920} height={1080} defaultProps={{ quality: 'draft' as const, from: DROP1_START, to: SMASH, energy: true }} />
      {/* Drop 2 with the mochi wave (DROP2_THREADS.waveStyle 'mochi', src/shots/drop2Threads.ts) to compare with KX-Drop2's default: the whole part, and bars 9–12 (the switch's drafting, the wave, the arcade's first bar). */}
      <Composition id="KX-Drop2-Mochi" component={Film} durationInFrames={DROP2_END - DROP2_START} fps={60} width={1920} height={1080} defaultProps={{ quality: 'draft' as const, from: DROP2_START, to: DROP2_END, energy: true, drop2: { waveStyle: 'mochi' as const } }} />
      <Composition id="KX-Drop2-Mochi-Wave" component={Film} durationInFrames={ARCADE.to - SWITCH.from} fps={60} width={1920} height={1080} defaultProps={{ quality: 'draft' as const, from: SWITCH.from, to: ARCADE.to, energy: true, drop2: { waveStyle: 'mochi' as const } }} />
      {/* The comic club INK on its own (src/compositions/ClubInk.tsx), until it goes live in the film: frame 0 is club 1.1. */}
      <Composition id="KX-ClubInk" component={ClubInk} durationInFrames={CLUB.to - CLUB.from} fps={60} width={1920} height={1080} defaultProps={{ quality: 'draft' as const, energy: true }} />
      <Composition id="KX-TestKosmos" component={TestKosmos} durationInFrames={2} fps={60} width={1920} height={1080} defaultProps={{ quality: 'draft' as const }} />
      <Composition id="KX-Probe" component={Probe} durationInFrames={120} fps={60} width={1920} height={1080} />
      <Composition id="KX-TestLayer" component={TestLayer} durationInFrames={60} fps={60} width={1920} height={1080} defaultProps={{ quality: 'draft' as const }} />
      <Composition id="KX-TestGlyphs" component={TestGlyphs} durationInFrames={120} fps={60} width={1920} height={1080} defaultProps={{ quality: 'draft' as const }} />
      <Composition id="KX-TestGlass" component={TestGlass} durationInFrames={120} fps={60} width={1920} height={1080} defaultProps={{ quality: 'draft' as const }} />
      <Composition id="KX-TechSample" component={TechSample} durationInFrames={300} fps={60} width={1920} height={1080} defaultProps={{ quality: 'draft' as const }} />
      <Composition id="KX-TestCRT" component={TestCRT} durationInFrames={60} fps={60} width={1920} height={1080} defaultProps={{ quality: 'draft' as const }} />
      <Composition id="KX-TestGlyphField" component={TestGlyphField} durationInFrames={120} fps={60} width={1920} height={1080} defaultProps={{ quality: 'draft' as const }} />
      <Composition id="KX-TestFlat" component={TestFlat} durationInFrames={10} fps={60} width={1920} height={1080} defaultProps={{ quality: 'draft' as const }} />
      <Composition id="KX-TestInk" component={TestInk} durationInFrames={10} fps={60} width={1920} height={1080} defaultProps={{ quality: 'draft' as const }} />
      <Composition id="KX-TestGrain" component={TestGrain} durationInFrames={TOTAL_FRAMES} fps={60} width={1920} height={1080} defaultProps={{ quality: 'draft' as const }} />
    </>
  );
};
