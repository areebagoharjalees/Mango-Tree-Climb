# Mango Tree Climb

**Mango Tree Climb** is a browser-based vertical arcade game where players climb an endless mango tree, dodge mangoes thrown by monkeys, collect special mangoes, build a **Mango Rush** meter, and compete for the highest score.

The game is designed as a fast-paced competition experience with a leaderboard, player/company identification, score history, CSV export, sound effects, background music, and responsive controls for both desktop and mobile devices.

---

## Game Objective

The objective is simple:

> **Climb as high as possible, avoid dangerous mangoes, collect reward mangoes, and achieve the highest score.**

The player controls a climber moving vertically through an endless mango tree while monkeys throw mangoes from branches above.

The game becomes progressively more difficult as the player climbs higher.

---

## Main Features

* **Endless vertical climbing**
* Monkeys positioned on tree branches
* Mangoes thrown by monkeys
* Rotten mangoes that damage the player
* Yellow mangoes worth **+20 score**
* Golden mangoes worth **+40 score**
* Mango Rush survival ability
* Three-health system
* Increasing difficulty as the player climbs
* Top 10 leaderboard
* Player name and company name collection
* Complete player history
* CSV leaderboard export
* Background music and sound effects
* Pause/resume functionality
* Mobile/touch controls
* Keyboard controls
* Responsive interface
* Game-over statistics and ranking
* Automatic preservation of player history using browser `localStorage`

---

## Scoring System

The game keeps **height and score as separate concepts**.

### Height

Height represents the player's actual climbing distance.

It is calculated from the player's vertical position and displayed in **meters**.

```text
Height = actual climbing distance
```

The height itself is **not converted into mango points**.

### Mango Rewards

Special mangoes contribute additional points to the final score:

| Mango           |    Reward | Rush Effect         |
| --------------- | --------: | ------------------- |
| Yellow Mango |       +20 | Small Rush increase |
| Golden Mango  |       +40 | Large Rush increase |
| Rotten Mango | -1 Health | No score reward     |

### Final Score

The final score is calculated as:

```text
Final Score = Height + (Yellow Mangoes × 20) + (Golden Mangoes × 40)
```

For example:

```text
Height = 300 m
Yellow Mangoes = 4
Golden Mangoes = 2

Final Score = 300 + (4 × 20) + (2 × 40)
            = 460
```

The game continuously recalculates the score during gameplay so that collected mango rewards are included immediately.

---

## Mango Reward Display

The gameplay HUD displays the mango reward breakdown directly underneath the height:

```text
HEIGHT
300 M

+20 × 4
+40 × 2
```

This makes it clear how many bonus mangoes the player has collected and how much each type contributes.

---

## Mango Rush

**Mango Rush** is a temporary survival ability.

Every run starts with:

```text
Mango Rush = 0%
```

Players build the meter by:

* Catching yellow mangoes
* Catching golden mangoes
* Performing near-misses

Once the meter reaches at least:

```text
25%
```

the player can activate Mango Rush.

### Activation

Press:

```text
SPACE
```

When activated:

* The Rush meter is consumed.
* Incoming mangoes become significantly slower.
* The player receives a temporary survival window.
* The more Rush charge saved before activation, the longer the slowdown lasts.

Mango Rush does **not** automatically make the player climb faster.

---

## Monkey & Mango Mechanics

Monkeys are positioned on branches throughout the tree.

The branches are:

* Vertically separated
* Alternated between the left and right sides
* Generated continuously as the player climbs

This prevents the game from becoming visually cluttered.

Monkeys attack from **above the player**, throwing mangoes downward.

As the player climbs higher:

* Mangoes become faster
* Mangoes become more frequent
* The overall difficulty increases

---

## Health System

The player starts with:

```text
❤️ ❤️ ❤️
```

Getting hit by a rotten mango removes one health point.

Example:

```text
❤️ ❤️ ❤️
↓
❤️ ❤️ ♡
```

When health reaches zero, the run ends and the game-over screen appears.

---

## Near-Miss System

Players can perform near-misses by narrowly avoiding incoming mangoes.

Near-misses:

