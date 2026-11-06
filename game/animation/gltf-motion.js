// glTF 2.0(.gltf/.glb) 스켈레톤 애니메이션을 고정 fps의 관절 위치(MotionClip)로 굽는다.
// 메시·재질은 읽지 않는다. 브라우저·Node 공용이며 DOM에 의존하지 않는다.

const GLB_MAGIC = 0x46546c67, CHUNK_JSON = 0x4e4f534a, CHUNK_BIN = 0x004e4942;
const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const TYPES = {
  5120: [1, (d, o) => d.getInt8(o), 127], 5121: [1, (d, o) => d.getUint8(o), 255],
  5122: [2, (d, o) => d.getInt16(o, true), 32767], 5123: [2, (d, o) => d.getUint16(o, true), 65535],
  5125: [4, (d, o) => d.getUint32(o, true), 1], 5126: [4, (d, o) => d.getFloat32(o, true), 1]
};

/** GLB 바이너리를 JSON과 BIN 청크로 나눈다. */
export function parseGLB(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  if (view.byteLength < 20 || view.getUint32(0, true) !== GLB_MAGIC) throw new Error('GLB 파일이 아닙니다(glTF 매직 없음).');
  if (view.getUint32(4, true) !== 2) throw new Error(`glTF ${view.getUint32(4, true)}.x GLB는 지원하지 않습니다. glTF 2.0만 읽습니다.`);
  const length = Math.min(view.getUint32(8, true), view.byteLength);
  let offset = 12, json = null, bin = null;
  while (offset + 8 <= length) {
    const size = view.getUint32(offset, true), type = view.getUint32(offset + 4, true), start = offset + 8;
    if (type === CHUNK_JSON) json = JSON.parse(new TextDecoder().decode(new Uint8Array(arrayBuffer, start, size)));
    else if (type === CHUNK_BIN && !bin) bin = arrayBuffer.slice(start, start + size);
    offset = start + size + ((4 - (size % 4)) % 4);
  }
  if (!json) throw new Error('GLB에 JSON 청크가 없습니다.');
  return { json, bin };
}

function decodeDataUri(uri) {
  const m = /^data:[^,]*?(;base64)?,(.*)$/s.exec(uri);
  if (!m) throw new Error('지원하지 않는 data URI입니다.');
  if (!m[1]) return new TextEncoder().encode(decodeURIComponent(m[2])).buffer;
  const text = atob(m[2]), bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
  return bytes.buffer;
}

async function loadBuffers(json, bin, resolveUri) {
  return Promise.all((json.buffers || []).map(async (buffer, i) => {
    if (buffer.uri === undefined) { if (i === 0 && bin) return bin; throw new Error(`buffer ${i}의 데이터가 없습니다.`); }
    if (buffer.uri.startsWith('data:')) return decodeDataUri(buffer.uri);
    if (!resolveUri) throw new Error(`외부 버퍼 ${buffer.uri}가 필요합니다. .gltf와 함께 선택해 주세요.`);
    const data = await resolveUri(decodeURIComponent(buffer.uri));
    if (!data) throw new Error(`외부 버퍼 ${buffer.uri}를 찾지 못했습니다. .gltf와 함께 선택해 주세요.`);
    return data;
  }));
}

function readAccessor(json, buffers, index) {
  const acc = json.accessors?.[index];
  if (!acc) throw new Error(`accessor ${index}가 없습니다.`);
  if (acc.sparse) throw new Error('sparse accessor는 아직 지원하지 않습니다.');
  const comps = COMPONENTS[acc.type], type = TYPES[acc.componentType];
  if (!comps || !type) throw new Error(`지원하지 않는 accessor 형식: ${acc.type}/${acc.componentType}`);
  const out = new Float32Array(acc.count * comps);
  if (acc.bufferView === undefined) return out;
  const bv = json.bufferViews[acc.bufferView], buffer = buffers[bv.buffer];
  const view = new DataView(buffer, (bv.byteOffset || 0) + (acc.byteOffset || 0));
  const [size, read, max] = type, stride = bv.byteStride || size * comps;
  const scale = acc.normalized ? max : 1;
  for (let i = 0; i < acc.count; i++) for (let c = 0; c < comps; c++) {
    const v = read(view, i * stride + c * size);
    out[i * comps + c] = acc.normalized ? Math.max(v / scale, -1) : v;
  }
  return out;
}

