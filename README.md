# 🐙 Bloop! Bearing Battles

A colourful, standalone browser game for Foundation Edexcel International GCSE Mathematics A (4MA1) students learning bearings.

## Play

Open `index.html` in a modern browser. No installation, assets, server, build step or external dependencies are required. Once the feature branch is merged, enable **GitHub Pages → Deploy from a branch → main / (root)** in the repository settings to publish it.

## Learning goals

- Measure three-figure bearings clockwise from north.
- Use a 360° protractor and ruler manually, without automatic aiming lines.
- Estimate distances using a 1-unit grid.
- Apply bearings to fire at a moving target or move the player's ship.
- Revise reverse bearings, compass directions, and common errors with optional maths help.

## Controls

1. Use the draggable **protractor** and **ruler** over the board. Drag the orange handles to rotate them. The centre of the protractor and 0-unit end of the ruler can be positioned by hand.
2. Choose **Fire** or **Move**.
3. Type a three-digit bearing from `000` to `359` and a whole-number range/distance.
4. **Fire:** range 1–8 units, bubble follows a ray; a hit requires passing through a creature. **Move:** distance 1–5 units, must remain on the board.
5. After every valid order, enemies approach. Each creature that gets close costs a heart. Lose three hearts to end the game. When all enemies are cleared, a new wave appears.
6. Use **Tutorial** for a guided seven-step explanation and **Maths help** for optional conceptual guidance.

All rendering is on one scalable canvas; the interface adapts to narrow screens. No player data is collected or sent.

## Teacher notes

The game provides no automatic aiming guide or target-bearing solution. The temporary white trajectory appears **only after firing**, giving feedback on the chosen bearing. To increase mathematical challenge, ask students to explain how they measured and why their shot missed. Grid squares are 50 virtual pixels, and distances are measured in whole units; shooting a bubble 5 units at a target 4.2 units away can hit it if the bearing is accurate.

## Future ideas

- Difficulty progression and curated levels.
- Optional accessibility and contrast improvements.
- In-game practice challenges and teacher observation mode.
- Playtesting accuracy, input handling and tool use with students.
