import { IHoldableItem, IHandsState } from '../../types/inventory.types';
import { CHARACTER_BALANCE } from '../../config/balance';
import { MathUtils } from '../math/MathUtils';

/**
 * Framework-agnostic character model handling movement physics,
 * facing orientation, and the hands/inventory interaction layer.
 */
export class CharacterModel {
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  public facingRad: number = 0;
  public isSprinting: boolean = false;
  public inVehicle: boolean = false;

  public readonly hands: IHandsState;

  constructor(initialX = 0, initialY = 0) {
    this.x = initialX;
    this.y = initialY;
    this.hands = {
      activeItem: null,
      reachDistance: CHARACTER_BALANCE.reachDistance,
    };
  }

  /**
   * Advances movement simulation and applies friction.
   *
   * @param inputX Normalized horizontal input [-1.0, 1.0].
   * @param inputY Normalized vertical input [-1.0, 1.0].
   * @param dt Delta time in seconds.
   */
  public updateMovement(inputX: number, inputY: number, dt: number): void {
    if (this.inVehicle) return;

    const maxSpeed = this.isSprinting ? CHARACTER_BALANCE.sprintSpeed : CHARACTER_BALANCE.walkSpeed;
    const accel = CHARACTER_BALANCE.acceleration;

    // Normalize diagonal input to prevent faster diagonal movement
    let len = Math.sqrt(inputX * inputX + inputY * inputY);
    let normX = 0;
    let normY = 0;
    if (len > 0.001) {
      normX = inputX / len;
      normY = inputY / len;
    }

    if (len > 0.001) {
      this.vx += normX * accel * dt;
      this.vy += normY * accel * dt;

      // Limit speed
      const curSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (curSpeed > maxSpeed) {
        this.vx = (this.vx / curSpeed) * maxSpeed;
        this.vy = (this.vy / curSpeed) * maxSpeed;
      }
    } else {
      // Natural deceleration / friction
      const friction = Math.pow(CHARACTER_BALANCE.friction, dt * 60);
      this.vx *= friction;
      this.vy *= friction;
      if (Math.abs(this.vx) < 1) this.vx = 0;
      if (Math.abs(this.vy) < 1) this.vy = 0;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  /**
   * Rotates character to face target world coordinates.
   *
   * @param targetWorldX World X coordinate.
   * @param targetWorldY World Y coordinate.
   */
  public aimTowards(targetWorldX: number, targetWorldY: number): void {
    const dx = targetWorldX - this.x;
    const dy = targetWorldY - this.y;
    if (dx * dx + dy * dy > 4) {
      this.facingRad = Math.atan2(dy, dx);
    }
  }

  /**
   * Checks whether target coordinates fall within character reach.
   */
  public canReach(targetX: number, targetY: number): boolean {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const reachSq = this.hands.reachDistance * this.hands.reachDistance;
    return (dx * dx + dy * dy) <= reachSq;
  }

  /**
   * Picks up an item into hands. If hands already hold an item, swaps and returns the previous item.
   *
   * @param newItem Item to hold.
   * @returns Previous item that was in hands, or null.
   */
  public pickUp(newItem: IHoldableItem): IHoldableItem | null {
    const previous = this.hands.activeItem;
    this.hands.activeItem = newItem;
    return previous;
  }

  /**
   * Drops whatever item is currently held in hands.
   *
   * @returns Dropped item, or null if hands were empty.
   */
  public drop(): IHoldableItem | null {
    const dropped = this.hands.activeItem;
    this.hands.activeItem = null;
    return dropped;
  }

  /**
   * Calculates world coordinates where the held item is positioned in front of character.
   */
  public getHeldItemWorldPosition(out: { x: number; y: number }): void {
    const dist = CHARACTER_BALANCE.handsHoldOffsetDistance;
    out.x = this.x + Math.cos(this.facingRad) * dist;
    out.y = this.y + Math.sin(this.facingRad) * dist;
  }
}
