import * as BABYLON from '@babylonjs/core';
import { IHoldableItem, IHandsState } from '../../types/inventory.types';
import { CHARACTER_BALANCE } from '../../config/balance';
import { MeshBuilder3D } from '../../systems/graphics/MeshBuilder3D';
import { WorldItem3D } from '../garage/WorldItem3D';
import { CollisionSolver } from '../../core/physics/CollisionSolver';
import { SpatialGrid } from '../../core/physics/SpatialGrid';

export interface IRaycastInteraction {
  type: 'none' | 'item' | 'car_door';
  targetItem?: WorldItem3D;
  promptText: string;
}

/**
 * 3D First-Person Character with mouse-look, physical walking, and 3D hands viewmodel.
 */
export class FPSCharacter {
  public readonly scene: BABYLON.Scene;
  public readonly camera: BABYLON.UniversalCamera;
  private readonly collisionSolver: CollisionSolver;

  // 3D Hands Viewmodel
  private readonly viewmodelAnchor: BABYLON.TransformNode;
  private currentHeldMesh: BABYLON.Mesh | null = null;
  public readonly hands: IHandsState;

  // Movement physics
  private velX = 0;
  private velZ = 0;
  private velY = 0;
  private isGrounded = true;
  private walkBobTimer = 0;
  private toolSwingTimer = 0;

  // Pre-allocated scratch vectors for zero-GC hot loops
  private readonly scratchForward = new BABYLON.Vector3();
  private readonly scratchRight = new BABYLON.Vector3();
  private readonly scratchToItem = new BABYLON.Vector3();

  public inVehicle: boolean = false;

  constructor(
    scene: BABYLON.Scene,
    canvas: HTMLCanvasElement,
    spatialGrid: SpatialGrid,
    startX = 0,
    startY = 1.75,
    startZ = 0
  ) {
    this.scene = scene;
    this.collisionSolver = new CollisionSolver(spatialGrid);

    // 1. First-Person Camera
    this.camera = new BABYLON.UniversalCamera('fps_camera', new BABYLON.Vector3(startX, startY, startZ), scene);
    this.camera.setTarget(new BABYLON.Vector3(startX, startY, startZ + 10));
    this.camera.attachControl(canvas, true);
    this.camera.inputs.clear(); // Use custom input handling for zero-jitter control

    // 2. Viewmodel Anchor (attached to camera)
    this.viewmodelAnchor = new BABYLON.TransformNode('viewmodel_anchor', scene);
    this.viewmodelAnchor.parent = this.camera;
    this.viewmodelAnchor.position.set(0.28, -0.24, 0.58);
    this.viewmodelAnchor.rotation.set(0.1, -0.15, 0.05);

    // 3. Hands State
    this.hands = {
      activeItem: null,
      reachDistance: CHARACTER_BALANCE.reachDistance,
    };
  }

