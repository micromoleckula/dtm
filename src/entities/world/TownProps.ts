import * as BABYLON from '@babylonjs/core';
import { MaterialCache } from '../../systems/graphics/MaterialCache';
import { SpatialGrid } from '../../core/physics/SpatialGrid';

/**
 * Atmospheric roadside props, roadside furniture, and coastal armor blocks.
 * High-performance batching via Babylon.js ThinInstances (under 10 draw calls for >300 props).
 */
export class TownProps {
  public readonly scene: BABYLON.Scene;
  private readonly spatialGrid: SpatialGrid;
  private readonly rootNode: BABYLON.TransformNode;

  constructor(scene: BABYLON.Scene, spatialGrid: SpatialGrid) {
    this.scene = scene;
    this.spatialGrid = spatialGrid;
    this.rootNode = new BABYLON.TransformNode('town_props_root', scene);

    const matCache = MaterialCache.getInstance();

    this.spawnUtilityPoles(matCache);
    this.spawnGuardrails(matCache);
    this.spawnCornerMirrors(matCache);
    this.spawnRoadSigns(matCache);
    this.spawnVendingMachines(matCache);
    this.spawnTetrapods(matCache);
    this.spawnFoliage(matCache);
  }

  /**
   * Concrete Utility Poles (Denchū) along roadsides.
   */
  private spawnUtilityPoles(matCache: MaterialCache): void {
    const matConcrete = matCache.getRetroMaterial(this.scene, 'concrete', 2, 8);

    // Base mesh: Pole + Top Crossarm
    const poleMesh = BABYLON.MeshBuilder.CreateCylinder(
      'base_pole',
      { diameter: 0.38, height: 8.8, tessellation: 8 },
      this.scene
    );
    const crossarm = BABYLON.MeshBuilder.CreateBox('crossarm', { width: 1.8, height: 0.16, depth: 0.16 }, this.scene);
    crossarm.position.y = 4.0;
    crossarm.parent = poleMesh;

    const mergedPole = BABYLON.Mesh.MergeMeshes([poleMesh, crossarm], true, true, undefined, false, true);
    if (!mergedPole) return;
    mergedPole.material = matConcrete;
    mergedPole.parent = this.rootNode;

    // Pole locations along roads
    const polePositions: [number, number][] = [
      // Along garage access road
      [-62.5, 18], [-62.5, -4], [-62.5, -26],
      // Along coastal highway (west to east)
      [-190, -43], [-140, -43], [-90, -43], [-40, -43], [-10, -43],
      [70, -43], [110, -43], [150, -43], [190, -43], [230, -43],
      // Along town road
      [65, 114], [95, 114], [125, 114], [155, 114], [185, 114], [215, 114],
      // Winding road
      [-48, 28], [-28, 56], [-5, 82], [18, 102],
    ];

    const count = polePositions.length;
    const matrixBuffer = new Float32Array(count * 16);
    const tempMatrix = new BABYLON.Matrix();

    for (let i = 0; i < count; i++) {
      const [px, pz] = polePositions[i];
      BABYLON.Matrix.TranslationToRef(px, 4.4, pz, tempMatrix);
      tempMatrix.copyToArray(matrixBuffer, i * 16);

      // Register solid collider
      this.spatialGrid.insertBox(`pole_${i}`, 'building', px - 0.3, pz - 0.3, px + 0.3, pz + 0.3, true, 1.0);
    }

    mergedPole.thinInstanceSetBuffer('matrix', matrixBuffer, 16);
  }

