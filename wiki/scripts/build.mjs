import { mkdir, cp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readContent, root, validateContent } from './content.mjs';

const content = await readContent();
const result = validateContent(content);
const destination = path.join(root, 'dist');
await mkdir(destination, { recursive: true });
await cp(path.join(root, 'public'), destination, { recursive: true });
await writeFile(path.join(destination, 'content.json'), JSON.stringify(content));
await cp(path.join(root, 'content/articles'), path.join(destination, 'articles'), { recursive: true });
console.log(`위키 빌드 완료: ${result.articles}개 문서 · ${result.categories}개 분류 · dist/`);
