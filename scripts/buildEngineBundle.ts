import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function build() {
  const result = await esbuild.build({
    entryPoints: [path.resolve(__dirname, '../src/player/standaloneRunner.tsx')],
    bundle: true,
    format: 'iife',
    minify: true,
    write: false,
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  });

  const bundledCode = result.outputFiles[0].text;
  const outTs = `// Auto-generated unified player engine bundle\nexport const STANDALONE_PLAYER_BUNDLE_JS = ${JSON.stringify(bundledCode)};\n`;
  fs.writeFileSync(path.resolve(__dirname, '../src/services/playerBundle.generated.ts'), outTs, 'utf-8');
  console.log(`Successfully generated playerBundle.generated.ts (${bundledCode.length} bytes)`);
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
