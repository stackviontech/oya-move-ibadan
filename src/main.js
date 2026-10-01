// =============================================================================
// main.js — creates the Phaser game. Start reading the code here!
//
// Scene flow:  Boot → Menu → Game (+ HUD on top) → GameOver (overlay)       [Quick Race]
//              Boot → Menu → Garage → Work (+ HUD) → DaySummary (overlay)   [Work mode]
//              Pause (overlay) can open from Game at any time.
// =============================================================================
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config/gameConfig.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { HUDScene } from './scenes/HUDScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { PauseScene } from './scenes/PauseScene.js';
import { GarageScene } from './scenes/GarageScene.js';
import { WorkScene } from './scenes/WorkScene.js';
import { DaySummaryScene } from './scenes/DaySummaryScene.js';

const config = {
  type: Phaser.AUTO, // WebGL when available, Canvas otherwise
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1d1a16',
  scale: {
    mode: Phaser.Scale.FIT, // scale to fit the screen, keep the shape
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  audio: { noAudio: true }, // we make our own sounds with Web Audio (see audio/Sfx.js)
  input: { activePointers: 4 }, // multi-touch: steer + gas + horn at the same time
  render: { antialias: true, powerPreference: 'high-performance' },
  // Order = draw order: later scenes are drawn on top.
  scene: [BootScene, MenuScene, GarageScene, GameScene, WorkScene, HUDScene, GameOverScene, DaySummaryScene, PauseScene],
};

const game = new Phaser.Game(config);

// Debug helpers for the browser console — development only (removed from builds).
//   __run(3000)        advance the game 3 s instantly (works even in a hidden tab)
//   __key('keydown', 38) press a key by keyCode (38 = up arrow), 'keyup' to release
if (import.meta.env.DEV) {
  window.__game = game;
  let t = performance.now();
  window.__run = (ms) => {
    for (let i = 0; i < Math.round(ms / 16.667); i++) game.step((t += 16.667), 16.667);
  };
  window.__key = (type, keyCode) => {
    const e = new KeyboardEvent(type, { bubbles: true, cancelable: true });
    Object.defineProperty(e, 'keyCode', { get: () => keyCode });
    window.dispatchEvent(e);
  };
  // Work-mode balancing bot: __workDay('micra') / __workDays('maruwa', 5)
  import('./dev/autopilot.js').then((m) => m.installAutopilot(game));
}
