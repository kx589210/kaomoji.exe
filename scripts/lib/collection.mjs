// The kaomoji collection the casting scripts pick faces from (docs/reference/kaomoji-collection.json): a list of kaomoji gathered from
// public websites, each marked with whether it draws in the film's fonts (`renders`) and with its moods. It is not published with this
// repository (the rights to the compilation are unclear); the cast files the scripts wrote are committed in src/content/. To re-cast,
// put a collection of { face, renders, moods } entries at that path.
import fs from 'node:fs';
import path from 'node:path';

export function readCollection(root) {
  const file = path.join(root, 'docs', 'reference', 'kaomoji-collection.json');
  if (!fs.existsSync(file)) {
    console.error(`${path.relative(process.cwd(), file)} is not published with this repository; the committed cast files in src/content/ are this script's output.`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
