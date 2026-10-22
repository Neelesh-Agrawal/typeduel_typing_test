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


## Action update — October 22

Wake now includes full-width breaking waves (W/up/Jump) and low bridge beams (hold S/down/Duck), in addition to steering gates and wreckage. Encounters are spaced more tightly on later courses. Speed also ramps by up to 9m/s inside each course, and the camera field of view reacts to speed/boost. Near debris passes reward 75 points and boost charge; clean wave/bridge clearances reward 150 points and charge. Two-and-a-half-second approach warnings explain the required action without pausing. Upgrades remain at completed course boundaries. New scoring uses wake-action-v2-best.

Tests cover wrong/right reactions, jump guards, increasing speed, all three courses at 30/60/144Hz, collision sweeps and phone camera framing. This update is local for player evaluation, not a claim of subjective enjoyment.

## Local opponents

Five deterministic computer-controlled pilots (Vela, Rook, Nova, Mako and Ember) share each course. Distinct coloured liveries, varied hull proportions and fins make their boats readable. They steer gates, avoid wreckage/nearby boats, jump waves, duck bridges and build boost from successful encounters. Each has its own pace. No network or other human players are required.

The HUD shows position out of six and explicitly labels opponents as bots. Finish places use actual crossing times. Rivals freeze during upgrade breaks and reset to an organised grid for each course. There is no distance teleport or speed catch-up tied to the player. Boat wakes use shared lightweight geometry and disappear in low graphics mode.

Rival regressions verify distinct boats, independent progress, actual boost overtakes, finish-time rankings, frozen breaks and reset. These changes remain local pending playtesting.

## Speed feedback correction

The camera now follows closer to the water with a wider, speed-responsive field of view. Nearby channel buoys and fine water ripples move at the same distance rate as the race, and the water wave direction is corrected. The sky and ocean art remain. Repeated hull hardware is instanced to reduce draw calls.

The render loop now consumes elapsed time with small physics substeps: it no longer discards time on 10fps frames. A regression verifies equal travel at 10/60fps. Phone framing tests now project actual instanced vertices through the updated camera. Browser testing caught and corrected a GLSL reserved identifier before delivery. No measured device FPS or subjective enjoyment claim is made. Local playtest changes are not published.
