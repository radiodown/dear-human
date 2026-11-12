import { RigLab, MOTIONS } from './rig-lab.js';
import { PlanBLab } from './plan-b-lab.js';
import { PartsV2Lab } from './parts-v2-lab.js';
import { PlanFLab } from './plan-f/index.js';
import { PlanELab } from './plan-e-lab.js';
import { GlbModelLab, MODELS as GLB_MODELS } from './glb-model-lab.js';
import { GlbSpriteLab, SPRITE_MODELS } from './glb-sprite-lab.js';
import { WeaponModelLab } from './weapon-model-lab.js';
const $ = (id) => document.getElementById(id);
const lab = new RigLab();
const planB = new PlanBLab();
const partsV2 = new PartsV2Lab();
const planE = new PlanELab();
const planF = new PlanFLab();
const glb = new GlbModelLab();
const glbSprite = new GlbSpriteLab();
const weapon3d = new WeaponModelLab();
let labInitialized = false;
const motionPreviews = [
  { mode: 'rig', label: '플랜 A · 파츠 실시간', query: 'motion=idle' },
  { mode: 'rig-v2', label: '플랜 A · 파츠 V2', query: 'plan=parts-v2&motion=walk' },
  { mode: 'plan-b', label: '플랜 B · 도트 원화·모션', query: 'plan=b' },
  { mode: 'plan-f', label: '플랜 F · 코드 생성', query: 'plan=f' },
  { mode: 'plan-e', label: '플랜 E · 3D→도트', query: 'plan=e' },
  { mode: 'glb', label: 'GLB · 3D 모델', query: 'plan=glb' },
  { mode: 'glb-sprite', label: 'GLB · 2D 스프라이트', query: 'plan=glb-sprite' },
];
function setPreviewMode(mode, updateUrl=true) {
  if (mode === 'rig' && !app.entry?.capabilities?.some(value => ['webgl_rig', 'rig_mount'].includes(value))) mode = 'reference';
  const rigMode = mode === 'rig';
  const planBMode = mode === 'plan-b';
  const v2Mode = mode === 'rig-v2';
  const planEMode = mode === 'plan-e';
  const planFMode = mode === 'plan-f';
  const glbMode = mode === 'glb';
  const glbSpriteMode = mode === 'glb-sprite';
  const weaponMode = mode === 'weapon-3d';
  $('reference-view').hidden = rigMode || planBMode || v2Mode || planEMode || planFMode || glbMode || glbSpriteMode || weaponMode; $('rig-view').hidden = !rigMode;
  $('rig-v2-view').hidden = !v2Mode;
  $('plan-b-view').hidden = !planBMode;
  $('plan-e-view').hidden = !planEMode;
  $('plan-f-view').hidden = !planFMode;
  $('mode-plan-f').setAttribute('aria-pressed', String(planFMode));
  $('glb-view').hidden = !glbMode;
  $('glb-sprite-view').hidden = !glbSpriteMode;
  $('weapon-3d-view').hidden = !weaponMode;
  $('mode-reference').setAttribute('aria-pressed', String(!rigMode && !planBMode && !v2Mode && !planEMode && !planFMode && !glbMode && !glbSpriteMode && !weaponMode));
  $('mode-weapon-3d').setAttribute('aria-pressed', String(weaponMode));
  $('mode-plan-e').setAttribute('aria-pressed', String(planEMode));
  $('mode-glb').setAttribute('aria-pressed', String(glbMode));
  $('mode-glb-sprite').setAttribute('aria-pressed', String(glbSpriteMode));
  $('mode-rig').setAttribute('aria-pressed', String(rigMode));
  $('mode-plan-b').setAttribute('aria-pressed', String(planBMode));
  $('mode-rig-v2').setAttribute('aria-pressed', String(v2Mode));
  updateSampleSelection(mode);
  $('review-state').textContent = planFMode ? '플랜 F · 자세·반동 003' : weaponMode ? '무기 · 3D 모델 시험' : glbSpriteMode ? 'GLB · 2D 스프라이트 시험' : glbMode ? '3D 모델 · GLB 재생 시험' : planEMode ? '플랜 E · 3D→도트 실험' : v2Mode ? '파츠 모션 V2 · 프레임 초안' : planBMode ? '플랜 B · 도트 시도 검토' : app.revision?.art_direction_status === 'approved' ? '채택한 기본안' : '외형 검토 대기';
  lab.show(rigMode);
  planB.show(planBMode);
  partsV2.show(v2Mode);
  planE.show(planEMode);
  planF.show(planFMode);
  glb.show(glbMode);
  glbSprite.show(glbSpriteMode);
  weapon3d.show(weaponMode);
  if (rigMode && !labInitialized) { labInitialized=true; lab.init(); }
  if (updateUrl) {
    const [route,query] = location.hash.split('?');const params=new URLSearchParams(query||'');
    if (planFMode) planF.writeParams(params);
    else if (weaponMode) weapon3d.writeParams(params);
    else if (glbSpriteMode) glbSprite.writeParams(params);
    else if (glbMode) glb.writeParams(params);
    else if (planEMode) planE.writeParams(params);
    else if (v2Mode) partsV2.writeParams(params);
    else {
    if(['parts-v2','e','glb','glb-sprite','weapon-3d'].includes(params.get('plan')))for(const key of ['frame','fps','loop','paused','face','viewPitch','clip','scale','version','speed','inPlace','weapon3d','sockets','spin','bg','real','loadout'])params.delete(key);
    if (planBMode) planB.writeParams(params);
    else { params.delete('plan'); params.delete('study'); params.delete('pixelView'); if(rigMode)params.set('motion',lab.mode);else params.delete('motion'); }
    }
    history.replaceState(null,'',`${location.pathname}${location.search}${route}${params.size?'?'+params:''}`);
  }
  if (!rigMode && !planBMode && !v2Mode && !planEMode && !planFMode && !glbMode && !glbSpriteMode && !weaponMode) fitArt();
}
$('mode-reference').addEventListener('click',()=>setPreviewMode('reference'));
$('mode-rig').addEventListener('click',()=>setPreviewMode('rig'));
$('mode-rig-v2').addEventListener('click',()=>setPreviewMode('rig-v2'));
$('mode-plan-b').addEventListener('click',()=>setPreviewMode('plan-b'));
$('mode-plan-f').addEventListener('click',()=>setPreviewMode('plan-f'));
$('mode-plan-e').addEventListener('click',()=>setPreviewMode('plan-e'));
$('mode-glb').addEventListener('click',()=>setPreviewMode('glb'));
$('mode-glb-sprite').addEventListener('click',()=>setPreviewMode('glb-sprite'));
$('mode-weapon-3d').addEventListener('click',()=>setPreviewMode('weapon-3d'));
const app = { entries: [], entry: null, revision: null, view: 'sheet', zoom: 1 };
const labels = { character: '캐릭터', weapon: '무기', enemy: '적' };
const viewLabels = { front: '정면', back: '후면', left: '좌측면', right: '우측면', side: '측면' };

