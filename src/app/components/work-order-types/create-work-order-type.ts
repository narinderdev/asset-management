import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkOrderService, WorkOrderType } from '../../services/work-order.service';
import { ToastrService } from 'ngx-toastr';
import { Loader } from '../loader/loader';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-create-work-order-type',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Loader],
  templateUrl: './create-work-order-type.html',
  styleUrls: ['./create-work-order-type.css']
})
export class CreateWorkOrderTypeComponent implements OnInit {
  form!: FormGroup;

  isSubmitting = false;
  isLoading = false;
  isEdit = false;
  currentId?: number | string;

  costTreatmentOptions = ['CAPEX', 'OPEX'];

  constructor(
    private fb: FormBuilder,
    private workOrderService: WorkOrderService,
    private router: Router,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.createForm();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.currentId = id;
      this.loadExisting(id);
    }
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

  private loadExisting(id: number | string): void {
    this.isLoading = true;
    this.workOrderService.fetchWorkOrderTypeById(id).pipe(
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: res => {
        const payload = res?.data;
        if (payload) {
          this.form.patchValue({
            workOrderType: payload.workOrderType ?? '',
            costTreatment: payload.costTreatment ?? 'CAPEX',
            defaultGlAccount: payload.defaultGlAccount ?? '',
            defaultUtilityAccount: payload.defaultUtilityAccount ?? '',
            laborGlAccount: payload.laborGlAccount ?? '',
            laborUtilityAccount: payload.laborUtilityAccount ?? '',
            inventoryGlAccount: payload.inventoryGlAccount ?? '',
            inventoryUtilityAccount: payload.inventoryUtilityAccount ?? '',
            active: payload.active ?? true
          });
          this.cdr.detectChanges();
        } else {
          this.toastr.error('Work order type not found');
          this.router.navigate(['/work-orders/types']);
        }
      },
      error: () => {
        this.toastr.error('Unable to load work order type');
        this.router.navigate(['/work-orders/types']);
      }
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
    const request$ = this.isEdit && this.currentId
      ? this.workOrderService.updateWorkOrderType(this.currentId, payload)
      : this.workOrderService.createWorkOrderType(payload);

    request$
      .pipe(finalize(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.toastr.success(this.isEdit ? 'Work order type updated' : 'Work order type created');
          this.router.navigate(['/work-orders/types']);
        },
        error: () => {
          this.toastr.error(this.isEdit ? 'Failed to update work order type' : 'Failed to create work order type');
        }
      });
  }
}
