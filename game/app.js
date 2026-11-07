import { RigLab, MOTIONS } from './rig-lab.js';
import { PlanBLab } from './plan-b-lab.js';
const $ = (id) => document.getElementById(id);
const lab = new RigLab();
const planB = new PlanBLab();
let labInitialized = false;
function setPreviewMode(mode, updateUrl=true) {
  const rigMode = mode === 'rig';
  const planBMode = mode === 'plan-b';
  $('reference-view').hidden = rigMode || planBMode; $('rig-view').hidden = !rigMode;
  $('plan-b-view').hidden = !planBMode;
  $('mode-reference').setAttribute('aria-pressed', String(!rigMode && !planBMode));
  $('mode-rig').setAttribute('aria-pressed', String(rigMode));
  $('mode-plan-b').setAttribute('aria-pressed', String(planBMode));
  $('review-state').textContent = planBMode ? '플랜 B · 도트 시도 검토' : app.revision?.art_direction_status === 'approved' ? '채택한 기본안' : '외형 검토 대기';
  lab.show(rigMode);
  planB.show(planBMode);
  if (rigMode && !labInitialized) { labInitialized=true; lab.init(); }
  if (updateUrl) {
    const [route,query] = location.hash.split('?');const params=new URLSearchParams(query||'');
    if (planBMode) planB.writeParams(params);
    else { params.delete('plan'); params.delete('study'); params.delete('pixelView'); if(rigMode)params.set('motion',lab.mode);else params.delete('motion'); }
    history.replaceState(null,'',`${location.pathname}${location.search}${route}${params.size?'?'+params:''}`);
  }
  if (!rigMode && !planBMode) fitArt();
}
$('mode-reference').addEventListener('click',()=>setPreviewMode('reference'));
$('mode-rig').addEventListener('click',()=>setPreviewMode('rig'));
$('mode-plan-b').addEventListener('click',()=>setPreviewMode('plan-b'));
const app = { entries: [], entry: null, revision: null, view: 'sheet', zoom: 1 };
const labels = { character: '캐릭터', weapon: '무기', enemy: '적' };
const viewLabels = { front: '정면', back: '후면', left: '좌측면', right: '우측면', side: '측면' };

function assetUrl(path) {
  if (typeof path !== 'string' || !path.startsWith('art/') || path.includes('..') || path.includes('\\')) throw new Error('등록된 아트 경로가 올바르지 않습니다.');
  return '/' + path.split('/').map(encodeURIComponent).join('/');
}

function fitArt() {
  const stage = $('art-stage');
  const preview = app.revision?.preview;
  const columns = stage.clientWidth < 640 ? 2 : 4;
  $('art-frame').style.setProperty('--turnaround-columns', columns);
  const ratio = preview?.images
    ? app.view === 'sheet' ? columns * preview.width / (Math.ceil(Object.keys(preview.images).length / columns) * (preview.height + 64)) : preview.width / preview.height
    : app.view === 'sheet' ? (preview?.width || 1536) / (preview?.height || 1024) : .75;
  const base = Math.min(Math.max(220, stage.clientWidth - 32), Math.max(260, stage.clientHeight - 40) * ratio);
  $('art-frame').style.width = `${base * app.zoom}px`;
  $('art-frame').style.height = `${base * app.zoom / ratio}px`;
  $('zoom-value').value = `${Math.round(app.zoom * 100)}%`;
  $('zoom-out').disabled = app.zoom <= .75;
  $('zoom-in').disabled = app.zoom >= 2;
}

function writeArtUrl() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  params.set('rev', app.revision.revision_id);
  if (app.view === 'sheet') params.delete('view'); else params.set('view', app.view);
  const group = { character: 'characters', weapon: 'weapons', enemy: 'enemies' }[app.entry.kind];
  history.replaceState(null, '', `${location.pathname}${location.search}#/samples/${group}/${app.entry.entity_id}?${params}`);
}

