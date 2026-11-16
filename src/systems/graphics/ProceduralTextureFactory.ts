import * as BABYLON from '@babylonjs/core';

export type RetroTextureType =
  | 'asphalt'
  | 'concrete'
  | 'weathered_wood'
  | 'rusted_metal'
  | 'kawara_tiles'
  | 'tatami'
  | 'grass_dirt'
  | 'ocean_water';

/**
 * Generates low-resolution retro late-90s / early-2000s textures (128x128 to 256x256)
 * with sharp nearest-neighbor sampling and authentic noise/grain.
 */
export class ProceduralTextureFactory {
  /**
   * Generates a procedural texture of the requested retro type.
   *
   * @param scene Babylon scene.
   * @param type Specific texture pattern to synthesize.
   * @param size Texture resolution in pixels (default 128 for authentic retro look).
   */
  public static createTexture(
    scene: BABYLON.Scene,
    type: RetroTextureType,
    size = 128
  ): BABYLON.DynamicTexture {
    const name = `tex_procedural_${type}_${size}`;
    const dynTex = new BABYLON.DynamicTexture(
      name,
      { width: size, height: size },
      scene,
      false,
      BABYLON.Texture.NEAREST_SAMPLINGMODE
    );

    dynTex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    dynTex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;

    const ctx = dynTex.getContext() as CanvasRenderingContext2D;

    switch (type) {
      case 'asphalt':
        this.drawAsphalt(ctx, size);
        break;
      case 'concrete':
        this.drawConcrete(ctx, size);
        break;
      case 'weathered_wood':
        this.drawWeatheredWood(ctx, size);
        break;
      case 'rusted_metal':
        this.drawRustedMetal(ctx, size);
        break;
      case 'kawara_tiles':
        this.drawKawaraTiles(ctx, size);
        break;
      case 'tatami':
        this.drawTatami(ctx, size);
        break;
      case 'grass_dirt':
        this.drawGrassDirt(ctx, size);
        break;
      case 'ocean_water':
        this.drawOceanWater(ctx, size);
        break;
    }

    dynTex.update();
    return dynTex;
  }