* Increase the player's dodge statistics
* Contribute to Mango Rush charging
* Encourage skilled and risky gameplay

The game-over screen displays the number of near-misses achieved during the run.

---

## Movement Controls

### Desktop

| Key       | Action              |
| --------- | ------------------- |
| `←` / `A` | Move left           |
| `→` / `D` | Move right          |
| `↑` / `W` | Climb upward        |
| `↓` / `S` | Descend             |
| `SPACE`   | Activate Mango Rush |
| `P`       | Pause               |
| `ESC`     | Pause               |

The player only changes vertical position while **UP/W or DOWN/S is held**.

There is no automatic climbing.

---

## Mobile Controls

The game includes touch-friendly controls for mobile devices.

The mobile interface provides controls for:

* Moving left
* Climbing
* Moving right
* Mango Rush

The interface automatically adapts based on screen size.

---

## Leaderboard

The game includes a **Top 10 leaderboard**.

Players are asked to enter:

* Player Name
* Company Name

before starting a run.

The leaderboard displays:

```text
Rank
Player Name
Company
Score
```

The leaderboard appears in multiple locations, including the opening screen and gameplay interface where appropriate.

---

## Player History

The game maintains a separate historical record of completed runs.

Each recorded run contains:

* Player Name
* Company Name
* Time Played
* Score

Historical records are stored in the browser's `localStorage`.

The game also supports migration of older leaderboard/history formats so previous records can remain available.

---

## CSV Export

The complete player history can be exported as a CSV file.

The exported file contains:

```text
Player Name
Company Name
Time Played
Score
```

The generated filename is:

```text
mango-tree-climb-all-players.csv
```

This can be opened in:

* Microsoft Excel
* Google Sheets
* LibreOffice Calc
* Other spreadsheet applications

This feature is particularly useful for competitions and events where organizers need a record of all participating players.

---

## Game-Over Screen

When the player loses all health, the game displays a result screen containing:

* Final height
* Final score
* Number of mangoes collected
* Number of near-misses
* Best combo
* Leaderboard rank
* Record status

The game can display messages such as:

```text
GREAT CLIMB!
```

```text
AMAZING CLIMB!
```

```text
LEGENDARY CLIMB!
```

A new leaderboard record is also highlighted when achieved.

---

## Climb Milestones

The game categorizes climbing performance based on height.

### Great Climb

Less than 300 meters.

### Amazing Climb

300 meters or higher.

### Legendary Climb

500 meters or higher.

---

## Audio System

The game includes:

* Background music
* Sound effects
* Mango collection sounds
* Damage sounds
* Rush activation sounds
* Game-start sounds
* Record sounds

Players can toggle audio using the sound button.

The implementation also handles browser autoplay restrictions by attempting to start audio after user interaction.

---

## Data Storage

The game does not require a backend server or database.

Player history is stored locally using:

```javascript
localStorage
```

The primary storage key is:

```text
mangoTreeHistoryV2
```

Older data formats are also checked and migrated:

```text
mangoTreeHistoryV1
mangoTreeBoardV5
```

This allows historical player information to remain available after updates.

---

## Project Structure

```text
Mango Tree Climb/
│
├── index (1).html
├── game.js
├── style.css
├── RUN_GAME.bat
├── mango_ambience.wav
└── qr-code.png
```

### `index (1).html`

Contains the main HTML structure and user interface of the game, including:

* Opening screen
* Player information form
* Game HUD
* Leaderboard
* Game-over screen
* Pause screen
* Instructions
* Controls
* Modals
* Mobile controls

### `game.js`

Contains the main game logic, including:

* Player movement
* Height calculation
* Score calculation
* Mango mechanics
* Monkey behavior
* Collision detection
* Health
* Mango Rush
* Leaderboard
* Player history
* CSV export
* Audio
* Game states
* Rendering
* Game loop

### `style.css`

Controls the game's:

* Visual design
* Layout
* Colors
* Animations
* HUD
* Leaderboards
* Buttons
* Responsive behavior
* Mobile interface

### `mango_ambience.wav`

Background ambience/music used during gameplay.

