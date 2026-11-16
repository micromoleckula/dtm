import * as BABYLON from '@babylonjs/core';
import { WORLD_LAYOUT } from '../../config/world-layout';
import { MaterialCache } from '../../systems/graphics/MaterialCache';
import { SpatialGrid } from '../../core/physics/SpatialGrid';

/**
 * Procedural architecture for the Japanese coastal prefecture:
 * - Player Homestead (Mechanic garage with interior steel roof trusses, inspection pit, roll-up door slats;
 *   traditional house with engawa posts, steps, recessed windows, and overhanging hipped kawara roof).
 * - Town Neighborhood (Showa-era houses with courtyard perimeter walls, parts store, rural gas station).
 * Optimized with Mesh.MergeMeshes and SpatialGrid collision indexing.
 */
export class PrefectureBuildings {
  public readonly scene: BABYLON.Scene;
  private readonly spatialGrid: SpatialGrid;
  private readonly rootNode: BABYLON.TransformNode;

  // Key interactable zones
  public readonly garageWorkbenchPos: BABYLON.Vector3;
  public readonly bedPosition: BABYLON.Vector3;

  constructor(scene: BABYLON.Scene, spatialGrid: SpatialGrid) {
    this.scene = scene;
    this.spatialGrid = spatialGrid;
    this.rootNode = new BABYLON.TransformNode('prefecture_buildings_root', scene);

    const matCache = MaterialCache.getInstance();

    this.garageWorkbenchPos = new BABYLON.Vector3(
      WORLD_LAYOUT.homestead.workbench.x,
      WORLD_LAYOUT.homestead.workbench.y,
      WORLD_LAYOUT.homestead.workbench.z
    );

    this.bedPosition = new BABYLON.Vector3(-86, 0.45, 42);

    // 1. Build Player's Compound
    this.buildMechanicGarage(matCache);
    this.buildPlayerHouse(matCache);

    // 2. Build Town Houses & Commercial Area
    this.buildTownBuildings(matCache);
  }