  private static drawAsphalt(ctx: CanvasRenderingContext2D, s: number): void {
    // Base dark bitumen
    ctx.fillStyle = '#1c1f24';
    ctx.fillRect(0, 0, s, s);

    // Fine aggregate specks
    for (let i = 0; i < s * s * 0.12; i++) {
      const x = Math.floor(Math.random() * s);
      const y = Math.floor(Math.random() * s);
      const shade = Math.floor(45 + Math.random() * 55);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(x, y, 1, 1);
    }

    // Coarse gravel stones
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(Math.random() * s);
      const y = Math.floor(Math.random() * s);
      const light = Math.floor(100 + Math.random() * 60);
      ctx.fillStyle = `rgb(${light},${light},${light + 5})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  private static drawConcrete(ctx: CanvasRenderingContext2D, s: number): void {
    // Base aged gray cement
    ctx.fillStyle = '#424852';
    ctx.fillRect(0, 0, s, s);

    // Weathering noise
    for (let i = 0; i < s * s * 0.15; i++) {
      const x = Math.floor(Math.random() * s);
      const y = Math.floor(Math.random() * s);
      const shade = Math.floor(55 + Math.random() * 40);
      ctx.fillStyle = `rgb(${shade},${shade + 2},${shade + 4})`;
      ctx.fillRect(x, y, 1, 1);
    }

    // Oil / moisture stains
    ctx.fillStyle = 'rgba(25, 25, 28, 0.45)';
    ctx.beginPath();
    ctx.arc(s * 0.35, s * 0.4, s * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(s * 0.72, s * 0.65, s * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Hairline stress crack
    ctx.strokeStyle = '#22262c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s * 0.1, s * 0.85);
    ctx.lineTo(s * 0.35, s * 0.6);
    ctx.lineTo(s * 0.5, s * 0.62);
    ctx.lineTo(s * 0.75, s * 0.3);
    ctx.stroke();
  }

  private static drawWeatheredWood(ctx: CanvasRenderingContext2D, s: number): void {
    // Japanese cedar weathered gray-brown planks
    const plankHeight = Math.floor(s / 6);
    for (let p = 0; p < 6; p++) {
      const y = p * plankHeight;
      const baseBrown = 75 + ((p * 17) % 25);
      ctx.fillStyle = `rgb(${baseBrown + 10},${baseBrown},${baseBrown - 15})`;
      ctx.fillRect(0, y, s, plankHeight - 2);

      // Plank seam gap
      ctx.fillStyle = '#1c150e';
      ctx.fillRect(0, y + plankHeight - 2, s, 2);

      // Wood grain lines
      ctx.strokeStyle = `rgba(35, 25, 18, 0.35)`;
      ctx.lineWidth = 1;
      for (let g = 0; g < 4; g++) {
        const gy = y + 3 + g * 5;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(s * 0.3, gy + ((p % 2 === 0) ? 2 : -2), s * 0.7, gy - 1, s, gy + 1);
        ctx.stroke();
      }
    }
  }

  private static drawRustedMetal(ctx: CanvasRenderingContext2D, s: number): void {
    // Galvanized corrugated tin base
    const ribWidth = Math.floor(s / 8);
    for (let r = 0; r < 8; r++) {
      const x = r * ribWidth;
      const light = (r % 2 === 0) ? '#717882' : '#4b525d';
      ctx.fillStyle = light;
      ctx.fillRect(x, 0, ribWidth, s);
    }

    // Rust patches & water runoff
    for (let i = 0; i < 28; i++) {
      const rx = Math.floor(Math.random() * s);
      const ry = Math.floor(Math.random() * s);
      const rw = Math.floor(4 + Math.random() * 16);
      const rh = Math.floor(8 + Math.random() * 24);
      ctx.fillStyle = 'rgba(154, 52, 18, 0.65)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.fillStyle = 'rgba(92, 30, 10, 0.8)';
      ctx.fillRect(rx + 2, ry + 2, Math.max(1, rw - 4), Math.max(1, rh - 4));
    }
  }

  private static drawKawaraTiles(ctx: CanvasRenderingContext2D, s: number): void {
    // Traditional dark charcoal glazed Japanese ceramic roof tiles
    ctx.fillStyle = '#181b20';
    ctx.fillRect(0, 0, s, s);

    const tileH = Math.floor(s / 6);
    const tileW = Math.floor(s / 4);

    for (let row = 0; row < 6; row++) {
      const y = row * tileH;
      const xOffset = (row % 2) * (tileW / 2);

      for (let col = -1; col < 5; col++) {
        const x = col * tileW + xOffset;
        // Tile body
        ctx.fillStyle = '#282d37';
        ctx.fillRect(x + 2, y + 2, tileW - 4, tileH - 4);

        // Highlight crest (simulating cylinder wave)
        ctx.fillStyle = '#414856';
        ctx.fillRect(x + 4, y + 3, tileW - 8, 3);

        // Deep shadow at bottom of tile
        ctx.fillStyle = '#0f1115';
        ctx.fillRect(x + 1, y + tileH - 3, tileW - 2, 3);
      }
    }
  }

  private static drawTatami(ctx: CanvasRenderingContext2D, s: number): void {
    // Woven rush grass (soft olive green / straw yellow)
    ctx.fillStyle = '#a3a778';
    ctx.fillRect(0, 0, s, s);

    // Weave lines
    ctx.strokeStyle = 'rgba(110, 115, 75, 0.5)';
    ctx.lineWidth = 1;
    for (let y = 0; y < s; y += 3) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(s, y);
      ctx.stroke();
    }

    // Cloth border edge (heri) along left and right
    const borderWidth = Math.floor(s * 0.12);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, borderWidth, s);
    ctx.fillRect(s - borderWidth, 0, borderWidth, s);

    // Gold stitch on edge
    ctx.strokeStyle = '#b45309';
    ctx.strokeRect(borderWidth - 2, 0, 1, s);
    ctx.strokeRect(s - borderWidth + 1, 0, 1, s);
  }

  private static drawGrassDirt(ctx: CanvasRenderingContext2D, s: number): void {
    // Japanese countryside roadside verge (clumpy grass + dark loamy dirt)
    ctx.fillStyle = '#343a23';
    ctx.fillRect(0, 0, s, s);

    // Loam dirt specks
    for (let i = 0; i < s * s * 0.08; i++) {
      const x = Math.floor(Math.random() * s);
      const y = Math.floor(Math.random() * s);
      ctx.fillStyle = '#221e16';
      ctx.fillRect(x, y, 1, 1);
    }

    // Coarse wild grass tufts
    for (let i = 0; i < 90; i++) {
      const x = Math.floor(Math.random() * s);
      const y = Math.floor(Math.random() * s);
      ctx.fillStyle = Math.random() > 0.5 ? '#4d5731' : '#65733d';
      ctx.fillRect(x, y, 2, 3);
    }
  }

  private static drawOceanWater(ctx: CanvasRenderingContext2D, s: number): void {
    // Coastal deep blue
    ctx.fillStyle = '#17344f';
    ctx.fillRect(0, 0, s, s);

    // Wave bands
    for (let y = 0; y < s; y += 8) {
      ctx.fillStyle = '#1f486e';
      ctx.fillRect(0, y, s, 4);

      // Foam fringes
      for (let x = 0; x < s; x += 12) {
        ctx.fillStyle = '#94c2e6';
        ctx.fillRect(x + ((y * 3) % 8), y, 4, 1);
      }
    }
  }
}
