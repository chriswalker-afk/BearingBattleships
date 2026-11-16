# 🐙 Bloop! Bearing Battles

A colourful, standalone browser game for Foundation Edexcel International GCSE Mathematics A (4MA1) students learning bearings.

## Play

Open `index.html` in a modern browser. Keep the accompanying `pass-a.css`, `pass-a-art.js`, `pass-b.css`, `pass-b-juice.js`, `single-screen.css` and `single-screen.js` files beside it: they provide the illustrated theme, animations and responsive layout. No installation, server, build step or external dependencies are required. Once the feature branch is merged, enable **GitHub Pages → Deploy from a branch → main / (root)** in the repository settings to publish it.

## Learning goals

- Measure three-figure bearings clockwise from north.
- Use a 360° protractor and ruler manually, without automatic aiming lines.
- Estimate distances using a 1-unit grid.
- Apply bearings to fire at a moving target or move the player's ship.
- Revise reverse bearings, compass directions, and common errors with optional maths help.

## Controls

1. Use the draggable **protractor** and **ruler** over the board. Drag the protractor's body to move it and orange rim handle to rotate it. For the ruler, position the **blue 0 marker** at your ship by dragging the ruler body; drag the **orange handle at the far end (past 8)** to rotate about that 0 marker without shifting it.
2. Choose **Fire** or **Move**.
3. Type a three-digit bearing from `000` to `359` and a whole-number range/distance.
4. **Fire:** range 1–8 units, bubble follows a ray; a hit requires passing through a creature. **Move:** distance 1–5 units, must remain on the board.
5. After every valid order, enemies approach. Each creature that gets close costs a heart. Lose three hearts to end the game. When all enemies are cleared, a new wave appears.
6. Use **Tutorial** for a guided seven-step explanation and **Maths help** for optional conceptual guidance.

All rendering is on one scalable canvas; the interface adapts to narrow screens. No player data is collected or sent.

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

- **Mission status:** turn, score, hearts, wave, current/best streak and a scrollable recent-message log.
- **Captain's orders:** Fire / Move, three-figure bearing, range/distance and the main action button.
- **Measuring tools:** one-tap protractor/ruler toggles with a short reminder to drag and rotate manually.
- **Compass and scale:** always shown immediately beneath the board. Tutorial, detailed maths help and restart remain in the compact top bar.
- Press **Enter** from either numeric field to take an order, as an alternative to clicking the action button.

### Screen-fitting behaviour

On typical laptops and landscape tablets (at least **960 CSS pixels wide and 600 pixels high**), the page uses the available viewport height for its game board and control column without requiring page scrolling. The canvas is fitted with its original **1000 × 650** aspect ratio: *angles, distances and hit detection are unchanged*. The board is never stretched to fill an arbitrary rectangle.

On portrait/narrow screens, or when the viewport is shorter than 600 pixels, the controls stack and **normal page scrolling is allowed**. This is deliberate: hiding a measurement tool or shrinking its markings to force an artificial one-screen fit would hurt the teaching objective.

### Verification

Run all zero-dependency tests from the repository root using Node 20+:

\`\`\`sh
node --test tests/*.test.cjs
\`\`\`

The new \`tests/single-screen.test.cjs\` covers required controls, responsive CSS rules and the board-fitting calculations. The existing \`tests/smoke.test.cjs\` continues to cover bearings, turns, creatures, waves, hearts and reduced motion.

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

\`\`\`sh
node --test tests/*.test.cjs
\`\`\`

## Future ideas

- Difficulty progression and curated levels.
- Optional accessibility and contrast improvements.
- In-game practice challenges and teacher observation mode.
- Playtesting accuracy, input handling and tool use with students.
