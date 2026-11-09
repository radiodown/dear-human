import { escapeHtml as e, renderMarkdown } from './markdown.js';

let content;
let creator = false;
let activeEra = 'all';
const main = document.querySelector('#main');
const search = document.querySelector('#search');
const notice = document.querySelector('#notice');
const categoryById = id => content.categories.find(category => category.id === id);
const visible = () => content.articles.filter(article => creator || article.visibility === 'reader');
const href = slug => `#/article/${slug}`;
const link = (slug, label, className = '') => `<a class="${className}" href="${href(slug)}">${e(label)}</a>`;
const badge = status => `<span class="badge ${status === '확정' ? 'confirmed' : status === '미정' ? 'undecided' : 'proposed'}">${e(status)}</span>`;
const icons = {
  home: '<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
  book: '<path d="M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-4-2-7-1-10 1Z"/><path d="M12 5v15"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
  list: '<path d="M8 5h13M8 12h13M8 19h13M3 5h.1M3 12h.1M3 19h.1"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  star: '<path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4Z"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.book}</svg>`;

function toast(message) {
  notice.textContent = message;
  notice.classList.add('show');
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => notice.classList.remove('show'), 2400);
}

function renderSidebar() {
  const route = location.hash || '#/';
  document.querySelector('#sidebar').innerHTML = `
    <section class="side-panel"><h2>위키 둘러보기</h2>
    <nav class="primary-nav" aria-label="주요 메뉴">
      ${[['#/', 'home', '위키 홈'], ['#/articles', 'list', '모든 문서'], ['#/timeline', 'clock', '세계 연표']].map(([url, symbol, label]) => `<a href="${url}" class="nav-item ${route === url || (!location.hash && url === '#/') ? 'active' : ''}" ${route === url ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${label}</span>${url === '#/articles' ? `<small>${visible().length}</small>` : ''}</a>`).join('')}
    </nav></section>
    <section class="side-panel"><h2>세계관 분류</h2>
    <nav class="category-nav" aria-label="문서 분류">${content.categories.map(category => `<a href="#/category/${category.id}" class="nav-item ${route === `#/category/${category.id}` ? 'active' : ''}"><span class="category-dot"></span><span>${e(category.title)}</span><small>${visible().filter(article => article.category === category.id).length}</small></a>`).join('')}</nav>
    </section><section class="side-panel"><h2>주요 문서</h2>
    <nav class="reading-nav" aria-label="추천 입문 문서">${[['world-overview', '세계관 개요'], ['ai-war', 'AI 전쟁'], ['united-earth', '유나이티드 어스'], ['clone-war', '클론전쟁'], ['commander', '인간 지휘관'], ['heroine', '리안']].map(([slug, title]) => link(slug, title)).join('')}</nav></section>
    <section class="side-panel world-reference"><h2>이야기의 현재</h2><strong>2114. 11. 21.</strong><p>베스퍼 도착 · 본편의 시작</p><div>${visible().length}개 문서 · ${content.categories.length}개 분류</div></section>`;
}

function card(article, index) {
  return `<a class="article-card" href="${href(article.slug)}"><div class="card-meta"><span>${e(categoryById(article.category).title)}</span>${badge(article.status)}</div><h3>${e(article.title)}</h3><p>${e(article.summary)}</p><div class="card-bottom"><span>${index === undefined ? '문서 읽기' : `0${index + 1}`}</span>${icon('arrow')}</div></a>`;
}

function titleBlock(eyebrow, title, description, extra = '') {
  return `<div class="page-heading"><div class="eyebrow">${e(eyebrow)}</div><h1>${e(title)}</h1><p>${e(description)}</p>${extra}</div>`;
}

function renderHome() {
  const articles = visible();
  main.innerHTML = `<div class="home-page">
    <header class="page-heading"><h1>Dear Human: 대문</h1><p>Dear Human 세계관 위키 · ${articles.length}개 문서</p></header>
    <div class="category-box"><span>분류:</span> <a href="#/">Dear Human</a> · 대문</div>
    <section class="wiki-welcome"><div class="welcome-caption">DEAR HUMAN WORLD WIKI</div><h2><strong>Dear Human</strong> 세계관 위키</h2><p>인류를 지키기 위해 만들어진 클론들과,<br>한 클론에게 목숨을 빚진 인간 지휘관의 이야기.</p><nav aria-label="입문 바로가기">${link('world-overview', '세계관 개요')}<span>·</span><a href="#/timeline">세계 연표</a><span>·</span><a href="#/articles">모든 문서</a></nav></section>
    <div class="wiki-notice"><strong>열람 안내</strong><p>설정은 ${badge('확정')} ${badge('보완안')} ${badge('미정')}으로 구분합니다. 비밀 설정은 상단의 <strong>제작자 설정</strong>을 켜면 볼 수 있습니다.</p></div>
    <section class="portal-section"><h2 class="wiki-section-title">세계관 찾아보기</h2><div class="portal-grid">${content.categories.map(category => `<section class="wiki-portal"><h3><a href="#/category/${category.id}">${e(category.title)}</a><span>${articles.filter(article => article.category === category.id).length}</span></h3><p>${e(category.description)}</p><div class="portal-links">${articles.filter(article => article.category === category.id).map(article => link(article.slug, article.title)).join('')}</div></section>`).join('')}</div></section>
    <section class="home-chronology"><h2 class="wiki-section-title">주요 역사 <a href="#/timeline">전체 연표 보기 →</a></h2><div class="history-track">${[['2063', 'AI 전쟁', 'ai-war'], ['2090', 'UE 출범', 'united-earth'], ['2099', '클론전쟁', 'clone-war'], ['2114', '베스퍼 도착', 'commander']].map(([date, title, slug]) => `<a href="${href(slug)}"><time>${date}</time><span class="history-node"></span><strong>${title}</strong></a>`).join('')}</div></section>
    <div class="wiki-bottom-note">본편 시작 기준일: <strong>2114년 11월 21일</strong> · 날짜와 나이는 ${link('calendar', '지구 표준력과 만 나이')}를 따릅니다.</div>
  </div>`;
}

function renderIndex(categoryId) {
  const category = categoryId ? categoryById(categoryId) : null;
  if (categoryId && !category) return renderMissing();
  const articles = visible().filter(article => !categoryId || article.category === categoryId).sort((a, b) => a.title.localeCompare(b.title, 'ko'));
  main.innerHTML = `<div class="index-page">${titleBlock(category ? `CATEGORY ${category.symbol}` : 'ALL RECORDS', category?.title || '모든 문서', category?.description || '이름을 따라, 사건을 따라 세계의 기록을 찾아보세요.', `<span class="count-label">${articles.length}개 문서</span>`)}<div class="document-list">${articles.map(article => `<a href="${href(article.slug)}" class="document-row"><span class="row-icon">${icon('book')}</span><div><div class="row-title"><h2>${e(article.title)}</h2>${badge(article.status)}${article.visibility === 'creator' ? '<span class="creator-tag">제작자</span>' : ''}</div><p>${e(article.summary)}</p></div><span class="row-arrow">↗</span></a>`).join('')}</div></div>`;
}

function renderArticle(slug) {
  const article = content.articles.find(item => item.slug === slug);
  if (!article) return renderMissing();
  if (!creator && article.visibility === 'creator') {
    main.innerHTML = `<div class="empty-state">${icon('book')}<h1>제작자용 기록</h1><p>이 문서에는 본편에서 아직 공개되지 않은 설정이 있습니다.<br>오른쪽 위의 ‘제작자 설정’을 켜면 읽을 수 있습니다.</p><a href="#/" class="text-link">위키 홈으로 돌아가기 ↗</a></div>`;
    return;
  }
  const articles = visible();
  const { html, toc } = renderMarkdown(article.body, { allowed: new Set(articles.map(item => item.slug)), titles: new Map(content.articles.map(item => [item.slug, item.title])) });
  const outgoing = new Set([...article.body.matchAll(/\[\[([a-z0-9-]+)/g)].map(match => match[1]));
  const backlinks = articles.filter(item => item.slug !== slug && item.body.includes(`[[${slug}`));
  const related = articles.filter(item => item.slug !== slug && (outgoing.has(item.slug) || item.category === article.category)).slice(0, 4);
  const sourceUrl = `./articles/${article.file.split('/').pop()}`;
  main.innerHTML = `<div class="article-page"><div class="breadcrumbs"><a href="#/">위키</a><span>/</span><a href="#/category/${article.category}">${e(categoryById(article.category).title)}</a></div><div class="article-layout"><article class="article-main"><header class="article-heading"><div class="article-meta">${badge(article.status)}${article.visibility === 'creator' ? '<span class="creator-tag">제작자 전용 · 스포일러</span>' : '<span>세계관 문서</span>'}</div><h1>${e(article.title)}</h1><p class="article-summary">${e(article.summary)}</p><div class="article-tools"><span>편찬 ${e(article.updated)}</span><div><button id="copy-link">주소 복사</button><a href="${sourceUrl}" download>문서 내려받기 ↗</a></div></div></header>${article.visibility === 'creator' ? '<div class="spoiler-banner">제작자용 기록입니다. 작중 인물이 이미 아는 사실과 구분해 읽어주세요.</div>' : ''}<div class="prose">${html}</div><section class="article-sources"><h2>편찬 근거</h2><p>기존 설정을 바탕으로 이 위키를 위해 독립 집필한 문서입니다.</p><ul>${article.sources.map(source => `<li>${e(source)}</li>`).join('')}</ul></section>${backlinks.length ? `<section class="backlinks"><h2>이 문서를 가리키는 기록 <span>${backlinks.length}</span></h2><div>${backlinks.map(item => link(item.slug, item.title)).join('')}</div></section>` : ''}<section class="related"><h2>함께 읽기</h2><div class="related-grid">${related.map(item => `<a href="${href(item.slug)}"><strong>${e(item.title)}</strong><p>${e(item.summary)}</p><span>↗</span></a>`).join('')}</div></section></article><aside class="toc"><div class="eyebrow">ON THIS PAGE</div><h2>이 문서의 목차</h2><nav aria-label="문서 목차">${toc.map(item => `<button data-section="${e(item.id)}" class="toc-level-${item.level}">${e(item.title)}</button>`).join('')}</nav><div class="toc-note"><span class="live-dot"></span>${e(categoryById(article.category).title)}<p>${article.status === '확정' ? '기준 설정으로 채택된 내용입니다. 문서 안의 미정 사항은 별도로 표시합니다.' : '명칭과 세부 사항을 구체화하는 보완 설정입니다.'}</p></div></aside></div></div>`;
  const articleToc = document.querySelector('.toc');
  document.querySelector('.article-heading').after(articleToc);
  articleToc.querySelector('h2').textContent = '목차';
  if (article.profile) {
    const profile = article.profile;
    const portrait = article.portrait;
    const portraitHtml = portrait ? `<figure class="profile-portrait"><a href="./${e(portrait.src)}" target="_blank" rel="noopener" aria-label="${e(article.title)} 이미지 크게 보기"><img src="./${e(portrait.src)}" alt="${e(portrait.alt)}" width="${portrait.width}" height="${portrait.height}" decoding="async"></a><figcaption>${e(portrait.caption)}</figcaption></figure>` : '';
    const overview = document.createElement('section');
    overview.className = 'character-overview';
    overview.setAttribute('aria-label', '인물 목차와 기본 정보');
    articleToc.before(overview);
    overview.append(articleToc);
    overview.insertAdjacentHTML('beforeend', `<aside class="character-profile" aria-label="${e(article.title)} 기본 정보"><header><h2>${e(article.title)}</h2><p>${e(profile.subtitle)}</p></header><p class="profile-description">${e(profile.description)}</p><table><caption class="sr-only">${e(article.title)} 인물 정보</caption><tbody>${profile.fields.map(([label, value]) => `<tr><th scope="row">${e(label)}</th><td>${e(value)}</td></tr>`).join('')}</tbody></table><p class="profile-note">${e(profile.note)}</p></aside>`);
    overview.prepend(overview.querySelector('.character-profile'));
    if (portraitHtml) overview.querySelector('.character-profile>header').insertAdjacentHTML('afterend', portraitHtml);
    document.querySelector('.article-main').classList.add('has-character-profile');
  }
  document.querySelector('.article-summary').insertAdjacentHTML('beforebegin', `<div class="category-box"><span>분류:</span> <a href="#/category/${article.category}">${e(categoryById(article.category).title)}</a></div>`);
  document.querySelectorAll('[data-section]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.section)?.scrollIntoView({ behavior: 'smooth', block: 'start' })));
  document.querySelector('#copy-link').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); toast('문서 주소를 복사했습니다.'); }
    catch { toast('주소창에서 문서 주소를 복사할 수 있습니다.'); }
  });
  document.title = `${article.title} — Dear Human Wiki`;
}

