// Saltline upstream, extracted from the preserved bundle. See ../README.md.
function sa(i, e = !1) {
        let t = i[0].index !== null,
            n = new Set(Object.keys(i[0].attributes)),
            s = new Set(Object.keys(i[0].morphAttributes)),
            o = {},
            r = {},
            a = i[0].morphTargetsRelative,
            l = new nt,
            c = 0;
        for (let u = 0; u < i.length; ++u) {
            let h = i[u],
                f = 0;
            if (t !== (h.index !== null)) return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index " + u + ". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."), null;
            for (let p in h.attributes) {
                if (!n.has(p)) return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index " + u + '. All geometries must have compatible attributes; make sure "' + p + '" attribute exists among all geometries, or in none of them.'), null;
                o[p] === void 0 && (o[p] = []), o[p].push(h.attributes[p]), f++
            }
            if (f !== n.size) return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index " + u + ". Make sure all geometries have the same number of attributes."), null;
            if (a !== h.morphTargetsRelative) return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index " + u + ". .morphTargetsRelative must be consistent throughout all geometries."), null;
            for (let p in h.morphAttributes) {
                if (!s.has(p)) return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index " + u + ".  .morphAttributes must be consistent throughout all geometries."), null;
                r[p] === void 0 && (r[p] = []), r[p].push(h.morphAttributes[p])
            }
            if (e) {
                let p;
                if (t) p = h.index.count;
                else if (h.attributes.position !== void 0) p = h.attributes.position.count;
                else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index " + u + ". The geometry must have either an index or a position attribute"), null;
                l.addGroup(c, p, u), c += p
            }
        }
        if (t) {
            let u = 0,
                h = [];
            for (let f = 0; f < i.length; ++f) {
                let p = i[f].index;
                for (let d = 0; d < p.count; ++d) h.push(p.getX(d) + u);
                u += i[f].attributes.position.count
            }
            l.setIndex(h)
        }
        for (let u in o) {
            let h = Ly(o[u]);
            if (!h) return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the " + u + " attribute."), null;
            l.setAttribute(u, h)
        }
        for (let u in r) {
            let h = r[u][0].length;
            if (h === 0) break;
            l.morphAttributes = l.morphAttributes || {}, l.morphAttributes[u] = [];
            for (let f = 0; f < h; ++f) {
                let p = [];
                for (let v = 0; v < r[u].length; ++v) p.push(r[u][v][f]);
                let d = Ly(p);
                if (!d) return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the " + u + " morphAttribute."), null;
                l.morphAttributes[u].push(d)
            }
        }
        return l
    }

function Ly(i) {
        let e, t, n, s = -1,
            o = 0;
        for (let c = 0; c < i.length; ++c) {
            let u = i[c];
            if (e === void 0 && (e = u.array.constructor), e !== u.array.constructor) return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."), null;
            if (t === void 0 && (t = u.itemSize), t !== u.itemSize) return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."), null;
            if (n === void 0 && (n = u.normalized), n !== u.normalized) return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."), null;
            if (s === -1 && (s = u.gpuType), s !== u.gpuType) return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."), null;
            o += u.count * t
        }
        let r = new e(o),
            a = new et(r, t, n),
            l = 0;
        for (let c = 0; c < i.length; ++c) {
            let u = i[c];
            if (u.isInterleavedBufferAttribute) {
                let h = l / t;
                for (let f = 0, p = u.count; f < p; f++)
                    for (let d = 0; d < t; d++) {
                        let v = u.getComponent(f, d);
                        a.setComponent(f + h, d, v)
                    }
            } else r.set(u.array, l);
            l += u.count * t
        }
        return s !== void 0 && (a.gpuType = s), a
    }

var oa = new W;

function $e(i, e, t, n = "center") {
        let s = new un(i, e, t),
            o = s.attributes.uv,
            r = s.attributes.position,
            a = s.attributes.normal;
        for (let l = 0; l < o.count; l++) {
            let c = Math.abs(a.getX(l)),
                u = Math.abs(a.getY(l)),
                h = r.getX(l),
                f = r.getY(l),
                p = r.getZ(l);
            c > .5 ? o.setXY(l, p, f) : u > .5 ? o.setXY(l, h, p) : o.setXY(l, h, f)
        }
        return n === "bottom" && s.translate(0, e / 2, 0), s
    }

function Wi(i, e, t, n = .02, s = "center") {
        n = Math.min(n, i / 2 - 1e-4, e / 2 - 1e-4, t / 2 - 1e-4);
        let o = new un(i, e, t, 3, 3, 3),
            r = o.attributes.position,
            a = o.attributes.normal,
            l = o.attributes.uv,
            c = i / 2,
            u = e / 2,
            h = t / 2,
            f = (p, d) => {
                let v = Math.abs(p),
                    g = Math.sign(p);
                return v > d - 1e-5 ? g * d : g * (d - n)
            };
        for (let p = 0; p < r.count; p++) {
            let d = f(r.getX(p), c),
                v = f(r.getY(p), u),
                g = f(r.getZ(p), h),
                x = Math.max(-(c - n), Math.min(c - n, d)),
                y = Math.max(-(u - n), Math.min(u - n, v)),
                b = Math.max(-(h - n), Math.min(h - n, g));
            if (oa.set(d - x, v - y, g - b), oa.lengthSq() > 1e-10) {
                oa.normalize();
                let M = a.getX(p),
                    E = a.getY(p),
                    w = a.getZ(p);
                (Math.abs(d) > c - 1e-5 ? 1 : 0) + (Math.abs(v) > u - 1e-5 ? 1 : 0) + (Math.abs(g) > h - 1e-5 ? 1 : 0) >= 2 ? (d = x + oa.x * n, v = y + oa.y * n, g = b + oa.z * n, a.setXYZ(p, oa.x, oa.y, oa.z)) : a.setXYZ(p, M, E, w)
            }
            r.setXYZ(p, d, v, g);
            let m = Math.abs(a.getX(p)),
                A = Math.abs(a.getY(p)),
                _ = Math.abs(a.getZ(p));
            m >= A && m >= _ ? l.setXY(p, g, v) : A >= m && A >= _ ? l.setXY(p, d, g) : l.setXY(p, d, v)
        }
        return s === "bottom" && o.translate(0, e / 2, 0), o
    }

function ot(i, e, t, n = 16, s = !1, o = "center") {
        let r = new Ys(i, e, t, n, 1, s),
            a = r.attributes.uv,
            l = r.attributes.position,
            c = r.attributes.normal,
            u = Math.PI * (i + e);
        for (let h = 0; h < a.count; h++) Math.abs(c.getY(h)) > .9 ? a.setXY(h, l.getX(h), l.getZ(h)) : a.setXY(h, a.getX(h) * u, l.getY(h));
        return o === "bottom" && r.translate(0, t / 2, 0), r
    }

function Fn(i, e = .03, t = 8, n = !1, s = 0) {
        let o = i.map(h => h.isVector3 ? h : new W(h[0], h[1], h[2])),
            r = new Jr(o, n, "catmullrom", s),
            a = r.getLength(),
            l = Math.max(2, Math.ceil(a / Math.max(.08, e * 3))),
            c = new Kr(r, Math.min(l, 400), e, t, n),
            u = c.attributes.uv;
        for (let h = 0; h < u.count; h++) u.setXY(h, u.getX(h) * a, u.getY(h) * Math.PI * 2 * e);
        return c
    }

var ky = new Ye,
        Fy = new Lt,
        Uy = new In,
        Ny = new W,
        Fg = new W;

function Dc(i, {
        p: e = [0, 0, 0],
        r: t = [0, 0, 0],
        s: n = 1
    } = {}) {
        return Uy.set(t[0], t[1], t[2]), Fy.setFromEuler(Uy), Ny.set(e[0], e[1], e[2]), typeof n == "number" ? Fg.set(n, n, n) : Fg.set(n[0], n[1], n[2]), ky.compose(Ny, Fy, Fg), i.applyMatrix4(ky), i
    }

function Lc(i, e) {
        let t = i.attributes.position,
            n = t.count,
            s = new Float32Array(n * 3);
        for (let o = 0; o < n; o++) {
            let r = typeof e == "function" ? e(t.getX(o), t.getY(o), t.getZ(o)) : e;
            s[o * 3] = r[0], s[o * 3 + 1] = r[1], s[o * 3 + 2] = r[2]
        }
        return i.setAttribute("color", new et(s, 3)), i
    }

function Ii(i) {
        let e = i.filter(Boolean).map(l => (l.attributes.uv || l.setAttribute("uv", new et(new Float32Array(l.attributes.position.count * 2), 2)), l.attributes.normal || l.computeVertexNormals(), l));
        if (!e.length) return new nt;
        let t = e.some(l => l.attributes.color),
            n = e.map(l => {
                let c = (l.index, l);
                if (t && !c.attributes.color) {
                    let u = new Float32Array(c.attributes.position.count * 3).fill(1);
                    c.setAttribute("color", new et(u, 3))
                }
                for (let u of Object.keys(c.attributes))["position", "normal", "uv", "color"].includes(u) || c.deleteAttribute(u);
                return c
            }),
            s = n.every(l => l.index),
            o = n.every(l => !l.index),
            r = s || o ? n : n.map(l => l.index ? l.toNonIndexed() : l);
        return sa(r, !1) || new nt
    }

function By(i, {
        castShadow: e = !0,
        receiveShadow: t = !0
    } = {}) {
        i.updateMatrixWorld(!0);
        let n = new Map,
            s = [];
        i.traverse(r => {
            if (!r.isMesh) return;
            let a = r,
                l = !1;
            for (; a;) {
                if (a.userData && a.userData.noMerge) {
                    l = !0;
                    break
                }
                a = a.parent
            }
            if (l || r.isSkinnedMesh || r.isInstancedMesh || Array.isArray(r.material)) {
                s.push(r);
                return
            }
            let c = r.material.uuid + (r.castShadow ? "c" : "n") + (r.receiveShadow ? "r" : "n") + ":" + r.layers.mask;
            n.has(c) || n.set(c, {
                mat: r.material,
                geos: [],
                cast: r.castShadow,
                recv: r.receiveShadow,
                layers: r.layers.mask
            });
            let u = r.geometry.clone();
            u.applyMatrix4(r.matrixWorld), n.get(c).geos.push(u)
        });
        let o = new wt;
        for (let r of n.values()) {
            let a = new Qe(Ii(r.geos), r.mat);
            a.castShadow = r.cast && e, a.receiveShadow = r.recv && t, a.layers.mask = r.layers, o.add(a)
        }
        for (let r of s) {
            r.updateMatrixWorld(!0);
            let a = r.matrixWorld.clone();
            o.add(r), r.matrix.copy(a), r.matrix.decompose(r.position, r.quaternion, r.scale)
        }
        return o
    }

function Qi(i, e, {
        cast: t = !0,
        recv: n = !0
    } = {}) {
        let s = new Qe(i, e);
        return s.castShadow = t, s.receiveShadow = n, s
    }

var Vg = {};

br(Vg, {
        create: () => Hg,
        showcase: () => sA
    });

var Ug = `
uniform sampler2D tNoise;
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return texture2D(tNoise, (i + f + 0.5) / 256.0).r; }
float fbm5(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * n2(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 17.3; a *= 0.5; } return s / 0.96875; }
float fbm3(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++){ s += a * n2(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 17.3; a *= 0.5; } return s / 0.875; }
`,
        Ng = `
uniform vec3 uSunDir, uZen, uHor, uHorAway, uSunCol;
float skyToSun(vec3 d){ return clamp(dot(normalize(d.xz + vec2(1e-5)), normalize(uSunDir.xz)) * 0.5 + 0.5, 0.0, 1.0); }
vec3 horizonColor(vec3 d){
  float ts = skyToSun(d);
  vec3 c = mix(uHorAway, uHorAway * 1.25 + vec3(0.05, 0.03, 0.02), smoothstep(0.2, 0.75, ts));
  c = mix(c, uHor * vec3(1.9, 1.55, 1.2), pow(ts, 6.0));
  c = mix(c, vec3(1.0, 0.60, 0.24) * 3.4, pow(ts, 34.0));
  return c;
}
`;

