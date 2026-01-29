import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkOrderService, WorkOrderType } from '../../services/work-order.service';
import { Loader } from '../loader/loader';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-view-work-order-type',
  standalone: true,
  imports: [CommonModule, Loader],
  templateUrl: './view-work-order-type.html',
  styleUrls: ['./view-work-order-type.css']
})
export class ViewWorkOrderTypeComponent implements OnInit {
  type?: WorkOrderType;
  isLoading = true;
  errorMessage?: string;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly workOrderService: WorkOrderService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'Missing work order type id.';
      this.isLoading = false;
      return;
    }
    this.load(id);
  }

  load(id: string): void {
    this.isLoading = true;
    this.workOrderService.fetchWorkOrderTypeById(id).subscribe({
      next: res => {
        this.type = res?.data ?? undefined;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to load work order type.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  back(): void {
    this.router.navigate(['/work-orders/types']);
  }
}
