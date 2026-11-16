/**
 * High-performance 2D vector for zero-allocation game loops.
 */
export class Vec2 {
  public x: number;
  public y: number;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  public set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  public copy(other: { x: number; y: number }): this {
    this.x = other.x;
    this.y = other.y;
    return this;
  }

  public add(other: { x: number; y: number }): this {
    this.x += other.x;
    this.y += other.y;
    return this;
  }

  public addScaled(other: { x: number; y: number }, scale: number): this {
    this.x += other.x * scale;
    this.y += other.y * scale;
    return this;
  }

  public sub(other: { x: number; y: number }): this {
    this.x -= other.x;
    this.y -= other.y;
    return this;
  }

  public scale(s: number): this {
    this.x *= s;
    this.y *= s;
    return this;
  }

  public dot(other: { x: number; y: number }): number {
    return this.x * other.x + this.y * other.y;
  }

  public cross(other: { x: number; y: number }): number {
    return this.x * other.y - this.y * other.x;
  }

  public lengthSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  public length(): number {
    return Math.sqrt(this.lengthSq());
  }

  public normalize(): this {
    const len = this.length();
    if (len > 0.00001) {
      this.x /= len;
      this.y /= len;
    } else {
      this.x = 0;
      this.y = 0;
    }
    return this;
  }

  public rotate(angleRad: number): this {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const rx = this.x * cos - this.y * sin;
    const ry = this.x * sin + this.y * cos;
    this.x = rx;
    this.y = ry;
    return this;
  }

  public clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }

  // Pre-allocated static scratch vectors for zero-allocation math operations
  public static readonly scratchA: Vec2 = new Vec2();
  public static readonly scratchB: Vec2 = new Vec2();
  public static readonly scratchC: Vec2 = new Vec2();
  public static readonly scratchD: Vec2 = new Vec2();
}
