// =============================================================================
// gameConfig.js — global numbers that control how the game looks and feels.
// Change values here to tune the game without touching the game logic.
// All distances are in pixels, all speeds in pixels per second.
// =============================================================================

// The three name ideas. TITLE is the one shown on the menu and in share text.
export const NAME_OPTIONS = ['Oya Move! Ibadan', 'Micra Dash Ibadan', 'Go-Slow Ibadan'];
export const TITLE = NAME_OPTIONS[0];

// Logical game size. The canvas is scaled to fit the screen (portrait works
// best on phones; on desktop the game sits in the middle of the window).
export const GAME_WIDTH = 540;
export const GAME_HEIGHT = 960;

// ---------------------------------------------------------------------------
// Road geometry
// ---------------------------------------------------------------------------
export const ROAD = {
  laneCount: 3,
  laneWidth: 76,
  shoulder: 22, // concrete kerb / walkway beside the road the car can scrape along
  chunkHeight: 480, // road is drawn in chunks of this height and recycled
  junctionSize: 120, // height of the cross-road at each checkpoint junction
};
ROAD.halfWidth = (ROAD.laneCount * ROAD.laneWidth) / 2;

// ---------------------------------------------------------------------------
// Player (your yellow-and-maroon Micra taxi)
// ---------------------------------------------------------------------------
export const PLAYER = {
  maxSpeed: 470,
  acceleration: 300,
  brakeForce: 720,
  coastDrag: 140, // how fast you slow down when no pedal is pressed
  lateralSpeed: 300, // sideways steering speed at full speed
  minSteerFactor: 0.45, // you can still steer a bit when crawling
  offRoadMaxSpeedFactor: 0.55, // top speed while scraping the kerb
  crashSlowFactor: 0.5, // top speed multiplier right after a crash
  crashSlowTime: 1.3, // seconds the crash slowdown lasts
  invulnerableTime: 1.2, // seconds of "blinking" after a crash
  potholeSpeedFactor: 0.62, // speed is multiplied by this when you hit a pothole
  hornCooldown: 0.35,
  hornRadius: 260, // okadas inside this distance move aside when you honk
  screenY: 0.7, // where your car sits on screen (0 = top, 1 = bottom)
  screenYTouch: 0.62, // a bit higher on phones so the touch buttons don't cover it
};

// Converts internal px/s into the km/h shown on the speedometer.
export const SPEED_TO_KMH = 0.19;

// ---------------------------------------------------------------------------
// Time rules
// ---------------------------------------------------------------------------
export const TIME = {
  crashPenalty: 3, // seconds lost when you hit a vehicle, person or obstacle
  lowTimeWarning: 8, // HUD timer turns red below this many seconds
};

// ---------------------------------------------------------------------------
// Colours (hex numbers for Phaser graphics, strings for text)
// ---------------------------------------------------------------------------
export const COLORS = {
  ground: 0x6f8f4a,
  groundDark: 0x5b7a3c,
  laterite: 0xa65f36, // Ibadan's red earth
  asphalt: 0x3c3c40,
  asphaltPatch: 0x47474b,
  asphaltPatchDark: 0x323235,
  laneMark: 0xe8e2cf,
  kerb: 0xb9b2a2,
  kerbDark: 0x8f887a,
  gutter: 0x2a2620,
  junctionRoad: 0x414145,
  zebra: 0xf0ede4,
  signGreen: 0x1f6b3a,
  signGreenDark: 0x144826,
  rustRoofs: [0x8b4a2b, 0xa0522d, 0x7a3f22, 0x9c5a33, 0x6e3b20, 0x914c28, 0x7f4a2f],
  newRoofs: [0xa9b0b4, 0x3f6f9e, 0x9a3a2f],
  hud: '#fff8e7',
  hudShadow: '#000000',
  accent: '#f5c400',
  danger: '#ff4d3d',
  good: '#7ee07a',
};

export const FONT = '"Trebuchet MS", "Segoe UI", Roboto, Arial, sans-serif';
export const FONT_BOLD = '"Arial Black", "Segoe UI Black", "Trebuchet MS", Arial, sans-serif';

// Depth (draw order) for the different layers of the world.
export const DEPTH = {
  road: 0,
  pothole: 2,
  pedestrian: 3,
  vehicle: 4,
  player: 5,
  gantry: 8,
  worldText: 9,
};
