// =============================================================================
// MenuScene — title screen. The real Ibadan road scrolls behind the title
// with a Micra taxi and some traffic, so the first thing players see is the game.
// =============================================================================
import Phaser from 'phaser';
import { COLORS, DEPTH, FONT, FONT_BOLD, GAME_HEIGHT, GAME_WIDTH, TITLE } from '../config/gameConfig.js';
import { DEFAULT_ROUTE_ID, ROUTES } from '../config/route.js';
import { RoadModel } from '../systems/RoadModel.js';
import { RoadRenderer } from '../systems/RoadRenderer.js';
import { Button } from '../ui/Button.js';
import { MuteButton } from '../ui/MuteButton.js';
import { Sfx } from '../audio/Sfx.js';
import { load } from '../utils/storage.js';
import { formatTime, isTouchDevice } from '../utils/helpers.js';

const SCROLL_SPEED = 170; // px/s the background road scrolls

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    this.starting = false; // scenes are reused, so reset per-visit flags here
    this.routeId = DEFAULT_ROUTE_ID;
    this.model = new RoadModel(ROUTES[this.routeId]);
    this.road = new RoadRenderer(this, this.model);
    this.cameras.main.setScroll(0, -300 - H * 0.7);

    // --- background demo traffic ---------------------------------------------
    this.taxi = this.add.image(W / 2, 0, 'player').setDepth(DEPTH.player);
    const keys = ['micra', 'okada', 'keke', 'car-0', 'micra', 'car-3', 'okada-2', 'truck'];
    this.demo = keys.map((key, i) => {
      const img = this.add.image(0, 0, key).setDepth(DEPTH.vehicle);
      img.lane = i % 2 === 0 ? -1 : 1; // side lanes only; the demo taxi owns the middle
      img.d = 300 + i * 260;
      img.speed = key.startsWith('okada') ? 150 : key === 'keke' ? 60 : 100;
      return img;
    });

    // --- dark fade at the top and bottom so text is readable ------------------
    const fade = this.add.graphics().setScrollFactor(0).setDepth(20);
    for (let i = 0; i < 24; i++) {
      fade.fillStyle(0x1d1a16, 0.9 - i * 0.036);
      fade.fillRect(0, i * 18, W, 18);
    }
    fade.fillStyle(0x1d1a16, 0.82);
    fade.fillRoundedRect(28, 532, W - 56, 268, 18);

    // --- title -----------------------------------------------------------------
    const [main, place] = TITLE.split(/ (?=[^ ]+$)/); // "Oya Move!" + "Ibadan"
    const title = this.add
      .text(W / 2, 120, main.toUpperCase(), {
        fontFamily: FONT_BOLD,
        fontSize: '76px',
        color: COLORS.accent,
        stroke: '#1d1a16',
        strokeThickness: 12,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(21);
    title.setShadow(0, 6, '#000000', 0, true, true);
    this.tweens.add({ targets: title, scale: 1.04, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.InOut' });

    // green-white-green band behind the place name
    const band = this.add.graphics().setScrollFactor(0).setDepth(21);
    band.fillStyle(0x008751);
    band.fillRoundedRect(W / 2 - 130, 176, 260, 50, 10);
    band.fillStyle(0xffffff);
    band.fillRect(W / 2 - 44, 176, 88, 50);
    this.add
      .text(W / 2, 201, (place || 'Ibadan').toUpperCase(), {
        fontFamily: FONT_BOLD,
        fontSize: '34px',
        color: '#1d1a16',
        stroke: '#ffffff',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(22);

    this.add
      .text(W / 2, 262, 'Carry passengers, settle Oga, own your motor.\nOr race Iwo Road to Ojoo against the clock!', {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#fff8e7',
        align: 'center',
        stroke: '#1d1a16',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(21);

    // --- mode buttons ------------------------------------------------------------
    // GO WORK = work mode (pick Micra or Maruwa in the garage); QUICK RACE = timed run.
    const work = new Button(this, W / 2, 392, 'GO WORK', { width: 300, height: 78, fontSize: 32, onClick: () => this.startGame('Garage') });
    work.setScrollFactor(0).setDepth(30);
    this.tweens.add({ targets: work, y: 386, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.InOut' });
    const race = new Button(this, W / 2, 476, 'QUICK RACE', {
      width: 240,
      height: 56,
      fontSize: 22,
      color: 0x2e8b57,
      textColor: '#ffffff',
      onClick: () => this.startGame('Game'),
    });
    race.setScrollFactor(0).setDepth(30);

    // --- how to play ---------------------------------------------------------
    const touch = isTouchDevice();
    const how = touch
      ? 'Hold GAS to move, tap ◀ ▶ to steer,\nBRAKE to slow down, HORN to scatter okadas.\nTap the II button (top right) to pause.'
      : '↑ / W  gas      ↓ / S  brake\n← → / A D  steer      SPACE  horn\nP / ESC  pause';
    this.add
      .text(W / 2, 560, 'HOW TO PLAY', { fontFamily: FONT_BOLD, fontSize: '20px', color: COLORS.accent })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(21);
    this.add
      .text(
        W / 2,
        682,
        `${how}\n\nWORK: slow down beside passengers to carry\nthem, stop at their bus stop to collect fare.\nRACE: reach each junction for bonus time.`,
        { fontFamily: FONT, fontSize: '19px', color: '#fff8e7', align: 'center', lineSpacing: 5 }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(21);

    // --- best time + mute ------------------------------------------------------
    const best = load(`best:${this.routeId}`, null);
    if (best) {
      this.add
        .text(W / 2, 818, `Race best: ${formatTime(best.time)}  ${'★'.repeat(best.stars)}${'☆'.repeat(3 - best.stars)}`, {
          fontFamily: FONT_BOLD,
          fontSize: '20px',
          color: '#fff8e7',
          stroke: '#1d1a16',
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(21);
    }
    new MuteButton(this, W - 40, 40).setScrollFactor(0).setDepth(30);

    // Keyboard shortcuts: Enter = Go work, R = Quick race.
    this.input.keyboard.once('keydown-ENTER', () => this.startGame('Garage'));
    this.input.keyboard.once('keydown-R', () => this.startGame('Game'));

    this.events.once('shutdown', () => this.road.destroy());
  }

  /** @param key 'Garage' (work mode) or 'Game' (quick race) */
  startGame(key = 'Garage') {
    if (this.starting) return;
    this.starting = true;
    Sfx.unlock();
    this.cameras.main.fadeOut(250, 29, 26, 22);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, { routeId: this.routeId }));
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    const cam = this.cameras.main;
    cam.scrollY -= SCROLL_SPEED * dt;
    // Loop back to the start after the whole route has scrolled past.
    if (-cam.scrollY > this.model.totalLength) cam.scrollY = -300 - GAME_HEIGHT * 0.7;

    // The demo taxi sways a little in the middle lane.
    const taxiY = cam.scrollY + GAME_HEIGHT * 0.78;
    const taxiD = -taxiY;
    this.taxi.setPosition(this.model.centerX(taxiD) + Math.sin(time / 900) * 10, taxiY);
    this.taxi.setAngle(Math.cos(time / 900) * 3);

    // Demo traffic moves slower than the camera, so the taxi "overtakes" it.
    for (const v of this.demo) {
      v.d += v.speed * dt;
      if (-v.d > cam.scrollY + GAME_HEIGHT + 100) v.d = -cam.scrollY + 100 + Math.random() * 300;
      v.setPosition(this.model.centerX(v.d) + RoadModel.laneOffset(v.lane + 1), -v.d);
    }

    this.road.update(cam.scrollY, cam.scrollY + GAME_HEIGHT);
  }
}
