import { SocketToolType } from './assembly.types';

export type ItemCategory = 'tool' | 'part' | 'consumable' | 'misc';
export type HoldableMeshType =
  | 'wrench_10mm'
  | 'wrench_12mm'
  | 'wrench_14mm'
  | 'screwdriver'
  | 'part_turbo'
  | 'part_battery';

/**
 * Contract for 3D items that can be held in hands, carried, or installed.
 */
export interface IHoldableItem {
  readonly id: string;
  readonly name: string;
  readonly category: ItemCategory;
  readonly socketSize?: SocketToolType;
  readonly carPartId?: string;
  readonly meshType: HoldableMeshType;
  readonly weight?: number;
}

/**
 * Character hands / equipped item state.
 */
export interface IHandsState {
  activeItem: IHoldableItem | null;
  reachDistance: number;
}
