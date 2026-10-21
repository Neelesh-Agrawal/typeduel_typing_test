# WAKE — Hydrofoil Slalom

Steer a hydrofoil through three storm-lit water courses. The original ocean, sky, islands, boat, reflections and spray are retained; typing and the pace-boat chase are replaced by direct handling.

- A/D or left/right arrows steer; down arrow/S brakes; Space activates a charged boost.
- On touch screens drag the water to steer; hold Brake and tap Boost.
- Pass between gate buoys to score and charge boost. Clean chains increase points; missed gates break the chain. Floating wreckage and buoy strikes damage the hull.
- Clear at least 60% of gates and reach the finish. The 1,400m, 1,700m and 2,000m courses get faster, narrower and more affected by currents.
- Upgrades appear only after the first two complete courses. Repair the hull, improve boost or improve handling. The third course ends the expedition.
- Menu pauses play and offers sound, graphics, view and home. Focus loss pauses; interrupted pointer input releases steering/braking. Best scores use a new slalom-only local storage key.

Run `python tools/serve_arcade.py` from the collection root and open `/Day43/typeduel_typing_test.html`. Existing filename and Vercel rewrites remain compatible. Tests: `node Day43/wake.test.mjs` and `node Day43/race.test.mjs`.

All runtime assets are local. Three.js is licensed under MIT (vendor/THREE-LICENSE.txt). The existing generated storm sky and its provenance remain in assets/.

