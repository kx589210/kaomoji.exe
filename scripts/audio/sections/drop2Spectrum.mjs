// The song's own spectrogram for S30's highway (E8; builder C · GAME; build sheet notes/d2build/sheet.md §5.7). A CLI, run after every music lock
// (HANDOFF: the lead chains it after bgm.mjs): reads public/audio/bgm.wav and writes public/audio/drop2-spectrum.bin — TOTAL_FRAMES rows (one
// per film frame) × 96 bytes; an STFT hopping 800 samples (one frame at 48 kHz) with a 4096 Hann window centred on each frame's first
// sample, the mid channel, 96 log bins from 30 Hz to 16 kHz, dB −72…0 mapped to 0…255. Reuse scripts/audio/spectrogram.mjs's STFT.
// STUB: does nothing until its builder fills it.
//   node scripts/audio/sections/drop2Spectrum.mjs
export {};
