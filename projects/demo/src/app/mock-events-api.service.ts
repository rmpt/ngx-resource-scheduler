import { Injectable } from '@angular/core';
import { SchedulerEvent } from 'ngx-resource-scheduler';
import { delay, map, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MockEventsApiService {

  /**
   * Simulates GET /events?start=...&end=...
   * Returns UTC instants in SchedulerEvent.start/end.
   */
  getEvents(start: Date, end: Date): Observable<SchedulerEvent[]> {
    // simulate network latency (300–900ms)
    const ms = 300 + Math.floor(Math.random() * 600);

    return of(null).pipe(
      delay(ms),
      map(() => this.buildEvents(start, end))
    );
  }

  private buildEvents(start: Date, end: Date): SchedulerEvent[] {
    // Generate deterministic-ish events based on range for repeatability
    const days = this.daysBetween(start, end);
    const base = this.startOfDayUtc(start);

    const events: SchedulerEvent[] = [];
    let idCounter = 1;

    const resourceIds = ['r1', 'r2', 'r3'];

    for (let i = 0; i < days; i++) {
      const day = this.addDaysUtc(base, i);

      // A few events per day
      events.push({
        id: `e${idCounter++}`,
        title: 'Standup',
        start: this.atUtc(day, 9, 0),
        end: this.atUtc(day, 9, 30),
        resourceId: resourceIds[i % resourceIds.length],
      });

      events.push({
        id: `e${idCounter++}`,
        title: 'Focus Block',
        start: this.atUtc(day, 10, 0),
        end: this.atUtc(day, 11, 30),
        resourceId: resourceIds[(i + 1) % resourceIds.length],
      });

      // Overlap case sometimes
      if (i % 2 === 0) {
        events.push({
          id: `e${idCounter++}`,
          title: 'Review (overlap)',
          start: this.atUtc(day, 10, 45),
          end: this.atUtc(day, 12, 0),
          resourceId: resourceIds[(i + 1) % resourceIds.length],
        });
      }

      // Late event sometimes
      if (i % 3 === 0) {
        events.push({
          id: `e${idCounter++}`,
          title: 'Late Support',
          start: this.atUtc(day, 18, 0),
          end: this.atUtc(day, 19, 0),
          resourceId: resourceIds[(i + 2) % resourceIds.length],
        });
      }
    }

    // Filter to range (paranoia)
    return events.filter(e => e.start < end && e.end > start);
  }

  // ---- UTC helpers ----
  private startOfDayUtc(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  }

  private addDaysUtc(d: Date, n: number): Date {
    const x = new Date(d);
    x.setUTCDate(x.getUTCDate() + n);
    return x;
  }

  private atUtc(dayUtc: Date, h: number, m: number): Date {
    return new Date(Date.UTC(dayUtc.getUTCFullYear(), dayUtc.getUTCMonth(), dayUtc.getUTCDate(), h, m, 0, 0));
  }

  private daysBetween(start: Date, end: Date): number {
    const s = this.startOfDayUtc(start).getTime();
    const e = this.startOfDayUtc(end).getTime();
    return Math.max(1, Math.round((e - s) / (24 * 60 * 60 * 1000)));
  }
}
