// AABB platformer body. The player is off-tape: the only thing that
// integrates over time, so rewinding can never move or crush them.

import { CONFIG } from './config.js';

const P = CONFIG.physics;

export class Player {
  constructor(x, y) {
    this.w = P.width;
    this.h = P.height;
    this.place(x, y);
  }

  place(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.groundId = null;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.walk = 0;
    this.face = 1;
    this.landFlash = 0;
  }

  update(dt, input, solids) {
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);

    if (dir !== 0) {
      const acc = this.onGround ? P.accel : P.airAccel;
      this.vx += dir * acc * dt;
      this.vx = Math.max(-P.run, Math.min(P.run, this.vx));
      this.face = dir;
    } else if (this.onGround) {
      const f = P.friction * dt;
      this.vx = Math.abs(this.vx) <= f ? 0 : this.vx - Math.sign(this.vx) * f;
    }

    if (input.jumpPressed) this.jumpBuf = P.jumpBuffer;
    this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    this.coyote = this.onGround ? P.coyote : Math.max(0, this.coyote - dt);

    if (this.jumpBuf > 0 && this.coyote > 0) {
      this.vy = -P.jumpVelocity;
      this.onGround = false;
      this.coyote = 0;
      this.jumpBuf = 0;
    }

    // shorter arc while the jump is released early
    const g = this.vy < 0 && !input.jump ? P.gravity * P.jumpCutGravity : P.gravity;
    this.vy = Math.min(P.maxFall, this.vy + g * dt);

    const wasGround = this.onGround;
    const fallV = this.vy;

    this.x += this.vx * dt;
    this.collide(solids, 'x');

    this.y += this.vy * dt;
    this.onGround = false;
    this.groundId = null;
    this.collide(solids, 'y');

    if (!wasGround && this.onGround && fallV > P.landingVelocity) this.landFlash = 1;
    this.landFlash = Math.max(0, this.landFlash - dt * 4);

    this.walk += Math.abs(this.vx) * dt * 0.055;
    if (Math.abs(this.vx) < 8) this.walk = 0;
  }

  collide(solids, axis) {
    for (const s of solids) {
      if (this.x + this.w <= s.x || this.x >= s.x + s.w) continue;
      if (this.y + this.h <= s.y || this.y >= s.y + s.h) continue;

      if (axis === 'x') {
        if (this.vx > 0) this.x = s.x - this.w;
        else if (this.vx < 0) this.x = s.x + s.w;
        else this.x = (this.x + this.w / 2 < s.x + s.w / 2) ? s.x - this.w : s.x + s.w;
        this.vx = 0;
      } else {
        if (this.vy >= 0) {
          this.y = s.y - this.h;
          this.vy = 0;
          this.onGround = true;
          this.groundId = s.id;
        } else {
          this.y = s.y + s.h;
          this.vy = 0;
        }
      }
    }
  }

  // If a prop re-materialises inside the player, leave by the shallowest side.
  depenetrate(solids) {
    for (const s of solids) {
      if (this.x + this.w <= s.x || this.x >= s.x + s.w) continue;
      if (this.y + this.h <= s.y || this.y >= s.y + s.h) continue;
      const left = this.x + this.w - s.x;
      const right = s.x + s.w - this.x;
      const up = this.y + this.h - s.y;
      const down = s.y + s.h - this.y;
      const m = Math.min(left, right, up, down);
      if (m === up) { this.y = s.y - this.h; this.vy = Math.min(0, this.vy); }
      else if (m === down) { this.y = s.y + s.h; this.vy = Math.max(0, this.vy); }
      else if (m === left) { this.x = s.x - this.w; }
      else { this.x = s.x + s.w; }
    }
  }
}
