import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { ServiceContractService } from '../../services/service-contract.service';

interface ServiceContract {
  contractId: string;
  contractName: string;
  vendor: string;
  startDate: string;
  endDate: string;
  coverageType: string;
  responseSla: string;
  uptimeSla: string;
  status: 'Active' | 'Expired';
}

interface ApiServiceContract {
  contractId?: string;
  contractName?: string;
  vendorName?: string;
  startDate?: string;
  endDate?: string;
  coverageType?: string;
  responseTimeSlaValue?: number;
  responseTimeSlaUnit?: string;
  uptimeSlaPercent?: number;
  status?: string;
}

@Component({
  selector: 'app-service-contract',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './service-contract.html',
  styleUrls: ['./service-contract.css']
})
export class ServiceContractComponent implements OnInit {
  contracts: ServiceContract[] = [];
  totalContracts = 0;
  currentPage = 0;
  itemsPerPage = 10;
  isLoading = false;
  errorMessage?: string;

  constructor(
    private router: Router,
    private serviceContractService: ServiceContractService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadContracts();
  }

  private loadContracts(): void {
    const pageIndex = Math.max(0, this.currentPage);
    this.isLoading = true;
    this.errorMessage = undefined;

    this.serviceContractService
      .fetchContracts(pageIndex, this.itemsPerPage)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: response => {
          const content = response.data?.content ?? [];
          this.contracts = content.map(contract => this.mapContract(contract));
          this.totalContracts = response.data?.totalElements ?? this.contracts.length;
          if (typeof response.data?.size === 'number' && response.data.size > 0) {
            this.itemsPerPage = response.data.size;
          }
          const apiPage = (response.data as any)?.page ?? (response.data as any)?.number;
          if (typeof apiPage === 'number') {
            this.currentPage = apiPage;
          }
        },
        error: () => {
          this.errorMessage = undefined;
          this.toastr.error('Unable to load service contracts. Please try again later.');
          this.contracts = [];
          this.totalContracts = 0;
        }
      });
  }

  private mapContract(data: ApiServiceContract): ServiceContract {
    return {
      contractId: data.contractId ?? '—',
      contractName: data.contractName ?? 'Unnamed Contract',
      vendor: data.vendorName ?? 'Vendor',
      startDate: this.formatDate(data.startDate),
      endDate: this.formatDate(data.endDate),
      coverageType: data.coverageType ?? 'General',
      responseSla: this.formatSla(data.responseTimeSlaValue, data.responseTimeSlaUnit),
      uptimeSla: data.uptimeSlaPercent !== undefined ? `${data.uptimeSlaPercent}%` : '—',
      status: data.status?.toLowerCase() === 'active' ? 'Active' : 'Expired'
    };
  }

  private formatDate(value?: string): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  private formatSla(value?: number, unit?: string): string {
    if (value === undefined || value === null) {
      return '—';
    }

    return `${value} ${unit ? unit.toUpperCase() : ''}`.trim();
  }

  createContract(): void {
    this.router.navigate(['/service-contracts/create']);
  }

  previousPage(): void {
    if (this.currentPage > 0 && !this.isLoading) {
      this.currentPage -= 1;
      this.loadContracts();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && !this.isLoading) {
      this.currentPage += 1;
      this.loadContracts();
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalContracts / this.itemsPerPage));
  }

  get displayStart(): number {
    if (!this.totalContracts) {
      return 0;
    }
    return this.currentPage * this.itemsPerPage + 1;
  }

  get displayEnd(): number {
    if (!this.totalContracts) {
      return 0;
    }
    return Math.min((this.currentPage + 1) * this.itemsPerPage, this.totalContracts);
  }
}
