import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxResourceSchedulerComponent } from './ngx-resource-scheduler.component';
import { DragDropModule } from '@angular/cdk/drag-drop';

@NgModule({
  imports: [
    CommonModule,
    DragDropModule
  ],
  declarations: [NgxResourceSchedulerComponent],
  exports: [NgxResourceSchedulerComponent],
})
export class NgxResourceSchedulerModule {}
