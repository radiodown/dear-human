import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));

export async function readContent() {
  const directory = path.join(root, 'content/articles');
  const files = (await readdir(directory)).filter(name => name.endsWith('.md')).sort();
  const articles = await Promise.all(files.map(async file => {
    const raw = (await readFile(path.join(directory, file), 'utf8')).replace(/\r\n/g, '\n');
    const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) throw new Error(`${file}: 문서 머리말이 필요합니다.`);
    const metadata = {};
    for (const line of match[1].split('\n').filter(Boolean)) {
      const divider = line.indexOf(':');
      if (divider < 1) throw new Error(`${file}: 잘못된 메타데이터`);
      metadata[line.slice(0, divider)] = JSON.parse(line.slice(divider + 1).trim());
    }
    return { ...metadata, body: match[2].trim(), file: `content/articles/${file}` };
  }));
  const categories = JSON.parse(await readFile(path.join(root, 'content/categories.json'), 'utf8'));
  return { articles, categories };
}

export function validateContent({ articles, categories }) {
  const ids = new Set();
  const categoryIds = new Set(categories.map(category => category.id));
  for (const article of articles) {
    if (!/^[a-z][a-z0-9-]*$/.test(article.slug) || ids.has(article.slug)) throw new Error(`중복 또는 잘못된 slug: ${article.slug}`);
    ids.add(article.slug);
    for (const field of ['title', 'summary', 'status', 'visibility', 'updated', 'category']) {
      if (typeof article[field] !== 'string' || !article[field]) throw new Error(`${article.slug}: ${field} 필요`);
    }
    if (!categoryIds.has(article.category)) throw new Error(`${article.slug}: 없는 분류`);
    if (!['확정', '보완안', '미정'].includes(article.status)) throw new Error(`${article.slug}: 설정 상태 오류`);
    if (!['reader', 'creator'].includes(article.visibility)) throw new Error(`${article.slug}: 열람 범위 오류`);
    if (!Array.isArray(article.sources) || !article.sources.length) throw new Error(`${article.slug}: 집필 근거 필요`);
    if (!Array.isArray(article.aliases)) throw new Error(`${article.slug}: 별칭 배열 필요`);
    if (!article.body.startsWith(`# ${article.title}\n`)) throw new Error(`${article.slug}: 제목 불일치`);
    if (article.profile !== undefined) {
      const profile = article.profile;
      if (article.category !== 'people' || !profile || typeof profile !== 'object' || Array.isArray(profile)) throw new Error(`${article.slug}: 인물 프로필 형식 오류`);
      for (const field of ['subtitle', 'description', 'note']) {
        if (typeof profile[field] !== 'string' || !profile[field]) throw new Error(`${article.slug}: 프로필 ${field} 필요`);
      }
      if (!Array.isArray(profile.fields) || !profile.fields.length || profile.fields.some(row => !Array.isArray(row) || row.length !== 2 || row.some(value => typeof value !== 'string' || !value))) throw new Error(`${article.slug}: 프로필 항목은 이름과 값의 쌍이어야 합니다.`);
    }
  }
  for (const article of articles) {
    for (const link of article.body.matchAll(/\[\[([a-z0-9-]+)(?:\|[^\]]+)?\]\]/g)) {
      if (!ids.has(link[1])) throw new Error(`${article.slug}: 없는 문서 ${link[1]}`);
    }
  }
  if (!ids.has('world-overview')) throw new Error('세계관 개요 문서 필요');
  return { articles: articles.length, categories: categories.length, creatorOnly: articles.filter(a => a.visibility === 'creator').length };
}
