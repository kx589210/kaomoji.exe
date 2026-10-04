// The time grid of kaomoji.exe: bars, beats and frames, whatever the film's
// length. Everything that moves or sounds is placed on it, so picture and music
// can never drift apart. The film's map of parts (and with it its length) is
// src/score/film.ts; src/score/tempo.ts re-exports both, as before.
// Plain Node loads this file: erasable TypeScript only.
export const FPS = 60;
export const BPM = 150;
export const BEATS_PER_BAR = 4;
export const FRAMES_PER_BEAT = (FPS * 60) / BPM; // 24
export const FRAMES_PER_BAR = FRAMES_PER_BEAT * BEATS_PER_BAR; // 96
export const SECONDS_PER_BEAT = 60 / BPM; // 0.4

/** First frame of 1-based film `bar`, plus `beat` beats (may be fractional). Inside a part, prefer partFrame (src/score/film.ts). */
export const barFrame = (bar: number, beat = 0): number => (bar - 1) * FRAMES_PER_BAR + beat * FRAMES_PER_BEAT;

/** 1-based film bar that contains `frame`; 0 for frames before the film. Inside a part, prefer locate (src/score/film.ts). */
export const barOfFrame = (frame: number): number => Math.floor(frame / FRAMES_PER_BAR) + 1;

export const frameToSeconds = (frame: number): number => frame / FPS;
export const secondsToFrame = (s: number): number => s * FPS;
export const frameToBeat = (frame: number): number => frame / FRAMES_PER_BEAT;
export const barSeconds = (bar: number, beat = 0): number => frameToSeconds(barFrame(bar, beat));
