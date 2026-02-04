import { Component, OnDestroy, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, Subject, takeUntil, take } from 'rxjs';
import { TechnicianService, ApiTechnician } from '../../services/technician.service';
import { WorkOrderService } from '../../services/work-order.service';
import { DashboardService, TechnicianDashboardData } from '../../services/dashboard.service';
import { FormsModule } from '@angular/forms';
import { Loader } from '../loader/loader';

interface Activity {
  technician: string;
  activity: string;
  time: string;
  status: 'Completed' | 'Working' | 'Pending' | 'Updated' | 'Joined';
}

interface MetricCard {
  label: string;
  value: number;
  accent: 'blue' | 'green' | 'orange' | 'amber' | 'red' | 'purple';
}

interface NavItem {
  id: TabId;
  label: string;
  icon: string;
}

type TabId = 'dashboard' | 'technicians' | 'teams' | 'work-orders' | 'leaves' | 'settings';

@Component({
  selector: 'app-tm-system',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, FormsModule, Loader],
  templateUrl: './tm-system.html',
  styleUrls: ['./tm-system.css']
})
export class TmSystemComponent implements OnInit, OnDestroy {
  activeTab: TabId = 'dashboard';
  private readonly destroy$ = new Subject<void>();
  readonly iconPath = '/assets/icons/';

  techniciansLoading = false;
  teamsLoading = false;
  workOrdersLoading = false;

  techniciansLoaded = false;
  teamsLoaded = false;
  workOrdersLoaded = false;

  showSearch = false;
  searchPlaceholder = '';

  dashboardLoaded = false;
  dashboardLoading = false;
  dashboardError?: string;

  techPage = 0;
  techSize = 10;
  techTotal = 0;

  teamPage = 0;
  teamSize = 10;
  teamTotal = 0;

  woPage = 0;
  woSize = 10;
  woTotal = 0;

