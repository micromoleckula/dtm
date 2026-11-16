import * as BABYLON from '@babylonjs/core';
import { Car3DPhysics } from '../../core/physics/Car3DPhysics';
import { DEFAULT_CAR_PHYSICS } from '../../config/physics';
import { MeshBuilder3D } from '../../systems/graphics/MeshBuilder3D';
import { IVitalsHandlingModifier } from '../../types/vitals.types';
import { SpatialGrid } from '../../core/physics/SpatialGrid';

/**
 * 3D Vehicle entity in Babylon.js.
 * Controls visual hierarchy, wheel steering/rotation, tire smoke particles, and headlights.
 */
export class Car3DEntity {
  public readonly scene: BABYLON.Scene;
  public readonly physics: Car3DPhysics;

  public readonly root: BABYLON.TransformNode;
  public readonly chassis: BABYLON.Mesh;
  public readonly wheelFL: BABYLON.Mesh;
  public readonly wheelFR: BABYLON.Mesh;
  public readonly wheelRL: BABYLON.Mesh;
  public readonly wheelRR: BABYLON.Mesh;
  public readonly steeringWheel: BABYLON.Mesh;

  public isOccupied: boolean = false;
  private smokeEmitter: BABYLON.ParticleSystem | null = null;
  private headlightL: BABYLON.SpotLight;
  private headlightR: BABYLON.SpotLight;

  // Pre-allocated scratch for zero-GC per-frame reach checks
  private readonly scratchDoorWorld = new BABYLON.Vector3();
  private readonly scratchLocalDoor = new BABYLON.Vector3(-1.2, 0.6, 0.1);

  constructor(scene: BABYLON.Scene, spatialGrid: SpatialGrid, x = 0, y = 0.35, z = 0, yaw = 0) {
    this.scene = scene;
    this.physics = new Car3DPhysics(DEFAULT_CAR_PHYSICS, spatialGrid, x, y, z, yaw);

    // 1. Build procedural 3D rig
    const rig = MeshBuilder3D.createCarRig(scene);
    this.root = rig.root;
    this.chassis = rig.chassis;
    this.wheelFL = rig.wheelFL;
    this.wheelFR = rig.wheelFR;
    this.wheelRL = rig.wheelRL;
    this.wheelRR = rig.wheelRR;
    this.steeringWheel = rig.steeringWheel;

    this.root.position.set(x, y, z);
    this.root.rotation.y = yaw;

    // 2. 3D Headlights
    this.headlightL = new BABYLON.SpotLight(
      'car_hl_l',
      new BABYLON.Vector3(-0.65, 0.55, 2.15),
      new BABYLON.Vector3(0, -0.15, 1),
      Math.PI / 3,
      12,
      scene
    );
    this.headlightL.parent = this.root;
    this.headlightL.intensity = 1.2;
    this.headlightL.diffuse = new BABYLON.Color3(1.0, 0.98, 0.88);

    this.headlightR = new BABYLON.SpotLight(
      'car_hl_r',
      new BABYLON.Vector3(0.65, 0.55, 2.15),
      new BABYLON.Vector3(0, -0.15, 1),
      Math.PI / 3,
      12,
      scene
    );
    this.headlightR.parent = this.root;
    this.headlightR.intensity = 1.2;
    this.headlightR.diffuse = new BABYLON.Color3(1.0, 0.98, 0.88);

    // 3. Smoke Particle System
    this.initTireSmoke();
  }

