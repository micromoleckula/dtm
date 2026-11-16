import * as BABYLON from '@babylonjs/core';
import { WORLD_LAYOUT, IRoadSegmentConfig } from '../../config/world-layout';
import { MaterialCache } from '../../systems/graphics/MaterialCache';
import { SpatialGrid } from '../../core/physics/SpatialGrid';

/**
 * Procedural Japanese coastal prefecture terrain, asphalt roads,
 * authentic concrete drainage ditches (mizo), seawall, river, and animated ocean.
 */
export class TerrainAndRoads {
  public readonly scene: BABYLON.Scene;
  private readonly spatialGrid: SpatialGrid;
  public readonly oceanMesh: BABYLON.Mesh;
  public readonly riverMesh: BABYLON.Mesh;
  private oceanTexture: BABYLON.Texture | null = null;

  // Root container for cleanup
  private readonly rootNode: BABYLON.TransformNode;

  constructor(scene: BABYLON.Scene, spatialGrid: SpatialGrid) {
    this.scene = scene;
    this.spatialGrid = spatialGrid;
    this.rootNode = new BABYLON.TransformNode('terrain_and_roads_root', scene);

    const matCache = MaterialCache.getInstance();

    // 1. Build rolling terrain
    this.buildTerrain(matCache);

    // 2. Build road network & roadside concrete ditches (mizo)
    this.buildRoadNetworkAndDitches(matCache);

    // 3. Build seawall barrier
    this.buildSeawall(matCache);

    // 4. Build River Channel & Ocean Plane
    const waters = this.buildWaterBodies(matCache);
    this.oceanMesh = waters.ocean;
    this.riverMesh = waters.river;
    this.oceanTexture = matCache.getRetroTexture(scene, 'ocean_water');
  }

  /**
   * Advances UV wave animation for ocean and river water.
   */
  public update(dt: number): void {
    if (this.oceanTexture) {
      this.oceanTexture.uOffset += dt * 0.018;
      this.oceanTexture.vOffset += dt * 0.012;
    }
  }

  private buildTerrain(matCache: MaterialCache): void {
    const matGrass = matCache.getRetroMaterial(this.scene, 'grass_dirt', 64, 64);

    const sculptGround = (ground: BABYLON.Mesh, originX: number, originZ: number) => {
      const positions = ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);
      if (!positions) return;

      for (let i = 0; i < positions.length; i += 3) {
        const lx = positions[i];
        const lz = positions[i + 2];
        const wx = originX + lx;
        const wz = originZ + lz;

        // Sample exact surface elevation from SpatialGrid
        positions[i + 1] = this.spatialGrid.getSurfaceElevation(wx, wz) - 0.04;
      }

      ground.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
      ground.createNormals(false);
    };

    // West Inland & Coastal Rolling Hills (subdivisions: 32 for organic terrain)
    const terrainWest = BABYLON.MeshBuilder.CreateGround(
      'terrain_west',
      { width: 291, height: 340, subdivisions: 32 },
      this.scene
    );
    terrainWest.position.set(-114.5, 0, 110);
    sculptGround(terrainWest, -114.5, 110);
    terrainWest.material = matGrass;
    terrainWest.parent = this.rootNode;

