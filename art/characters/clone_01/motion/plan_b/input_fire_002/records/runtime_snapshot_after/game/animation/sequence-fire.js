import { WEAPONS } from './weapon-profiles.js';
import { MUZZLE_LIGHT } from './muzzle-light.js';

export const SEQUENCE_FIRE = Object.freeze({
  intervalMs: WEAPONS.m16_basic.fireInterval * 1000,
  flashMs: MUZZLE_LIGHT.duration * 1000,
  recoveryMs: 160,
  recoilSwitchMs: 65,
});

// Firing time is independent of the whole-body walking frame clock.
export class SequenceFire {
  constructor(kind, shotIndices, loopRange) {
    this.kind = kind;
    this.shotIndices = shotIndices;
    this.loopRange = loopRange;
    this.held = false;
    this.age = Infinity;
    this.cooldown = 0;
    this.shotCount = 0;
    this.shotIndex = shotIndices[0];
  }
  get active() { return this.age < SEQUENCE_FIRE.recoveryMs; }
  get phase() { return this.age < SEQUENCE_FIRE.flashMs ? 'shot' : this.active ? 'recovery' : 'ready'; }
  request() {
    if (this.active || this.held) return false;
    this.shoot();
    return true;
  }
  shoot() {
    this.shotIndex = this.shotIndices[this.shotCount % this.shotIndices.length];
    this.shotCount++;
    this.age = 0;
    this.cooldown = SEQUENCE_FIRE.intervalMs;
  }
  trigger(held) {
    const pressed = held && !this.held;
    this.held = held;
    if (pressed && this.cooldown <= 0) this.shoot();
  }
  cancel(clearRecovery = false) {
    this.held = false;
    if (clearRecovery) { this.age = Infinity; this.cooldown = 0; }
  }
  update(dt) {
    let remaining = Math.max(0, dt);
    while (this.held && this.cooldown <= remaining) {
      const step = this.cooldown;
      this.age += step;
      remaining -= step;
      this.shoot();
    }
    this.age += remaining;
    this.cooldown = Math.max(0, this.cooldown - remaining);
  }
  poseFrame() {
    if (!this.active) return 0;
    const [start, end] = this.loopRange;
    const offset = this.age < SEQUENCE_FIRE.recoilSwitchMs ? 1 : 2;
    return start + (this.shotIndex - start + offset) % (end - start + 1);
  }
}
