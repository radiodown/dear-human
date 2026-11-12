// Saltline upstream, extracted from the preserved bundle. See ../README.md.
var gM = {
        mats: qg,
        level: cv,
        backdrop: mv,
        ground: vv,
        fx: Sv,
        weapon: Xv,
        enemies: ex,
        props: $g,
        render: Vg
    };

window.__frames = 0;

window.__ready = !1;

window.__fatal = null;

window.__errors = [];

var vM = document.getElementById("boot"),
        xM = document.getElementById("boot-msg"),
        yM = document.getElementById("boot-fill");

function bM(i) {
        window.__fatal = String(i), console.error("[fatal] " + i);
        let e = document.getElementById("fatal");
        e || (e = document.createElement("div"), e.id = "fatal", document.getElementById("app").appendChild(e)), e.textContent = "Saltline could not start: " + i
    }

window.addEventListener("error", i => {
        window.__errors.push(String(i.message))
    });

{
        let i = console.error.bind(console);
        console.error = (...e) => {
            try {
                window.__errors.push(e.map(t => t && t.stack || String(t)).join(" ").slice(0, 400))
            } catch {}
            i(...e)
        }
    }

var KC = () => new Promise(i => setTimeout(i, 0));

async function Nr(i, e) {
        xM && (xM.textContent = i), yM && (yM.style.width = Math.round(e * 100) + "%"), await KC()
    }