// --- 4x4 열 우선 행렬 ---
function trs(t, r, s) {
  const [x, y, z, w] = r, [sx, sy, sz] = s;
  return [
    (1 - 2 * (y * y + z * z)) * sx, (2 * (x * y + w * z)) * sx, (2 * (x * z - w * y)) * sx, 0,
    (2 * (x * y - w * z)) * sy, (1 - 2 * (x * x + z * z)) * sy, (2 * (y * z + w * x)) * sy, 0,
    (2 * (x * z + w * y)) * sz, (2 * (y * z - w * x)) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    t[0], t[1], t[2], 1
  ];
}
function mul(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}
function slerp(a, b, t) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], s = 1;
  if (d < 0) { d = -d; s = -1; }
  let k0 = 1 - t, k1 = t;
  if (d < 0.9995) { const th = Math.acos(d), sn = Math.sin(th); k0 = Math.sin((1 - t) * th) / sn; k1 = Math.sin(t * th) / sn; }
  const q = [0, 1, 2, 3].map((i) => k0 * a[i] + s * k1 * b[i]), l = Math.hypot(...q) || 1;
  return q.map((v) => v / l);
}

/** 한 채널 샘플러를 시간 t(초)에서 평가한다. */
export function sampleChannel(sampler, t) {
  const { input, output, interpolation, size, rotation } = sampler, n = input.length;
  const cubic = interpolation === 'CUBICSPLINE', at = (k, part = 1) => { const o = cubic ? (k * 3 + part) * size : k * size; return Array.from(output.subarray(o, o + size)); };
  if (n === 1 || t <= input[0]) return at(0);
  if (t >= input[n - 1]) return at(n - 1);
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (input[mid] <= t) lo = mid; else hi = mid; }
  const dt = input[hi] - input[lo], u = dt > 0 ? (t - input[lo]) / dt : 0;
  if (interpolation === 'STEP') return at(lo);
  if (cubic) {
    const u2 = u * u, u3 = u2 * u, p0 = at(lo), m0 = at(lo, 2), p1 = at(hi), m1 = at(hi, 0);
    const v = p0.map((_, i) => (2 * u3 - 3 * u2 + 1) * p0[i] + (u3 - 2 * u2 + u) * dt * m0[i] + (-2 * u3 + 3 * u2) * p1[i] + (u3 - u2) * dt * m1[i]);
    if (rotation) { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); }
    return v;
  }
  const a = at(lo), b = at(hi);
  return rotation ? slerp(a, b, u) : a.map((v, i) => v + (b[i] - v) * u);
}

/** 파일 안 애니메이션 목록 */
export function listAnimations(json) {
  return (json.animations || []).map((a, i) => {
    const duration = Math.max(0, ...a.samplers.map((s) => json.accessors[s.input]?.max?.[0] ?? 0));
    return { index: i, name: a.name || `animation ${i}`, channels: a.channels.length, duration };
  });
}

/**
 * glTF 애니메이션을 MotionClip으로 굽는다(아직 이름 정리 전). 단위는 다리 길이로 m/cm를 판별해 cm로 맞춘다.
 * options: { animation=0, fps=60, resolveUri(uri)→ArrayBuffer }
 */
