import { Injectable } from '@angular/core';
import type { WorkOrder } from '../components/work-order-table/work-order-table';

@Injectable({
  providedIn: 'root'
})
export class NewWorkOrderHighlightService {
  private newlyCreatedWorkOrder: WorkOrder | null = null;

  set(workOrder: WorkOrder): void {
    this.newlyCreatedWorkOrder = workOrder;
  }

  consume(): WorkOrder | null {
    const value = this.newlyCreatedWorkOrder;
    this.newlyCreatedWorkOrder = null;
    return value;
  }
}

