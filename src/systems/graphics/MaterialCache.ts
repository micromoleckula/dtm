import * as BABYLON from '@babylonjs/core';
import { ProceduralTextureFactory, RetroTextureType } from './ProceduralTextureFactory';

/**
 * Global material and texture deduplication cache.
 * Avoids heavy PBR overhead by standardizing on optimized StandardMaterial
 * with sharp retro texture sampling and controlled memory lifecycle.
 */
export class MaterialCache {
  private static instance: MaterialCache | null = null;

  private readonly materials: Map<string, BABYLON.StandardMaterial> = new Map();
  private readonly textures: Map<string, BABYLON.Texture> = new Map();

  public static getInstance(): MaterialCache {
    if (!MaterialCache.instance) {
      MaterialCache.instance = new MaterialCache();
    }
    return MaterialCache.instance;
  }

  /**
   * Retrieves or creates a deduplicated StandardMaterial with solid color shading.
   */
  public getColorMaterial(
    scene: BABYLON.Scene,
    diffuseHex: string,
    specularHex = '#ffffff',
    alpha = 1.0
  ): BABYLON.StandardMaterial {
    const key = `mat_col_${diffuseHex}_${specularHex}_${alpha}`;
    let mat = this.materials.get(key);
    if (!mat) {
      mat = new BABYLON.StandardMaterial(key, scene);
      mat.diffuseColor = BABYLON.Color3.FromHexString(diffuseHex);
      mat.specularColor = BABYLON.Color3.FromHexString(specularHex);
      mat.specularPower = 32;
      mat.alpha = alpha;
      this.materials.set(key, mat);
    }
    return mat;
  }

  /**
   * Retrieves or creates a deduplicated StandardMaterial backed by a procedural retro texture.
   */
  public getRetroMaterial(
    scene: BABYLON.Scene,
    type: RetroTextureType,
    uScale = 1.0,
    vScale = 1.0,
    specularHex = '#111111'
  ): BABYLON.StandardMaterial {
    const key = `mat_retro_${type}_${uScale}_${vScale}_${specularHex}`;
    let mat = this.materials.get(key);
    if (!mat) {
      mat = new BABYLON.StandardMaterial(key, scene);
      const tex = this.getRetroTexture(scene, type);
      mat.diffuseTexture = tex;
      tex.uScale = uScale;
      tex.vScale = vScale;
      mat.specularColor = BABYLON.Color3.FromHexString(specularHex);
      mat.specularPower = 16;
      this.materials.set(key, mat);
    }
    return mat;
  }

  /**
   * Retrieves or creates a cached procedural retro texture.
   */
  public getRetroTexture(scene: BABYLON.Scene, type: RetroTextureType): BABYLON.Texture {
    const key = `tex_retro_${type}`;
    let tex = this.textures.get(key);
    if (!tex) {
      tex = ProceduralTextureFactory.createTexture(scene, type);
      this.textures.set(key, tex);
    }
    return tex;
  }

  /**
   * Disposes all cached materials and textures, freeing GPU VRAM and heap memory.
   */
  public disposeAll(): void {
    this.materials.forEach((mat) => {
      mat.dispose(false, true);
    });
    this.materials.clear();

    this.textures.forEach((tex) => {
      tex.dispose();
    });
    this.textures.clear();
  }
}
