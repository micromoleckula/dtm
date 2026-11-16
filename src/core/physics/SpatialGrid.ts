/**
 * Classification of static environmental colliders.
 */
export type WorldColliderType = 'road' | 'ditch' | 'bridge' | 'building' | 'guardrail' | 'wall';

/**
 * Contract for static world colliders indexed by the spatial grid.
 */
export interface IWorldCollider {
  readonly id: string;
  readonly type: WorldColliderType;
  readonly minX: number;
  readonly minZ: number;
  readonly maxX: number;
  readonly maxZ: number;
  readonly isSolid: boolean;
  readonly frictionMultiplier: number;
  /** Optional orientation for oriented bounding box checks (radians) */
  readonly yaw?: number;
  readonly centerX?: number;
  readonly centerZ?: number;
  readonly halfWidth?: number;
  readonly halfLength?: number;
  /** Internal query generation stamp to prevent duplicates without GC allocation */
  _queryStamp: number;
}

export interface ISurfaceSample {
  elevation: number;
  normalX: number;
  normalY: number;
  normalZ: number;
  surfaceType: WorldColliderType;
  inDitch: boolean;
}

/**
 * High-performance 2D spatial hash grid (32m x 32m cells).
 * Zero heap allocations during spatial queries and surface sampling through
 * pre-allocated reusable result buffers and query generation stamping.
 */
export class SpatialGrid {
  public static readonly CELL_SIZE = 32.0;
  private static readonly COORD_OFFSET = 32768;
  private static readonly MULTIPLIER = 65536;

  private readonly cells: Map<number, IWorldCollider[]> = new Map();
  private queryStamp: number = 1;

  /**
   * Pre-allocated query result buffer.
   * Access elements from index 0 to `resultCount - 1`.
   */
  public readonly results: IWorldCollider[] = new Array<IWorldCollider>(512);
  public resultCount: number = 0;

  /**
   * Pre-allocated surface sample output buffer for zero-GC ground queries.
   */
  public readonly surfaceSample: ISurfaceSample = {
    elevation: 0,
    normalX: 0,
    normalY: 1,
    normalZ: 0,
    surfaceType: 'road',
    inDitch: false,
  };

  /**
   * Computes a unique 32-bit integer key for grid cell coordinates.
   */
  public static getCellKey(cellX: number, cellZ: number): number {
    return (
      (cellX + SpatialGrid.COORD_OFFSET) * SpatialGrid.MULTIPLIER +
      (cellZ + SpatialGrid.COORD_OFFSET)
    );
  }

