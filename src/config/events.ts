/**
 * Constants for event names to avoid hardcoded magic strings.
 */
export const GAME_EVENTS = {
  PART_MOUNTED: 'part:mounted',
  PART_DETACHED: 'part:detached',
  BOLT_TIGHTENED: 'bolt:tightened',
  TOOL_EQUIPPED: 'tool:equipped',

  CAR_DRIFT_START: 'car:drift_start',
  CAR_DRIFT_END: 'car:drift_end',
  CAR_COLLISION: 'car:collision',

  VITALS_DIGESTION_TICK: 'vitals:digestion_tick',
  VITALS_NITRO_BURP: 'vitals:nitro_burp',
  VITALS_TREMOR_TRIGGER: 'vitals:tremor_trigger',
  RESPECT_CHANGED: 'respect:changed',
} as const;