  /**
   * Constructs the detailed Mechanic Garage with steel roof trusses, roll-up door canister,
   * inspection pit, workbench, and shelving.
   */
  private buildMechanicGarage(matCache: MaterialCache): void {
    const g = WORLD_LAYOUT.homestead.garage;
    const matCorrugated = matCache.getRetroMaterial(this.scene, 'rusted_metal', 4, 3);
    const matConcrete = matCache.getRetroMaterial(this.scene, 'concrete', 5, 5);
    const matWood = matCache.getRetroMaterial(this.scene, 'weathered_wood', 3, 1);
    const matSteel = matCache.getColorMaterial(this.scene, '#374151', '#6b7280');
    const matFluo = matCache.getColorMaterial(this.scene, '#ffffff', '#ffffff');

    // 1. Garage Concrete Floor with Sunken Inspection Pit
    const floor = BABYLON.MeshBuilder.CreateBox('garage_floor_main', { width: g.width, height: 0.15, depth: g.length }, this.scene);
    floor.position.set(g.x, 0.05, g.z);
    floor.material = matConcrete;
    floor.parent = this.rootNode;

    // Concrete Driveway connecting garage out to the rural road
    const dw = WORLD_LAYOUT.homestead.driveway;
    const dwLength = dw.startZ - dw.endZ;
    const driveway = BABYLON.MeshBuilder.CreateBox(
      'garage_driveway',
      { width: dw.width, height: 0.08, depth: dwLength },
      this.scene
    );
    driveway.position.set(dw.startX, 0.04, (dw.startZ + dw.endZ) * 0.5);
    driveway.material = matConcrete;
    driveway.parent = this.rootNode;

    // Inspection pit trench (0.9m wide, 4.2m long, 1.4m deep) in center of garage bay
    const pitFloor = BABYLON.MeshBuilder.CreateBox('pit_floor', { width: 0.9, height: 0.05, depth: 4.2 }, this.scene);
    pitFloor.position.set(g.x, -1.35, g.z);
    pitFloor.material = matConcrete;
    pitFloor.parent = this.rootNode;

    // 2. Garage Corrugated Sheet Metal Walls & Steel Trusses
    const wallThickness = 0.25;
    const halfW = g.width * 0.5;
    const halfL = g.length * 0.5;

    const metalMeshes: BABYLON.Mesh[] = [];

    // Back wall (North: Z = g.z + halfL)
    const backWall = BABYLON.MeshBuilder.CreateBox('garage_wall_b', { width: g.width, height: g.height, depth: wallThickness }, this.scene);
    backWall.position.set(g.x, g.height * 0.5, g.z + halfL);
    metalMeshes.push(backWall);

    // Left wall (West: X = g.x - halfW)
    const leftWall = BABYLON.MeshBuilder.CreateBox('garage_wall_l', { width: wallThickness, height: g.height, depth: g.length }, this.scene);
    leftWall.position.set(g.x - halfW, g.height * 0.5, g.z);
    metalMeshes.push(leftWall);

    // Right wall (East: X = g.x + halfW)
    const rightWall = BABYLON.MeshBuilder.CreateBox('garage_wall_r', { width: wallThickness, height: g.height, depth: g.length }, this.scene);
    rightWall.position.set(g.x + halfW, g.height * 0.5, g.z);
    metalMeshes.push(rightWall);

    // Front wall with open vehicle doorway (South: Z = g.z - halfL)
    const doorW = g.doorWidth;
    const sideWallW = (g.width - doorW) * 0.5;
    const doorH = g.doorHeight;

    const frontLeft = BABYLON.MeshBuilder.CreateBox('garage_front_l', { width: sideWallW, height: g.height, depth: wallThickness }, this.scene);
    frontLeft.position.set(g.x - halfW + sideWallW * 0.5, g.height * 0.5, g.z - halfL);
    metalMeshes.push(frontLeft);

    const frontRight = BABYLON.MeshBuilder.CreateBox('garage_front_r', { width: sideWallW, height: g.height, depth: wallThickness }, this.scene);
    frontRight.position.set(g.x + halfW - sideWallW * 0.5, g.height * 0.5, g.z - halfL);
    metalMeshes.push(frontRight);

    const frontLintel = BABYLON.MeshBuilder.CreateBox('garage_lintel', { width: doorW, height: g.height - doorH, depth: wallThickness }, this.scene);
    frontLintel.position.set(g.x, doorH + (g.height - doorH) * 0.5, g.z - halfL);
    metalMeshes.push(frontLintel);

    // Corrugated Roll-up Door Header Drum / Canister
    const rollUpDrum = BABYLON.MeshBuilder.CreateCylinder('rollup_drum', { diameter: 0.55, height: doorW + 0.2 }, this.scene);
    rollUpDrum.rotation.z = Math.PI / 2;
    rollUpDrum.position.set(g.x, doorH + 0.15, g.z - halfL - 0.1);
    metalMeshes.push(rollUpDrum);

    // Sloped Corrugated Metal Roof with Overhanging Eaves
    const roof = BABYLON.MeshBuilder.CreateBox('garage_roof', { width: g.width + 1.4, height: 0.15, depth: g.length + 1.4 }, this.scene);
    roof.position.set(g.x, g.height + 0.15, g.z);
    roof.rotation.x = 0.05; // Gentle slope backwards for rainwater runoff
    metalMeshes.push(roof);

    // Interior Structural Steel Roof Trusses (3 transverse A-frames)
    [-4.5, 0, 4.5].forEach((zOffset, idx) => {
      const trussSpan = BABYLON.MeshBuilder.CreateBox(`truss_span_${idx}`, { width: g.width - 0.5, height: 0.18, depth: 0.18 }, this.scene);
      trussSpan.position.set(g.x, g.height - 0.5, g.z + zOffset);
      trussSpan.material = matSteel;
      trussSpan.parent = this.rootNode;
    });

    // Wall Tool Racks on East Wall
    const toolRack = BABYLON.MeshBuilder.CreateBox('tool_rack', { width: 0.2, height: 1.8, depth: 3.5 }, this.scene);
    toolRack.position.set(g.x + halfW - 0.2, 2.1, g.z);
    toolRack.material = matWood;
    toolRack.parent = this.rootNode;

    const mergedGarageMetal = BABYLON.Mesh.MergeMeshes(metalMeshes, true, true, undefined, false, true);
    if (mergedGarageMetal) {
      mergedGarageMetal.name = 'garage_metal_merged';
      mergedGarageMetal.material = matCorrugated;
      mergedGarageMetal.parent = this.rootNode;
    }

    // 3. Mechanic Workbench (Against West/Back corner)
    const benchTop = BABYLON.MeshBuilder.CreateBox('wb_top', { width: 3.6, height: 0.12, depth: 1.1 }, this.scene);
    benchTop.position.set(this.garageWorkbenchPos.x, this.garageWorkbenchPos.y, this.garageWorkbenchPos.z);
    benchTop.material = matWood;
    benchTop.parent = this.rootNode;

    const benchBase = BABYLON.MeshBuilder.CreateBox('wb_base', { width: 3.5, height: 0.88, depth: 1.0 }, this.scene);
    benchBase.position.set(this.garageWorkbenchPos.x, this.garageWorkbenchPos.y - 0.48, this.garageWorkbenchPos.z);
    benchBase.material = matCorrugated;
    benchBase.parent = this.rootNode;

    // 4. Fluorescent Lighting Tubes inside Garage
    [g.z - 3, g.z + 3].forEach((zLight, idx) => {
      const tube = BABYLON.MeshBuilder.CreateCylinder(`tube_${idx}`, { diameter: 0.08, height: 4.2 }, this.scene);
      tube.rotation.z = Math.PI / 2;
      tube.position.set(g.x, g.height - 0.35, zLight);
      tube.material = matFluo;
      tube.parent = this.rootNode;

      const light = new BABYLON.PointLight(`light_gar_${idx}`, new BABYLON.Vector3(g.x, g.height - 0.6, zLight), this.scene);
      light.intensity = 0.85;
      light.range = 14;
      light.diffuse = new BABYLON.Color3(0.95, 0.98, 1.0);
    });

    // Register colliders in SpatialGrid
    this.spatialGrid.insertBox('garage_wall_b', 'wall', g.x - halfW, g.z + halfL - 0.3, g.x + halfW, g.z + halfL + 0.3, true, 1.0);
    this.spatialGrid.insertBox('garage_wall_l', 'wall', g.x - halfW - 0.3, g.z - halfL, g.x - halfW + 0.3, g.z + halfL, true, 1.0);
    this.spatialGrid.insertBox('garage_wall_r', 'wall', g.x + halfW - 0.3, g.z - halfL, g.x + halfW + 0.3, g.z + halfL, true, 1.0);
    this.spatialGrid.insertBox('garage_front_l', 'wall', g.x - halfW - 0.3, g.z - halfL - 0.3, g.x - doorW * 0.5, g.z - halfL + 0.3, true, 1.0);
    this.spatialGrid.insertBox('garage_front_r', 'wall', g.x + doorW * 0.5, g.z - halfL - 0.3, g.x + halfW + 0.3, g.z - halfL + 0.3, true, 1.0);
    this.spatialGrid.insertBox('garage_workbench', 'building', this.garageWorkbenchPos.x - 1.8, this.garageWorkbenchPos.z - 0.6, this.garageWorkbenchPos.x + 1.8, this.garageWorkbenchPos.z + 0.6, true, 1.0);
    this.spatialGrid.insertBox('garage_inspection_pit', 'ditch', g.x - 0.45, g.z - 2.1, g.x + 0.45, g.z + 2.1, false, 1.0);
  }