  /**
   * Inserts a static collider into all overlapping grid cells.
   */
  public insert(collider: IWorldCollider): void {
    const minCellX = Math.floor(collider.minX / SpatialGrid.CELL_SIZE);
    const maxCellX = Math.floor(collider.maxX / SpatialGrid.CELL_SIZE);
    const minCellZ = Math.floor(collider.minZ / SpatialGrid.CELL_SIZE);
    const maxCellZ = Math.floor(collider.maxZ / SpatialGrid.CELL_SIZE);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cz = minCellZ; cz <= maxCellZ; cz++) {
        const key = SpatialGrid.getCellKey(cx, cz);
        let list = this.cells.get(key);
        if (!list) {
          list = [];
          this.cells.set(key, list);
        }
        list.push(collider);
      }
    }
  }

  /**
   * Helper to construct and insert an axis-aligned box collider.
   */
  public insertBox(
    id: string,
    type: WorldColliderType,
    minX: number,
    minZ: number,
    maxX: number,
    maxZ: number,
    isSolid = true,
    frictionMultiplier = 1.0,
    yaw = 0
  ): IWorldCollider {
    const cx = (minX + maxX) * 0.5;
    const cz = (minZ + maxZ) * 0.5;
    const hw = Math.abs(maxX - minX) * 0.5;
    const hl = Math.abs(maxZ - minZ) * 0.5;

    const col: IWorldCollider = {
      id,
      type,
      minX,
      minZ,
      maxX,
      maxZ,
      isSolid,
      frictionMultiplier,
      yaw,
      centerX: cx,
      centerZ: cz,
      halfWidth: hw,
      halfLength: hl,
      _queryStamp: 0,
    };
    this.insert(col);
    return col;
  }

  /**
   * Queries colliders within an axis-aligned bounding box.
   * Zero heap allocations: populates `this.results` and returns count.
   *
   * @returns Number of matching colliders found in `this.results`.
   */
  public queryAABB(minX: number, minZ: number, maxX: number, maxZ: number): number {
    this.queryStamp++;
    if (this.queryStamp >= 2147483640) this.queryStamp = 1;

    this.resultCount = 0;

    const minCellX = Math.floor(minX / SpatialGrid.CELL_SIZE);
    const maxCellX = Math.floor(maxX / SpatialGrid.CELL_SIZE);
    const minCellZ = Math.floor(minZ / SpatialGrid.CELL_SIZE);
    const maxCellZ = Math.floor(maxZ / SpatialGrid.CELL_SIZE);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cz = minCellZ; cz <= maxCellZ; cz++) {
        const key = SpatialGrid.getCellKey(cx, cz);
        const list = this.cells.get(key);
        if (!list) continue;

        const len = list.length;
        for (let i = 0; i < len; i++) {
          const col = list[i];
          if (col._queryStamp === this.queryStamp) continue;
          col._queryStamp = this.queryStamp;

          // AABB overlap check
          if (
            col.minX <= maxX &&
            col.maxX >= minX &&
            col.minZ <= maxZ &&
            col.maxZ >= minZ
          ) {
            if (this.resultCount < this.results.length) {
              this.results[this.resultCount++] = col;
            }
          }
        }
      }
    }

    return this.resultCount;
  }

  /**
   * Queries colliders within a circular radius around a world point.
   * Zero heap allocations.
   *
   * @returns Number of matching colliders found in `this.results`.
   */
  public queryRadius(centerX: number, centerZ: number, radius: number): number {
    return this.queryAABB(
      centerX - radius,
      centerZ - radius,
      centerX + radius,
      centerZ + radius
    );
  }

  /**
   * Returns the highest valid walkable/drivable surface elevation (meters) at (x, z).
   * Zero heap allocations: delegates to the reusable ISurfaceSample scratch buffer.
   */
  public getSurfaceElevation(x: number, z: number): number {
    return this.getSurfaceSample(x, z).elevation;
  }

  /**
   * Deterministically samples the full ground surface record at any world (x, z).
   * Resolves garage floor, sunken inspection pit, roads, bridge decks, mizo ditches,
   * seawall/ocean and rolling terrain. Reuses `surfaceSample` so it is allocation-free.
   */
  public getSurfaceSample(x: number, z: number): ISurfaceSample {
    const s = this.surfaceSample;
    s.normalX = 0;
    s.normalY = 1;
    s.normalZ = 0;
    s.surfaceType = 'road';
    s.inDitch = false;

    // 1. Bridges over the river (X between 28 and 52)
    if (x >= 28 && x <= 52) {
      // Coastal Steel Truss Bridge (Z around -48)
      if (z >= -53.5 && z <= -42.5) {
        s.elevation = 0.08;
        s.surfaceType = 'bridge';
        return s;
      }
      // Municipal Concrete Town Bridge (Z around 110)
      if (z >= 106.0 && z <= 114.0) {
        s.elevation = 0.08;
        s.surfaceType = 'bridge';
        return s;
      }
      // If not on bridge, river channel bottom/water
      if (x >= 31 && x <= 49 && z >= -62) {
        s.elevation = -2.8;
        s.surfaceType = 'road';
        return s;
      }
    }

    // 2. Seawall & Ocean (Z <= -60)
    if (z <= -60) {
      if (z >= -61.2 && z <= -58.8 && (x < 31 || x > 49)) {
        s.elevation = 1.4; // Seawall top
        s.surfaceType = 'wall';
        return s;
      }
      s.elevation = -2.8; // Ocean water level
      s.surfaceType = 'road';
      return s;
    }

    // 3. Garage Compound & Inspection Pit (around x = -65, z = 25)
    if (x >= -71 && x <= -59 && z >= 17.5 && z <= 32.5) {
      // Sunken inspection pit in garage center
      if (x >= -65.45 && x <= -64.55 && z >= 22.9 && z <= 27.1) {
        s.elevation = -1.4; // Sunken inspection pit floor
        s.surfaceType = 'ditch';
        s.inDitch = true;
        return s;
      }
      s.elevation = 0; // Garage slab
      s.surfaceType = 'road';
      return s;
    }

    // 4. Check query colliders for roadside mizo ditches
    const count = this.queryRadius(x, z, 1.2);
    for (let i = 0; i < count; i++) {
      const col = this.results[i];
      if (col.type === 'ditch' && x >= col.minX && x <= col.maxX && z >= col.minZ && z <= col.maxZ) {
        s.elevation = -0.45; // Sunken concrete mizo ditch floor
        s.surfaceType = 'ditch';
        s.inDitch = true;
        return s;
      }
    }

    // 5. Rolling inland topography (hills in north-west, flat along roads and village)
    let baseH = 0.04; // Flat road elevation base

    // Mountainous rise inland (North: z > 80, West: x < -40)
    if (z > 40 && x < -20) {
      const inlandDist = (z - 40) * 0.02;
      const westDist = (-20 - x) * 0.02;
      const hillWave = Math.sin(x * 0.035) * Math.cos(z * 0.035);
      baseH = Math.max(0.04, inlandDist * westDist * 1.8 + hillWave * 1.2);

      // Flatten near garage road corridor
      if (x >= -75 && x <= -55 && z <= 60) {
        baseH = 0.04;
      }
    }

    s.elevation = baseH;
    return s;
  }

  /**
   * Removes all colliders and clears cell allocations.
   */
  public clear(): void {
    this.cells.clear();
    this.resultCount = 0;
  }
}
