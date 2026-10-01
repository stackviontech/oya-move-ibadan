// =============================================================================
// RoadRenderer.js — draws the road and scenery in CHUNKS.
//
// Instead of thousands of little shapes being drawn every frame, each chunk
// (a 540×480 slice of the world) is painted ONCE into a RenderTexture, which
// the GPU then shows as a single image. Only ~5 chunks exist at any time;
// when one scrolls off the bottom of the screen it is repainted as the next
// slice of road ahead (object pooling). This keeps mid-range phones smooth.
// =============================================================================
import { DEPTH, FONT_BOLD, GAME_WIDTH, ROAD } from '../config/gameConfig.js';
import { SceneryGenerator } from './SceneryGenerator.js';
import {
  drawBuilding,
  drawBusStop,
  drawCocoaHouse,
  drawGround,
  drawHill,
  drawJunction,
  drawKiosk,
  drawPatch,
  drawPole,
  drawRoadPatch,
  drawRoadStrip,
  drawTree,
  drawUmbrella,
} from '../art/sceneryArt.js';

const CH = ROAD.chunkHeight;

// Scenery item types drawn with Graphics, in back-to-front order.
const DRAW_ORDER_AFTER_ROAD = ['building', 'busstop', 'kiosk', 'umbrella', 'cocoa', 'tree', 'pole'];
const DRAWERS = {
  building: drawBuilding,
  busstop: drawBusStop,
  kiosk: drawKiosk,
  umbrella: drawUmbrella,
  cocoa: drawCocoaHouse,
  tree: drawTree,
  pole: drawPole,
};

export class RoadRenderer {
  constructor(scene, model, poolSize = 5) {
    this.scene = scene;
    this.model = model;
    this.generator = new SceneryGenerator(model);

    // One off-screen Graphics object is reused to paint every chunk.
    this.gfx = scene.make.graphics({ x: 0, y: 0 }, false);
    // One off-screen Text object is reused for landmark name plates.
    this.label = scene.make.text(
      {
        x: 0,
        y: 0,
        text: '',
        style: { fontFamily: FONT_BOLD, fontSize: '11px', color: '#2b2b2b', backgroundColor: '#f4efe0', padding: { x: 5, y: 2 } },
      },
      false
    );

    this.chunks = [];
    for (let i = 0; i < poolSize; i++) {
      const rt = scene.add.renderTexture(0, 0, GAME_WIDTH, CH).setOrigin(0, 0).setDepth(DEPTH.road).setVisible(false);
      this.chunks.push({ rt, k: null });
    }
  }

  /**
   * Make sure every chunk overlapping the camera view (plus one ahead) is
   * painted. camTopY/camBottomY are world Y values of the screen edges.
   */
  update(camTopY, camBottomY) {
    const kMin = Math.floor((-camBottomY - 20) / CH);
    const kMax = Math.floor((-camTopY + 20) / CH) + 1; // +1 = pre-paint the next chunk

    // Release chunks that are no longer needed.
    for (const c of this.chunks) {
      if (c.k !== null && (c.k < kMin || c.k > kMax)) {
        c.k = null;
        c.rt.setVisible(false);
      }
    }
    // Paint missing chunks.
    for (let k = kMin; k <= kMax; k++) {
      if (this.chunks.some((c) => c.k === k)) continue;
      const free = this.chunks.find((c) => c.k === null);
      if (!free) break;
      this._paint(free, k);
    }
    this.generator.prune(kMin - 2);
  }

  _paint(chunk, k) {
    const g = this.gfx;
    const model = this.model;
    const d0 = k * CH;
    const d1 = d0 + CH;
    const oy = -(k + 1) * CH; // world Y of the top edge of this chunk
    g.clear();

    // Items from this chunk AND its neighbours, so shapes crossing a chunk
    // border are drawn on both sides of it (the texture clips the overflow).
    const items = [
      ...this.generator.itemsFor(k - 1),
      ...this.generator.itemsFor(k),
      ...this.generator.itemsFor(k + 1),
    ];

    drawGround(g, GAME_WIDTH, CH);
    for (const it of items) if (it.type === 'patch') drawPatch(g, it, oy);
    for (const it of items) if (it.type === 'hill') drawHill(g, it, oy);

    drawRoadStrip(g, model, d0, d1, oy);
    for (const it of items) if (it.type === 'roadpatch') drawRoadPatch(g, it, model, oy);

    const finishD = model.finishDistance;
    for (const jd of model.junctions) {
      if (jd > d0 - ROAD.junctionSize * 2 && jd < d1 + ROAD.junctionSize * 2) {
        drawJunction(g, model, jd, oy, GAME_WIDTH, jd === finishD);
      }
    }

    for (const type of DRAW_ORDER_AFTER_ROAD) {
      const draw = DRAWERS[type];
      for (const it of items) if (it.type === type) draw(g, it, oy);
    }

    const rt = chunk.rt;
    rt.clear();
    rt.draw(g, 0, 0);

    // Sprites (parked cars, people standing around) are stamped on top.
    const textures = this.scene.textures;
    for (const it of items) {
      if (it.type === 'sprite') {
        const frame = textures.getFrame(it.key);
        if (frame) rt.drawFrame(it.key, undefined, it.x - frame.width / 2, it.y - oy - frame.height / 2);
      } else if (it.type === 'label') {
        this.label.setText(it.text);
        const half = this.label.width / 2;
        const lx = Math.max(half + 4, Math.min(GAME_WIDTH - half - 4, it.x)); // keep it on screen
        rt.draw(this.label, lx - half, it.y - oy);
      }
    }

    rt.setPosition(0, oy).setVisible(true);
    chunk.k = k;
  }

  destroy() {
    this.gfx.destroy();
    this.label.destroy();
    for (const c of this.chunks) c.rt.destroy();
    this.chunks.length = 0;
  }
}
