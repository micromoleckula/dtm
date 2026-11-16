/**
 * 3D Character movement, interaction, and balance tuning in SI units (meters, seconds).
 */
export const CHARACTER_BALANCE = {
  walkSpeed: 4.8, // m/s (~17 km/h)
  sprintSpeed: 8.0, // m/s (~29 km/h)
  acceleration: 24.0, // m/s^2
  friction: 0.85,
  jumpForce: 5.5, // m/s vertical impulse
  gravity: 18.0, // m/s^2
  reachDistance: 2.8, // meters raycast interaction reach
  handsHoldOffsetDistance: 0.6, // meters in front of player
  viewmodelBobSpeed: 10.0,
  viewmodelBobAmount: 0.025,
  throwForce: 6.0, // m/s forward throw velocity
} as const;

/**
 * Vitals tick and depletion rates.
 */
export const VITALS_BALANCE = {
  digestionTickRateSec: 1.0,
  digestionIncreasePerFood: 25,
  tremorThreshold: 80,
  nitroBurpDurationSec: 2.5,
  nitroBurpThrustBonus: 1.4, // +40% forward force
  nitroBurpGripPenalty: 0.4, // -60% rear grip
} as const;
