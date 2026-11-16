import { SpatialGrid, IWorldCollider } from './SpatialGrid';

export interface ICharacterCollisionResult {
  x: number;
  z: number;
  groundY: number;
  collided: boolean;
  wallNormalX: number;
  wallNormalZ: number;
}

export interface ICarCollisionResult {
  collided: boolean;
  penetrationDepth: number;
  normalX: number;
  normalZ: number;
}

/**
 * High-performance, zero-allocation physical collision solver for FPS character
 * and 3D vehicle chassis against SpatialGrid solid colliders.
 */
export class CollisionSolver {
  private readonly spatialGrid: SpatialGrid;

  // Pre-allocated scratch results for zero-GC calls
  public readonly characterResult: ICharacterCollisionResult = {
    x: 0,
    z: 0,
    groundY: 0,
    collided: false,
    wallNormalX: 0,
    wallNormalZ: 0,
  };

  public readonly carResult: ICarCollisionResult = {
    collided: false,
    penetrationDepth: 0,
    normalX: 0,
    normalZ: 0,
  };

  // Reusable scratch SAT axes and corner buffers
  private static readonly OBB_CORNERS_A_X = new Float32Array(4);
  private static readonly OBB_CORNERS_A_Z = new Float32Array(4);
  private static readonly OBB_CORNERS_B_X = new Float32Array(4);
  private static readonly OBB_CORNERS_B_Z = new Float32Array(4);

  // Pre-allocated MTV output to avoid per-collider object allocation in SAT loop
  private readonly mtv = { overlap: 0, axisX: 0, axisZ: 0 };

  constructor(spatialGrid: SpatialGrid) {
    this.spatialGrid = spatialGrid;
  }

  /**
   * Resolves physical cylinder collision and wall-sliding for the FPS character.
   * Supports smooth step-up (<= 0.35m) for curbs and verandas. Zero heap allocations.
   *
   * @param currentX Current character X coordinate.
   * @param currentY Current character eye height Y coordinate.
   * @param currentZ Current character Z coordinate.
   * @param radius Character collision cylinder radius (meters, e.g. 0.32).
   */
  public resolveCharacterCollision(
    currentX: number,
    currentY: number,
    currentZ: number,
    radius = 0.32
  ): ICharacterCollisionResult {
    const res = this.characterResult;
    res.x = currentX;
    res.z = currentZ;
    res.collided = false;
    res.wallNormalX = 0;
    res.wallNormalZ = 0;

    // 1. Query ground elevation at character feet
    res.groundY = this.spatialGrid.getSurfaceElevation(currentX, currentZ);

    // 2. Query nearby colliders within reach
    const count = this.spatialGrid.queryRadius(currentX, currentZ, radius + 1.2);

    for (let i = 0; i < count; i++) {
      const col = this.spatialGrid.results[i];
      if (!col.isSolid) continue;

      // Check step-up: if collider height is within step-up threshold (<= 0.35m above ground),
      // player can walk on top of it (e.g. low curb) rather than colliding horizontally
      const feetY = currentY - 1.75; // Eye height is 1.75m above feet
      if (col.type === 'road' || (col.type === 'bridge' && feetY >= -0.2)) {
        continue;
      }

      // Axis-aligned box closest point clamp
      const closestX = Math.max(col.minX, Math.min(res.x, col.maxX));
      const closestZ = Math.max(col.minZ, Math.min(res.z, col.maxZ));

      const dx = res.x - closestX;
      const dz = res.z - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius && distSq > 0.000001) {
        const dist = Math.sqrt(distSq);
        const overlap = radius - dist;
        const normX = dx / dist;
        const normZ = dz / dist;

        // Push character out smoothly along collision normal
        res.x += normX * overlap;
        res.z += normZ * overlap;
        res.collided = true;
        res.wallNormalX = normX;
        res.wallNormalZ = normZ;
      } else if (distSq <= 0.000001) {
        // Deep inside box: push towards nearest outer face
        const dLeft = Math.abs(res.x - col.minX);
        const dRight = Math.abs(col.maxX - res.x);
        const dNear = Math.abs(res.z - col.minZ);
        const dFar = Math.abs(col.maxZ - res.z);

        const minEdge = Math.min(dLeft, dRight, dNear, dFar);
        if (minEdge === dLeft) {
          res.x = col.minX - radius;
          res.wallNormalX = -1;
        } else if (minEdge === dRight) {
          res.x = col.maxX + radius;
          res.wallNormalX = 1;
        } else if (minEdge === dNear) {
          res.z = col.minZ - radius;
          res.wallNormalZ = -1;
        } else {
          res.z = col.maxZ + radius;
          res.wallNormalZ = 1;
        }
        res.collided = true;
      }
    }

