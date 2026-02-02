import { Component, OnDestroy, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { finalize, Subject, takeUntil } from 'rxjs';
import { TechnicianService, ApiTechnician } from '../../services/technician.service';
import { WorkOrderService } from '../../services/work-order.service';

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
  imports: [CommonModule, RouterModule, HttpClientModule],
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
    { id: 'leaves', label: 'Leaves & Holidays', icon: 'proicons_document.svg' },
    { id: 'settings', label: 'Settings', icon: 'carbon_user-role.svg' }
  ];

  readonly metrics: MetricCard[] = [
    { label: 'Total Technicians', value: 48, accent: 'blue' },
    { label: 'Available Today', value: 32, accent: 'green' },
    // { label: 'Working Today', value: 28, accent: 'orange' },
    { label: 'On Leave', value: 8, accent: 'amber' },
    { label: 'Work Orders', value: 156, accent: 'purple' }
  ];

  readonly activities: Activity[] = [
    { technician: 'John Smith', activity: 'Completed Work Order #1234', time: '10 mins ago', status: 'Completed' },
    { technician: 'Sarah Johnson', activity: 'Started Work Order #1235', time: '25 mins ago', status: 'Working' },
    { technician: 'Mike Davis', activity: 'Applied for leave', time: '1 hour ago', status: 'Pending' },
    { technician: 'Emma Wilson', activity: 'Updated availability', time: '2 hours ago', status: 'Updated' },
    { technician: 'David Brown', activity: 'Joined Team Alpha', time: '3 hours ago', status: 'Joined' }
  ];

  technicianRows: Array<{
    id: string;
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

  leaveRows = [
    { id: 'LV001', technician: 'Mike Davis', type: 'Sick Leave', from: '2026-02-10', to: '2026-02-12', reason: 'Medical checkup and recovery', status: 'Approved' },
    { id: 'LV002', technician: 'Sarah Johnson', type: 'Vacation', from: '2026-03-01', to: '2026-03-07', reason: 'Family trip', status: 'Pending' },
    { id: 'LV003', technician: 'Robert Garcia', type: 'Personal', from: '2026-02-15', to: '2026-02-16', reason: 'Personal matters', status: 'Approved' },
    { id: 'LV004', technician: 'Emma Wilson', type: 'Sick Leave', from: '2026-02-20', to: '2026-02-21', reason: 'Flu symptoms', status: 'Pending' },
    { id: 'LV005', technician: 'David Brown', type: 'Vacation', from: '2026-04-10', to: '2026-04-15', reason: 'Holiday vacation', status: 'Approved' },
    { id: 'LV006', technician: 'Lisa Anderson', type: 'Personal', from: '2026-02-25', to: '2026-02-25', reason: 'Family event', status: 'Rejected' }
  ];

  holidayRows = [
    { id: 'HD001', name: "New Year's Day", date: '2026-01-01', type: 'National', notes: 'Public holiday' },
    { id: 'HD002', name: 'Martin Luther King Jr. Day', date: '2026-01-19', type: 'National', notes: 'Federal holiday' },
    { id: 'HD003', name: 'Presidents’ Day', date: '2026-02-16', type: 'National', notes: 'Federal holiday' },
    { id: 'HD004', name: 'Company Anniversary', date: '2026-03-15', type: 'Company', notes: 'Company celebration day' },
    { id: 'HD005', name: 'Memorial Day', date: '2026-05-25', type: 'National', notes: 'Federal holiday' },
    { id: 'HD006', name: 'Independence Day', date: '2026-07-04', type: 'National', notes: 'Public holiday' },
    { id: 'HD007', name: 'Labor Day', date: '2026-09-07', type: 'National', notes: 'Federal holiday' },
    { id: 'HD008', name: 'Thanksgiving', date: '2026-11-26', type: 'National', notes: 'Federal holiday' },
    { id: 'HD009', name: 'Christmas Day', date: '2026-12-25', type: 'National', notes: 'Public holiday' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private technicianService: TechnicianService,
    private workOrderService: WorkOrderService,
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
    if (tab === 'technicians') {
      this.loadTechnicians();
    } else if (tab === 'teams') {
      this.loadTeams();
    } else if (tab === 'work-orders') {
      this.loadWorkOrders();
    }
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
              name: this.buildName(tech),
              phone: tech.phoneNumber ?? '—',
              email: tech.email ?? '—',
              team: tech.teamMemberships?.[0]?.teamName || tech.teamName || 'Unassigned',
              status: tech.status ?? 'N/A',
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
}