function renderTimeline() {
  const events = visible().flatMap(article => (article.events || []).map(event => ({ ...event, slug: article.slug, proposed: article.status === '보완안' }))).sort((a, b) => a.date.localeCompare(b.date));
  const filtered = events.filter(event => activeEra === 'all' || (activeEra === 'early' && Number(event.date.slice(0, 4)) < 2090) || (activeEra === 'wars' && Number(event.date.slice(0, 4)) >= 2090 && Number(event.date.slice(0, 4)) < 2110) || (activeEra === 'present' && Number(event.date.slice(0, 4)) >= 2110));
  const years = [...new Set(filtered.map(event => event.date.slice(0, 4)))];
  main.innerHTML = `<div class="timeline-page">${titleBlock('CHRONOLOGY', '세계 연표', '사건을 선택하면 해당 기록의 자세한 문서로 이동합니다.')}<div class="category-box"><span>분류:</span> <a href="#/category/history">역사와 사건</a> · ${link('calendar', '표준력과 나이')}</div><div class="era-tabs" role="group" aria-label="연표 시대 선택">${[['all', '전체'], ['early', '통합 이전'], ['wars', 'UE와 클론전쟁'], ['present', '본편으로']].map(([id, title]) => `<button data-era="${id}" aria-pressed="${activeEra === id}" class="${activeEra === id ? 'selected' : ''}">${title}</button>`).join('')}</div><div class="timeline-summary"><span>${years[0]} — ${years.at(-1)}</span><small>${filtered.length}개 사건 · 날짜 / 사건명</small></div><ol class="timeline" aria-label="연도별 사건 타임라인">${years.map(year => `<li class="timeline-year"><div class="timeline-marker"><time datetime="${year}">${year}</time><span class="timeline-dot" aria-hidden="true"></span></div><ul class="timeline-events">${filtered.filter(event => event.date.startsWith(year)).map(event => `<li><a class="timeline-event ${['ai-war','clone-war','united-earth'].includes(event.slug) ? 'milestone' : ''}" href="${href(event.slug)}" aria-label="${e(event.date)} ${e(event.label)} 문서 보기">${event.date.length > 4 ? `<time datetime="${e(event.date)}">${e(event.date.slice(5).replace('-', '.'))}</time>` : ''}<strong>${e(event.label)}</strong>${event.proposed ? '<span class="event-proposed" title="보완안">보완</span>' : ''}<span class="event-arrow" aria-hidden="true">→</span></a></li>`).join('')}</ul></li>`).join('')}</ol><p class="timeline-footnote">월·일이 정해지지 않은 사건은 연도만 표시합니다. 상세 설명과 설정 상태는 연결된 문서에서 확인할 수 있습니다.</p></div>`;
  document.querySelectorAll('[data-era]').forEach(button => button.addEventListener('click', () => { activeEra = button.dataset.era; renderTimeline(); }));
}