### `qr-code.png`

QR code displayed on the competition opening screen.

### `RUN_GAME.bat`

Windows batch file intended to launch the game directly.

---

## How to Run

### Option 1 — Open in Browser

Open:

```text
index (1).html
```

in a modern web browser.

Recommended browsers:

* Google Chrome
* Microsoft Edge
* Mozilla Firefox

No installation or backend server is required.

### Option 2 — Windows Batch File

The project contains:

```text
RUN_GAME.bat
```

which is intended to launch the game automatically.

**Note:** The current HTML file is named `index (1).html`, while the batch file references `index.html`. If the batch file does not open the game, rename:

```text
index.html
```

to:

```text
index.html
```

Then `RUN_GAME.bat` will correctly reference the file.

---

## Technologies Used

The project is built using standard web technologies:

* **HTML5**
* **CSS3**
* **JavaScript**
* **HTML5 Canvas**
* **Web Audio API**
* **Browser LocalStorage**
* **CSV generation using JavaScript**

No external backend or database is required.

---

## Game Design

The game uses a colorful jungle/mango-tree theme with:

* Large central mango tree
* Animated climber
* Monkeys sitting on branches
* Falling/throwing mangoes
* Golden mango effects
* Particle effects
* Dynamic background
* Mango Rush visual effects
* Responsive HUD

The tree world is procedurally extended as the player climbs, allowing the game to continue indefinitely.

---

## Endless World

There is no fixed maximum height.

The game continuously generates additional branches above the player.

As the player climbs:

```text
Player
  ↑
New branches generated
  ↑
New monkeys
  ↑
More mangoes
  ↑
Increasing difficulty
```

This creates an endless-runner style gameplay loop where the objective is to beat previous records rather than reach a fixed destination.

---

## Gameplay Stability

The game includes several safeguards to keep gameplay consistent:

* Dead players cannot continue moving.
* Incoming mangoes are cleared when the game ends.
* Game input is disabled after death.
* The score is recalculated immediately after mango collection.
* Active runs can be recorded when the page is closed or refreshed.
* Player names and company names are sanitized.
* Leaderboard HTML is escaped before rendering.
* Duplicate historical records are filtered during migration.
* The game world removes distant objects to reduce unnecessary processing.

---

## Game Flow

```text
OPEN GAME
    ↓
Enter Player Name
    ↓
Enter Company Name
    ↓
START CLIMBING
    ↓
Move + Climb
    ↓
Dodge Rotten Mangoes
    ↓
Collect Yellow / Golden Mangoes
    ↓
Build Mango Rush
    ↓
Activate Rush when needed
    ↓
Continue Climbing
    ↓
Health reaches 0
    ↓
GAME OVER
    ↓
Calculate Final Score
    ↓
Save Player Record
    ↓
Update Leaderboard
    ↓
Display Results
```

---

## Important Scoring Principle

The project intentionally keeps **height separate from mango rewards**.

Height represents the player's actual climbing achievement.

Mangoes provide bonus points.

Therefore:

```text
HEIGHT ≠ MANGO POINTS
```

Instead:

```text
HEIGHT = actual climbing distance

MANGO BONUS =
(Yellow Mangoes × 20)
+
(Golden Mangoes × 40)

FINAL SCORE =
HEIGHT + MANGO BONUS
```

This ensures that mango rewards increase the player's **final score** without incorrectly treating mango reward points as physical climbing height.

---

## Project Purpose

Mango Tree Climb is suitable for:

* University events
* Technology competitions
* Company events
* Gaming competitions
* Interactive booths
* Promotional campaigns
* Student projects
* Demonstrations of frontend game development

Its leaderboard and CSV functionality make it especially suitable for **live competitions where multiple participants play the same game and their results need to be recorded**.

---

## License

This project can be used and modified according to the terms defined by its project owner.

If this project is published publicly, add an appropriate open-source license such as MIT, Apache 2.0, or another license depending on the intended usage.

---

## Final Goal

**Climb higher. Dodge smarter. Collect mangoes. Charge the Rush. Beat the record.**

> **How high can you climb?**