  /**
   * Constructs the Traditional Japanese House with overhanging hipped kawara roof,
   * ridge beams, engawa veranda posts, steps, recessed windows, and tatami interior.
   */
  private buildPlayerHouse(matCache: MaterialCache): void {
    const h = WORLD_LAYOUT.homestead.house;
    const matWood = matCache.getRetroMaterial(this.scene, 'weathered_wood', 4, 2);
    const matKawara = matCache.getRetroMaterial(this.scene, 'kawara_tiles', 4, 3);
    const matTatami = matCache.getRetroMaterial(this.scene, 'tatami', 3, 3);
    const matConcrete = matCache.getRetroMaterial(this.scene, 'concrete', 3, 1);
    const matGlass = matCache.getColorMaterial(this.scene, '#0f172a', '#94a3b8', 0.65);

    // 1. Raised Stone/Concrete Foundation
    const foundation = BABYLON.MeshBuilder.CreateBox('house_found', { width: h.width + 1.8, height: 0.45, depth: h.length + 1.8 }, this.scene);
    foundation.position.set(h.x, 0.22, h.z);
    foundation.material = matConcrete;
    foundation.parent = this.rootNode;

    // 2. Main Wooden House Body with Recessed Windows
    const houseBody = BABYLON.MeshBuilder.CreateBox('house_body', { width: h.width, height: h.height * 0.6, depth: h.length }, this.scene);
    houseBody.position.set(h.x, 0.45 + (h.height * 0.6) * 0.5, h.z);
    houseBody.material = matWood;
    houseBody.parent = this.rootNode;

    // Recessed Shoji / Glass Windows on South facade
    [-3.2, 3.2].forEach((xOffset, idx) => {
      const windowFrame = BABYLON.MeshBuilder.CreateBox(`house_win_${idx}`, { width: 2.2, height: 1.4, depth: 0.08 }, this.scene);
      windowFrame.position.set(h.x + xOffset, 1.65, h.z - h.length * 0.5 - 0.04);
      windowFrame.material = matGlass;
      windowFrame.parent = this.rootNode;
    });

    // 3. Engawa Veranda (Outer wooden deck porch + corner support posts)
    const engawa = BABYLON.MeshBuilder.CreateBox('house_engawa', { width: h.width + 1.4, height: 0.14, depth: 1.8 }, this.scene);
    engawa.position.set(h.x, 0.48, h.z - h.length * 0.5 - 0.9);
    engawa.material = matWood;
    engawa.parent = this.rootNode;

    // Engawa Porch Step (0.24m high for smooth character step-up)
    const engawaStep = BABYLON.MeshBuilder.CreateBox('house_step', { width: 3.5, height: 0.24, depth: 0.8 }, this.scene);
    engawaStep.position.set(h.x, 0.24, h.z - h.length * 0.5 - 2.0);
    engawaStep.material = matConcrete;
    engawaStep.parent = this.rootNode;

    // 4 Wooden Veranda Posts supporting roof eave
    [-5.5, -1.8, 1.8, 5.5].forEach((xPost, idx) => {
      const post = BABYLON.MeshBuilder.CreateCylinder(`engawa_post_${idx}`, { diameter: 0.16, height: 2.8 }, this.scene);
      post.position.set(h.x + xPost, 1.8, h.z - h.length * 0.5 - 1.6);
      post.material = matWood;
      post.parent = this.rootNode;
    });

    // 4. Multi-Layered Hipped Kawara Roof with Overhanging Eaves and Ridge Beam
    const roofEaves = BABYLON.MeshBuilder.CreateCylinder('house_roof_tiles', {
      diameterTop: 1.2,
      diameterBottom: Math.max(h.width, h.length) + 4.2,
      height: 2.9,
      tessellation: 4,
    }, this.scene);
    roofEaves.rotation.y = Math.PI / 4;
    roofEaves.position.set(h.x, h.height * 0.6 + 1.9, h.z);
    roofEaves.scaling.set(1.0, 1.0, (h.length + 3.0) / (h.width + 3.0));
    roofEaves.material = matKawara;
    roofEaves.parent = this.rootNode;

    // Ornamental Ceramic Ridge Beam Cap (Ōmune)
    const ridgeBeam = BABYLON.MeshBuilder.CreateBox('house_ridge_beam', { width: 0.45, height: 0.35, depth: h.length + 0.8 }, this.scene);
    ridgeBeam.position.set(h.x, h.height * 0.6 + 3.4, h.z);
    ridgeBeam.material = matKawara;
    ridgeBeam.parent = this.rootNode;

    // 5. Interior Tatami Room & Rest Futon/Bed
    const tatamiFloor = BABYLON.MeshBuilder.CreateGround('house_tatami', { width: 5.5, height: 5.5 }, this.scene);
    tatamiFloor.position.set(h.x, 0.46, h.z);
    tatamiFloor.material = matTatami;
    tatamiFloor.parent = this.rootNode;

    // Futon / Bed frame
    const bed = BABYLON.MeshBuilder.CreateBox('house_bed', { width: 1.4, height: 0.22, depth: 2.1 }, this.scene);
    bed.position.set(this.bedPosition.x, this.bedPosition.y, this.bedPosition.z);
    bed.material = matCache.getColorMaterial(this.scene, '#f8fafc', '#333333');
    bed.parent = this.rootNode;

    // SpatialGrid colliders
    const halfW = (h.width + 1.8) * 0.5;
    const halfL = (h.length + 1.8) * 0.5;
    this.spatialGrid.insertBox('player_house', 'building', h.x - halfW, h.z - halfL, h.x + halfW, h.z + halfL, true, 1.0);
  }