function renderSearch(query) {
  const term = query.trim().toLocaleLowerCase('ko');
  const terms = term.split(/\s+/).filter(Boolean);
  const results = term ? visible().map(article => {
    const titleText = [article.title, ...article.aliases].join(' ').toLocaleLowerCase('ko');
    const fullText = `${titleText} ${article.summary} ${article.body}`.toLocaleLowerCase('ko');
    return { article, score: terms.every(word => fullText.includes(word)) ? (titleText.includes(term) ? 3 : article.summary.toLocaleLowerCase('ko').includes(term) ? 2 : 1) : 0 };
  }).filter(item => item.score).sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title, 'ko')) : [];
  main.innerHTML = `<div class="search-page">${titleBlock('SEARCH THE ARCHIVE', term ? `‘${query}’ 검색 결과` : '기록 검색', term ? `${results.length}개의 문서를 찾았습니다.` : '인물, 사건, 장소 또는 문서 본문의 단어로 찾아보세요.')}<div class="document-list">${results.map(({ article }) => `<a href="${href(article.slug)}" class="document-row"><span class="row-icon">${icon('book')}</span><div><span class="search-category">${e(categoryById(article.category).title)}</span><div class="row-title"><h2>${e(article.title)}</h2>${badge(article.status)}</div><p>${e(article.summary)}</p></div><span class="row-arrow">↗</span></a>`).join('')}</div>${!results.length ? `<div class="search-empty">${icon('book')}<h2>${term ? '일치하는 기록이 없습니다.' : '어떤 기록을 찾고 있나요?'}</h2><p>${term ? '다른 단어나 짧은 이름으로 검색해 보세요.' : '예: 클론전쟁, 지휘관, 베스퍼'}</p>${!creator ? '<small>제작자 전용 기록은 검색에서 제외되어 있습니다.</small>' : ''}</div>` : ''}</div>`;
}

