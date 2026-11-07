import { FrameSequence } from './animation/frame-sequence.js';
const $ = id => document.getElementById(id);
const PIXEL_ROOT = '/art/characters/clone_01/motion/plan_b/pixel_walk_003';
export class PlanBLab {
  constructor() {
    this.visible = false;
    this.study = 'pixel-baseline';
    this.player = new FrameSequence($('plan-b-canvas'), index => {
      $('plan-b-frame').value = index;
      $('plan-b-counter').value = `${String(index).padStart(2,'0')} / 13${[2,5,8,11].includes(index) ? ' · 키포즈' : ''}`;
    });
    $('plan-b-pause').addEventListener('click', () => this.pause(!this.player.paused));
    $('plan-b-step').addEventListener('click', () => { this.pause(true); this.player.seek((this.player.index + 1) % 14); });
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
    if (this.study === 'walk-001') {
      params.set('motion', 'walk'); params.delete('study'); params.delete('pixelView');
    } else {
      params.delete('motion'); params.set('study', 'pixel_003');
      params.set('pixelView', this.study === 'pixel-keys' ? 'keys' : 'baseline');
    }
  }
  selectStudy(study, updateUrl = false) {
    this.study = ['pixel-baseline', 'pixel-keys', 'walk-001'].includes(study) ? study : 'pixel-baseline';
    const walk = this.study === 'walk-001';
    $('plan-b-study').value = this.study;
    $('plan-b-pixel-view').hidden = walk;
    $('plan-b-walk-view').hidden = !walk;
    this.player.show(this.visible && walk);
    if (this.visible) $('review-state').textContent = walk || this.study === 'pixel-keys' ? '플랜 B · 크기 검수 실패' : '플랜 B · 도트 외형 검토';
    if (walk && this.visible) {
      this.player.load('/art/characters/clone_01/motion/plan_b/walk_001/output/manifest.json').then(() => {
        $('plan-b-loading').hidden = true;
      }).catch(error => { $('plan-b-loading').hidden = false; $('plan-b-loading').textContent = error.message; });
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
    this.selectStudy(params.get('plan') === 'b' && params.get('study') !== 'pixel_003' && params.get('motion') === 'walk'
      ? 'walk-001' : params.get('pixelView') === 'keys' ? 'pixel-keys' : 'pixel-baseline');
  }
}
