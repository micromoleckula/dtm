import { IVehiclePhysicsParams, IVehicleState } from '../../types/car.types';
import { IVitalsHandlingModifier } from '../../types/vitals.types';
import { Vec2 } from '../math/Vec2';
import { MathUtils } from '../math/MathUtils';

export interface ICarTelemetry {
  speed: number;
  slipRatio: number;
  isDrifting: boolean;
  frontSlip: number;
  rearSlip: number;
}

/**
 * High-performance framework-agnostic top-down vehicle physics simulation.
 * Zero-allocation during update steps.
 */
export class CarPhysicsModel {
  public readonly params: IVehiclePhysicsParams;
  public readonly state: IVehicleState;

  // Physical geometry
  public readonly wheelbase: number = 44; // Distance between front and rear axles in px
  public readonly mass: number = 1000; // Mass in kg
  public readonly momentOfInertia: number = 1800;

  // Internal steering angle state
  public steerAngleRad: number = 0;

  // Cached telemetry to prevent allocations
  public readonly telemetry: ICarTelemetry = {
    speed: 0,
    slipRatio: 0,
    isDrifting: false,
    frontSlip: 0,
    rearSlip: 0,
  };

  constructor(params: IVehiclePhysicsParams, initialX = 0, initialY = 0, initialHeading = 0) {
    this.params = params;
    this.state = {
      x: initialX,
      y: initialY,
      velocityForward: 0,
      velocityLateral: 0,
      headingRad: initialHeading,
      angularVelocityRadPerSec: 0,
      handbrakeActive: false,
      throttle: 0,
      steerInput: 0,
    };
  }

  /**
   * Advances the vehicle simulation by delta seconds.
   *
   * @param dt Delta time in seconds.
   * @param modifier Optional physiological / vitals modifiers.
   */
  public update(dt: number, modifier?: IVitalsHandlingModifier): void {
    if (dt <= 0 || dt > 0.1) dt = 0.016; // Safeguard against huge spiral-of-death steps

    const p = this.params;
    const s = this.state;

    const thrustMult = modifier?.thrustMultiplier ?? 1.0;
    const rearGripMult = modifier?.rearGripMultiplier ?? 1.0;
    const steeringJitter = modifier?.steeringJitter ?? 0.0;

    // 1. Steering calculation
    const targetSteerAngle = MathUtils.clamp(
      s.steerInput + steeringJitter * 0.25,
      -1,
      1
    ) * p.maxSteerAngleRad;

    this.steerAngleRad = MathUtils.approach(
      this.steerAngleRad,
      targetSteerAngle,
      p.steerRateRadPerSec * dt
    );

    // 2. Compute local forward and lateral forces
    const cosHeading = Math.cos(s.headingRad);
    const sinHeading = Math.sin(s.headingRad);

    // Longitudinal throttle & braking
    let longitudinalForce = 0;
    if (s.throttle > 0) {
      longitudinalForce = s.throttle * p.enginePower * thrustMult;
    } else if (s.throttle < 0) {
      longitudinalForce = s.throttle * p.reversePower;
    }

    // Rolling drag & air resistance
    const dragForce = -s.velocityForward * (1.0 - p.dragCoefficient) * 250;
    longitudinalForce += dragForce;

    // Axle positions relative to center of mass
    const halfWheelbase = this.wheelbase * 0.5;

    // Lateral velocities at the front and rear axles
    const frontLateralVel = s.velocityLateral + s.angularVelocityRadPerSec * halfWheelbase;
    const rearLateralVel = s.velocityLateral - s.angularVelocityRadPerSec * halfWheelbase;

    // Front tire lateral force (influenced by steering angle)
    const frontSlipVel = frontLateralVel - (s.velocityForward * Math.sin(this.steerAngleRad));
    const frontGrip = p.frontGripCoefficient;
    const frontLateralForce = -MathUtils.clamp(frontSlipVel * frontGrip, -1200, 1200);

    // Rear tire lateral force (influenced by handbrake and nitro modifiers)
    const handbrakeFactor = s.handbrakeActive ? p.handbrakeGripMultiplier : 1.0;
    const effectiveRearGrip = p.rearGripCoefficient * handbrakeFactor * rearGripMult;
    const rearLateralForce = -MathUtils.clamp(rearLateralVel * effectiveRearGrip, -1200, 1200);

    // Total forces in local car space
    const totalLocalForwardForce = longitudinalForce + (frontLateralForce * Math.sin(this.steerAngleRad));
    const totalLocalLateralForce = (frontLateralForce * Math.cos(this.steerAngleRad)) + rearLateralForce;

    // Angular torque around center of mass
    const frontTorque = (frontLateralForce * Math.cos(this.steerAngleRad)) * halfWheelbase;
    const rearTorque = -rearLateralForce * halfWheelbase;
    let totalTorque = frontTorque + rearTorque;

    // Additional angular jitter from digestion tremor
    if (Math.abs(steeringJitter) > 0.01) {
      totalTorque += steeringJitter * 400;
    }

    // 3. Integrate velocities
    const forwardAccel = totalLocalForwardForce / (this.mass * 0.05);
    const lateralAccel = totalLocalLateralForce / (this.mass * 0.05);
    const angularAccel = totalTorque / (this.momentOfInertia * 0.05);

    s.velocityForward += forwardAccel * dt;
    s.velocityLateral += lateralAccel * dt;
    s.angularVelocityRadPerSec += angularAccel * dt;

    // Handbrake drag on forward movement
    if (s.handbrakeActive) {
      s.velocityForward *= Math.max(0, 1 - 1.2 * dt);
    }

    // Natural angular damping
    s.angularVelocityRadPerSec *= Math.max(0, 1 - 3.2 * dt);

    // Transform local velocities to global world velocities
    const worldVx = (s.velocityForward * cosHeading) - (s.velocityLateral * sinHeading);
    const worldVy = (s.velocityForward * sinHeading) + (s.velocityLateral * cosHeading);

    // 4. Integrate world position and orientation
    s.x += worldVx * dt;
    s.y += worldVy * dt;
    s.headingRad = MathUtils.normalizeAngle(s.headingRad + s.angularVelocityRadPerSec * dt);

    // 5. Update cached telemetry
    const speed = Math.sqrt(worldVx * worldVx + worldVy * worldVy);
    const slipRatio = speed > 20 ? Math.abs(s.velocityLateral) / speed : 0;

    this.telemetry.speed = speed;
    this.telemetry.slipRatio = MathUtils.clamp(slipRatio, 0, 1);
    this.telemetry.isDrifting = speed > 50 && (slipRatio > 0.28 || s.handbrakeActive);
    this.telemetry.frontSlip = Math.abs(frontSlipVel);
    this.telemetry.rearSlip = Math.abs(rearLateralVel);
  }

  /**
   * Resets vehicle state to a given position and heading.
   */
  public reset(x: number, y: number, headingRad = 0): void {
    const s = this.state;
    s.x = x;
    s.y = y;
    s.headingRad = headingRad;
    s.velocityForward = 0;
    s.velocityLateral = 0;
    s.angularVelocityRadPerSec = 0;
    s.handbrakeActive = false;
    s.throttle = 0;
    s.steerInput = 0;
    this.steerAngleRad = 0;
  }
}