function Oy() {
        let e = new Uint8Array(262144),
            t = 2654435769,
            n = () => (t ^= t << 13, t >>>= 0, t ^= t >>> 17, t ^= t << 5, t >>>= 0, t / 4294967296);
        for (let o = 0; o < 256 * 256; o++) e[o * 4] = n() * 256, e[o * 4 + 1] = n() * 256, e[o * 4 + 2] = n() * 256, e[o * 4 + 3] = 255;
        let s = new ui(e, 256, 256, _n, yi);
        return s.wrapS = s.wrapT = Is, s.magFilter = s.minFilter = Zt, s.generateMipmaps = !1, s.colorSpace = hi, s.needsUpdate = !0, s
    }

var H6 = `
// SALTLINE_SKY
precision highp float;
varying vec3 vDir;
uniform float uTime, uEnv, uFlash;
uniform vec3 uFlashDir;
${Ug}
${Ng}

void main(){
  vec3 d = normalize(vDir);
  float h = max(d.y, 0.0);
  float mu = dot(d, uSunDir);
  float s = max(mu, 0.0);
  float ts = skyToSun(d);

  // ---- clear sky behind / below the deck ----
  vec3 hc = horizonColor(d);
  vec3 midC = mix(vec3(0.15, 0.24, 0.36), vec3(0.72, 0.50, 0.34), pow(ts, 3.0));   // pale band above the fire
  vec3 clearC = mix(hc, midC, smoothstep(0.0, 0.17, h));
  clearC = mix(clearC, vec3(0.085, 0.145, 0.24), smoothstep(0.10, 0.5, h));
  // aureole (mie glow round the sun)
  clearC += uSunCol * vec3(1.0, 0.86, 0.68) * (pow(s, 8.0) * 0.14 + pow(s, 64.0) * 0.55 + pow(s, 600.0) * 2.2 + pow(s, 6000.0) * 14.0);

  // ---- cloud deck ----
  vec2 cuv = d.xz / (h + 0.10) * vec2(0.62, 0.95);          // rolls of cloud run roughly east-west
  vec2 wind = vec2(-0.012, 0.004) * uTime;
  vec2 q = cuv + wind;
  float warp = fbm3(q * 0.45 + 7.1);
  vec2 qq = q + (warp - 0.5) * 1.3;
  float dens = fbm5(qq);
  // rippled underside (ridged detail), fading with distance so the horizon does not alias
  float ridg = 1.0 - abs(2.0 * fbm3(qq * 3.1 + 5.0) - 1.0);
  dens = dens * 0.86 + (ridg - 0.6) * 0.16 * smoothstep(0.03, 0.25, h);
  float big = n2(q * 0.19 + 3.7);
  float body = dens * 0.74 + big * 0.36;
  float cov = smoothstep(0.31, 0.50, body);
  // the deck ends above the eastern horizon: clear, burning gap toward the sun; almost down to the sea elsewhere
  float edge = mix(0.030, 0.285, pow(ts, 1.7));
  float rag = (n2(q * 0.9 + 11.0) - 0.5) * 0.16 + (dens - 0.5) * 0.10;
  float deck = smoothstep(edge - 0.035, edge + 0.11, h + rag * (0.35 + ts));
  cov *= deck;
  // the sun always burns through a ragged hole in the gap, never sits behind solid cloud
  float hole = smoothstep(0.972, 0.9985, mu + (dens - 0.5) * 0.012);
  cov *= 1.0 - 0.93 * hole;
  // thin scud drifting in the gap (veils the sun a little, catches fire)
  float scud = smoothstep(0.55, 0.85, fbm3(q * vec2(0.55, 1.9) + 31.0)) * (1.0 - deck) * smoothstep(0.02, 0.10, h) * 0.55 * (1.0 - 0.8 * hole);

  // lighting: density gradient toward the sun = self shadowing of the underside relief
  vec2 sd = normalize(uSunDir.xz);
  float densS = fbm5(qq + sd * 0.22);
  float relief = clamp((dens - densS) * 4.5 + 0.5, 0.0, 1.0);
  float thick = smoothstep(0.40, 0.72, body);
  vec3 cool = mix(vec3(0.155, 0.195, 0.255), vec3(0.030, 0.042, 0.064), thick);       // slate, darker where the deck is thick
  cool *= 0.55 + 0.9 * relief * relief;
  cool += vec3(0.07, 0.10, 0.15) * pow(1.0 - thick, 3.0);                             // thin spots let cold light through
  // warm light raking the underside from the gap: strongest near the sun and near the deck edge
  float nearSun = pow(ts, 5.0) * exp(-max(h - edge, 0.0) * 4.5) * 0.9 + pow(s, 7.0) * 0.9;
  vec3 warm = (uHor * vec3(1.30, 0.66, 0.40)) * nearSun * (0.05 + 2.2 * relief * relief * relief) * 1.15;
  // burning rim where cloud thins at the edge of the gap
  float rim = cov * (1.0 - cov) * 4.0;
  warm += uSunCol * rim * pow(ts, 4.0) * (0.5 + 1.6 * pow(s, 6.0)) * (1.0 - 0.85 * hole);
  vec3 cloudC = cool + warm;
  // sheet lightning inside the deck
  float fl = uFlash * pow(max(dot(d, uFlashDir), 0.0), 5.0);
  cloudC += vec3(0.55, 0.68, 1.0) * fl * (0.4 + 2.2 * dens * dens);
  // aerial perspective: far cloud melts into the horizon colour
  cloudC = mix(cloudC, hc * 0.55 + cloudC * 0.45, exp(-h * 11.0));

  vec3 col = mix(clearC, cloudC, cov * 0.985);
  vec3 scudC = mix(vec3(0.10, 0.11, 0.14), uHor * 1.5, pow(ts, 3.0)) + uSunCol * pow(s, 24.0) * 2.0;
  col = mix(col, scudC, scud);

  // sun disk (not in the environment capture: the directional light is the sun there)
  float veil = (1.0 - cov * 0.92) * (1.0 - scud * 0.7);
  float disk = smoothstep(0.999905, 0.999955, mu);
  col += vec3(1.0, 0.80, 0.52) * disk * 110.0 * veil * (1.0 - uEnv);

  // below the horizon: sea haze / ground bounce (mostly hidden by geometry)
  if (d.y < 0.0) {
    float t = clamp(-d.y * 5.0, 0.0, 1.0);
    vec3 low = mix(uHorAway * 0.42, vec3(0.060, 0.064, 0.070), uEnv);
    low += uHor * 0.55 * pow(ts, 6.0) * exp(d.y * 7.0);
    col = mix(hc + uSunCol * pow(s, 48.0) * 1.5, low, smoothstep(0.0, 1.0, t));
  }
  // keep the PMREM free of fireflies
  col = mix(col, min(col, vec3(6.0)), uEnv);
  gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
}`,
        V6 = `
varying vec3 vDir;
void main(){ vDir = position; vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position = p.xyww; }`;

function W6(i) {
        return {
            tNoise: {
                value: i
            },
            uTime: {
                value: 0
            },
            uEnv: {
                value: 0
            },
            uFlash: {
                value: 0
            },
            uFlashDir: {
                value: new W(-.5, .5, -.7).normalize()
            },
            uSunDir: {
                value: Mn.dir.clone()
            },
            uZen: {
                value: en.zenith.clone()
            },
            uHor: {
                value: en.horizon.clone()
            },
            uHorAway: {
                value: en.horizonAway.clone()
            },
            uSunCol: {
                value: Mn.color.clone()
            }
        }
    }

function Hy(i) {
        let e = new zn({
                name: "saltline-sky",
                side: Ki,
                depthWrite: !1,
                depthTest: !0,
                fog: !1,
                toneMapped: !1,
                uniforms: W6(i),
                vertexShader: V6,
                fragmentShader: H6
            }),
            t = new un(2, 2, 2),
            n = new Qe(t, e);
        return n.name = "sky", n.frustumCulled = !1, n.renderOrder = -1e3, n.castShadow = !1, n.receiveShadow = !1, n.matrixAutoUpdate = !1, {
            mesh: n,
            material: e,
            geometry: t
        }
    }

function Vy(i, e) {
        let t = new ia(i),
            n = e.material.clone();
        n.uniforms.tNoise.value = e.material.uniforms.tNoise.value, n.uniforms.uEnv.value = 1;
        let s = new ir,
            o = new Qe(e.geometry, n);
        o.frustumCulled = !1, s.add(o);
        let r = t.fromScene(s, 0, .1, 100);
        return n.dispose(), t.dispose(), r
    }

var Wy = "// SALTLINE_SHADOW",
        xf = null;

function Gy(i, e, t, n, s) {
        let o = Mn.dir.clone().normalize(),
            r = e.clone().add(t).multiplyScalar(.5);
        i.target.position.copy(r), i.position.copy(r).addScaledVector(o, 200), i.updateMatrixWorld(!0), i.target.updateMatrixWorld(!0);
        let a = new Ye().lookAt(i.position, r, new W(0, 1, 0));
        a.setPosition(i.position), a.invert();
        let l = new W,
            c = 1 / 0,
            u = -1 / 0,
            h = 1 / 0,
            f = -1 / 0,
            p = 1 / 0,
            d = -1 / 0,
            v = (y, b, m) => {
                for (let A = 0; A < 8; A++) l.set(A & 1 ? b.x : y.x, A & 2 ? b.y : y.y, A & 4 ? b.z : y.z).applyMatrix4(a), m(l)
            };
        v(e, t, y => {
            c = Math.min(c, y.x), u = Math.max(u, y.x), h = Math.min(h, y.y), f = Math.max(f, y.y), p = Math.min(p, -y.z), d = Math.max(d, -y.z)
        }), v(n, s, y => {
            p = Math.min(p, -y.z)
        });
        let g = i.shadow.camera,
            x = 1;
        return g.left = c - x, g.right = u + x, g.bottom = h - x, g.top = f + x, g.near = Math.max(1, p - 4), g.far = d + 4, g.updateProjectionMatrix(), {
            width: g.right - g.left,
            height: g.top - g.bottom,
            depth: g.far - g.near
        }
    }

function qy(i, {
        taps: e = 16,
        searchTaps: t = 8
    } = {}) {
        let n = It.shadowmap_pars_fragment;
        xf === null && (xf = n);
        let s = xf,
            o = s.indexOf("float getShadow("),
            r = s.indexOf("vec2 cubeToUV"),
            a = s.lastIndexOf("// cubeToUV()", r);
        if (a < o && (a = r), o < 0 || r < 0 || r < o) return console.warn("[render] soft shadows: unexpected Three shader chunk layout, keeping stock PCF"), !1;
        let l = `
	${Wy}
	const vec2 SL_FRUSTUM = vec2( ${i.width.toFixed(3)}, ${i.height.toFixed(3)} );   // metres across the shadow map
	const float SL_DEPTH = ${i.depth.toFixed(3)};                                       // metres across the depth range
	float slIGN( vec2 p ) { return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) ); }
	vec2 slVogel( int i, int n, float phi ) {
		float r = sqrt( ( float( i ) + 0.5 ) / float( n ) );
		float th = float( i ) * 2.39996323 + phi;
		return r * vec2( cos( th ), sin( th ) );
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		shadowCoord.xyz /= shadowCoord.w;
		vec3 sc = shadowCoord.xyz;
		vec3 dx = dFdx( sc ), dy = dFdy( sc );
		bool inFrustum = sc.x >= 0.0 && sc.x <= 1.0 && sc.y >= 0.0 && sc.y <= 1.0;
		if ( ! ( inFrustum && sc.z <= 1.0 ) ) return 1.0;
		// receiver plane depth bias: depth gradient of the receiver in shadow-map uv space
		float det = dx.x * dy.y - dx.y * dy.x;
		vec2 dz = vec2( 0.0 );
		if ( abs( det ) > 1e-12 ) dz = vec2( dy.y * dx.z - dx.y * dy.z, dx.x * dy.z - dy.x * dx.z ) / det;
		vec2 texel = 1.0 / shadowMapSize;
		float maxSlope = 0.0030 / max( texel.x, texel.y );      // never bias more than ~0.6 m per kernel
		dz = clamp( dz, vec2( - maxSlope ), vec2( maxSlope ) );
		float zr = sc.z + shadowBias - ( abs( dz.x ) * texel.x + abs( dz.y ) * texel.y ) * 0.35;
		float phi = slIGN( gl_FragCoord.xy ) * 6.2831853;
		// --- blocker search ---
		vec2 searchR = ( 0.55 * shadowRadius ) / SL_FRUSTUM;     // metres -> uv
		float blk = 0.0, nb = 0.0;
		for ( int i = 0; i < ${t}; i ++ ) {
			vec2 o = slVogel( i, ${t}, phi ) * searchR;
			float d = unpackRGBAToDepth( texture2D( shadowMap, sc.xy + o ) );
			float z = zr + dot( o, dz );
			if ( d < z ) { blk += d; nb += 1.0; }
		}
		if ( nb < 0.5 ) return 1.0;
		float avg = blk / nb;
		// --- penumbra: grows with blocker distance (sun half-angle scaled up for look) ---
		float distM = max( zr - avg, 0.0 ) * SL_DEPTH;
		float penM = clamp( distM * 0.022 * shadowRadius, 0.012 * shadowRadius, 0.60 * shadowRadius );
		vec2 filtR = max( vec2( penM ) / SL_FRUSTUM, texel * 1.25 );
		float lit = 0.0;
		for ( int i = 0; i < ${e}; i ++ ) {
			vec2 o = slVogel( i, ${e}, phi + 1.7 ) * filtR;
			float d = unpackRGBAToDepth( texture2D( shadowMap, sc.xy + o ) );
			lit += step( zr + dot( o, dz ), d );
		}
		lit /= float( ${e} );
		// fade to lit at the very edge of the map so the frustum border never shows
		vec2 e = min( sc.xy, 1.0 - sc.xy );
		lit = mix( 1.0, lit, smoothstep( 0.0, 0.02, min( e.x, e.y ) ) );
		return mix( 1.0, lit, shadowIntensity );
	}

	`;
        return It.shadowmap_pars_fragment = s.slice(0, o) + l + s.slice(a), !0
    }

