import { SchedulerEvent } from "../types";

/**
 * INTERNAL type
 * Represents a unique scheduler grid cell.
 * Not exported in public-api.ts.
 */
export interface CellKey {
  day: Date;
  resourceId: string;
}

export type PositionedEvent = SchedulerEvent & {
  _col: number;
  _cols: number; // total columns in its overlap group
};