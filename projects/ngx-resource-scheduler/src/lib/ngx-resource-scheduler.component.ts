import {
  Component,
  ChangeDetectionStrategy,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  TemplateRef,
} from '@angular/core';

import {
  PrimaryAxis,
  SchedulerEvent,
  SchedulerEventClick,
  SchedulerRangeChange,
  SchedulerResource,
  SchedulerSlotClick,
  SchedulerView,
} from './types';

import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { PositionedEvent } from './internal/types-internal';


@Component({
    selector: 'ngx-resource-scheduler',
    templateUrl: './ngx-resource-scheduler.component.html',
    styleUrls: ['./ngx-resource-scheduler.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class NgxResourceSchedulerComponent implements OnChanges {
  // --- REQUIRED ---
  @Input() startDate!: Date; // first visible day (00:00 recommended)
  @Input() resources: SchedulerResource[] = [];
  @Input() events: SchedulerEvent[] = [];

  // --- FLEXIBILITY ---
  @Input() nDays: number = 7; // clamp [1..7]
  @Input() primaryAxis: PrimaryAxis = 'days';

  // --- TIME WINDOW (vertical) ---
  @Input() dayStart: string = '08:00'; // HH:mm
  @Input() dayEnd: string = '20:00';   // HH:mm
  @Input() slotDuration: string = '00:30'; // HH:mm (grid resolution)
  @Input() snapToSlot: boolean = true;

  @Input() showSlotLines: boolean = true;
  @Input() slotLineStyle: 'slot' | 'hour' | 'both' = 'slot';

  // NAVIGATION
  @Input() showToolbar: boolean = true;
  @Input() prevLabel: string = '‹';
  @Input() nextLabel: string = '›';
  private lastRangeKey: string | null = null;  

  // CUSTOM STYLING
  @Input() eventTemplate?: TemplateRef<SchedulerEventTemplateContext>;
  @Input() eventClass?: (e: PositionedEvent) => string | string[] | Set<string> | { [klass: string]: any };
  @Input() eventStyle?: (e: PositionedEvent) => { [k: string]: any };
  @Input() primaryHeaderTemplate?: TemplateRef<SchedulerHeaderTemplateContext>;
  @Input() secondaryHeaderTemplate?: TemplateRef<SchedulerHeaderTemplateContext>;
  @Input() todayColor?: string;

  // i18n
  @Input() showDaysResourcesLabel: boolean = true;
  @Input() daysLabel: string = 'days';
  @Input() resourcesLabel: string = 'resources';
  @Input() todayLabel: string = 'Today';

  // --- MISC ---
  @Input() locale?: string;
  @Input() timezone?: 'local' | 'UTC' | string; // IANA Time Zone Identifier
  @Input() readonly: boolean = false;

  // --- OUTPUTS ---
  @Output() slotClick = new EventEmitter<SchedulerSlotClick>();
  @Output() eventClick = new EventEmitter<SchedulerEventClick>();
  @Output() eventChange = new EventEmitter<any>();
  @Output() rangeChange = new EventEmitter<SchedulerRangeChange>();
  @Output() startDateChange = new EventEmitter<Date>();

  // --- INTERNAL LAYOUT CONSTANTS ---
  readonly pxPerMinute = 2; // 120px per hour
  readonly todayDate = new Date();

  // --- COMPUTED ---
  visibleDays: Date[] = [];
  primaryColumns: PrimaryColumn[] = [];
  secondaryColumns: SecondaryColumn[] = [];

  dayStartMinutes = 8 * 60;
  dayEndMinutes = 20 * 60;
  slotMinutes = 30;

  ngOnChanges(_: SimpleChanges): void {
    this.recompute();
  }

  // ---------- PUBLIC METHODS ---------

  /** Navigate by one "page" (nDays) backward */
  public prev(): void {
    this.navigatePrev();
  }

  /** Navigate by one "page" (nDays) forward */
  public next(): void {
    this.navigateNext();
  }

  /** Go to today (start of day) */
  public today(): void {
    this.navigateToday();
  }

  /** Programmatically set the visible start date */
  public goToDate(d: Date): void {
    this.setStartDate(this.startOfDay(d));
  }

  // ---------- TEMPLATE HELPERS ----------

  get timelineHeightPx(): number {
    return Math.max(0, (this.dayEndMinutes - this.dayStartMinutes) * this.pxPerMinute);
  }

  get hourLabels(): number[] {
    const startH = Math.floor(this.dayStartMinutes / 60);
    const endH = Math.floor(this.dayEndMinutes / 60);

    const hours: number[] = [];
    for (let h = startH; h <= endH; h++) hours.push(h);
    return hours;
  }

  get slotLines(): Array<{ top: number; isHalfHour: boolean }> {
    if (!this.showSlotLines) return [];

    const spanMin = this.dayEndMinutes - this.dayStartMinutes;
    if (spanMin <= 0 || this.slotMinutes <= 0) return [];

    const lines: Array<{ top: number; isHalfHour: boolean }> = [];
    for (let m = 0; m <= spanMin; m += this.slotMinutes) {
      const absoluteMin = this.dayStartMinutes + m;

      // true at hh:30 exactly (e.g., 08:30, 09:30, ...)
      const isHalfHour = absoluteMin % 60 === 30;

      lines.push({
        top: m * this.pxPerMinute,
        isHalfHour,
      });
    }
    return lines;
  }

  get hourLineOffsetsPx(): number[] {
    const spanMin = this.dayEndMinutes - this.dayStartMinutes;
    if (spanMin <= 0) return [];

    const offsets: number[] = [];
    const firstHourMin = Math.ceil(this.dayStartMinutes / 60) * 60;

    for (let m = firstHourMin; m <= this.dayEndMinutes; m += 60) {
      offsets.push((m - this.dayStartMinutes) * this.pxPerMinute);
    }
    // Also include the top edge at 0 for a clean line
    offsets.unshift(0);

    return offsets;
  }

  get rangeTitle(): string {
    if (!this.visibleDays.length) return '';

    const start = this.visibleDays[0];
    const end = this.visibleDays[this.visibleDays.length - 1];

    const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

    if (this.visibleDays.length === 1) {
      return start.toLocaleDateString(this.locale, { weekday: 'short', ...opts });
    }

    if (sameMonth) {
      const month = start.toLocaleDateString(this.locale, { month: 'short' });
      return `${month} ${start.getDate()}–${end.getDate()}`;
    }

    return `${start.toLocaleDateString(this.locale, opts)} – ${end.toLocaleDateString(this.locale, opts)}`;
  }

  /**
   * Returns events that intersect a given (day, resource) cell.
   */
  eventsForCell(day: Date, resourceId: string): PositionedEvent[] {
    const { startUtc, endUtc } = this.windowBoundsUtc(day);

  const list = this.events
    .filter((e) =>
      e.resourceId === resourceId &&
      e.start < endUtc &&
      e.end > startUtc
    )
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  return this.layoutOverlaps(list);
  }

  /**
   * CSS positioning for an event within a day cell.
   */
  styleForEvent(e: PositionedEvent, day: Date): { [k: string]: string } {
    const { startUtc: windowStartUtc, endUtc: windowEndUtc } = this.windowBoundsUtc(day);

    // If event doesn't intersect visible window, don't render it
    if (e.end <= windowStartUtc || e.start >= windowEndUtc) {
      return { display: 'none' };
    }

    const start = new Date(Math.max(e.start.getTime(), windowStartUtc.getTime()));
    const end = new Date(Math.min(e.end.getTime(), windowEndUtc.getTime()));

    const topMin = (start.getTime() - windowStartUtc.getTime()) / 60000;
    const durMin = Math.max(10, (end.getTime() - start.getTime()) / 60000);

    // overlap columns (same as you already have)
    const gapPx = 6;
    const cols = Math.max(1, e._cols);
    const col = Math.max(0, e._col);

    const widthExpr = `calc(${100 / cols}% - ${gapPx}px)`;
    const leftExpr = `calc(${(100 * col) / cols}% + ${gapPx / 2}px)`;

    return {
      top: `${topMin * this.pxPerMinute}px`,
      height: `${durMin * this.pxPerMinute}px`,
      width: widthExpr,
      left: leftExpr,
      right: 'auto',
    };
  }

  onEventClick(e: SchedulerEvent, mouse: MouseEvent) {
    this.eventClick.emit({ event: e, nativeEvent: mouse });
  }

  onCellClick(day: Date, resourceId: string, mouse: MouseEvent) {
    if (this.readonly) return;

    const clickedDate = this.computeClickedTime(day, mouse);
    const primaryKey = this.primaryAxis === 'days' ? this.dayKey(day) : resourceId;
    const secondaryKey = this.primaryAxis === 'days' ? resourceId : this.dayKey(day);

    this.slotClick.emit({
      date: clickedDate,
      day: this.startOfDay(day),
      resourceId,
      primaryAxis: this.primaryAxis,
      primaryKey,
      secondaryKey,
    });
  }

  cellDayKey(p:any,s:any): string {
    return this.dayKey(this.resolveCellDay(p,s));
  }

  cellResourceId(p:any,s:any): string {
    return this.resolveCellResourceId(p,s);
  }

  resolveCellResourceId(p: any, s: any): string {
    return this.primaryAxis === 'days' ? s.resource.id : p.resource.id;
  }

  resolveCellResource(p: any, s: any): SchedulerResource {
    return this.primaryAxis === 'days' ? s.resource : p.resource;
  }

  cellEvents(p: any, s: any): PositionedEvent[] {
    const day = this.resolveCellDay(p, s);
    const resourceId = this.resolveCellResourceId(p, s);
    return this.eventsForCell(day, resourceId); // now PositionedEvent[]
  }

  cellClick(p: any, s: any, ev: MouseEvent) {
    const day = this.resolveCellDay(p, s);
    const resourceId = this.resolveCellResourceId(p, s);
    this.onCellClick(day, resourceId, ev);
  }

  getEventLayoutStyle(e: PositionedEvent, p: any, s: any) {
    const day = this.resolveCellDay(p, s);

    const layout = this.styleForEvent(e, day); // contains top/height/left/width
    const userStyle = this.eventStyle ? this.eventStyle(e) : null;

    // IMPORTANT: layout must win so users can’t break positioning
    return userStyle ? { ...userStyle, ...layout } : layout;
  }

  getTodayBackgroundColor(primary: Column, secondary: Column): string | undefined {
    const isToday = this.isToday(primary, secondary);
    const finalColor = this.isValidCssColor(this.todayColor) ? this.todayColor : '#fffadf';
    console.log('final color', finalColor);
    return isToday ? finalColor : undefined;
  }

  isToday(primary: Column, secondary: Column) {
    const dateColumn = primary.kind == 'day' ? primary : secondary;
    const columnDay = (dateColumn as any).day as Date;
    return this.compareYMD(this.todayDate, columnDay);
  }

  // ---------- INTERNAL COMPUTATION ----------

  private windowBoundsUtc(day: Date): { startUtc: Date; endUtc: Date } {
    const base = this.startOfDay(day);

    // wall-clock dates for "day at HH:mm" (fields matter)
    const wallStart = this.setTime(base, this.dayStartMinutes);
    const wallEnd = this.setTime(base, this.dayEndMinutes);

    if (!this.timezone || this.timezone === 'local') {
      // interpreted as device local instants
      return { startUtc: wallStart, endUtc: wallEnd };
    }

    if (this.timezone === 'UTC') {
      // build true UTC instants for the wall clock
      const y = base.getFullYear();
      const m = base.getMonth();
      const d = base.getDate();

      const sH = Math.floor(this.dayStartMinutes / 60);
      const sM = this.dayStartMinutes % 60;
      const eH = Math.floor(this.dayEndMinutes / 60);
      const eM = this.dayEndMinutes % 60;

      return {
        startUtc: new Date(Date.UTC(y, m, d, sH, sM, 0, 0)),
        endUtc: new Date(Date.UTC(y, m, d, eH, eM, 0, 0)),
      };
    }

    // IANA timezone: wall-clock in zone -> UTC instant
    return {
      startUtc: fromZonedTime(wallStart, this.timezone),
      endUtc: fromZonedTime(wallEnd, this.timezone),
    };
  }

  private assignColumns(cluster: SchedulerEvent[]): PositionedEvent[] {
    // columnsEndTimes[col] = endTime of last event in that col
    const columnsEndTimes: number[] = [];
    const out: PositionedEvent[] = [];

    for (const e of cluster) {
      const s = e.start.getTime();
      const en = e.end.getTime();

      // Find first available column
      let col = 0;
      for (; col < columnsEndTimes.length; col++) {
        if (s >= columnsEndTimes[col]) break;
      }

      if (col === columnsEndTimes.length) columnsEndTimes.push(en);
      else columnsEndTimes[col] = en;

      out.push({ ...e, _col: col, _cols: 0 });
    }

    const totalCols = columnsEndTimes.length;
    // write total columns for all events in this cluster
    for (const pe of out) pe._cols = totalCols;

    return out;
  }

  private emitRangeIfChanged(payload: SchedulerRangeChange) {
    const key = `${payload.start.toISOString()}|${payload.end.toISOString()}|${payload.primaryAxis}|${payload.days}`;
    if (key === this.lastRangeKey) return;
    this.lastRangeKey = key;
    queueMicrotask(() => this.rangeChange.emit(payload));
  }

  private setStartDate(d: Date) {
    this.startDate = d;
    this.recompute();
    this.startDateChange.emit(d);
  }

  // Computes clicked time from y offset within a cell (very handy for creating events)
  private computeClickedTime(day: Date, mouse: MouseEvent): Date {
    const target = mouse.currentTarget as HTMLElement | null;
    if (!target || typeof (target as any).getBoundingClientRect !== 'function') {
      return this.setTime(this.startOfDay(day), this.dayStartMinutes);
    }

    const rect = target.getBoundingClientRect();
    const y = mouse.clientY - rect.top;

    const minutesFromStart = Math.max(0, Math.min(this.dayEndMinutes - this.dayStartMinutes, y / this.pxPerMinute));
    let snapped = minutesFromStart;

    if (this.snapToSlot && this.slotMinutes > 0) {
      snapped = Math.round(minutesFromStart / this.slotMinutes) * this.slotMinutes;
    }

    const totalMinutes = this.dayStartMinutes + snapped;
    return this.setTime(this.startOfDay(day), totalMinutes);
  }

  private layoutOverlaps(events: SchedulerEvent[]): PositionedEvent[] {
    // Sweep through events, grouping overlapping "clusters"
    const positioned: PositionedEvent[] = [];

    let cluster: SchedulerEvent[] = [];
    let clusterEnd = -Infinity;

    const flushCluster = () => {
      if (cluster.length === 0) return;
      positioned.push(...this.assignColumns(cluster));
      cluster = [];
      clusterEnd = -Infinity;
    };

    for (const e of events) {
      const s = e.start.getTime();
      const en = e.end.getTime();

      if (cluster.length === 0) {
        cluster = [e];
        clusterEnd = en;
        continue;
      }

      // If this event starts after cluster ends, it's a new cluster
      if (s >= clusterEnd) {
        flushCluster();
        cluster = [e];
        clusterEnd = en;
        continue;
      }

      // Still overlapping cluster
      cluster.push(e);
      if (en > clusterEnd) clusterEnd = en;
    }

    flushCluster();
    return positioned;
  }
  
  private resolveCellDay(p: any, s: any): Date {
    return this.primaryAxis === 'days' ? p.day : s.day;
  }

  private recompute() {
    // Clamp days
    const d = Math.max(1, Math.min(7, Math.floor(this.nDays || 7)));

    // Parse times
    this.dayStartMinutes = this.parseHmToMinutes(this.dayStart, 8 * 60);
    this.dayEndMinutes = this.parseHmToMinutes(this.dayEnd, 20 * 60);
    if (this.dayEndMinutes <= this.dayStartMinutes) {
      // fallback to a sane window
      this.dayEndMinutes = this.dayStartMinutes + 10 * 60;
    }

    this.slotMinutes = this.parseHmToMinutes(this.slotDuration, 30);
    if (this.slotMinutes <= 0) this.slotMinutes = 30;

    // Visible days
    const start = this.startOfDay(this.startDate ?? new Date());
    this.visibleDays = Array.from({ length: d }, (_, i) => this.addDays(start, i));

    // Columns
    if (this.primaryAxis === 'days') {
      this.primaryColumns = this.visibleDays.map((day) => ({
        kind: 'day',
        day,
        key: this.dayKey(day),
        title: this.formatDay(day),
      }));

      this.secondaryColumns = this.resources.map((r) => ({
        kind: 'resource',
        resource: r,
        key: r.id,
        title: r.title,
      }));
    } else {
      this.primaryColumns = this.resources.map((r) => ({
        kind: 'resource',
        resource: r,
        key: r.id,
        title: r.title,
      }));

      this.secondaryColumns = this.visibleDays.map((day) => ({
        kind: 'day',
        day,
        key: this.dayKey(day),
        title: this.formatDay(day),
      }));
    }

    // Emit range
    const rangeStart = start;
    const rangeEnd = this.addDays(start, d);
    const view: SchedulerView = 'custom-range';


    this.emitRangeIfChanged({
      start: rangeStart,
      end: rangeEnd,
      days: d,
      primaryAxis: this.primaryAxis,
      view,
    });
  }

  // ------------- NAVIGATION -------------

  navigatePrev() {
    const next = this.addDays(this.startOfDay(this.startDate ?? new Date()), -this.normalizedDays());
    this.setStartDate(next);
  }

  navigateNext() {
    const next = this.addDays(this.startOfDay(this.startDate ?? new Date()), this.normalizedDays());
    this.setStartDate(next);
  }

  navigateToday() {
    const today = this.startOfDay(new Date());
    this.setStartDate(today);
  }

  // ---------- DATE/TIME UTILS ----------

  formatHour(h: number): string {
    return `${String(h).padStart(2, '0')}:00`;
  }

  hourTopPx(h: number): number {
    const minutes = (h * 60) - this.dayStartMinutes;
    return minutes * this.pxPerMinute;
  }

  isIanaTz(): boolean {
    return !!this.timezone && this.timezone !== 'local' && this.timezone !== 'UTC';
  }

  toDisplayZone(dUtc: Date): Date {
    if (this.timezone === 'UTC') return new Date(dUtc);
    if (this.timezone === 'local' || !this.timezone) return new Date(dUtc);

    // Converts a UTC instant to a Date whose wall-clock matches the IANA zone
    return toZonedTime(dUtc, this.timezone);
  }

  fromDisplayZone(dZoned: Date): Date {
    if (this.timezone === 'UTC') return new Date(dZoned);
    if (this.timezone === 'local' || !this.timezone) return new Date(dZoned);

    // Converts a wall-clock-in-zone Date back to a UTC instant
    return fromZonedTime(dZoned, this.timezone);
  }

  private parseHmToMinutes(hm: string, fallback: number): number {
    const m = /^(\d{1,2}):(\d{2})$/.exec((hm || '').trim());
    if (!m) return fallback;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return fallback;
    return Math.max(0, Math.min(24 * 60, hh * 60 + mm));
  }

  private startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  private addDays(d: Date, n: number): Date {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  private setTime(day: Date, minutes: number): Date {
    const x = new Date(day);
    const hh = Math.floor(minutes / 60);
    const mm = minutes % 60;
    x.setHours(hh, mm, 0, 0);
    return x;
  }

  private dayKey(d: Date): string {
    // Use YYYY-MM-DD (stable key) instead of full ISO with timezone offsets
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private formatDay(d: Date): string {
    return d.toLocaleDateString(this.locale, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  private normalizedDays(): number {
    const v = Math.floor(this.nDays ?? 7);
    return Math.max(1, Math.min(7, v));
  }

  private compareYMD(a: Date, b: Date) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&   // 0-based
      a.getDate() === b.getDate()
    );
  }

  // ------------- EVENT TOOLTIP -------------

  eventTooltip(e: SchedulerEvent): string {
    const start = this.toDisplayZone(e.start);
    const end = this.toDisplayZone(e.end);
    const startStr = start.toLocaleTimeString(this.locale, { hour: '2-digit', minute: '2-digit' });
    const endStr = end.toLocaleTimeString(this.locale, { hour: '2-digit', minute: '2-digit' });

    // keep it short so the native tooltip looks good
    return `${e.title}\n${startStr}–${endStr}`;
  }

  // ------------- CUSTOM EVENT STYLING -----------

  eventTemplateCtx(e: PositionedEvent, p: any, s: any): SchedulerEventTemplateContext {
    const day = this.resolveCellDay(p, s);
    const resourceId = this.resolveCellResourceId(p, s);
    return {
      $implicit: e,
      event: e,
      startZoned: this.toDisplayZone(e.start),
      endZoned: this.toDisplayZone(e.end),
      resourceId,
      day,
    };
  }

  headerTemplateCtx(
    col: PrimaryColumn | SecondaryColumn,
    axis: 'primary' | 'secondary',
    index: number
  ): SchedulerHeaderTemplateContext {
    const base = {
      $implicit: col,
      col,
      kind: col.kind,
      title: col.title,
      axis,
      index,
      primaryAxis: this.primaryAxis,
    } as SchedulerHeaderTemplateContext;

    if (col.kind === 'day') {
      return {
        ...base,
        day: col.day,
        dayKey: col.key,
      };
    }

    return {
      ...base,
      resource: col.resource,
      resourceId: col.resource.id,
    };
  }

  private isValidCssColor(value?: string): boolean {
    if (!value) return false;

    const s = new Option().style;
    s.color = value;

    console.log('is valid color', value, s.color);
    return s.color !== '';
  }

  // ------------- TRACK BYS -------------
  
  trackPrimary = (_: number, c: PrimaryColumn) => c.key;
  trackSecondary = (_: number, c: SecondaryColumn) => c.key;
  trackEvent = (_: number, e: SchedulerEvent) => e.id;
}

type Column =
  | { kind: 'day'; day: Date; key: string; title: string }
  | { kind: 'resource'; resource: SchedulerResource; key: string; title: string };

type PrimaryColumn = Column;
type SecondaryColumn = Column;

export interface SchedulerEventTemplateContext {
  $implicit: PositionedEvent; // allows: let-event
  event: PositionedEvent;
  startZoned: Date;
  endZoned: Date;
  resourceId: string;
  day: Date;
}

export interface SchedulerHeaderTemplateContext {
  /** The column being rendered (either day or resource) */
  $implicit: PrimaryColumn | SecondaryColumn;   // allows: let-col
  col: PrimaryColumn | SecondaryColumn;

  /** Convenience fields so consumers don't have to switch on kind */
  kind: 'day' | 'resource';
  title: string;

  // present only when kind === 'day'
  day?: Date;
  dayKey?: string;

  // present only when kind === 'resource'
  resource?: SchedulerResource;
  resourceId?: string;

  /** Positioning info */
  axis: 'primary' | 'secondary';
  index: number;

  /** Current scheduler axis mode (days vs resources primary) */
  primaryAxis: PrimaryAxis;
}