// Saltline upstream, extracted from the preserved bundle. See ../README.md.
function zv(i) {
        let e = {
            shots: 0,
            hits: 0,
            kills: 0
        };
        return i.events.on("enemy:killed", () => {
            e.kills++
        }), {
            stats: e,
            reset() {
                e.shots = e.hits = e.kills = 0
            },
            playerShot(n, s, {
                damage: o = 28,
                range: r = 300,
                impulse: a = 1
            } = {}) {
                e.shots++;
                let l = i.physics.raycast(n, s, r),
                    c = i.enemies.raycast(n, s, l ? l.dist : r);
                if (c) {
                    e.hits++;
                    let u = c.part === "weak" ? 2.2 : 1,
                        h = c.enemy.damage(o * u, c.point, s, c.part) === !0,
                        f = {
                            point: c.point,
                            normal: c.normal || s.clone().negate(),
                            dist: c.dist,
                            surface: "enemy",
                            enemy: c.enemy,
                            part: c.part,
                            dir: s,
                            from: "player",
                            killed: h
                        };
                    return i.events.emit("impact", f), i.events.emit("player:hitEnemy", {
                        enemy: c.enemy,
                        part: c.part,
                        killed: h,
                        weak: c.part === "weak"
                    }), f
                }
                if (l) {
                    let u = {
                        point: l.point,
                        normal: l.normal,
                        dist: l.dist,
                        surface: l.surface,
                        enemy: null,
                        dir: s,
                        from: "player"
                    };
                    return i.events.emit("impact", u), u
                }
                return null
            },
            enemyShot(n, s, {
                damage: o = 6,
                range: r = 200
            } = {}) {
                let a = i.physics.raycast(n, s, r),
                    l = a ? a.dist : r,
                    c = i.player;
                if (c && c.alive) {
                    let u = nm.copy(c.pos);
                    u.y += 1;
                    let h = u.sub(n).dot(s);
                    if (h > 0 && h < l) {
                        zf.copy(n).addScaledVector(s, h);
                        let f = Math.abs(zf.y - (c.pos.y + .95));
                        if (Math.hypot(zf.x - c.pos.x, zf.z - c.pos.z) < .38 && f < .95) return c.damage(o, n), !0
                    }
                }
                return a && i.events.emit("impact", {
                    point: a.point,
                    normal: a.normal,
                    dist: a.dist,
                    surface: a.surface,
                    enemy: null,
                    dir: s,
                    from: "enemy"
                }), !1
            },
            explode(n, s = 5, o = 80, r = "player") {
                for (let l of i.enemies.list) {
                    if (!l.alive) continue;
                    let c = l.pos.distanceTo(n);
                    c < s && i.physics.lineOfSight(n, nm.copy(l.pos).setY(l.pos.y + .5)) && l.damage(o * (1 - c / s), l.pos, zf.copy(l.pos).sub(n).normalize(), "body")
                }
                let a = i.player;
                if (a && a.alive) {
                    let l = nm.copy(a.pos).setY(a.pos.y + 1).distanceTo(n);
                    l < s && i.physics.lineOfSight(n, nm.copy(a.pos).setY(a.pos.y + 1)) && a.damage(o * .5 * (1 - l / s), n)
                }
            }
        }
    }

var nm = new W,
        zf = new W;
