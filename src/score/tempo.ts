// The time grid of kaomoji.exe (src/score/grid.ts) and the film's length,
// derived from its map of parts (src/score/film.ts). Everything that moves or
// sounds is placed on the grid, so picture and music can never drift apart;
// place it relative to its part (partFrame, partStart, partEnd in film.ts).
export { BEATS_PER_BAR, BPM, FPS, FRAMES_PER_BAR, FRAMES_PER_BEAT, SECONDS_PER_BEAT, barFrame, barOfFrame, barSeconds, frameToBeat, frameToSeconds, secondsToFrame } from './grid.ts';
export { TOTAL_BARS, TOTAL_FRAMES } from './film.ts';
