import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { root, readContent, validateContent } from './content.mjs';

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = Number(portIndex >= 0 ? args[portIndex + 1] : process.env.PORT || 4174);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('유효한 포트 번호가 필요합니다.');
const host = process.env.HOST || '127.0.0.1';
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8' };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-cache');
    if (pathname === '/content.json') {
      const content = await readContent();
      validateContent(content);
      response.writeHead(200, { 'Content-Type': mime['.json'] });
      response.end(JSON.stringify(content));
      return;
    }
    const articles = pathname.startsWith('/articles/');
    const base = path.join(root, articles ? 'content' : 'public');
    const target = path.resolve(base, `.${pathname === '/' ? '/index.html' : pathname}`);
    const relative = path.relative(base, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    if (!(await stat(target)).isFile()) throw Object.assign(new Error('Not found'), { code: 'ENOENT' });
    response.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream' });
    if (request.method === 'HEAD') response.end();
    else response.end(await readFile(target));
  } catch (error) {
    const notFound = error.code === 'ENOENT' || error.code === 'ENOTDIR' || error instanceof URIError;
    response.writeHead(notFound ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(notFound ? '문서를 찾을 수 없습니다.' : '위키 콘텐츠를 읽지 못했습니다. 서버 로그를 확인하세요.');
    if (!notFound) console.error(error);
  }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, host, () => console.log(`Dear Human Wiki — http://${host}:${port}`));
