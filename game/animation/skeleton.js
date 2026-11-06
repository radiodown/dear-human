// 서로 다른 출처(BVH·glTF/GLB·Mixamo 등)의 뼈대를 리타겟이 쓰는 표준 관절 이름으로 맞춘다.
// 표준 이름은 100STYLE BVH 기준: Hips, Chest…, Neck, Head, Left/Right Hip·Knee·Ankle·Toe·Toe_End,
// Left/Right Collar·Shoulder·Elbow·Wrist. 기준 클립 형식(MotionClip):
// { joints:[{name,parent,offset:[x,y,z](부모→자식, 정지 자세 월드 방향, cm), end}], index, frameCount, frameTime,
//   positions: Float32Array(frames*joints*3, cm, Y-up), source }

export const REQUIRED_JOINTS = ['Hips', 'Neck', 'LeftHip', 'LeftKnee', 'LeftAnkle', 'LeftToe', 'RightHip', 'RightKnee', 'RightAnkle', 'RightToe'];
const FINGER = /(thumb|index|middle|ring|pinky|little|finger)/i;
const LIMB = [
  [/^(up_?leg|thigh|upper_?leg|hip)$/, 'Hip'],
  [/^(leg|shin|calf|lower_?leg|knee)$/, 'Knee'],
  [/^(foot|ankle)$/, 'Ankle'],
  [/^(toe_?base|toes?|ball)$/, 'Toe'],
  [/^(toe_?base|toes?|ball)_?end$/, 'Toe_End'],
  [/^(shoulder|clavicle|collar)$/, 'Collar'],
  [/^(arm|upper_?arm)$/, 'Shoulder'],
  [/^(fore_?arm|lower_?arm|elbow)$/, 'Elbow'],
  [/^(hand|wrist)$/, 'Wrist']
];
// Unreal 마네킹식 이름(neck_01, ball_leaf_l)도 받는다.
const CENTER = [[/^(hips|pelvis)$/, 'Hips'], [/^neck(_?0?1)?$/, 'Neck'], [/^head$/, 'Head'], [/^(head_?top|head)_?end$|^head_?top$/, 'Head_End']];

/** 접두사(mixamorig: 등)를 떼고 소문자·밑줄로 정리한 이름 */
export function baseName(name) { return String(name).split(/[:|]/).pop().trim(); }

/** 관절 이름을 표준 이름으로 바꾼다. 대응을 모르면 null. */
export function canonicalName(name) {
  let key = baseName(name).replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase().replace(/[\s.\-]+/g, '_');
  let side = null;
  // 앞·중간(J_Bip_L_UpperLeg)·뒤(thigh.L) 어느 위치의 좌우 표기도 읽는다.
  const front = /(?:^|_)(left|right|l|r)_(.+)$/.exec(key), back = /^(.+?)_(left|right|l|r)$/.exec(key);
  if (front) { side = front[1].startsWith('l') ? 'Left' : 'Right'; key = front[2]; }
  else if (back) { side = back[2].startsWith('l') ? 'Left' : 'Right'; key = back[1]; }
  key = key.replace(/^_+|_+$/g, '').replace(/_leaf$/, '_end');
  if (side) { for (const [re, part] of LIMB) if (re.test(key)) return side + part; return null; }
  for (const [re, part] of CENTER) if (re.test(key)) return part;
  return null;
}

function isCanonical(names) { return ['Hips', 'LeftHip', 'LeftKnee', 'LeftAnkle', 'RightHip'].every((n) => names.includes(n)); }

/**
 * 이름 정리·손가락 제거·발끝 끝점 보충·필수 관절 검사를 한다. 새 MotionClip을 돌려준다.
 */
export function normalizeSkeleton(clip) {
  const J = clip.joints.length, n = clip.frameCount, src = clip.positions;
  const original = clip.joints.map((j) => j.name);
  const canonical = isCanonical(original);
  const used = new Set();
  const names = clip.joints.map((j) => {
    let name = canonical ? j.name : canonicalName(j.name) || baseName(j.name);
    if (used.has(name)) { let k = 2; while (used.has(`${name}_${k}`)) k++; name = `${name}_${k}`; }
    used.add(name); return name;
  });
  // Hips 위의 root·Armature 같은 비해부 관절은 그리거나 리타겟하지 않는다(Hips를 루트로).
  const hips = names.indexOf('Hips');
  const underHips = (k) => { for (let j = k; j >= 0; j = clip.joints[j].parent) if (j === hips) return true; return hips < 0; };
  const keep = clip.joints.map((j, k) => underHips(k) && (!FINGER.test(original[k]) || /^(Left|Right)(Wrist|Elbow|Shoulder|Collar)$/.test(names[k])));
  const remap = new Array(J).fill(-1), joints = [];
  clip.joints.forEach((j, k) => {
    if (!keep[k]) return;
    let parent = j.parent, offset = j.offset.slice();
    while (parent >= 0 && !keep[parent]) { offset = offset.map((v, a) => v + clip.joints[parent].offset[a]); parent = clip.joints[parent].parent; }
    remap[k] = joints.length;
    joints.push({ name: names[k], parent: parent >= 0 ? remap[parent] : -1, offset, end: Boolean(j.end) || /_End$/.test(names[k]), source: original[k] });
  });
  const kept = remap.map((v, k) => (v >= 0 ? k : -1)).filter((k) => k >= 0);
  const extra = [];
  const index = Object.fromEntries(joints.map((j, k) => [j.name, k]));
  for (const side of ['Left', 'Right']) {
    const toe = index[`${side}Toe`], ankle = index[`${side}Ankle`];
    if (index[`${side}Toe_End`] === undefined && toe !== undefined && ankle !== undefined) {
      const o = joints[toe].offset.map((v) => v * 0.25);
      index[`${side}Toe_End`] = joints.length;
      joints.push({ name: `${side}Toe_End`, parent: toe, offset: o, end: true, synthetic: true, source: null });
      extra.push({ toe, ankle });
    }
  }
  const missing = REQUIRED_JOINTS.filter((name) => index[name] === undefined);
  if (missing.length) {
    const found = original.slice(0, 40).join(', ');
    throw new Error(`필수 관절을 찾지 못했습니다: ${missing.join(', ')}. 파일의 관절: ${found}${original.length > 40 ? ' …' : ''}`);
  }
  const stride = joints.length * 3, positions = new Float32Array(n * stride);
  for (let f = 0; f < n; f++) {
    kept.forEach((k, i) => { for (let a = 0; a < 3; a++) positions[f * stride + i * 3 + a] = src[f * J * 3 + k * 3 + a]; });
    extra.forEach(({ toe, ankle }, e) => {
      const i = kept.length + e;
      for (let a = 0; a < 3; a++) {
        const t = positions[f * stride + toe * 3 + a], an = positions[f * stride + ankle * 3 + a];
        positions[f * stride + i * 3 + a] = t + (t - an) * 0.25;
      }
    });
  }
  return { ...clip, joints, index, positions, renamed: !canonical };
}
