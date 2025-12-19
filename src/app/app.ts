import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar';
import { ToastContainerDirective, ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, ToastContainerDirective],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent implements AfterViewInit, OnDestroy {
  title = 'asset-management';
  isSidebarCollapsed = false;
  isMobileSidebarVisible = false;
  isLoginRoute = false;
  private readonly destroy$ = new Subject<void>();
  @ViewChild(ToastContainerDirective, { static: true })
  toastContainer!: ToastContainerDirective;

  constructor(private toastrService: ToastrService, private router: Router) {
    this.updateLoginRoute(this.router.url);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        this.updateLoginRoute(event.urlAfterRedirects);
      });
  }

  ngAfterViewInit() {
    this.toastrService.overlayContainer = this.toastContainer;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSidebarCollapseChange(collapsed: boolean) {
    this.isSidebarCollapsed = collapsed;
  }

  toggleMobileSidebar() {
    this.isMobileSidebarVisible = !this.isMobileSidebarVisible;
  }

  closeMobileSidebar() {
    this.isMobileSidebarVisible = false;
  }

  private updateLoginRoute(url: string) {
    const path = url.split('?')[0];
    const normalized = path.startsWith('/') ? path : `/${path}`;
    this.isLoginRoute = normalized === '/login';
    if (this.isLoginRoute) {
      this.isSidebarCollapsed = false;
      this.isMobileSidebarVisible = false;
    }
  }
}

export { AppComponent as App };
