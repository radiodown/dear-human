// 뼈대 비율 모드 전용 렌더러. rig_002의 WebGLCharacter(해시 고정)를 수정하지 않고 상속해,
// 몸통·머리·부츠 그림을 뼈대 길이에 맞춰 늘이거나 줄인다. pose.partScale이 없으면 원래 렌더러와 같다.
// partScale: { torso: 몸통 세로 배율, head: 머리 배율, foot: 부츠 가로 배율(숫자 또는 [먼 다리, 가까운 다리]),
//   fit: 화면 맞춤에 쓸 고정 배율 { torso, head } — 실시간 길이에서 화면 배율이 흔들리지 않게 한다 }
import { transform } from './rig-core.js';
import { GAIT } from './gait.js';
import { HUMAN, partDimensions } from './proportions.js';
import { WebGLCharacter } from './webgl-character.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));

export class MocapWebGLCharacter extends WebGLCharacter {
  render(rig, options = {}) {
    const p = rig.pose();
    if (!p.partScale) return super.render(rig, options);
    const { zoom = 1, debug = false, mesh = false, showCape = true, size = 300 } = options;
    const { torso: kt = 1, head: kh = 1, foot: kf = 1, fit = {} } = p.partScale;
    const footScale = (k) => (Array.isArray(kf) ? kf[k] : kf);
    const gl = this.gl, box = this.canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(box.width * dpr)), height = Math.max(1, Math.round(box.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    gl.viewport(0, 0, width, height); gl.uniform2f(this.resolution, width, height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    this.drawCalls = this.triangles = 0; this.meshLines = []; this.debugMesh = mesh;
    // 몸통이 길어진 만큼 화면 맞춤도 키를 반영한다.
    const tall = 310 + HUMAN.torsoAboveHip * ((fit.torso ?? kt) - 1) + HUMAN.heights.head * ((fit.head ?? kh) - 1);
    this.scale = Math.min((height - 70 * dpr) / tall, (width - 40 * dpr) / 290) * zoom * (size / 300);
    this.origin = { x: width * 0.45, y: height - 35 * dpr }; this.facing = rig.facing;
    const t = p.torso;
    this.line([{ x: -100, y: 1 }, { x: 150, y: 1 }], [0.7, 0.75, 0.73, 0.4]);
    const marks = []; for (let x = -120; x < 200; x += 24) { const at = x - (rig.distance % 24); marks.push({ x: at, y: 3 }, { x: at + 5, y: 3 }); }
    this.line(marks, [0.55, 0.63, 0.65, 0.3]);

    const bodyPoint = (x, y) => transform({ x, y }, t);
    // 몸통에 붙은 그림: 세로 위치·높이를 kt배. 머리에 붙은 그림: 목 위 위치·크기를 kh배.
    const stretched = (key, at, h, w, options) => this.mesh(key, at.x, at.y, w, h, { ...options, angle: (options.angle ?? 0) + t.a });
    const torsoMesh = (key, x, y, options = {}) => { const base = HUMAN.heights[key], w = partDimensions(this.definition.parts[key].rect, base).width; stretched(key, bodyPoint(x, y * kt), base * kt, w, options); };
    const capeMesh = (key, x, y, options = {}) => { const h = HUMAN.heights[key], w = partDimensions(this.definition.parts[key].rect, h).width; stretched(key, bodyPoint(x, y * kt), h, w, options); };
    // 고개: 목 아래(머리 파츠 피벗)를 축으로 몸통 대비 headTilt만큼 돌린다. 머리카락도 같은 축으로 함께 돈다.
    const baseTilt = -t.a * 0.5, tilt = p.headTilt ?? baseTilt, turn = tilt - baseTilt;
    const neckX = (3 + p.head * 0.35) * kh, neckY = -6 * kh;
    const headPoint = (x, y) => { const dx = x * kh - neckX, dy = y * kh - neckY, c = Math.cos(turn), sn = Math.sin(turn); return bodyPoint(neckX + c * dx - sn * dy, neckY + sn * dx + c * dy); };
    const headPart = (key, x, y, options = {}) => { const h = HUMAN.heights[key] * kh, w = partDimensions(this.definition.parts[key].rect, h).width; stretched(key, headPoint(x, y), h, w, { ...options, angle: (options.angle ?? 0) + turn }); };
    // 척추 휘어짐(뼈대 일치 모드): 몸통 그림의 세로 위치 → 목(0)~엉덩이(1) 비율 q → 앞뒤 휘어짐 px
    const bend = p.spineBend, bendAt = (q) => { if (!bend) return 0; const x = clamp01(q) * (bend.length - 1), i = Math.min(bend.length - 2, Math.floor(x)); return bend[i] + (bend[i + 1] - bend[i]) * (x - i); };
    const torsoBend = (topY, height) => (u, v) => ({ x: bendAt((topY + v * height) / HUMAN.torsoAboveHip), y: 0 });
    const capeWarp = (u, v) => ({ x: (p.cape - p.walkAmount * 1.7) * v * v, y: Math.sin(u * Math.PI) * p.cape * v * 0.15 });
    if (showCape) { capeMesh('cape', -10, 2, { warp: capeWarp, angle: -t.a * 0.8 }); capeMesh('cape_front', -24, 3, { pivot: [0.75, 0.02], warp: capeWarp, angle: -t.a * 0.7 }); }
    headPart('hair_back', -3 + p.head * 0.3, -53, { warp: (u, v) => ({ x: p.hair * v * v, y: 0 }), angle: p.head * 0.008 - t.a * 0.5 });
    const far = [0.72, 0.76, 0.83, 1];
    const drawLeg = (leg, tint, k) => {
      const bootW = GAIT.bootWidth * footScale(k);
      this.limb('thigh', leg.root, leg.elbow, tint); this.limb('shin', leg.elbow, leg.hand, tint);
      this.mesh('boot', leg.foot.x, leg.foot.y, bootW, GAIT.bootHeight, { tint, angle: leg.foot.a, pivot: [GAIT.ankleU, GAIT.ankleV] });
    };
    drawLeg(p.legs[0], far, 0); drawLeg(p.legs[1], undefined, 1);
    this.limb('upper_arm', p.armB.root, p.armB.elbow, far); this.limb('forearm', p.armB.elbow, p.armB.hand, far);
    this.sprite('shoulder', p.armB.root.x, p.armB.root.y - 6, HUMAN.heights.shoulder, { tint: far, angle: t.a });
    const spineWarp = torsoBend(-12, HUMAN.heights.chest);
    torsoMesh('inner_torso', 0, -12, { warp: (u, v) => ({ x: spineWarp(u, v).x, y: p.cloth * Math.sin(v * Math.PI) ** 2 * Math.sin(u * Math.PI) }) });
    // 외부 갑옷은 rigid: 천 변형은 주지 않는다. 뼈대 일치 모드에서만 척추 곡선을 따라 휜다.
    torsoMesh('chest', 0, -12, bend ? { warp: (u, v) => ({ x: spineWarp(u, v).x, y: 0 }) } : {});
    // 골반(치마): 엉덩이 관절을 회전 중심으로 몸통과 같이 기울고, 세로로 kt배.
    const pelvisTop = transform({ x: -1, y: -HUMAN.pelvisAboveHip * kt }, { x: p.hip.x, y: p.hip.y, a: p.lean });
    const pw = partDimensions(this.definition.parts.pelvis.rect, HUMAN.heights.pelvis).width;
    this.mesh('pelvis', pelvisTop.x, pelvisTop.y, pw, HUMAN.heights.pelvis * kt, { angle: p.lean });
    headPart('head', 3 + p.head * 0.35, -6, { pivot: [0.5, 1], angle: p.head * 0.012 - t.a * 0.5 });
    headPart('hair_side', -7, -42, { warp: (u, v) => ({ x: p.hair * v * v, y: 0 }), angle: -t.a * 0.5 });
    const w = rig.weapon;
    if (w.id === 'diagnostic') {
      const shape = [{ x: -33, y: -4 }, { x: 83, y: -4 }, { x: 83, y: 3 }, { x: -33, y: -4 }, { x: 83, y: 3 }, { x: -33, y: 3 }].flatMap((v) => { const s = this.screen(transform(v, p.weapon)); return [s.x, s.y, 0, 0]; });
      this.submit(shape, this.white, [0.5, 0.75, 0.8, 1]);
    } else this.mesh('rifle', p.weapon.x, p.weapon.y, w.width, w.height, { pivot: [w.pivot.x, w.pivot.y], angle: p.weapon.a });
    if (p.magazineVisible && w.id === 'm16_basic') this.sprite('magazine', p.sockets.mag.x, p.sockets.mag.y + p.magOffset, 27, { angle: p.weapon.a });
    this.sprite('hand', p.armB.hand.x, p.armB.hand.y, HUMAN.handHeight, { pivot: HUMAN.handPivot, angle: p.handAngleB });
    this.limb('upper_arm', p.armA.root, p.armA.elbow); this.limb('forearm', p.armA.elbow, p.armA.hand);
    this.sprite('shoulder', p.armA.root.x, p.armA.root.y - 6, HUMAN.heights.shoulder, { angle: t.a });
    this.sprite('hand', p.armA.hand.x, p.armA.hand.y, HUMAN.handHeight, { pivot: HUMAN.handPivot, angle: p.handAngleA });
    if (rig.flash > 0) {
      const m = p.sockets.muzzle;
      const verts = [{ x: 0, y: -3 }, { x: 19, y: 0 }, { x: 0, y: 3 }].flatMap((v) => { const s = this.screen(transform(v, { ...m, a: p.weapon.a })); return [s.x, s.y, 0, 0]; }); this.submit(verts, this.white, [1, 0.79, 0.31, 0.95]);
      this.line([m, transform({ x: 95, y: 0 }, { ...m, a: p.weapon.a })], [1, 0.86, 0.53, 0.42]);
    }
    if (mesh && this.meshLines.length) this.line(this.meshLines, [0.45, 0.76, 1, 0.4], false);
    if (debug) {
      // 몸통: 엉덩이 → 목 → 머리 끝, 목 → 양 어깨
      const neck = bodyPoint(neckX, neckY), a = t.a + tilt + p.head * 0.012, crown = { x: neck.x + Math.sin(a) * HUMAN.heights.head * kh, y: neck.y - Math.cos(a) * HUMAN.heights.head * kh };
      const spineColor = [0.93, 0.85, 0.55, 1];
      const spine = []; for (let i = 0; i <= 8; i++) { const q = i / 8; spine.push(bodyPoint(bendAt(q), q * HUMAN.torsoAboveHip * kt)); }
      const spineLines = []; for (let i = 0; i < spine.length - 1; i++) spineLines.push(spine[i], spine[i + 1]);
      this.line([...spineLines, { x: t.x, y: t.y }, neck, neck, crown], spineColor);
      this.line([{ x: t.x, y: t.y }, p.armA.root, { x: t.x, y: t.y }, p.armB.root], spineColor);
      for (const q of [p.hip, { x: t.x, y: t.y }, neck, crown]) this.marker(q, spineColor);
      for (const arm of [p.armA, p.armB, ...p.legs]) { this.line([arm.root, arm.elbow, arm.elbow, arm.hand]); this.marker(arm.target, [1, 0.47, 0.28, 1]); }
      for (const [name, s] of Object.entries(p.sockets)) this.marker(s, name === 'muzzle' ? [1, 0.85, 0.3, 1] : [0.4, 1, 0.6, 1]);
      for (const leg of p.legs) { this.line([leg.foot.heel, leg.foot.toe], leg.foot.stance ? [0.4, 1, 0.55, 1] : [1, 0.65, 0.3, 1]); this.marker(leg.foot.pivot, [1, 0.8, 0.4, 1]); }
    }
    this.lastPose = p;
  }
}
