# 🐙 Bloop! Bearing Battles

A colourful, standalone browser game for Foundation Edexcel International GCSE Mathematics A (4MA1) students learning bearings.

## Live hosting and custom domain

The site is published automatically to GitHub Pages on pushes to `main` by [the publishing workflow](.github/workflows/publish-pages.yml). Cloudflare DNS contains a DNS-only CNAME for `bearings.mrwalkermaths.com` pointing to `chriswalker-afk.github.io`, consistent with the other Mr Walker Maths subdomains.

**One-time GitHub Pages domain setting:** visit [Repository Settings → Pages](https://github.com/chriswalker-afk/BearingBattleships/settings/pages). Under **Custom domain**, enter `bearings.mrwalkermaths.com` and select **Save**. GitHub requires this even when a `CNAME` file exists alongside an Actions-based Pages deployment. Once DNS checks and certificate provisioning complete, switch on **Enforce HTTPS** if the option is available.

Production hostname: https://bearings.mrwalkermaths.com/

## Play

Play at **https://bearings.mrwalkermaths.com/**. The header offers two independent modes: **🌊 Open Sea** (the original 12-level game) and **🌀 Maze Voyage** (eight themed navigation mazes ending in space). Changing modes starts a fresh voyage. For offline/local use, open `index.html` in a modern browser and keep the accompanying `.css` and `.js` files in the same folder, including `boat-style.js`, `boat-studio.js`, `boat-studio.css`, `rewards.js`, `rewards.css`, `scene-zoom.js`, `scene-zoom.css`, `maze-voyage.js` and `maze-voyage.css`. There are no external dependencies or build steps. Merges to `main` publish automatically through GitHub Pages Actions.

## Maze Voyage — alternate navigation mode (PR #12)

**Maze Voyage** is a separate game mode proposed by a student. Select **🌀 Maze Voyage** in the game header to begin an eight-level journey. The original **🌊 Open Sea** mode remains the default and retains its own 12-level difficulty progression, squid strikes, open-sea creature spawning, and victory rules.

Students still measure **three-figure clockwise bearings from north**, using the same draggable protractor and ruler, and enter whole-number distances: FIRE 1–8 units, MOVE 1–5 units. The two modes share the same Boat Studio, compass, scoring, hearts, ship controls and optional +2 pickups.

### How the mazes work

- The **coloured channels** are the navigable route. Sandbars, banks, mangroves, coral, rocky islands, glaciers and asteroid fields outside them form **solid walls**.
- **Movement checks the entire straight sailing line**, not merely its destination. Trying to cross land, cut across a tight corner, sail through an island, or leave the map causes a warning, **without spending a turn**.
- **Bubble shots stop at the first solid obstacle**, and cannot defeat enemies through scenery. Students find a place in the channel with a clear line of sight before firing.
- Enemy guardians patrol **along the channel centreline**, following bends rather than passing through walls. A guardian that bumps the ship takes a heart, but **retreats instead of disappearing**: only defeating guardians by bubbling them unlocks the portal.
- **Fair phases:** start on FIRE with a reachable first guardian. After firing, students MOVE. If no guardian is within the maximum eight-unit firing range **and** visible through an unobstructed channel, consecutive MOVE turns are allowed automatically; the next FIRE phase appears only once a guardian can be engaged. The game does not reveal a bearing or auto-aim.
- An animated **whirlpool exit** (a **warp portal** in space) appears at the far end of each level. It stays **locked until all guardians are bubbled**. Sail into the glowing portal during MOVE to load the next level. Once all guardians are defeated, MOVE remains available until the exit rather than demanding empty shots.
- **Bonus stars** appear where a maze guardian was popped, safely on the channel, with nine MOVE opportunities to collect them for **+2 points**. The original open-sea floating-star behaviour is unchanged.
- At the portal, the next map loads after the sailing animation; score, hearts, turn count and cosmetic boat design are preserved. The camera resets to the 100% whole-map view to introduce each environment.

### Curated environment progression

| Level | Environment | Route legs | Dead ends | Guardians | Two-hit helmets | What changes |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Gentle Waterway | 3 | 0 | 2 | 0 | Simple water maze; whirlpool exit |
| 2 | Shimmering Lagoon | 5 | 1 | 2 | 0 | Sandbars and a first wrong turn |
| 3 | Mangrove Delta | 5 | 1 | 3 | 0 | Longer route and roots |
| 4 | Coral Labyrinth | 7 | 1 | 3 | 1 | More turns and first helmet |
| 5 | Rocky Archipelago | 7 | 1 | 4 | 1 | Islands and more guardians |
| 6 | Frozen Fjords | 7 | 1 | 4 | 1 | Narrow icy passages |
| 7 | Stormy Strait | 7 | 2 | 4 | 2 | More false routes and helmets |
| 8 | Astral Escape | 7 | 2 | 5 | 2 | Asteroid field, narrow starlane and warp portal |

Every route is **hand-authored** and validated by maze-voyage.js at startup. Main routes and every false branch contain straight axis-aligned segments in whole 50-pixel grid units, and a programmatic feasibility test confirms each main route can be traversed with legal **1–5-unit** MOVE orders. The first guard on every level starts along an unobstructed 1–3-unit firing bearing. Later mazes add distance, guards, turns, narrow passages and misleading branches. The final mode has a dark starfield, asteroid scenery, violet hyperspace channels and a spacecraft-like glow around the customised boat.

### Scope and verification

- Original Open Sea gameplay remains unchanged; the two modes have independent new-voyage resets. Neither changes the underlying bearings, ruler pivot, hitboxes or score rules.
- Maths Help explains maze navigation; tutorials are **filtered by active mode** so Maze Voyage learners do not receive the late-game open-sea squid instructions.
- The optional view-only 100–200% zoom works in either mode, preserving world coordinates and pointer dragging.
- The maze-voyage.test.cjs suite checks unique biomes, complete viable routes, side branches, blocked moves and shots, guardian patrols, locked exits, post-pop unlocking, automatic skip of empty firing phases, classroom warnings, mode switches, tutorial filtering, and travelling through all eight portals to the space victory.
- Check in a real browser before merging: first-level visual clarity, difference between solid scenery and navigable channels, placement of locked/unlocked whirlpool, mobile and zoom, readability of a guard behind walls, and the space transition. On-screen navigation remains a measurement task; no automatic path guide is shown.

## Ship-centred sea zoom

Students can use **− / 100% / +** immediately below the sea board without covering any measuring instruments. The default **100%** shows the complete playing field; each click adjusts the scene by **25%** (100%, 125%, 150%, 175%, 200%), and pressing the percentage returns to the original full-map view. The minus/plus buttons disable automatically at their limits.

The camera follows the **rendered boat position**, smoothly during sailing and clamped near the sea edges so the world never slides out of frame. The canvas's actual resolution and layout remain unchanged. The zoom is *view only*: all gameplay positions, the 50-pixel grid, three-figure bearings, 1–8-unit firing ranges, 1–5-unit sailing distances, star pickup routes, squid zones, hitboxes and difficulty settings keep their original **world coordinates**.

The ruler and protractor are magnified using the same transform as the sea, and pointer coordinates are inverted back into the original world before dragging. At high zoom the ruler's existing eight-unit far-end orange rotation handle may be off-screen, so a **second small orange rotation grip** sits near its blue zero-end pivot. Both grips rotate around exactly the same zero, without changing the marked ruler length or scale. Zoom out to 100% whenever an enemy is off-screen.

**Accessibility and persistence:** controls are regular keyboard-focusable buttons with descriptive accessible labels and a polite percentage announcement. Zoom is reset on a new game; it is not stored or associated with student data. The controls live in the footer and cannot intercept clicks meant for the ruler or protractor.

**Regression:** run the Node test suite with command node --test tests/*.test.cjs. The scene-zoom.test.cjs cases check zoom limits, camera clamping near corners, the precise inverse transform on every zoom level, pointer dragging on a half-size screen, the near-zero ruler handle at 200%, protractor movement, unchanged firing, animated following and reset. The existing ruler, layout, gameplay, pickup, squid, Boat Studio and full-voyage tests continue unchanged apart from importing the camera module into their harnesses.

## Boat Studio customisation (PR #8)

Choose **🎨 Boat Studio** in the top bar to customise the player's S.S. Wobble. The game stays on one screen; the customiser is a separate, closeable dialog with a full-size preview and grouped, accessible controls.

| Category | Choices |
| --- | --- |
| Hull colours | Coral, Lagoon, Sea mint, Violet, Sunshine, Midnight |
| Cabins | Classic, Portholes, Lookout |
| Flags | Sunshine, Ocean, Checker, Starry, Rainbow |
| Expressions | Happy, Wink, Brave, Surprised |
| Decorations | None, Lifebuoy, Star badge, Heart, Racing stripes |
| Boat name | Up to 18 characters |

There are **1,800 visual combinations** before choosing a name. All are available immediately: no unlocks, point costs or advantage in the game.

- **Preview:** making selections changes the illustrated boat in the Boat Studio preview, not the live player's ship until **Save boat** is pressed.
- **Save:** applies the design immediately and saves it to this browser's `localStorage`. The same design returns on the next visit or refresh. If browser storage is blocked, the design still applies for the current visit and the dialog explains the limitation.
- **Cancel / close:** leave the previously saved design untouched.
- **Surprise me:** randomise the five cosmetic categories while keeping the draft boat name.
- **Reset design:** preview the classic S.S. Wobble appearance; press **Save boat** to apply the reset.

**Maths safeguard:** all styles use the same ship centre, heading, hull outline and collision tolerance. A different colour, flag, expression or accessory does not change bearings, distances, speed, hitboxes, enemy behaviour or any score.

**Accessibility and privacy:** Boat Studio is keyboard accessible, uses button press states and descriptive labels, and draws on the existing vector artwork (no external assets). Only the design JSON is stored in the student's browser; it is not uploaded, shared or collected.

### QA and regression checks

```sh
node --test tests/*.test.cjs
```

The new `tests/boat-studio.test.cjs` checks all preset categories, invalid style input, preview vs save, cancelling, resetting, randomising, storage persistence and browser-storage failures. Existing bearing, ruler, difficulty, responsive layout and phase-warning tests remain.

For manual QA, check the Boat Studio at laptop/tablet/mobile sizes; change options, save and reload; cancel mid-edit; try a randomly generated design; check that a renamed ship shows in the header; verify the boat stays centered on the ruler/protractor during Fire and Move; and confirm keyboard focus and scroll behaviour inside the modal.

## Bonus stars and guaranteed firing-range enemies (PR #9)

Two small changes make bearing practice more rewarding and reduce frustrating turns with no reachable target.

### Earn bonus points with the ship

- Every **defeated** creature drops a glowing golden **⭐ +2 bonus star**. The first hit on an armoured creature only cracks its helmet, so it does **not** drop a bonus.
- Stars appear where a creature was popped, then **float towards the player's ship**. They settle within about **3.5 units** of the ship so a student can normally collect them with their next 1–5-unit MOVE.
- **Only a valid MOVE** collects the reward, by sailing through or within **0.8 units** of the star. Passing close along the course counts; stopping precisely on top of the star is unnecessary.
- Each collection adds **two bonus points** to the score. The original **+1 for popping** a creature remains; pop streaks and the one-change-per-level difficulty plan are unchanged.
- Students have **four movement opportunities** to collect unclaimed stars. The total number still afloat appears below the score; older rewards drift away rather than filling the board.
- At the end of Level 12, the player receives **one last MOVE** to collect the final star before the victory screen. Victory now reports both **creatures popped** and **total points**, so bonus points are not confused with enemy counts.

### Prevent unreachable firing turns

- Every new wave is placed in a ring roughly **3.6–7 units** from the ship, within the playable sea and spaced apart. This means that newly spawned enemies are targetable with the game's unchanged **8-unit maximum range**.
- Sailing away can still increase the distance to enemies. When this would leave **all** remaining enemies beyond firing range, the **nearest** sea silly takes a visually animated catch-up current back to about **7 units** away during that normal enemy movement step. No targeting directions or automatic bearing answers are shown.
- The current level's configured enemy count, helmet distribution and ordinary per-turn speed remain unchanged. The catch-up current is the same anti-frustration rule at every level, not an extra difficulty increase on a particular stage.

### Testing and classroom QA

Run from the repository root with Node 20+:

```sh
node --test tests/*.test.cjs
```

`tests/rewards.test.cjs` covers enemy placement even in map corners, the catch-up rule, four-turn pickup lifetime, collection along a sailing route, bonus scoring, no rewards for helmet cracks, and the final bonus move. Existing tests cover the game, 12-level progression, Boat Studio, protractor/ruler and single-screen layout.

Check in a real browser that golden stars float from defeated enemies and then remain visible until the ship reaches them; bonus scores are readable in the ship's log and on-screen; the final level allows the bonus move; and every firing phase offers a reachable target. Confirm that students still measure every bearing and distance manually.

## Giant squid danger zones (PR #10)

**Purpose:** Add one readable late-game challenge without violating the existing **one new difficulty element per level** progression.

- **Level 10 introduces squid strikes instead of a third two-hit enemy.** Level 11 still adds one enemy, and Level 12 still increases enemy speed. The squid mechanic is unchanged at Levels 10–12: its size and strike frequency do not increase.
- The first eligible **MOVE** at Level 10 always displays a red circular **SQUID STRIKE** warning, so the new rule is explained before it can hurt the student. Subsequent eligible MOVE phases have a **36%** strike chance after at least **two hazard-free MOVE turns**.
- A translucent **red danger circle**, warning pop-in and persistent red text under the MOVE controls appear **before the student enters a bearing**. The zone never appears on a FIRE phase or in Levels 1–9.
- The squid tests only the **ship's final centre position after a valid MOVE**. If the ship stops inside or on the red circle, a large purple **tentacle strikes at the end of the sailing animation** and costs **one heart**. If the ship finishes outside, the attack misses—even when the sailing path passes through the red zone.
- A valid 1–5-unit move that ends **outside the red circle** always exists, including near corners. Students still need to watch for sea sillies and choose a sensible destination. They must work out the bearing and distance with the draggable protractor/ruler; the game never gives an automatic dodge route or correct bearing.
- Invalid bearings, distances and off-map moves never trigger an attack or use a turn. The danger remains visible so students can correct their entry.
- A final reward-only MOVE after the last sea silly is popped **does not** spawn a new danger zone. Losing all hearts still ends the voyage as before.

### QA / testing

Run the Node regression suite: node --test tests/*.test.cjs. The new squid-strike tests cover first-level introduction, cooldowns, corner escape geometry, final-position-only damage, invalid input, warning timing, canvas painting and exclusion from early levels and the final reward move. The difficulty regression checks that each level still changes precisely **one** factor.

For a real-browser check, reach Level 10 and verify the first warning is obvious **before the MOVE**; test a 1-unit move finishing inside the red area (one heart lost), then a route that ends outside (no squid damage). Check tentacle visibility and warning contrast with the manual measuring tools switched on, including narrow screens and reduced-motion mode.

## Learning goals

- Measure three-figure bearings clockwise from north.
- Use a 360° protractor and ruler manually, without automatic aiming lines.
- Estimate distances using a 1-unit grid.
- Apply bearings to fire at a moving target or move the player's ship.
- Revise reverse bearings, compass directions, and common errors with optional maths help.

## Controls

1. Use the draggable **protractor** and **ruler** over the board. Drag the protractor's body to move it and orange rim handle to rotate it. For the ruler, position the **blue 0 marker** at your ship by dragging the ruler body; drag the **orange handle at the far end (past 8)** to rotate about that 0 marker without shifting it.
2. The **phase alternates automatically** each valid turn: **FIRE → MOVE → FIRE → MOVE**. The first turn is Fire. The highlighted phase and large pop-in tell you the current order; there is no manual phase switch.
3. Type a three-digit bearing from `000` to `359` and a whole-number range/distance.
4. **FIRE:** range 1–8 units, bubble follows a ray; a hit requires passing through a creature. **MOVE:** distance 1–5 units, must remain on the board. A valid order consumes one turn and moves the enemies, even if the bubble misses or only cracks a helmet.
5. After every valid order, enemies approach at their **current level's fixed speed**. Each creature that gets close costs a heart. Lose three hearts to end the game. Clear a level to reach the next; defeat Level 12 to complete the voyage.
6. Defeated creatures release glowing ⭐ bonus buoys. **Sail through** them on a MOVE phase to earn **+2 points**. Your sailing course can pass near the star; the ship need not stop exactly on it.
7. Starting in **Level 10**, look for a red squid-strike zone before MOVE. Finish the move outside it to avoid losing a heart.
8. Use **+ / −** under the sea to magnify the view in 25% steps (100–200%); select the percentage to reset to the full map. The camera follows the ship, and every bearing and grid distance remains unchanged. Use the new small orange near-end ruler rotation grip if the far-end handle is off-screen.
9. Use **Tutorial** for a guided thirteen-step explanation and **Maths help** for optional conceptual guidance.

The game uses a scalable play canvas and a responsive layout. Boat designs are saved only in the student's current browser; no accounts or boat data are transmitted to a server.

## Teacher notes

The game provides no automatic aiming guide or target-bearing solution. A bubble projectile and short trailing bubbles appear **only after firing**; its pop or splash shows the outcome, with no advance aiming preview. To increase mathematical challenge, ask students to explain how they measured and why their shot missed. Grid squares are 50 virtual pixels, and distances are measured in whole units; shooting a bubble 5 units at a target 4.2 units away can hit it if the bearing is accurate.

## Visual/animation Pass A

- Illustrated, gently animated ocean with a visible manual-measurement grid.
- Redesigned north-facing S.S. Wobble and three distinctive cartoon sea-creature species.
- Ambient boat rocking and creature swaying/blinking without changing target coordinates.
- Smooth ship sailing, enemy approaches, and delayed wave arrivals.
- Travelling bubble projectiles, pop rings, splashes, wakes and damage ripples.
- UI refinements that keep instrument labels, buttons and information readable.
- `prefers-reduced-motion` support: motion and decorative animation are suppressed for users who request it.
- Turns and hit detection remain discrete and unchanged; actions are locked while visual transitions play.

### Quick manual verification

1. Move the protractor centre over the ship and rotate its orange handle; check that the north/000° line still points up and that all angle marks remain legible.
2. Move and rotate the ruler, checking that one numbered unit still corresponds to one grid square.
3. Enter `45`: the order should be rejected without using a turn. Enter `045` and a valid range: watch the bubble travel, then see the surviving creatures approach.
4. Switch to Move and sail one unit on `180`; observe a smooth voyage south, followed by the creatures.
5. Trigger hits and misses to review the distinct pop/splash effects, then check loss of hearts, wave spawns and restart.
6. Verify small screens and reduced-motion settings. Check that no animated artwork or decoration is mistaken for a target or measurement guide.

## Visual/animation Pass B

- **Status polish:** Wave, pop streak, best streak, and a compact phase label. Hit/miss/impact feedback is colour-coded.
- **Wave introductions:** animated, short-lived Wave N banner when a fresh set of silly creatures appears.
- **Damage:** hearts pulse and the board nudges briefly on a collision, with accurate loss messaging even when multiple creatures arrive at once.
- **Personalities:** jellyfish, pufferfish and crabs show cheeky, curious, surprised and grumpy faces. Brief comic speech appears after actions, not during measurement.
- **Rewards:** post-shot star bursts and special *Pinpoint pop!* feedback for particularly central hits; never automatic aim, bearings, distance lines or before-shot clues.
- **Streak:** consecutive successful bubble shots are counted, moves preserve the streak and missed shots reset it. Each hit remains worth exactly one point.
- **Accessibility:** reduced-motion mode retains gameplay and logs without decorative effects, speech animations or large wave banners.

### Repeatable smoke tests

From the repository root with Node 20+:

```bash
node --test tests/smoke.test.cjs
```

Covers bearing validation, shots/streaks, waves, damage, reset, reduced-motion controls and renderer calls. This is **not** a replacement for browser visual QA.

### Manual Pass B checklist

1. Score a few hits, then miss: inspect the score pulse, star rewards, active streak and best streak.
2. Eliminate a wave: check Wave 2 announcement and correct wave count.
3. Allow enemies to collide with the ship: hearts should pulse, frame should bump briefly and log the correct number of hearts lost.
4. Check one short silly speech bubble after an action; it must reveal no target bearing or distance.
5. Move the protractor/ruler and inspect the compass/grid during and after these effects; all measuring remains manual.
6. Check narrow screens, reduced-motion mode and reset during an animation. The mathematical game rules must not change.

## Single-screen Captain's Bridge (PR #4)

The game now uses a compact **Captain's Bridge** alongside the sea:

- **Mission status:** turn, score, hearts, level, current/best streak and a scrollable recent-message log.
- **Captain's orders:** a read-only Fire/Move phase indicator, three-figure bearing, range/distance and the main action button.
- **Measuring tools:** one-tap protractor/ruler toggles with a short reminder to drag and rotate manually.
- **Compass and scale:** always shown immediately beneath the board. Tutorial, detailed maths help and restart remain in the compact top bar.
- Press **Enter** from either numeric field to take an order, as an alternative to clicking the action button.

### Screen-fitting behaviour

On typical laptops and landscape tablets (at least **960 CSS pixels wide and 600 pixels high**), the page uses the available viewport height for its game board and control column without requiring page scrolling. The canvas is fitted with its original **1000 × 650** aspect ratio: *angles, distances and hit detection are unchanged*. The board is never stretched to fill an arbitrary rectangle.

On portrait/narrow screens, or when the viewport is shorter than 600 pixels, the controls stack and **normal page scrolling is allowed**. This is deliberate: hiding a measurement tool or shrinking its markings to force an artificial one-screen fit would hurt the teaching objective.

### Verification

Run all zero-dependency tests from the repository root using Node 20+:

```sh
node --test tests/*.test.cjs
```

The new `tests/single-screen.test.cjs` covers required controls, responsive CSS rules and the board-fitting calculations. The existing `tests/smoke.test.cjs` continues to cover bearings, turns, creatures, waves, hearts and reduced motion.

Review in Chrome/Edge at 1366×768, 1280×720 and 1024×600; confirm that the compass, status, instructions, Fire/Move buttons, both inputs, main action and tool toggles are simultaneously visible. At 390px mobile width and larger text/zoom, verify that **scrolling remains possible** and no buttons are clipped. Check that the protractor/ruler still drag and rotate correctly.

## Ruler pivot — zero-end anchoring (PR #5)

The ruler has been adjusted to work like a physical straightedge being held at its zero end:

- **Pivot:** the blue ring/dot at the **0-unit mark**, centred along the short (40-pixel-wide) end. It is the ruler's position and its rotation origin.
- **Move:** drag the ruler's body or blue 0 pivot to place the 0 mark over the centre of your ship.
- **Rotate:** drag the orange handle just beyond the ruler's **8-unit end**. This changes the angle without moving the blue zero pivot.
- **Measure:** the numbered edge now runs from **0 to 8 units** away from the pivot, with each tick exactly one grid square apart.

The old centre-based pivot is removed from both drawing and pointer picking. The protractor and all firing/movement rules remain unchanged.

### Manual QA

1. Start a game and identify the blue pivot at the **0** end of the ruler; the opposite orange handle should be beyond **8**.
2. Drag the ruler to put blue 0 directly over the ship. Rotate using the orange far-end handle: the blue 0 should remain over the ship.
3. Try all four quadrants and an angled target; the 0 mark should stay fixed through the drag.
4. Drag the ruler by its body: both ends must translate together without changing its angle.
5. Repeat at a narrower browser width or increased zoom; the distal handle remains selectable.
6. Hide/re-show the ruler and check that the protractor, shooting and movement still work as before.

Run the repeatable regression tests with Node 20+:

```sh
node --test tests/*.test.cjs
```

## Progressive difficulty — 12-level voyage (PR #6)

The game advances **one level when all creatures on the current level have been cleared**. An on-screen Level N/12 indicator and a short arrival banner explain the new challenge without solving any bearings. The student starts with the same manual protractor, ruler and north compass on every level.

A central, immutable level table in `difficulty.js` enforces the rule: **each transition changes exactly one factor** — enemy **count**, swim **speed**, the number of **armoured two-hit enemies**, or the new **squid hazard** introduced at Level 10. There is no longer any hidden turn-based speed increase or score-based wave sizing.

| Level | Enemies | Swim speed (px/turn) | Two-hit helmets | Squid zones | Only new difficulty |
| --- | ---: | ---: | ---: | :---: | --- |
| 1 | 3 | 17 | 0 | No | Gentle introduction |
| 2 | 4 | 17 | 0 | No | +1 enemy |
| 3 | 4 | 21 | 0 | No | +4 px/turn |
| 4 | 4 | 21 | 1 | No | +1 helmet |
| 5 | 5 | 21 | 1 | No | +1 enemy |
| 6 | 5 | 25 | 1 | No | +4 px/turn |
| 7 | 5 | 25 | 2 | No | +1 helmet |
| 8 | 6 | 25 | 2 | No | +1 enemy |
| 9 | 6 | 29 | 2 | No | +4 px/turn |
| 10 | 6 | 29 | 2 | Yes | Squid strike introduced |
| 11 | 7 | 29 | 2 | Yes | +1 enemy |
| 12 | 7 | 33 | 2 | Yes | +4 px/turn |

**Helmet behaviour:** a creature with a bubble helmet is visibly outlined with a blue ring and a **2** hit counter. One correct shot cracks its helmet and changes the counter to **1**. The creature remains alive, takes its normal advance that turn and needs one more accurate shot to pop. The first hit **does not award a point**, does not count as a pop, and does **not** break the player's existing pop streak. The final hit pops it for one point. Missing a shot still resets the current pop streak.

**Completion:** clearing all 12 levels wins the voyage; hearts carry over, and three hearts lost means shipwreck. The levels grow in challenge without changing maths requirements, hit tolerance or the 1-unit grid.

### Tuning and testing

Teachers can rebalance the game by editing the twelve explicit entries in `difficulty.js`; the built-in `validate()` function rejects any level that changes more than one factor. Adjusting a single factor at a time makes it easier to identify which change students find difficult.

```bash
node --test tests/*.test.cjs
```

`tests/difficulty.test.cjs` verifies every scheduled transition, the first armour hit not awarding a point, the second hit removing a creature, level advancement, and the 12-level victory path. Existing smoke, ruler and viewport tests remain. Manual browser QA is still recommended, especially for helmet visibility with the protractor over the board, mobile sizing, and the learning pace at Levels 4, 7 and 10 (first squid warning).

## Alternating phases and clear pop-in warnings (PR #7)

**Every valid turn alternates phases automatically**: Fire → Move → Fire → Move. The player begins in **Fire**. Students cannot choose to fire repeatedly or skip a movement turn. The current phase is shown in the Captain's Bridge heading and highlighted step, the persistent phase ribbon, and a brief visible **FIRE PHASE** or **MOVE PHASE** pop-in as the next turn begins. The pop-in plays after the previous turn's movement animation finishes, so it never announces a new playable turn while the controls are locked. Phase alternation carries across the 12 level boundaries.

On an **invalid bearing**, the game shows a large red pop-in with the specific reason: missing three figures, invalid characters, or **360° should be 000°**. A correctly formatted shot that simply **misses** also produces a post-shot pop-in asking the student to check their bearing and range; that shot **does consume a turn** and never reveals the correct bearing. Invalid distances and off-board moves use the same style. The affected input is highlighted and remains editable. Errors also appear in the ship's log for accessibility. **Invalid orders do not consume a turn, move enemies or switch phase.** Correct the entry and retry.

Pop-ins are non-interactive overlays; they fade without blocking the protractor/ruler or the single-screen controls. Reduced-motion mode shows the notice without sliding. The tutorial and Maths Help sections cover phase alternation, invalid bearings and how to correct them.

### Manual QA

1. Restart: confirm **FIRE PHASE** appears and the **Launch bubble!** action is available. Fire/Move labels cannot be clicked to skip a phase.
2. Enter `45`, then `360`: each should produce a distinct red explanation, stay on FIRE and not advance the turn counter. Then try `045` as a valid bearing.
3. Fire a valid shot, including a **miss**: once the action animation ends, the **MOVE PHASE** pop-in and green-highlighted step should appear.
4. Enter a MOVE distance of 6 or a course that goes off the board: warning shown, no turn used. Enter a valid move: after the sailing animation, **FIRE PHASE** returns.
5. Check alternating phases across a level transition and after cracking a two-hit helmet (helmet contact still uses a turn).
6. Test reduced motion, screen readers, touch/keyboard input, tutorial and Maths Help. The game board must retain full manual measurement and no pre-shot guide.

Regression command (Node 20+): `node --test tests/*.test.cjs`. The `.github/workflows/regression.yml` GitHub Actions workflow runs these tests on pull requests and pushes to `main`.

## Future ideas

- Difficulty progression and curated levels.
- Optional accessibility and contrast improvements.
- In-game practice challenges and teacher observation mode.
- Playtesting accuracy, input handling and tool use with students.
