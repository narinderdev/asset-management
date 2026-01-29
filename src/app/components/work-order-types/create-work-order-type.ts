import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { WorkOrderService, WorkOrderType } from '../../services/work-order.service';
import { ToastrService } from 'ngx-toastr';
import { Loader } from '../loader/loader';

@Component({
  selector: 'app-create-work-order-type',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Loader],
  templateUrl: './create-work-order-type.html',
  styleUrls: ['./create-work-order-type.css']
})
export class CreateWorkOrderTypeComponent {
  form!: FormGroup;

  isSubmitting = false;

  costTreatmentOptions = ['CAPEX', 'OPEX'];

  constructor(
    private fb: FormBuilder,
    private workOrderService: WorkOrderService,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.form = this.createForm();
  }

  private createForm() {
    return this.fb.group({
      workOrderType: ['', Validators.required],
      costTreatment: ['CAPEX', Validators.required],
      defaultGlAccount: [''],
      defaultUtilityAccount: [''],
      laborGlAccount: [''],
      laborUtilityAccount: [''],
      inventoryGlAccount: [''],
      inventoryUtilityAccount: [''],
      active: [true]
    });
  }

  onCancel(): void {
    this.router.navigate(['/work-orders/types']);
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }
    const payload: WorkOrderType = {
      ...(this.form.value as WorkOrderType)
    };

    this.isSubmitting = true;
    this.workOrderService.createWorkOrderType(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toastr.success('Work order type created');
        this.router.navigate(['/work-orders/types']);
      },
      error: () => {
        this.isSubmitting = false;
        this.toastr.error('Failed to create work order type');
      }
    });
  }
}
