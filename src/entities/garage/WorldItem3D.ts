import * as BABYLON from '@babylonjs/core';
import { IHoldableItem } from '../../types/inventory.types';
import { MeshBuilder3D } from '../../systems/graphics/MeshBuilder3D';

/**
 * 3D Interactive World Item entity (tools, car parts) resting in the garage.
 */
export class WorldItem3D {
  public readonly scene: BABYLON.Scene;
  public readonly itemData: IHoldableItem;
  public readonly mesh: BABYLON.Mesh;
  public isHighlighted: boolean = false;

  constructor(scene: BABYLON.Scene, x: number, y: number, z: number, item: IHoldableItem) {
    this.scene = scene;
    this.itemData = item;

    this.mesh = MeshBuilder3D.createItemMesh(scene, item.meshType, `item_${item.id}`);
    this.mesh.position.set(x, y, z);

    // Tag for fast raycast predicate
    this.mesh.metadata = { isWorldItem: true, entity: this };
  }

  /**
   * Toggles visual selection highlight.
   */
  public setHighlighted(highlighted: boolean): void {
    if (this.isHighlighted === highlighted) return;
    this.isHighlighted = highlighted;

    if (highlighted) {
      this.mesh.renderOutline = true;
      this.mesh.outlineColor = new BABYLON.Color3(0.2, 0.7, 1.0);
      this.mesh.outlineWidth = 0.04;
    } else {
      this.mesh.renderOutline = false;
    }
  }

  /**
   * Removes mesh from scene.
   */
  public dispose(): void {
    this.mesh.dispose(false, true);
  }
}
