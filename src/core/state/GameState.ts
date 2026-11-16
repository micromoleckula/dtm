import { HoldableMeshType } from '../../types/inventory.types';

/**
 * Persisted snapshot of the player actor.
 */
export interface IPlayerSaveState {
  position: [number, number, number];
  facingYaw: number;
  inVehicle: boolean;
  heldItemId: string | null;
}

/**
 * Persisted state of installed car components and bolt tightness.
 */
export interface ICarPartSaveState {
  boltsTightened: number[];
  condition: number;
}

/**
 * Persisted snapshot of the project vehicle.
 */
export interface ICarSaveState {
  position: [number, number, number];
  yaw: number;
  parts: Record<string, ICarPartSaveState>;
}

/**
 * Persisted snapshot of an item lying on the ground or workbench.
 */
export interface IGroundItemSaveState {
  id: string;
  name: string;
  category: 'tool' | 'part' | 'consumable' | 'misc';
  meshType: HoldableMeshType;
  socketSize?: '10mm' | '12mm' | '14mm' | 'flathead' | 'none';
  carPartId?: string;
  position: [number, number, number];
}

/**
 * Complete serializable game state.
 */
export interface IGameState {
  version: number;
  timestamp: number;
  player: IPlayerSaveState;
  car: ICarSaveState;
  vitals: {
    digestionLevel: number;
    respect: number;
  };
  groundItems: IGroundItemSaveState[];
}
