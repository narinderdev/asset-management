import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProcurementService, PurchaseRequisitionItem } from '../../services/procurement.service';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-view-procurement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './view-procurement.html',
  styleUrls: ['./view-procurement.css']
})
export class ViewProcurementComponent implements OnInit {
  mrId: string | null;
  mrState: any;
  mrDetail?: PurchaseRequisitionItem;
  isLoading = true;
  isRejectModalOpen = false;
  rejectionReason = '';
  isRejecting = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private procurementService: ProcurementService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) {
    this.mrId = route.snapshot.paramMap.get('id');
    this.mrState = this.router.getCurrentNavigation()?.extras.state?.['mr'];
  }

  ngOnInit(): void {
    if (this.mrId) {
      this.fetchDetail(this.mrId);
    } else {
      this.isLoading = false;
    }
  }

  goBack(): void {
    this.router.navigate(['/procurement']);
  }

  openReject(): void {
    if (this.isRejected) {
      return;
    }
    this.isRejectModalOpen = true;
  }

  closeReject(): void {
    this.isRejectModalOpen = false;
    this.rejectionReason = '';
    this.cdr.detectChanges();
  }

  submitReject(): void {
    if (!this.mrId) {
      return;
    }
    this.isRejecting = true;
    this.procurementService
      .rejectMr(this.mrId, {
        rejectedByUserId: 'current-user',
        reason: this.rejectionReason
      })
      .subscribe({
      next: () => {
        this.isRejecting = false;
        this.toastr.success('MR rejected successfully');
        this.closeReject();
        if (this.mrId) {
          this.fetchDetail(this.mrId);
        }
      },
      error: err => {
        console.error('Failed to reject MR', err);
        this.toastr.error('Failed to reject MR');
        this.isRejecting = false;
      }
    });
  }

  private fetchDetail(id: string): void {
    this.isLoading = true;
    this.procurementService
      .fetchMrById(id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: res => {
          this.mrDetail = res.data;
        },
        error: err => {
          console.error('Failed to load MR detail', err);
        }
      });
  }

  get isRejected(): boolean {
    const status = this.mrDetail?.status || this.mrState?.status;
    return (status || '').toLowerCase() === 'rejected';
  }

  get isApproved(): boolean {
    const status = this.mrDetail?.status || this.mrState?.status;
    return (status || '').toLowerCase() === 'approved';
  }
}