function renderArt() {
  const preview = app.revision.preview;
  const gallery = Boolean(preview.images && app.view === 'sheet');
  $('art-frame').dataset.view = app.view;
  $('art-frame').dataset.layout = preview.images ? 'separate' : 'legacy';
  $('turnaround-grid').hidden = !gallery;
  $('character-art').hidden = true;
  $('image-loading').hidden = gallery;
  $('image-loading').textContent = '외형 시안을 불러오는 중…';
  const path = preview.images?.[app.view]?.image_path || preview.image_path;
  if (!gallery) {
    $('character-art').alt = `${app.entry.display_name} · ${app.revision.display_name}${viewLabels[app.view] ? ' · ' + viewLabels[app.view] : ''}`;
    $('character-art').src = assetUrl(path);
    if ($('character-art').complete && $('character-art').naturalWidth) {
      $('image-loading').hidden = true;
      $('character-art').hidden = false;
    }
  }
  $('original-link').href = assetUrl(path);
  $('original-link').textContent = gallery ? '정면 원본 보기 ↗' : '원본 보기 ↗';
  $('image-dimensions').textContent = `${gallery ? Object.keys(preview.images).length + '장 · ' : ''}${preview.width} × ${preview.height} · PNG`;
  document.querySelectorAll('button[data-view]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === app.view)));
  fitArt();
}

function noteKey() { return `dear-human:review:${app.entry?.entity_id}:${app.revision?.revision_id}`; }
function loadNote() {
  try { $('review-note').value = localStorage.getItem(noteKey()) || ''; $('note-status').textContent = '이 브라우저에만 저장'; }
  catch { $('review-note').value = ''; $('note-status').textContent = '메모 내보내기 사용'; }
}

function setRevision(id, updateUrl = true) {
  const revision = app.entry.revisions.find((item) => item.revision_id === id);
  if (!revision?.preview?.image_path) throw new Error('이 버전의 외형 이미지가 없습니다.');
  app.revision = revision;
  app.zoom = 1;
  const separateViews = revision.preview.images;
  const hasTurnaround = revision.preview.views?.includes('right_profile');
  if (separateViews ? app.view !== 'sheet' && !separateViews[app.view] : !hasTurnaround || !['sheet', 'front', 'side'].includes(app.view)) app.view = 'sheet';
  document.querySelectorAll('button[data-view]').forEach((button) => {
    const view = button.dataset.view;
    button.hidden = separateViews ? view !== 'sheet' && !separateViews[view] : ['back', 'left', 'right'].includes(view);
    button.disabled = view !== 'sheet' && !separateViews && !hasTurnaround;
    button.title = button.disabled ? '정면/측면 별도 원화는 아직 없습니다.' : '';
  });
  $('turnaround-grid').replaceChildren(...Object.entries(separateViews || {}).map(([view, image]) => {
    const figure = document.createElement('figure');
    const link = Object.assign(document.createElement('a'), { href: assetUrl(image.image_path), target: '_blank', rel: 'noopener' });
    link.append(Object.assign(document.createElement('img'), { src: assetUrl(image.image_path), alt: `${app.entry.display_name} · ${viewLabels[view]}`, decoding: 'async' }));
    const caption = document.createElement('figcaption'); caption.textContent = `${viewLabels[view]} ↗`;
    figure.append(link, caption); return figure;
  }));
  $('revision-select').value = id;
  $('revision-caption').textContent = `${revision.display_name} · 정적 외형 시안`;
  $('review-state').textContent = revision.art_direction_status === 'approved' ? '채택한 기본안' : revision.art_direction_status === 'awaiting_user_review' ? '새 기준 · 외형 검토' : '이전 시안';
  $('direction-copy').textContent = revision.description || '캐릭터 외형을 검토하기 위한 기준화입니다.';
  if (Array.isArray(revision.appearance_specs)) {
    $('character-specs').replaceChildren(...revision.appearance_specs.map(([label, value]) => {
      const row = document.createElement('div');
      const term = document.createElement('dt'); term.textContent = label;
      const definition = document.createElement('dd'); definition.textContent = value;
      row.append(term, definition); return row;
    }));
  }
  if (Array.isArray(revision.palette)) {
    document.querySelectorAll('.palette .swatch').forEach((swatch, index) => {
      const color = revision.palette[index];
      swatch.hidden = !color;
      if (color && /^#[0-9a-f]{6}$/i.test(color.hex)) { swatch.style.backgroundColor = color.hex; swatch.title = color.label; }
    });
  }
  $('revision-notes').replaceChildren(...(revision.review_notes || []).map((note) => { const li = document.createElement('li'); li.textContent = note; return li; }));
  loadNote();
  if (updateUrl) writeArtUrl();
  renderArt();
}

function showRoute() {
  lab.show(false);
  planB.show(false);
  try {
    const [route, query] = location.hash.slice(1).split('?');
    const parts = (route || '/samples').split('/').filter(Boolean);
    const kind = parts[1] === 'weapons' ? 'weapon' : parts[1] === 'enemies' ? 'enemy' : 'character';
    const id = parts[2] || 'clone_01';
    app.entry = app.entries.find((entry) => entry.kind === kind && entry.entity_id === id);
    if (!app.entry) throw new Error('등록되지 않은 샘플입니다. 왼쪽 목록에서 대상을 선택해 주세요.');
    $('error').hidden = true;
    const entry = app.entry;
    $('mode-plan-b').hidden = kind !== 'character' || id !== 'clone_01';
    const hasArt = entry.revisions.some((revision) => revision.preview?.image_path);
    $('workspace').hidden = !hasArt;
    $('empty-state').hidden = hasArt;
    $('entity-title').replaceChildren(document.createTextNode(entry.display_name), Object.assign(document.createElement('span'), { className: 'title-dot', textContent: '.' }));
    $('breadcrumb').textContent = labels[kind];
    $('eyebrow').textContent = `${kind.toUpperCase()} / ${entry.entity_id.toUpperCase().replaceAll('_', ' ')}`;
    $('subtitle').textContent = hasArt ? kind === 'weapon' ? '본체·탄창과 공통 캐릭터의 장착 모션을 확인하세요.' : '첨부 기준 캐릭터와 3D 렌더 질감의 외형을 확인하세요.' : '이 대상의 아트와 모션은 제작 예정입니다.';
    $('mode-reference').textContent = kind === 'weapon' ? '무기 파츠' : '채택 외형';
    $('direction-heading').textContent = kind === 'weapon' ? 'M16 · 분리형 무기.' : '차갑고, 도도하게.';
    $('review-state').textContent = hasArt ? '외형 검토 대기' : '제작 예정';
    document.querySelectorAll('[data-nav]').forEach((link) => link.classList.toggle('current', link.dataset.nav === kind));
    if (!hasArt) { $('empty-title').textContent = `${entry.display_name}은 아직 제작하지 않았습니다.`; return; }
    const revisions = entry.revisions.filter((revision) => revision.preview?.image_path).toReversed();
    $('revision-select').disabled = revisions.length < 2;
    $('revision-select').replaceChildren(...revisions.map((revision) => Object.assign(document.createElement('option'), { value: revision.revision_id, textContent: `${revision.display_name}${revision.art_direction_status === 'approved' ? ' · 채택' : revision.art_direction_status === 'awaiting_user_review' ? ' · 현재' : ' · 이전'}` })));
    const requested = new URLSearchParams(query || '').get('rev');
    const current = revisions.some((revision) => revision.revision_id === requested) ? requested : entry.review_revision_id || entry.selected_revision_id || revisions[0].revision_id;
    app.view = new URLSearchParams(query || '').get('view') || 'sheet';
    setRevision(current, Boolean(requested && requested !== current));
    const labParams = new URLSearchParams(query || '');
    const motion = labParams.get('motion');
    if (motion && Object.hasOwn(MOTIONS,motion)) lab.setMode(motion,{immediate:true,updateUrl:false});
    if (labParams.get('debug') === '1') { lab.options.debug=true; $('rig-debug').checked=true; }
    if (labParams.get('mesh') === '1') { lab.options.mesh=true; $('rig-mesh').checked=true; }
    lab.restoreMotionParams(labParams);
    lab.setCameraPitch(labParams.has('viewPitch')?Number(labParams.get('viewPitch')):undefined,{updateUrl:false});
    const weapon = labParams.get('weapon');
    if (weapon && ['m16_basic','diagnostic'].includes(weapon)) { lab.rig.equip(weapon); $('rig-weapon').value=weapon; }
    if (motion === 'reload' || motion === 'reload_empty') { lab.setMode('idle'); lab.rig.ammo=motion==='reload_empty'?0:15; lab.rig.startReload(); }
    if (labParams.get('face') === 'left' && lab.rig.facing !== -1) lab.rig.turn();
    const sampleTime = Number(labParams.get('time'));
    if (Number.isFinite(sampleTime) && sampleTime > 0 && sampleTime <= 10) {
      lab.rig.trigger=!!MOTIONS[motion]?.fire;
      for (let remaining=sampleTime; remaining>1e-8; remaining-=1/60) lab.rig.advance(Math.min(remaining,1/60));
    }
    lab.paused=labParams.get('paused')==='1'; $('rig-pause').textContent=lab.paused?'재생':'일시정지';
    setPreviewMode(labParams.get('plan') === 'b' && kind === 'character' && id === 'clone_01' ? 'plan-b' : motion ? 'rig' : 'reference',false);
  } catch (error) { $('error').textContent = error.message; $('error').hidden = false; $('workspace').hidden = true; $('empty-state').hidden = true; }
}

$('character-art').addEventListener('load', () => { $('image-loading').hidden = true; $('character-art').hidden = Boolean(app.revision?.preview?.images && app.view === 'sheet'); fitArt(); });
$('character-art').addEventListener('error', () => { $('image-loading').textContent = '이미지를 불러오지 못했습니다. 등록 파일을 확인해 주세요.'; });
$('revision-select').addEventListener('change', (event) => { try { setRevision(event.target.value); } catch (error) { $('error').textContent = error.message; $('error').hidden = false; } });
document.querySelectorAll('button[data-view]').forEach((button) => button.addEventListener('click', () => {
  app.view = button.dataset.view; app.zoom = 1;
  renderArt(); writeArtUrl();
}));
document.querySelectorAll('[data-bg]').forEach((button) => button.addEventListener('click', () => {
  $('art-stage').className = `art-stage bg-${button.dataset.bg}`;
  document.querySelectorAll('[data-bg]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
}));
$('zoom-in').addEventListener('click', () => { app.zoom = Math.min(2, app.zoom + .25); fitArt(); });
$('zoom-out').addEventListener('click', () => { app.zoom = Math.max(.75, app.zoom - .25); fitArt(); });
$('zoom-reset').addEventListener('click', () => { app.zoom = 1; fitArt(); });
$('review-note').addEventListener('input', () => { try { localStorage.setItem(noteKey(), $('review-note').value); $('note-status').textContent = '브라우저에 저장됨'; } catch { $('note-status').textContent = '메모 내보내기 사용'; } });
$('export-note').addEventListener('click', () => {
  const report = { entity_id: app.entry.entity_id, revision_id: app.revision.revision_id, reviewed_at: new Date().toISOString(), note: $('review-note').value, adoption: 'not_recorded' };
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: `${app.entry.entity_id}_${app.revision.revision_id}_review.json` });
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
window.addEventListener('hashchange', showRoute);
new ResizeObserver(fitArt).observe($('art-stage'));
try {
  const response = await fetch('assets/catalog/asset_index.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('샘플 목록을 불러오지 못했습니다.');
  const catalog = await response.json();
  if (catalog.schema_version !== 1 || !Array.isArray(catalog.entries)) throw new Error('샘플 목록 형식이 맞지 않습니다.');
  app.entries = catalog.entries; showRoute();
} catch (error) { $('error').hidden = false; $('error').textContent = error.message; $('workspace').hidden = true; }