  /**
   * Galvanized Steel Roadside Guardrails (Gādorēru).
   */
  private spawnGuardrails(matCache: MaterialCache): void {
    const matSteel = matCache.getRetroMaterial(this.scene, 'rusted_metal', 2, 1);

    const railMesh = BABYLON.MeshBuilder.CreateBox('base_guardrail', { width: 3.8, height: 0.45, depth: 0.08 }, this.scene);
    const postL = BABYLON.MeshBuilder.CreateCylinder('post_l', { diameter: 0.1, height: 0.8 }, this.scene);
    postL.position.set(-1.4, -0.2, 0);
    postL.parent = railMesh;
    const postR = BABYLON.MeshBuilder.CreateCylinder('post_r', { diameter: 0.1, height: 0.8 }, this.scene);
    postR.position.set(1.4, -0.2, 0);
    postR.parent = railMesh;

    const mergedRail = BABYLON.Mesh.MergeMeshes([railMesh, postL, postR], true, true, undefined, false, true);
    if (!mergedRail) return;
    mergedRail.material = matSteel;
    mergedRail.parent = this.rootNode;

    // Positions along coastal highway curve and winding road
    const railTransforms: { x: number; z: number; rotY: number }[] = [];

    // Along Seawall Coastal Highway edge
    for (let x = -230; x <= 20; x += 4.0) {
      railTransforms.push({ x, z: -53.2, rotY: 0 });
    }
    for (let x = 60; x <= 230; x += 4.0) {
      railTransforms.push({ x, z: -53.2, rotY: 0 });
    }

    // Winding rural road outer curve
    for (let i = 0; i < 8; i++) {
      railTransforms.push({ x: -68.5, z: 2 - i * 4, rotY: Math.PI / 2 });
    }

    const count = railTransforms.length;
    const matrixBuffer = new Float32Array(count * 16);
    const scale = new BABYLON.Vector3(1, 1, 1);

    for (let i = 0; i < count; i++) {
      const { x, z, rotY } = railTransforms[i];
      const rot = BABYLON.Quaternion.RotationYawPitchRoll(rotY, 0, 0);
      const pos = new BABYLON.Vector3(x, 0.45, z);
      const mat = BABYLON.Matrix.Compose(scale, rot, pos);
      mat.copyToArray(matrixBuffer, i * 16);

      this.spatialGrid.insertBox(`guardrail_${i}`, 'guardrail', x - 1.9, z - 0.4, x + 1.9, z + 0.4, true, 1.0);
    }

    mergedRail.thinInstanceSetBuffer('matrix', matrixBuffer, 16);
  }

  /**
   * Convex Corner Traffic Mirrors (Kābimirā).
   */
  private spawnCornerMirrors(matCache: MaterialCache): void {
    const matOrange = matCache.getColorMaterial(this.scene, '#ea580c', '#ffffff');

    const pole = BABYLON.MeshBuilder.CreateCylinder('mirror_pole', { diameter: 0.12, height: 3.4 }, this.scene);
    const mirrorDisc = BABYLON.MeshBuilder.CreateCylinder('mirror_disc', { diameter: 0.9, height: 0.08 }, this.scene);
    mirrorDisc.rotation.x = Math.PI / 2.2;
    mirrorDisc.position.set(0, 1.6, 0.2);
    mirrorDisc.parent = pole;

    const mergedMirror = BABYLON.Mesh.MergeMeshes([pole, mirrorDisc], true, true, undefined, false, true);
    if (!mergedMirror) return;
    mergedMirror.material = matOrange;
    mergedMirror.parent = this.rootNode;

    const mirrorPositions: [number, number, number][] = [
      [-62.2, -44.5, -Math.PI / 4], // Garage road junction with coastal highway
      [-62.0, 7.5, Math.PI / 3],    // Garage driveway entrance
      [25.5, 107.0, Math.PI / 6],   // Municipal bridge west approach
      [54.5, 107.0, -Math.PI / 6],  // Municipal bridge east approach
      [132.0, 113.5, Math.PI / 4],  // Town cross street intersection
      [132.0, -45.0, 0],            // Town connector junction with coastal highway
    ];

    const count = mirrorPositions.length;
    const matrixBuffer = new Float32Array(count * 16);
    const scale = new BABYLON.Vector3(1, 1, 1);

    for (let i = 0; i < count; i++) {
      const [mx, mz, myaw] = mirrorPositions[i];
      const rot = BABYLON.Quaternion.RotationYawPitchRoll(myaw, 0, 0);
      const pos = new BABYLON.Vector3(mx, 1.7, mz);
      const mat = BABYLON.Matrix.Compose(scale, rot, pos);
      mat.copyToArray(matrixBuffer, i * 16);
      this.spatialGrid.insertBox(`mirror_${i}`, 'building', mx - 0.3, mz - 0.3, mx + 0.3, mz + 0.3, true, 1.0);
    }

    mergedMirror.thinInstanceSetBuffer('matrix', matrixBuffer, 16);
  }

