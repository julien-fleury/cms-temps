import { mkdir, writeFile } from 'node:fs/promises';

await mkdir('dist-electron', { recursive: true });
await writeFile('dist-electron/package.json', '{"type":"commonjs"}\n');