    // East Town Ground (subdivisions: 28)
    const terrainEast = BABYLON.MeshBuilder.CreateGround(
      'terrain_east',
      { width: 211, height: 340, subdivisions: 28 },
      this.scene
    );
    terrainEast.position.set(154.5, 0, 110);
    sculptGround(terrainEast, 154.5, 110);
    terrainEast.material = matGrass;
    terrainEast.parent = this.rootNode;
  }

  private buildRoadNetworkAndDitches(matCache: MaterialCache): void {
    const matAsphalt = matCache.getRetroMaterial(this.scene, 'asphalt', 4, 12);
    const matConcrete = matCache.getRetroMaterial(this.scene, 'concrete', 3, 3);

    const roadMeshes: BABYLON.Mesh[] = [];
    const ditchMeshes: BABYLON.Mesh[] = [];

    WORLD_LAYOUT.roads.forEach((road) => {
      const dx = road.endX - road.startX;
      const dz = road.endZ - road.startZ;
      const length = Math.sqrt(dx * dx + dz * dz);
      if (length < 0.1) return;

      const midX = (road.startX + road.endX) * 0.5;
      const midZ = (road.startZ + road.endZ) * 0.5;
      const angle = Math.atan2(dx, dz);

      // 1. Asphalt Road Surface
      const roadMesh = BABYLON.MeshBuilder.CreateBox(
        `road_${road.id}`,
        { width: road.width, height: 0.08, depth: length },
        this.scene
      );
      roadMesh.position.set(midX, 0.04, midZ);
      roadMesh.rotation.y = angle;
      roadMeshes.push(roadMesh);

      // Register road corridor in spatial grid
      const halfW = road.width * 0.5;
      const minX = Math.min(road.startX, road.endX) - halfW;
      const maxX = Math.max(road.startX, road.endX) + halfW;
      const minZ = Math.min(road.startZ, road.endZ) - halfW;
      const maxZ = Math.max(road.startZ, road.endZ) + halfW;
      this.spatialGrid.insertBox(road.id, 'road', minX, minZ, maxX, maxZ, false, 1.0);

      // 2. Roadside Concrete Drainage Ditches (Mizo)
      if (road.hasDitches) {
        const ditchWidth = 0.65;
        const ditchDepth = 0.45;
        const offsetDist = halfW + ditchWidth * 0.5;

        // Left & Right Ditch segments
        const cosAngle = Math.cos(angle);
        const sinAngle = Math.sin(angle);

        const createDitch = (sideSign: number, ditchId: string) => {
          const offsetX = cosAngle * (offsetDist * sideSign);
          const offsetZ = -sinAngle * (offsetDist * sideSign);

          const ditchFloor = BABYLON.MeshBuilder.CreateBox(
            `${ditchId}_floor`,
            { width: ditchWidth, height: 0.06, depth: length },
            this.scene
          );
          ditchFloor.position.set(midX + offsetX, -ditchDepth, midZ + offsetZ);
          ditchFloor.rotation.y = angle;
          ditchMeshes.push(ditchFloor);

          // Outer lip
          const outerLip = BABYLON.MeshBuilder.CreateBox(
            `${ditchId}_lip`,
            { width: 0.14, height: ditchDepth, depth: length },
            this.scene
          );
          const lipOffsetX = cosAngle * ((offsetDist + ditchWidth * 0.5) * sideSign);
          const lipOffsetZ = -sinAngle * ((offsetDist + ditchWidth * 0.5) * sideSign);
          outerLip.position.set(midX + lipOffsetX, -ditchDepth * 0.5, midZ + lipOffsetZ);
          outerLip.rotation.y = angle;
          ditchMeshes.push(outerLip);

          // Register in spatial grid with hazard friction multiplier (dragging car in)
          const dMinX = Math.min(road.startX, road.endX) + offsetX - ditchWidth;
          const dMaxX = Math.max(road.startX, road.endX) + offsetX + ditchWidth;
          const dMinZ = Math.min(road.startZ, road.endZ) + offsetZ - ditchWidth;
          const dMaxZ = Math.max(road.startZ, road.endZ) + offsetZ + ditchWidth;
          this.spatialGrid.insertBox(ditchId, 'ditch', dMinX, dMinZ, dMaxX, dMaxZ, false, 3.8);
        };

        createDitch(-1, `mizo_l_${road.id}`);
        createDitch(1, `mizo_r_${road.id}`);
      }
    });

    // Merge road meshes for zero-draw-call optimization
    if (roadMeshes.length > 0) {
      const mergedRoads = BABYLON.Mesh.MergeMeshes(roadMeshes, true, true, undefined, false, true);
      if (mergedRoads) {
        mergedRoads.name = 'roads_merged';
        mergedRoads.material = matAsphalt;
        mergedRoads.parent = this.rootNode;
      }
    }

    // Merge ditch meshes
    if (ditchMeshes.length > 0) {
      const mergedDitches = BABYLON.Mesh.MergeMeshes(ditchMeshes, true, true, undefined, false, true);
      if (mergedDitches) {
        mergedDitches.name = 'ditches_merged';
        mergedDitches.material = matConcrete;
        mergedDitches.parent = this.rootNode;
      }
    }
  }

  private buildSeawall(matCache: MaterialCache): void {
    const matConcrete = matCache.getRetroMaterial(this.scene, 'concrete', 8, 2);
    const seawallZ = WORLD_LAYOUT.coastline.seawallZ;
    const seawallH = WORLD_LAYOUT.coastline.seawallHeightY;

    // West Seawall: X from -260 to 31
    const seawallWest = BABYLON.MeshBuilder.CreateBox(
      'seawall_west',
      { width: 291, height: seawallH, depth: 1.6 },
      this.scene
    );
    seawallWest.position.set(-114.5, seawallH * 0.5 - 0.2, seawallZ);
    seawallWest.material = matConcrete;
    seawallWest.parent = this.rootNode;
    this.spatialGrid.insertBox('seawall_west', 'wall', -260, seawallZ - 0.8, 31, seawallZ + 0.8, true, 1.0);

    // East Seawall: X from 49 to 260
    const seawallEast = BABYLON.MeshBuilder.CreateBox(
      'seawall_east',
      { width: 211, height: seawallH, depth: 1.6 },
      this.scene
    );
    seawallEast.position.set(154.5, seawallH * 0.5 - 0.2, seawallZ);
    seawallEast.material = matConcrete;
    seawallEast.parent = this.rootNode;
    this.spatialGrid.insertBox('seawall_east', 'wall', 49, seawallZ - 0.8, 260, seawallZ + 0.8, true, 1.0);
  }

  private buildWaterBodies(matCache: MaterialCache): { ocean: BABYLON.Mesh; river: BABYLON.Mesh } {
    const matWater = matCache.getRetroMaterial(this.scene, 'ocean_water', 16, 16);

    // Expansive Ocean Plane (South of Seawall: Z from -60 to -340)
    const ocean = BABYLON.MeshBuilder.CreateGround(
      'ocean_surface',
      { width: 540, height: 280, subdivisions: 4 },
      this.scene
    );
    ocean.position.set(0, WORLD_LAYOUT.coastline.waterLevelY, -200);
    ocean.material = matWater;
    ocean.parent = this.rootNode;

    // North-to-South River Channel Surface
    const riverLength = WORLD_LAYOUT.river.northZ - WORLD_LAYOUT.river.southZ;
    const river = BABYLON.MeshBuilder.CreateGround(
      'river_surface',
      { width: WORLD_LAYOUT.river.width, height: riverLength, subdivisions: 4 },
      this.scene
    );
    river.position.set(
      WORLD_LAYOUT.river.startX,
      WORLD_LAYOUT.river.depthY,
      (WORLD_LAYOUT.river.northZ + WORLD_LAYOUT.river.southZ) * 0.5
    );
    river.material = matWater;
    river.parent = this.rootNode;

    // River Bank Walls (Left bank at X = 31, Right bank at X = 49)
    const matConcrete = matCache.getRetroMaterial(this.scene, 'concrete', 4, 30);
    const bankH = Math.abs(WORLD_LAYOUT.river.depthY);

    const leftBank = BABYLON.MeshBuilder.CreateBox(
      'river_bank_left',
      { width: 0.6, height: bankH, depth: riverLength },
      this.scene
    );
    leftBank.position.set(
      WORLD_LAYOUT.river.bankLeftX,
      -bankH * 0.5,
      (WORLD_LAYOUT.river.northZ + WORLD_LAYOUT.river.southZ) * 0.5
    );
    leftBank.material = matConcrete;
    leftBank.parent = this.rootNode;
    this.spatialGrid.insertBox(
      'river_bank_left',
      'wall',
      WORLD_LAYOUT.river.bankLeftX - 0.5,
      WORLD_LAYOUT.river.southZ,
      WORLD_LAYOUT.river.bankLeftX + 0.5,
      WORLD_LAYOUT.river.northZ,
      true,
      1.0
    );

    const rightBank = BABYLON.MeshBuilder.CreateBox(
      'river_bank_right',
      { width: 0.6, height: bankH, depth: riverLength },
      this.scene
    );
    rightBank.position.set(
      WORLD_LAYOUT.river.bankRightX,
      -bankH * 0.5,
      (WORLD_LAYOUT.river.northZ + WORLD_LAYOUT.river.southZ) * 0.5
    );
    rightBank.material = matConcrete;
    rightBank.parent = this.rootNode;
    this.spatialGrid.insertBox(
      'river_bank_right',
      'wall',
      WORLD_LAYOUT.river.bankRightX - 0.5,
      WORLD_LAYOUT.river.southZ,
      WORLD_LAYOUT.river.bankRightX + 0.5,
      WORLD_LAYOUT.river.northZ,
      true,
      1.0
    );

    return { ocean, river };
  }

  public dispose(): void {
    this.rootNode.dispose(false, true);
  }
}
