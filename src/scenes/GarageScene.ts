import * as BABYLON from '@babylonjs/core';
import { EventBus } from '../systems/events/EventBus';
import { InputManager } from '../systems/input/InputManager';
import { Car3DEntity } from '../entities/car/Car3DEntity';
import { FPSCharacter } from '../entities/character/FPSCharacter';
import { WorldItem3D } from '../entities/garage/WorldItem3D';
import { INITIAL_GARAGE_ITEMS_3D } from '../config/car-parts';
import { WORLD_LAYOUT } from '../config/world-layout';
import { HUDOverlay } from '../ui/HUDOverlay';
import { SpatialGrid } from '../core/physics/SpatialGrid';
import { SaveManager } from '../core/state/SaveManager';
import { IGameState } from '../core/state/GameState';
import { IVitalsHandlingModifier } from '../types/vitals.types';
import { TerrainAndRoads } from '../entities/world/TerrainAndRoads';
import { Bridges } from '../entities/world/Bridges';
import { PrefectureBuildings } from '../entities/world/PrefectureBuildings';
import { TownProps } from '../entities/world/TownProps';

/**
 * Japanese Coastal Prefecture Scene in Babylon.js.
 * Integrates Terrain, Roads, Bridges, Homestead, Town, Props, and 3D Driving (<250 lines).
 */
export class GarageScene {
  public readonly scene: BABYLON.Scene;
  private readonly inputManager: InputManager;
  private readonly eventBus: EventBus;
  private readonly hud: HUDOverlay;
  public readonly spatialGrid: SpatialGrid;
  public readonly saveManager: SaveManager;

  // World Subsystems
  private terrainAndRoads!: TerrainAndRoads;
  private bridges!: Bridges;
  private buildings!: PrefectureBuildings;
  private townProps!: TownProps;

  // Actors
  private car!: Car3DEntity;
  private player!: FPSCharacter;
  private chaseCamera!: BABYLON.FollowCamera;
  private groundItems: WorldItem3D[] = [];
  private isDriving: boolean = false;
  private notificationMessage: string = '';
  private notificationTimer: number = 0;

  // Reusable zero-allocation modifier and transform scratch structures
  private readonly vehicleModifier: IVitalsHandlingModifier = {
    steeringJitter: 0,
    thrustMultiplier: 1.0,
    rearGripMultiplier: 1.0,
    surfaceDragMultiplier: 1.0,
  };
  private readonly scratchDropPos = new BABYLON.Vector3();
  private readonly scratchExitPos = new BABYLON.Vector3();
  private readonly scratchLocalDoor = new BABYLON.Vector3(-1.6, 1.75, 0.1);

  constructor(engine: BABYLON.Engine, canvas: HTMLCanvasElement) {
    this.scene = new BABYLON.Scene(engine);
    this.eventBus = new EventBus();
    this.spatialGrid = new SpatialGrid();
    this.saveManager = new SaveManager();

    // 1. Atmosphere & Nostalgic Afternoon Lighting
    this.initAtmosphere();

    // 2. Input Manager with PointerLock mouse-look
    this.inputManager = new InputManager(canvas, (dx, dy) => {
      if (!this.isDriving && this.player) {
        this.player.camera.rotation.y += dx * 0.0022;
        this.player.camera.rotation.x = BABYLON.Scalar.Clamp(
          this.player.camera.rotation.x + dy * 0.0022,
          -Math.PI / 2.2,
          Math.PI / 2.2
        );
      }
    });

    // 3. Build Entire Prefecture World, Actors & Props
    this.initWorld(canvas);

    // 4. Minimalist HUD Overlay
    this.hud = new HUDOverlay();

    // 5. Render Loop with Zero-GC Spatial Updates
    this.scene.onBeforeRenderObservable.add(() => {
      this.update(engine.getDeltaTime() / 1000);
    });
  }

