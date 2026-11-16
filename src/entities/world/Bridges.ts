import * as BABYLON from '@babylonjs/core';
import { MaterialCache } from '../../systems/graphics/MaterialCache';
import { SpatialGrid } from '../../core/physics/SpatialGrid';

/**
 * Procedural traversable bridges spanning the river:
 * 1. Coastal Steel Truss Bridge (weathered industrial steel girder).
 * 2. Municipal Concrete Town Bridge (concrete road with traditional Japanese end posts).
 */
export class Bridges {
  public readonly scene: BABYLON.Scene;
  private readonly spatialGrid: SpatialGrid;
  private readonly rootNode: BABYLON.TransformNode;

  constructor(scene: BABYLON.Scene, spatialGrid: SpatialGrid) {
    this.scene = scene;
    this.spatialGrid = spatialGrid;
    this.rootNode = new BABYLON.TransformNode('bridges_root', scene);

    const matCache = MaterialCache.getInstance();

    this.buildCoastalSteelBridge(matCache);
    this.buildMunicipalConcreteBridge(matCache);
  }

  /**
   * Constructs the Coastal Industrial Steel Truss Bridge at Z = -48 spanning X: 28 to 52.
   */
  private buildCoastalSteelBridge(matCache: MaterialCache): void {
    const matAsphalt = matCache.getRetroMaterial(this.scene, 'asphalt', 3, 1);
    const matRustedSteel = matCache.getRetroMaterial(this.scene, 'rusted_metal', 2, 4);
    const matConcrete = matCache.getRetroMaterial(this.scene, 'concrete', 2, 2);

    const bridgeZ = -48;
    const spanWidth = 24; // from X = 28 to X = 52
    const deckWidth = 8.5;
    const midX = 40;

    const steelMeshes: BABYLON.Mesh[] = [];

    // 1. Deck road surface (Y = 0.08)
    const deckAsphalt = BABYLON.MeshBuilder.CreateBox(
      'steel_bridge_deck_road',
      { width: spanWidth, height: 0.12, depth: deckWidth },
      this.scene
    );
    deckAsphalt.position.set(midX, 0.06, bridgeZ);
    deckAsphalt.material = matAsphalt;
    deckAsphalt.parent = this.rootNode;

    // 2. Heavy steel girder beams supporting deck from below
    const girderSouth = BABYLON.MeshBuilder.CreateBox(
      'steel_girder_s',
      { width: spanWidth + 2, height: 0.7, depth: 0.4 },
      this.scene
    );
    girderSouth.position.set(midX, -0.35, bridgeZ - deckWidth * 0.5 + 0.2);
    steelMeshes.push(girderSouth);

    const girderNorth = BABYLON.MeshBuilder.CreateBox(
      'steel_girder_n',
      { width: spanWidth + 2, height: 0.7, depth: 0.4 },
      this.scene
    );
    girderNorth.position.set(midX, -0.35, bridgeZ + deckWidth * 0.5 - 0.2);
    steelMeshes.push(girderNorth);

    // 3. Side Warren/Pratt Steel Truss Frames
    const trussHeight = 4.2;
    const trussPosts = 7;
    const postStep = spanWidth / (trussPosts - 1);

    [-1, 1].forEach((sideSign) => {
      const zSide = bridgeZ + (deckWidth * 0.5 + 0.15) * sideSign;

      // Top horizontal chord
      const topChord = BABYLON.MeshBuilder.CreateBox(
        `truss_top_${sideSign}`,
        { width: spanWidth, height: 0.22, depth: 0.22 },
        this.scene
      );
      topChord.position.set(midX, trussHeight, zSide);
      steelMeshes.push(topChord);

      // Bottom horizontal chord
      const bottomChord = BABYLON.MeshBuilder.CreateBox(
        `truss_bot_${sideSign}`,
        { width: spanWidth, height: 0.22, depth: 0.22 },
        this.scene
      );
      bottomChord.position.set(midX, 0.2, zSide);
      steelMeshes.push(bottomChord);

      // Vertical posts and diagonal braces
      for (let i = 0; i < trussPosts; i++) {
        const xPos = 28 + i * postStep;
        const post = BABYLON.MeshBuilder.CreateBox(
          `truss_post_${sideSign}_${i}`,
          { width: 0.18, height: trussHeight, depth: 0.18 },
          this.scene
        );
        post.position.set(xPos, trussHeight * 0.5, zSide);
        steelMeshes.push(post);

        // Diagonal cross brace
        if (i < trussPosts - 1) {
          const diagLen = Math.sqrt(postStep * postStep + trussHeight * trussHeight);
          const diagAngle = Math.atan2(trussHeight, postStep);
          const diag = BABYLON.MeshBuilder.CreateBox(
            `truss_diag_${sideSign}_${i}`,
            { width: diagLen, height: 0.14, depth: 0.14 },
            this.scene
          );
          diag.position.set(xPos + postStep * 0.5, trussHeight * 0.5, zSide);
          diag.rotation.z = (i % 2 === 0) ? diagAngle : -diagAngle;
          steelMeshes.push(diag);
        }
      }
    });

    // 4. Overhead cross-struts connecting the two side trusses
    for (let i = 0; i < trussPosts; i++) {
      const xPos = 28 + i * postStep;
      const crossBeam = BABYLON.MeshBuilder.CreateBox(
        `truss_cross_${i}`,
        { width: 0.18, height: 0.18, depth: deckWidth + 0.3 },
        this.scene
      );
      crossBeam.position.set(xPos, trussHeight, bridgeZ);
      steelMeshes.push(crossBeam);
    }

    // Merge steel structure
    const mergedSteel = BABYLON.Mesh.MergeMeshes(steelMeshes, true, true, undefined, false, true);
    if (mergedSteel) {
      mergedSteel.name = 'steel_truss_bridge_merged';
      mergedSteel.material = matRustedSteel;
      mergedSteel.parent = this.rootNode;
    }

    // 5. Concrete Bridge Abutments & Piers
    const pier1 = BABYLON.MeshBuilder.CreateBox('pier_steel_1', { width: 1.4, height: 3.5, depth: deckWidth + 1.2 }, this.scene);
    pier1.position.set(34, -1.75, bridgeZ);
    pier1.material = matConcrete;
    pier1.parent = this.rootNode;

    const pier2 = BABYLON.MeshBuilder.CreateBox('pier_steel_2', { width: 1.4, height: 3.5, depth: deckWidth + 1.2 }, this.scene);
    pier2.position.set(46, -1.75, bridgeZ);
    pier2.material = matConcrete;
    pier2.parent = this.rootNode;

    // SpatialGrid colliders
    this.spatialGrid.insertBox('steel_bridge_deck', 'bridge', 28, bridgeZ - deckWidth * 0.5, 52, bridgeZ + deckWidth * 0.5, false, 1.0);
    this.spatialGrid.insertBox('steel_bridge_wall_s', 'guardrail', 27, bridgeZ - deckWidth * 0.5 - 0.4, 53, bridgeZ - deckWidth * 0.5, true, 1.0);
    this.spatialGrid.insertBox('steel_bridge_wall_n', 'guardrail', 27, bridgeZ + deckWidth * 0.5, 53, bridgeZ + deckWidth * 0.5 + 0.4, true, 1.0);
  }

