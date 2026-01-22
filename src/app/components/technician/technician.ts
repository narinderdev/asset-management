import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { DeleteModalComponent } from '../delete-modal/delete-modal';
import { ApiTechnician, TechnicianService } from '../../services/technician.service';
import { PermissionService } from '../../services/permission.service';

type Availability = 'Active' | 'On Leave' | 'Unavailable';

interface Technician {
  id: number;
  name: string;
  role: string;
  team: string;
  location: string;
  availability: Availability;
}

@Component({
  selector: 'app-technician',
  standalone: true,
  imports: [CommonModule, HttpClientModule, DeleteModalComponent],
  templateUrl: './technician.html',
  styleUrls: ['./technician.css']
})
export class TechnicianComponent implements OnInit {
  technicians: Technician[] = [];
  totalTechnicians = 0;
  currentPage = 0;
  itemsPerPage = 10;
  loading = false;
  hasLoaded = false;
  loadingRows = Array.from({ length: 5 });
  errorMessage: string | null = null;
  isDeleteModalOpen = false;
  technicianToDelete?: Technician;
  isDeleting = false;
  canCreateTechnicians = false;
  canEditTechnicians = false;
  canDeleteTechnicians = false;

  constructor(
    private readonly technicianService: TechnicianService,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.setPermissions();
    this.loadTechnicians();
  }

  private setPermissions(): void {
    this.canCreateTechnicians = this.permissionService.hasPermission('TECHNICIAN', 'CREATE');
    this.canEditTechnicians = this.permissionService.hasPermission('TECHNICIAN', 'UPDATE');
    this.canDeleteTechnicians = this.permissionService.hasPermission('TECHNICIAN', 'DELETE');
  }

  addTechnician(): void {
    if (!this.canCreateTechnicians) {
      return;
    }
    this.router.navigate(['/technicians/create']);
  }

  viewTechnician(technician: Technician): void {
    if (!technician.id) {
      return;
    }
    this.router.navigate(['/technicians/view', technician.id]);
  }

  editTechnician(technician: Technician): void {
    if (!this.canEditTechnicians) {
      return;
    }
    if (!technician.id) {
      return;
    }
    this.router.navigate(['/technicians/edit', technician.id]);
  }

  formatStatus(availability: Availability): string {
    return availability;
  }

  private loadTechnicians(): void {
    const pageIndex = Math.max(0, this.currentPage);
    this.loading = true;
    this.hasLoaded = false;
    this.errorMessage = null;

    this.technicianService
      .fetchTechnicians(pageIndex, this.itemsPerPage)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          const apiTechnicians = response.data?.technicians ?? [];
          this.technicians = apiTechnicians.map((tech) => this.mapTechnician(tech));
          this.totalTechnicians = response.data?.totalElements ?? this.technicians.length;
          const apiSize = response.data?.size;
          if (typeof apiSize === 'number' && apiSize > 0) {
            this.itemsPerPage = apiSize;
          }
          const apiPage = response.data?.page;
          if (typeof apiPage === 'number') {
            this.currentPage = apiPage;
          }
          this.hasLoaded = true;
          this.errorMessage = null;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = null;
          this.toastr.error('Unable to load technicians right now.');
          this.technicians = [];
          this.totalTechnicians = 0;
          this.hasLoaded = true;
          this.cdr.detectChanges();
        }
      });
  }

  openDeleteModal(technician: Technician): void {
    if (!this.canDeleteTechnicians) {
      return;
    }
    if (!technician.id) {
      return;
    }
    this.technicianToDelete = technician;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.technicianToDelete = undefined;
    this.isDeleting = false;
  }

  confirmDelete(): void {
    if (!this.canDeleteTechnicians || !this.technicianToDelete?.id) {
      return;
    }

    this.isDeleting = true;
    this.technicianService
      .deleteTechnician(this.technicianToDelete.id)
      .pipe(finalize(() => {
        this.isDeleting = false;
      }))
      .subscribe({
        next: () => {
          this.toastr.success('Technician deleted successfully.');
          this.loadTechnicians();
          this.closeDeleteModal();
        },
        error: () => {
          this.toastr.error('Unable to delete technician. Please try again.');
          this.closeDeleteModal();
        }
      });
  }

  private mapTechnician(apiTech: ApiTechnician): Technician {
    const teamFromMembership = apiTech.teamMemberships?.[0]?.teamName;
    return {
      id: apiTech.id ?? 0,
      name: this.extractFullName(apiTech),
      role: this.formatTechnicianType(apiTech.technicianType),
      team: teamFromMembership || apiTech.teamName || 'Unassigned',
      location: apiTech.address ?? 'N/A',
      availability: this.mapAvailability(apiTech.status)
    };
  }

  private extractFullName(apiTech: ApiTechnician): string {
    if (apiTech.fullName) {
      return apiTech.fullName;
    }

    const names = [apiTech.firstName, apiTech.lastName].filter((part) => Boolean(part));
    return names.join(' ') || 'Unnamed Technician';
  }

  private formatTechnicianType(value?: string): string {
    if (!value) {
      return 'Technician';
    }

    return value
      .split('_')
      .map((chunk) => {
        if (!chunk) {
          return '';
        }
        return chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase();
      })
      .filter(Boolean)
      .join(' ');
  }

  private mapAvailability(status?: string): Availability {
    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'ON_LEAVE':
        return 'On Leave';
      default:
        return 'Unavailable';
    }
  }

  previousPage(): void {
    if (this.currentPage > 0 && !this.loading) {
      this.currentPage -= 1;
      this.loadTechnicians();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1 && !this.loading) {
      this.currentPage += 1;
      this.loadTechnicians();
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalTechnicians / this.itemsPerPage));
  }

  get displayStart(): number {
    if (!this.totalTechnicians) {
      return 0;
    }
    return this.currentPage * this.itemsPerPage + 1;
  }

  get displayEnd(): number {
    if (!this.totalTechnicians) {
      return 0;
    }
    return Math.min((this.currentPage + 1) * this.itemsPerPage, this.totalTechnicians);
  }
}