  private initTireSmoke(): void {
    const smoke = new BABYLON.ParticleSystem('tire_smoke', 300, this.scene);
    smoke.particleTexture = new BABYLON.Texture(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      this.scene
    );
    smoke.emitter = this.chassis;
    smoke.minEmitBox = new BABYLON.Vector3(-0.9, 0.1, -1.4);
    smoke.maxEmitBox = new BABYLON.Vector3(0.9, 0.2, -1.2);
    smoke.color1 = new BABYLON.Color4(0.85, 0.85, 0.88, 0.4);
    smoke.color2 = new BABYLON.Color4(0.65, 0.65, 0.7, 0.2);
    smoke.colorDead = new BABYLON.Color4(0.4, 0.4, 0.45, 0.0);
    smoke.minSize = 0.25;
    smoke.maxSize = 0.85;
    smoke.minLifeTime = 0.3;
    smoke.maxLifeTime = 0.8;
    smoke.emitRate = 0;
    smoke.direction1 = new BABYLON.Vector3(-0.2, 0.8, -0.5);
    smoke.direction2 = new BABYLON.Vector3(0.2, 1.2, -1.0);
    smoke.gravity = new BABYLON.Vector3(0, 0.5, 0);
    smoke.start();
    this.smokeEmitter = smoke;
  }

  /**
   * Advances vehicle simulation and synchronizes 3D mesh hierarchies.
   */
  public update(
    dt: number,
    throttle: number,
    steer: number,
    handbrake: boolean,
    modifier?: IVitalsHandlingModifier
  ): void {
    const actThrottle = this.isOccupied ? throttle : 0;
    const actSteer = this.isOccupied ? steer : 0;
    const actHandbrake = this.isOccupied ? handbrake : true;

    this.physics.update(dt, actThrottle, actSteer, actHandbrake, modifier);

    // Sync root position & orientation
    this.root.position.x = this.physics.x;
    this.root.position.y = this.physics.y;
    this.root.position.z = this.physics.z;
    this.root.rotation.y = this.physics.yawRad;
    this.root.rotation.x = this.physics.pitchRad;
    this.root.rotation.z = this.physics.rollRad;

    // Steer & rotate front wheels
    this.wheelFL.rotation.y = this.physics.steerAngleRad;
    this.wheelFL.rotation.x = this.physics.wheelSpinAngleRad;
    this.wheelFL.position.y = 0.32 - this.physics.telemetry.suspensionCompression[0] * 0.12;

    this.wheelFR.rotation.y = this.physics.steerAngleRad;
    this.wheelFR.rotation.x = this.physics.wheelSpinAngleRad;
    this.wheelFR.position.y = 0.32 - this.physics.telemetry.suspensionCompression[1] * 0.12;

    // Rotate rear wheels with suspension compression
    this.wheelRL.rotation.x = this.physics.wheelSpinAngleRad;
    this.wheelRL.position.y = 0.32 - this.physics.telemetry.suspensionCompression[2] * 0.12;

    this.wheelRR.rotation.x = this.physics.wheelSpinAngleRad;
    this.wheelRR.position.y = 0.32 - this.physics.telemetry.suspensionCompression[3] * 0.12;

    // Cockpit interior: Rotate 3-spoke sports steering wheel with front steering
    this.steeringWheel.rotation.z = -this.physics.steerAngleRad * 2.2;

    // Tire smoke emission
    if (this.smokeEmitter) {
      if (this.physics.telemetry.isDrifting) {
        this.smokeEmitter.emitRate = 120;
      } else {
        this.smokeEmitter.emitRate = 0;
      }
    }
  }

  /**
   * Gets driver seat 3D world position.
   */
  public getDriverSeatWorldPosition(out: BABYLON.Vector3): void {
    const local = new BABYLON.Vector3(-0.4, 0.85, 0.1);
    BABYLON.Vector3.TransformCoordinatesToRef(local, this.root.getWorldMatrix(), out);
  }

  /**
   * Gets third-person chase camera target point behind and above the car.
   */
  public getChaseCameraPosition(out: BABYLON.Vector3): void {
    const local = new BABYLON.Vector3(0, 2.2, -5.5);
    BABYLON.Vector3.TransformCoordinatesToRef(local, this.root.getWorldMatrix(), out);
  }

  /**
   * Checks if a point is within driver door reach to enter.
   */
  public isNearDriverDoor(point: BABYLON.Vector3): boolean {
    BABYLON.Vector3.TransformCoordinatesToRef(this.scratchLocalDoor, this.root.getWorldMatrix(), this.scratchDoorWorld);
    return BABYLON.Vector3.DistanceSquared(point, this.scratchDoorWorld) < 3.2; // ~1.8m
  }
}
