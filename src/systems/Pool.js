// =============================================================================
// Pool.js — object pooling. Creating and destroying game objects during play
// causes stutters on phones (garbage collection), so instead we keep objects
// around and switch them on/off. `active === false` means "free to reuse".
// =============================================================================
export class Pool {
  /** @param {() => object} factory creates a new object when the pool is empty */
  constructor(factory) {
    this.factory = factory;
    this.items = [];
  }

  /** Get a free object (creates one only if every object is in use). */
  get() {
    for (let i = 0; i < this.items.length; i++) {
      if (!this.items[i].active) return this.items[i];
    }
    const item = this.factory();
    this.items.push(item);
    return item;
  }

  countActive() {
    let n = 0;
    for (let i = 0; i < this.items.length; i++) if (this.items[i].active) n++;
    return n;
  }

  forEachActive(fn) {
    for (let i = 0; i < this.items.length; i++) if (this.items[i].active) fn(this.items[i]);
  }

  /** Turn every object off (used when restarting). */
  releaseAll() {
    for (const item of this.items) if (item.active) item.kill();
  }
}
