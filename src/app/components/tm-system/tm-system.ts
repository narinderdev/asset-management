import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

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
  imports: [CommonModule, RouterModule],
  templateUrl: './tm-system.html',
  styleUrls: ['./tm-system.css']
})
export class TmSystemComponent implements OnInit, OnDestroy {
  activeTab: TabId = 'dashboard';
  private readonly destroy$ = new Subject<void>();
  readonly iconPath = '/assets/icons/';

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
    { label: 'Working Today', value: 28, accent: 'orange' },
    { label: 'On Leave', value: 8, accent: 'amber' },
    { label: 'Active Work Orders', value: 156, accent: 'purple' }
  ];

  readonly activities: Activity[] = [
    { technician: 'John Smith', activity: 'Completed Work Order #1234', time: '10 mins ago', status: 'Completed' },
    { technician: 'Sarah Johnson', activity: 'Started Work Order #1235', time: '25 mins ago', status: 'Working' },
    { technician: 'Mike Davis', activity: 'Applied for leave', time: '1 hour ago', status: 'Pending' },
    { technician: 'Emma Wilson', activity: 'Updated availability', time: '2 hours ago', status: 'Updated' },
    { technician: 'David Brown', activity: 'Joined Team Alpha', time: '3 hours ago', status: 'Joined' }
  ];

  readonly technicianRows = [
    { id: 'TEC001', name: 'John Smith', phone: '+1-555-0101', email: 'john.smith@example.com', team: 'Team Alpha', status: 'Available', workingDays: 'Mon–Fri' },
    { id: 'TEC002', name: 'Sarah Johnson', phone: '+1-555-0102', email: 'sarah.j@example.com', team: 'Team Beta', status: 'Working', workingDays: 'Mon–Sat' },
    { id: 'TEC003', name: 'Mike Davis', phone: '+1-555-0103', email: 'mike.davis@example.com', team: 'Team Alpha', status: 'On leave', workingDays: 'Mon–Fri' },
    { id: 'TEC004', name: 'Emma Wilson', phone: '+1-555-0104', email: 'emma.w@example.com', team: 'Team Gamma', status: 'Available', workingDays: 'Tue–Sat' },
    { id: 'TEC005', name: 'David Brown', phone: '+1-555-0105', email: 'david.b@example.com', team: 'Team Beta', status: 'Working', workingDays: 'Mon–Fri' },
    { id: 'TEC006', name: 'Lisa Anderson', phone: '+1-555-0106', email: 'lisa.a@example.com', team: 'Team Alpha', status: 'Available', workingDays: 'Mon–Fri' },
    { id: 'TEC007', name: 'James Taylor', phone: '+1-555-0107', email: 'james.t@example.com', team: 'Team Gamma', status: 'Working', workingDays: 'Wed–Sun' },
    { id: 'TEC010', name: 'Mary Rodriguez', phone: '+1-555-0110', email: 'mary.r@example.com', team: 'Team Gamma', status: 'Available', workingDays: 'Mon–Fri' }
  ];

  readonly teamRows = [
    { id: 'TEAM001', name: 'Team Alpha', leader: 'John Smith', total: 12, activeWos: 45 },
    { id: 'TEAM002', name: 'Team Beta', leader: 'Sarah Johnson', total: 15, activeWos: 62 },
    { id: 'TEAM003', name: 'Team Gamma', leader: 'Mike Davis', total: 10, activeWos: 38 },
    { id: 'TEAM004', name: 'Team Delta', leader: 'Emma Wilson', total: 8, activeWos: 27 },
    { id: 'TEAM005', name: 'Team Epsilon', leader: 'David Brown', total: 11, activeWos: 41 },
    { id: 'TEAM006', name: 'Team Zeta', leader: 'Lisa Anderson', total: 9, activeWos: 33 }
  ];

  readonly workOrderRows = [
    { id: 'WO001', name: 'AC Repair', description: 'Air conditioning', assigned: 'John Smith / Team Alpha', priority: 'High', status: 'In Progress', dueDate: '2026-02-05' },
    { id: 'WO002', name: 'Plumbing Fix', description: 'Water leak in', assigned: 'Sarah Johnson / Team Beta', priority: 'Medium', status: 'Pending', dueDate: '2026-02-10' },
    { id: 'WO003', name: 'Electrical Inspection', description: 'Routine', assigned: 'Mike Davis / Team Alpha', priority: 'Low', status: 'Completed', dueDate: '2026-01-28' },
    { id: 'WO004', name: 'HVAC Maintenance', description: 'Quarterly', assigned: 'Emma Wilson / Team Gamma', priority: 'Medium', status: 'In Progress', dueDate: '2026-02-15' },
    { id: 'WO005', name: 'Fire Alarm Test', description: 'Testing and', assigned: 'David Brown / Team Beta', priority: 'High', status: 'Pending', dueDate: '2026-02-03' },
    { id: 'WO006', name: 'Roof Inspection', description: 'Annual roof', assigned: 'Lisa Anderson / Team Alpha', priority: 'Low', status: 'Completed', dueDate: '2026-01-25' },
    { id: 'WO007', name: 'Generator Service', description: 'Backup', assigned: 'James Taylor / Team Gamma', priority: 'Medium', status: 'In Progress', dueDate: '2026-02-08' },
    { id: 'WO008', name: 'Window Replacement', description: 'Replace', assigned: 'Jennifer Martinez / Team Beta', priority: 'High', status: 'Pending', dueDate: '2026-02-06' }
  ];

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const tab = (params.get('tab') as TabId | null) || 'dashboard';
      this.activeTab = this.isValidTab(tab) ? tab : 'dashboard';
      if (!this.isValidTab(tab)) {
        this.router.navigate(['/tm-system', this.activeTab], { replaceUrl: true });
      }
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
}
