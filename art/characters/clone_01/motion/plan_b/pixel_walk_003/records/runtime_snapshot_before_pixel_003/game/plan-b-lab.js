import { FrameSequence } from './animation/frame-sequence.js';
const $ = id => document.getElementById(id);
export class PlanBLab {
  constructor() {
    this.player = new FrameSequence($('plan-b-canvas'), index => {
      $('plan-b-frame').value = index;
      $('plan-b-counter').value = `${String(index).padStart(2,'0')} / 13${[2,5,8,11].includes(index) ? ' · 키포즈' : ''}`;
    });
    $('plan-b-pause').addEventListener('click', () => this.pause(!this.player.paused));
    $('plan-b-step').addEventListener('click', () => { this.pause(true); this.player.seek((this.player.index + 1) % 14); });
    $('plan-b-frame').addEventListener('input', event => { this.pause(true); this.player.seek(Number(event.target.value)); });
    $('plan-b-speed').addEventListener('change', event => { this.player.speed = Number(event.target.value); });
    $('plan-b-background').addEventListener('change', event => { $('plan-b-stage').className = `plan-b-stage bg-${event.target.value}`; });
  }
  pause(paused) { this.player.pause(paused); $('plan-b-pause').textContent = paused ? '재생' : '일시정지'; }
  show(visible) {
    this.player.show(visible);
    if (!visible) return;
    this.player.load('/art/characters/clone_01/motion/plan_b/walk_001/output/manifest.json').then(() => {
      $('plan-b-loading').hidden = true;
    }).catch(error => { $('plan-b-loading').hidden = false; $('plan-b-loading').textContent = error.message; });
  }
}
