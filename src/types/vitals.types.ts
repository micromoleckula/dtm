/**
 * Life-sim player vitals and comedic physiological states.
 */
export interface IVitalsState {
  /** Digestion fullness level in percent [0.0, 100.0] */
  digestionLevel: number;
  /** Respect score among locals / bench peers [0.0, 100.0] */
  respect: number;
  /** Whether the nitro burp impulse effect is currently active */
  nitroBurpActive: boolean;
  /** Duration remaining for the active nitro burp in seconds */
  nitroBurpTimerSec: number;
}

/**
 * Modifiers produced by player vitals on vehicle handling.
 */
export interface IVitalsHandlingModifier {
  /** Normalized angular noise/jitter added to steering [-1.0, 1.0] */
  steeringJitter: number;
  /** Multiplier for forward engine thrust (e.g. 1.4 for +40%) */
  thrustMultiplier: number;
  /** Multiplier for rear tire lateral grip (e.g. 0.4 for -60%) */
  rearGripMultiplier: number;
  /** Multiplier for rolling drag from terrain/ditches (default 1.0) */
  surfaceDragMultiplier?: number;
}
