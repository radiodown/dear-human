// Saltline upstream, extracted from the preserved bundle. See ../README.md.
var oi = {
            min: new W(-40, 0, -30),
            max: new W(40, 30, 30),
            groundY: 0,
            seaY: -1.6,
            quayX: 30
        },
        Mn = {
            dir: new W(.916, .225, .331).normalize(),
            color: new Ve(1, .72, .42),
            intensity: 9
        },
        en = {
            zenith: new Ve(.055, .085, .13),
            horizon: new Ve(.95, .55, .28),
            horizonAway: new Ve(.16, .22, .3),
            fog: new Ve(.42, .47, .52)
        },
        Pi = {
            eye: 1.68,
            crouchEye: 1.05,
            radius: .32,
            height: 1.8,
            fov: 74,
            viewFov: 54
        },
        vf = 0,
        zc = 1,
        Pr = {
            test: {
                name: "test",
                scale: 1,
                msaa: 0,
                shadow: 1024,
                tex: 256,
                volSteps: 10,
                ao: !0,
                planar: .5,
                bloom: !0,
                motionBlur: !1,
                rain: .4
            },
            low: {
                name: "low",
                scale: .7,
                msaa: 0,
                shadow: 2048,
                tex: 512,
                volSteps: 12,
                ao: !1,
                planar: 0,
                bloom: !0,
                motionBlur: !1,
                rain: .5
            },
            medium: {
                name: "medium",
                scale: .85,
                msaa: 2,
                shadow: 2048,
                tex: 1024,
                volSteps: 16,
                ao: !0,
                planar: .5,
                bloom: !0,
                motionBlur: !1,
                rain: .8
            },
            high: {
                name: "high",
                scale: 1,
                msaa: 4,
                shadow: 4096,
                tex: 1024,
                volSteps: 24,
                ao: !0,
                planar: .5,
                bloom: !0,
                motionBlur: !0,
                rain: 1
            },
            ultra: {
                name: "ultra",
                scale: 1,
                msaa: 4,
                shadow: 4096,
                tex: 2048,
                volSteps: 40,
                ao: !0,
                planar: 1,
                bloom: !0,
                motionBlur: !0,
                rain: 1
            }
        };

function zy(i) {
        if (i && Pr[i]) return {
            ...Pr[i]
        };
        if (/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 900) return {
            ...Pr.low
        };
        let t = "";
        try {
            let s = document.createElement("canvas"),
                o = s.getContext("webgl2") || s.getContext("webgl");
            if (o) {
                let r = o.getExtension("WEBGL_debug_renderer_info");
                t = String(r ? o.getParameter(r.UNMASKED_RENDERER_WEBGL) : o.getParameter(o.RENDERER));
                let a = o.getExtension("WEBGL_lose_context");
                a && a.loseContext()
            }
        } catch {}
        return {
            .../SwiftShader|llvmpipe|Software|Mali|Adreno|PowerVR/i.test(t) || /Intel/i.test(t) && !/Arc/i.test(t) ? Pr.medium : Pr.high
        }
    }

function Dy() {
        let i = new Map;
        return {
            on(e, t) {
                return i.has(e) || i.set(e, []), i.get(e).push(t), () => this.off(e, t)
            },
            off(e, t) {
                let n = i.get(e);
                if (n) {
                    let s = n.indexOf(t);
                    s >= 0 && n.splice(s, 1)
                }
            },
            emit(e, t) {
                let n = i.get(e);
                if (n)
                    for (let s = 0; s < n.length; s++) try {
                        n[s](t)
                    } catch (o) {
                        console.error(`[events] handler for "${e}" threw`, o)
                    }
            }
        }
    }

function il(i = 1337) {
        let e = i >>> 0,
            t = () => {
                e |= 0, e = e + 1831565813 | 0;
                let n = Math.imul(e ^ e >>> 15, 1 | e);
                return n = n + Math.imul(n ^ n >>> 7, 61 | n) ^ n, ((n ^ n >>> 14) >>> 0) / 4294967296
            };
        return t.range = (n, s) => n + (s - n) * t(), t.int = (n, s) => Math.floor(n + (s - n + 1) * t()), t.pick = n => n[Math.floor(t() * n.length)], t.sign = () => t() < .5 ? -1 : 1, t.fork = () => il(Math.floor(t() * 4294967296)), t
    }

var Zn = (i, e, t) => Math.min(t, Math.max(e, i)),
        bi = (i, e, t) => i + (e - i) * t,
        Fo = i => Math.min(1, Math.max(0, i)),
        sl = (i, e, t) => {
            let n = Fo((t - i) / (e - i));
            return n * n * (3 - 2 * n)
        },
        kn = (i, e, t, n) => e + (i - e) * Math.exp(-t * n);

var Wt = () => {},
        dr = {
            ground: () => ({
                stub: !0,
                update: Wt,
                wetnessAt: () => .5,
                isPuddle: () => !1
            }),
            backdrop: () => ({
                stub: !0,
                update: Wt
            }),
            fx: () => ({
                stub: !0,
                update: Wt,
                muzzleFlash: Wt,
                tracer: Wt,
                impact: Wt,
                sparks: Wt,
                smoke: Wt,
                explosion: Wt,
                debris: Wt,
                shell: Wt,
                decal: Wt,
                dust: Wt,
                clear: Wt,
                splash: Wt,
                addEmitter: () => ({
                    stop: Wt,
                    setPos: Wt
                })
            }),
            audio: () => {
                let i = {
                    setPos: Wt,
                    setGain: Wt,
                    setPitch: Wt,
                    stop: Wt
                };
                return {
                    stub: !0,
                    update: Wt,
                    resume: Wt,
                    play: Wt,
                    loop: () => i,
                    setIntensity: Wt,
                    setInterior: Wt,
                    setVolume: Wt,
                    setPaused: Wt
                }
            },
            weapon: () => ({
                stub: !0,
                update: Wt,
                reset: Wt,
                setVisible: Wt,
                ammo: 30,
                magSize: 30,
                reserve: 120,
                state: "idle",
                name: "KR-7",
                ads: 0,
                spread: .01
            }),
            enemies: () => ({
                stub: !0,
                list: [],
                update: Wt,
                spawn: () => null,
                raycast: () => null,
                aliveCount: () => 0,
                clear: Wt,
                alert: Wt
            }),
            hud: () => ({
                stub: !0,
                update: Wt,
                show: Wt,
                setObjective: Wt,
                message: Wt,
                hitmarker: Wt
            }),
            mats: () => {
                let i = new Map;
                return {
                    stub: !0,
                    get: t => (i.has(t) || i.set(t, new Qt({
                        color: 7829367,
                        roughness: .7
                    })), i.get(t)),
                    emissive: (t = 16777215, n = 4) => new Nn({
                        color: new Ve(t).multiplyScalar(n)
                    }),
                    names: [],
                    decal: () => ({
                        material: new Nn({
                            transparent: !0,
                            opacity: 0
                        }),
                        aspect: 1
                    }),
                    label: () => ({
                        material: new Nn({
                            transparent: !0,
                            opacity: 0
                        }),
                        aspect: 4
                    }),
                    uniforms: {
                        wet: {
                            value: 1
                        }
                    },
                    update: Wt
                }
            }
        };
