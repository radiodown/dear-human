import { spawnSync } from 'node:child_process';
import { readContent, validateContent, root } from './content.mjs';
import path from 'node:path';

const result = validateContent(await readContent());
for (const file of ['public/app.js', 'public/markdown.js', 'scripts/server.mjs', 'scripts/build.mjs']) {
  const checked = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
  if (checked.status !== 0) throw new Error(checked.stderr);
}
console.log(`문서 연결·메타데이터·구문 확인: ${JSON.stringify(result)}`);