  /**
   * Japanese Road Signs (Speed limit, Warning, Stop).
   */
  private spawnRoadSigns(matCache: MaterialCache): void {
    const matSignWhite = matCache.getColorMaterial(this.scene, '#f8fafc', '#ffffff');

    const signPole = BABYLON.MeshBuilder.CreateCylinder('sign_pole', { diameter: 0.08, height: 2.8 }, this.scene);
    const signDisc = BABYLON.MeshBuilder.CreateCylinder('sign_disc', { diameter: 0.65, height: 0.04 }, this.scene);
    signDisc.rotation.x = Math.PI / 2;
    signDisc.position.set(0, 1.25, 0.06);
    signDisc.parent = signPole;

    const mergedSign = BABYLON.Mesh.MergeMeshes([signPole, signDisc], true, true, undefined, false, true);
    if (!mergedSign) return;
    mergedSign.material = matSignWhite;
    mergedSign.parent = this.rootNode;

    const signPositions: [number, number][] = [
      [-70, -44], [-20, -44], [35, -44], [100, -44], [180, -44],
      [68, 114], [120, 114], [170, 114],
    ];

    const count = signPositions.length;
    const matrixBuffer = new Float32Array(count * 16);
    const tempMatrix = new BABYLON.Matrix();

    for (let i = 0; i < count; i++) {
      const [sx, sz] = signPositions[i];
      BABYLON.Matrix.TranslationToRef(sx, 1.4, sz, tempMatrix);
      tempMatrix.copyToArray(matrixBuffer, i * 16);
    }

    mergedSign.thinInstanceSetBuffer('matrix', matrixBuffer, 16);
  }

  /**
   * Japanese Illuminated Drink Vending Machines (Jidōhanbaiki).
   */
  private spawnVendingMachines(matCache: MaterialCache): void {
    const matRed = matCache.getColorMaterial(this.scene, '#dc2626', '#ffffff');

    const vmBody = BABYLON.MeshBuilder.CreateBox('vm_body', { width: 1.0, height: 1.9, depth: 0.8 }, this.scene);
    vmBody.material = matRed;
    vmBody.parent = this.rootNode;

    const vmPositions: [number, number, number][] = [
      [-61.5, 14.5, -Math.PI / 2], // Near player's garage entrance
      [151.0, 133.0, 0],           // Outside Showa Convenience Store
      [152.2, 133.0, 0],           // Second unit outside store (Blue)
      [185.0, 89.0, Math.PI],      // Gas station service island
    ];

    const count = vmPositions.length;
    const matrixBuffer = new Float32Array(count * 16);
    const scale = new BABYLON.Vector3(1, 1, 1);

    for (let i = 0; i < count; i++) {
      const [vx, vz, vyaw] = vmPositions[i];
      const rot = BABYLON.Quaternion.RotationYawPitchRoll(vyaw, 0, 0);
      const pos = new BABYLON.Vector3(vx, 0.95, vz);
      const mat = BABYLON.Matrix.Compose(scale, rot, pos);
      mat.copyToArray(matrixBuffer, i * 16);

      this.spatialGrid.insertBox(`vm_${i}`, 'building', vx - 0.6, vz - 0.5, vx + 0.6, vz + 0.5, true, 1.0);
    }

    vmBody.thinInstanceSetBuffer('matrix', matrixBuffer, 16);
  }

  /**
   * Coastal Concrete Tetrapods guarding the seawall against waves.
   */
  private spawnTetrapods(matCache: MaterialCache): void {
    const matConcrete = matCache.getRetroMaterial(this.scene, 'concrete', 2, 2);

    // Procedural Tetrapod: 4 cylindrical legs radiating outward
    const leg1 = BABYLON.MeshBuilder.CreateCylinder('leg1', { diameterBottom: 0.9, diameterTop: 0.6, height: 2.2 }, this.scene);
    const leg2 = BABYLON.MeshBuilder.CreateCylinder('leg2', { diameterBottom: 0.9, diameterTop: 0.6, height: 2.2 }, this.scene);
    leg2.rotation.z = 1.91; // ~109.5 degree tetrahedral angle
    leg2.parent = leg1;
    const leg3 = BABYLON.MeshBuilder.CreateCylinder('leg3', { diameterBottom: 0.9, diameterTop: 0.6, height: 2.2 }, this.scene);
    leg3.rotation.z = -0.95;
    leg3.rotation.y = 1.64;
    leg3.parent = leg1;
    const leg4 = BABYLON.MeshBuilder.CreateCylinder('leg4', { diameterBottom: 0.9, diameterTop: 0.6, height: 2.2 }, this.scene);
    leg4.rotation.z = -0.95;
    leg4.rotation.y = -1.64;
    leg4.parent = leg1;

    const mergedTetra = BABYLON.Mesh.MergeMeshes([leg1, leg2, leg3, leg4], true, true, undefined, false, true);
    if (!mergedTetra) return;
    mergedTetra.material = matConcrete;
    mergedTetra.parent = this.rootNode;

    // Placed in rows along the ocean side of the seawall (Z = -63)
    const tetraPositions: [number, number][] = [];
    for (let x = -240; x <= 22; x += 3.8) {
      tetraPositions.push([x, -63.5]);
      tetraPositions.push([x + 1.9, -65.2]);
    }
    for (let x = 58; x <= 240; x += 3.8) {
      tetraPositions.push([x, -63.5]);
      tetraPositions.push([x + 1.9, -65.2]);
    }

    const count = tetraPositions.length;
    const matrixBuffer = new Float32Array(count * 16);
    const scale = new BABYLON.Vector3(1, 1, 1);

    for (let i = 0; i < count; i++) {
      const [tx, tz] = tetraPositions[i];
      const rot = BABYLON.Quaternion.RotationYawPitchRoll(i * 0.7, 0.2, i * 0.4);
      const pos = new BABYLON.Vector3(tx, -1.8, tz);
      const mat = BABYLON.Matrix.Compose(scale, rot, pos);
      mat.copyToArray(matrixBuffer, i * 16);

      this.spatialGrid.insertBox(`tetra_${i}`, 'wall', tx - 1.2, tz - 1.2, tx + 1.2, tz + 1.2, true, 1.0);
    }

    mergedTetra.thinInstanceSetBuffer('matrix', matrixBuffer, 16);
  }