function renderMissing() {
  main.innerHTML = `<div class="empty-state"><div class="eyebrow">RECORD NOT FOUND</div><h1>아직 없는 기록입니다.</h1><p>문서 주소를 확인하거나 모든 문서에서 찾아보세요.</p><a class="text-link" href="#/articles">모든 문서 보기 ↗</a></div>`;
}

function render() {
  if (!content) return;
  document.title = 'Dear Human · 세계관 위키';
  const route = (location.hash || '#/').slice(1);
  const [pathname, parameters = ''] = route.split('?');
  const segments = pathname.split('/').filter(Boolean);
  const query = new URLSearchParams(parameters).get('q') || '';
  if (segments[0] === 'search') {
    if (search.value !== query) search.value = query;
  } else search.value = '';
  document.querySelector('#search-clear').hidden = !search.value;
  renderSidebar();
  if (!segments.length) renderHome();
  else if (segments[0] === 'article' && segments.length === 2) renderArticle(segments[1]);
  else if (segments[0] === 'category' && segments.length === 2) renderIndex(segments[1]);
  else if (segments[0] === 'articles') renderIndex();
  else if (segments[0] === 'timeline') renderTimeline();
  else if (segments[0] === 'search') renderSearch(query);
  else renderMissing();
  document.body.classList.remove('menu-open');
  document.querySelector('#menu-toggle').setAttribute('aria-expanded', 'false');
}

