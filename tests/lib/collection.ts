// The kaomoji collection the casting scripts (scripts/cast*.mjs) pick faces from: docs/reference/kaomoji-collection.json, a list of
// kaomoji gathered from public websites, each marked with whether it draws in the film's fonts and with its moods. It is not published
// with this repository (the rights to the compilation are unclear), so the checks that compare a cast with it, and the re-runs of the
// casting scripts, skip when the file is absent. The cast files in src/content/ are the scripts' committed output, and every other
// check of a cast (no face twice, the fonts draw it, the named faces) still runs.
import fs from 'node:fs';

export const COLLECTION_FILE = new URL('../../docs/reference/kaomoji-collection.json', import.meta.url);
export const HAS_COLLECTION = fs.existsSync(COLLECTION_FILE);
/** node:test's `skip` option: false with the collection, else the reason. */
export const NO_COLLECTION: false | string = HAS_COLLECTION ? false : 'docs/reference/kaomoji-collection.json is not published with this repository';
/** The collection's entries, or none without the file. */
export const readCollection = <T>(): T[] => (HAS_COLLECTION ? (JSON.parse(fs.readFileSync(COLLECTION_FILE, 'utf8')) as T[]) : []);
