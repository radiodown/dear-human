// BVH(Biovision Hierarchy) 읽기와 순운동학. 브라우저·Node 공용이며 DOM에 의존하지 않는다.
// 회전 채널은 파일에 적힌 순서대로 내재(intrinsic) 회전으로 곱한다: R = R(c0)·R(c1)·R(c2).
// 전역 변환 = 부모 전역 · T(offset + 위치 채널) · R.

const AXES = { X: 0, Y: 1, Z: 2 };

function axisMatrix(axis, degrees) {
  const r = degrees * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  if (axis === 0) return [1, 0, 0, 0, c, -s, 0, s, c];
  if (axis === 1) return [c, 0, s, 0, 1, 0, -s, 0, c];
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}

export function mul3(a, b) {
  const o = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  return o;
}

function apply3(m, v) {
  return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
}

/**
 * BVH 텍스트를 읽는다.
 * joints: { name, parent, offset[3], channels[{kind:'position'|'rotation', axis}], channelStart, end }
 * End Site는 채널이 없는 joint(end=true, name=`${부모}_End`)로 포함한다.
 */
export function parseBVH(text) {
  if (typeof text !== 'string') throw new Error('BVH 텍스트가 아닙니다.');
  const motionAt = text.search(/^\s*MOTION\s*$/m);
  if (!/^\s*HIERARCHY/.test(text) || motionAt < 0) throw new Error('HIERARCHY 또는 MOTION 구역이 없습니다.');
  const tokens = text.slice(0, motionAt).split(/\s+/).filter(Boolean);
  const joints = [], stack = [];
  let channelCount = 0, i = 1, pending = null;
  const num = () => { const v = Number(tokens[i++]); if (!Number.isFinite(v)) throw new Error(`숫자가 아닌 값: ${tokens[i - 1]}`); return v; };
  while (i < tokens.length) {
    const t = tokens[i++];
    if (t === 'ROOT' || t === 'JOINT') {
      pending = { name: tokens[i++], parent: stack.length ? stack.at(-1) : -1, offset: [0, 0, 0], channels: [], channelStart: channelCount, end: false };
      if (t === 'ROOT' && joints.length) throw new Error('ROOT가 여러 개인 BVH는 지원하지 않습니다.');
    } else if (t === 'End') {
      if (tokens[i++] !== 'Site') throw new Error('End Site 형식이 올바르지 않습니다.');
      const parent = stack.at(-1);
      pending = { name: `${joints[parent].name}_End`, parent, offset: [0, 0, 0], channels: [], channelStart: channelCount, end: true };
    } else if (t === '{') {
      if (!pending) throw new Error('관절 없이 중괄호가 열렸습니다.');
      joints.push(pending); stack.push(joints.length - 1); pending = null;
    } else if (t === '}') {
      if (!stack.length) throw new Error('중괄호 짝이 맞지 않습니다.');
      stack.pop();
    } else if (t === 'OFFSET') {
      joints[stack.at(-1)].offset = [num(), num(), num()];
    } else if (t === 'CHANNELS') {
      const joint = joints[stack.at(-1)], n = num();
      joint.channelStart = channelCount;
      for (let k = 0; k < n; k++) {
        const m = /^([XYZ])(position|rotation)$/i.exec(tokens[i++] || '');
        if (!m) throw new Error(`알 수 없는 채널: ${tokens[i - 1]}`);
        joint.channels.push({ kind: m[2].toLowerCase(), axis: AXES[m[1].toUpperCase()] });
      }
      channelCount += n;
    } else {
      throw new Error(`알 수 없는 토큰: ${t}`);
    }
  }
  if (stack.length || !joints.length) throw new Error('관절 계층이 닫히지 않았습니다.');

  const lines = text.slice(motionAt).split(/\r?\n/);
  let li = 1;
  while (li < lines.length && !lines[li].trim()) li++;
  const framesMatch = /^\s*Frames:\s*(\d+)/.exec(lines[li++] || '');
  const timeMatch = /^\s*Frame Time:\s*([0-9.eE+-]+)/.exec(lines[li++] || '');
  if (!framesMatch || !timeMatch) throw new Error('Frames 또는 Frame Time 줄이 없습니다.');
  const frameCount = Number(framesMatch[1]), frameTime = Number(timeMatch[1]);
  if (!(frameTime > 0)) throw new Error('Frame Time이 올바르지 않습니다.');
  const data = new Float32Array(frameCount * channelCount);
  let f = 0;
  for (; li < lines.length && f < frameCount; li++) {
    const line = lines[li].trim();
    if (!line) continue;
    const values = line.split(/\s+/);
    if (values.length !== channelCount) throw new Error(`${f + 1}번째 프레임의 값 개수 ${values.length} ≠ 채널 ${channelCount}`);
    for (let k = 0; k < channelCount; k++) data[f * channelCount + k] = Number(values[k]);
    f++;
  }
  if (f !== frameCount) throw new Error(`프레임 수가 부족합니다: ${f} / ${frameCount}`);
  return { joints, channelCount, frameCount, frameTime, data, index: Object.fromEntries(joints.map((j, k) => [j.name, k])) };
}

