import { IVehiclePhysicsParams } from '../types/car.types';

/**
 * 3D Physics tuning for the player's drift car in SI units (meters, radians, seconds).
 */
export const DEFAULT_CAR_PHYSICS: IVehiclePhysicsParams = {
  enginePower: 38.0, // m/s^2 forward thrust
  reversePower: 16.0, // m/s^2 reverse thrust
  frontGripCoefficient: 8.5, // Front axle lateral grip
  rearGripCoefficient: 6.8, // Rear axle lateral grip (base)
  steerRateRadPerSec: 5.0, // Steering speed
  maxSteerAngleRad: 0.62, // ~35 degrees max steering lock
  dragCoefficient: 0.985, // Air drag retention
  handbrakeGripMultiplier: 0.12, // 88% rear grip reduction during handbrake
};

/**
 * 3D World physics constants.
 */
export const WORLD_PHYSICS = {
  gravity: -9.81,
  groundFriction: 0.94,
  minSpeedForDrift: 4.0, // m/s (~14 km/h)
  slipThresholdForSkid: 0.3,
} as const;