  /**
   * Constructs the Narrow Municipal Concrete Town Bridge at Z = 110 spanning X: 28 to 52.
   */
  private buildMunicipalConcreteBridge(matCache: MaterialCache): void {
    const matAsphalt = matCache.getRetroMaterial(this.scene, 'asphalt', 3, 1);
    const matConcrete = matCache.getRetroMaterial(this.scene, 'concrete', 3, 2);
    const matRailing = matCache.getColorMaterial(this.scene, '#2e7d32', '#555555'); // Japanese municipal green

    const bridgeZ = 110;
    const spanWidth = 24;
    const deckWidth = 6.8;
    const midX = 40;

    const concreteMeshes: BABYLON.Mesh[] = [];

    // 1. Concrete deck slab
    const deckSlab = BABYLON.MeshBuilder.CreateBox(
      'conc_bridge_slab',
      { width: spanWidth, height: 0.5, depth: deckWidth },
      this.scene
    );
    deckSlab.position.set(midX, -0.2, bridgeZ);
    concreteMeshes.push(deckSlab);

    // 2. Asphalt roadway
    const roadTop = BABYLON.MeshBuilder.CreateBox(
      'conc_bridge_road',
      { width: spanWidth, height: 0.08, depth: deckWidth - 0.8 },
      this.scene
    );
    roadTop.position.set(midX, 0.08, bridgeZ);
    roadTop.material = matAsphalt;
    roadTop.parent = this.rootNode;

    // 3. Concrete curbs & Japanese Bridge End Posts (Hashira)
    [-1, 1].forEach((sideSign) => {
      const zCurbs = bridgeZ + (deckWidth * 0.5 - 0.3) * sideSign;

      // Continuous curb
      const curb = BABYLON.MeshBuilder.CreateBox(
        `conc_curb_${sideSign}`,
        { width: spanWidth, height: 0.25, depth: 0.5 },
        this.scene
      );
      curb.position.set(midX, 0.16, zCurbs);
      concreteMeshes.push(curb);

      // Japanese ornamental bridge posts at the 4 entrance corners
      [28, 52].forEach((xCorner) => {
        const post = BABYLON.MeshBuilder.CreateBox(
          `hashira_${sideSign}_${xCorner}`,
          { width: 0.5, height: 1.15, depth: 0.5 },
          this.scene
        );
        post.position.set(xCorner, 0.65, zCurbs);
        concreteMeshes.push(post);
      });
    });

    // 4. Concrete Support Pillars in river
    const pier = BABYLON.MeshBuilder.CreateCylinder(
      'conc_pier_center',
      { diameter: 1.8, height: 3.5, tessellation: 12 },
      this.scene
    );
    pier.position.set(midX, -1.75, bridgeZ);
    concreteMeshes.push(pier);

    // Merge concrete parts
    const mergedConcrete = BABYLON.Mesh.MergeMeshes(concreteMeshes, true, true, undefined, false, true);
    if (mergedConcrete) {
      mergedConcrete.name = 'conc_bridge_merged';
      mergedConcrete.material = matConcrete;
      mergedConcrete.parent = this.rootNode;
    }

    // 5. Municipal Green Horizontal Pipe Railings
    const railingMeshes: BABYLON.Mesh[] = [];
    [-1, 1].forEach((sideSign) => {
      const zRail = bridgeZ + (deckWidth * 0.5 - 0.25) * sideSign;

      // 2 horizontal pipes
      [0.55, 0.95].forEach((h) => {
        const pipe = BABYLON.MeshBuilder.CreateCylinder(
          `rail_pipe_${sideSign}_${h}`,
          { diameter: 0.08, height: spanWidth - 1, tessellation: 8 },
          this.scene
        );
        pipe.rotation.z = Math.PI / 2;
        pipe.position.set(midX, h, zRail);
        railingMeshes.push(pipe);
      });
    });

    const mergedRailings = BABYLON.Mesh.MergeMeshes(railingMeshes, true, true, undefined, false, true);
    if (mergedRailings) {
      mergedRailings.name = 'bridge_railings_merged';
      mergedRailings.material = matRailing;
      mergedRailings.parent = this.rootNode;
    }

    // SpatialGrid colliders
    this.spatialGrid.insertBox('conc_bridge_deck', 'bridge', 28, bridgeZ - deckWidth * 0.5, 52, bridgeZ + deckWidth * 0.5, false, 1.0);
    this.spatialGrid.insertBox('conc_bridge_rail_s', 'guardrail', 27.5, bridgeZ - deckWidth * 0.5 - 0.3, 52.5, bridgeZ - deckWidth * 0.5, true, 1.0);
    this.spatialGrid.insertBox('conc_bridge_rail_n', 'guardrail', 27.5, bridgeZ + deckWidth * 0.5, 52.5, bridgeZ + deckWidth * 0.5 + 0.3, true, 1.0);
  }

  public dispose(): void {
    this.rootNode.dispose(false, true);
  }
}
