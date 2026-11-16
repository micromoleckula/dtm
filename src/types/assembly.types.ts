/**
 * Socket and tool types required for vehicle assembly.
 */
export type SocketToolType = '10mm' | '12mm' | '14mm' | 'flathead' | 'none';

/**
 * Contract for any installable vehicle component.
 */
export interface ICarPart {
  /** Unique part identifier (e.g. 'turbocharger_t25') */
  readonly id: string;
  /** Human-readable display name */
  readonly name: string;
  /** Required tool specification for fastening bolts */
  readonly socketSize: SocketToolType;
  /** Total number of bolts needed to fully mount the part */
  readonly boltsRequired: number;
  /** Normalized tightness for each bolt in range [0.0, 1.0] */
  boltsTightened: number[];
  /** Part IDs that must be mounted before this part can be installed */
  readonly dependencies: readonly string[];
  /** Mechanical condition in percent [0.0, 100.0] */
  condition: number;
}

/**
 * Inspection status for a part currently placed on the vehicle.
 */
export interface IPartIntegrityReport {
  readonly partId: string;
  readonly isFullyMounted: boolean;
  readonly minTightness: number;
  readonly atRiskOfDetachment: boolean;
}
