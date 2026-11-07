import { FrameSequence } from './animation/frame-sequence.js';
const $ = id => document.getElementById(id);
const PIXEL_ROOT = '/art/characters/clone_01/motion/plan_b/pixel_walk_003';
const WALK_ROOT = '/art/characters/clone_01/motion/plan_b/pixel_walk_005';
const PREVIOUS_WALK_ROOT = '/art/characters/clone_01/motion/plan_b/pixel_walk_004';
export class PlanBLab {
  constructor() {
    this.visible = false;
    this.study = 'pixel-walk';
    this.player = new FrameSequence($('plan-b-canvas'), index => {
      $('plan-b-frame').value = index;
      const reference = this.player.manifest?.referenceFrameIndices?.includes(index);
      $('plan-b-counter').value = `${String(index).padStart(2,'0')} / 13${reference ? ' · 정지 기준' : [2,5,8,11].includes(index) ? ' · 키포즈' : ''}`;
    });
    $('plan-b-pause').addEventListener('click', () => this.pause(!this.player.paused));
    $('plan-b-step').addEventListener('click', () => { this.pause(true); this.player.seek((this.player.index + 1) % 14); });
    $('plan-b-cross-first').addEventListener('click', () => { this.pause(true); this.player.seek(5); });
    $('plan-b-cross-second').addEventListener('click', () => { this.pause(true); this.player.seek(11); });
    $('plan-b-frame').addEventListener('input', event => { this.pause(true); this.player.seek(Number(event.target.value)); });
    $('plan-b-speed').addEventListener('change', event => { this.player.speed = Number(event.target.value); });
    $('plan-b-background').addEventListener('change', event => { $('plan-b-stage').className = `plan-b-stage bg-${event.target.value}`; });
    $('plan-b-study').addEventListener('change', event => this.selectStudy(event.target.value, true));
    $('plan-b-pixel-background').addEventListener('change', event => { $('plan-b-pixel-stage').className = `plan-b-pixel-stage bg-${event.target.value}`; });
    $('plan-b-pixel-size').addEventListener('change', event => { $('plan-b-pixel-stage').dataset.size = event.target.value; });
    $('plan-b-pixel-image').addEventListener('load', () => { $('plan-b-pixel-loading').hidden = true; });
    $('plan-b-pixel-image').addEventListener('error', () => { $('plan-b-pixel-loading').hidden = false; $('plan-b-pixel-loading').textContent = '도트 이미지를 불러오지 못했습니다.'; });
  }
  pause(paused) { this.player.pause(paused); $('plan-b-pause').textContent = paused ? '재생' : '일시정지'; }
  writeParams(params) {
    params.set('plan', 'b');
    if (this.study === 'pixel-walk') {
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
    this.study = ['pixel-walk', 'pixel-walk-004', 'pixel-baseline', 'pixel-keys', 'walk-001'].includes(study) ? study : 'pixel-walk';
    const oldWalk = this.study === 'walk-001';
    const previousWalk = this.study === 'pixel-walk-004';
    const walk = oldWalk || previousWalk || this.study === 'pixel-walk';
    $('plan-b-study').value = this.study;
    $('plan-b-pixel-view').hidden = walk;
    $('plan-b-walk-view').hidden = !walk;
    this.player.show(this.visible && walk);
    if (this.visible) $('review-state').textContent = previousWalk ? '플랜 B · 다리 교대 반려' : oldWalk || this.study === 'pixel-keys' ? '플랜 B · 크기 검수 실패' : walk ? '플랜 B · 다리 교차 보정' : '플랜 B · 도트 외형 검토';
    if (walk && this.visible) {
      const selected = this.study;
      const root = oldWalk ? '/art/characters/clone_01/motion/plan_b/walk_001' : previousWalk ? PREVIOUS_WALK_ROOT : WALK_ROOT;
      $('plan-b-quality-warning').hidden = !(oldWalk || previousWalk);
      $('plan-b-quality-warning').textContent = previousWalk
        ? '004는 두 반주기의 다리 배치가 반복되고 교차·지지 역할 교대가 불명확해 사용자가 반려한 결과입니다. 보존 기록으로 재생합니다.'
        : '이전 상세 보행은 기준 이미지와 머리·몸통·총의 비례가 달라 크기 검수에서 반려한 결과입니다.';
      $('plan-b-crossing-controls').hidden = oldWalk || previousWalk;
      $('plan-b-walk-note').textContent = previousWalk
        ? '이전 도트 004 보행입니다. 프레임 재생은 동작하지만 양발 교대·교차가 어색하다는 사용자 지적으로 반려했습니다.'
        : oldWalk
        ? '이전 상세 외형의 보행 반려 기록입니다. 기준 대비 크기·비례 검수에 실패했습니다.'
        : '밝은 앞쪽 다리와 어두운 뒤쪽 다리가 몸 아래에서 교차하고 지지 역할을 번갈아 맡습니다. 정지 기준 자세를 제외한 12개 걷기 포즈를 반복합니다. 아래 교차 비교 버튼으로 두 반주기를 확인할 수 있으며 최종 아트 검수는 대기입니다.';
      $('plan-b-canvas').setAttribute('aria-label', oldWalk || previousWalk ? '플랜 B · 이전 보행 반려 기록' : '밝은 앞다리와 어두운 뒷다리가 교차하는 도트 005 걷기');
      $('plan-b-contact-link').href = `${root}/output/contact-sheet.png`;
      $('plan-b-contact-link').textContent = oldWalk || previousWalk ? '반려한 14프레임 ↗' : '걷기 포즈 대조 ↗';
      $('plan-b-comparison-link').href = oldWalk ? '/art/characters/clone_01/motion/plan_b/walk_002/reviews/baseline-key-size-comparison.png' : previousWalk ? `${PREVIOUS_WALK_ROOT}/reviews/key-size-comparison.png` : `${WALK_ROOT}/reviews/key-leg-alternation.png`;
      $('plan-b-comparison-link').textContent = oldWalk || previousWalk ? '기준·키포즈 크기 대조 ↗' : '양발 교대·교차 대조 ↗';
      $('plan-b-loading').hidden = false;
      $('plan-b-loading').textContent = '플랜 B 모션을 불러오는 중…';
      this.player.load(`${root}/output/manifest.json`).then(loaded => {
        if (loaded && this.study === selected) $('plan-b-loading').hidden = true;
      }).catch(error => {
        if (this.study === selected) { $('plan-b-loading').hidden = false; $('plan-b-loading').textContent = error.message; }
      });
    } else if (!walk && this.visible) {
      const keys = this.study === 'pixel-keys';
      $('plan-b-pixel-quality-warning').hidden = !keys;
      const path = `${PIXEL_ROOT}/${keys ? 'source/keyposes.png' : 'output/baseline.png'}`;
      $('plan-b-pixel-image').alt = keys ? '도트 003 · 모델로 생성한 걷기 키포즈 네 자세, 완성 모션 전 검토용' : '장식을 줄인 플랜 B 도트풍 기준 캐릭터';
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
    this.selectStudy(params.get('study') === 'pixel_005' ? 'pixel-walk'
      : params.get('study') === 'pixel_004' ? 'pixel-walk-004'
      : params.get('study') === 'pixel_003' ? (params.get('pixelView') === 'keys' ? 'pixel-keys' : 'pixel-baseline')
      : params.get('plan') === 'b' && params.get('motion') === 'walk' ? 'walk-001' : 'pixel-walk');
  }
}
