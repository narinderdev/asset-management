import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TechnicianService } from '../../services/technician.service';
import { finalize, Subject, takeUntil } from 'rxjs';

type AvailabilityStatus = 'Available' | 'Working' | 'Leave' | 'Holiday' | string;

interface AvailabilityDay {
  date: string;
  status: AvailabilityStatus;
}

interface CalendarDay {
  date: Date;
  dayNumber: number;
  status: AvailabilityStatus;
  isEmpty: boolean;
}

@Component({
  standalone: true,
  selector: 'app-technician-availability',
  templateUrl: './technician-availability.html',
  styleUrls: ['./technician-availability.css'],
  imports: [CommonModule, RouterModule]
})
export class TechnicianAvailabilityComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  technicianId?: number;
  technicianName = '';

  loading = false;
  error?: string;
  days: AvailabilityDay[] = [];
  calendarDays: CalendarDay[] = [];
  currentMonth: Date = new Date();
  isMonthlyView = true;

  readonly legend = [
    { status: 'Available', class: 'available', dot: 'available' },
    { status: 'Working', class: 'working', dot: 'working' },
    { status: 'Leave', class: 'leave', dot: 'leave' },
    { status: 'Holiday', class: 'holiday', dot: 'holiday' }
  ];

  readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly technicianService: TechnicianService,
    private readonly cdr: ChangeDetectorRef,
    private readonly zone: NgZone
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const raw = params.get('id');
      this.technicianId = raw ? Number(raw) : undefined;
      if (!this.technicianId) {
        this.error = 'Technician id is missing.';
        return;
      }
      this.fetchAvailability();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchAvailability(days = 31): void {
    if (!this.technicianId) return;
    this.loading = true;
    this.error = undefined;
    this.days = [];

    this.technicianService
      .fetchTechnicianMonthlyAvailability(this.technicianId, days)
      .pipe(finalize(() => {
        this.zone.run(() => {
          this.loading = false;
          this.cdr.detectChanges();
        });
      }))
      .subscribe({
        next: (response: any) => {
          this.zone.run(() => {
            const data = response?.data ?? response;
            const records: any[] = Array.isArray(data) ? data : data?.availability ?? [];
            this.technicianName = data?.technicianName ?? data?.technician ?? '';
            this.days = records
              .filter((r) => r?.date || r?.day)
              .map((r) => ({
                date: r.date ?? r.day,
                status: this.normalizeStatus(r.status ?? r.state ?? r.availabilityStatus)
              }));
            
            // Set current month based on first date in response
            if (this.days.length > 0) {
              this.currentMonth = new Date(this.days[0].date);
            }
            
            this.generateCalendar();
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.error = 'Unable to load availability.';
            this.cdr.detectChanges();
          });
        }
      });
  }

  generateCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    
    // Get first day of the month
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
    
    // Get last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Create a map of date strings to statuses for quick lookup
    const statusMap = new Map<string, AvailabilityStatus>();
    this.days.forEach(item => {
      statusMap.set(item.date, item.status);
    });
    
    this.calendarDays = [];
    
    // Add empty cells for days before the 1st
    for (let i = 0; i < startingDayOfWeek; i++) {
      this.calendarDays.push({
        date: new Date(),
        dayNumber: 0,
        status: '',
        isEmpty: true
      });
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const dateString = this.formatDateForAPI(currentDate);
      const status = statusMap.get(dateString) || '';
      
      this.calendarDays.push({
        date: currentDate,
        dayNumber: day,
        status: status,
        isEmpty: false
      });
    }
  }

  formatDateForAPI(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getMonthYear(): string {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' };
    return this.currentMonth.toLocaleDateString('en-US', options);
  }

  previousMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1,
      1
    );
    this.fetchAvailability();
  }

  nextMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1
    );
    this.fetchAvailability();
  }

  toggleView(isMonthly: boolean): void {
    this.isMonthlyView = isMonthly;
  }

  statusClass(status: AvailabilityStatus): string {
    if (!status) return '';
    const normalized = (status ?? '').toLowerCase();
    if (normalized.includes('available')) return 'available';
    if (normalized.includes('work')) return 'working';
    if (normalized.includes('leave')) return 'leave';
    if (normalized.includes('holiday')) return 'holiday';
    return 'unknown';
  }

  private normalizeStatus(status?: string): AvailabilityStatus {
    const normalized = (status ?? '').toLowerCase();
    if (normalized.includes('available')) return 'Available';
    if (normalized.includes('work')) return 'Working';
    if (normalized.includes('leave')) return 'Leave';
    if (normalized.includes('holiday')) return 'Holiday';
    return status || 'Available';
  }

  goBack(): void {
    this.router.navigate(['/tm-system', 'technicians']);
  }
}
