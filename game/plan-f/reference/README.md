# Saltline reference checkout

User authorized cloning this repository for Plan F research on 2026-11-12.

- Repository: https://github.com/realcodebear/saltline-fable-5.2
- Pinned commit: `09c51774cd77aad750bd2d6c42af2b1020cb668d`
- Local checkout: `game/plan-f/reference/saltline-fable-5.2/`
- Recreate: `git clone https://github.com/realcodebear/saltline-fable-5.2.git game/plan-f/reference/saltline-fable-5.2`, then `git -C game/plan-f/reference/saltline-fable-5.2 checkout 09c51774cd77aad750bd2d6c42af2b1020cb668d`.

The nested checkout is locally ignored, unmodified, and never imported by the game. It retains its original Git history and attribution. No top-level game LICENSE was present in this revision; the Three.js license is a separate matter. Plan F implements the researched techniques in its own modular code rather than bundling the mirrored game.

Research landmarks in the minified index.html: `Gg` (generated albedo/ORM/normal cache), `Hg` (renderer, environment capture, soft shadow setup and light pool), `jy` (post pipeline), `Y6` (depth AO shader), `Ib` (wet ground material).