function updateSampleSelection(mode = 'reference') {
  const entry = app.entry;
  if (!entry) return;
  const preview = entry.entity_id === 'clone_01' ? motionPreviews.find(item => item.mode === mode) : null;
  document.querySelectorAll('[data-nav], [data-preview]').forEach(link => {
    const current = link.dataset.preview
      ? link.dataset.preview === preview?.mode
      : !preview && link.dataset.nav === entry.kind && link.dataset.entity === entry.entity_id;
    link.classList.toggle('current', current);
    if (current) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  const motionMenu = document.querySelector('.motion-nav');
  motionMenu.classList.toggle('has-current', Boolean(preview));
  if (preview) motionMenu.open = true;
  $('breadcrumb').textContent = preview ? `모션 테스트 / ${preview.label}` : `${labels[entry.kind]} / ${entry.display_name}`;
  $('entity-title').replaceChildren(document.createTextNode(preview ? '모션 테스트' : entry.display_name), Object.assign(document.createElement('span'), { className: 'title-dot', textContent: '.' }));
  document.title = `${preview ? preview.label + ' · 모션 테스트' : entry.display_name + ' · 샘플 라이브러리'} — Dear Human`;
  if (preview) {
    $('eyebrow').textContent = 'MOTION TEST / LIAN';
    $('subtitle').textContent = `${preview.label} · 리안의 준비된 원화와 동작을 확인하세요.`;
  } else if (entry.entity_id === 'clone_01') {
    $('eyebrow').textContent = 'LIAN / CL-VS-13-047';
    $('subtitle').textContent = '리안의 기준 원화와 파츠·도트·3D 미리보기를 확인하세요.';
  }
}

function renderSampleNav() {
  const nav = document.querySelector('nav[aria-label="샘플 목록"]');
  const groups = [
    { kind: 'character', route: 'characters', label: '캐릭터', icon: '◈' },
    { kind: 'motion' },
    { kind: 'enemy', route: 'enemies', label: '적 · 토착 생물', icon: '◇' },
    { kind: 'weapon', route: 'weapons', label: '무기', icon: '◆' },
  ];
  let count = 0;
  nav.replaceChildren();
  for (const group of groups) {
    if (group.kind === 'motion') {
      const section = document.createElement('details');
      section.className = 'nav-group motion-nav';
      section.open = true;
      const heading = document.createElement('summary');
      heading.className = 'nav-group-heading';
      heading.textContent = '모션 테스트';
      const total = document.createElement('small');
      total.textContent = String(motionPreviews.length).padStart(2, '0');
      heading.append(total);
      const submenu = document.createElement('div');
      submenu.className = 'nav-submenu';
      submenu.setAttribute('role', 'group');
      submenu.setAttribute('aria-label', '플랜별 모션 테스트');
      for (const preview of motionPreviews) {
        const link = document.createElement('a');
        link.className = 'nav-item nav-subitem';
        link.href = `#/samples/characters/clone_01?${preview.query}`;
        link.dataset.preview = preview.mode;
        link.textContent = preview.label;
        submenu.append(link);
      }
      section.append(heading, submenu);
      nav.append(section);
      count += motionPreviews.length;
      continue;
    }
    const entries = app.entries.filter(entry => entry.kind === group.kind);
    if (!entries.length) continue;
    const section = document.createElement('section');
    section.className = 'nav-group';
    const heading = document.createElement('h2');
    heading.className = 'nav-group-heading';
    heading.id = `nav-${group.kind}-heading`;
    heading.textContent = group.label;
    const total = document.createElement('small');
    total.textContent = String(entries.length).padStart(2, '0');
    heading.append(total);
    section.setAttribute('aria-labelledby', heading.id);
    section.append(heading);
    for (const entry of entries) {
      const link = document.createElement('a');
      link.className = 'nav-item';
      link.href = `#/samples/${group.route}/${encodeURIComponent(entry.entity_id)}${group.kind === 'weapon' && entry.capabilities?.includes('rig_mount') ? '?motion=idle' : ''}`;
      link.dataset.nav = group.kind;
      link.dataset.entity = entry.entity_id;
      const icon = document.createElement('span');
      icon.textContent = group.icon;
      icon.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span');
      name.className = 'nav-item-name';
      name.textContent = entry.display_name;
      const badge = document.createElement('small');
      const hasArt = entry.revisions.some(revision => revision.preview?.image_path);
      badge.textContent = !hasArt ? '예정' : entry.entity_id === 'clone_01' ? '047' : group.kind === 'weapon' ? '시험' : '시안';
      link.append(icon, name, badge);
      section.append(link);
    }
    nav.append(section);
    count += entries.length;
  }
  $('sample-count').textContent = String(count).padStart(2, '0');
}

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
  partsV2.show(false);
  planE.show(false);
  planF.show(false);
  glb.show(false);
  glbSprite.show(false);
  try {
    const [route, query] = location.hash.slice(1).split('?');
    const parts = (route || '/samples').split('/').filter(Boolean);
    const kind = parts[1] === 'weapons' ? 'weapon' : parts[1] === 'enemies' ? 'enemy' : 'character';
    const id = parts[2] || 'clone_01';
    app.entry = app.entries.find((entry) => entry.kind === kind && entry.entity_id === id);
    if (!app.entry) throw new Error('등록되지 않은 샘플입니다. 왼쪽 목록에서 대상을 선택해 주세요.');
    $('error').hidden = true;
    const entry = app.entry;
    const rigAvailable = entry.capabilities?.some(value => ['webgl_rig', 'rig_mount'].includes(value));
    const conceptOnly = entry.capabilities?.includes('concept_image') && !rigAvailable;
    $('mode-rig').hidden = !rigAvailable;
    $('mode-plan-b').hidden = kind !== 'character' || id !== 'clone_01';
    $('mode-rig-v2').hidden = kind !== 'character' || id !== 'clone_01';
    $('mode-plan-f').hidden = kind !== 'character' || id !== 'clone_01';
    $('mode-plan-e').hidden = kind !== 'character' || id !== 'clone_01';
    const glbAvailable = ['character', 'enemy'].includes(kind) && Object.hasOwn(GLB_MODELS, id);
    glb.configure(glbAvailable ? id : 'clone_01');
    $('mode-glb').hidden = !glbAvailable;
    const spriteAvailable = ['character', 'enemy'].includes(kind) && Object.hasOwn(SPRITE_MODELS, id);
    glbSprite.configure(spriteAvailable ? id : 'clone_01');
    $('mode-glb-sprite').hidden = !spriteAvailable;
    $('mode-weapon-3d').hidden = kind !== 'weapon';
    if (kind === 'weapon') weapon3d.configure(id);
    document.querySelectorAll('.preview-group').forEach(group => {
      group.hidden = ![...group.querySelectorAll('button')].some(button => !button.hidden);
    });
    const hasArt = entry.revisions.some((revision) => revision.preview?.image_path);
    $('workspace').hidden = !hasArt;
    $('empty-state').hidden = hasArt;
    $('entity-title').replaceChildren(document.createTextNode(entry.display_name), Object.assign(document.createElement('span'), { className: 'title-dot', textContent: '.' }));
    $('breadcrumb').textContent = `${labels[kind]} / ${entry.display_name}`;
    $('eyebrow').textContent = id === 'clone_01' ? 'LIAN / CL-VS-13-047' : `${kind.toUpperCase()} / ${entry.entity_id.toUpperCase().replaceAll('_', ' ')}`;
    document.title = `${entry.display_name} · 샘플 라이브러리 — Dear Human`;
    $('subtitle').textContent = hasArt ? kind === 'weapon' ? (rigAvailable ? '본체·탄창과 리안의 장착 모션을 확인하세요.' : '위키 무기 원화와 3D 모델을 확인하세요.') : kind === 'enemy' ? '베스퍼 토착 크리처의 원화와 앞뒤좌우 시안을 확인하세요.' : id === 'clone_01' ? '리안의 기준 원화와 파츠·도트·3D 미리보기를 확인하세요.' : `${entry.display_name}의 원화와 버전별 시안을 확인하세요.` : '이 대상의 아트와 모션은 제작 예정입니다.';
    $('mode-reference').textContent = conceptOnly ? (kind === 'weapon' ? '위키 원화' : '일러스트 시안') : kind === 'weapon' ? '무기 파츠' : '채택 외형';
    $('direction-heading').textContent = kind === 'weapon' ? (rigAvailable ? 'M16 · 분리형 무기.' : `${entry.display_name} · 무기.`) : conceptOnly ? `${entry.display_name} · 콘셉트 시안.` : '차갑고, 도도하게.';
    $('review-state').textContent = hasArt ? '외형 검토 대기' : '제작 예정';
    updateSampleSelection();
    if (!hasArt) { $('empty-title').textContent = `${entry.display_name}은 아직 제작하지 않았습니다.`; return; }
    const revisions = entry.revisions.filter((revision) => revision.preview?.image_path).toReversed();
    $('revision-select').disabled = revisions.length < 2;
    $('revision-select').replaceChildren(...revisions.map((revision) => Object.assign(document.createElement('option'), { value: revision.revision_id, textContent: `${revision.display_name}${revision.art_direction_status === 'approved' ? ' · 채택' : revision.art_direction_status === 'awaiting_user_review' ? ' · 현재' : ' · 이전'}` })));
    const requested = new URLSearchParams(query || '').get('rev');
    const current = revisions.some((revision) => revision.revision_id === requested) ? requested : entry.review_revision_id || entry.selected_revision_id || revisions[0].revision_id;
    app.view = new URLSearchParams(query || '').get('view') || 'sheet';
    setRevision(current, Boolean(requested && requested !== current));
    const labParams = new URLSearchParams(query || '');
    if(labParams.get('plan')==='parts-v2'&&kind==='character'&&id==='clone_01'){
      partsV2.restoreParams(labParams);setPreviewMode('rig-v2',false);return;
    }
    if(labParams.get('plan')==='f'&&kind==='character'&&id==='clone_01'){setPreviewMode('plan-f',false);return;}
    if(labParams.get('plan')==='e'&&kind==='character'&&id==='clone_01'){
      planE.restoreParams(labParams);setPreviewMode('plan-e',false);return;
    }
    if(labParams.get('plan')==='glb'&&glbAvailable){
      glb.restoreParams(labParams);setPreviewMode('glb',false);return;
    }
    if(labParams.get('plan')==='weapon-3d'&&kind==='weapon'){
      weapon3d.restoreParams(labParams);setPreviewMode('weapon-3d',false);return;
    }
    if(labParams.get('plan')==='glb-sprite'&&spriteAvailable){
      glbSprite.restoreParams(labParams);setPreviewMode('glb-sprite',false);return;
    }
    const motion = rigAvailable ? labParams.get('motion') : null;
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
  app.entries = catalog.entries;
  renderSampleNav();
  showRoute();
} catch (error) { $('error').hidden = false; $('error').textContent = error.message; $('workspace').hidden = true; }
