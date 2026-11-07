# Exact submitted retry prompt

```json
{
  "use_case": "identity-preserve",
  "asset_type": "Dear Human Plan B pixel_combat006 four dynamic WALKING-WHILE-FIRING key poses02/05/08/11",
  "input_images": {
    "image_1": "EDIT TARGET: the four accepted005 walk anchors, exactly2x2 with512x512 cells. Preserve their fixed foreground/background leg assignments and forward/backward placement.",
    "image_2": "Exact512x512 character identity and head/torso/M16 scale."
  },
  "primary_request": "Make a PRECISE LIMITED EDIT of image1, not a new composition. Preserve exact head/torso/arms/rifle dimensions, pose placement and ground registration of the source005 board. Add walking gunfire and a small visible recoil through only3..5px of shoulder/chest movement. Keep the four existing alternating leg poses exactly attached to the same hips. Do not redraw larger heads, longer rifles, thicker bodies or lower feet. This is a pixel-sprite edit, not an illustrated action-poster redesign.",
  "leg_identity_lock": "LegA is the LIGHTER camera-near foreground shin/boot with silver vertical highlight. LegB is DARK CHARCOAL background shin/boot with NO silver stripe. A always occludes B at crossing, regardless of which foot leads along screenx. The same hip-knee-ankle chains stay intact. The silver stripe NEVER transfers to the dark leading leg. Top-left02 has lightA forward/darkB back; bottom-left08 darkB forward/lightA back. Top-right05 has lightA planted/darkB crossing behind; bottom-right11 darkB planted/lightA crossing in front.",
  "identity_source": "Use the provided baseline image as the exact visual identity source, not loose inspiration. Only change pose and animation timing. Preserve head/face, long black straight hair, pale cool skin, simplified black/gunmetal armor, skirt/stockings, long plain gold-hem cape and classic M16. Do not redesign, simplify, beautify, add/remove costume details, change proportions or reinterpret the character.",
  "body_mechanics": "Controlled forward combat readiness and short shoulder/chest recoil. Keep original hip position, head height and body scale. Forward lean at most5degrees, shoulders and rifle move at most3px back at shots02/08, then recover in05/11. Hair may lag slightly at the ends only; retain its original length and main silhouette. Cape hem may swing back modestly; do not fan the cape wide or change its length. Keep boot contact at exact localy438 in every cell. Upper-body drawing stays close to the template, with a small recoil offset rather than new anatomy.",
  "keyposes": [
    {
      "frame": 2,
      "cell": "TOP-LEFT",
      "phase": "LightA forward contact plus first shot",
      "pose": "Keep lightA heel forward, darkB behind. Torso compressed into the forward step and just hit by recoil: shoulder/stock driven a little back while hips remain over planted lightA. A small sharp orange/cream PIXEL muzzle flash at the actual barrel tip toward screen-right. A little warm light on glove/face/upper armor. Not a giant explosion."
    },
    {
      "frame": 5,
      "cell": "TOP-RIGHT",
      "phase": "LightA stance, darkB crossing, recover and re-aim",
      "pose": "LightA planted vertical, darkB bends and crosses BEHIND the silver support shin under the hips exactly as source. Body returns forward over support, rifle nearly horizontal, forearms lengthen back into aim. Cape hem/hair tips still lag. NO muzzle flash here."
    },
    {
      "frame": 8,
      "cell": "BOTTOM-LEFT",
      "phase": "DarkB forward contact plus opposite-step shot",
      "pose": "DarkB heel FORWARD, silverA leg BACK, exactly opposite to02. Another visible shoulder/chest recoil with weight absorbed on darkB. Same small cream/orange pixel muzzle flash at the real muzzle, slight warm local light. Never brighten the dark front leg or move silver stripe to it."
    },
    {
      "frame": 11,
      "cell": "BOTTOM-RIGHT",
      "phase": "DarkB stance, lightA crossing, recover and re-aim",
      "pose": "DarkB planted vertical, silverA folds across IN FRONT of dark support shin, exact opposite support/swing to05. Torso returning forward to aim, cape/hair still trailing. NO muzzle flash. The two projected shins visibly overlap, not same leading leg twice."
    }
  ],
  "layout_and_scale": "EDIT the exact1024x1024 first image in place. Its existing512x512 cell coordinates and empty padding are immutable. Crown localy74..80, soles localy438, rifle muzzle near localx371/y144 allowing only3px recoil, head approximately50px high and the classic M16174px long from stock butt to muzzle. Do not make rifle200px long or enlarge the sprite to fill the cell. Reproduce the same small pixel blocks. Complete weapon/flash/boots in cell, no oversized wave of hair or cape.",
  "weapon_and_topology": "One head, two arms/hands, two legs/boots. Near hand on the rear screen-left pistol grip, far support hand under screen-right fore-end; same original shoulders. The weapon always remains in the same screen-space hands. Fixed right-facing profile, no mirroring or perspective turn. One M16 with unchanged length. No detached gun, duplicate barrel, thrown magazine or extra objects.",
  "background": "Actual transparent alpha, no floor, cast shadows, checkerboard image, text, labels, borders or watermark. Only02 and08 have a small integrated muzzle flash;05/11 do not.",
  "critical": "Maintain the005 template scale and the ground line. No illustrator-style enlargement, no facial redesign or changed body proportions. Preserve the exact opposite near/far leg roles in all four source cells. Only02/08 have compact pixel flashes.05/11 do not. If the body lowers from knee compression, lower the head a few pixels rather than enlarging the body."
}
```
