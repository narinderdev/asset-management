import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard';
import { AssetsComponent } from './components/assets/assets';
import { AddAssetComponent } from './components/add-asset/add-asset';
import { AssetTypesComponent } from './components/asset-types/asset-types';
import { ServiceRequestsComponent } from './components/service-requests/service-requests';
import { CreateServiceRequestComponent } from './components/service-requests/create-service-request';
import { WorkOrderManagementComponent } from './components/work-order/work-order';
import { CreateWorkOrderComponent } from './components/work-order/create-work-order';
import { PreventiveMaintenanceComponent } from './components/preventive-maintenance/preventive-maintenance';
import { CreatePreventiveMaintenanceComponent } from './components/preventive-maintenance/create-preventive-maintenance';
import { ViewPreventiveMaintenanceComponent } from './components/preventive-maintenance/view-preventive-maintenance';
import { InventoryComponent } from './components/inventory/inventory';
import { CreateInventoryComponent } from './components/inventory/create-inventory';
import { WarehouseComponent } from './components/inventory/warehouse';
import { CreateWarehouseComponent } from './components/inventory/create-warehouse';
import { ViewWarehouseComponent } from './components/inventory/view-warehouse';
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
import { UsersComponent } from './components/users';
import { SetPasswordComponent } from './components/set-password/set-password';
import { PurchaseOrdersComponent } from './components/procurement/purchase-orders';
import { ViewPurchaseOrderComponent } from './components/procurement/view-purchase-order';
import { GoodsReceiptsComponent } from './components/procurement/goods-receipts';
import { ViewGoodsReceiptComponent } from './components/procurement/view-goods-receipt';
import { CreatePurchaseOrderComponent } from './components/procurement/create-purchase-order';
import { CreateGrnComponent } from './components/procurement/create-grn';
import { CreatePredictiveMaintenanceComponent } from './components/predictive-maintenance/create-predictive-maintenance';
import { ViewPredictiveMaintenanceComponent } from './components/predictive-maintenance/view-predictive-maintenance';
import { CreateEmergencyMaintenanceComponent } from './components/emergency-maintenance/create-emergency-maintenance';
import { ViewEmergencyMaintenanceComponent } from './components/emergency-maintenance/view-emergency-maintenance';
import { CreateAssetTypeComponent } from './components/asset-types/create-asset-type';
import { ViewAssetTypeComponent } from './components/asset-types/view-asset-type';
import { WorkOrderTypesComponent } from './components/work-order-types/work-order-types';
import { CreateWorkOrderTypeComponent } from './components/work-order-types/create-work-order-type';
import { ViewWorkOrderTypeComponent } from './components/work-order-types/view-work-order-type';
import { TmSystemComponent } from './components/tm-system/tm-system';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent },
  { path: 'sign-up', component: SignUpComponent },
  { path: 'verify-otp', component: VerifyOtpComponent },
  { path: 'set-password', component: SetPasswordComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'assets/add-asset', component: AddAssetComponent, canActivate: [AuthGuard] },
  { path: 'assets/add-asset/:tab', component: AddAssetComponent, canActivate: [AuthGuard] },
  { path: 'assets/types/create', component: CreateAssetTypeComponent, canActivate: [AuthGuard] },
  { path: 'assets/types/edit/:id', component: CreateAssetTypeComponent, canActivate: [AuthGuard] },
  { path: 'assets/types/view/:id', component: ViewAssetTypeComponent, canActivate: [AuthGuard] },
  { path: 'assets/types', component: AssetTypesComponent, canActivate: [AuthGuard] },
  { path: 'assets', component: AssetsComponent, canActivate: [AuthGuard] },
  { path: 'assets/view/:id', component: ViewAssetComponent, canActivate: [AuthGuard] },
  { path: 'service-requests/create', component: CreateServiceRequestComponent, canActivate: [AuthGuard] },
  { path: 'service-requests/edit/:id', component: CreateServiceRequestComponent, canActivate: [AuthGuard] },
  { path: 'service-requests/view/:id', component: ViewServiceRequestComponent, canActivate: [AuthGuard] },
  { path: 'service-requests', component: ServiceRequestsComponent, canActivate: [AuthGuard] },
  { path: 'work-orders/create', component: CreateWorkOrderComponent, canActivate: [AuthGuard] },
  { path: 'work-orders/edit/:id', component: CreateWorkOrderComponent, canActivate: [AuthGuard] },
  { path: 'work-orders/view/:id', component: ViewWorkOrderComponent, canActivate: [AuthGuard] },
  { path: 'work-orders/types/create', component: CreateWorkOrderTypeComponent, canActivate: [AuthGuard] },
  { path: 'work-orders/types/edit/:id', component: CreateWorkOrderTypeComponent, canActivate: [AuthGuard] },
  { path: 'work-orders/types/view/:id', component: ViewWorkOrderTypeComponent, canActivate: [AuthGuard] },
  { path: 'work-orders/types', component: WorkOrderTypesComponent, canActivate: [AuthGuard] },
  { path: 'work-orders', component: WorkOrderManagementComponent, canActivate: [AuthGuard] },
  { path: 'technicians', component: TechnicianComponent, canActivate: [AuthGuard] },
  { path: 'technicians/create', component: CreateTechnicianComponent, canActivate: [AuthGuard] },
  { path: 'technicians/edit/:id', component: CreateTechnicianComponent, canActivate: [AuthGuard] },
  { path: 'technicians/view/:id', component: ViewTechnicianComponent, canActivate: [AuthGuard] },
  { path: 'technicians/teams/create', component: CreateTechnicianTeamComponent, canActivate: [AuthGuard] },
  { path: 'technicians/teams/edit/:id', component: CreateTechnicianTeamComponent, canActivate: [AuthGuard] },
  { path: 'technicians/teams/view/:id', component: ViewTechnicianTeamComponent, canActivate: [AuthGuard] },
  { path: 'technicians/teams', component: TechnicianTeamsComponent, canActivate: [AuthGuard] },
  { path: 'maintenance', pathMatch: 'full', redirectTo: 'maintenance/preventive' },
  { path: 'maintenance/preventive', component: PreventiveMaintenanceComponent, canActivate: [AuthGuard] },
  { path: 'maintenance/predictive', component: PreventiveMaintenanceComponent, canActivate: [AuthGuard] },
  { path: 'maintenance/emergency', component: PreventiveMaintenanceComponent, canActivate: [AuthGuard] },
  { path: 'preventive-maintenance', pathMatch: 'full', redirectTo: 'maintenance/preventive' },
  { path: 'preventive-maintenance/create', component: CreatePreventiveMaintenanceComponent, canActivate: [AuthGuard] },
  { path: 'preventive-maintenance/edit/:id', component: CreatePreventiveMaintenanceComponent, canActivate: [AuthGuard] },
  { path: 'preventive-maintenance/view/:id', component: ViewPreventiveMaintenanceComponent, canActivate: [AuthGuard] },
  { path: 'predictive-maintenance/create', component: CreatePredictiveMaintenanceComponent, canActivate: [AuthGuard] },
  { path: 'predictive-maintenance/edit/:id', component: CreatePredictiveMaintenanceComponent, canActivate: [AuthGuard] },
  { path: 'predictive-maintenance/view/:id', component: ViewPredictiveMaintenanceComponent, canActivate: [AuthGuard] },
  { path: 'emergency-maintenance/create', component: CreateEmergencyMaintenanceComponent, canActivate: [AuthGuard] },
  { path: 'emergency-maintenance/view/:id', component: ViewEmergencyMaintenanceComponent, canActivate: [AuthGuard] },
  { path: 'emergency-maintenance/edit/:id', component: CreateEmergencyMaintenanceComponent, canActivate: [AuthGuard] },
  { path: 'inventory/warehouse', component: WarehouseComponent, canActivate: [AuthGuard] },
  { path: 'inventory/warehouse/view/:id', component: ViewWarehouseComponent, canActivate: [AuthGuard] },
  { path: 'inventory/warehouse/create', component: CreateWarehouseComponent, canActivate: [AuthGuard] },
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
  { path: 'procurement/purchase-orders', component: PurchaseOrdersComponent, canActivate: [AuthGuard] },
  { path: 'procurement/purchase-orders/create', component: CreatePurchaseOrderComponent, canActivate: [AuthGuard] },
  { path: 'procurement/purchase-orders/view/:id', component: ViewPurchaseOrderComponent, canActivate: [AuthGuard] },
  { path: 'procurement/goods-receipts', component: GoodsReceiptsComponent, canActivate: [AuthGuard] },
  { path: 'procurement/goods-receipts/create', component: CreateGrnComponent, canActivate: [AuthGuard] },
  { path: 'procurement/goods-receipts/view/:id', component: ViewGoodsReceiptComponent, canActivate: [AuthGuard] },
  { path: 'procurement/create', component: CreateProcurementComponent, canActivate: [AuthGuard] },
  { path: 'procurement/edit/:id', component: CreateProcurementComponent, canActivate: [AuthGuard] },
  { path: 'procurement/view/:id', component: ViewProcurementComponent, canActivate: [AuthGuard] },
  { path: 'service-contracts', component: ServiceContractComponent, canActivate: [AuthGuard] },
  { path: 'service-contracts/create', component: CreateServiceContractComponent, canActivate: [AuthGuard] },
  { path: 'failure-codes', component: FailureCodeComponent, canActivate: [AuthGuard] },
  { path: 'failure-codes/create', component: CreateFailureCodeComponent, canActivate: [AuthGuard] },
  { path: 'tm-system', pathMatch: 'full', redirectTo: 'tm-system/dashboard' },
  { path: 'tm-system/work-orders/:id', loadComponent: () => import('./components/tm-work-order-view').then(m => m.TmWorkOrderViewComponent), canActivate: [AuthGuard] },
  { path: 'tm-system/leaves/:technicianId/:leaveId', loadComponent: () => import('./components/view-leave/view-leave').then(m => m.ViewLeaveComponent), canActivate: [AuthGuard] },
  { path: 'tm-system/holidays/:id', loadComponent: () => import('./components/view-holiday/view-holiday').then(m => m.ViewHolidayComponent), canActivate: [AuthGuard] },
  { path: 'tm-system/:tab', component: TmSystemComponent, canActivate: [AuthGuard] },
  { path: 'tm-system/technicians/:id/availability', loadComponent: () => import('./components/technician-availability/technician-availability').then(m => m.TechnicianAvailabilityComponent), canActivate: [AuthGuard] },
  { path: 'roles-permissions', component: RolesComponent, canActivate: [AuthGuard] },
  { path: 'users', component: UsersComponent, canActivate: [AuthGuard] }
];
