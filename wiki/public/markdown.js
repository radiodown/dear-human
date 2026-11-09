export const escapeHtml = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const headingId = text => text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');

export function renderMarkdown(markdown, { allowed = new Set(), titles = new Map() } = {}) {
  function inline(text) {
    const tokens = [];
    const token = value => `\u0000${tokens.push(value) - 1}\u0000`;
    let result = text.replace(/`([^`]+)`/g, (_, value) => token(`<code>${escapeHtml(value)}</code>`));
    result = result.replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, (_, slug, label) => {
      const title = escapeHtml(label || titles.get(slug) || slug);
      return token(allowed.has(slug) ? `<a class="wiki-link" href="#/article/${slug}">${title}</a>` : `<span>${title}</span>`);
    });
    result = escapeHtml(result).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return result.replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[Number(index)]);
  }
  const lines = markdown.split('\n');
  const output = [];
  const toc = [];
  const seenHeadings = new Map();
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      if (level === 1) { i++; continue; }
      const base = headingId(heading[2]);
      const count = seenHeadings.get(base) || 0;
      seenHeadings.set(base, count + 1);
      const id = count ? `${base}-${count}` : base;
      toc.push({ id, title: heading[2], level });
      output.push(`<h${level} id="${escapeHtml(id)}">${inline(heading[2])}</h${level}>`);
      i++; continue;
    }
    if (line.startsWith('|') && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
      const cells = row => row.trim().slice(1, -1).split(/(?<!\\)\|/).map(value => value.replace(/\\\|/g, '|').trim());
      const head = cells(line);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].startsWith('|')) { rows.push(cells(lines[i])); i++; }
      output.push(`<div class="table-scroll"><table><thead><tr>${head.map(cell => `<th>${inline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (/^[-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) { items.push(`<li>${inline(lines[i].slice(2))}</li>`); i++; }
      output.push(`<ul>${items.join('')}</ul>`); continue;
    }
    if (line.startsWith('> ')) {
      const quotes = [];
      while (i < lines.length && lines[i].startsWith('> ')) { quotes.push(inline(lines[i].slice(2))); i++; }
      output.push(`<blockquote>${quotes.join('<br>')}</blockquote>`); continue;
    }
    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|[-*]\s|>\s|\|)/.test(lines[i])) { paragraph.push(lines[i]); i++; }
    if (paragraph.length) output.push(`<p>${inline(paragraph.join(' '))}</p>`);
    else { output.push(`<p>${inline(lines[i])}</p>`); i++; }
  }
  return { html: output.join('\n'), toc };
}