  readonly navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'radix-icons_dashboard.svg' },
    { id: 'technicians', label: 'Technician List', icon: 'tec.svg' },
    { id: 'teams', label: 'Teams', icon: 'streamline_hierarchy-10.svg' },
    { id: 'work-orders', label: 'Work Orders', icon: 'fluent-mdl2_work-flow.svg' },
    { id: 'leaves', label: 'Leaves & Holidays', icon: 'proicons_document.svg' }
  ];

  metrics: MetricCard[] = [];

  activities: Activity[] = [];

  technicianRows: Array<{
    id: string;
    dbId?: number;
    name: string;
    phone: string;
    email: string;
    team: string;
    status: string;
    workingDays: string;
  }> = [];

  teamRows: Array<{
    id: string;
    name: string;
    leader: string;
    total: number;
    activeWos: number | string;
  }> = [];

  workOrderRows: Array<{
    id: string;
    name: string;
    description: string;
    assigned: string;
    priority: string;
    status: string;
    dueDate: string;
  }> = [];

  leavesView: 'leaves' | 'holidays' = 'leaves';
  leavesLoading = false;
  leavesLoaded = false;
  holidaysLoading = false;
  holidaysLoaded = false;
  private pendingLoads = 0;
  leaveRows: Array<{ id: string; technician: string; type: string; from: string; to: string; reason: string; status: string }> = [];
  holidayRows: Array<{ id: string; name: string; date: string; type: string; notes: string }> = [];

  showHolidayModal = false;
  holidaySubmitting = false;
  holidayError?: string;
  holidayForm: { holidayName: string; holidayType: string; holidayDate: string; notes: string } = {
    holidayName: '',
    holidayType: 'NATIONAL',
    holidayDate: '',
    notes: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private technicianService: TechnicianService,
    private workOrderService: WorkOrderService,
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const tab = (params.get('tab') as TabId | null) || 'dashboard';
      this.activeTab = this.isValidTab(tab) ? tab : 'dashboard';
      if (!this.isValidTab(tab)) {
        this.router.navigate(['/tm-system', this.activeTab], { replaceUrl: true });
      }
      this.loadTabData(this.activeTab);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectTab(id: TabId) {
    if (id === this.activeTab) {
      return;
    }
    this.router.navigate(['/tm-system', id]);
    this.loadTabData(id);
  }

  get activeNav(): NavItem | undefined {
    return this.navItems.find(item => item.id === this.activeTab);
  }

  get activeLabel(): string {
    if (this.activeTab === 'dashboard') {
      return 'Dashboard';
    }
    return this.activeNav?.label ?? '';
  }

  private isValidTab(value: string): value is TabId {
    return this.navItems.some(i => i.id === value);
  }

  private loadTabData(tab: TabId): void {
    if (tab === 'dashboard') {
      this.loadDashboard();
    } else if (tab === 'technicians') {
      this.loadTechnicians();
    } else if (tab === 'teams') {
      this.loadTeams();
    } else if (tab === 'work-orders') {
      this.loadWorkOrders();
    } else if (tab === 'leaves') {
      this.holidaysLoaded = false;
      this.leavesLoaded = false;
      this.loadHolidays();
      this.loadLeaves();
    }
  }

  private loadLeaves(): void {
    if (this.leavesLoading || this.leavesLoaded) {
      return;
    }
    this.leavesLoading = true;
    this.pendingLoads++;
    this.leaveRows = [];
    this.technicianService.fetchLeaves(0, 100).pipe(
      take(1),
      finalize(() => {
        this.zone.run(() => {
          this.leavesLoading = false;
          this.leavesLoaded = true;
          this.pendingLoads = Math.max(0, this.pendingLoads - 1);
          this.cdr.detectChanges();
        });
      })
    ).subscribe({
      next: (res: any) => {
        this.zone.run(() => {
          const list = res?.data?.leaves ?? res?.data?.content ?? [];
          this.leaveRows = (list as any[]).map((l) => ({
            id: l.id?.toString() ?? l.leaveId ?? '—',
            technician: l.technicianName ?? l.technician ?? '—',
            type: l.leaveType ?? l.type ?? '—',
            from: l.fromDate ?? l.startDate ?? '—',
            to: l.toDate ?? l.endDate ?? '—',
            reason: l.reason ?? '',
            status: (l.status ?? '').toString().replace(/_/g, ' ')
          }));
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.leavesLoaded = true;
          this.cdr.detectChanges();
        });
      }
    });
  }

  private loadDashboard(): void {
    if (this.dashboardLoaded || this.dashboardLoading) {
      return;
    }
    this.dashboardLoading = true;
    this.dashboardError = undefined;
    this.dashboardService
      .fetchTechnicianDashboard()
      .pipe(
        finalize(() => {
          this.zone.run(() => {
            this.dashboardLoading = false;
            this.dashboardLoaded = true;
            this.cdr.detectChanges();
          });
        })
      )
      .subscribe({
        next: (response) => {
          this.zone.run(() => {
            const data: TechnicianDashboardData = response.data ?? {};
            const totalTechnicians = data.totalTechnicians ?? data.total_technicians ?? 0;
            const availableToday = data.availableToday ?? data.available_today ?? 0;
            const onLeave = data.onLeave ?? data.on_leave ?? 0;
            const workOrders = data.workOrders ?? data.work_orders ?? 0;

            this.metrics = [
              { label: 'Total Technicians', value: totalTechnicians, accent: 'blue' },
              { label: 'Available Today', value: availableToday, accent: 'green' },
              { label: 'On Leave', value: onLeave, accent: 'amber' },
              { label: 'Work Orders', value: workOrders, accent: 'purple' }
            ];

            const activitySource = data.recentActivities ?? data.recent_activities ?? [];
            this.activities = (activitySource ?? []).map((item) => ({
              technician: item.technician ?? (item as any).technicianName ?? (item as any).name ?? '—',
              activity: item.activity ?? (item as any).action ?? (item as any).title ?? '—',
              time: this.formatRelativeTime(item.time ?? (item as any).timeAgo ?? item.timestamp),
              status: this.normalizeActivityStatus(item.status ?? (item as any).state ?? 'Updated')
            }));

            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.dashboardError = 'Unable to load dashboard data.';
            this.metrics = [
              { label: 'Total Technicians', value: 0, accent: 'blue' },
              { label: 'Available Today', value: 0, accent: 'green' },
              { label: 'On Leave', value: 0, accent: 'amber' },
              { label: 'Work Orders', value: 0, accent: 'purple' }
            ];
            this.activities = [];
            this.cdr.detectChanges();
          });
        }
      });
  }

  private loadTechnicians(): void {
    if (this.techniciansLoaded || this.techniciansLoading) {
      return;
    }
    this.techniciansLoading = true;
    this.technicianService
      .fetchTechnicians(this.techPage, this.techSize)
      .pipe(finalize(() => {
        this.zone.run(() => {
          this.techniciansLoading = false;
          this.cdr.detectChanges();
        });
      }))
      .subscribe({
        next: (response) => {
          this.zone.run(() => {
            const list = response.data?.technicians ?? [];
            this.technicianRows = list.map((tech) => ({
              id: tech.technicianId ?? (tech.id ? `TEC${tech.id}` : '—'),
              dbId: tech.id,
              name: this.buildName(tech),
              phone: tech.phoneNumber ?? '—',
              email: tech.email ?? '—',
              team: tech.teamMemberships?.[0]?.teamName || tech.teamName || 'Unassigned',
              status: this.formatWorkStatus((tech as any)?.workStatus),
              workingDays: this.formatWorkShift(tech.workShift)
            }));
            this.techTotal = response.data?.totalElements ?? list.length;
            if (typeof response.data?.size === 'number' && response.data.size > 0) {
              this.techSize = response.data.size;
            }
            if (typeof response.data?.page === 'number') {
              this.techPage = response.data.page;
            }
            this.techniciansLoaded = true;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.technicianRows = [];
            this.techniciansLoaded = true;
            this.cdr.detectChanges();
          });
        }
      });
  }

  private loadTeams(): void {
    if (this.teamsLoaded || this.teamsLoading) {
      return;
    }
    this.teamsLoading = true;
    this.technicianService
      .fetchTechnicianTeams(this.teamPage, this.teamSize)
      .pipe(finalize(() => {
        this.zone.run(() => {
          this.teamsLoading = false;
          this.cdr.detectChanges();
        });
      }))
      .subscribe({
        next: (response) => {
          this.zone.run(() => {
            const teams = response.data?.teams ?? [];
            this.teamRows = teams.map((team) => ({
              id: team.id ? `TEAM${team.id}` : team.teamName ?? '—',
              name: team.teamName ?? '—',
              leader: team.teamLeaderName ?? '—',
              total: team.technicians?.length ?? 0,
              activeWos: '—'
            }));
            this.teamTotal = response.data?.totalElements ?? teams.length;
            if (typeof response.data?.size === 'number' && response.data.size > 0) {
              this.teamSize = response.data.size;
            }
            if (typeof response.data?.page === 'number') {
              this.teamPage = response.data.page;
            }
            this.teamsLoaded = true;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.teamRows = [];
            this.teamsLoaded = true;
            this.cdr.detectChanges();
          });
        }
      });
  }

  private formatWorkStatus(status?: string): string {
    if (!status) {
      return 'N/A';
    }
    const normalized = status.toUpperCase();
    switch (normalized) {
      case 'AVAILABLE':
        return 'Available';
      case 'WORKING':
        return 'Working';
      case 'ON_LEAVE':
      case 'ON LEAVE':
        return 'On leave';
      default:
        return status
          .toLowerCase()
          .split('_')
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(' ');
    }
  }

  private loadWorkOrders(): void {
    if (this.workOrdersLoaded || this.workOrdersLoading) {
      return;
    }
    this.workOrdersLoading = true;
    this.workOrderService
      .fetchWorkOrders(this.woPage, this.woSize)
      .pipe(finalize(() => {
        this.zone.run(() => {
          this.workOrdersLoading = false;
          this.cdr.detectChanges();
        });
      }))
      .subscribe({
        next: (response) => {
          this.zone.run(() => {
            const orders = (response as any)?.data?.workOrders ?? [];
            this.workOrderRows = orders.map((order: any) => ({
              id: order.workOrderId ?? (order.id ? `WO${order.id}` : '—'),
              name: order.woTitle ?? 'Work Order',
              description: order.descriptionScope ?? order.notes ?? '—',
              assigned: order.assignedTechnicianName ?? order.assignedTechnician ?? 'Unassigned',
              priority: this.normalizePriority(order.priority),
              status: this.normalizeStatus(order.status),
              dueDate: this.formatDate(order.targetCompletionDate ?? order.plannedEndDateTime)
            }));
            this.woTotal = (response as any)?.data?.totalElements ?? orders.length;
            const size = (response as any)?.data?.size;
            if (typeof size === 'number' && size > 0) {
              this.woSize = size;
            }
            const page = (response as any)?.data?.page;
            if (typeof page === 'number') {
              this.woPage = page;
            }
            this.workOrdersLoaded = true;
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.workOrderRows = [];
            this.workOrdersLoaded = true;
            this.cdr.detectChanges();
          });
        }
      });
  }

  private buildName(tech: ApiTechnician): string {
    if (tech.fullName) {
      return tech.fullName;
    }
    const parts = [tech.firstName, tech.lastName].filter(Boolean);
    return parts.join(' ').trim() || '—';
  }

  private normalizePriority(value?: string): string {
    switch ((value ?? '').toUpperCase()) {
      case 'HIGH':
        return 'High';
      case 'MEDIUM':
        return 'Medium';
      default:
        return 'Low';
    }
  }

  private normalizeStatus(value?: string): string {
    if (!value) {
      return 'Draft';
    }
    const words = value
      .toLowerCase()
      .split(/[_\s]+/)
      .filter(Boolean);
    if (!words.length) {
      return 'Draft';
    }
    return words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  private formatDate(value?: string | null): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  private formatRelativeTime(value?: string | null): string {
    if (!value) {
      return '—';
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      const diffMs = Date.now() - parsed.getTime();
      const minutes = Math.floor(diffMs / 60000);
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
      const days = Math.floor(hours / 24);
      return `${days} day${days === 1 ? '' : 's'} ago`;
    }
    return value;
  }

  private normalizeActivityStatus(value?: string): Activity['status'] {
    const normalized = (value ?? '').trim().toLowerCase();
    switch (normalized) {
      case 'completed':
      case 'complete':
        return 'Completed';
      case 'working':
      case 'in_progress':
      case 'in progress':
        return 'Working';
      case 'pending':
        return 'Pending';
      case 'updated':
      case 'update':
        return 'Updated';
      case 'joined':
        return 'Joined';
      default:
        return 'Updated';
    }
  }

  private formatWorkShift(value?: string | null): string {
    if (!value) {
      return '—';
    }
    return value
      .split('_')
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  setLeavesView(view: 'leaves' | 'holidays'): void {
    this.leavesView = view;
    if (view === 'holidays') {
      this.holidaysLoaded = false;
      this.loadHolidays();
    } else {
      this.leavesLoaded = false;
      this.loadLeaves();
    }
    this.cdr.detectChanges();
  }

  techTotalPages(): number {
    return Math.max(1, Math.ceil(this.techTotal / Math.max(1, this.techSize)));
  }

  teamTotalPages(): number {
    return Math.max(1, Math.ceil(this.teamTotal / Math.max(1, this.teamSize)));
  }

  woTotalPages(): number {
    return Math.max(1, Math.ceil(this.woTotal / Math.max(1, this.woSize)));
  }

  changeTechPage(delta: number): void {
    const next = this.techPage + delta;
    if (next < 0 || next >= this.techTotalPages()) return;
    this.techPage = next;
    this.techniciansLoaded = false;
    this.loadTechnicians();
  }

  changeTeamPage(delta: number): void {
    const next = this.teamPage + delta;
    if (next < 0 || next >= this.teamTotalPages()) return;
    this.teamPage = next;
    this.teamsLoaded = false;
    this.loadTeams();
  }

  changeWoPage(delta: number): void {
    const next = this.woPage + delta;
    if (next < 0 || next >= this.woTotalPages()) return;
    this.woPage = next;
    this.workOrdersLoaded = false;
    this.loadWorkOrders();
  }

  private loadHolidays(): void {
    if (this.holidaysLoading || this.holidaysLoaded) {
      return;
    }
    this.holidaysLoading = true;
    this.pendingLoads++;
    this.holidayRows = [];
    this.technicianService.fetchHolidays(0, 100).pipe(
      take(1),
      finalize(() => {
        this.zone.run(() => {
          this.holidaysLoading = false;
          this.holidaysLoaded = true;
          this.pendingLoads = Math.max(0, this.pendingLoads - 1);
          this.cdr.detectChanges();
        });
      })
    ).subscribe({
      next: (res: any) => {
        this.zone.run(() => {
          const list = res?.data?.holidays ?? [];
          this.holidayRows = (list as any[]).map((h) => ({
            id: h.id?.toString() ?? h.holidayId ?? '—',
            name: h.holidayName ?? '—',
            date: h.holidayDate ?? '—',
            type: (h.holidayType ?? '').toString().replace(/_/g, ' ').toUpperCase(),
            notes: h.notes ?? ''
          }));
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.holidaysLoaded = true;
          this.cdr.detectChanges();
        });
      }
    });
  }

  openTechnicianAvailability(dbId?: number): void {
    if (!dbId) {
      return;
    }
    this.router.navigate(['/tm-system', 'technicians', dbId, 'availability']);
  }

  openHolidayModal(): void {
    this.holidayError = undefined;
    this.holidaySubmitting = false;
    this.holidayForm = { holidayName: '', holidayType: 'NATIONAL', holidayDate: '', notes: '' };
    this.showHolidayModal = true;
    this.cdr.detectChanges();
  }

  closeHolidayModal(): void {
    this.showHolidayModal = false;
    this.holidaySubmitting = false;
    this.holidayError = undefined;
    this.cdr.detectChanges();
  }

  submitHoliday(): void {
    if (!this.holidayForm.holidayName || !this.holidayForm.holidayDate || !this.holidayForm.holidayType) {
      this.holidayError = 'Please complete all required fields.';
      this.cdr.detectChanges();
      return;
    }
    let saved = false;
    this.holidaySubmitting = true;
    this.holidayError = undefined;
    this.technicianService.createHoliday(this.holidayForm).pipe(
      take(1),
      finalize(() => {
        this.zone.run(() => {
          this.holidaySubmitting = false;
          if (saved) {
            this.closeHolidayModal();
          }
          this.cdr.detectChanges();
        });
      })
    ).subscribe({
      next: (res: any) => {
        this.zone.run(() => {
          const newHoliday = res?.data ?? res ?? {};
          const row = {
            id: newHoliday.id ?? newHoliday.holidayId ?? `HD${this.holidayRows.length + 1}`.padStart(6, '0'),
            name: newHoliday.holidayName ?? 'New Holiday',
            date: newHoliday.holidayDate ?? this.holidayForm.holidayDate,
            type: (newHoliday.holidayType || this.holidayForm.holidayType || 'National')
              .toString()
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c: string) => c.toUpperCase()),
            notes: newHoliday.notes ?? this.holidayForm.notes
          };
          this.holidayRows = [row, ...this.holidayRows];
          saved = true;
        });
      },
      error: () => {
        this.zone.run(() => {
          this.holidayError = 'Failed to save holiday. Please try again.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  exitTm(): void {
    // Navigate back to the main dashboard (outside TM module)
    this.router.navigate(['/dashboard']);
  }

  /**
   * Keep the loader scoped to the active tab so a stale flag in another tab
   * never leaves the overlay stuck on screen.
   */
  get isLoading(): boolean {
    switch (this.activeTab) {
      case 'dashboard':
        return this.dashboardLoading;
      case 'technicians':
        return this.techniciansLoading;
      case 'teams':
        return this.teamsLoading;
      case 'work-orders':
        return this.workOrdersLoading;
      case 'leaves':
        return this.leavesLoading || this.holidaysLoading || this.pendingLoads > 0;
      default:
        return false;
    }
  }
}

