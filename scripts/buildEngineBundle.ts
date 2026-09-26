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
    treeShaking: true,
    legalComments: 'none',
    drop: ['debugger'],
    target: ['chrome100', 'safari14', 'firefox100', 'edge100'],
    write: false,
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  });

  const bundledCode = result.outputFiles[0].text;

  // Read production compiled CSS from dist/assets if available
  let bundledCss = '';
  const distAssetsDir = path.resolve(__dirname, '../dist/assets');
  if (fs.existsSync(distAssetsDir)) {
    const files = fs.readdirSync(distAssetsDir);
    const cssFile = files.find(f => f.startsWith('index-') && f.endsWith('.css'));
    if (cssFile) {
      bundledCss = fs.readFileSync(path.join(distAssetsDir, cssFile), 'utf-8');
    }
  }

  const outTs = `// Auto-generated unified player engine bundle
export const STANDALONE_PLAYER_BUNDLE_JS = ${JSON.stringify(bundledCode)};
export const STANDALONE_PLAYER_BUNDLE_CSS = ${JSON.stringify(bundledCss)};
`;
  fs.writeFileSync(path.resolve(__dirname, '../src/services/playerBundle.generated.ts'), outTs, 'utf-8');
  console.log(`Successfully generated playerBundle.generated.ts (${bundledCode.length} bytes JS, ${bundledCss.length} bytes CSS)`);
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
