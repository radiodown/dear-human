// Input-controlled use of existing whole-body firing frames.
export class SequenceFire {
  constructor(kind, shotIndices, loopRange, recoveryFrames = 2) {
    this.kind = kind;
    this.shotIndices = shotIndices;
    this.loopRange = loopRange;
    this.clipLength = recoveryFrames + 1;
    this.held = false;
    this.pending = false;
    this.framesLeft = 0;
    this.shotCount = 0;
    this.nextShot = 0;
  }
  get active() { return this.framesLeft > 0; }
  get phase() {
    return this.framesLeft === this.clipLength ? 'shot' : this.active ? 'recovery'
      : this.pending ? 'queued' : this.held ? 'held' : 'ready';
  }
  request() {
    if (this.pending || this.active || this.held) return false;
    this.pending = true;
    return true;
  }
  trigger(held) {
    this.held = held;
    if (held) this.pending = false;
  }
  cancel(clearRecovery = false) {
    this.held = false;
    this.pending = false;
    if (clearRecovery) this.framesLeft = 0;
  }
  start(index) {
    this.pending = false;
    this.framesLeft = this.clipLength;
    this.shotCount++;
    return index;
  }
  startStationary(index) {
    if (this.kind !== 'stationary' || this.active || !(this.pending || this.held)) return index;
    const shot = this.shotIndices[this.nextShot++ % this.shotIndices.length];
    return this.start(shot);
  }
  advance(index) {
    if (this.active) this.framesLeft--;
    if (this.kind === 'stationary' && !this.active) return this.startStationary(0);
    const [start, end] = this.loopRange;
    const next = index < start || index >= end ? start : index + 1;
    if (this.kind === 'walking' && this.shotIndices.includes(next) && (this.pending || this.held)) return this.start(next);
    return next;
  }
}
