// The cosmos's renderer B, "SLINGSHOT SPIROGRAPH → WARP ARM → NEON SPIRAL" (the part 'cosmos', bars 3–4: COSMOS_PARTS 'B'; build sheet
// notes/bcos/sheet.md §4 bars 3–4, design notes/cosmos3/final.md §4 bars 17–18, prototype cosmos3/w/j4.js from 17.1, j5.js to
// 18.4&). Owner: builder B. STUB until built: it keeps the CosmosPart contract (src/scenes/cosmosStub.ts) and the class name; the
// dispatcher (src/scenes/cosmos.ts) routes every instant of cosmos 3.1 → 5.1 here and gives it the score's segments.
import { cosmosLook, cosmosTemporal, groundAt } from '../shots/cosmosKit.ts';
import { COSMOS_PARTS, KICKS } from '../score/cosmos.ts';
import { CosmosStub } from './cosmosStub.ts';

const RANGE = COSMOS_PARTS.find((p) => p.id === 'B')!;

export class SlingPart extends CosmosStub {
  constructor() {
    super({ label: 'cosmos B', part: 'cosmos', from: RANGE.from, to: RANGE.to, ground: groundAt, kicks: KICKS, look: cosmosLook, temporal: cosmosTemporal });
  }
}
