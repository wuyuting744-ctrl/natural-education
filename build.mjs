import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const output = path.join(root, 'dist');
await mkdir(path.join(output, 'vendor', 'controls'), { recursive: true });
const html = (await readFile(path.join(root, 'index.html'), 'utf8'))
  .replace('./node_modules/three/build/three.module.js', './vendor/three.module.js')
  .replace('./node_modules/three/examples/jsm/', './vendor/');
await writeFile(path.join(output, 'index.html'), html);
for (const file of ['scene.js', 'styles.css']) await copyFile(path.join(root, file), path.join(output, file));
await copyFile(path.join(root, 'node_modules/three/build/three.module.js'), path.join(output, 'vendor/three.module.js'));
await copyFile(path.join(root, 'node_modules/three/examples/jsm/controls/OrbitControls.js'), path.join(output, 'vendor/controls/OrbitControls.js'));
await copyFile(path.join(root, 'node_modules/three/LICENSE'), path.join(output, 'vendor/THREE-LICENSE.txt'));
await writeFile(path.join(output, '.nojekyll'), '');
console.log('Built static GitHub Pages site in dist/');
