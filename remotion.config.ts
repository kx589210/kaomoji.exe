// kaomoji.exe — the Remotion CLI picks this file up when run from the repository root, e.g.
//   npx remotion studio
// The Node scripts in scripts/ pass the same options explicitly (scripts/lib/remotion.mjs),
// because the config file only applies to the CLI.
import { Config } from '@remotion/cli/config';

Config.setEntryPoint('src/index.ts');
Config.setPublicDir('public');
// WebGL must run on the GPU; without this, headless Chrome may render an empty canvas.
Config.setChromiumOpenGlRenderer('angle');
Config.setVideoImageFormat('jpeg');
// Glows on black and soft gradients band at the browser's default JPEG quality.
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