  /**
   * Advances FPS character walking, jumping, viewmodel bobbing, and hands animation.
   */
  public update(
    dt: number,
    input: {
      moveX: number;
      moveY: number;
      sprint: boolean;
      jump: boolean;
      actionClick: boolean;
    }
  ): void {
    if (this.inVehicle) return;

    // 1. Horizontal movement
    const maxSpeed = input.sprint ? CHARACTER_BALANCE.sprintSpeed : CHARACTER_BALANCE.walkSpeed;
    this.camera.getDirectionToRef(BABYLON.Axis.Z, this.scratchForward);
    const forward = this.scratchForward;
    forward.y = 0;
    forward.normalize();

    this.scratchRight.set(forward.z, 0, -forward.x);
    const right = this.scratchRight;

    let moveX = input.moveX;
    let moveZ = -input.moveY;
    const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (len > 0.001) {
      moveX /= len;
      moveZ /= len;
    }

    const targetVx = (forward.x * moveZ + right.x * moveX) * maxSpeed;
    const targetVz = (forward.z * moveZ + right.z * moveX) * maxSpeed;

    // Smooth movement interpolation
    this.velX = BABYLON.Scalar.Lerp(this.velX, targetVx, 12 * dt);
    this.velZ = BABYLON.Scalar.Lerp(this.velZ, targetVz, 12 * dt);

    // 2. Vertical Jump & Gravity
    if (this.isGrounded && input.jump) {
      this.velY = CHARACTER_BALANCE.jumpForce;
      this.isGrounded = false;
    }

    this.velY -= CHARACTER_BALANCE.gravity * dt;

    // Apply horizontal and vertical movement
    this.camera.position.x += this.velX * dt;
    this.camera.position.z += this.velZ * dt;
    this.camera.position.y += this.velY * dt;

    // Resolve physical cylinder collision, step-up and wall-sliding
    const colRes = this.collisionSolver.resolveCharacterCollision(
      this.camera.position.x,
      this.camera.position.y,
      this.camera.position.z,
      0.35
    );
    this.camera.position.x = colRes.x;
    this.camera.position.z = colRes.z;

    if (colRes.collided) {
      // Wall-sliding: cancel velocity component into the wall normal
      const normalDotVel = this.velX * colRes.wallNormalX + this.velZ * colRes.wallNormalZ;
      if (normalDotVel < 0) {
        this.velX -= normalDotVel * colRes.wallNormalX;
        this.velZ -= normalDotVel * colRes.wallNormalZ;
      }
    }

    // Ground elevation coupling (camera eye height at 1.75m above ground/slab/veranda)
    const targetFloorY = colRes.groundY + 1.75;
    if (this.camera.position.y <= targetFloorY) {
      this.camera.position.y = targetFloorY;
      this.velY = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // 3. Viewmodel Walking Bob & Sway
    const horizontalSpeed = Math.sqrt(this.velX * this.velX + this.velZ * this.velZ);
    if (horizontalSpeed > 0.5 && this.isGrounded) {
      this.walkBobTimer += dt * CHARACTER_BALANCE.viewmodelBobSpeed;
      const bobX = Math.cos(this.walkBobTimer * 0.5) * CHARACTER_BALANCE.viewmodelBobAmount * 0.5;
      const bobY = Math.sin(this.walkBobTimer) * CHARACTER_BALANCE.viewmodelBobAmount;
      this.viewmodelAnchor.position.set(0.28 + bobX, -0.24 + bobY, 0.58);
    } else {
      this.viewmodelAnchor.position.set(0.28, -0.24, 0.58);
    }

    // 4. Action / Wrench swing animation
    if (input.actionClick && this.toolSwingTimer <= 0) {
      this.toolSwingTimer = 0.28; // Swing duration
    }

    if (this.toolSwingTimer > 0) {
      this.toolSwingTimer -= dt;
      const swingProgress = 1.0 - this.toolSwingTimer / 0.28;
      const swingAngle = Math.sin(swingProgress * Math.PI) * 0.55;
      this.viewmodelAnchor.rotation.x = 0.1 + swingAngle;
      this.viewmodelAnchor.rotation.z = 0.05 - swingAngle * 0.8;
    } else {
      this.viewmodelAnchor.rotation.set(0.1, -0.15, 0.05);
    }
  }

  /**
   * Performs forward raycast to detect pickable items or interactive car zones.
   */
  public getInteractionTarget(groundItems: WorldItem3D[], isNearCarDoor: boolean): IRaycastInteraction {
    if (this.inVehicle) {
      return { type: 'none', promptText: '' };
    }

    // Priority 1: Check driver door
    if (isNearCarDoor) {
      return { type: 'car_door', promptText: '[F] Drive Car' };
    }

    // Priority 2: Raycast towards ground items (zero-GC)
    this.camera.getDirectionToRef(BABYLON.Axis.Z, this.scratchForward);
    const rayDir = this.scratchForward;
    let closestItem: WorldItem3D | null = null;
    let closestDist = Infinity;

    for (let i = 0; i < groundItems.length; i++) {
      const item = groundItems[i];
      const dist = BABYLON.Vector3.Distance(this.camera.position, item.mesh.position);
      if (dist <= this.hands.reachDistance) {
        // Simple forward cone / proximity test
        this.scratchToItem.x = item.mesh.position.x - this.camera.position.x;
        this.scratchToItem.y = item.mesh.position.y - this.camera.position.y;
        this.scratchToItem.z = item.mesh.position.z - this.camera.position.z;
        this.scratchToItem.normalize();
        const dot = BABYLON.Vector3.Dot(rayDir, this.scratchToItem);
        if (dot > 0.88 && dist < closestDist) {
          closestDist = dist;
          closestItem = item;
        }
      }
      item.setHighlighted(false);
    }

    if (closestItem) {
      closestItem.setHighlighted(true);
      return {
        type: 'item',
        targetItem: closestItem,
        promptText: `[E] Pick up ${closestItem.itemData.name}`,
      };
    }

    return { type: 'none', promptText: '' };
  }

  /**
   * Equips an item into 3D viewmodel hands.
   */
  public equipItem(item: IHoldableItem): IHoldableItem | null {
    const prev = this.hands.activeItem;
    this.hands.activeItem = item;

    // Dispose old viewmodel mesh
    if (this.currentHeldMesh) {
      this.currentHeldMesh.dispose(false, true);
      this.currentHeldMesh = null;
    }

    // Spawn 3D viewmodel mesh parented to viewmodelAnchor
    this.currentHeldMesh = MeshBuilder3D.createItemMesh(this.scene, item.meshType, 'viewmodel_item');
    this.currentHeldMesh.parent = this.viewmodelAnchor;
    this.currentHeldMesh.position.set(0, 0, 0);
    this.currentHeldMesh.scaling.set(0.85, 0.85, 0.85);

    return prev;
  }

  /**
   * Drops currently held item from hands into the 3D world.
   */
  public dropItem(): IHoldableItem | null {
    const dropped = this.hands.activeItem;
    this.hands.activeItem = null;

    if (this.currentHeldMesh) {
      this.currentHeldMesh.dispose(false, true);
      this.currentHeldMesh = null;
    }

    return dropped;
  }

  /**
   * Calculates world coordinates in front of player where dropped item should appear.
   */
  public getDropWorldPosition(out: BABYLON.Vector3): void {
    this.camera.getDirectionToRef(BABYLON.Axis.Z, this.scratchForward);
    out.copyFrom(this.camera.position);
    out.x += this.scratchForward.x * 1.2;
    out.y += this.scratchForward.y * 1.2;
    out.z += this.scratchForward.z * 1.2;
    out.y = Math.max(0.2, out.y - 0.4);
  }
}
