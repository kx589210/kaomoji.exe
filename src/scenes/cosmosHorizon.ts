// The cosmos's renderer C, "LIGHTNING WEB → EVENT HORIZON → the amber point" (the part 'cosmos', bars 5–6: COSMOS_PARTS 'C'; build sheet
// notes/bcos/sheet.md §4 bars 5–6 and §6.2, design notes/cosmos3/final.md §4 bars 19–20 and §6.2, prototype cosmos3/w/j5.js
// from 19.1, j6.js). Owner: builder C, who also owns the out hand-off (the last frames: VOID and one amber point at the centre, where the
// comic club opens). STUB until built: it keeps the CosmosPart contract (src/scenes/cosmosStub.ts) and the class name; the dispatcher
// (src/scenes/cosmos.ts) routes every instant of cosmos 5.1 → club 1.1 here and gives it the score's segments.
import { cosmosLook, cosmosTemporal, groundAt } from '../shots/cosmosKit.ts';
import { COSMOS_PARTS, KICKS } from '../score/cosmos.ts';
import { CosmosStub } from './cosmosStub.ts';

const RANGE = COSMOS_PARTS.find((p) => p.id === 'C')!;

export class HorizonPart extends CosmosStub {
  constructor() {
    super({ label: 'cosmos C', part: 'cosmos', from: RANGE.from, to: RANGE.to, ground: groundAt, kicks: KICKS, look: cosmosLook, temporal: cosmosTemporal });
  }
}