function performSearch() {
  const query = search.value;
  document.title = query.trim() ? `${query} 검색 — Dear Human Wiki` : '검색 — Dear Human Wiki';
  history.replaceState(null, '', `#/search?q=${encodeURIComponent(query)}`);
  renderSearch(query);
  renderSidebar();
  document.querySelector('#search-clear').hidden = !query;
}

async function loadContent() {
  try {
    const response = await fetch('./content.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    content = await response.json();
    render();
  } catch {
    main.innerHTML = '<div class="empty-state"><h1>기록을 불러오지 못했습니다.</h1><p>연결을 확인한 뒤 다시 시도해 주세요.</p><button id="retry" class="action-button">다시 불러오기</button></div>';
    document.querySelector('#retry').addEventListener('click', loadContent);
  }
}

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
search.addEventListener('input', () => { if (content) performSearch(); });
search.addEventListener('keydown', event => {
  if (event.key === 'Escape') { search.value = ''; location.hash = '/'; search.blur(); }
  if (event.key === 'Enter') document.querySelector('.document-row')?.focus();
});
document.querySelector('#search-clear').addEventListener('click', () => { search.value = ''; performSearch(); search.focus(); });
document.querySelector('#creator-toggle').addEventListener('change', event => {
  creator = event.target.checked;
  render();
  toast(creator ? '제작자 설정을 포함해 표시합니다.' : '기본 열람으로 전환했습니다.');
});
document.querySelector('#menu-toggle').addEventListener('click', event => {
  const open = document.body.classList.toggle('menu-open');
  event.currentTarget.setAttribute('aria-expanded', String(open));
});
document.addEventListener('keydown', event => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) { event.preventDefault(); search.focus(); }
  if (event.key === 'Escape') { document.body.classList.remove('menu-open'); document.querySelector('#menu-toggle').setAttribute('aria-expanded', 'false'); }
});
const themeButton = document.querySelector('#theme-toggle');
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeButton.setAttribute('aria-label', theme === 'dark' ? '밝은 테마로 변경' : '어두운 테마로 변경');
  try { localStorage.setItem('dear-human-wiki:theme', theme); } catch { /* Private browsing may disable persistence. */ }
}
try { setTheme(localStorage.getItem('dear-human-wiki:theme') || 'light'); } catch { setTheme('light'); }
themeButton.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
loadContent();
