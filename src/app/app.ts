import { AfterViewInit, Component, Inject, OnDestroy, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar';
import { ToastContainerDirective, ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { CompanySetupService } from './services/company-setup.service';
import { NavbarComponent } from './navbar/navbar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, NavbarComponent, ToastContainerDirective],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent implements AfterViewInit, OnDestroy {
  title = 'asset-management';
  isSidebarCollapsed = false;
  isMobileSidebarVisible = false;
  isLoginRoute = false;
  isStandaloneRoute = false;
  isCompanySetupRequired = false;
  private readonly destroy$ = new Subject<void>();
  private readonly isBrowser: boolean;
  @ViewChild(ToastContainerDirective, { static: true })
  toastContainer!: ToastContainerDirective;

  constructor(
    private toastrService: ToastrService,
    private router: Router,
    private companySetupService: CompanySetupService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
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
    const authRoutes = [
      '/login',
      '/sign-up',
      '/verify-otp',
      '/verify-account',
      '/verify-authenticator',
      '/set-password',
      '/forgot-password',
      '/forgot-password/verify',
      '/forgot-password/reset',
      '/change-password'
    ];
    this.isLoginRoute = authRoutes.includes(normalized);
    this.isCompanySetupRequired = this.isBrowser && this.companySetupService.isSetupRequired();
    this.isStandaloneRoute =
      normalized.startsWith('/tm-system') ||
      normalized.startsWith('/roles/create') ||
      (this.isCompanySetupRequired && normalized.startsWith('/company/create'));
    if (this.isLoginRoute || this.isStandaloneRoute) {
      this.isSidebarCollapsed = false;
      this.isMobileSidebarVisible = false;
    }
  }
}

export { AppComponent as App };

