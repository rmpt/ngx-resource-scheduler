# ngx-resource-scheduler

A lightweight, flexible **resource scheduler** for Angular.

## ✨ Features

- Days ↔ Resources as primary axis
- Configurable visible range (1–7 days)
- Configurable working hours (e.g. `08:00–20:00`)
- Timezone-aware (UTC, local, or IANA zones)
- Overlapping event layout
- Slot & event click callbacks
- Custom event rendering via `ng-template`
- Built-in toolbar **or** external navigation
- Clean, modern styling (system fonts)

## 📦 Installation

```bash
npm install ngx-resource-scheduler
````

## Live example
Test it [here](https://stackblitz.com/edit/ngx-resource-scheduler?file=src%2Fapp.component.html).

## 🚀 Basic Usage

### html
```html
<ngx-resource-scheduler
  [startDate]="startDate"
  [resources]="resources"
  [events]="events">
</ngx-resource-scheduler>
```

### TS

```ts
startDate = new Date();

resources: SchedulerResource[] = [
  { id: 'r1', title: 'Room A' },
  { id: 'r2', title: 'Room B' },
];

events: SchedulerEvent[] = [
  {
    id: 'e1',
    title: 'Meeting',
    resourceId: 'r1',
    start: new Date('2025-01-10T10:00:00Z'),
    end: new Date('2025-01-10T11:00:00Z'),
  },
];
```

## 🔧 Inputs

### Required
| Input  | Type | Type |
| ------------- | ------------- | ------------- |
| `startDate`  | Date | First visible day (recommended at 00:00) |
| `resources`  | SchedulerResource[] | List of schedulable resources
| `events`  | SchedulerEvent[] | Events (UTC instants recommended)

### Layout & Range

| Input  | Default | Description |
| ------------- | ------------- | ------------- |
| `nDays` |  `7` | Number of visible days (1–7)  |
| `primaryAxis` | `days` | `days` or `resources` |
| `dayStart` | `08:00` | Start of visible hours |
| `dayEnd` | `20:00` | End of visible hours |
| `slotDuration` | `00:30` | Slot resolution |
| `snapToSlot` | `true` | Snap clicks to slots |

### Appearance

| Input  | Default | Description |
| ------------- | ------------- | ------------- |
| `showToolbar` | `true` | Show built-in navigation toolbar |
| `showSlotLines` | `true` | Show slot grid lines |
| `slotLineStyle` | `slot` | `slot`, `hour`, or `both` |
| `readonly` | `false` | Disable interactions |
| `timezone` | `local` | `local`, `UTC`, or IANA zone (e.g. `Europe/Kiev`) |

> **Important**
>
> Events should be provided as UTC instants. The scheduler converts them for display using timezone.

## i18n

| Input | Default | Description |
| ------------- | ------------- | ------------- |
| `showDaysResourcesLabel` | `true` | If the number of days/resources should be shown |
| `todayLabel` | `Today` | Your translation for "Today" |
| `daysLabel` | `days` | Your translation for "days" |
| `resourcesLabel` | `resources` | Your translation for "resources" |
| `prevLabel` | `<` | Your translation for "<" |
| `nextLabel` | `>` | Your translation for ">" |
| `locale` | `null` | Locale to be used in the dates header |


## 🎯 Outputs

| Output  | Payload | Description |
| ------------- | ------------- | ------------- |
| `slotClick` | `SchedulerSlotClick` | User clicked an empty slot |
| `eventClick` | `SchedulerEventClick` | User clicked an event |
| `rangeChange` | `SchedulerRangeChange` | Visible date range changed |
| `startDateChange` | `Date` | Navigation occurred |
| `eventChange` | - | Under development |

## 🧭 Navigation example (External Controls)

You can hide the toolbar and control navigation from outside the scheduler.

```html
<button (click)="scheduler.prev()">Prev</button>
<button (click)="scheduler.today()">Today</button>
<button (click)="scheduler.next()">Next</button>

<ngx-resource-scheduler
  #scheduler
  [showToolbar]="false"
  [nDays]="7"
  [resources]="resources"
  [events]="events">
</ngx-resource-scheduler>
```

No date math required.

## 🎨 Custom Event Template

You can fully customize how events are rendered.

```html
<ngx-resource-scheduler
  [events]="events"
  [eventTemplate]="eventTpl">
</ngx-resource-scheduler>

<ng-template
  #eventTpl
  let-event
  let-startZoned="startZoned"
  let-endZoned="endZoned">
  <div>
    <strong>{{ event.title }}</strong>
    <div>
      {{ startZoned | date:'HH:mm' }}–{{ endZoned | date:'HH:mm' }}
    </div>
  </div>
</ng-template>
```

### Template Context

| Variable | Description |
| ------------- | ------------- |
| `event` / `$implicit` | The event |
| `startZoned` | Start date in scheduler timezone |
| `endZoned` | End date in scheduler timezone |
| `resourceId` | Resource id |
| `day` | Day of the cell |

## 🧩 Styling Events

### HTML
```html
<ngx-resource-scheduler
  [eventClass]="eventClass"
  [eventStyle]="eventStyle">
</ngx-resource-scheduler>
```

### TS
```ts
eventClass = (e) => ({
  'is-important': e.title.includes('Important'),
});

eventStyle = (e) => ({
  backgroundColor: '#ffe4e6',
});
```

> Layout styles (top, left, height, width) are managed internally and cannot be overridden.

## 📌 Notes

* Drag & resize are not included in v1 (comming to v2)
* Designed for clarity and extensibility
* No external calendar dependencies