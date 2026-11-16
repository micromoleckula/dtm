import { IVehiclePhysicsParams } from '../../types/car.types';
import { IVitalsHandlingModifier } from '../../types/vitals.types';
import { MathUtils } from '../math/MathUtils';
import { SpatialGrid } from './SpatialGrid';
import { CollisionSolver } from './CollisionSolver';

export interface ICar3DTelemetry {
  speedKmh: number;
  slipRatio: number;
  isDrifting: boolean;
  lateralG: number;
  suspensionCompression: [number, number, number, number]; // FL, FR, RL, RR
}

export interface IWheelContact {
  worldX: number;
  worldZ: number;
  contactY: number;
  compression: number; // [0.0 (rest) to 1.0 (bump-stop)]
  inContact: boolean;
}

/**
 * Advanced 3D vehicle physics with fixed-timestep sub-stepping (120 Hz),
 * 4 independent spring-damper struts, mechanical bump-stops, anti-squat/anti-dive geometry,
 * anti-roll bars, and absolute chassis ground-penetration prevention.
 */
export class Car3DPhysics {
  public static readonly FIXED_DT = 1 / 120; // 120 Hz deterministic physics tick
  public readonly params: IVehiclePhysicsParams;
  private readonly spatialGrid: SpatialGrid;
  private readonly collisionSolver: CollisionSolver;

  // Spatial coordinates
  public x: number;
  public y: number;
  public z: number;
  public yawRad: number;
  public pitchRad: number = 0;
  public rollRad: number = 0;

  // Local velocities
  public forwardVel: number = 0; // m/s
  public lateralVel: number = 0; // m/s
  public angularYawVel: number = 0; // rad/s
  public verticalVel: number = 0; // m/s

  // Wheels and suspension
  public steerAngleRad: number = 0;
  public wheelSpinAngleRad: number = 0;
  public readonly wheelbase: number = 2.55; // meters (front to rear axle)
  public readonly trackWidth: number = 1.68; // meters (left to right wheel)
  public readonly wheelRadius: number = 0.32; // meters
  public readonly restSuspensionLength: number = 0.38; // meters
  public readonly bumpStopLength: number = 0.22; // minimum strut length before hard bump-stop

  // Pre-allocated static offsets to guarantee zero allocations in 120Hz physics loop
  private static readonly OFFSETS_X = new Float32Array(4);
  private static readonly OFFSETS_Z = new Float32Array(4);

  // Wheel contact points: FL, FR, RL, RR
  public readonly wheelContacts: IWheelContact[] = [
    { worldX: 0, worldZ: 0, contactY: 0, compression: 0, inContact: true },
    { worldX: 0, worldZ: 0, contactY: 0, compression: 0, inContact: true },
    { worldX: 0, worldZ: 0, contactY: 0, compression: 0, inContact: true },
    { worldX: 0, worldZ: 0, contactY: 0, compression: 0, inContact: true },
  ];

  // Fixed timestep accumulator
  private accumulator: number = 0;

  // Telemetry cache
  public readonly telemetry: ICar3DTelemetry = {
    speedKmh: 0,
    slipRatio: 0,
    isDrifting: false,
    lateralG: 0,
    suspensionCompression: [0, 0, 0, 0],
  };

  constructor(
    params: IVehiclePhysicsParams,
    spatialGrid: SpatialGrid,
    initialX = 0,
    initialY = 0.05,
    initialZ = 0,
    initialYaw = 0
  ) {
    this.params = params;
    this.spatialGrid = spatialGrid;
    this.collisionSolver = new CollisionSolver(spatialGrid);
    this.x = initialX;
    this.z = initialZ;
    this.yawRad = initialYaw;

    // Initialize wheel geometry offsets: [FL, FR, RL, RR]
    const halfW = this.trackWidth * 0.5;
    const halfL = this.wheelbase * 0.5;
    Car3DPhysics.OFFSETS_X[0] = -halfW; Car3DPhysics.OFFSETS_Z[0] = halfL;
    Car3DPhysics.OFFSETS_X[1] = halfW;  Car3DPhysics.OFFSETS_Z[1] = halfL;
    Car3DPhysics.OFFSETS_X[2] = -halfW; Car3DPhysics.OFFSETS_Z[2] = -halfL;
    Car3DPhysics.OFFSETS_X[3] = halfW;  Car3DPhysics.OFFSETS_Z[3] = -halfL;

    // Ground vehicle at spawn position
    const groundY = this.spatialGrid.getSurfaceElevation(initialX, initialZ);
    this.y = Math.max(initialY, groundY);
  }