export async function bakeGltfMotion({ json, bin = null }, { animation = 0, fps = 60, resolveUri = null } = {}) {
  if (!json?.asset?.version?.startsWith('2')) throw new Error('glTF 2.0 파일만 지원합니다.');
  const anim = json.animations?.[animation];
  if (!anim) throw new Error(json.animations?.length ? `애니메이션 ${animation}이 없습니다.` : '이 파일에는 애니메이션이 없습니다. 뼈대 애니메이션이 포함된 glTF/GLB가 필요합니다.');
  const buffers = await loadBuffers(json, bin, resolveUri);
  const nodes = json.nodes || [], parentOf = new Array(nodes.length).fill(-1);
  nodes.forEach((node, i) => (node.children || []).forEach((c) => { parentOf[c] = i; }));

  const skins = json.skins || [];
  const skin = skins.reduce((best, s) => (!best || s.joints.length > best.joints.length ? s : best), null);
  const targeted = new Set(anim.channels.map((c) => c.target.node).filter((v) => v !== undefined));
  let jointSet;
  if (skin) jointSet = new Set(skin.joints);
  else {
    jointSet = new Set();
    const add = (i) => { if (jointSet.has(i) || nodes[i].mesh !== undefined) return; jointSet.add(i); (nodes[i].children || []).forEach(add); };
    targeted.forEach(add);
  }
  if (!jointSet.size) throw new Error('뼈대(skin joints 또는 애니메이션 대상 노드)를 찾지 못했습니다.');
  // 부모 → 자식 순서
  const depth = (i) => { let d = 0; for (let p = parentOf[i]; p >= 0; p = parentOf[p]) d++; return d; };
  const order = [...jointSet].sort((a, b) => depth(a) - depth(b) || a - b);
  const needed = new Set();
  order.forEach((i) => { for (let p = i; p >= 0; p = parentOf[p]) needed.add(p); });
  const evalOrder = [...needed].sort((a, b) => depth(a) - depth(b) || a - b);

  const samplers = new Map();
  for (const channel of anim.channels) {
    const { node, path } = channel.target;
    if (node === undefined || !['translation', 'rotation', 'scale'].includes(path) || !needed.has(node)) continue;
    const s = anim.samplers[channel.sampler];
    const size = path === 'rotation' ? 4 : 3;
    samplers.set(`${node}:${path}`, { input: readAccessor(json, buffers, s.input), output: readAccessor(json, buffers, s.output), interpolation: s.interpolation || 'LINEAR', size, rotation: path === 'rotation' });
  }
  if (!samplers.size) throw new Error('뼈대 노드에 연결된 translation/rotation/scale 애니메이션 채널이 없습니다.');
  let duration = 0;
  for (const s of samplers.values()) duration = Math.max(duration, s.input[s.input.length - 1]);
  const frameCount = Math.max(1, Math.round(duration * fps) + 1);

  const rest = (i) => {
    const n = nodes[i];
    if (n.matrix) return { matrix: n.matrix };
    return { t: n.translation || [0, 0, 0], r: n.rotation || [0, 0, 0, 1], s: n.scale || [1, 1, 1] };
  };
  const worldAt = (time) => {
    const world = new Map();
    for (const i of evalOrder) {
      const base = rest(i);
      let local;
      if (base.matrix) local = base.matrix;
      else {
        const t = samplers.get(`${i}:translation`), r = samplers.get(`${i}:rotation`), s = samplers.get(`${i}:scale`);
        local = time === null ? trs(base.t, base.r, base.s) : trs(t ? sampleChannel(t, time) : base.t, r ? sampleChannel(r, time) : base.r, s ? sampleChannel(s, time) : base.s);
      }
      world.set(i, parentOf[i] >= 0 && world.has(parentOf[i]) ? mul(world.get(parentOf[i]), local) : local);
    }
    return world;
  };

  const restWorld = worldAt(null);
  const pos = (m) => [m[12], m[13], m[14]];
  const index = new Map(order.map((n, k) => [n, k]));
  const joints = order.map((n) => {
    let parent = parentOf[n];
    while (parent >= 0 && !index.has(parent)) parent = parentOf[parent];
    const p = pos(restWorld.get(n)), q = parent >= 0 ? pos(restWorld.get(parent)) : [0, 0, 0];
    return { name: nodes[n].name || `node_${n}`, parent: parent >= 0 ? index.get(parent) : -1, offset: parent >= 0 ? p.map((v, a) => v - q[a]) : p, end: !(nodes[n].children || []).some((c) => index.has(c)), node: n };
  });
  const J = joints.length, positions = new Float32Array(frameCount * J * 3);
  for (let f = 0; f < frameCount; f++) {
    const world = worldAt(Math.min(duration, f / fps));
    order.forEach((n, k) => { const m = world.get(n); positions.set([m[12], m[13], m[14]], (f * J + k) * 3); });
  }
  return { joints, frameCount, frameTime: 1 / fps, positions, source: { kind: 'gltf', animation: anim.name || `animation ${animation}`, duration, skinned: Boolean(skin) } };
}

/** 다리 길이(엉덩이→무릎→발목)로 단위를 판별해 cm로 맞춘다. normalizeSkeleton 이후에 호출한다. */
export function toCentimeters(clip) {
  const I = clip.index, len = (a, b) => Math.hypot(...clip.joints[I[b]].offset);
  const leg = len('LeftHip', 'LeftKnee') + len('LeftKnee', 'LeftAnkle');
  if (!(leg > 0)) throw new Error('다리 길이를 측정할 수 없습니다.');
  // 사람 다리(약 0.7–1.0m)를 기준으로 m/cm/mm를 고른다.
  const unit = leg < 5 ? 100 : leg < 500 ? 1 : 0.1;
  if (unit === 1) return { ...clip, unit: 'cm' };
  const positions = clip.positions.map((v) => v * unit);
  return { ...clip, positions, joints: clip.joints.map((j) => ({ ...j, offset: j.offset.map((v) => v * unit) })), unit: unit === 100 ? 'm' : 'mm' };
}