async function QC() {
        let i = Object.fromEntries(new URLSearchParams(location.search)),
            e = !!i.bench || location.hash === "#bench";
        e && (i.noaudio = "1", i.autostart = "1");
        let t = {
            THREE: lt,
            params: i,
            events: Dy(),
            rng: il(+(i.seed || 4207)),
            time: {
                t: 0,
                dt: 0,
                frame: 0,
                real: 0
            },
            quality: zy(i.q || (i.shot ? "test" : ""))
        };
        window.__G = t;
        let n = i.show && gM[i.show] ? i.show : null;
        t.showcase = n;
        let s = null;

        function o(h) {
            if (h.cam) {
                let f = String(h.cam).split(",").map(Number);
                s = {
                    pos: new W(f[0], f[1], f[2]),
                    look: new W(f[3] ?? 0, f[4] ?? 1, f[5] ?? 0)
                }
            }
            h.cam === "" && (s = null), h.fov && (t.camera.fov = +h.fov, t.camera.updateProjectionMatrix()), h.exposure && (t.render.exposure = +h.exposure)
        }
        window.__setShot = o;
        async function r(h, f, p, d = !1) {
            let v = performance.now();
            try {
                t[h] = await p()
            } catch (x) {
                if (console.error(`[boot] module "${h}" failed: ${x&&x.stack||x}`), d || !dr[h]) throw x;
                t[h] = dr[h]()
            }
            let g = performance.now() - v;
            g > 150 && console.log(`[boot] ${h} ${g.toFixed(0)}ms`)
        }
        if (await Nr("Waking the renderer", .04), await r("render", "render", () => Hg(t), !0), t.renderer = t.render.renderer, t.scene = t.render.scene, t.camera = t.render.camera, t.viewCamera = t.render.viewCamera, await Nr("Mixing paint, rust and rain", .12), await r("mats", "materials", () => Gg(t)), t.physics = d3(t), t.props = Yg(t), t.input = n ? tP() : createGInput(t), n) {
            let h = Qi(new rn(80, 80).rotateX(-Math.PI / 2), t.mats.get("concrete"), {
                cast: !1
            });
            if (t.scene.add(h), t.level = {
                    stub: !0,
                    playerStart: {
                        pos: new W(0, 0, 4),
                        yaw: 0
                    },
                    objectives: [],
                    enemySpawns: [],
                    zones: [],
                    interiorBoxes: [],
                    cinematicPath: [],
                    extraction: {
                        pos: new W,
                        radius: 2
                    },
                    groundSurfaceAt: () => "concrete",
                    update() {}
                }, t.backdrop = dr.backdrop(), t.ground = dr.ground(), t.physics.build(), n === "fx") await r("fx", "fx", () => Cf(t));
            else try {
                t.fx = await Cf(t)
            } catch {
                t.fx = dr.fx()
            }
            t.audio = dr.audio(), t.hud = dr.hud(), t.player = nP(t), t.combat = zv(t), t.weapon = dr.weapon(), t.enemies = dr.enemies(), t.game = {
                state: "showcase",
                update: () => !1,
                start() {}
            };
            let f = null;
            try {
                f = await gM[n].showcase(t)
            } catch (p) {
                bM(`showcase "${n}" threw: ${p&&p.stack||p}`)
            }
            t.showcaseInfo = f || {}, f && f.cam && o({
                cam: [...f.cam, ...f.target || [0, 1, 0]].join(",")
            })
        } else {
            if (await Nr("Stacking containers", .34), await r("level", "level", () => C1(t), !0), await Nr("Raising the cranes", .5), await r("backdrop", "backdrop", () => pv(t)), await Nr("Flooding the apron", .58), await r("ground", "ground", () => O1(t)), t.ground.stub) {
                let h = Qi(new rn(400, 400).rotateX(-Math.PI / 2), t.mats.get("asphalt"), {
                    cast: !1
                });
                t.scene.add(h)
            }
            t.physics.build(), await Nr("Loading tracers and smoke", .66), await r("fx", "fx", () => Cf(t)), await r("audio", "audio", () => i.noaudio ? dr.audio() : c_(t)), t.side = createGContext(t), t.player = x_(t.side.context), t.combat = zv(t), await Nr("Checking the rifle", .74), await r("weapon", "weapon", () => dm(t.side.context)), await Nr("Waking the Harbormaster", .82), await r("enemies", "enemies", () => dr.enemies()), await r("hud", "hud", () => dr.hud()), t.game = createGGame(t)
        }
        await Nr("Waiting for first light", .92);
        try {
            await t.render.onLevelReady()
        } catch (h) {
            console.error("[boot] render.onLevelReady failed: " + (h && h.stack || h))
        }
        let a = 0;
        if (window.__stats = () => ({
                ...t.render.stats ? t.render.stats() : {},
                fps: a ? +(1 / a).toFixed(1) : 0,
                state: t.game && t.game.state
            }), i.cam && o(i), i.fov && o({
                fov: i.fov
            }), !n && (i.shot || i.autostart)) try {
            t.game.start({
                skipIntro: !0
            })
        } catch (h) {
            console.error("[boot] game.start failed", h)
        }
        i.noweapon && t.weapon.setVisible && t.weapon.setVisible(!1), e && eP(t), await Nr("Ready", 1), vM.classList.add("done"), setTimeout(() => {
            vM.hidden = !0
        }, 700);
        let l = performance.now(),
            c = 1,
            u = (h, f) => {
                let p = t[h];
                if (p && p.update) try {
                    p.update(f)
                } catch (d) {
                    u.err[h] || (u.err[h] = 1, console.error(`[loop] ${h}.update threw: ${d&&d.stack||d}`))
                }
            };
        u.err = {}, t.renderer.setAnimationLoop(() => {
            if (document.hidden) { l = performance.now(); return; }
            let h = performance.now(),
                f = (h - l) / 1e3;
            l = h, a = a ? a * .95 + f * .05 : f;
            let p = Math.min(f, .05);
            i.dt && (p = +i.dt), t.time.dt = p, t.time.t += p, t.time.real = h / 1e3, t.time.frame++, u("input", p);
            let d = !1;
            try {
                d = t.game.update(p) !== !1 && t.game.state !== "title" && t.game.state !== "paused"
            } catch (v) {
                u.err.game || (u.err.game = 1, console.error("[loop] game.update threw: " + (v && v.stack || v)))
            }
            if (n) {
                if (t.showcaseInfo.update) try {
                    t.showcaseInfo.update(p)
                } catch (v) {
                    u.err.sc || (u.err.sc = 1, console.error("[loop] showcase update threw: " + (v && v.stack || v)))
                }
            } else d && (u("player", p), u("weapon", p), u("enemies", p));
            if (t.weapon && t.weapon.setWetness && t.level && t.level.interiorBoxes && t.level.interiorBoxes[0]) {
                let v = t.level.interiorBoxes[0],
                    g = t.camera.position,
                    x = g.x > v.min.x && g.x < v.max.x && g.z > v.min.z && g.z < v.max.z && g.y < v.max.y;
                c += ((x ? .3 : 1) - c) * Math.min(1, p * (x ? .25 : .6));
                try {
                    t.weapon.setWetness(c)
                } catch {}
            }
            t.game.state !== "paused" && (u("fx", p), u("ground", p), u("level", p), u("backdrop", p), u("mats", p)), u("audio", p), u("hud", p), t.side && t.side.frame(p), s && (t.camera.position.copy(s.pos), t.camera.lookAt(s.look)), t.bench && t.bench.frame(f);
            try {
                t.render.frame(p)
            } catch (v) {
                u.err.render || (u.err.render = 1, console.error("[loop] render.frame threw: " + (v && v.stack || v)))
            }
            t.input.endFrame && t.input.endFrame(), window.__frames++, window.__frames === 2 && (window.__ready = !0)
        })
    }