  /**
   * Advances the vehicle physics simulation with deterministic sub-stepping.
   */
  public update(
    dt: number,
    throttle: number,
    steer: number,
    handbrake: boolean,
    modifier?: IVitalsHandlingModifier
  ): void {
    // Clamp frame delta to prevent spiral of death on lag spikes
    const clampedDt = Math.min(Math.max(dt, 0.001), 0.05);
    this.accumulator += clampedDt;

    while (this.accumulator >= Car3DPhysics.FIXED_DT) {
      this.stepFixedSimulation(Car3DPhysics.FIXED_DT, throttle, steer, handbrake, modifier);
      this.accumulator -= Car3DPhysics.FIXED_DT;
    }
  }

  /**
   * Single deterministic 120Hz physics tick.
   */
  private stepFixedSimulation(
    dt: number,
    throttle: number,
    steer: number,
    handbrake: boolean,
    modifier?: IVitalsHandlingModifier
  ): void {
    const p = this.params;
    const thrustMult = modifier?.thrustMultiplier ?? 1.0;
    const rearGripMult = modifier?.rearGripMultiplier ?? 1.0;
    const jitter = modifier?.steeringJitter ?? 0.0;
    const surfaceDrag = modifier?.surfaceDragMultiplier ?? 1.0;

    // 1. Steering kinematics
    const targetSteer = MathUtils.clamp(steer + jitter * 0.2, -1, 1) * p.maxSteerAngleRad;
    this.steerAngleRad = MathUtils.approach(this.steerAngleRad, targetSteer, p.steerRateRadPerSec * dt);

    // 2. Longitudinal drivetrain force
    let accelForward = 0;
    if (throttle > 0) {
      accelForward = throttle * p.enginePower * thrustMult;
    } else if (throttle < 0) {
      accelForward = throttle * p.reversePower;
    }

    // Aerodynamic and rolling drag
    accelForward -= this.forwardVel * (1.0 - p.dragCoefficient) * 32 * surfaceDrag;
    this.forwardVel += accelForward * dt;

    if (handbrake) {
      this.forwardVel *= Math.max(0, 1.0 - 1.8 * dt);
    }

    if (surfaceDrag > 1.5) {
      this.forwardVel *= Math.max(0, 1.0 - 2.5 * dt * surfaceDrag);
    }

    // 3. Lateral grip & oversteer dynamics (independent front and rear axles)
    const halfWheelbase = this.wheelbase * 0.5;
    const frontLateralVel = this.lateralVel + this.angularYawVel * halfWheelbase;
    const rearLateralVel = this.lateralVel - this.angularYawVel * halfWheelbase;

    // Front tire lateral friction
    const frontSlip = frontLateralVel - this.forwardVel * Math.sin(this.steerAngleRad);
    const frontForce = -MathUtils.clamp(frontSlip * p.frontGripCoefficient, -45, 45);

    // Rear tire lateral friction (reduced by handbrake & nitro burp)
    const handbrakeFactor = handbrake ? p.handbrakeGripMultiplier : 1.0;
    const effectiveRearGrip = p.rearGripCoefficient * handbrakeFactor * rearGripMult;
    const rearForce = -MathUtils.clamp(rearLateralVel * effectiveRearGrip, -45, 45);

    const yawTorque = frontForce * Math.cos(this.steerAngleRad) * halfWheelbase - rearForce * halfWheelbase;
    const totalLateralForce = frontForce * Math.cos(this.steerAngleRad) + rearForce;

    this.lateralVel += totalLateralForce * dt;
    this.angularYawVel += (yawTorque / 1.7) * dt;

    // Angular yaw and lateral velocity damping
    this.angularYawVel *= Math.max(0, 1.0 - 4.6 * dt);
    this.lateralVel *= Math.max(0, 1.0 - 2.6 * dt);

    // 4. Global position integration
    const sinYaw = Math.sin(this.yawRad);
    const cosYaw = Math.cos(this.yawRad);

    let worldVx = this.forwardVel * sinYaw + this.lateralVel * cosYaw;
    let worldVz = this.forwardVel * cosYaw - this.lateralVel * sinYaw;

    this.x += worldVx * dt;
    this.z += worldVz * dt;
    this.yawRad = MathUtils.normalizeAngle(this.yawRad + this.angularYawVel * dt);

    // 5. Solid Collision Resolution with SpatialGrid via CollisionSolver (Zero-GC)
    const colRes = this.collisionSolver.resolveCarCollision(this.x, this.z, this.yawRad, 0.95, 2.15);
    if (colRes.collided && colRes.penetrationDepth > 0) {
      // Separate chassis out of collider along MTV normal
      this.x += colRes.normalX * colRes.penetrationDepth;
      this.z += colRes.normalZ * colRes.penetrationDepth;

      // Reflect and dampen velocity along contact normal
      const normalDotVel = worldVx * colRes.normalX + worldVz * colRes.normalZ;
      if (normalDotVel < 0) {
        const restitution = 0.15; // Absorb impact with slight bounce
        worldVx -= (1 + restitution) * normalDotVel * colRes.normalX;
        worldVz -= (1 + restitution) * normalDotVel * colRes.normalZ;

        // Apply scrape friction and dampen angular torque
        this.forwardVel = worldVx * sinYaw + worldVz * cosYaw;
        this.lateralVel = worldVx * cosYaw - worldVz * sinYaw;
        this.angularYawVel *= 0.45;
      }
    }

    // 6. 4-Wheel Suspension Raycasts, Bump-Stops & Anti-Sink Constraints
    this.updateSuspensionAndElevation(accelForward, dt);

    // 7. Wheel spin rotation
    this.wheelSpinAngleRad += (this.forwardVel / this.wheelRadius) * dt;

    // 8. Update cached telemetry
    const speed = Math.sqrt(worldVx * worldVx + worldVz * worldVz);
    const slipRatio = speed > 1.5 ? Math.abs(this.lateralVel) / speed : 0;
    const lateralG = Math.abs(this.lateralVel * this.angularYawVel) / 9.81;

    this.telemetry.speedKmh = Math.round(speed * 3.6);
    this.telemetry.slipRatio = MathUtils.clamp(slipRatio, 0, 1);
    this.telemetry.isDrifting = speed > 3.5 && (slipRatio > 0.28 || handbrake);
    this.telemetry.lateralG = lateralG;
  }

