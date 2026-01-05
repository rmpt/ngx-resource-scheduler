import { Component } from '@angular/core';
import { DEMO_RESOURCES } from './demo-data.resources';
import { PrimaryAxis } from '../../../ngx-resource-scheduler/src/public-api';
import { NgxResourceSchedulerModule, SchedulerEvent, SchedulerRangeChange } from 'ngx-resource-scheduler';
import { MockEventsApiService } from './mock-events-api.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-root',
    imports: [
      CommonModule,
      NgxResourceSchedulerModule
    ],
    standalone: true,
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent {
  startDate = this.getMonday(new Date());

  resources = DEMO_RESOURCES;
  events: SchedulerEvent[] = [];

  days = 5;
  primaryAxis: PrimaryAxis = 'days';

  private lastRangeKey = '';
  loading = false;

  constructor(
    private api: MockEventsApiService
  ) {}

  toggleAxis() {
    this.primaryAxis = this.primaryAxis === 'days' ? 'resources' : 'days';
  }

  slotCliked(data: any) {
    console.log('slotCliked: ', data);
  }

  eventClicked(event: any) {
    console.log('eventClicked: ', event);
  }

  eventChanged(eventChange: any) {
    console.log('eventChanged: ', eventChange);
    this.events = this.events.map(e => e.id === eventChange.event.id ? eventChange.event : e);
  }

  rangeChanged(rangeChange: SchedulerRangeChange) {
    const key = `${rangeChange.start.toISOString()}_${rangeChange.end.toISOString()}`;
    if (key === this.lastRangeKey) return;
    this.lastRangeKey = key;

    setTimeout(() => {
      this.loading = true;

      this.api.getEvents(rangeChange.start, rangeChange.end).subscribe({
        next: (events) => (this.events = events),
        error: (err) => console.error(err),
        complete: () => (this.loading = false),
      });
    }, 0);
  }

  startDateChanged(startDateChange: any) {
    console.log('startDateChanged: ', startDateChange);
    this.startDate = startDateChange;
  }

  eventClass = (e: SchedulerEvent) => ({
    //'is-important': e.title.includes('Important');
  });

  eventStyle = (e: SchedulerEvent) => ({
    //backgroundColor: '#ffe4e6'
  });


  private getMonday(d: Date): Date {
    const x = new Date(d);
    const diff = (x.getDay() + 6) % 7; // Monday = 0
    x.setDate(x.getDate() - diff);
    x.setHours(0, 0, 0, 0);
    return x;
  }
}
