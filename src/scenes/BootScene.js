// =============================================================================
// BootScene — loads any real sprite images you've added (see config/assets.js),
// then draws every missing texture with code. Runs once at startup.
// =============================================================================
import Phaser from 'phaser';
import { SPRITE_FILES } from '../config/assets.js';
import { generateTextures } from '../art/textures.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Only files you have filled in are loaded; everything else is generated.
    for (const [key, path] of Object.entries(SPRITE_FILES)) {
      if (path) this.load.image(key, path);
    }
  }

  create() {
    generateTextures(this);
    this.scene.start('Menu');
  }
}