function eP(i) {
        let e = document.createElement("pre");
        e.id = "bench", e.style.cssText = 'position:absolute;left:12px;top:12px;z-index:90;margin:0;padding:10px 12px;font:12px/1.45 "IBM Plex Mono",ui-monospace,monospace;color:#d8f0d0;background:rgba(0,0,0,.72);white-space:pre-wrap;max-width:min(560px,90vw);pointer-events:none', document.getElementById("app").appendChild(e);
        let t = "unknown";
        try {
            let f = i.renderer.getContext(),
                p = f.getExtension("WEBGL_debug_renderer_info");
            t = p ? f.getParameter(p.UNMASKED_RENDERER_WEBGL) : f.getParameter(f.RENDERER)
        } catch {}
        let n = i.level.cinematicPath && i.level.cinematicPath.length >= 2 ? i.level.cinematicPath : [{
                pos: [-32, 1.7, 6],
                look: [0, 2, 5]
            }, {
                pos: [10, 1.7, 6],
                look: [30, 6, 0]
            }],
            s = [],
            o = 0,
            r = 0,
            a = 30,
            l = new W,
            c = new W,
            u = new W,
            h = new W;
        i.player && (i.player.enabled = !1), i.bench = {
            frame(f) {
                o += f;
                let p = o / a % 1 * (n.length - 1),
                    d = Math.min(n.length - 2, Math.floor(p)),
                    v = p - d,
                    g = v * v * (3 - 2 * v);
                if (l.fromArray(n[d].pos), c.fromArray(n[d + 1].pos), u.fromArray(n[d].look), h.fromArray(n[d + 1].look), i.camera.position.lerpVectors(l, c, g), i.camera.lookAt(u.lerp(h, g)), o > 2 && s.push(f * 1e3), s.length > 3e3 && s.shift(), o - r > 1 && s.length > 10) {
                    r = o;
                    let x = s.slice().sort((M, E) => M - E),
                        y = x.reduce((M, E) => M + E, 0) / x.length,
                        b = x[Math.floor(x.length * .99)],
                        m = x[x.length >> 1],
                        A = i.render.stats ? i.render.stats() : {},
                        _ = i.renderer.getDrawingBufferSize(new Ae);
                    e.textContent = `SALTLINE BENCH  t=${o.toFixed(0)}s
GPU: ${t}
buffer ${_.x}x${_.y}  quality ${i.quality.name}  dpr ${window.devicePixelRatio}
frame ms avg ${y.toFixed(1)}  median ${m.toFixed(1)}  p99 ${b.toFixed(1)}  => ${(1e3/y).toFixed(0)} fps
stats ${JSON.stringify(A)}
errors ${window.__errors.length}${window.__errors.length?`
 - `+window.__errors.slice(0,6).join(`
 - `):""}`
                }
            }
        }
    }

function tP() {
        let i = () => {};
        return {
            move: {
                x: 0,
                y: 0
            },
            look: {
                dx: 0,
                dy: 0
            },
            fire: !1,
            ads: !1,
            sprint: !1,
            crouch: !1,
            locked: !1,
            touch: !1,
            sensitivity: 1,
            down: () => !1,
            pressed: () => !1,
            update: i,
            endFrame: i,
            requestLock: i,
            exitLock: i
        }
    }

function nP(i) {
        return {
            pos: new W(0, 0, 4),
            vel: new W,
            yaw: 0,
            pitch: 0,
            health: 100,
            maxHealth: 100,
            alive: !0,
            onGround: !0,
            sprinting: !1,
            crouching: !1,
            ads: 0,
            speed: 0,
            eye: new W(0, Pi.eye, 4),
            forward: new W(0, 0, -1),
            enabled: !1,
            reset() {},
            damage() {},
            heal() {},
            addRecoil() {},
            addShake() {},
            update() {}
        }
    }

QC().catch(i => bM(i && i.stack || i));
