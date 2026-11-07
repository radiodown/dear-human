# Exact submitted key-pose prompt

```json
{
  "use_case": "identity-preserve",
  "asset_type": "Dear Human pixel_walk_005 four anchors with true left-right leg alternation and crossing",
  "input_images": {
    "image_1": "EDIT TARGET: four identical copies of the exact512x512 baseline in a1024x1024 2x2 board.",
    "image_2": "IDENTITY AND LEG-DEPTH SOURCE: nearer leg A is light silver gunmetal; farther leg B is very dark charcoal."
  },
  "primary_request": "Edit the FIRST image into exactly FOUR different WALK-CYCLE key poses. The most important requirement is TRUE ALTERNATION OF THE TWO DIFFERENT LEGS, not the same leg stepping twice. The near LIGHT leg A must lead in the first contact but TRAIL in the opposite contact. The far DARK leg B must trail in the first contact but LEAD in the opposite contact. Passing poses must have opposite support legs and visible shin/ankle overlap as the swing foot crosses underneath the hips. This is normal walking seen from the side, not a sideways crossed-leg catwalk.",
  "leg_identity_lock": "Leg A is the camera-near FOREGROUND leg: lighter stocking and a long silver vertical shin highlight, brighter boot. Leg B is the camera-far BACKGROUND leg: deep dark charcoal stocking/shin/boot, NO bright silver shin stripe. NEVER transfer the silver stripe to the other leg just because a different leg moves forward. Foreground A always occludes background B wherever their silhouettes overlap, regardless of which foot is forward along screen x. Both legs stay attached to their OWN same hip. Track hip->knee->ankle for each of A and B, not just two unlabelled foot shapes.",
  "identity_source": "Use the provided baseline image as the exact visual identity source, not loose inspiration. Only change pose and animation timing. Preserve this exact adult woman, head, face, long straight black hair, pale skin, simplified armor, skirt, cape and M16. Do not redesign, simplify, beautify, add details, remove details, change proportions or reinterpret the character.",
  "upper_body_and_scale_lock": "Keep the head, chest, both arms and M16 at their exact current scale and local coordinates in every cell. Preserve empty margins. Crown near local y74, belt around y220, ground y438; full figure about364px tall. No zoom or cell fitting. Only thighs/knees/calves/feet below the skirt and small lower cape motion need changing. Same horizontal rifle length, stock and muzzle positions. Small natural knee compression allowed, not body enlargement.",
  "layout": "Precisely the EXISTING 2 columns by 2 rows layout, square1024x1024 canvas, each invisible cell512x512. Reading order02,05,08,11. Exactly one complete character per cell with complete rifle, cape and both boots. Large transparent gutters. No text, guides, borders or labels.",
  "keyposes": [
    {
      "frame": 2,
      "cell": "TOP-LEFT",
      "phase": "A-forward contact, B-back toe-off",
      "pose": "Light FOREGROUND A thigh/shin slopes FORWARD toward screen-RIGHT from hip to boot. Its light boot is well forward of pelvis, heel grounded near x250,y438. Dark BACKGROUND B leg slopes BACKWARD toward screen-LEFT, dark boot near x182 and rear toe touching ground. Clear separation in x; silver shin strip is on the FORWARD leg."
    },
    {
      "frame": 5,
      "cell": "TOP-RIGHT",
      "phase": "A stance, B swing crossing",
      "pose": "Light FOREGROUND A is now the nearly vertical PLANTED SUPPORT leg beneath the hips, light boot flat on ground near x211,y438. Dark B swings from behind to ahead: dark knee comes forward, dark calf angles BACK across the planted shin and its dark boot is lifted under the hips near x207,y401. The two projected shins overlap in a narrow X; A stays in front and partly occludes B. Dark swing foot must pass close behind the light support shin, not remain separated in a wide forward high-knee pose."
    },
    {
      "frame": 8,
      "cell": "BOTTOM-LEFT",
      "phase": "B-forward contact, A-back toe-off; opposite of02",
      "pose": "Dark BACKGROUND B leg now slopes FORWARD toward screen-RIGHT, dark boot heel grounded near x250,y438. Light FOREGROUND A leg now slopes BACKWARD toward screen-LEFT, light boot near x182 with rear toe grounded. Silver shin strip is now on the BACK leg. This is visibly the OPPOSITE colored leg ordering from TOP-LEFT. Do not copy02 and do not brighten the dark leading leg."
    },
    {
      "frame": 11,
      "cell": "BOTTOM-RIGHT",
      "phase": "B stance, A swing crossing; opposite of05",
      "pose": "Dark BACKGROUND B is the nearly vertical PLANTED SUPPORT leg beneath the hips, dark boot flat near x211,y438. Light FOREGROUND A swings from behind to ahead: light knee comes forward, light calf with its silver stripe angles BACK across the dark planted shin, light boot lifted beneath hips near x207,y401. Narrow visible X/overlap at calves. Light A is IN FRONT of B at this crossing. The planted boot must be dark and the lifted boot must be light, the opposite of TOP-RIGHT."
    }
  ],
  "arms_and_rifle_lock": "Exactly one head, two arms, two hands, two legs and two boots. The same near arm stays on the rear screen-left pistol grip; the far support arm stays under the screen-right fore-end. The weapon always remains in the same screen-space hands. Fixed right-facing profile and horizontal M16. No mirroring, swapped arms, perspective turn, firing or extra objects.",
  "style": "Same square-pixel clusters and sparse palette. Keep near/far leg lightness distinctly different and CONSISTENT across all four poses. Small walking stride with low swing; no running, hopping or exaggerated marching.",
  "background": "Actual transparent alpha background including gutters. No cast shadow, floor, checkerboard image, text or watermark.",
  "critical_acceptance": "Compare TOP-LEFT with BOTTOM-LEFT: the silver foreground leg must move from front to back. Compare TOP-RIGHT with BOTTOM-RIGHT: silver leg changes from planted support to lifted crossing swing. If all leading legs are light, or all planted legs are light, the sheet is WRONG. Preserve exact upper-body size and composition of edit target."
}
```
