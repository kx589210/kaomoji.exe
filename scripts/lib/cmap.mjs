// Reads which Unicode code points a TrueType/OpenType font maps to glyphs
// (cmap formats 4 and 12, the ones Google Fonts ships).
export function readCoverage(buf) {
  const numTables = buf.readUInt16BE(4);
  let cmap = -1;
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    if (buf.toString('ascii', rec, rec + 4) === 'cmap') cmap = buf.readUInt32BE(rec + 8);
  }
  if (cmap < 0) throw new Error('font has no cmap table');
  const out = new Set();
  const count = buf.readUInt16BE(cmap + 2);
  for (let i = 0; i < count; i++) {
    const rec = cmap + 4 + i * 8;
    const platform = buf.readUInt16BE(rec);
    const encoding = buf.readUInt16BE(rec + 2);
    const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (!unicode) continue;
    const sub = cmap + buf.readUInt32BE(rec + 4);
    const format = buf.readUInt16BE(sub);
    if (format === 4) readFormat4(buf, sub, out);
    else if (format === 12) readFormat12(buf, sub, out);
  }
  return out;
}

function readFormat4(buf, sub, out) {
  const segX2 = buf.readUInt16BE(sub + 6);
  const ends = sub + 14;
  const starts = ends + segX2 + 2;
  const deltas = starts + segX2;
  const offsets = deltas + segX2;
  for (let s = 0; s < segX2; s += 2) {
    const end = buf.readUInt16BE(ends + s);
    const start = buf.readUInt16BE(starts + s);
    const delta = buf.readInt16BE(deltas + s);
    const rangeOffset = buf.readUInt16BE(offsets + s);
    for (let c = start; c <= end && c !== 0xffff; c++) {
      let glyph;
      if (rangeOffset === 0) glyph = (c + delta) & 0xffff;
      else {
        const at = offsets + s + rangeOffset + (c - start) * 2;
        glyph = buf.readUInt16BE(at);
        if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
      }
      if (glyph !== 0) out.add(c);
    }
  }
}

function readFormat12(buf, sub, out) {
  const groups = buf.readUInt32BE(sub + 12);
  for (let g = 0; g < groups; g++) {
    const rec = sub + 16 + g * 12;
    const start = buf.readUInt32BE(rec);
    const end = buf.readUInt32BE(rec + 4);
    const startGlyph = buf.readUInt32BE(rec + 8);
    for (let c = start; c <= end; c++) if (startGlyph + (c - start) !== 0) out.add(c);
  }
}
