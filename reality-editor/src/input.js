// Keyboard, mouse drag-rectangle, and touch buttons.

import { CONFIG } from './config.js';

export class Input {
  constructor(canvas, toLogical) {
    this.canvas = canvas;
    this.toLogical = toLogical;
    this.keys = new Set();

    this.pointer = { x: 0, y: 0 };
    this.dragging = false;
    this.dragStart = null;
    this.dragRect = null;
    this.releasedRect = null;
    this.clicked = null;

    this.resetPressed = false;
    this.pausePressed = false;

    this.touchMode = ('ontouchstart' in window) ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    this.touch = new Set();
    this.buttonHeld = null;

    addEventListener('keydown', (e) => {
      if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Backspace'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.dragging) this.cancelDrag();
        else this.pausePressed = true;
        return;
      }
      if (e.code === 'Backspace') this.resetPressed = true;
      if (!e.repeat) this.keys.add(e.code);
    });

    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => {
      this.keys.clear();
      this.touch.clear();
      this.buttonHeld = null;
      this.cancelDrag();
    });

    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType !== 'touch') return;
      const p = this.toLogical(e.clientX, e.clientY);
      this.pointer = p;

      if (this.touchMode) {
        const b = this.hitTouchButton(p);
        if (b) {
          this.touch.add(b.id);
          this.buttonHeld = b.id;
          return;
        }
      }

      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
      this.dragging = true;
      this.dragStart = p;
      this.dragRect = { x: p.x, y: p.y, w: 0, h: 0 };
    });

    canvas.addEventListener('pointermove', (e) => {
      const p = this.toLogical(e.clientX, e.clientY);
      this.pointer = p;
      if (!this.dragging || !this.dragStart) return;
      this.dragRect = {
        x: Math.min(this.dragStart.x, p.x),
        y: Math.min(this.dragStart.y, p.y),
        w: Math.abs(p.x - this.dragStart.x),
        h: Math.abs(p.y - this.dragStart.y)
      };
    });

    const finish = (e) => {
      const p = this.toLogical(e.clientX, e.clientY);
      this.pointer = p;

      if (this.buttonHeld) {
        this.touch.clear();
        this.buttonHeld = null;
        return;
      }
      if (!this.dragging) return;

      const rect = {
        x: Math.min(this.dragStart.x, p.x),
        y: Math.min(this.dragStart.y, p.y),
        w: Math.abs(p.x - this.dragStart.x),
        h: Math.abs(p.y - this.dragStart.y)
      };
      this.dragging = false;
      this.dragRect = null;
      this.dragStart = null;

      if (rect.w >= 18 && rect.h >= 18) this.releasedRect = rect;
      else this.clicked = { x: p.x, y: p.y };
    };

    canvas.addEventListener('pointerup', finish);
    canvas.addEventListener('pointercancel', () => {
      this.cancelDrag();
      this.touch.clear();
      this.buttonHeld = null;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  hitTouchButton(p) {
    if (!this.touchMode) return null;
    for (const b of CONFIG.ui.touch) {
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b;
    }
    return null;
  }

  cancelDrag() {
    this.dragging = false;
    this.dragStart = null;
    this.dragRect = null;
  }

  get left() { return this.keys.has('KeyA') || this.keys.has('ArrowLeft') || this.touch.has('left'); }
  get right() { return this.keys.has('KeyD') || this.keys.has('ArrowRight') || this.touch.has('right'); }
  get jump() {
    return this.keys.has('Space') || this.keys.has('KeyW') || this.keys.has('ArrowUp') || this.touch.has('jump');
  }
  get rewind() {
    return this.keys.has('KeyR') || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.touch.has('rewind');
  }
}
