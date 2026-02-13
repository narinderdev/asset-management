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
  isStandaloneRoute = false;
  private readonly destroy$ = new Subject<void>();
  @ViewChild(ToastContainerDirective, { static: true })
  toastContainer!: ToastContainerDirective;

  constructor(private toastrService: ToastrService, private router: Router) {
    this.updateRouteState(this.router.url);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        this.updateRouteState(event.urlAfterRedirects);
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

  private updateRouteState(url: string) {
    const path = url.split('?')[0];
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const authRoutes = ['/login', '/sign-up', '/verify-otp', '/verify-account', '/verify-authenticator', '/set-password', '/change-password'];
    this.isLoginRoute = authRoutes.includes(normalized);
    this.isStandaloneRoute = normalized.startsWith('/tm-system');
    if (this.isLoginRoute || this.isStandaloneRoute) {
      this.isSidebarCollapsed = false;
      this.isMobileSidebarVisible = false;
    }
  }
}

export { AppComponent as App };