function Xy() {
        xf !== null && (It.shadowmap_pars_fragment = xf)
    }

var Yy = Wy;

var Bg = "// SALTLINE_POST",
        n1 = "0.05",
        Zy = "0.05",
        G6 = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
        Js = `
varying vec2 vUv;
float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
`,
        Og = `
uniform sampler2D tAdapt; uniform float uExposure, uKey, uMinE, uMaxE, uAuto;
float slExposure(){ float a = texture2D(tAdapt, vec2(0.5)).r; return uExposure * mix(1.0, clamp(pow(uKey / max(a, 1e-4), 0.85), uMinE, uMaxE), uAuto); }
`,
        q6 = `${Js}
uniform sampler2D tDepth;
void main(){ gl_FragDepth = texture2D(tDepth, vUv).r; gl_FragColor = vec4(0.0); }`,
        X6 = `${Js}
uniform sampler2D tDepth; uniform float uNear, uFar;
void main(){
  // exact texel fetch: sampling at a texel corner would pick rows unpredictably and band the AO on grazing floors
  ivec2 p = min(ivec2(gl_FragCoord.xy) * 2, textureSize(tDepth, 0) - 1);
  float d = texelFetch(tDepth, p, 0).r;
  float z = d < ${n1} ? 0.01 : (uNear * uFar) / (uFar - d * (uFar - uNear));
  gl_FragColor = vec4(z, 0.0, 0.0, 1.0);
}`,
        Y6 = `${Js}
uniform sampler2D tDepthHalf; uniform vec2 uTanHalf, uTexel; uniform float uRadius, uIntensity, uAspect;
vec3 vpos(vec2 uv, float z){ return vec3((uv * 2.0 - 1.0) * uTanHalf * z, -z); }
void main(){
  float z0 = texture2D(tDepthHalf, vUv).r;
  if (z0 < ${Zy} || z0 > 140.0) { gl_FragColor = vec4(1.0); return; }
  vec3 P = vpos(vUv, z0);
  vec2 ox = vec2(uTexel.x, 0.0), oy = vec2(0.0, uTexel.y);
  float zl = texture2D(tDepthHalf, vUv - ox).r, zr = texture2D(tDepthHalf, vUv + ox).r;
  float zd = texture2D(tDepthHalf, vUv - oy).r, zu = texture2D(tDepthHalf, vUv + oy).r;
  vec3 dx = abs(zl - z0) < abs(zr - z0) ? P - vpos(vUv - ox, zl) : vpos(vUv + ox, zr) - P;
  vec3 dy = abs(zd - z0) < abs(zu - z0) ? P - vpos(vUv - oy, zd) : vpos(vUv + oy, zu) - P;
  vec3 n = normalize(cross(dx, dy));
  float R = uRadius * (0.6 + 0.4 * clamp(z0 / 12.0, 0.0, 1.0));
  float rUv = clamp(R / (2.0 * z0 * uTanHalf.y), 3.0 * uTexel.y, 0.14);
  float R2 = R * R;
  float rot = ign(gl_FragCoord.xy) * 6.2831853;
  float sum = 0.0;
  for (int i = 0; i < AO_TAPS; i++) {
    float a = (float(i) + 0.5) / float(AO_TAPS);
    float th = a * 6.2831853 * 3.0 + rot;
    vec2 o = vec2(cos(th), sin(th)) * a * rUv; o.x /= uAspect;
    vec2 uv2 = vUv + o;
    float z2 = texture2D(tDepthHalf, uv2).r;
    vec3 v = vpos(uv2, z2) - P;
    float vv = dot(v, v), vn = dot(v, n);
    float f = max(R2 - vv, 0.0);
    sum += f * f * f * max((vn - (0.015 + 0.004 * z0)) / (vv + 0.004), 0.0);
  }
  float ao = max(0.0, 1.0 - uIntensity * sum * 5.0 / (R2 * R2 * R2 * float(AO_TAPS)));
  ao = mix(ao, 1.0, smoothstep(70.0, 140.0, z0));
  gl_FragColor = vec4(ao, ao, ao, 1.0);
}`,
        $6 = `${Js}
uniform sampler2D tDepthHalf, tShadow;
uniform mat4 uShadowMatrix, uCamWorld;
uniform vec3 uCamPos, uSunRad, uAmb;
uniform vec2 uTanHalf;
uniform float uHasShadow, uMaxDist, uSigma, uFarZ, uFarHaze, uFlicker, uBoxDust;
uniform vec3 uBoxMin, uBoxMax;
${Ng}
float shape(float h){ return 0.30 + 0.70 * exp(-max(h, 0.0) / 5.5); }
float hg(float mu, float g){ float g2 = g * g; return (1.0 - g2) / (12.566371 * pow(max(1.0 + g2 - 2.0 * g * mu, 1e-4), 1.5)); }
float sunVis(vec3 p){
  vec4 sc = uShadowMatrix * vec4(p, 1.0);
  if (sc.x < 0.0 || sc.x > 1.0 || sc.y < 0.0 || sc.y > 1.0 || sc.z > 1.0 || sc.z < 0.0) return 1.0;
  float d = dot(texture2D(tShadow, sc.xy), vec4(0.99609375, 0.99609375 / 256.0, 0.99609375 / 65536.0, 1.0 / 16777216.0));
  return step(sc.z - 0.0006, d);
}
void main(){
  float z = texture2D(tDepthHalf, vUv).r;
  if (z < ${Zy}) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  vec3 vd = vec3((vUv * 2.0 - 1.0) * uTanHalf, -1.0);
  float rl = length(vd);
  vec3 rd = normalize(mat3(uCamWorld) * vd);
  float dist = z * rl;
  bool isSky = z > uFarZ * 0.97;
  float maxD = min(dist, isSky ? uMaxDist * 0.55 : uMaxDist);
  float mu = dot(rd, uSunDir);
  // two-lobe phase: tight forward lobe for the gold glow toward the sun + a broad lobe so side-lit shafts stay visible
  float ph = min(hg(mu, 0.78) * 0.55 + hg(mu, 0.25) * 0.45, 1.15);
  float j = ign(gl_FragCoord.xy);
  vec3 acc = vec3(0.0); float T = 1.0; float tPrev = 0.0;
  for (int i = 0; i < VOL_STEPS; i++) {
    float f = (float(i) + 1.0) / float(VOL_STEPS);
    float t1 = maxD * f * (0.35 + 0.65 * f);              // denser sampling near the eye
    float ds = t1 - tPrev;
    vec3 p = uCamPos + rd * (tPrev + ds * j);
    float sh = uHasShadow > 0.5 ? sunVis(p) : 1.0;
    // dusty interior (the shed): thicker air so sun shafts through doors, louvres and roof holes read; less sky ambient
    vec3 bq = step(uBoxMin, p) * step(p, uBoxMax); float inb = bq.x * bq.y * bq.z;
    float ext = uSigma * shape(p.y) * (1.0 + uBoxDust * inb);
    float Ti = exp(-ext * ds);
    // art direction: beams near the eye read strongly (shafts between stacks), the far field stays a restrained veil
    float nearW = mix(2.3, 0.55, smoothstep(4.0, 85.0, tPrev + ds * j));
    vec3 src = uSunRad * (ph * sh * mix(nearW, 1.6, inb)) + uAmb * (0.40 + 0.60 * sh) * mix(1.0, 0.22, inb);
    acc += T * src * (1.0 - Ti);
    T *= Ti; tPrev = t1;
  }
  // analytic continuation for far geometry (ship, cranes, skyline): fades into the horizon colour of that direction
  if (!isSky && dist > uMaxDist) {
    float h1 = uCamPos.y + rd.y * uMaxDist, h2 = uCamPos.y + rd.y * dist;
    float tau = uSigma * uFarHaze * (dist - uMaxDist) * 0.5 * (shape(h1) + shape(h2));
    float Tf = exp(-tau);
    vec3 hc = horizonColor(rd) * 0.50 + uAmb * 0.6;
    acc += T * hc * (1.0 - Tf);
    T *= Tf;
  }
  gl_FragColor = vec4(acc, T);
}`,
        $y = `${Js}
uniform sampler2D tSrc, tDepthHalf; uniform vec2 uDir;
void main(){
  float z0 = texture2D(tDepthHalf, vUv).r;
  float zc = min(z0, 300.0);
  vec4 acc = vec4(0.0); float ws = 0.0;
  for (int i = -3; i <= 3; i++) {
    vec2 uv = vUv + uDir * float(i);
    float z = min(texture2D(tDepthHalf, uv).r, 300.0);
    float w = (1.0 - abs(float(i)) * 0.22) * max(0.0, 1.0 - abs(z - zc) / (BLUR_TOL * zc + 0.02));
    acc += texture2D(tSrc, uv) * w; ws += w;
  }
  gl_FragColor = ws > 1e-4 ? acc / ws : texture2D(tSrc, vUv);
}`,
        Z6 = `${Js}
uniform sampler2D tColor, tDepth, tDepthHalf, tAO, tVol;
uniform vec2 uHalfRes; uniform float uNear, uFar, uAoOn, uVolOn, uAoStrength;
${Og}
void main(){
  vec3 col = max(texture2D(tColor, vUv).rgb, vec3(0.0));
  float d = texture2D(tDepth, vUv).r;
  if (d >= ${n1}) {
    float z = (uNear * uFar) / (uFar - d * (uFar - uNear));
    // joint bilateral upsample of the half-res buffers
    vec2 hp = vUv * uHalfRes - 0.5; vec2 f = fract(hp); vec2 base = (floor(hp) + 0.5) / uHalfRes; vec2 tx = 1.0 / uHalfRes;
    float ao = 0.0; vec4 vol = vec4(0.0); float ws = 0.0;
    float zc = min(z, 300.0);
    for (int k = 0; k < 4; k++) {
      vec2 o = vec2(float(k & 1), float(k >> 1));
      vec2 uv = base + o * tx;
      float zh = min(texture2D(tDepthHalf, uv).r, 300.0);
      float w = (o.x > 0.5 ? f.x : 1.0 - f.x) * (o.y > 0.5 ? f.y : 1.0 - f.y);
      w *= 1.0 / (0.015 + abs(zh - zc) / zc) ;
      w = max(w, 1e-5);
      ao += texture2D(tAO, uv).r * w; vol += texture2D(tVol, uv) * w; ws += w;
    }
    ao /= ws; vol /= ws;
    if (uAoOn > 0.5 && d < 0.99999) {
      // occlusion belongs to ambient light: fade it out on brightly lit pixels so sunlit surfaces never get dirty halos
      float lit = smoothstep(0.16, 0.85, luma(col) * slExposure());
      float a = mix(1.0, ao, uAoStrength * (1.0 - 0.8 * lit));
      col *= mix(vec3(a), vec3(1.0), vec3(0.0, 0.03, 0.07));      // faintly cool occlusion
    }
    if (uVolOn > 0.5) col = col * vol.a + vol.rgb;
  }
  gl_FragColor = vec4(col, 1.0);
}`,
        j6 = `${Js}
uniform sampler2D tColor, tDepth; uniform mat4 uInvViewProj, uPrevViewProj; uniform float uShutter; uniform vec2 uRes;
void main(){
  vec4 c0 = texture2D(tColor, vUv);
  float d = texture2D(tDepth, vUv).r;
  if (d < ${n1}) { gl_FragColor = c0; return; }
  vec4 wp = uInvViewProj * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); wp /= wp.w;
  vec4 pc = uPrevViewProj * wp;
  vec2 puv = pc.xy / max(pc.w, 1e-4) * 0.5 + 0.5;
  vec2 vel = (vUv - puv) * uShutter;
  float len = length(vel);
  if (pc.w <= 0.0 || len * uRes.y < 0.75) { gl_FragColor = c0; return; }
  vel *= min(1.0, 0.018 / len);
  float j = ign(gl_FragCoord.xy) - 0.5;
  vec3 acc = c0.rgb; float ws = 1.0;
  for (int i = 0; i < 9; i++) {
    vec2 uv = vUv + vel * ((float(i) + 0.5 + j) / 9.0 - 0.5);
    float w = texture2D(tDepth, uv).r < ${n1} ? 0.0 : 1.0;
    acc += texture2D(tColor, uv).rgb * w; ws += w;
  }
  gl_FragColor = vec4(acc / ws, 1.0);
}`,
        J6 = `${Js}
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uFirst;
vec3 s(vec2 o){ return min(max(texture2D(tSrc, vUv + o * uTexel).rgb, vec3(0.0)), vec3(400.0)); }
float kw(vec3 c){ return 1.0 / (1.0 + luma(c) * 0.08); }
void main(){
  vec3 a = s(vec2(-2.0, 2.0)), b = s(vec2(0.0, 2.0)), c = s(vec2(2.0, 2.0));
  vec3 d = s(vec2(-2.0, 0.0)), e = s(vec2(0.0, 0.0)), f = s(vec2(2.0, 0.0));
  vec3 g = s(vec2(-2.0, -2.0)), h = s(vec2(0.0, -2.0)), i = s(vec2(2.0, -2.0));
  vec3 j = s(vec2(-1.0, 1.0)), k = s(vec2(1.0, 1.0)), l = s(vec2(-1.0, -1.0)), m = s(vec2(1.0, -1.0));
  vec3 col;
  if (uFirst > 0.5) {
    // partial Karis average on the first downsample: tames fireflies without killing the sun
    vec3 g0 = (a + b + d + e) * 0.25, g1 = (b + c + e + f) * 0.25, g2 = (d + e + g + h) * 0.25, g3 = (e + f + h + i) * 0.25, g4 = (j + k + l + m) * 0.25;
    float w0 = kw(g0) * 0.125, w1 = kw(g1) * 0.125, w2 = kw(g2) * 0.125, w3 = kw(g3) * 0.125, w4 = kw(g4) * 0.5;
    col = (g0 * w0 + g1 * w1 + g2 * w2 + g3 * w3 + g4 * w4) / (w0 + w1 + w2 + w3 + w4);
  } else {
    col = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  }
  gl_FragColor = vec4(col, 1.0);
}`,
        K6 = `${Js}
uniform sampler2D tLow, tHigh; uniform vec2 uTexel; uniform float uMix;
void main(){
  vec2 o = uTexel;
  vec3 t = texture2D(tLow, vUv).rgb * 4.0;
  t += (texture2D(tLow, vUv + vec2(o.x, 0.0)).rgb + texture2D(tLow, vUv - vec2(o.x, 0.0)).rgb + texture2D(tLow, vUv + vec2(0.0, o.y)).rgb + texture2D(tLow, vUv - vec2(0.0, o.y)).rgb) * 2.0;
  t += texture2D(tLow, vUv + o).rgb + texture2D(tLow, vUv - o).rgb + texture2D(tLow, vUv + vec2(o.x, -o.y)).rgb + texture2D(tLow, vUv + vec2(-o.x, o.y)).rgb;
  t *= 1.0 / 16.0;
  gl_FragColor = vec4(mix(texture2D(tHigh, vUv).rgb, t, uMix), 1.0);
}`,
        Q6 = `${Js}
uniform sampler2D tSrc; uniform vec2 uDir; uniform float uThreshold;
${Og}
void main(){
  float thr = uThreshold / max(slExposure(), 0.2);
  vec3 acc = vec3(0.0); float ws = 0.0;
  for (int i = -7; i <= 7; i++) {
    float x = float(i); float w = exp(-x * x / 18.0);
    vec3 c = texture2D(tSrc, vUv + uDir * x).rgb;
    c = max(c - vec3(thr), vec3(0.0));
    acc += c * w; ws += w;
  }
  gl_FragColor = vec4(acc / ws, 1.0);
}`,
        eA = `${Js}
uniform sampler2D tPrev, tLum, tDepth; uniform vec2 uSunUv; uniform float uSunOn, uRate, uVisRate, uAspect;
void main(){
  float ls = 0.0, ws = 0.0;
  for (int y = 0; y < 5; y++) for (int x = 0; x < 7; x++) {
    vec2 uv = (vec2(float(x), float(y)) + 0.5) / vec2(7.0, 5.0);
    vec2 c = uv - 0.5;
    float w = 1.0 - 0.75 * smoothstep(0.1, 0.55, length(c));       // centre-weighted metering
    float l = luma(texture2D(tLum, uv).rgb);
    ls += log(max(l, 1e-4)) * w; ws += w;
  }
  float avg = clamp(exp(ls / ws), 0.002, 40.0);
  float vis = 0.0;
  for (int i = 0; i < 12; i++) {
    float r = sqrt((float(i) + 0.5) / 12.0) * 0.011; float th = float(i) * 2.39996323;
    vec2 uv = uSunUv + vec2(cos(th) / uAspect, sin(th)) * r;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) vis += 1.0;
    else vis += step(0.99999, texture2D(tDepth, uv).r);
  }
  vis = vis / 12.0 * uSunOn;
  vec4 prev = texture2D(tPrev, vec2(0.5));
  float a = mix(prev.r, avg, uRate);
  if (!(a > 0.0) || a > 1e4) a = avg;                                 // NaN / first-frame guard
  float v = mix(prev.g, vis, uVisRate);
  if (!(v >= 0.0)) v = vis;
  gl_FragColor = vec4(a, v, 0.0, 1.0);
}`,
        tA = `${Js}
${Ug}
uniform float uAspect;
void main(){
  vec2 p = vUv * vec2(uAspect, 1.0);
  float acc = 0.0;
  for (int i = 0; i < 70; i++) {
    float fi = float(i);
    vec2 c = vec2(hash12(vec2(fi, 1.7)), hash12(vec2(fi, 9.2))) * vec2(uAspect, 1.0);
    float sz = mix(0.012, 0.085, pow(hash12(vec2(fi, 4.4)), 3.0));
    float r = length(p - c) / sz;
    float disc = smoothstep(1.0, 0.86, r) * (0.35 + 0.65 * smoothstep(0.35, 0.98, r));
    acc += disc * mix(0.15, 0.7, hash12(vec2(fi, 6.1)));
  }
  float smudge = fbm5(vUv * vec2(5.0, 9.0) + 3.0) * fbm3(vUv * 2.3 + 9.0);
  float streaks = pow(n2(vec2(vUv.x * 90.0, vUv.y * 2.0)), 4.0) * 0.25;
  float v = acc * 0.55 + smudge * 0.9 + streaks;
  v *= 0.45 + 0.9 * smoothstep(0.15, 0.75, length(vUv - 0.5));
  gl_FragColor = vec4(vec3(v) * vec3(1.0, 0.96, 0.9), 1.0);
}`,
        nA = `${Js}
uniform sampler2D tScene, tBloom, tBlur, tStreak, tDirt;
${Og}
uniform vec3 uSunCol;
uniform vec2 uSunUv;
uniform float uTime, uAspect, uBloom, uDirt, uStreak, uFlare, uCA, uVignette;
uniform float uDamage, uLowHealth, uAds, uFlash, uFade, uSaturation, uSunOn, uThunder, uAgxMix;

// ---- AgX (Filament/Blender fit, as in three.js) ----
const mat3 SL_REC2020_TO_SRGB = mat3(vec3(1.6605, -0.1246, -0.0182), vec3(-0.5876, 1.1329, -0.1006), vec3(-0.0728, -0.0083, 1.1187));
const mat3 SL_SRGB_TO_REC2020 = mat3(vec3(0.6274, 0.0691, 0.0164), vec3(0.3293, 0.9195, 0.0880), vec3(0.0433, 0.0113, 0.8956));
vec3 slAgxContrast(vec3 x){ vec3 x2 = x * x; vec3 x4 = x2 * x2; return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232; }
vec3 slAgx(vec3 color){
  const mat3 inset = mat3(vec3(0.856627153315983, 0.137318972929847, 0.11189821299995), vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903), vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859));
  const mat3 outset = mat3(vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826), vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294), vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405));
  const float minEv = -12.47393, maxEv = 4.026069;
  color = inset * (SL_SRGB_TO_REC2020 * color);
  color = clamp((log2(max(color, 1e-10)) - minEv) / (maxEv - minEv), 0.0, 1.0);
  color = slAgxContrast(color);
  // "punchy"-style look: a little more contrast and chroma than the base AgX rendering
  float l = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = pow(max(color, vec3(0.0)), vec3(LOOK_POWER));
  color = l + (color - l) * LOOK_SAT;
  color = outset * color;
  color = pow(max(color, vec3(0.0)), vec3(2.2));
  return clamp(SL_REC2020_TO_SRGB * color, 0.0, 1.0);
}
vec3 slRRTODT(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
vec3 slAces(vec3 c){
  const mat3 inM = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 outM = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  return clamp(outM * slRRTODT(inM * (c * 1.3)), 0.0, 1.0);
}
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c)); }

vec3 flare(vec2 uv, vec2 sun, float vis){
  vec2 asp = vec2(uAspect, 1.0);
  vec2 p = (uv - 0.5) * asp, s = (sun - 0.5) * asp;
  vec2 dv = p - s; float r = length(dv);
  vec3 c = vec3(0.0);
  // veiling glare + a few soft diffraction spikes
  float ang = atan(dv.y, dv.x);
  float spikes = pow(abs(cos(ang * 3.0 + 0.4)), 24.0) + 0.6 * pow(abs(cos(ang * 4.0 - 1.1)), 40.0);
  c += uSunCol * (0.020 / (r * r * 9.0 + 0.010) + 0.10 * exp(-r * 3.2));
  c += uSunCol * spikes * 0.30 * exp(-r * 5.5);
  // ghosts along the sun -> centre axis
  vec3 g = vec3(0.0);
  float k0 = length(p + s * 0.38);  g += vec3(0.30, 0.75, 0.55) * smoothstep(0.085, 0.06, k0) * 0.050;
  float k1 = length(p + s * 0.82);  g += vec3(0.85, 0.45, 0.25) * smoothstep(0.045, 0.030, k1) * 0.075;
  float k2 = length(p + s * 1.35);  g += vec3(0.35, 0.50, 0.95) * smoothstep(0.17, 0.12, k2) * (0.4 + 0.6 * smoothstep(0.05, 0.16, k2)) * 0.040;
  float k3 = length(p - s * 0.45);  g += vec3(0.80, 0.70, 0.35) * smoothstep(0.030, 0.018, k3) * 0.060;
  // halo ring opposite the sun
  float hr = length(p + s * 0.15);
  g += vec3(0.45, 0.55, 0.85) * exp(-pow((hr - 0.52) * 16.0, 2.0)) * 0.035 * smoothstep(0.1, 0.5, length(s));
  c += g * uSunCol * 2.4;
  return c * vis;
}

void main(){
  vec2 c = vUv - 0.5;
  float r2 = dot(c * vec2(uAspect, 1.0), c * vec2(uAspect, 1.0)) / (0.25 * (uAspect * uAspect + 1.0));   // 0 centre .. 1 corner
  vec4 ad = texture2D(tAdapt, vec2(0.5));
  // radial chromatic aberration (tiny; grows a little when hurt)
  vec2 off = c * r2 * (uCA + uDamage * 0.006);
  vec3 col = vec3(texture2D(tScene, vUv + off).r, texture2D(tScene, vUv).g, texture2D(tScene, vUv - off).b);
  // ADS: soften the periphery
  vec3 soft = texture2D(tBlur, vUv).rgb;
  col = mix(col, soft, uAds * 0.75 * smoothstep(0.22, 0.85, r2));
  // bloom (energy conserving mix), lens dirt, anamorphic streak
  vec3 bloom = texture2D(tBloom, vUv).rgb;
  vec3 dirt = texture2D(tDirt, vUv).rgb;
  col = mix(col, bloom, uBloom);
  col += bloom * dirt * uDirt;
  col += texture2D(tStreak, vUv).rgb * vec3(0.45, 0.62, 1.0) * uStreak;
  // sun glare + flare (occlusion-tested)
  float vis = ad.g * uSunOn;
  if (vis > 0.002) { vec3 fl = flare(vUv, uSunUv, vis) * uFlare; col += fl * (1.0 + dirt * 1.5); }
  // exposure: manual * eye adaptation
  col *= slExposure();
  col += vec3(1.0, 0.97, 0.9) * uFlash * 2.5;
  // filmic curve: ACES (Hill fit) for punch and burning oranges, pulled toward AgX so highlights roll off to white
  col = mix(slAces(col), slAgx(col), uAgxMix);

  // ---- grade (display-linear) ----
  float l = luma(col);
  // split tone: teal shadows, warm highlights
  vec3 sh = vec3(0.80, 1.01, 1.13), hi = vec3(1.07, 1.0, 0.90);
  col *= mix(sh, hi, smoothstep(0.03, 0.55, l));
  // gentle S-curve
  col = mix(col, col * col * (3.0 - 2.0 * col), 0.22);
  // lifted, slightly teal blacks
  col = col * 0.988 + vec3(0.006, 0.0085, 0.011);
  // saturation (gameplay driven)
  float sat = uSaturation * (1.0 - 0.65 * uLowHealth) * (1.0 - 0.5 * uDamage);
  l = luma(col);
  col = mix(vec3(l), col, sat);
  // vignette: base + low health + ADS tightening
  float vig = uVignette + uLowHealth * 0.55 + uAds * 0.22;
  float vr = smoothstep(0.15 - uAds * 0.08, 1.05, r2);
  col *= 1.0 - vig * vr * vr * (3.0 - 2.0 * vr) ;
  // damage: red-edged pulse
  float edge = smoothstep(0.18, 1.0, r2);
  col = mix(col, vec3(0.55, 0.02, 0.01) * (0.35 + l), clamp(uDamage * edge * 0.85 + uLowHealth * edge * edge * 0.25 * (0.75 + 0.25 * sin(uTime * 5.0)), 0.0, 1.0));
  col *= 1.0 - uFade;
  col = toSRGB(clamp(col, 0.0, 1.0));
  gl_FragColor = vec4(col, dot(col, vec3(0.299, 0.587, 0.114)));
}`,
        iA = `${Js}
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uTime, uGrain, uSharpen, uFxaa;
void main(){
  vec4 M = texture2D(tSrc, vUv);
  vec3 col = M.rgb;
  vec4 NW = texture2D(tSrc, vUv + vec2(-1.0, -1.0) * uTexel), NE = texture2D(tSrc, vUv + vec2(1.0, -1.0) * uTexel);
  vec4 SW = texture2D(tSrc, vUv + vec2(-1.0, 1.0) * uTexel), SE = texture2D(tSrc, vUv + vec2(1.0, 1.0) * uTexel);
  float lMin = min(M.a, min(min(NW.a, NE.a), min(SW.a, SE.a)));
  float lMax = max(M.a, max(max(NW.a, NE.a), max(SW.a, SE.a)));
  float contrast = lMax - lMin;
  if (uFxaa > 0.5 && contrast > max(0.0312, lMax * 0.10)) {
    vec2 dir = vec2(-((NW.a + NE.a) - (SW.a + SE.a)), (NW.a + SW.a) - (NE.a + SE.a));
    float dirReduce = max((NW.a + NE.a + SW.a + SE.a) * 0.03125, 0.0078125);
    float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
    dir = clamp(dir * rcp, vec2(-8.0), vec2(8.0)) * uTexel;
    vec4 A = 0.5 * (texture2D(tSrc, vUv + dir * (1.0 / 3.0 - 0.5)) + texture2D(tSrc, vUv + dir * (2.0 / 3.0 - 0.5)));
    vec4 B = A * 0.5 + 0.25 * (texture2D(tSrc, vUv - dir * 0.5) + texture2D(tSrc, vUv + dir * 0.5));
    col = (B.a < lMin || B.a > lMax) ? A.rgb : B.rgb;
  }
  // light unsharp mask, backed off on strong edges (those belong to FXAA)
  vec3 blur = (NW.rgb + NE.rgb + SW.rgb + SE.rgb) * 0.25;
  col += (M.rgb - blur) * uSharpen * (1.0 - smoothstep(0.04, 0.22, contrast));
  // animated, luminance-weighted film grain
  vec2 seed = gl_FragCoord.xy + fract(uTime * vec2(7.31, 3.17)) * vec2(311.7, 173.3);
  float g = hash12(seed) + hash12(seed + 57.3) - 1.0;
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col += g * uGrain * mix(1.0, 0.30, smoothstep(0.25, 0.9, l)) * (0.35 + 0.65 * smoothstep(0.0, 0.08, l));
  // dither against banding in the sky gradients
  col += (hash12(gl_FragCoord.xy * 1.37 + 11.0) + hash12(gl_FragCoord.xy * 0.71 + 3.0) - 1.0) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;

function jy(i, e, {
        noiseTex: t
    }) {
        let n = new nt;
        n.setAttribute("position", new et(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)), n.setAttribute("uv", new et(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
        let s = new Qe(n, null);
        s.frustumCulled = !1;
        let o = new cr(-1, 1, 1, -1, 0, 1),
            r = [],
            a = (oe, fe, le, R = {}) => {
                let I = new zn({
                    name: "post-" + oe,
                    vertexShader: G6,
                    fragmentShader: `${Bg} ${oe}