  /**
   * Retro low-poly Japanese pine & cedar trees.
   */
  private spawnFoliage(matCache: MaterialCache): void {
    const matTrunk = matCache.getRetroMaterial(this.scene, 'weathered_wood', 1, 3);
    const matFoliage = matCache.getRetroMaterial(this.scene, 'grass_dirt', 2, 2);

    const trunk = BABYLON.MeshBuilder.CreateCylinder('tree_trunk', { diameter: 0.5, height: 4.5 }, this.scene);
    trunk.material = matTrunk;
    trunk.parent = this.rootNode;

    const foliage = BABYLON.MeshBuilder.CreateCylinder(
      'tree_foliage',
      { diameterTop: 0.2, diameterBottom: 4.8, height: 6.2, tessellation: 7 },
      this.scene
    );
    foliage.material = matFoliage;
    foliage.parent = this.rootNode;

    // Scattered positions along mountainside, roadside verges, homestead perimeter
    const treePositions: [number, number, number][] = [
      // Behind player's house and garage
      [-105, 55, 1.1], [-95, 68, 1.2], [-75, 72, 1.3], [-115, 35, 1.0], [-108, 18, 1.1],
      // Along winding farm road
      [-52, 38, 1.0], [-42, 62, 1.15], [-18, 75, 1.2], [12, 125, 1.0],
      // River banks
      [24, 60, 1.0], [24, 150, 1.2], [24, 210, 1.1],
      [56, 50, 1.1], [56, 170, 1.2], [56, 230, 1.3],
      // Mountain background inland
      [-140, 160, 1.4], [-90, 190, 1.5], [-30, 220, 1.6], [80, 230, 1.4],
    ];

    const count = treePositions.length;
    const trunkMatrices = new Float32Array(count * 16);
    const foliageMatrices = new Float32Array(count * 16);
    const scale = new BABYLON.Vector3();

    for (let i = 0; i < count; i++) {
      const [tx, tz, s] = treePositions[i];
      scale.set(s, s, s);

      const rot = BABYLON.Quaternion.RotationYawPitchRoll(i * 0.9, 0, 0);

      // Trunk matrix
      const posTrunk = new BABYLON.Vector3(tx, 2.2 * s, tz);
      const matT = BABYLON.Matrix.Compose(scale, rot, posTrunk);
      matT.copyToArray(trunkMatrices, i * 16);

      // Foliage matrix
      const posFoliage = new BABYLON.Vector3(tx, (4.2 + 3.0) * s, tz);
      const matF = BABYLON.Matrix.Compose(scale, rot, posFoliage);
      matF.copyToArray(foliageMatrices, i * 16);

      // Register trunk collider
      this.spatialGrid.insertBox(`tree_${i}`, 'building', tx - 0.5, tz - 0.5, tx + 0.5, tz + 0.5, true, 1.0);
    }

    trunk.thinInstanceSetBuffer('matrix', trunkMatrices, 16);
    foliage.thinInstanceSetBuffer('matrix', foliageMatrices, 16);
  }

  public dispose(): void {
    this.rootNode.dispose(false, true);
  }
}
