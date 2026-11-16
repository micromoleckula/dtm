/**
 * Vehicle physical tuning and friction configuration.
 */
export interface IVehiclePhysicsParams {
  /** Maximum engine forward force in Newtons/pixels */
  readonly enginePower: number;
  /** Reverse gear force limit */
  readonly reversePower: number;
  /** Front axle lateral friction coefficient */
  readonly frontGripCoefficient: number;
  /** Rear axle lateral friction coefficient (base) */
  readonly rearGripCoefficient: number;
  /** Steering angle rate in radians per second */
  readonly steerRateRadPerSec: number;
  /** Max steering lock angle in radians */
  readonly maxSteerAngleRad: number;
  /** Linear aerodynamic and rolling drag [0.0, 1.0] */
  readonly dragCoefficient: number;
  /** Handbrake rear grip reduction multiplier (e.g. 0.2 for 80% loss) */
  readonly handbrakeGripMultiplier: number;
}

/**
 * Real-time vehicle physics telemetry.
 */
export interface IVehicleState {
  x: number;
  y: number;
  velocityForward: number;
  velocityLateral: number;
  headingRad: number;
  angularVelocityRadPerSec: number;
  handbrakeActive: boolean;
  throttle: number; // [-1.0, 1.0]
  steerInput: number; // [-1.0, 1.0]
}