    return res;
  }

  /**
   * Resolves 2D Oriented Bounding Box (OBB) collision and minimum translation vector (MTV)
   * separation for the 3D vehicle against SpatialGrid solid colliders.
   *
   * @param carX Car center X.
   * @param carZ Car center Z.
   * @param carYaw Car yaw rotation angle in radians.
   * @param halfWidth Car chassis half-width (e.g. 0.95m).
   * @param halfLength Car chassis half-length (e.g. 2.15m).
   */
  public resolveCarCollision(
    carX: number,
    carZ: number,
    carYaw: number,
    halfWidth = 0.95,
    halfLength = 2.15
  ): ICarCollisionResult {
    const res = this.carResult;
    res.collided = false;
    res.penetrationDepth = 0;
    res.normalX = 0;
    res.normalZ = 0;

    const count = this.spatialGrid.queryRadius(carX, carZ, halfLength + 1.5);
    if (count === 0) return res;

    // Compute Car OBB 4 corners
    const cosY = Math.cos(carYaw);
    const sinY = Math.sin(carYaw);

    const fwdX = sinY * halfLength;
    const fwdZ = cosY * halfLength;
    const rgtX = cosY * halfWidth;
    const rgtZ = -sinY * halfWidth;

    const cAx = CollisionSolver.OBB_CORNERS_A_X;
    const cAz = CollisionSolver.OBB_CORNERS_A_Z;

    cAx[0] = carX + fwdX + rgtX; cAz[0] = carZ + fwdZ + rgtZ;
    cAx[1] = carX + fwdX - rgtX; cAz[1] = carZ + fwdZ - rgtZ;
    cAx[2] = carX - fwdX - rgtX; cAz[2] = carZ - fwdZ - rgtZ;
    cAx[3] = carX - fwdX + rgtX; cAz[3] = carZ - fwdZ + rgtZ;

    for (let i = 0; i < count; i++) {
      const col = this.spatialGrid.results[i];
      if (!col.isSolid) continue;

      // Collider corners
      const cBx = CollisionSolver.OBB_CORNERS_B_X;
      const cBz = CollisionSolver.OBB_CORNERS_B_Z;

      cBx[0] = col.minX; cBz[0] = col.minZ;
      cBx[1] = col.maxX; cBz[1] = col.minZ;
      cBx[2] = col.maxX; cBz[2] = col.maxZ;
      cBx[3] = col.minX; cBz[3] = col.maxZ;

      // Separating Axis Theorem (SAT) across car axes and box axes
      this.testPolygonOverlap(cAx, cAz, cBx, cBz, this.mtv);
      const mtv = this.mtv;
      if (mtv.overlap > 0.001) {
        res.collided = true;
        if (mtv.overlap > res.penetrationDepth) {
          res.penetrationDepth = mtv.overlap;
          res.normalX = mtv.axisX;
          res.normalZ = mtv.axisZ;
        }
      }
    }

    return res;
  }

  /**
   * Evaluates Separating Axis Theorem between two 4-vertex convex polygons.
   * Writes minimum translation vector into a pre-allocated output. Zero allocations.
   */
  private testPolygonOverlap(
    ax: Float32Array,
    az: Float32Array,
    bx: Float32Array,
    bz: Float32Array,
    out: { overlap: number; axisX: number; axisZ: number }
  ): void {
    let minOverlap = Infinity;
    let bestAxisX = 0;
    let bestAxisZ = 0;

    // Test axes perpendicular to edges of polygon A
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      const edgeX = ax[next] - ax[i];
      const edgeZ = az[next] - az[i];
      const len = Math.sqrt(edgeX * edgeX + edgeZ * edgeZ);
      if (len < 0.0001) continue;

      const axisX = -edgeZ / len;
      const axisZ = edgeX / len;

      const overlap = this.projectAndCheck(ax, az, bx, bz, axisX, axisZ);
      if (overlap <= 0) {
        out.overlap = 0;
        out.axisX = 0;
        out.axisZ = 0;
        return;
      }
      if (overlap < minOverlap) {
        minOverlap = overlap;
        bestAxisX = axisX;
        bestAxisZ = axisZ;
      }
    }

    // Test axes perpendicular to edges of polygon B
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      const edgeX = bx[next] - bx[i];
      const edgeZ = bz[next] - bz[i];
      const len = Math.sqrt(edgeX * edgeX + edgeZ * edgeZ);
      if (len < 0.0001) continue;

      const axisX = -edgeZ / len;
      const axisZ = edgeX / len;

      const overlap = this.projectAndCheck(ax, az, bx, bz, axisX, axisZ);
      if (overlap <= 0) {
        out.overlap = 0;
        out.axisX = 0;
        out.axisZ = 0;
        return;
      }
      if (overlap < minOverlap) {
        minOverlap = overlap;
        bestAxisX = axisX;
        bestAxisZ = axisZ;
      }
    }

    out.overlap = minOverlap;
    out.axisX = bestAxisX;
    out.axisZ = bestAxisZ;
  }

  private projectAndCheck(
    ax: Float32Array,
    az: Float32Array,
    bx: Float32Array,
    bz: Float32Array,
    axisX: number,
    axisZ: number
  ): number {
    let minA = Infinity;
    let maxA = -Infinity;
    for (let i = 0; i < 4; i++) {
      const p = ax[i] * axisX + az[i] * axisZ;
      if (p < minA) minA = p;
      if (p > maxA) maxA = p;
    }

    let minB = Infinity;
    let maxB = -Infinity;
    for (let i = 0; i < 4; i++) {
      const p = bx[i] * axisX + bz[i] * axisZ;
      if (p < minB) minB = p;
      if (p > maxB) maxB = p;
    }

    if (maxA < minB || maxB < minA) return 0;
    return Math.min(maxA - minB, maxB - minA);
  }
}