  /**
   * Constructs the Showa-era town houses, convenience/parts store, and rural gas station.
   */
  private buildTownBuildings(matCache: MaterialCache): void {
    const matWood = matCache.getRetroMaterial(this.scene, 'weathered_wood', 3, 2);
    const matKawara = matCache.getRetroMaterial(this.scene, 'kawara_tiles', 4, 3);
    const matConcrete = matCache.getRetroMaterial(this.scene, 'concrete', 3, 3);
    const matStoreFront = matCache.getColorMaterial(this.scene, '#0284c7', '#ffffff'); // Showa blue storefront
    const matGasCanopy = matCache.getColorMaterial(this.scene, '#dc2626', '#ffffff'); // Japanese retro gas station red
    const matGlass = matCache.getColorMaterial(this.scene, '#0f172a', '#94a3b8', 0.6);

    const houseWoodMeshes: BABYLON.Mesh[] = [];
    const houseRoofMeshes: BABYLON.Mesh[] = [];

    WORLD_LAYOUT.buildingPlots.forEach((plot) => {
      if (plot.type === 'town_house') {
        // Residential Showa House with Eaves & Recessed Window
        const houseMesh = BABYLON.MeshBuilder.CreateBox(
          `house_${plot.id}`,
          { width: plot.width, height: plot.height * 0.65, depth: plot.length },
          this.scene
        );
        houseMesh.position.set(plot.x, (plot.height * 0.65) * 0.5, plot.z);
        houseWoodMeshes.push(houseMesh);

        // Recessed front window
        const win = BABYLON.MeshBuilder.CreateBox(`win_${plot.id}`, { width: 1.8, height: 1.2, depth: 0.05 }, this.scene);
        win.position.set(plot.x + 1.8, 1.6, plot.z - plot.length * 0.5 - 0.02);
        win.material = matGlass;
        win.parent = this.rootNode;

        // Kawara Tile Roof with Overhanging Eaves
        const roof = BABYLON.MeshBuilder.CreateCylinder(
          `roof_${plot.id}`,
          { diameterTop: 0.5, diameterBottom: Math.max(plot.width, plot.length) + 2.4, height: 2.3, tessellation: 4 },
          this.scene
        );
        roof.rotation.y = Math.PI / 4;
        roof.position.set(plot.x, plot.height * 0.65 + 1.15, plot.z);
        roof.scaling.set(1.0, 1.0, (plot.length + 1.8) / (plot.width + 1.8));
        houseRoofMeshes.push(roof);

        // Courtyard perimeter wall with tile cap
        const wallH = 1.65;
        const wallThick = 0.24;
        const cWall = BABYLON.MeshBuilder.CreateBox(
          `cwall_${plot.id}`,
          { width: plot.width + 3.0, height: wallH, depth: wallThick },
          this.scene
        );
        const courtyardZ = plot.z - plot.length * 0.5 - 1.8;
        cWall.position.set(plot.x, wallH * 0.5, courtyardZ);
        cWall.material = matConcrete;
        cWall.parent = this.rootNode;

        this.spatialGrid.insertBox(`courtyard_${plot.id}`, 'wall', plot.x - (plot.width + 3.0) * 0.5, courtyardZ - wallThick, plot.x + (plot.width + 3.0) * 0.5, courtyardZ + wallThick, true, 1.0);
        this.spatialGrid.insertBox(plot.id, 'building', plot.x - plot.width * 0.5, plot.z - plot.length * 0.5, plot.x + plot.width * 0.5, plot.z + plot.length * 0.5, true, 1.0);
      } else if (plot.type === 'store') {
        // Convenience Store & Auto Parts Shop
        const storeBody = BABYLON.MeshBuilder.CreateBox('store_body', { width: plot.width, height: plot.height, depth: plot.length }, this.scene);
        storeBody.position.set(plot.x, plot.height * 0.5, plot.z);
        storeBody.material = matConcrete;
        storeBody.parent = this.rootNode;

        // Front shop glass and signage
        const storefront = BABYLON.MeshBuilder.CreateBox('store_glass', { width: plot.width - 2, height: 2.8, depth: 0.2 }, this.scene);
        storefront.position.set(plot.x, 1.5, plot.z - plot.length * 0.5 - 0.1);
        storefront.material = matGlass;
        storefront.parent = this.rootNode;

        // Cantilever Awning / Fascia
        const awning = BABYLON.MeshBuilder.CreateBox('store_awning', { width: plot.width + 1.2, height: 0.85, depth: 1.8 }, this.scene);
        awning.position.set(plot.x, 3.4, plot.z - plot.length * 0.5 - 0.8);
        awning.material = matStoreFront;
        awning.parent = this.rootNode;

        this.spatialGrid.insertBox('store', 'building', plot.x - plot.width * 0.5, plot.z - plot.length * 0.5, plot.x + plot.width * 0.5, plot.z + plot.length * 0.5, true, 1.0);
      } else if (plot.type === 'gas_station') {
        // Rural Gas Station with Canopy & Dual Vintage Pumps
        const canopy = BABYLON.MeshBuilder.CreateBox('gas_canopy', { width: plot.width, height: 0.65, depth: plot.length * 0.7 }, this.scene);
        canopy.position.set(plot.x, 4.4, plot.z);
        canopy.material = matGasCanopy;
        canopy.parent = this.rootNode;

        // 2 Heavy Support Pillars
        [-1, 1].forEach((sign) => {
          const pillar = BABYLON.MeshBuilder.CreateBox(`gas_pillar_${sign}`, { width: 0.7, height: 4.4, depth: 0.7 }, this.scene);
          pillar.position.set(plot.x + (plot.width * 0.3) * sign, 2.2, plot.z);
          pillar.material = matConcrete;
          pillar.parent = this.rootNode;
          this.spatialGrid.insertBox(`gas_pillar_${sign}`, 'building', pillar.position.x - 0.4, pillar.position.z - 0.4, pillar.position.x + 0.4, pillar.position.z + 0.4, true, 1.0);
        });

        // 2 Gas Pumps (Red & Blue vintage dispensers)
        [-1, 1].forEach((sign) => {
          const pump = BABYLON.MeshBuilder.CreateBox(`gas_pump_${sign}`, { width: 0.65, height: 1.6, depth: 0.55 }, this.scene);
          pump.position.set(plot.x + 3.2 * sign, 0.8, plot.z);
          pump.material = sign === -1 ? matGasCanopy : matStoreFront;
          pump.parent = this.rootNode;
          this.spatialGrid.insertBox(`gas_pump_${sign}`, 'building', pump.position.x - 0.4, pump.position.z - 0.35, pump.position.x + 0.4, pump.position.z + 0.35, true, 1.0);
        });

        // Small Service Office in the back
        const office = BABYLON.MeshBuilder.CreateBox('gas_office', { width: 8.5, height: 3.5, depth: 5.5 }, this.scene);
        office.position.set(plot.x, 1.75, plot.z + plot.length * 0.5);
        office.material = matConcrete;
        office.parent = this.rootNode;
        this.spatialGrid.insertBox('gas_office', 'building', plot.x - 4.3, plot.z + plot.length * 0.5 - 2.8, plot.x + 4.3, plot.z + plot.length * 0.5 + 2.8, true, 1.0);
      }
    });

    // Merge town house wood walls
    if (houseWoodMeshes.length > 0) {
      const mergedWood = BABYLON.Mesh.MergeMeshes(houseWoodMeshes, true, true, undefined, false, true);
      if (mergedWood) {
        mergedWood.name = 'town_houses_wood_merged';
        mergedWood.material = matWood;
        mergedWood.parent = this.rootNode;
      }
    }

    // Merge town house roofs
    if (houseRoofMeshes.length > 0) {
      const mergedRoofs = BABYLON.Mesh.MergeMeshes(houseRoofMeshes, true, true, undefined, false, true);
      if (mergedRoofs) {
        mergedRoofs.name = 'town_houses_roofs_merged';
        mergedRoofs.material = matKawara;
        mergedRoofs.parent = this.rootNode;
      }
    }
  }

  public dispose(): void {
    this.rootNode.dispose(false, true);
  }
}
