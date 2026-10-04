// The region compositor (builder W · WORLDS; build sheet notes/d2build/sheet.md §5.3, §5.9): a fullscreen shader over up to 5 half-planes in a BSP,
// one world render target per region (drawn only while its region is non-empty), a screen offset per region (the shear), the reveal
// behind a blade's tip, and the seams (4 px white with bloom for 6 f, then 2 px in the world's accent). S27 and drop2 bar 7's blade wipe
// use it through Drop2Worlds. STUB: empty until its builder fills it. Its pure maths: src/shots/drop2Regions.ts.
export {};
