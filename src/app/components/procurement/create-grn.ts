import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { CreateGrnPayload, ProcurementService } from '../../services/procurement.service';

interface GrnLine {
  poLineId: string;
  receivedQty: number;
}

@Component({
  selector: 'app-create-grn',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-grn.html',
  styleUrls: ['./create-procurement.css']
})
export class CreateGrnComponent {
  isSubmitting = false;
  form = {
    poId: '',
    receivedByUserId: '',
    notes: ''
  };

  lines: GrnLine[] = [
    { poLineId: '', receivedQty: 0 }
  ];

  constructor(
    private procurementService: ProcurementService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  addLine(): void {
    this.lines.push({ poLineId: '', receivedQty: 0 });
  }

  removeLine(index: number): void {
    if (this.lines.length === 1) {
      this.lines[0] = { poLineId: '', receivedQty: 0 };
      return;
    }
    this.lines.splice(index, 1);
  }

  submit(): void {
    const payload: CreateGrnPayload = {
      poId: Number(this.form.poId) || 0,
      receivedByUserId: this.form.receivedByUserId,
      notes: this.form.notes || undefined,
      lines: this.lines.map(line => ({
        poLineId: Number(line.poLineId) || 0,
        receivedQty: Number(line.receivedQty) || 0
      }))
    };

    if (!payload.poId || !payload.receivedByUserId || !payload.lines.length) {
      return;
    }

    this.isSubmitting = true;
    this.procurementService.createGrn(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/procurement/goods-receipts']);
      },
      error: err => {
        console.error('Failed to create GRN', err);
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/procurement/goods-receipts']);
  }
}
