# Exact submitted image prompt

```json
{
  "use_case": "identity-preserve",
  "asset_type": "Dear Human Plan B combat006 walking-fire intermediate poses",
  "input_images": {
    "image_1": "EDIT TARGET: fixed1024x1024 2x2 board with accepted walking-fire anchor poses,512x512 cells.",
    "image_2": "Exact005 character identity/scale baseline.",
    "image_3": "Accepted walking-fire keys in reading order02/05/08/11. Preserve these source anchors and their dimensions."
  },
  "primary_request": "Edit the FIRST board in place to generate exactly FOUR NEW intermediate walking-fire poses. Preserve exact head/torso/rifle scale, cell placement and005 alternating leg identities. The source keyframes show the instant of gunfire; these intermediate frames show the body absorbing and recovering from it. Every requested intermediate has NO muzzle flash; flash is only in immutable keys02/08.",
  "identity_lock": "Use the provided baseline image as the exact visual identity source, not loose inspiration. Only change pose and animation timing. Same adult woman, face/head size, long black hair, pale skin, simplified dark armor/skirt/stockings/boots, plain gold-hem cape and classic M16. Do not redesign, beautify, simplify, add/remove details, change proportions or reinterpret the character.",
  "leg_lock": "A is LIGHT foreground shin/boot with fixed silver stripe; B is DARK charcoal background shin/boot with no silver stripe. A always occludes B at overlap, even when A trails along screenx. Track same hip-knee-ankle chains.04 has lightA planted/darkB crossing behind;10 has darkB planted/lightA crossing in front. Do not repeat same leading or lifted leg in both half-cycles. Low foot arc, exact walking leg lengths, no high-knee march.",
  "body_recoil": "At post-shot03/09 shoulders/stock/chest move BACK toward screen-left by about6px, head follows3px, elbows flex and cheek remains close to stock. This is a clear whole upper-body recoil, not a scaled character or detached rifle. Then chest/shoulder move forward toward stable aim in04/10. Hair ends/cape hem lag6..10px, with scalp/shoulder roots fixed. Hip absorbs load by2..3px, grounded foot remains on the existing ground line. Keep the rifle almost horizontal, at most1..2degrees rise on recoil.",
  "scale_layout": "Precise existing2x2 board1024x1024,512x512 cells. Crown near localy74..80, sole liney438; keep template head/chest/M16174px length. Preserve generous transparent margins and full rifle/boots/cape. Do not enlarge to fill cells or move body center. Only small intentional recoil/weight transfer. Same coarse square pixel blocks.",
  "hands_and_camera": "One head, two arms/hands, two legs/boots; same rear screen-left grip and front screen-right handguard support, same shoulders. The weapon always remains in the same screen-space hands. Fixed right-facing profile. No mirroring, camera turn, gun duplication, release or reload.",
  "loop": "These are cyclic walking phases01..12;12 continues into01, then contact/shot02. Never return to neutral standing or bring both feet together in12/01.",
  "background": "Actual transparent alpha including gutters. No floor, shadows, checkerboard image, text, borders, labels, watermark, muzzle flash, smoke or other objects in these intermediate cells.",
  "ordered_inbetweens": [
    {
      "frame": 1,
      "cell": "TOP-LEFT",
      "pose": "LightA forward reach just before contact/shot02, darkB trailing. Shoulder/stock held forward in ready aim; NO flash, no recoil yet. Continue the lightA forward swing from12."
    },
    {
      "frame": 3,
      "cell": "TOP-RIGHT",
      "pose": "After lightA contact/shot02, lightA remains planted forward while darkB trailing heel lifts. Clear peak shoulder/chest recoil6px back, elbows compress, head follows, tiny hip compression. Flash is GONE. Hair/cape begin delayed forward lag."
    },
    {
      "frame": 4,
      "cell": "BOTTOM-LEFT",
      "pose": "LightA support under pelvis; darkB folds its calf/foot diagonally behind the light planted shin to cross under hips, approaching05. Torso/stock recover forward from03, forearms lengthen, hair/cape continue lag. No flash."
    },
    {
      "frame": 6,
      "cell": "BOTTOM-RIGHT",
      "pose": "DarkB has crossed behind lightA and extends forward toward screen-right, silverA planted leg moves behind. Torso settles forward into aim, cape/hair rebound small. No flash, no transferred silver stripe."
    }
  ]
}
```
