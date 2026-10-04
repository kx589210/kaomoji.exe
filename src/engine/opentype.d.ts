// The subset of opentype.js 2 that the film uses (the package ships no typings).
declare module 'opentype.js' {
  export type PathCommand = {
    type: 'M' | 'L' | 'C' | 'Q' | 'Z';
    x?: number;
    y?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
  };
  export interface Path {
    commands: PathCommand[];
  }
  export interface Font {
    unitsPerEm: number;
    getPath(text: string, x: number, y: number, fontSize: number): Path;
  }
  export function parse(buffer: ArrayBuffer): Font;
  /** The package is CommonJS: Node (the tests) sees it only as a default export. */
  const opentype: { parse: typeof parse };
  export default opentype;
}
