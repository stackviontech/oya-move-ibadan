# Oya Move! Ibadan

A browser-based, top-down driving game set in Ibadan traffic. Drive a Micra taxi (in Oyo State's yellow and maroon,
"omi obe ati gbegiri") or a Maruwa, carry passengers, haggle fares, pay your Oga and work towards owning your motor,
while dodging okadas, kekes, potholes and Micras wey dey stop anyhow.

## Two ways to play

**GO WORK (main mode).** Pick your ride in the garage and hustle from 6am to 8pm:

- **Micra** works Toll Gate ↔ Ojoo (Boluwaji, Academy, Muslim, Olorunsogo, Oremeji, Iwo Road). Carries 5.
- **Maruwa** works Kuola ↔ Agodi Gate through 15 stops (Elebu, Tipper Garage, New Garage, Challenge,
  Felele, Molete, Oja'ba, Beere, Oje...). Carries 4.
- Stop beside a waiting passenger (right lane, slow) and they **haggle the fare**: take their price,
  ask the normal ₦300/₦400, or ask for more. Ask too much and they counter-offer or walk off.
- Stop in the yellow **DROP** box after their bus stop to collect the fare. Drive past and they don't pay.
- Fuel, the agbero ticket and crash repairs cost money. Scared passengers may jump out after a crash.
- At the end of the day you pay **Oga's money**. Fail 3 times and Oga collects his motor. Pay enough
  days (10 for the Micra, 8 for the Maruwa) and the motor is yours. Progress is saved on the device.

**QUICK RACE.** Iwo Road → Beere → Dugbe → Mokola → Sango → UI Gate → Ojoo against the clock, with
bonus time at each junction and a star rating.

Built with Phaser 3 + Vite, plain JavaScript. No backend, no image or audio files: every vehicle, building and sound
is generated in code.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. To test on your phone, open the "Network" URL Vite prints (same Wi-Fi).
Add `?touch=1` to the URL to force the on-screen touch controls on desktop.

## Build

```bash
npm run build
```

Outputs a static `dist/` folder (about 340 KB gzipped). Asset paths are relative, so it works from any sub-folder.

## Deploy

**GitHub Pages** (workflow included in `.github/workflows/deploy.yml`):

1. Push this folder to a GitHub repo on the `main` branch.
2. In the repo, go to **Settings → Pages → Source** and pick **GitHub Actions**.
3. Every push to `main` builds and publishes to `https://<username>.github.io/<repo>/`.

**Netlify**: "Add new site → Import from Git", pick the repo. `netlify.toml` already sets the build command and
`dist` folder. Or drag the `dist/` folder onto https://app.netlify.com/drop.

**Vercel**: import the repo. It auto-detects Vite (build `npm run build`, output `dist`).

## Controls

| Action | Desktop | Phone |
| ------ | ------- | ----- |
| Gas / brake | ↑ / ↓ or W / S | GAS / BRAKE buttons |
| Steer | ← / → or A / D | ◀ ▶ buttons |
| Horn (okadas move aside) | Space | HORN button |
| Pause | P or Esc | II button (top right) |
| Haggle a fare | 1 / 2 / 3 | Tap a price |

The game also pauses itself when you switch tabs, switch apps or lock your phone.

## Project structure

```
src/
  main.js                  Phaser game setup (start reading here)
  config/
    route.js               Routes and bus stops, traffic density, time bonuses, difficulty
    work.js                Work mode: vehicles, fares, haggling, Oga's money, day length
    gameConfig.js          Sizes, player handling, colours, title options
    messages.js            All Pidgin / Yoruba popup lines
    assets.js              Sprite-swap manifest
  scenes/                  Boot, Menu, Garage, Game (race), Work, HUD, GameOver, DaySummary, Pause
  entities/                Player, TrafficVehicle (car/Micra taxi/lorry), Okada, Keke, Pothole (+Obstacle), Pedestrian
  systems/
    RoadModel.js           Road shape maths (bends, lanes, which area you're in)
    RoadRenderer.js        Paints road + scenery into pooled chunk textures
    SceneryGenerator.js    Seeded placement of buildings, kiosks, hills, Cocoa House...
    TrafficManager.js      Spawning, AI, potholes, pedestrians, object pooling
    Signboards.js          Overhead junction signs
    PassengerManager.js    Work mode passengers: waiting, haggling, boarding, drop-offs
    Career.js              Saved progress, paying Oga, owning the motor
  dev/autopilot.js         Dev-only bot for balancing money (not in builds)
  art/                     Code-drawn textures and scenery
  ui/                      Buttons, popups, touch controls, mute and pause buttons
  audio/Sfx.js             Web Audio sound synth (horn, crash, pothole, jingles, engine)
```

## Common changes

**Edit bus stops:** each work route in `src/config/route.js` is a list of
`stop('Name', distanceToNextStop, { ... })` lines. Reorder, rename or add stops freely; just keep the terminus last.

**Rebalance the money:** fares, haggling, fuel, tickets, Oga's money and days-to-own are all in
`src/config/work.js`. With `npm run dev` running, type `__workDays('micra', 3)` in the browser console
to have a bot play 3 days and print what it earned.

**Add or edit an area:** open `src/config/route.js` and copy an area block. Each area has its own length, time
bonus, traffic density and mix, pothole rate, pedestrian chance and scenery mix. Order in the list = order on the road.

**New route (e.g. Challenge → Bodija):** add another entry to `ROUTES` in `route.js` and set `DEFAULT_ROUTE_ID`.

**Make it easier or harder:** `startTime`, `bonusTime` and `stars` in `route.js`; `DIFFICULTY` at the bottom of
`route.js`; `PLAYER` and `TIME.crashPenalty` in `gameConfig.js`.

**Swap in real sprites:** put PNGs in `public/sprites/`, then set their paths in `src/config/assets.js` (vehicles drawn
facing up). Anything left `null` keeps the generated art.

**Change the title:** `NAME_OPTIONS` / `TITLE` in `gameConfig.js`.

## Performance notes

- The road and scenery are painted once per 480 px chunk into a RenderTexture, and only about 5 chunks exist at a time.
- Vehicles, potholes, pedestrians and popup texts are pooled, so nothing is created or destroyed during play.
- The AI's per-frame loops avoid allocations, and HUD text only re-renders when its value changes.
