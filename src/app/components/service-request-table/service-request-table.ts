import { ChangeDetectorRef, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ServiceRequestService } from '../../services/service-request.service';

export interface DashboardServiceRequestRow {
  id: string;
  apiId?: number;
  title: string;
  asset: string;
  requester: string;
  requestDate?: string | null;
  formattedRequestDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: string;
}

@Component({
  selector: 'app-service-request-table',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './service-request-table.html',
  styleUrls: ['./service-request-table.css']
})
export class ServiceRequestTable implements OnInit, OnChanges {
  @Input() requests: DashboardServiceRequestRow[] | null = null;
  @Input() loading = false;
  @Input() emptyMessage = 'No recent service requests.';

  rows: DashboardServiceRequestRow[] = [];
  hasLoaded = false;
  loadingRows = Array.from({ length: 3 });

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private serviceRequestService: ServiceRequestService
  ) {}

  ngOnInit(): void {
    this.updateRows();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['requests'] || changes['loading']) {
      this.updateRows();
    }
  }

  viewRequest(row: DashboardServiceRequestRow): void {
    const id = row.apiId ?? row.id;
    if (!id) {
      return;
    }

    this.serviceRequestService.fetchVoiceAiIntakeTranscripts().subscribe({
      error: () => {
        // Keep navigation intact even if transcript preload fails.
      }
    });

    this.router.navigate(['/service-requests/view', id]);
  }

  trackById(_: number, item: DashboardServiceRequestRow): string {
    return item.id;
  }

  private updateRows(): void {
    if (this.requests) {
      this.rows = this.requests;
      this.hasLoaded = true;
    } else {
      this.rows = [];
    }
    this.cdr.detectChanges();
  }
}
