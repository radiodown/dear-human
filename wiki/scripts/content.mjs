import { readFile, readdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
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
    if (article.avatar !== undefined) {
      const avatar = article.avatar;
      if (!article.profile || !avatar || typeof avatar !== 'object' || Array.isArray(avatar)) throw new Error(`${article.slug}: 인물 아이콘 형식 오류`);
      if (typeof avatar.src !== 'string' || !/^assets\/[a-zA-Z0-9/_-]+\.(png|jpe?g|webp)$/.test(avatar.src)) throw new Error(`${article.slug}: 위키 내부 아이콘 경로 필요`);
      if (typeof avatar.alt !== 'string' || !avatar.alt) throw new Error(`${article.slug}: 아이콘 대체 텍스트 필요`);
      if (!Number.isInteger(avatar.width) || avatar.width <= 0 || avatar.width !== avatar.height) throw new Error(`${article.slug}: 정사각형 아이콘 크기 필요`);
      const imagePath = path.join(root, 'public', avatar.src);
      if (!existsSync(imagePath) || !statSync(imagePath).isFile()) throw new Error(`${article.slug}: 아이콘 파일이 없습니다.`);
    }
    if (article.unitPage !== undefined && (typeof article.unitPage !== 'string' || !articles.some(item => item.slug === article.unitPage && item.unit && (article.visibility === 'creator' || item.visibility === 'reader')))) throw new Error(`${article.slug}: 소대 문서 연결 오류`);
    if (article.unit !== undefined) {
      const unit = article.unit;
      if (!unit || typeof unit !== 'object' || typeof unit.subtitle !== 'string' || !unit.subtitle) throw new Error(`${article.slug}: 소대 정보 형식 오류`);
      if (!Array.isArray(unit.fields) || !unit.fields.length || unit.fields.some(row => !Array.isArray(row) || row.length !== 2 || row.some(value => typeof value !== 'string' || !value))) throw new Error(`${article.slug}: 소대 정보 항목 오류`);
      if (!Array.isArray(unit.members) || !unit.members.length) throw new Error(`${article.slug}: 소대 구성원 필요`);
      const members = new Set();
      for (const member of unit.members) {
        const person = articles.find(item => item.slug === member.article);
        if (!person?.profile || members.has(member.article) || (article.visibility === 'reader' && person.visibility !== 'reader') || person.unitPage !== article.slug) throw new Error(`${article.slug}: 소대 구성원 연결 오류`);
        for (const field of ['role', 'description']) if (typeof member[field] !== 'string' || !member[field]) throw new Error(`${article.slug}: 구성원 ${field} 필요`);
        members.add(member.article);
      }
    }
    if (article.profile !== undefined) {
      const profile = article.profile;
      if (article.category !== 'people' || !profile || typeof profile !== 'object' || Array.isArray(profile)) throw new Error(`${article.slug}: 인물 프로필 형식 오류`);
      for (const field of ['subtitle', 'description', 'note']) {
        if (typeof profile[field] !== 'string' || !profile[field]) throw new Error(`${article.slug}: 프로필 ${field} 필요`);
      }
      if (!Array.isArray(profile.fields) || !profile.fields.length || profile.fields.some(row => !Array.isArray(row) || row.length !== 2 || row.some(value => typeof value !== 'string' || !value))) throw new Error(`${article.slug}: 프로필 항목은 이름과 값의 쌍이어야 합니다.`);
    }
    if (article.illustrations !== undefined) {
      if (!Array.isArray(article.illustrations) || !article.illustrations.length) throw new Error(`${article.slug}: 장비 이미지 배열 필요`);
      for (const image of article.illustrations) {
        if (!image || typeof image !== 'object' || typeof image.src !== 'string' || !/^assets\/[a-zA-Z0-9/_-]+\.(png|jpe?g|webp)$/.test(image.src)) throw new Error(`${article.slug}: 위키 내부 장비 이미지 경로 필요`);
        for (const field of ['title', 'alt', 'caption']) if (typeof image[field] !== 'string' || !image[field]) throw new Error(`${article.slug}: 장비 이미지 ${field} 필요`);
        for (const field of ['width', 'height']) if (!Number.isInteger(image[field]) || image[field] <= 0) throw new Error(`${article.slug}: 장비 이미지 ${field} 오류`);
        if (image.article !== undefined && (typeof image.article !== 'string' || !articles.some(item => item.slug === image.article))) throw new Error(`${article.slug}: 장비 이미지 문서 연결 오류`);
        const imagePath = path.join(root, 'public', image.src);
        if (!existsSync(imagePath) || !statSync(imagePath).isFile()) throw new Error(`${article.slug}: 장비 이미지 파일이 없습니다.`);
      }
    }
    if (article.portrait !== undefined) {
      const portrait = article.portrait;
      if (!article.profile || !portrait || typeof portrait !== 'object' || Array.isArray(portrait)) throw new Error(`${article.slug}: 인물 이미지 형식 오류`);
      if (typeof portrait.src !== 'string' || !/^assets\/[a-zA-Z0-9/_-]+\.(png|jpe?g|webp)$/.test(portrait.src)) throw new Error(`${article.slug}: 위키 내부 이미지 경로가 필요합니다.`);
      for (const field of ['alt', 'caption']) if (typeof portrait[field] !== 'string' || !portrait[field]) throw new Error(`${article.slug}: 이미지 ${field} 필요`);
      for (const field of ['width', 'height']) if (!Number.isInteger(portrait[field]) || portrait[field] <= 0) throw new Error(`${article.slug}: 이미지 ${field} 오류`);
      const imagePath = path.join(root, 'public', portrait.src);
      if (!existsSync(imagePath) || !statSync(imagePath).isFile()) throw new Error(`${article.slug}: 이미지 파일이 없습니다.`);
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