/** 한 프레임의 관절 전역 위치와 회전을 계산한다. positions: Float32Array(joints*3) */
export function evaluateFrame(clip, frame, positions = new Float32Array(clip.joints.length * 3), rotations = null) {
  const { joints, channelCount, data } = clip;
  const f = Math.max(0, Math.min(clip.frameCount - 1, frame | 0)), base = f * channelCount;
  const globals = new Array(joints.length);
  for (let j = 0; j < joints.length; j++) {
    const joint = joints[j];
    const local = joint.offset.slice();
    let rot = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    joint.channels.forEach((ch, k) => {
      const v = data[base + joint.channelStart + k];
      if (ch.kind === 'position') local[ch.axis] += v;
      else rot = mul3(rot, axisMatrix(ch.axis, v));
    });
    let worldRot = rot, worldPos = local;
    if (joint.parent >= 0) {
      const p = globals[joint.parent];
      const moved = apply3(p.rot, local);
      worldPos = [p.pos[0] + moved[0], p.pos[1] + moved[1], p.pos[2] + moved[2]];
      worldRot = mul3(p.rot, rot);
    }
    globals[j] = { pos: worldPos, rot: worldRot };
    positions[j * 3] = worldPos[0]; positions[j * 3 + 1] = worldPos[1]; positions[j * 3 + 2] = worldPos[2];
    if (rotations) rotations[j] = worldRot;
  }
  return positions;
}

/** 모든 프레임의 전역 위치를 미리 계산한다. Float32Array(frames*joints*3) */
export function bakePositions(clip) {
  const stride = clip.joints.length * 3, out = new Float32Array(clip.frameCount * stride), tmp = new Float32Array(stride);
  for (let f = 0; f < clip.frameCount; f++) { evaluateFrame(clip, f, tmp); out.set(tmp, f * stride); }
  return out;
}

/**
 * 좌·우 엉덩이에서 수평 정면 방향(yaw, 라디안)을 구한다. Y-up 기준이며 0은 +Z, π/2는 +X다.
 * forward = (left − right) × up.
 */
export function facingYaw(positions, offset, leftHip, rightHip) {
  const ax = positions[offset + leftHip * 3] - positions[offset + rightHip * 3];
  const az = positions[offset + leftHip * 3 + 2] - positions[offset + rightHip * 3 + 2];
  return Math.atan2(-az, ax);
}

/** 원형 이동 평균으로 yaw를 부드럽게 한다(보행 중 골반 흔들림 제거). */
export function smoothAngles(angles, radius) {
  const n = angles.length, out = new Float32Array(n), s = new Float64Array(n + 1), c = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) { s[i + 1] = s[i] + Math.sin(angles[i]); c[i + 1] = c[i] + Math.cos(angles[i]); }
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - radius), b = Math.min(n, i + radius + 1);
    out[i] = Math.atan2(s[b] - s[a], c[b] - c[a]);
  }
  return out;
}

/** 100STYLE Frame_Cuts.csv에서 한 스타일의 유효 구간을 읽는다. 반환: { FW: [start, stop], ... } */
export function parseFrameCuts(csv, style) {
  const rows = csv.trim().split(/\r?\n/).map((line) => line.split(',').map((v) => v.trim()));
  const header = rows[0], row = rows.find((r) => r[0] === style);
  if (!row) return {};
  const cuts = {};
  header.forEach((name, k) => {
    const m = /^(.+)_START$/.exec(name);
    if (!m) return;
    const stop = header.indexOf(`${m[1]}_STOP`), a = Number(row[k]), b = Number(row[stop]);
    if (stop > 0 && Number.isInteger(a) && Number.isInteger(b) && b > a) cuts[m[1]] = [a, b];
  });
  return cuts;
}
