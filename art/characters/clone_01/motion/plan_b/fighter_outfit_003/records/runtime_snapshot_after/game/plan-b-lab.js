import { FrameSequence } from './animation/frame-sequence.js';
const $ = id => document.getElementById(id);
const PIXEL_ROOT = '/art/characters/clone_01/motion/plan_b/pixel_walk_003';
const WALK_ROOT = '/art/characters/clone_01/motion/plan_b/pixel_walk_005';
const PREVIOUS_WALK_ROOT = '/art/characters/clone_01/motion/plan_b/pixel_walk_004';
const COMBAT_ROOT = '/art/characters/clone_01/motion/plan_b/pixel_combat_006';
const GUARD_ROOT = '/art/characters/clone_01/motion/plan_b/pixel_guard_007';
const PITCH30_ROOT = '/art/characters/clone_01/motion/plan_b/camera_pitch30_001';
const FIGHTER_ROOT = '/art/characters/clone_01/motion/plan_b/fighter_view_002';
const OUTFIT_ROOT = '/art/characters/clone_01/motion/plan_b/fighter_outfit_003';
const CAMERA_STUDIES = {
  'camera-outfit': {
    root: OUTFIT_ROOT, query: 'fighter_outfit_003', title: '격투게임식 의상 보완',
    alt: '격투게임식 약 12도 시점에서 일러스트의 회색 흉갑 인셋·벨트·파우치·겹친 장갑 스커트를 보완한 플랜 B 기준 이미지',
    note: '기준 일러스트의 흉갑 인셋·몸통 스트랩·허리 벨트와 파우치·겹친 장갑 스커트를 보완했습니다. 약 12°의 얕은 내려보기와 오른쪽 조준 자세를 이어가는 정지 기준이며 모션은 아직 제작하지 않았습니다.',
    comparison: '기준 일러스트와 의상 비교', reference: '/art/characters/clone_01/concepts/reference_003_3d/source/appearance.png',
    referenceLabel: '채택 일러스트 · 몸통과 장갑 하의', caption: '보완 · 흉갑/벨트/장갑 스커트', comparisonKind: 'outfit',
  },
  'camera-pitch30': {
    root: PITCH30_ROOT, query: 'camera_pitch30_001', title: '30° 내려보기 기준',
    alt: '오른쪽을 조준하는 경계 자세를 약 30도 위에서 내려다본 플랜 B 도트 기준 이미지',
    note: '같은 경계 자세를 약 30° 위에서 내려다보는 시점 초안입니다. 정수리·어깨·M16의 윗면과 양발의 깊이를 확인하세요. 시점 확인용 정지 이미지이며 동작은 아직 제작하지 않았습니다.',
    comparison: '정측면과 30° 내려보기 비교', reference: `${GUARD_ROOT}/source/baseline.png`,
    referenceLabel: '기존 경계 자세 · 정측면', caption: '30° 내려보기 · 시점 초안',
  },
  'camera-fighter': {
    root: FIGHTER_ROOT, query: 'fighter_view_002', title: '격투게임식 12° 기준',
    alt: '약 12도 내려보기와 카메라 쪽으로 조금 튼 몸으로 얼굴·흉갑·양팔이 보이는 플랜 B 도트 기준 이미지',
    note: '내려보기는 약 12°로 낮추고 몸을 카메라 쪽으로 조금 틀어 얼굴·흉갑·양팔을 보여 주는 시점 초안입니다. 총과 시선은 오른쪽을 향합니다. 시점 확인용 정지 이미지이며 동작은 아직 제작하지 않았습니다.',
    comparison: '30°와 격투게임식 시점 비교', reference: `${PITCH30_ROOT}/output/baseline.png`,
    referenceLabel: '이전 · 30° 내려보기', caption: '수정 · 약 12° + 몸 틀기',
  },
};
const DEFAULT_STUDY = 'guard-walk';
const firingOptions = study => {
  const manifest = root => `${root}/output/manifest.json`;
  if (['guard-walk', 'guard-fire'].includes(study)) return {kind: 'walking', baseUrl: manifest(`${GUARD_ROOT}/walk`), fireUrl: manifest(`${GUARD_ROOT}/walk_fire`)};
  if (['pixel-walk', 'walk-fire'].includes(study)) return {kind: 'walking', baseUrl: manifest(WALK_ROOT), fireUrl: manifest(`${COMBAT_ROOT}/walk_fire`)};
  if (study === 'kneel-fire') return {kind: 'stationary', baseUrl: manifest(`${COMBAT_ROOT}/kneel_fire`), fireUrl: manifest(`${COMBAT_ROOT}/kneel_fire`)};
  return null;
};
const COMBAT = {
  'guard-walk': {
    study: 'guard_007', motion: 'walk', root: `${GUARD_ROOT}/walk`, title: '도트 007 · 경계 걷기',
    reviewFrames: [5, 11], reviewLabels: ['밝은 다리 지지 · 교차', '어두운 다리 지지 · 교차'],
    comparisonPath: `${GUARD_ROOT}/reviews/posture-before-after.png`, comparisonLabel: '이전·경계 자세 비교 ↗',
    note: '골반에서 상체를 앞으로 기울이고 무릎을 낮춘 경계 보행입니다. 고개와 시선은 앞을 보고 총신은 거의 수평을 유지합니다. 밝은 전경 다리와 어두운 후경 다리의 교차·지지 교대는 유지하며 최종 아트 검수는 대기입니다.',
  },
  'guard-fire': {
    study: 'guard_007', motion: 'walk_fire', root: `${GUARD_ROOT}/walk_fire`, title: '도트 007 · 경계 이동 사격',
    reviewFrames: [2, 8], reviewLabels: ['낮은 첫 보폭 · 발사', '반대 보폭 · 발사'],
    comparisonPath: `${GUARD_ROOT}/reviews/posture-before-after.png`, comparisonLabel: '이전·경계 자세 비교 ↗',
    note: '앞으로 숙인 낮은 경계 자세를 유지하며 걸어서 쏩니다. 반동에서도 상체가 곧게 펴지지 않도록 하고, 전방 조준·양발 교차와 어깨·머리·망토의 반응을 함께 표현했습니다. 최종 아트 검수 대기입니다.',
  },
  'walk-fire': {
    motion: 'walk_fire', root: `${COMBAT_ROOT}/walk_fire`, title: '도트 006 · 이동 사격',
    reviewFrames: [2, 8], reviewLabels: ['첫 보폭 · 발사 반동', '반대 보폭 · 발사 반동'],
    note: '몸을 앞으로 기울인 전투 보행에 어깨·흉곽 반동과 머리·망토의 지연 반응을 더했습니다. 밝은 전경 다리와 어두운 후경 다리가 교차하며, 두 발사 자세를 멈춰 비교할 수 있습니다. 최종 아트 검수 대기입니다.',
  },
  'kneel-fire': {
    motion: 'kneel_fire', root: `${COMBAT_ROOT}/kneel_fire`, title: '도트 006 · 앉아쏴',
    reviewFrames: [5, 11], reviewLabels: ['첫 발 · 앉아쏴 반동', '다음 발 · 앉아쏴 반동'],
    note: '무릎과 앞발로 낮게 지지하고 볼·어깨를 개머리판에 붙여 쏩니다. 발사 순간의 상체 밀림과 견착 복귀, 바닥 망토·머리 끝의 뒤늦은 반응을 함께 확인할 수 있습니다. 최종 아트 검수 대기입니다.',
  },
};
export class PlanBLab {
  constructor() {
    this.visible = false;
    this.study = DEFAULT_STUDY;
    this.player = new FrameSequence($('plan-b-canvas'), (index, state) => {
      $('plan-b-frame').value = index;
      const reference = !state.input || state.preview ? this.player.manifest?.referenceFrameIndices?.includes(index) : false;
      const shot = state.input && !state.preview ? state.phase === 'shot' : this.player.manifest?.shotIndices?.includes(index);
      $('plan-b-counter').value = `${String(index).padStart(2,'0')} / 13${reference ? ' · 정지 기준' : shot ? ' · 발사' : [2,5,8,11].includes(index) ? ' · 키포즈' : ''}`;
      this.syncFireControls(state);
    });
    $('plan-b-shot').addEventListener('click', () => {
      if (this.player.paused) this.pause(false);
      this.player.requestFire();
    });
    const hold = $('plan-b-hold');
    hold.addEventListener('pointerdown', event => {
      if (event.button !== 0 || this.holdPointer !== undefined || hold.disabled) return;
      event.preventDefault(); this.holdPointer = event.pointerId;
      hold.setPointerCapture(event.pointerId); this.holdFire(true);
    });
    const releasePointer = event => {
      if (event.pointerId !== this.holdPointer) return;
      this.holdPointer = undefined; this.holdFire(false);
    };
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) hold.addEventListener(event, releasePointer);
    hold.addEventListener('keydown', event => {
      if (!['Space', 'Enter'].includes(event.code)) return;
      event.preventDefault(); if (!event.repeat) this.holdFire(true);
    });
    hold.addEventListener('keyup', event => { if (['Space', 'Enter'].includes(event.code)) { event.preventDefault(); this.holdFire(false); } });
    hold.addEventListener('blur', () => this.holdFire(false));
    window.addEventListener('blur', () => { this.holdPointer = undefined; this.player.cancelFire(); });
    window.addEventListener('keydown', event => {
      if (!this.visible || event.code !== 'Space' || /INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target.tagName)) return;
      event.preventDefault(); if (!event.repeat) this.holdFire(true);
    });
    window.addEventListener('keyup', event => { if (event.code === 'Space') this.holdFire(false); });
    $('plan-b-pause').addEventListener('click', () => this.pause(!this.player.paused));
    $('plan-b-step').addEventListener('click', () => { this.pause(true); this.player.seek((this.player.index + 1) % 14); });
    $('plan-b-cross-first').addEventListener('click', () => { this.pause(true); this.player.seek(this.reviewFrames?.[0] ?? 5); });
    $('plan-b-cross-second').addEventListener('click', () => { this.pause(true); this.player.seek(this.reviewFrames?.[1] ?? 11); });
    $('plan-b-frame').addEventListener('input', event => { this.pause(true); this.player.seek(Number(event.target.value)); });
    $('plan-b-speed').addEventListener('change', event => { this.player.speed = Number(event.target.value); });
    $('plan-b-background').addEventListener('change', event => { $('plan-b-stage').className = `plan-b-stage bg-${event.target.value}`; });
    this.studyButtons = [...document.querySelectorAll('[data-plan-b-study]')];
    this.studyButtons.forEach(button => button.addEventListener('click', () => this.selectStudy(button.dataset.planBStudy, true)));
    $('plan-b-pixel-background').addEventListener('change', event => { $('plan-b-pixel-stage').className = `plan-b-pixel-stage bg-${event.target.value}`; });
    $('plan-b-pixel-size').addEventListener('change', event => { $('plan-b-pixel-stage').dataset.size = event.target.value; });
    $('plan-b-pixel-image').addEventListener('load', () => { $('plan-b-pixel-loading').hidden = true; });
    $('plan-b-pixel-image').addEventListener('error', () => { $('plan-b-pixel-loading').hidden = false; $('plan-b-pixel-loading').textContent = '도트 이미지를 불러오지 못했습니다.'; });
  }
  pause(paused) { this.player.pause(paused); $('plan-b-pause').textContent = paused ? '재생' : '일시정지'; }
  holdFire(held) {
    if (held && (!this.visible || !this.player.fire)) return;
    if (held && this.player.paused) this.pause(false);
    this.player.trigger(held);
  }
  syncFireControls(state = {}) {
    $('plan-b-shot').disabled = !state.input || state.pending || state.held || ['shot', 'recovery'].includes(state.phase);
    $('plan-b-hold').disabled = !state.input;
    $('plan-b-hold').setAttribute('aria-pressed', String(Boolean(state.held)));
    const count = `${state.shotCount ?? 0}발`;
    if ($('plan-b-shot-count').value !== count) $('plan-b-shot-count').value = count;
    const label = !state.input ? '준비 중' : state.preview ? '포즈 검토' : state.phase === 'shot' ? '발사'
      : state.phase === 'recovery' ? state.held ? '연사 중' : '반동·복귀'
      : state.held ? '연사 중' : '사격 대기';
    if ($('plan-b-fire-state').textContent !== label) $('plan-b-fire-state').textContent = label;
  }
  writeParams(params) {
    params.set('plan', 'b');
    if (CAMERA_STUDIES[this.study]) {
      params.set('study', CAMERA_STUDIES[this.study].query); params.delete('motion'); params.delete('pixelView');
    } else if (COMBAT[this.study]) {
      params.set('study', COMBAT[this.study].study ?? 'combat_006'); params.set('motion', COMBAT[this.study].motion); params.delete('pixelView');
    } else if (this.study === 'pixel-walk') {
      params.set('study', 'pixel_005'); params.set('motion', 'walk'); params.delete('pixelView');
    } else if (this.study === 'pixel-walk-004') {
      params.set('study', 'pixel_004'); params.set('motion', 'walk'); params.delete('pixelView');
    } else if (this.study === 'walk-001') {
      params.set('motion', 'walk'); params.delete('study'); params.delete('pixelView');
    } else {
      params.delete('motion'); params.set('study', 'pixel_003');
      params.set('pixelView', this.study === 'pixel-keys' ? 'keys' : 'baseline');
    }
  }
  selectStudy(study, updateUrl = false) {
    this.player.cancelFire();
    this.study = Object.hasOwn(CAMERA_STUDIES, study) || ['guard-walk', 'guard-fire', 'walk-fire', 'kneel-fire', 'pixel-walk', 'pixel-walk-004', 'pixel-baseline', 'pixel-keys', 'walk-001'].includes(study) ? study : DEFAULT_STUDY;
    const combat = COMBAT[this.study];
    const camera = CAMERA_STUDIES[this.study];
    const oldWalk = this.study === 'walk-001';
    const previousWalk = this.study === 'pixel-walk-004';
    const walk = Boolean(combat) || oldWalk || previousWalk || this.study === 'pixel-walk';
    const fire = firingOptions(this.study);
    $('plan-b-fire-controls').hidden = !fire;
    $('plan-b-fire-note').hidden = !fire;
    this.syncFireControls();
    this.studyButtons.forEach(button => {
      const active = button.dataset.planBStudy === this.study;
      button.setAttribute('aria-pressed', String(active));
      if (active && button.closest('#plan-b-history')) $('plan-b-history').open = true;
    });
    $('plan-b-pixel-view').hidden = walk;
    $('plan-b-walk-view').hidden = !walk;
    this.player.show(this.visible && walk);
    if (this.visible) $('review-state').textContent = camera ? `플랜 B · ${camera.title} 검토` : combat ? `${combat.title} 검토` : previousWalk ? '플랜 B · 다리 교대 반려' : oldWalk || this.study === 'pixel-keys' ? '플랜 B · 크기 검수 실패' : walk ? '플랜 B · 다리 교차 보정' : '플랜 B · 도트 외형 검토';
    if (walk && this.visible) {
      const selected = this.study;
      const root = combat ? combat.root : oldWalk ? '/art/characters/clone_01/motion/plan_b/walk_001' : previousWalk ? PREVIOUS_WALK_ROOT : WALK_ROOT;
      $('plan-b-quality-warning').hidden = !(oldWalk || previousWalk);
      $('plan-b-quality-warning').textContent = previousWalk
        ? '004는 두 반주기의 다리 배치가 반복되고 교차·지지 역할 교대가 불명확해 사용자가 반려한 결과입니다. 보존 기록으로 재생합니다.'
        : '이전 상세 보행은 기준 이미지와 머리·몸통·총의 비례가 달라 크기 검수에서 반려한 결과입니다.';
      $('plan-b-crossing-controls').hidden = oldWalk || previousWalk;
      this.reviewFrames = combat?.reviewFrames ?? [5, 11];
      $('plan-b-cross-first').textContent = combat?.reviewLabels[0] ?? '앞쪽 다리 지지 · 뒷다리 교차';
      $('plan-b-cross-second').textContent = combat?.reviewLabels[1] ?? '뒷다리 지지 · 앞다리 교차';
      $('plan-b-walk-note').textContent = combat ? combat.note : previousWalk
        ? '이전 도트 004 보행입니다. 프레임 재생은 동작하지만 양발 교대·교차가 어색하다는 사용자 지적으로 반려했습니다.'
        : oldWalk
        ? '이전 상세 외형의 보행 반려 기록입니다. 기준 대비 크기·비례 검수에 실패했습니다.'
        : '밝은 앞쪽 다리와 어두운 뒤쪽 다리가 몸 아래에서 교차하고 지지 역할을 번갈아 맡습니다. 정지 기준 자세를 제외한 12개 걷기 포즈를 반복합니다. 아래 교차 비교 버튼으로 두 반주기를 확인할 수 있으며 최종 아트 검수는 대기입니다.';
      $('plan-b-canvas').setAttribute('aria-label', combat ? combat.title : oldWalk || previousWalk ? '플랜 B · 이전 보행 반려 기록' : '밝은 앞다리와 어두운 뒷다리가 교차하는 도트 005 걷기');
      $('plan-b-contact-link').href = `${root}/output/contact-sheet.png`;
      $('plan-b-contact-link').textContent = oldWalk || previousWalk ? '반려한 14프레임 ↗' : combat ? '동작 포즈 대조 ↗' : '걷기 포즈 대조 ↗';
      $('plan-b-comparison-link').href = combat ? combat.comparisonPath ?? `${combat.root}/reviews/key-size-comparison.png` : oldWalk ? '/art/characters/clone_01/motion/plan_b/walk_002/reviews/baseline-key-size-comparison.png' : previousWalk ? `${PREVIOUS_WALK_ROOT}/reviews/key-size-comparison.png` : `${WALK_ROOT}/reviews/key-leg-alternation.png`;
      $('plan-b-comparison-link').textContent = combat ? combat.comparisonLabel ?? '기준·발사 자세 대조 ↗' : oldWalk || previousWalk ? '기준·키포즈 크기 대조 ↗' : '양발 교대·교차 대조 ↗';
      $('plan-b-loading').hidden = false;
      $('plan-b-loading').textContent = '플랜 B 모션을 불러오는 중…';
      this.player.load(`${root}/output/manifest.json`, fire).then(loaded => {
        if (loaded && this.study === selected) { $('plan-b-loading').hidden = true; this.player.draw(); }
      }).catch(error => {
        if (this.study === selected) { $('plan-b-loading').hidden = false; $('plan-b-loading').textContent = error.message; }
      });
    } else if (!walk && this.visible) {
      const keys = this.study === 'pixel-keys';
      $('plan-b-pixel-quality-warning').hidden = !keys;
      const path = camera ? `${camera.root}/output/baseline.png` : `${PIXEL_ROOT}/${keys ? 'source/keyposes.png' : 'output/baseline.png'}`;
      $('plan-b-pixel-image').alt = camera ? camera.alt : keys ? '도트 003 · 모델로 생성한 걷기 키포즈 네 자세, 완성 모션 전 검토용' : '장식을 줄인 플랜 B 도트풍 기준 캐릭터';
      $('plan-b-pixel-note').textContent = camera ? camera.note : '긴 머리·검은 갑옷·망토·M16을 남기고 문양·장식·작은 버클·재질 묘사를 줄인 도트 003의 정지 이미지 기록입니다. 최신 걷기는 위 ‘경계 걷기’ 탭에서 볼 수 있습니다.';
      $('plan-b-pixel-comparison-link').href = camera ? `${camera.root}/README.md` : `${PIXEL_ROOT}/reviews/baseline-key-comparison.png`;
      $('plan-b-pixel-comparison-link').textContent = camera ? `${camera.title} 제작 기록 ↗` : '기준·키포즈 크기 대조 ↗';
      $('plan-b-pixel-prompt-link').href = `${camera ? camera.root : PIXEL_ROOT}/records/baseline_prompt.md`;
      $('plan-b-style-comparison').hidden = Boolean(camera);
      $('plan-b-angle-comparison').hidden = !camera;
      $('plan-b-outfit-before-after').hidden = camera?.comparisonKind !== 'outfit';
      if (camera) {
        $('plan-b-angle-comparison').dataset.kind = camera.comparisonKind ?? 'camera';
        $('plan-b-angle-summary').textContent = camera.comparison;
        $('plan-b-angle-reference').src = camera.reference;
        $('plan-b-angle-reference').alt = camera.referenceLabel;
        $('plan-b-angle-reference-label').textContent = camera.referenceLabel;
        $('plan-b-angle-current').src = path;
        $('plan-b-angle-current').alt = camera.alt;
        $('plan-b-angle-current-label').textContent = camera.caption;
      }
      if ($('plan-b-pixel-image').getAttribute('src') !== path) {
        $('plan-b-pixel-loading').hidden = false;
        $('plan-b-pixel-loading').textContent = '도트 시도를 불러오는 중…';
        $('plan-b-pixel-image').src = path;
      }
      $('plan-b-pixel-original').href = path;
    }
    if (updateUrl) {
      const [route, query] = location.hash.split('?');
      const params = new URLSearchParams(query || '');
      this.writeParams(params);
      history.replaceState(null, '', `${location.pathname}${location.search}${route}?${params}`);
    }
  }
  show(visible) {
    this.visible = visible;
    this.player.show(false);
    if (!visible) return;
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    this.selectStudy(params.get('study') === 'fighter_outfit_003' ? 'camera-outfit'
      : params.get('study') === 'fighter_view_002' ? 'camera-fighter'
      : params.get('study') === 'camera_pitch30_001' ? 'camera-pitch30'
      : params.get('study') === 'guard_007' ? (params.get('motion') === 'walk_fire' ? 'guard-fire' : 'guard-walk')
      : params.get('study') === 'combat_006' ? (params.get('motion') === 'kneel_fire' ? 'kneel-fire' : 'walk-fire')
      : params.get('study') === 'pixel_005' ? 'pixel-walk'
      : params.get('study') === 'pixel_004' ? 'pixel-walk-004'
      : params.get('study') === 'pixel_003' ? (params.get('pixelView') === 'keys' ? 'pixel-keys' : 'pixel-baseline')
      : params.get('plan') === 'b' && params.get('motion') === 'walk' ? 'walk-001' : DEFAULT_STUDY);
  }
}