${fe}`,
                    uniforms: le,
                    depthTest: !1,
                    depthWrite: !1,
                    blending: ko,
                    toneMapped: !1,
                    ...R
                });
                return r.push(I), I
            };

        function l(oe, fe) {
            s.material = oe, i.setRenderTarget(fe), i.render(s, o)
        }
        let c = js,
            u = yi,
            h = Zt,
            f = Gn,
            p = (oe = c, fe = h, le = {}) => {
                let R = new si(4, 4, {
                    type: oe,
                    format: _n,
                    minFilter: fe,
                    magFilter: fe,
                    depthBuffer: !1,
                    stencilBuffer: !1,
                    generateMipmaps: !1,
                    ...le
                });
                return R.texture.generateMipmaps = !1, R
            },
            d = () => e.quality,
            v = () => ({
                uSunDir: {
                    value: Mn.dir.clone()
                },
                uZen: {
                    value: en.zenith.clone()
                },
                uHor: {
                    value: en.horizon.clone()
                },
                uHorAway: {
                    value: en.horizonAway.clone()
                },
                uSunCol: {
                    value: Mn.color.clone()
                }
            }),
            g = {
                volSunScale: .85,
                volAmbient: .2,
                volSigma: .0034,
                volMaxDist: 170,
                volFarHaze: .42,
                volInteriorDust: 6,
                aoRadius: .9,
                aoIntensity: 1.6,
                aoStrength: .95,
                bloom: .065,
                bloomMix: .62,
                dirt: .1,
                streak: .03,
                streakThreshold: 2.2,
                flare: .16,
                key: .12,
                minExposure: .6,
                maxExposure: 2,
                adaptTau: 1.5,
                agxMix: .25,
                ca: .0013,
                vignette: .3,
                grain: .02,
                sharpen: .3,
                lookPower: 1.18,
                lookSat: 1.22
            },
            x = !1;
        try {
            x = !!i.extensions.has("EXT_color_buffer_float")
        } catch {
            x = !1
        }
        let y = {
                scene: p(c, h),
                motion: p(c, h),
                ldr: p(u, h),
                depthHalf: x ? p(as, f, {
                    format: J0
                }) : p(c, f),
                aoA: p(u, f),
                aoB: p(u, f),
                volA: p(c, f),
                volB: p(c, f),
                down: [],
                up: [],
                streakA: p(c, h),
                streakB: p(c, h),
                adapt: [p(c, f), p(c, f)],
                dirt: p(u, h),
                depthCopy: null
            },
            b = 6;
        for (let oe = 0; oe < b; oe++) y.down.push(p(c, h));
        for (let oe = 0; oe < b - 1; oe++) y.up.push(p(c, h));
        y.adapt[0].setSize(1, 1), y.adapt[1].setSize(1, 1), y.dirt.setSize(512, 288);
        let m = 0,
            A = 0,
            _ = !1,
            M = {
                w: 4,
                h: 4,
                hw: 2,
                hh: 2
            },
            E = {
                tAdapt: {
                    value: null
                },
                uExposure: {
                    value: 1
                },
                uKey: {
                    value: g.key
                },
                uMinE: {
                    value: g.minExposure
                },
                uMaxE: {
                    value: g.maxExposure
                },
                uAuto: {
                    value: 1
                }
            },
            w = a("depthcopy", q6, {
                tDepth: {
                    value: null
                }
            }, {
                depthTest: !0,
                depthWrite: !0,
                depthFunc: q0,
                colorWrite: !1
            }),
            S = a("depthhalf", X6, {
                tDepth: {
                    value: null
                },
                uNear: {
                    value: .08
                },
                uFar: {
                    value: 900
                }
            }),
            z = a("ao", Y6, {
                tDepthHalf: {
                    value: y.depthHalf.texture
                },
                uTanHalf: {
                    value: new Ae
                },
                uTexel: {
                    value: new Ae
                },
                uRadius: {
                    value: g.aoRadius
                },
                uIntensity: {
                    value: g.aoIntensity
                },
                uAspect: {
                    value: 1
                }
            }, {
                defines: {
                    AO_TAPS: 12
                }
            }),
            H = a("vol", $6, {
                tDepthHalf: {
                    value: y.depthHalf.texture
                },
                tShadow: {
                    value: null
                },
                uShadowMatrix: {
                    value: new Ye
                },
                uCamWorld: {
                    value: new Ye
                },
                uCamPos: {
                    value: new W
                },
                uSunRad: {
                    value: new W
                },
                uAmb: {
                    value: new W
                },
                uTanHalf: {
                    value: new Ae
                },
                uHasShadow: {
                    value: 0
                },
                uMaxDist: {
                    value: g.volMaxDist
                },
                uSigma: {
                    value: g.volSigma
                },
                uFarZ: {
                    value: 900
                },
                uFarHaze: {
                    value: g.volFarHaze
                },
                uFlicker: {
                    value: 0
                },
                uBoxDust: {
                    value: 0
                },
                uBoxMin: {
                    value: new W(1e6, 1e6, 1e6)
                },
                uBoxMax: {
                    value: new W(-1e6, -1e6, -1e6)
                },
                ...v()
            }, {
                defines: {
                    VOL_STEPS: 16
                }
            }),
            O = a("blur-ao", $y, {
                tSrc: {
                    value: null
                },
                tDepthHalf: {
                    value: y.depthHalf.texture
                },
                uDir: {
                    value: new Ae
                }
            }, {
                defines: {
                    BLUR_TOL: "0.04"
                }
            }),
            q = a("blur-vol", $y, {
                tSrc: {
                    value: null
                },
                tDepthHalf: {
                    value: y.depthHalf.texture
                },
                uDir: {
                    value: new Ae
                }
            }, {
                defines: {
                    BLUR_TOL: "0.30"
                }
            }),
            U = a("composite", Z6, {
                tColor: {
                    value: null
                },
                tDepth: {
                    value: null
                },
                tDepthHalf: {
                    value: y.depthHalf.texture
                },
                tAO: {
                    value: y.aoA.texture
                },
                tVol: {
                    value: y.volA.texture
                },
                uHalfRes: {
                    value: new Ae
                },
                uNear: {
                    value: .08
                },
                uFar: {
                    value: 900
                },
                uAoOn: {
                    value: 1
                },
                uVolOn: {
                    value: 1
                },
                uAoStrength: {
                    value: g.aoStrength
                },
                ...E
            }),
            T = a("motion", j6, {
                tColor: {
                    value: y.scene.texture
                },
                tDepth: {
                    value: null
                },
                uInvViewProj: {
                    value: new Ye
                },
                uPrevViewProj: {
                    value: new Ye
                },
                uShutter: {
                    value: .5
                },
                uRes: {
                    value: new Ae
                }
            }),
            D = a("down", J6, {
                tSrc: {
                    value: null
                },
                uTexel: {
                    value: new Ae
                },
                uFirst: {
                    value: 0
                }
            }),
            C = a("up", K6, {
                tLow: {
                    value: null
                },
                tHigh: {
                    value: null
                },
                uTexel: {
                    value: new Ae
                },
                uMix: {
                    value: g.bloomMix
                }
            }),
            G = a("streak", Q6, {
                tSrc: {
                    value: null
                },
                uDir: {
                    value: new Ae
                },
                uThreshold: {
                    value: 0
                },
                ...E
            }),
            j = a("adapt", eA, {
                tPrev: {
                    value: null
                },
                tLum: {
                    value: null
                },
                tDepth: {
                    value: null
                },
                uSunUv: {
                    value: new Ae(.5, .5)
                },
                uSunOn: {
                    value: 0
                },
                uRate: {
                    value: 1
                },
                uVisRate: {
                    value: 1
                },
                uAspect: {
                    value: 1
                }
            }),
            N = a("dirt", tA, {
                tNoise: {
                    value: t
                },
                uAspect: {
                    value: 16 / 9
                }
            }),
            Q = a("grade", nA, {
                tScene: {
                    value: null
                },
                tBloom: {
                    value: y.up[0].texture
                },
                tBlur: {
                    value: y.down[1].texture
                },
                tStreak: {
                    value: y.streakB.texture
                },
                tDirt: {
                    value: y.dirt.texture
                },
                ...E,
                uSunCol: {
                    value: Mn.color.clone()
                },
                uSunUv: {
                    value: new Ae(.5, .5)
                },
                uTime: {
                    value: 0
                },
                uAspect: {
                    value: 1
                },
                uBloom: {
                    value: g.bloom
                },
                uDirt: {
                    value: g.dirt
                },
                uStreak: {
                    value: g.streak
                },
                uFlare: {
                    value: g.flare
                },
                uCA: {
                    value: g.ca
                },
                uVignette: {
                    value: g.vignette
                },
                uDamage: {
                    value: 0
                },
                uLowHealth: {
                    value: 0
                },
                uAds: {
                    value: 0
                },
                uFlash: {
                    value: 0
                },
                uFade: {
                    value: 0
                },
                uSaturation: {
                    value: 1
                },
                uSunOn: {
                    value: 0
                },
                uThunder: {
                    value: 0
                },
                uAgxMix: {
                    value: g.agxMix
                }
            }, {
                defines: {
                    LOOK_POWER: g.lookPower.toFixed(3),
                    LOOK_SAT: g.lookSat.toFixed(3)
                }
            }),
            K = a("final", iA, {
                tSrc: {
                    value: y.ldr.texture
                },
                uTexel: {
                    value: new Ae
                },
                uTime: {
                    value: 0
                },
                uGrain: {
                    value: g.grain
                },
                uSharpen: {
                    value: g.sharpen
                },
                uFxaa: {
                    value: 1
                }
            }),
            ie = new Ye,
            F = new Ye,
            X = new Ye,
            ne = new W,
            re = new W,
            $ = !1;

        function ue() {
            let oe = Math.max(6, d().volSteps | 0),
                fe = d().name === "test" || d().name === "low" ? 8 : d().name === "ultra" ? 16 : 12;
            H.defines.VOL_STEPS !== oe && (H.defines.VOL_STEPS = oe, H.needsUpdate = !0), z.defines.AO_TAPS !== fe && (z.defines.AO_TAPS = fe, z.needsUpdate = !0)
        }

        function me(oe, fe) {
            if (oe = Math.max(8, oe | 0), fe = Math.max(8, fe | 0), M.w = oe, M.h = fe, M.hw = Math.max(4, Math.ceil(oe / 2)), M.hh = Math.max(4, Math.ceil(fe / 2)), y.scene.setSize(oe, fe), y.motion.setSize(oe, fe), y.ldr.setSize(oe, fe), y.depthCopy) {
                y.depthCopy.setSize(oe, fe);
                let I = y.depthCopy.depthTexture.image;
                (I.width !== oe || I.height !== fe) && (I.width = oe, I.height = fe, y.depthCopy.depthTexture.needsUpdate = !0)
            }
            for (let I of [y.depthHalf, y.aoA, y.aoB, y.volA, y.volB]) I.setSize(M.hw, M.hh);
            let le = M.hw,
                R = M.hh;
            for (let I = 0; I < b; I++) y.down[I].setSize(le, R), I < b - 1 && y.up[I].setSize(le, R), le = Math.max(2, le >> 1), R = Math.max(2, R >> 1);
            y.streakA.setSize(y.down[2].width, y.down[2].height), y.streakB.setSize(y.down[2].width, y.down[2].height), $ = !1, ue()
        }

        function ee() {
            if (!y.depthCopy) {
                let oe = new Tr(M.w, M.h);
                oe.type = Zs, oe.minFilter = oe.magFilter = f, y.depthCopy = new si(M.w, M.h, {
                    type: u,
                    format: _n,
                    minFilter: f,
                    magFilter: f,
                    depthBuffer: !0,
                    stencilBuffer: !1,
                    depthTexture: oe,
                    generateMipmaps: !1
                }), i.setRenderTarget(y.depthCopy), i.setClearColor(0, 1), i.clear(!0, !0, !1), i.setRenderTarget(null)
            }
            return y.depthCopy.depthTexture
        }

        function B(oe) {
            y.depthCopy && (w.uniforms.tDepth.value = oe, l(w, y.depthCopy))
        }

        function P({
            hdr: oe,
            camera: fe,
            sun: le,
            dt: R,
            post: I,
            exposure: se,
            time: ae,
            fast: k,
            thunder: ce
        }) {
            let ve = d(),
                _e = fe.projectionMatrix.elements,
                Te = 1 / _e[0],
                Pe = 1 / _e[5],
                Re = Te / Pe,
                Fe = oe.depthTexture;
            E.tAdapt.value = y.adapt[m].texture, E.uExposure.value = se, E.uAuto.value = J.autoExposure ? 1 : 0, E.uKey.value = g.key, E.uMinE.value = g.minExposure, E.uMaxE.value = g.maxExposure, _ || (N.uniforms.uAspect.value = 16 / 9, l(N, y.dirt), _ = !0), S.uniforms.tDepth.value = Fe, S.uniforms.uNear.value = fe.near, S.uniforms.uFar.value = fe.far, l(S, y.depthHalf);
            let ze = 1 / M.hw,
                We = 1 / M.hh,
                Ne = !!ve.ao;
            Ne && (z.uniforms.uTanHalf.value.set(Te, Pe), z.uniforms.uTexel.value.set(ze, We), z.uniforms.uAspect.value = Re, l(z, y.aoA), O.uniforms.tSrc.value = y.aoA.texture, O.uniforms.uDir.value.set(ze, 0), l(O, y.aoB), O.uniforms.tSrc.value = y.aoB.texture, O.uniforms.uDir.value.set(0, We), l(O, y.aoA));
            let dt = (ve.volSteps | 0) > 0;
            if (dt) {
                let be = H.uniforms,
                    Oe = e.level && e.level.interiorBoxes && e.level.interiorBoxes[0];
                Oe ? (be.uBoxMin.value.copy(Oe.min), be.uBoxMax.value.copy(Oe.max), be.uBoxDust.value = g.volInteriorDust) : be.uBoxDust.value = 0;
                let pt = le.shadow && le.shadow.map ? le.shadow.map.texture : null;
                be.tShadow.value = pt, be.uHasShadow.value = pt ? 1 : 0, pt && be.uShadowMatrix.value.copy(le.shadow.matrix), be.uCamWorld.value.copy(fe.matrixWorld), be.uCamPos.value.setFromMatrixPosition(fe.matrixWorld), be.uTanHalf.value.set(Te, Pe), be.uFarZ.value = fe.far;
                let ut = le.intensity * g.volSunScale;
                be.uSunRad.value.set(le.color.r * ut, le.color.g * ut, le.color.b * ut);
                let nn = g.volAmbient * (1 + ce * 1.5);
                be.uAmb.value.set(en.fog.r * nn, en.fog.g * nn, en.fog.b * nn), l(H, y.volA), q.uniforms.tSrc.value = y.volA.texture, q.uniforms.uDir.value.set(ze, 0), l(q, y.volB), q.uniforms.tSrc.value = y.volB.texture, q.uniforms.uDir.value.set(0, We), l(q, y.volA)
            } {
                let be = U.uniforms;
                be.tColor.value = oe.texture, be.tDepth.value = Fe, be.uHalfRes.value.set(M.hw, M.hh), be.uNear.value = fe.near, be.uFar.value = fe.far, be.uAoOn.value = Ne ? 1 : 0, be.uVolOn.value = dt ? 1 : 0, l(U, y.scene)
            }
            let xe = y.scene.texture;
            if (ie.multiplyMatrices(fe.projectionMatrix, fe.matrixWorldInverse), ve.motionBlur && $ && R > 0) {
                let be = T.uniforms;
                be.tDepth.value = Fe, be.uInvViewProj.value.copy(X.copy(ie).invert()), be.uPrevViewProj.value.copy(F), be.uShutter.value = Math.min(.5, 1 / 190 / Math.max(R, .001)), be.uRes.value.set(M.w, M.h), l(T, y.motion), xe = y.motion.texture
            }
            if (F.copy(ie), $ = !0, ve.bloom) {
                let be = xe,
                    Oe = M.w,
                    pt = M.h;
                for (let bt = 0; bt < b; bt++) D.uniforms.tSrc.value = be, D.uniforms.uTexel.value.set(1 / Oe, 1 / pt), D.uniforms.uFirst.value = bt === 0 ? 1 : 0, l(D, y.down[bt]), be = y.down[bt].texture, Oe = y.down[bt].width, pt = y.down[bt].height;
                let ut = y.down[b - 1];
                for (let bt = b - 2; bt >= 0; bt--) C.uniforms.tLow.value = ut.texture, C.uniforms.tHigh.value = y.down[bt].texture, C.uniforms.uTexel.value.set(1 / ut.width, 1 / ut.height), l(C, y.up[bt]), ut = y.up[bt];
                let nn = 1 / y.streakA.width;
                G.uniforms.tSrc.value = y.down[2].texture, G.uniforms.uDir.value.set(nn * 1.5, 0), G.uniforms.uThreshold.value = g.streakThreshold, l(G, y.streakA), G.uniforms.tSrc.value = y.streakA.texture, G.uniforms.uDir.value.set(nn * 5, 0), G.uniforms.uThreshold.value = 0, l(G, y.streakB)
            }
            ne.copy(Mn.dir).multiplyScalar(500).add(re.setFromMatrixPosition(fe.matrixWorld)).project(fe), fe.getWorldDirection(re);
            let Ie = re.dot(Mn.dir) > .05,
                Be = Math.max(Math.abs(ne.x), Math.abs(ne.y)),
                Xe = Ie ? 1 - Math.min(1, Math.max(0, (Be - 1) / .3)) : 0,
                Me = ne.x * .5 + .5,
                we = ne.y * .5 + .5;
            {
                let be = j.uniforms,
                    Oe = y.adapt[m],
                    pt = y.adapt[1 - m];
                be.tPrev.value = Oe.texture, be.tLum.value = ve.bloom ? y.down[b - 1].texture : xe, be.tDepth.value = Fe, be.uSunUv.value.set(Me, we), be.uSunOn.value = Xe, be.uAspect.value = Re;
                let ut = A < 2 || k;
                be.uRate.value = ut ? A < 2 ? 1 : .6 : 1 - Math.exp(-R / g.adaptTau), be.uVisRate.value = ut ? 1 : 1 - Math.exp(-R / .12), l(j, pt), m = 1 - m, A++
            } {
                let be = Q.uniforms;
                be.tScene.value = xe, E.tAdapt.value = y.adapt[m].texture, be.uSunUv.value.set(Me, we), be.uSunOn.value = Xe, be.uAspect.value = Re, be.uTime.value = ae, be.uBloom.value = ve.bloom ? g.bloom : 0, be.uDirt.value = ve.bloom ? g.dirt : 0, be.uStreak.value = ve.bloom ? g.streak : 0, be.uFlare.value = g.flare, be.uAgxMix.value = g.agxMix, be.uCA.value = g.ca, be.uVignette.value = g.vignette, be.uDamage.value = V(I.damage), be.uLowHealth.value = V(I.lowHealth), be.uAds.value = V(I.ads), be.uFlash.value = V(I.flash), be.uFade.value = V(I.fade), be.uSaturation.value = Number.isFinite(I.saturation) ? I.saturation : 1, l(Q, y.ldr)
            } {
                let be = K.uniforms;
                be.uTexel.value.set(1 / M.w, 1 / M.h), be.uTime.value = ae, be.uGrain.value = g.grain, be.uSharpen.value = g.sharpen, l(K, null)
            }
        }
        let V = oe => oe > 0 ? oe < 1 ? oe : 1 : 0;

        function Y() {
            for (let fe of r) fe.dispose();
            let oe = [y.scene, y.motion, y.ldr, y.depthHalf, y.aoA, y.aoB, y.volA, y.volB, y.streakA, y.streakB, y.dirt, ...y.down, ...y.up, ...y.adapt];
            y.depthCopy && oe.push(y.depthCopy);
            for (let fe of oe) fe.dispose()
        }
        let L = new Uint16Array(4);

        function Z() {
            try {
                i.readRenderTargetPixels(y.adapt[m], 0, 0, 1, 1, L);
                let oe = P0.fromHalfFloat(L[0]),
                    fe = Math.min(g.maxExposure, Math.max(g.minExposure, Math.pow(g.key / Math.max(oe, 1e-4), .85)));
                return {
                    lum: +oe.toFixed(4),
                    auto: +fe.toFixed(3),
                    sunVis: +P0.fromHalfFloat(L[1]).toFixed(2)
                }
            } catch {
                return null
            }
        }
        let J = {
            readAdapt: Z,
            run: P,
            resize: me,
            copyDepth: B,
            ensureDepthCopy: ee,
            applyQuality: ue,
            dispose: Y,
            materials: r,
            rt: y,
            size: M,
            TUNE: g,
            autoExposure: !0,
            pass: l,
            quad: s,
            fsCam: o
        };
        return J
    }

var Jy = 2,
        Ky = 1;

async function Hg(i) {
        let e = i.params || {},
            t = document.getElementById("view"),
            n = new gf({
                canvas: t,
                antialias: !1,
                powerPreference: "high-performance",
                alpha: !1,
                depth: !0,
                stencil: !1
            });
        n.outputColorSpace = Vn, n.toneMapping = ys, n.toneMappingExposure = 1, n.shadowMap.enabled = !0, n.shadowMap.type = gc, n.shadowMap.autoUpdate = !1, n.autoClear = !1, n.info.autoReset = !1, n.setClearColor(0, 1);
        let s = n.getContext(),
            o = {
                post: !1,
                shadow: !1,
                sky: !1,
                other: 0
            };
        n.debug.onShaderError = (ie, F, X, ne) => {
            let re = "",
                $ = "";
            try {
                re = ie.getShaderSource(ne) || "", $ = (ie.getShaderInfoLog(ne) || "") + " " + (ie.getShaderInfoLog(X) || "") + " " + (ie.getProgramInfoLog(F) || "")
            } catch {}
            let ue = "material";
            re.includes(Bg) ? (o.post = !0, ue = "post pass " + (re.match(/SALTLINE_POST (\S+)/) || [])[1]) : re.includes("SALTLINE_SKY") ? (o.sky = !0, ue = "sky") : re.includes(Yy) ? (o.shadow = !0, ue = "material (soft shadow chunk active)") : o.other++, console.error(`[render] shader error in ${ue}: ${$.trim().slice(0,700)}`)
        };
        let r = new ir,
            a = new Wn(Pi.fov, 16 / 9, .08, 900);
        a.layers.set(vf), a.rotation.order = "YXZ", r.add(a);
        let l = new Wn(Pi.viewFov, 16 / 9, .01, 10);
        l.layers.set(zc);
        let c = Oy(),
            u = Hy(c);
        r.add(u.mesh);
        let h = new W0(Mn.color, Mn.intensity);
        h.name = "sun", h.castShadow = !0;
        let f = Gy(h, new W(-41, -.2, -33), new W(37, 32, 31), new W(-41, -3, -64), new W(72, 36, 34)),
            p = () => Math.min(i.quality.shadow || 2048, n.capabilities.maxTextureSize);
        h.shadow.mapSize.set(p(), p()), h.shadow.bias = -12e-5, h.shadow.normalBias = .02, h.shadow.radius = 1, h.shadow.autoUpdate = !0, r.add(h, h.target);
        let d = !1;
        try {
            d = qy(f, {
                taps: i.quality.name === "low" ? 10 : 16,
                searchTaps: 8
            })
        } catch (ie) {
            console.warn("[render] soft shadows unavailable: " + ie)
        }
        let v = 6,
            g = [];
        for (let ie = 0; ie < v; ie++) {
            let F = new Qr(16777215, 0, 12, 2);
            F.userData = {
                busy: !1,
                ttl: 0,
                dur: 0,
                peak: 0,
                persistent: !1
            }, r.add(F), g.push(F)
        }
        let x = {
                flash(ie, F = 16763008, X = 30, ne = 10, re = .06) {
                    let $ = g.find(ue => !ue.userData.busy) || g.filter(ue => !ue.userData.persistent).sort((ue, me) => ue.userData.ttl - me.userData.ttl)[0];
                    $ && ($.position.copy(ie), $.color.set(F), $.distance = ne, $.intensity = X, Object.assign($.userData, {
                        busy: !0,
                        ttl: re,
                        dur: re,
                        peak: X,
                        persistent: !1
                    }))
                },
                acquire() {
                    let ie = g.find(F => !F.userData.busy);
                    return ie ? (ie.userData.busy = !0, ie.userData.persistent = !0, ie.intensity = 0, {
                        light: ie,
                        release() {
                            ie.userData.busy = !1, ie.userData.persistent = !1, ie.intensity = 0
                        }
                    }) : null
                },
                update(ie) {
                    for (let F of g) {
                        let X = F.userData;
                        X.busy && !X.persistent && (X.ttl -= ie, X.ttl <= 0 ? (X.busy = !1, F.intensity = 0) : F.intensity = X.peak * (X.ttl / X.dur))
                    }
                }
            },
            y = null;
        try {
            y = Vy(n, u), r.environment = y.texture, r.environmentIntensity = Jy
        } catch (ie) {
            console.error("[render] environment capture failed: " + (ie && ie.stack || ie))
        }
        let b = new Tr(4, 4);
        b.type = Zs, b.minFilter = b.magFilter = Gn;
        let m = new si(4, 4, {
                type: js,
                format: _n,
                minFilter: Zt,
                magFilter: Zt,
                depthBuffer: !0,
                stencilBuffer: !1,
                depthTexture: b,
                samples: i.quality.msaa | 0,
                generateMipmaps: !1
            }),
            A = null,
            _ = e.post !== "0";
        if (e.ao === "0" && (i.quality.ao = !1), e.vol === "0" && (i.quality.volSteps = 0), e.bloom === "0" && (i.quality.bloom = !1), e.mb === "1" && (i.quality.motionBlur = !0), _) try {
            A = jy(n, i, {
                noiseTex: c
            })
        } catch (ie) {
            _ = !1, console.error("[render] post chain failed to initialise, using forward fallback: " + (ie && ie.stack || ie))
        }
        let M = !!(e.shot || e.show),
            E = !1,
            w = {
                t: 99,
                power: 0,
                value: 0
            };
        i.events && i.events.on && i.events.on("thunder", ie => {
            w.t = 0, w.power = Math.min(1, ie && ie.intensity || .6);
            let F = Math.PI * (.55 + Math.random() * .9);
            u.material.uniforms.uFlashDir.value.set(Math.cos(F), .35 + Math.random() * .3, Math.sin(F) * (Math.random() < .5 ? -1 : 1)).normalize()
        });
        let S = {
            scale: 1,
            enabled: !(e.shot || e.show || e.dynres === "0"),
            acc: 0,
            n: 0,
            settle: 3.5,
            upWait: 4,
            upDelay: 4
        };

        function z(ie) {
            if (!S.enabled || !_ || ie > 1500) return;
            if (S.settle -= ie / 1e3, S.upWait -= ie / 1e3, S.settle > 0) {
                S.acc = 0, S.n = 0;
                return
            }
            if (S.acc += ie, S.n++, S.n < 45 && S.acc < 900) return;
            let F = S.acc / S.n;
            S.acc = 0, S.n = 0;
            let X = S.scale;
            if (F > 21.5 && X > .6 ? (X = F > 45 ? .6 : Math.max(.6, X - (F > 30 ? .2 : .1)), S.upDelay = Math.min(60, S.upDelay * 2), S.upWait = S.upDelay) : F < 17.4 && X < 1 && S.upWait <= 0 ? (X = Math.min(1, X + .1), S.upWait = 2) : F < 17.4 && X >= 1 && (S.upDelay = 4), X = Math.round(X * 10) / 10, X <= .6 && F > 26) {
                S.floorHits = (S.floorHits || 0) + 1;
                let ne = {
                    ultra: "high",
                    high: "medium",
                    medium: "low"
                } [i.quality.name];
                if (S.floorHits >= 2 && ne && Pr[ne]) {
                    S.floorHits = 0, S.scale = .8, S.settle = 2, S.upDelay = 4, console.log("[render] frame time " + F.toFixed(0) + " ms at minimum scale: dropping quality to " + ne);
                    try {
                        N.setQuality({
                            ...Pr[ne]
                        }), i.events.emit("quality:auto", {
                            name: ne
                        })
                    } catch {}
                    return
                }
            } else S.floorHits = 0;
            X !== S.scale && (S.scale = X, S.settle = 1, N.resize())
        }
        let H = [],
            O = {},
            q = (ie, F) => {
                O[ie] || (O[ie] = 1, console.error(F))
            },
            U = {
                calls: 0,
                tris: 0
            },
            T = 0,
            D = 0;

        function C() {
            a.updateMatrixWorld(!0), l.matrixAutoUpdate = !1, l.matrixWorldAutoUpdate = !1, l.matrixWorld.copy(a.matrixWorld), l.matrixWorldInverse.copy(l.matrixWorld).invert()
        }

        function G() {
            n.toneMapping !== xc && (n.toneMapping = xc), n.toneMappingExposure = .6 * N.exposure * (1 - Math.min(1, Math.max(0, N.post.fade))), n.setRenderTarget(null), n.clear(), n.shadowMap.needsUpdate = !0, n.render(r, a), n.clearDepth(), n.render(r, l)
        }

        function j(ie) {
            n.toneMapping !== ys && (n.toneMapping = ys), n.toneMappingExposure = 1, n.setRenderTarget(m), n.clear(!0, !0, !1), (i.quality.name === "ultra" || e.shot || (T & 1) === 0 || !h.shadow.map) && (n.shadowMap.needsUpdate = !0), n.render(r, a), E && (A.copyDepth(b), n.setRenderTarget(m)), s.depthRange(0, .05);
            let F = r.environmentIntensity,
                X = r.environment,
                ne = N.interiorEnv && i.level && i.level.interiorBoxes && i.level.interiorBoxes[0],
                re = !!(ne && ne.min && a.position.x > ne.min.x && a.position.x < ne.max.x && a.position.z > ne.min.z && a.position.z < ne.max.z && a.position.y < ne.max.y);
            re && (r.environment = N.interiorEnv), r.environmentIntensity = F * (re ? Ky / Jy : 1) * (N.viewFill || 1.35);
            try {
                n.render(r, l)
            } finally {
                s.depthRange(0, 1), r.environmentIntensity = F, r.environment = X
            }
            if (A.run({
                    hdr: m,
                    camera: a,
                    sun: h,
                    dt: ie,
                    post: N.post,
                    exposure: N.exposure,
                    time: i.time ? i.time.t : T / 60,
                    fast: M,
                    thunder: w.value
                }), n.setRenderTarget(null), o.post) throw new Error("a post shader failed to compile")
        }
        let N = {
                renderer: n,
                scene: r,
                camera: a,
                viewCamera: l,
                sun: h,
                sky: u.mesh,
                sunDir: Mn.dir.clone(),
                lightPool: x,
                post: {
                    damage: 0,
                    lowHealth: 0,
                    ads: 0,
                    flash: 0,
                    fade: 0,
                    saturation: 1,
                    focusDist: 0,
                    shake: 0,
                    wet: 1
                },
                exposure: 1,
                env: y ? y.texture : null,
                interiorEnv: null,
                resolution: new Ae(4, 4),
                depthTextureIsLive: !1,
                tune: A ? A.TUNE : {},
                get advanced() {
                    return _
                },
                get autoExposure() {
                    return A ? A.autoExposure : !1
                },
                set autoExposure(ie) {
                    A && (A.autoExposure = !!ie)
                },
                get depthTexture() {
                    if (!A) return null;
                    E = !0;
                    try {
                        return A.ensureDepthCopy()
                    } catch {
                        return null
                    }
                },
                addPrePass(ie) {
                    H.push(ie)
                },
                renderWorld(ie, F) {
                    let X = n.getRenderTarget(),
                        ne = n.shadowMap.needsUpdate,
                        re = n.toneMapping,
                        $ = n.toneMappingExposure,
                        ue = ie.layers.mask;
                    ie.layers.disable(zc), n.shadowMap.needsUpdate = !1, n.toneMapping = ys, n.toneMappingExposure = 1;
                    try {
                        n.setRenderTarget(F), n.clear(), n.render(r, ie)
                    } finally {
                        ie.layers.mask = ue, n.setRenderTarget(X), n.shadowMap.needsUpdate = ne, n.toneMapping = re, n.toneMappingExposure = $
                    }
                },
                async onLevelReady() {
                    n.shadowMap.needsUpdate = !0;
                    try {
                        K()
                    } catch (ie) {
                        console.error("[render] interior probe failed: " + (ie && ie.stack || ie))
                    }
                    try {
                        if (_ && n.setRenderTarget(m), await n.compileAsync(r, a), N.interiorEnv) {
                            let ie = r.environment;
                            r.environment = N.interiorEnv;
                            try {
                                n.compile(r, l)
                            } finally {
                                r.environment = ie
                            }
                        }
                    } catch {}
                    n.setRenderTarget(null), S.settle = 3.5, S.acc = 0, S.n = 0
                },
                setQuality(ie) {
                    i.quality = ie;
                    let F = p();
                    h.shadow.mapSize.x !== F && (h.shadow.mapSize.set(F, F), h.shadow.map && (h.shadow.map.dispose(), h.shadow.map = null));
                    let X = ie.msaa | 0;
                    m.samples !== X && (m.samples = X, m.dispose()), A && A.applyQuality(), N.resize()
                },
                resize() {
                    let ie = Math.max(2, t.clientWidth || window.innerWidth),
                        F = Math.max(2, t.clientHeight || window.innerHeight),
                        X = Math.min(window.devicePixelRatio || 1, 2),
                        ne = i.quality.scale || 1;
                    if (_) {
                        n.setPixelRatio(X), n.setSize(ie, F, !1);
                        let re = ne * S.scale,
                            $ = {
                                low: 1e6,
                                medium: 15e5,
                                high: 23e5,
                                ultra: 37e5
                            } [i.quality.name] || 23e5,
                            ue = ie * X * F * X * re * re;
                        ue > $ && (re *= Math.sqrt($ / ue));
                        let me = Math.max(16, Math.round(ie * X * re)),
                            ee = Math.max(16, Math.round(F * X * re));
                        m.setSize(me, ee), (b.image.width !== me || b.image.height !== ee) && (b.image.width = me, b.image.height = ee, b.needsUpdate = !0), A && A.resize(me, ee), N.resolution.set(me, ee)
                    } else n.setPixelRatio(X * ne), n.setSize(ie, F, !1), N.resolution.set(Math.round(ie * X * ne), Math.round(F * X * ne));
                    a.aspect = l.aspect = ie / F, a.updateProjectionMatrix(), l.updateProjectionMatrix()
                },
                frame(ie) {
                    let F = performance.now();
                    D && z(F - D), D = F, T++, n.info.reset(), x.update(ie);
                    let X = i.time ? i.time.t : T / 60;
                    u.material.uniforms.uTime.value = X, w.t += ie, w.value = w.t < .9 ? w.power * Math.exp(-w.t * 5) * (.55 + .45 * Math.sin(w.t * 47) * Math.sin(w.t * 13 + 1)) * .35 : 0, u.material.uniforms.uFlash.value = Math.max(0, w.value), C();
                    for (let ne of H) try {
                        ne(n, r, a)
                    } catch (re) {
                        q("pre", "[render] pre-pass threw: " + (re && re.stack || re))
                    }
                    if (_) try {
                        j(ie)
                    } catch (ne) {
                        _ = !1;
                        try {
                            s.depthRange(0, 1), n.setRenderTarget(null)
                        } catch {}
                        console.error("[render] advanced pipeline disabled, falling back to forward rendering: " + (ne && ne.stack || ne)), N.resize()
                    }
                    _ || G(), U = {
                        calls: n.info.render.calls,
                        tris: n.info.render.triangles
                    }
                },
                stats() {
                    let ie = n.info;
                    return {
                        calls: U.calls,
                        tris: U.tris,
                        geos: ie.memory.geometries,
                        tex: ie.memory.textures,
                        programs: ie.programs ? ie.programs.length : 0,
                        res: [N.resolution.x, N.resolution.y],
                        scale: S.scale,
                        advanced: _,
                        softShadows: d,
                        adapt: A && e.shot ? A.readAdapt() : void 0
                    }
                }
            },
            Q = null;

        function K() {
            let ie = i.level && i.level.interiorBoxes;
            if (!ie || !ie.length) return;
            let F = ie[0],
                X = (F.min.x + F.max.x) / 2,
                ne = (F.min.z + F.max.z) / 2,
                re = F.min.y + Math.min(2.4, (F.max.y - F.min.y) * .4);
            if (!Q) {
                let ee = new D0(128, {
                    type: js,
                    generateMipmaps: !1
                });
                Q = {
                    cubeRT: ee,
                    cam: new z0(.15, 300, ee),
                    pmrem: new ia(n),
                    out: null
                }, Q.cam.layers.set(vf)
            }
            Q.cam.position.set(X, re, ne), Q.cam.updateMatrixWorld(!0);
            let $ = n.toneMapping;
            n.toneMapping = ys, u.material.uniforms.uEnv.value = 1, n.shadowMap.needsUpdate = !0;
            try {
                Q.cam.update(n, r)
            } finally {
                u.material.uniforms.uEnv.value = 0, n.toneMapping = $, n.setRenderTarget(null)
            }
            Q.out && Q.out.dispose(), Q.out = Q.pmrem.fromCubemap(Q.cubeRT.texture), N.interiorEnv = Q.out.texture;
            let ue = 0,
                me = new Set;
            r.traverse(ee => {
                let B = ee.material ? Array.isArray(ee.material) ? ee.material : [ee.material] : null;
                if (B)
                    for (let P of B) !P || me.has(P) || !P.userData || P.userData.interior !== !0 || !("envMap" in P) || (me.add(P), P.envMap = N.interiorEnv, P.userData.keepEnvIntensity || (P.envMapIntensity = Ky), P.needsUpdate = !0, ue++)
            }), ue && console.log(`[render] interior probe assigned to ${ue} material(s)`)
        }
        N.captureInteriorProbe = K, N.resize(), window.addEventListener("resize", () => N.resize());
        try {
            let ie = new Qt({
                    color: 8421504
                }),
                F = new Qe(new un(1, 1, 1), ie);
            F.castShadow = F.receiveShadow = !0, F.position.set(0, .5, -3), r.add(F);
            let X = () => {
                C(), _ ? j(.016) : G()
            };
            try {
                X()
            } catch (ne) {
                _ && (_ = !1, console.error("[render] advanced pipeline failed its self test, using forward fallback: " + (ne && ne.message || ne)))
            }
            if (o.shadow && d) {
                Xy(), d = !1, o.shadow = !1, n.shadowMap.type = Eh, h.shadow.radius = 2, ie.dispose(), F.material = new Qt({
                    color: 8421505
                }), console.warn("[render] soft shadow chunk rejected by the driver, using stock PCF");
                try {
                    X()
                } catch {
                    _ = !1
                }
            }
            if (o.sky && console.error("[render] sky shader failed to compile"), r.remove(F), F.geometry.dispose(), ie.dispose(), F.material.dispose(), !_) {
                try {
                    s.depthRange(0, 1), n.setRenderTarget(null)
                } catch {}
                N.resize()
            }
            T = 0
        } catch (ie) {
            console.error("[render] self test threw: " + (ie && ie.stack || ie))
        }
        return N
    }

function sA(i) {
        let e = new wt;
        e.name = "render-showcase";
        let t = h => (e.add(h), h),
            n = new ls(.42, 48, 24);
        for (let h = 0; h < 2; h++)
            for (let f = 0; f < 7; f++) {
                let p = new Qt({
                        color: h ? 12170408 : 8006172,
                        roughness: .06 + f * .15,
                        metalness: h ? 1 : 0
                    }),
                    d = new Qe(n, p);
                d.position.set(-3.6 + f * 1.2, .42 + h * 1.05, h * -1.1), d.castShadow = d.receiveShadow = !0, t(d)
            }
        let s = [
            ["paint_orange", -5.2, 1.4, 1.3, 1.2, 2.2],
            ["steel_worn", 4.6, 1, .9, 1, 1.6],
            ["paint_teal", 5.6, .6, 2.4, .9, 3.6],
            ["concrete", -2.2, .5, .5, 2.6, 3.2]
        ];
        for (let [h, f, p, d, v, g] of s) {
            let x = Qi(Wi(p, d, v, .03, "bottom"), i.mats.get(h));
            x.position.set(f, 0, g), x.rotation.y = f * .2, t(x)
        }
        for (let h = 0; h < 5; h++) {
            let f = Qi(Wi(.5, .5, .5, .02, "bottom"), i.mats.get("wood_pallet"));
            f.position.set(.5 + h * .52, 0, 3.4 + h % 2 * .04), t(f)
        } {
            let h = Qi(Wi(.5, .5, .5, .02, "bottom"), i.mats.get("wood_pallet"));
            h.position.set(1.3, .5, 3.42), h.rotation.y = .3, t(h)
        }
        let o = i.mats.get("concrete_dirty"),
            r = 9,
            a = 7.5,
            l = [
                [-14, -5.2],
                [-4.7, -1.6],
                [-1.1, 1.9],
                [2.4, 5.6],
                [6.3, 14]
            ];
        for (let [h, f] of l) {
            let p = Qi($e(.4, a, f - h, "bottom"), o);
            p.position.set(r, 0, (h + f) / 2), t(p)
        } {
            let h = Qi($e(.4, 1.2, 28, "bottom"), o);
            h.position.set(r, a, 0), t(h)
        }
        let c = [
            [-12, 0, -9, 6, 4, .3],
            [-12, 0, -3, 6, 4, .3],
            [-15, 0, -6, .3, 4, 6.3],
            [-12, 4, -6, 6.6, .3, 6.6]
        ];
        for (let [h, f, p, d, v, g] of c) {
            let x = Qi($e(d, v, g, "bottom"), i.mats.get("steel_dark"));
            x.position.set(h, f, p), t(x)
        } {
            let h = new Qe($e(2.4, .06, .06), i.mats.emissive(16756832, 14));
            h.position.set(-12, 3.6, -6), t(h)
        } {
            let h = new Qe(new ls(.06, 12, 8), i.mats.emissive(16726560, 30));
            h.position.set(4.6, 1.02, 1.6), t(h)
        }
        return i.scene.add(e), {
            cam: [-8.5, 1.7, 4.2],
            target: [3, 1.5, .4],
            update: () => {
                let h = i.render.post,
                    f = Math.round(i.camera.position.y * 1e3) % 10;
                h.damage = f === 1 ? .8 : 0, h.lowHealth = f === 2 ? .85 : 0, h.ads = f === 3 ? 1 : 0, h.flash = f === 4 ? .35 : 0, h.fade = f === 5 ? .5 : 0
            }
        }
    }
