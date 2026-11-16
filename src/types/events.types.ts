import { ICarPart } from './assembly.types';
import { IHoldableItem } from './inventory.types';

/**
 * Global game events map for strict event typing.
 */
export interface IGameEvents {
  // Assembly Events
  'part:mounted': { part: ICarPart };
  'part:detached': { partId: string; reason: 'vibration' | 'manual' };
  'bolt:tightened': { partId: string; boltIndex: number; tightness: number };
  'tool:equipped': { tool: string };

  // Inventory & Hands Events
  'item:picked_up': { item: IHoldableItem };
  'item:dropped': { item: IHoldableItem; x: number; y: number };

  // Vehicle & Player State Events
  'player:enter_car': { carId: string };
  'player:exit_car': { x: number; y: number };
  'car:drift_start': { intensity: number };
  'car:drift_end': void;
  'car:collision': { impactSpeed: number };

  // Vitals & Life Sim Events
  'vitals:digestion_tick': { level: number };
  'vitals:nitro_burp': { boostDurationSec: number };
  'vitals:tremor_trigger': { intensity: number };
  'respect:changed': { delta: number; current: number };
}
