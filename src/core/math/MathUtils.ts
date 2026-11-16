/**
 * Utility math functions for game simulation and physics.
 */
export class MathUtils {
  /**
   * Clamps a value between min and max inclusive.
   */
  public static clamp(val: number, min: number, max: number): number {
    return val < min ? min : val > max ? max : val;
  }

  /**
   * Linear interpolation between a and b by factor t [0.0, 1.0].
   */
  public static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * MathUtils.clamp(t, 0, 1);
  }

  /**
   * Moves a value toward a target by at most maxDelta per step.
   */
  public static approach(current: number, target: number, maxDelta: number): number {
    if (current < target) {
      return Math.min(current + maxDelta, target);
    }
    return Math.max(current - maxDelta, target);
  }

  /**
   * Normalizes an angle in radians to [-PI, PI].
   */
  public static normalizeAngle(angleRad: number): number {
    let a = angleRad % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    if (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  /**
   * Computes the shortest signed angular difference from angleA to angleB in radians.
   */
  public static angleDiff(angleA: number, angleB: number): number {
    return MathUtils.normalizeAngle(angleB - angleA);
  }

  /**
   * Converts degrees to radians.
   */
  public static degToRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  /**
   * Converts radians to degrees.
   */
  public static radToDeg(rad: number): number {
    return (rad * 180) / Math.PI;
  }
}