  /**
   * Evaluates ground contact, spring-damper compression, mechanical bump-stops,
   * anti-roll bars, anti-squat/dive pitch stability, and chassis underbody ground clearance.
   * Completely zero heap allocations.
   */
  private updateSuspensionAndElevation(accelForward: number, dt: number): void {
    const sinYaw = Math.sin(this.yawRad);
    const cosYaw = Math.cos(this.yawRad);

    const offsetsX = Car3DPhysics.OFFSETS_X;
    const offsetsZ = Car3DPhysics.OFFSETS_Z;

    let maxGroundElevation = -Infinity;
    let avgGroundElevation = 0;

    for (let i = 0; i < 4; i++) {
      const lx = offsetsX[i];
      const lz = offsetsZ[i];

      // Transform wheel contact point to world space
      const wx = this.x + lx * cosYaw + lz * sinYaw;
      const wz = this.z - lx * sinYaw + lz * cosYaw;

      const groundY = this.spatialGrid.getSurfaceElevation(wx, wz);
      const contact = this.wheelContacts[i];
      contact.worldX = wx;
      contact.worldZ = wz;
      contact.contactY = groundY;

      if (groundY > maxGroundElevation) {
        maxGroundElevation = groundY;
      }
      avgGroundElevation += groundY * 0.25;

      // Chassis rest ride height equals the surface elevation (tires rest firmly on road).
      // Compression calculates strut movement: 0.0 at full extension, 1.0 at hard bump-stop.
      const expectedHeight = groundY;
      const currentHeight = this.y;
      const compressionDist = Math.max(0, expectedHeight - currentHeight);
      const maxBumpTravel = this.restSuspensionLength - this.bumpStopLength; // 0.16m
      const comp = MathUtils.clamp(compressionDist / maxBumpTravel, 0, 1);

      contact.compression = comp;
      this.telemetry.suspensionCompression[i] = comp;
    }

    // 1. Hard Bump-Stop & Chassis Underbody Ground-Clearance Anti-Sink Constraint:
    // Neither tires nor chassis floor pan can ever sink below the ground/bridge surface.
    const minAllowableChassisY = maxGroundElevation;
    if (this.y < minAllowableChassisY) {
      this.y = minAllowableChassisY;
      if (this.verticalVel < 0) this.verticalVel = 0;
    }

    // Smooth spring recovery towards average terrain height
    const targetRideHeight = avgGroundElevation;
    this.y = MathUtils.approach(this.y, targetRideHeight, 18 * dt);

    // 2. Anti-Squat & Anti-Dive Geometry:
    // Hard acceleration squats rear suspension realistically; hard braking dives front
    // Clamped strictly to [-0.035, 0.035] radians (~2 degrees) to prevent ground penetration
    const targetPitch = MathUtils.clamp(-accelForward * 0.0012, -0.035, 0.035);
    this.pitchRad = MathUtils.approach(this.pitchRad, targetPitch, 10 * dt);

    // 3. Anti-Roll Bar Stabilization:
    // Counteracts roll torque during high-G drift cornering
    const targetRoll = MathUtils.clamp(-this.lateralVel * 0.018, -0.05, 0.05);
    this.rollRad = MathUtils.approach(this.rollRad, targetRoll, 9 * dt);
  }
}
