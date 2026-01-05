/**
 * Public types for ngx-resource-scheduler
 * Keep this file framework-agnostic (no Angular imports).
 */

/** Which dimension is the top-level column grouping. */
export type PrimaryAxis = 'days' | 'resources';

/** v1 view modes (future-proofed). */
export type SchedulerView = 'custom-range'; // controlled by startDate + days

/** Resource shown in the scheduler. */
export interface SchedulerResource {
  id: string;
  title: string;

  /** Optional arbitrary metadata for the consumer. */
  data?: unknown;

  /** Optional CSS class(es) applied to the resource header/cells. */
  className?: string | string[];
}

/** Event rendered in the scheduler. */
export interface SchedulerEvent {
  id: string;
  title: string;

  /** Inclusive start date-time. */
  start: Date;

  /** Exclusive end date-time (recommended). */
  end: Date;

  /** Resource column this event belongs to. */
  resourceId: string;

  /** Optional styling helpers. */
  color?: string;
  className?: string | string[];

  /** Optional arbitrary metadata for the consumer. */
  data?: unknown;
}

/** Emitted when the user clicks an empty slot/cell in the scheduler. */
export interface SchedulerSlotClick {
  /** Clicked date-time (snapped if snapToSlot is enabled). */
  date: Date;

  /** The day bucket for the clicked cell (00:00 local/zone). */
  day: Date;

  /** Resource for the clicked cell. */
  resourceId: string;

  /** Layout info for consumers building custom UI around the scheduler. */
  primaryAxis: PrimaryAxis;

  /**
   * Identifies which primary column group was clicked.
   * - if primaryAxis === 'days': ISO date string of `day`
   * - if primaryAxis === 'resources': `resourceId`
   */
  primaryKey: string;

  /**
   * Identifies which nested column group was clicked.
   * - if primaryAxis === 'days': `resourceId`
   * - if primaryAxis === 'resources': ISO date string of `day`
   */
  secondaryKey: string;
}

/** Emitted when an event element is clicked. */
export interface SchedulerEventClick {
  event: SchedulerEvent;
  nativeEvent: MouseEvent;
}

/** Emitted when the visible time range changes (startDate/days/view). */
export interface SchedulerRangeChange {
  /** Inclusive start of visible range. */
  start: Date;

  /** Exclusive end of visible range. */
  end: Date;

  /** Number of visible days (1..7). */
  days: number;

  /** The primary axis currently in use. */
  primaryAxis: PrimaryAxis;

  /** Current view identifier (v1 uses custom-range). */
  view: SchedulerView;
}
