// Saltline upstream, extracted from the preserved bundle. See ../README.md.
var Mt = {
            walk: 3.8,
            sprint: 6.4,
            crouch: 1.9,
            ads: 2.4,
            accelGround: 34,
            decelGround: 26,
            accelAir: 9,
            gravity: 21,
            jumpApex: 1,
            coyote: .12,
            jumpBuffer: .13,
            standHeight: Pi.height,
            crouchHeight: 1.15,
            eyeRate: 11,
            stride: {
                walk: 1.55,
                sprint: 2.1,
                crouch: 1.05
            },
            bobY: .024,
            bobX: .013,
            bobSprint: 1.9,
            bobAds: .22,
            rollStrafe: .02,
            landDip: .36,
            landDipMax: .2,
            fovSprint: 6,
            fovAds: 52,
            adsLook: .6,
            regenDelay: 4,
            regenRate: 25,
            recoilKeep: .35,
            recoilApply: 34,
            recoilRecover: 6.5,
            recoilHold: .09,
            shakeDecay: 1.7,
            shakePitch: .03,
            shakeYaw: .03,
            shakeRoll: .045,
            pitchLimit: 1.5
        },
        rC = Math.sqrt(2 * Mt.gravity * Mt.jumpApex);

function x_(i) {
        let e = i.camera,
            t = () => i.render && i.render.post || n,
            n = {},
            s = Pi.eye,
            o = Mt.standHeight,
            r = 0,
            a = 0,
            l = !0,
            c = 0,
            u = 0,
            h = 0,
            f = 0,
            p = 0,
            d = 0,
            v = 0,
            g = {
                x: 0,
                v: 0
            },
            x = 0,
            y = 0,
            b = 0,
            m = 0,
            A = 0,
            _ = 0,
            M = 0,
            E = 99,
            w = 0,
            S = 0,
            z = 0,
            H = Pi.fov,
            O = 0,
            q = "concrete",
            U = new W,
            T = new In(0, 0, 0, "YXZ"),
            D = new W,
            C = {
                pos: new W,
                eye: new W,
                vel: new W,
                forward: new W(0, 0, -1),
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
                enabled: !0,
                invulnerable: !1,
                baseFov: Pi.fov,
                hurtPulse: 0,
                lookScale: 1,
                lastSafe: D,
                tuning: Mt,
                reset(F) {
                    let X = F || i.level && i.level.playerStart || {
                        pos: new W,
                        yaw: 0
                    };
                    C.pos.copy(X.pos), C.yaw = X.yaw || 0, C.pitch = 0, C.vel.set(0, 0, 0), C.health = C.maxHealth, C.alive = !0, C.onGround = !0, C.sprinting = !1, C.crouching = !1, C.invulnerable = !1, C.speed = 0, s = Pi.eye, o = Mt.standHeight, r = 0, a = 0, l = !0, c = 0, u = 0, h = 0, f = 0, p = d = 0, v = 0, g.x = g.v = 0, x = y = b = m = 0, A = 0, _ = 0, E = 99, w = 0, S = 0, z = 0, C.hurtPulse = 0, D.copy(C.pos);
                    let ne = t();
                    ne.damage = 0, ne.lowHealth = 0, ne.ads = 0, K(0)
                },
                damage(F, X) {
                    !C.alive || C.invulnerable || !(F > 0) || (C.health = Math.max(0, C.health - F), E = 0, w = Math.min(1, w + .35 + F / 40), C.addShake(.22 + F / 70), i.events.emit("player:hit", {
                        amount: F,
                        fromPos: X
                    }), C.health <= 0 && (C.alive = !1, z = 0, C.sprinting = !1, i.events.emit("player:dead", {})))
                },
                heal(F) {
                    C.alive && (C.health = Math.min(C.maxHealth, C.health + F))
                },
                addRecoil(F = 0, X = 0) {
                    let ne = Mt.recoilKeep;
                    C.pitch = Zn(C.pitch + F * ne, -Mt.pitchLimit, Mt.pitchLimit), C.yaw += X * ne, x += F * (1 - ne), y += X * (1 - ne), x = Zn(x, -.3, .3), y = Zn(y, -.2, .2), A = Mt.recoilHold
                },
                addShake(F = .3) {
                    _ = Math.min(1, _ + F)
                },
                setFov(F) {
                    C.baseFov = Zn(+F || Pi.fov, 55, 100)
                },
                update: N
            };
        i.events.on("explosion", F => {
            if (!F || !F.pos) return;
            let X = C.eye.distanceTo(F.pos),
                ne = F.size || 1,
                re = Fo(1 - X / (14 + ne * 10)) * (.35 + .35 * ne);
            re > .01 && C.addShake(re)
        });

        function G() {
            let F = i.physics && i.physics.boxes;
            if (!F) return !0;
            let X = Pi.radius * .9,
                ne = C.pos.y + Mt.crouchHeight - .05,
                re = C.pos.y + Mt.standHeight;
            for (let $ = 0; $ < F.length; $++) {
                let ue = F[$];
                if (!ue.bulletOnly && !(C.pos.x + X < ue.min.x || C.pos.x - X > ue.max.x || C.pos.z + X < ue.min.z || C.pos.z - X > ue.max.z) && ue.min.y < re && ue.max.y > ne) return !1
            }
            return !0
        }

        function j() {
            let F = C.pos.x,
                X = C.pos.z;
            try {
                if (i.ground && i.ground.isPuddle && C.pos.y < .05 && i.ground.isPuddle(F, X)) return "water"
            } catch {}
            if (q && q !== "concrete") return q;
            try {
                return i.level && i.level.groundSurfaceAt && i.level.groundSurfaceAt(F, X) || q || "concrete"
            } catch {
                return q || "concrete"
            }
        }

        function N(F) {
            let X = i.input,
                ne = i.weapon || {};
            if (ne.stub || typeof ne.ads != "number" ? (O = kn(O, C.enabled && X.ads ? 1 : 0, 14, F), C.ads = O) : C.ads = Fo(ne.ads), !C.alive) {
                z += F, Q(F), K(F), ie(F);
                return
            }
            let re = C.enabled;
            C.lookScale = bi(1, Mt.adsLook, C.ads), re && (C.yaw -= X.look.dx * C.lookScale, C.pitch = Zn(C.pitch - X.look.dy * C.lookScale, -Mt.pitchLimit, Mt.pitchLimit), (C.yaw > Math.PI * 4 || C.yaw < -Math.PI * 4) && (C.yaw = C.yaw % (Math.PI * 2))), re && X.crouch ? C.crouching = !0 : C.crouching && G() && (C.crouching = !1), o = C.crouching ? Mt.crouchHeight : Mt.standHeight;
            let ue = re ? X.move.x : 0,
                me = re ? X.move.y : 0,
                ee = ue * ue + me * me > .01,
                B = re && X.sprint && me > .55 && Math.abs(ue) < .6 && !C.crouching && C.ads < .35 && !X.fire;
            C.sprinting = B && C.onGround && C.speed > Mt.walk * .6 || B && !C.onGround && C.sprinting;
            let P = Mt.walk;
            C.crouching ? P = Mt.crouch : B && (P = Mt.sprint), P = bi(P, Math.min(P, Mt.ads), C.ads), me < 0 && (P *= bi(1, .82, -me));
            let V = Math.sin(C.yaw),
                Y = Math.cos(C.yaw);
            U.set(ue * Y - me * V, 0, -ue * V - me * Y).multiplyScalar(P);
            let L = C.onGround ? ee ? Mt.accelGround : Mt.decelGround : ee ? Mt.accelAir : .6,
                Z = U.x - C.vel.x,
                J = U.z - C.vel.z;
            !C.onGround && !ee && (Z = -C.vel.x, J = -C.vel.z);
            let oe = Math.hypot(Z, J),
                fe = L * F;
            oe <= fe || oe < 1e-6 ? (C.onGround || ee) && (C.vel.x = U.x, C.vel.z = U.z) : (C.vel.x += Z / oe * fe, C.vel.z += J / oe * fe), r = C.onGround ? Mt.coyote : Math.max(0, r - F), a = re && X.pressed("jump") ? Mt.jumpBuffer : Math.max(0, a - F), a > 0 && r > 0 && (!C.crouching || G()) && (C.vel.y = rC, a = 0, r = 0, C.onGround = !1, C.crouching = !1, o = Mt.standHeight, i.events.emit("player:jump", {
                pos: C.pos
            })), C.vel.y -= Mt.gravity * F * .5, C.vel.y < -40 && (C.vel.y = -40);
            let le = C.vel.y,
                R = i.physics.moveCapsule(C.pos, C.vel, F, Pi.radius, o, l) || {};
            R.onGround || (C.vel.y -= Mt.gravity * F * .5);
            let I = i.physics.bounds;
            if (I && (C.pos.x = Zn(C.pos.x, I.min.x + .4, I.max.x - .4), C.pos.z = Zn(C.pos.z, I.min.z + .4, I.max.z - .4)), C.onGround = !!R.onGround, R.surface && (q = R.surface), C.onGround) {
                if (!l && c > .12) {
                    let ce = Math.max(0, -le, u);
                    g.v -= Math.min(ce * Mt.landDip, 3.2), ce > 7.5 && C.addShake(Math.min(.5, (ce - 7.5) * .06)), i.events.emit("player:land", {
                        speed: ce,
                        surface: j(),
                        pos: C.pos
                    }), ce > 13 && C.damage((ce - 13) * 7, null), h = .35
                }
                c = 0, u = 0, C.pos.x <= oi.quayX - 1.2 && C.pos.y > -.5 && D.copy(C.pos)
            } else c += F, u = Math.max(u, -C.vel.y);
            l = C.onGround, C.pos.y < oi.seaY - 2.2 && (C.pos.copy(D), C.vel.set(0, 0, 0), C.onGround = !0, l = !0, _ = .6, C.yaw += Math.PI, C.damage(12, null), i.events.emit("player:rescued", {})), C.speed = Math.hypot(C.vel.x, C.vel.z);
            let se = C.crouching ? Mt.stride.crouch : C.sprinting ? Mt.stride.sprint : Mt.stride.walk;
            if (C.onGround && C.speed > .5) {
                let ce = h;
                h += C.speed * F / se, Math.floor(h) > Math.floor(ce) && i.events.emit("player:step", {
                    surface: j(),
                    sprint: C.sprinting,
                    pos: C.pos
                })
            } else C.onGround && (h = kn(h, Math.round(h), 8, F));
            let ae = C.onGround ? Fo(C.speed / Mt.walk) * (C.sprinting ? Mt.bobSprint : 1) * bi(1, Mt.bobAds, C.ads) * (C.crouching ? .7 : 1) : 0;
            f = kn(f, ae, 9, F), d = -Math.cos(h * Math.PI * 2) * Mt.bobY * f, p = Math.sin(h * Math.PI) * Mt.bobX * f;
            let k = C.vel.x * Y - C.vel.z * V;
            v = kn(v, -k / Mt.sprint * Mt.rollStrafe * bi(1, .4, C.ads), 8, F), E += F, E > Mt.regenDelay && C.health < C.maxHealth && (C.health = Math.min(C.maxHealth, C.health + Mt.regenRate * F)), K(F), ie(F)
        }

        function Q(F) {
            C.vel.x = kn(C.vel.x, 0, 5, F), C.vel.z = kn(C.vel.z, 0, 5, F), C.vel.y -= Mt.gravity * F;
            try {
                let X = i.physics.moveCapsule(C.pos, C.vel, F, Pi.radius, .6, l);
                l = !!(X && X.onGround)
            } catch {}
            C.pos.y < oi.seaY - 1 && (C.pos.y = oi.seaY - 1, C.vel.y = 0), C.speed = 0, C.sprinting = !1, f = kn(f, 0, 10, F), p *= .9, d *= .9
        }

        function K(F) {
            let X = C.crouching ? Pi.crouchEye : Pi.eye,
                ne = 0,
                re = 0;
            if (C.alive) F > 0 ? s = kn(s, X, Mt.eyeRate, F) : s = X;
            else {
                let Z = sl(0, .85, z),
                    J = Z * Z;
                X = bi(Pi.eye, .22, J), s = kn(s, X, 18, F), ne = 1.15 * J, re = -.25 * Z + .12 * Math.sin(Z * Math.PI)
            }
            if (F > 0) {
                let Z = -g.x * 150 - g.v * 17;
                g.v += Z * F, g.x += g.v * F, g.x = Zn(g.x, -Mt.landDipMax, .05), A -= F, A <= 0 && (x = kn(x, 0, Mt.recoilRecover, F), y = kn(y, 0, Mt.recoilRecover, F)), b = kn(b, x, Mt.recoilApply, F), m = kn(m, y, Mt.recoilApply, F), _ = Math.max(0, _ - Mt.shakeDecay * F), M += F
            }
            let $ = Math.sin(C.yaw),
                ue = Math.cos(C.yaw);
            C.eye.set(C.pos.x + p * ue, C.pos.y + s + d + g.x, C.pos.z - p * $);
            let me = Zn(C.pitch + b, -1.55, 1.55),
                ee = C.yaw + m;
            T.set(me, ee, 0, "YXZ"), C.forward.set(0, 0, -1).applyEuler(T);
            let B = _ * _,
                P = M,
                V = B * Mt.shakePitch * (Math.sin(P * 43.1) + .6 * Math.sin(P * 71.7 + 1.3)),
                Y = B * Mt.shakeYaw * (Math.sin(P * 37.3 + 2.1) + .6 * Math.sin(P * 83.9)),
                L = B * Mt.shakeRoll * (Math.sin(P * 29.7 + .7) + .5 * Math.sin(P * 61.3 + 4));
            if (e.position.copy(C.eye), e.rotation.set(me + V + re + g.x * .12, ee + Y, v + L + ne + p * .35, "YXZ"), !i.params || !i.params.fov) {
                let Z = bi(C.baseFov + (C.sprinting ? Mt.fovSprint : 0), Mt.fovAds, C.ads);
                H = F > 0 ? kn(H, Z, C.ads > .02 && C.ads < .98 ? 30 : 7, F) : Z, Math.abs(e.fov - H) > .01 && (e.fov = H, e.updateProjectionMatrix())
            }
        }

        function ie(F) {
            w = Math.max(0, w - F * 1.9), C.hurtPulse = w;
            let X = C.alive ? sl(.55, .12, C.health / C.maxHealth) : 1;
            S = kn(S, X, 4, F);
            let ne = t();
            ne.damage = w, ne.lowHealth = S, ne.ads = C.ads
        }
        return C
    }
