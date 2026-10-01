// =============================================================================
// Signboards.js — the big green overhead signs at every checkpoint junction
// ("DUGBE", "MOKOLA" …). They sit above the traffic, so vehicles pass under.
// =============================================================================
import { COLORS, DEPTH, FONT, FONT_BOLD, ROAD } from '../config/gameConfig.js';

export function createSignboards(scene, model) {
  const boards = [];
  const bw = ROAD.halfWidth * 2 + 50;
  const bh = 58;

  for (const area of model.areas) {
    const c = scene.add.container(model.centerX(area.start), -area.start).setDepth(DEPTH.gantry);
    const g = scene.add.graphics();
    // shadow on the road
    g.fillStyle(0x000000, 0.22);
    g.fillRect(-bw / 2 + 8, -bh / 2 + 10, bw, bh);
    // steel beam and poles at each side of the road
    g.fillStyle(0x8d8d8d);
    g.fillRect(-bw / 2 - 10, -3, bw + 20, 6);
    g.fillStyle(0x6a6a6a);
    g.fillCircle(-bw / 2 - 10, 0, 7);
    g.fillCircle(bw / 2 + 10, 0, 7);
    // green board with a white border
    g.fillStyle(COLORS.signGreenDark);
    g.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 6);
    g.fillStyle(COLORS.signGreen);
    g.fillRoundedRect(-bw / 2 + 3, -bh / 2 + 3, bw - 6, bh - 6, 5);
    g.lineStyle(2, 0xffffff, 0.9);
    g.strokeRoundedRect(-bw / 2 + 7, -bh / 2 + 7, bw - 14, bh - 14, 4);

    const name = scene.add
      .text(0, -7, area.sign, { fontFamily: FONT_BOLD, fontSize: '27px', color: '#ffffff' })
      .setOrigin(0.5);
    const subLabel = area.index === 0 ? 'START' : area.finish ? 'FINISH' : area.subSign || '';
    const sub = scene.add
      .text(0, 16, subLabel.toUpperCase(), { fontFamily: FONT, fontSize: '12px', color: '#e3f1e6' })
      .setOrigin(0.5);
    c.add([g, name, sub]);
    c.d = area.start;
    boards.push(c);
  }
  return boards;
}

/** Hide boards that are off screen (saves a little drawing work on phones). */
export function cullSignboards(boards, camTopY, camBottomY) {
  for (const b of boards) b.setVisible(b.y > camTopY - 80 && b.y < camBottomY + 80);
}
