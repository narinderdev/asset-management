import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard';
import { AssetsComponent } from './components/assets/assets';
import { AddAssetComponent } from './components/add-asset/add-asset';
import { ServiceRequestsComponent } from './components/service-requests/service-requests';
import { CreateServiceRequestComponent } from './components/service-requests/create-service-request';
import { WorkOrderManagementComponent } from './components/work-order/work-order';
import { CreateWorkOrderComponent } from './components/work-order/create-work-order';
import { PreventiveMaintenanceComponent } from './components/preventive-maintenance/preventive-maintenance';
import { CreatePreventiveMaintenanceComponent } from './components/preventive-maintenance/create-preventive-maintenance';
import { ViewPreventiveMaintenanceComponent } from './components/preventive-maintenance/view-preventive-maintenance';
import { InventoryComponent } from './components/inventory/inventory';
import { CreateInventoryComponent } from './components/inventory/create-inventory';
import { VendorManagementComponent } from './components/vendor-management/vendor-management';
import { CreateVendorComponent } from './components/vendor-management/create-vendor';
import { ViewVendorComponent } from './components/vendor-management/view-vendor';
import { ViewInventoryComponent } from './components/inventory/view-inventory';
import { ProcurementComponent } from './components/procurement/procurement';
import { CreateProcurementComponent } from './components/procurement/create-procurement';
import { ServiceContractComponent } from './components/service-contract/service-contract';
import { CreateServiceContractComponent } from './components/service-contract/create-service-contract';
import { FailureCodeComponent } from './components/failure-code/failure-code';
import { CreateFailureCodeComponent } from './components/failure-code/create-failure-code';
import { ViewAssetComponent } from './components/view-asset/view-asset';
import { ViewServiceRequestComponent } from './components/view-service-request/view-service-request';
import { ViewWorkOrderComponent } from './components/view-work-order/view-work-order';
import { TechnicianComponent } from './components/technician/technician';
import { CreateTechnicianComponent } from './components/technician/create-technician';
import { ViewTechnicianComponent } from './components/technician/view-technician';
import { TechnicianTeamsComponent } from './components/technician/technician-teams';
import { CreateTechnicianTeamComponent } from './components/technician/create-technician-team';
import { ViewTechnicianTeamComponent } from './components/technician/view-technician-team';
import { LoginComponent } from './components/login/login';
import { SignUpComponent } from './components/sign-up/sign-up';
import { RolesComponent } from './components/roles/roles';
import { ViewProcurementComponent } from './components/procurement/view-procurement';
import { VerifyOtpComponent } from './components/verify-otp/verify-otp';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent },
  { path: 'sign-up', component: SignUpComponent },
  { path: 'verify-otp', component: VerifyOtpComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'assets/add-asset', component: AddAssetComponent, canActivate: [AuthGuard] },
  { path: 'assets/add-asset/:tab', component: AddAssetComponent, canActivate: [AuthGuard] },
  { path: 'assets', component: AssetsComponent, canActivate: [AuthGuard] },
  { path: 'assets/view/:id', component: ViewAssetComponent, canActivate: [AuthGuard] },
  { path: 'service-requests/create', component: CreateServiceRequestComponent, canActivate: [AuthGuard] },
  { path: 'service-requests/edit/:id', component: CreateServiceRequestComponent, canActivate: [AuthGuard] },
  { path: 'service-requests/view/:id', component: ViewServiceRequestComponent, canActivate: [AuthGuard] },
  { path: 'service-requests', component: ServiceRequestsComponent, canActivate: [AuthGuard] },
  { path: 'work-orders/create', component: CreateWorkOrderComponent, canActivate: [AuthGuard] },
  { path: 'work-orders/edit/:id', component: CreateWorkOrderComponent, canActivate: [AuthGuard] },
  { path: 'work-orders/view/:id', component: ViewWorkOrderComponent, canActivate: [AuthGuard] },
  { path: 'work-orders', component: WorkOrderManagementComponent, canActivate: [AuthGuard] },
  { path: 'technicians', component: TechnicianComponent, canActivate: [AuthGuard] },
  { path: 'technicians/create', component: CreateTechnicianComponent, canActivate: [AuthGuard] },
  { path: 'technicians/edit/:id', component: CreateTechnicianComponent, canActivate: [AuthGuard] },
  { path: 'technicians/view/:id', component: ViewTechnicianComponent, canActivate: [AuthGuard] },
  { path: 'technicians/teams/create', component: CreateTechnicianTeamComponent, canActivate: [AuthGuard] },
  { path: 'technicians/teams/edit/:id', component: CreateTechnicianTeamComponent, canActivate: [AuthGuard] },
  { path: 'technicians/teams/view/:id', component: ViewTechnicianTeamComponent, canActivate: [AuthGuard] },
  { path: 'technicians/teams', component: TechnicianTeamsComponent, canActivate: [AuthGuard] },
  { path: 'preventive-maintenance', component: PreventiveMaintenanceComponent, canActivate: [AuthGuard] },
  { path: 'preventive-maintenance/create', component: CreatePreventiveMaintenanceComponent, canActivate: [AuthGuard] },
  { path: 'preventive-maintenance/edit/:id', component: CreatePreventiveMaintenanceComponent, canActivate: [AuthGuard] },
  { path: 'preventive-maintenance/view/:id', component: ViewPreventiveMaintenanceComponent, canActivate: [AuthGuard] },
  { path: 'inventory', component: InventoryComponent, canActivate: [AuthGuard] },
  { path: 'inventory/create', component: CreateInventoryComponent, canActivate: [AuthGuard] },
  { path: 'inventory/edit/:id', component: CreateInventoryComponent, canActivate: [AuthGuard] },
  { path: 'inventory/view/:id', component: ViewInventoryComponent, canActivate: [AuthGuard] },
  { path: 'vendor-management', component: VendorManagementComponent, canActivate: [AuthGuard] },
  { path: 'vendor-management/create', component: CreateVendorComponent, canActivate: [AuthGuard] },
  { path: 'vendor-management/edit/:id', component: CreateVendorComponent, canActivate: [AuthGuard] },
  { path: 'vendor-management/view/:id', component: ViewVendorComponent, canActivate: [AuthGuard] },
  { path: 'procurement', component: ProcurementComponent, canActivate: [AuthGuard] },
  { path: 'procurement/material-requisitions', component: ProcurementComponent, canActivate: [AuthGuard] },
  { path: 'procurement/purchase-orders', component: ProcurementComponent, canActivate: [AuthGuard] },
  { path: 'procurement/goods-receipts', component: ProcurementComponent, canActivate: [AuthGuard] },
  { path: 'procurement/create', component: CreateProcurementComponent, canActivate: [AuthGuard] },
  { path: 'procurement/view/:id', component: ViewProcurementComponent, canActivate: [AuthGuard] },
  { path: 'service-contracts', component: ServiceContractComponent, canActivate: [AuthGuard] },
  { path: 'service-contracts/create', component: CreateServiceContractComponent, canActivate: [AuthGuard] },
  { path: 'failure-codes', component: FailureCodeComponent, canActivate: [AuthGuard] },
  { path: 'failure-codes/create', component: CreateFailureCodeComponent, canActivate: [AuthGuard] },
  { path: 'roles-permissions', component: RolesComponent, canActivate: [AuthGuard] }
];
