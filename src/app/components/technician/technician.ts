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
  loading = false;
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
    this.loading = true;
    this.errorMessage = null;

    this.technicianService
      .fetchTechnicians(0, 10)
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
          this.errorMessage = null;
        },
        error: () => {
          this.errorMessage = 'Unable to load technicians right now.';
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
}