  private initAtmosphere(): void {
    // Nostalgic golden-hour late afternoon haze
    this.scene.clearColor = new BABYLON.Color4(0.72, 0.62, 0.55, 1.0);
    this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.0032;
    this.scene.fogColor = new BABYLON.Color3(0.75, 0.65, 0.58);

    // Warm Sun Directional Light
    const sun = new BABYLON.DirectionalLight('afternoon_sun', new BABYLON.Vector3(-0.6, -0.65, 0.45), this.scene);
    sun.position = new BABYLON.Vector3(120, 160, -80);
    sun.intensity = 1.35;
    sun.diffuse = new BABYLON.Color3(1.0, 0.92, 0.82);

    // Ambient bounce light (warm sky / cool sea-ground bounce)
    const hemi = new BABYLON.HemisphericLight('ambient_hemi', new BABYLON.Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.52;
    hemi.diffuse = new BABYLON.Color3(0.98, 0.88, 0.78);
    hemi.groundColor = new BABYLON.Color3(0.24, 0.28, 0.35);

    // Retro atmospheric sky dome
    const sky = BABYLON.MeshBuilder.CreateSphere('retro_sky', { diameter: 700, segments: 16 }, this.scene);
    const skyMat = new BABYLON.StandardMaterial('mat_sky', this.scene);
    skyMat.backFaceCulling = false;
    skyMat.emissiveColor = new BABYLON.Color3(0.72, 0.62, 0.55);
    skyMat.disableLighting = true;
    sky.material = skyMat;
  }

  private initWorld(canvas: HTMLCanvasElement): void {
    // 1. Terrain, Roads, Drainage Ditches & Ocean
    this.terrainAndRoads = new TerrainAndRoads(this.scene, this.spatialGrid);

    // 2. Traversable Bridges
    this.bridges = new Bridges(this.scene, this.spatialGrid);

    // 3. Buildings: Player Homestead & Town
    this.buildings = new PrefectureBuildings(this.scene, this.spatialGrid);

    // 4. ThinInstanced Roadside Props, Poles & Foliage
    this.townProps = new TownProps(this.scene, this.spatialGrid);

    // 5. 3D Drift Car spawned in the Mechanic Garage Bay
    const carSpawn = WORLD_LAYOUT.homestead.spawnCar;
    this.car = new Car3DEntity(this.scene, this.spatialGrid, carSpawn.x, carSpawn.y, carSpawn.z, carSpawn.yawRad);

    // 6. Driving Chase Camera
    this.chaseCamera = new BABYLON.FollowCamera('chase_cam', new BABYLON.Vector3(0, 3, -6), this.scene);
    this.chaseCamera.lockedTarget = this.car.chassis;
    this.chaseCamera.radius = 6.4;
    this.chaseCamera.heightOffset = 2.4;
    this.chaseCamera.rotationOffset = 180;
    this.chaseCamera.cameraAcceleration = 0.08;
    this.chaseCamera.maxCameraSpeed = 28;

    // 7. First-Person Player spawned on Garage Driveway
    const pSpawn = WORLD_LAYOUT.homestead.spawnPlayer;
    this.player = new FPSCharacter(this.scene, canvas, this.spatialGrid, pSpawn.x, pSpawn.y, pSpawn.z);
    this.scene.activeCamera = this.player.camera;

    // 8. Spawn 3D Tools & Parts on Garage Workbench
    const wb = WORLD_LAYOUT.homestead.workbench;
    const itemOffsets = [-1.4, -0.9, -0.4, 0.1, 0.7, 1.3];
    INITIAL_GARAGE_ITEMS_3D.forEach((item, idx) => {
      const x = wb.x + (itemOffsets[idx] ?? 0);
      const worldItem = new WorldItem3D(this.scene, x, wb.y + 0.06, wb.z, item);
      this.groundItems.push(worldItem);
    });
  }

  private update(dt: number): void {
    this.inputManager.update();
    const input = this.inputManager.state;

    // Ocean & River UV wave movement
    this.terrainAndRoads.update(dt);

    if (input.quickSavePressed) this.handleQuickSave();
    if (input.quickLoadPressed) this.handleQuickLoad();
    if (input.toggleVehiclePressed) this.toggleVehicleState();

    // Zero-GC Spatial Partitioning Query near active actor
    const px = this.isDriving ? this.car.physics.x : this.player.camera.position.x;
    const pz = this.isDriving ? this.car.physics.z : this.player.camera.position.z;
    const colliderCount = this.spatialGrid.queryRadius(px, pz, 32);

    let ditchDrag = 1.0;
    if (this.isDriving) {
      for (let i = 0; i < colliderCount; i++) {
        const col = this.spatialGrid.results[i];
        if (col.type === 'ditch' && px >= col.minX && px <= col.maxX && pz >= col.minZ && pz <= col.maxZ) {
          ditchDrag = col.frictionMultiplier;
          break;
        }
      }
    }
    this.vehicleModifier.surfaceDragMultiplier = ditchDrag;

    let activePrompt = '';

    if (!this.isDriving) {
      this.player.update(dt, {
        moveX: input.moveX,
        moveY: input.moveY,
        sprint: input.sprint,
        jump: input.jump,
        actionClick: input.actionClick,
      });

      const isNearDoor = this.car.isNearDriverDoor(this.player.camera.position);
      const interaction = this.player.getInteractionTarget(this.groundItems, isNearDoor);
      activePrompt = interaction.promptText;

      // Pick up item on [E]
      if (input.interactPressed && interaction.type === 'item' && interaction.targetItem) {
        const itemToPick = interaction.targetItem;
        const prev = this.player.equipItem(itemToPick.itemData);
        this.groundItems = this.groundItems.filter((i) => i !== itemToPick);
        itemToPick.dispose();

        if (prev) {
          const dropped = new WorldItem3D(this.scene, itemToPick.mesh.position.x, itemToPick.mesh.position.y, itemToPick.mesh.position.z, prev);
          this.groundItems.push(dropped);
        }
      }

      // Drop item on [G] or [Q]
      if (input.dropPressed && this.player.hands.activeItem) {
        this.player.getDropWorldPosition(this.scratchDropPos);
        const droppedItem = this.player.dropItem();
        if (droppedItem) {
          const worldItem = new WorldItem3D(this.scene, this.scratchDropPos.x, this.scratchDropPos.y, this.scratchDropPos.z, droppedItem);
          this.groundItems.push(worldItem);
        }
      }
    }

    // Step 3D Vehicle Physics with spatial ditch drag modifier
    this.car.update(dt, input.throttle, input.steer, input.handbrake, this.vehicleModifier);

    // Notification toast timer
    if (this.notificationTimer > 0) {
      this.notificationTimer -= dt;
      if (this.notificationTimer <= 0) this.notificationMessage = '';
    }

    const promptText = this.notificationMessage ? this.notificationMessage : activePrompt;
    this.hud.update(this.isDriving, this.player.hands.activeItem, promptText, this.car.physics.telemetry);
  }

  private toggleVehicleState(): void {
    if (this.isDriving) {
      this.isDriving = false;
      this.car.isOccupied = false;
      this.player.inVehicle = false;

      BABYLON.Vector3.TransformCoordinatesToRef(this.scratchLocalDoor, this.car.root.getWorldMatrix(), this.scratchExitPos);
      this.player.camera.position.copyFrom(this.scratchExitPos);

      this.scene.activeCamera = this.player.camera;
      this.eventBus.emit('player:exit_car', { x: this.scratchExitPos.x, y: this.scratchExitPos.z });
    } else if (this.car.isNearDriverDoor(this.player.camera.position)) {
      this.isDriving = true;
      this.car.isOccupied = true;
      this.player.inVehicle = true;
      this.scene.activeCamera = this.chaseCamera;
      this.eventBus.emit('player:enter_car', { carId: 'project_car_3d' });
    }
  }

  private async handleQuickSave(): Promise<void> {
    const pPos = this.player.camera.position;
    const cPhys = this.car.physics;
    const state: IGameState = {
      version: 1,
      timestamp: Date.now(),
      player: {
        position: [pPos.x, pPos.y, pPos.z],
        facingYaw: this.player.camera.rotation.y,
        inVehicle: this.isDriving,
        heldItemId: this.player.hands.activeItem?.id ?? null,
      },
      car: {
        position: [cPhys.x, cPhys.y, cPhys.z],
        yaw: cPhys.yawRad,
        parts: {},
      },
      vitals: { digestionLevel: 20, respect: 50 },
      groundItems: this.groundItems.map((gi) => ({
        id: gi.itemData.id,
        name: gi.itemData.name,
        category: gi.itemData.category,
        meshType: gi.itemData.meshType,
        socketSize: gi.itemData.socketSize,
        carPartId: gi.itemData.carPartId,
        position: [gi.mesh.position.x, gi.mesh.position.y, gi.mesh.position.z],
      })),
    };
    await this.saveManager.saveGame('quicksave', state);
    this.notificationMessage = '💾 QUICKSAVE SAVED (F5)';
    this.notificationTimer = 2.5;
  }

  private async handleQuickLoad(): Promise<void> {
    const loaded = await this.saveManager.loadGame('quicksave');
    if (!loaded) {
      this.notificationMessage = '⚠️ NO SAVE FOUND (F5 to save)';
      this.notificationTimer = 2.0;
      return;
    }
    this.player.camera.position.set(loaded.player.position[0], loaded.player.position[1], loaded.player.position[2]);
    this.player.camera.rotation.y = loaded.player.facingYaw;
    this.car.physics.x = loaded.car.position[0];
    this.car.physics.y = loaded.car.position[1];
    this.car.physics.z = loaded.car.position[2];
    this.car.physics.yawRad = loaded.car.yaw;
    this.notificationMessage = '⚡ QUICKLOAD RESTORED (F9)';
    this.notificationTimer = 2.5;
  }

  public dispose(): void {
    this.terrainAndRoads.dispose();
    this.bridges.dispose();
    this.buildings.dispose();
    this.townProps.dispose();
    this.hud.dispose();
    this.scene.dispose();
  }
}
