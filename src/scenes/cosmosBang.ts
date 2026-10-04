// The cosmos's renderer A, "PRINTED BIG BANG · BULLET TIME → CITY LIGHTS → SUNRISE" (the part 'cosmos', bars 1–2: COSMOS_PARTS 'A';
// build sheet notes/bcos/sheet.md §4 bars 1–2, design notes/cosmos3/final.md §4 bars 15–16, prototype cosmos3/w/j3.js, j4.js
// to 16.4&). Owner: builder A. STUB until built: it keeps the CosmosPart contract (src/scenes/cosmosStub.ts) and the class name; the
// dispatcher (src/scenes/cosmos.ts) routes every instant of cosmos 1.1 → 3.1 here and gives it the score's segments.
import { cosmosLook, cosmosTemporal, groundAt } from '../shots/cosmosKit.ts';
import { COSMOS_PARTS, KICKS } from '../score/cosmos.ts';
import { CosmosStub } from './cosmosStub.ts';

const RANGE = COSMOS_PARTS.find((p) => p.id === 'A')!;

export class BangPart extends CosmosStub {
  constructor() {
    super({ label: 'cosmos A', part: 'cosmos', from: RANGE.from, to: RANGE.to, ground: groundAt, kicks: KICKS, look: cosmosLook, temporal: cosmosTemporal });
  }
}
