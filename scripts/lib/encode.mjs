// ffmpeg steps of a kaomoji render: encode the master from the frames and the
// WAV, make the downscaled copy, and read a file's video/audio properties.
// Remotion writes frames as JPEG, i.e. full-range BT.601 Y'CbCr of sRGB pixels.
// The delivery files are limited-range BT.709 with every colour tag set, the
// standard for HD video, so players cannot guess the range or matrix wrong.
import { execFileSync } from 'node:child_process';
import { ffmpegPath, ffprobePath } from './remotion.mjs';

/** Frames (full-range BT.601, sRGB primaries) → limited-range BT.709. Primaries and transfer stay; only the matrix and range change. */
export const TO_BT709 = 'zscale=matrixin=470bg:rangein=full:primariesin=709:transferin=709:matrix=709:range=limited:primaries=709:transfer=709,format=yuv420p';

/**
 * The delivery's audio (the whole-film mix pass, 2026-10-03). bgm.wav is mastered to −2.0 dBTP (audio/limiter.mjs CEILING_DB) so that
 * the MP4 holds the bible's −1.5 dBTP (§6.4) after its AAC, which lifts the peaks. Measured on the whole film, the native coder at
 * 320 kb/s lifted them 0.5–0.75 dB, chaotically (any change moves a part's peak by ±0.15 dB): the club read −1.37 dBTP, drop 2 −1.59
 * (its bar 5 −1.49 in tests/drop2Audio.test.mjs), over the −1.55 guard. So the delivery is turned down by DELIVERY_TRIM_DB before
 * the coder, one gain over the whole film (no balance moves, bgm.wav is untouched): every part then measured −1.97 dBTP or lower after
 * the AAC (the mix of 2026-10-03; the loudness −11.8 LUFS instead of −11.3, which loudness-normalising players undo anyway).
 * v08 (63 bars, integrator): at −0.5 the coder threw a bad block in club bar 5 (−1.16 dBTP; the WAV −2.03). A sweep of the one gain on
 * the v08 mix read −0.55 → −1.76, −0.6 → −1.59, −0.65 → −1.81, −0.7 → −1.53, −0.75 → −1.96, −0.8 → −1.84 dBTP (chaotic, as above):
 * −0.75 dB, every part −1.96 dBTP or lower, −12.1 LUFS delivered. (libfdk_aac at 320 kb/s read −2.14 at −0.5 with no bad block: the
 * robust fix if this recurs; render.mjs measures every delivery.)
 */
export const DELIVERY_TRIM_DB = -0.75;
/** ffmpeg's audio arguments for every delivery file: DELIVERY_TRIM_DB (in float, before the coder), then AAC at 320 kb/s. */
export const DELIVERY_AUDIO = ['-af', `volume=${DELIVERY_TRIM_DB}dB`, '-c:a', 'aac', '-b:a', '320k'];

const run = (args, progress) => execFileSync(ffmpegPath(), ['-y', '-hide_banner', '-v', 'error', ...(progress ? ['-stats'] : []), ...args], { stdio: 'inherit' });

/** Encodes the image sequence `frames` (an ffmpeg pattern) with the WAV `wav` into the H.264/AAC file `out` (the audio through DELIVERY_AUDIO). */
export function encodeMaster({ frames, wav, out, fps = 60, crf = 14, progress = false }) {
  run(
    [
      '-framerate', String(fps), '-i', frames, '-i', wav, '-map', '0:v', '-map', '1:a', '-vf', TO_BT709,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf),
      ...DELIVERY_AUDIO, '-movflags', '+faststart', out,
    ],
    progress,
  );
}

/** Lanczos-downscales `src` to width × height; the audio is copied. */
export function downscale({ src, out, width, height, crf = 16, progress = false }) {
  run(
    [
      '-i', src, '-vf', `zscale=w=${width}:h=${height}:filter=lanczos,format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-c:a', 'copy', '-movflags', '+faststart', out,
    ],
    progress,
  );
}

/** Size, frame rate, frame count, pixel format, colour tags and audio format of a video file. */
export function probeVideo(file) {
  const { streams, format } = JSON.parse(execFileSync(ffprobePath(), ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]).toString());
  const v = streams.find((s) => s.codec_type === 'video');
  const a = streams.find((s) => s.codec_type === 'audio');
  if (!v) throw new Error(`${file}: no video stream`);
  const [num, den] = v.avg_frame_rate.split('/').map(Number);
  return {
    width: v.width,
    height: v.height,
    fps: num / den,
    frames: Number(v.nb_frames),
    duration: Number(format.duration),
    pixFmt: v.pix_fmt,
    colorRange: v.color_range,
    colorSpace: v.color_space,
    colorPrimaries: v.color_primaries,
    colorTransfer: v.color_transfer,
    audio: a ? { codec: a.codec_name, sampleRate: Number(a.sample_rate), channels: a.channels } : null,
  };
}
