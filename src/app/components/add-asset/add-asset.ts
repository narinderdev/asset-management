import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, NavigationEnd, Params, Router } from '@angular/router';
import { filter, finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { Asset } from '../../models/assets.models';
import { AssetsService, AssetDetailResponse, AssetCreatePayload, AssetUpdatePayload, AssetLocationOrgPayload } from '../../services/assets.service';
import { TechnicianTeam, TechnicianTeamResponse } from '../../services/technician.service';
import { environment } from '../../../environments/environment';

type AssetDetail = NonNullable<AssetDetailResponse['data']>;

@Component({
  selector: 'app-add-asset',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-asset.html',
  styleUrls: ['./add-asset.css']
})

export class AddAssetComponent implements OnInit {
  // Active tab
  activeTab: string = 'asset-master';
  private readonly defaultTab = 'asset-master';
  private readonly locationTabId = 'location-organization';
  isEditMode = false;

  isSavingLocation = false;
  isSavingTechnical = false;
  isSavingFinancial = false;
  isSavingWarranty = false;
  isSavingSafety = false;
  private readonly maintenanceTeamsUrl = `${environment.apiUrl}/api/technician-teams`;

  // Tab options
  tabs = [
    { id: 'asset-master', label: 'Asset Master' },
    { id: 'location-organization', label: 'Location & Organization' },
    { id: 'technical-manufacturer', label: 'Technical & Manufacturer' },
    { id: 'financial', label: 'Financial' },
    { id: 'warranty-lifecycle', label: 'Warranty & Lifecycle' },
    { id: 'safety-operations', label: 'Safety & Operations' }
  ];

  // Asset Master Data
  assetMaster = {
    assetId: '',
    assetName: '',
    shortDescription: '',
    assetCategory: '',
    assetType: '',
    status: '',
    criticality: '',
    ownership: '',
    assetTag: ''
  };
  autoGenerateAssetId = false;

  // Location & Organization Data
  locationOrg = {
    location: '',
    department: '',
    costCenter: '',
    assignedOwner: '',
    maintenanceTeam: ''
  };
  maintenanceTeams: TechnicianTeam[] = [];

  // Technical & Manufacturer Data
  technical = {
    manufacturer: '',
    model: '',
    serialNumber: '',
    yearOfManufacture: '',
    powerRating: '',
    voltage: '',
    capacity: ''
  };

  // Financial Data
  financial = {
    acquisitionDate: '',
    acquisitionCost: '',
    supplier: '',
    poInvoiceNumber: '',
    depreciationMethod: '',
    usefulLife: '',
    depreciationStartDate: '',
    salvageValue: '',
    accumulatedDepreciation: '',
    currentBookValue: ''
  };

  // Warranty & Lifecycle Data
  warranty = {
    commissioningDate: '',
    warrantyStart: '',
    warrantyEnd: '',
    warrantyProvider: '',
    serviceContract: '',
    expectedUsefulLifeYears: undefined as number | undefined,
    plannedReplacementDate: '',
    lastMaintenanceDate: '',
    nextPlannedMaintenance: ''
  };

  // Safety & Operations Data
  safety = {
    safetyCritical: '',
    safetyNotes: '',
    operatingInstructions: ''
  };

  // Attachments Data
  attachments = {
    fileSelected: false,
    fileUrl: ''
  };

  // Dropdown options
  categoryOptions = ['HVAC', 'Power', 'Lifts', 'Fire Protector'];
  typeOptions = ['Air Condition', 'Generator', 'Passenger Lift', 'Pump'];
  statusOptions = [
    { value: 'IN_SERVICE', label: 'In Service' },
    { value: 'OUT_OF_SERVICE', label: 'Out of Service' },
    { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
    { value: 'DISPOSED', label: 'Disposed' }
  ];
  criticalityOptions = ['High', 'Medium', 'Low', 'Critical'];
  ownershipOptions = ['Owned', 'Leased', 'Rented'];
  depreciationMethodOptions = [
    { value: 'STRAIGHT_LINE', label: 'Straight Line' },
    { value: 'DECLINING_BALANCE', label: 'Declining Balance' },
    { value: 'SUM_OF_YEARS_DIGITS', label: 'Sum of Years Digits' },
    { value: 'UNIT_OF_PRODUCTION', label: 'Unit of Production' },
    { value: 'NONE', label: 'None' }
  ];
  safetyCriticalOptions = ['Yes', 'No'];

  activeAsset?: Asset;
  isLoadingDetails = false;
  currentAssetId?: string;
  isSavingAssetMaster = false;
  isUpdatingAsset = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private assetsService: AssetsService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.isEditMode = false;
    this.route.paramMap.subscribe(params => {
      const tabFromUrl = this.normalizeTab(params.get('tab') ?? this.defaultTab);
      this.activeTab = this.tabs.some(tab => tab.id === tabFromUrl)
        ? tabFromUrl
        : this.defaultTab;
    });

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        const currentTab = this.normalizeTab(this.route.snapshot.paramMap.get('tab') ?? this.defaultTab);
      this.activeTab = this.tabs.some(tab => tab.id === currentTab) ? currentTab : this.defaultTab;
      this.cdr.detectChanges();
    });

    this.loadTechnicianTeams();

    const navigation = this.router.getCurrentNavigation();
    const asset = (navigation?.extras.state as { asset?: Asset })?.asset;
    const assetId = this.route.snapshot.queryParamMap.get('id');
    if (asset) {
      this.isEditMode = true;
      this.activeAsset = asset;
      this.populateFromAsset(asset);
    } else if (assetId) {
      this.isEditMode = true;
      this.loadAssetDetails(assetId);
    }

    if (!this.route.snapshot.paramMap.get('tab')) {
      this.router.navigate(['/assets', 'add-asset', this.activeTab], {
        replaceUrl: true,
        queryParams: this.route.snapshot.queryParams
      });
    }
  }

  setActiveTab(tabId: string): void {
    if (this.activeTab === tabId) {
      return;
    }
    console.log('Switching active tab to', tabId);
    this.navigateToTab(tabId);
  }

  private navigateToTab(tabId: string, queryParams?: Params): void {
    if (!this.tabs.some(tab => tab.id === tabId)) {
      tabId = this.defaultTab;
    }
    this.activeTab = tabId;
    const mergedQueryParams = { ...this.route.snapshot.queryParams, ...queryParams };
    this.router.navigate(['/assets', 'add-asset', tabId], { queryParams: mergedQueryParams });
  }

  private navigateToNextTab(): void {
    const currentIndex = this.tabs.findIndex(tab => tab.id === this.activeTab);
    if (currentIndex === -1 || currentIndex >= this.tabs.length - 1) {
      return;
    }
    const nextTabId = this.tabs[currentIndex + 1].id;
    this.navigateToTab(nextTabId);
  }

  private getAssetIdFromParams(): string | undefined {
    return (
      this.route.snapshot.queryParamMap.get('id') ||
      (this.currentAssetId !== undefined ? String(this.currentAssetId) : undefined)
    );
  }

  private populateFromAsset(asset: Asset): void {
    this.assetMaster.assetId = asset.assetId;
    this.assetMaster.assetName = asset.assetName;
    this.assetMaster.assetCategory = asset.category;
    this.assetMaster.assetType = asset.type;
    this.assetMaster.status = asset.status;
    this.assetMaster.shortDescription = asset.assetName;
    this.locationOrg.location = asset.location ?? '';
    this.locationOrg.department = '';
    this.locationOrg.costCenter = '';
    this.locationOrg.assignedOwner = '';
    this.locationOrg.maintenanceTeam = '';
  }

  private loadAssetDetails(assetId: string): void {
    this.isLoadingDetails = true;
    this.assetsService
      .fetchAssetById(assetId)
      .pipe(finalize(() => {
        this.isLoadingDetails = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: response => {
          if (response.data) {
            const detail = response.data;
            this.currentAssetId = detail.id !== undefined ? String(detail.id) : this.currentAssetId;
            this.activeAsset = this.mapDetailToAsset(detail);
            this.populateFromDetail(detail);
          }
          this.cdr.detectChanges();
        },
        error: () => {
          console.error('Failed to load asset details');
          this.cdr.detectChanges();
        }
      });
  }

  private computeStatus(value?: string): Asset['status'] {
    if (!value) {
      return 'Active';
    }

    switch (value.toUpperCase()) {
      case 'IN_REPAIR':
      case 'UNDER_MAINTENANCE':
        return 'In Repair';
      case 'RETIRED':
      case 'DECOMMISSIONED':
      case 'RETIRED_FROM_SERVICE':
        return 'Retried';
      default:
        return 'Active';
    }
  }

  private mapDetailToAsset(detail: AssetDetail | undefined): Asset | undefined {
    if (!detail) {
      return undefined;
    }

    const lastServicedDate = detail.warrantyLifecycle?.lastMaintenanceDate
      ?? detail.financialDetails?.acquisitionDate
      ?? '—';

    const warrantyExpiry = detail.warrantyLifecycle?.warrantyEnd ?? '—';

    return {
      id: detail.id,
      assetId: detail.assetId ?? 'Unknown ID',
      assetName: detail.assetName ?? 'Unnamed Asset',
      category: detail.assetCategory ?? 'Uncategorized',
      type: detail.assetType ?? 'Unknown',
      location: this.getDetailLocation(detail) || 'Not Assigned',
      lastServicedDate,
      warrantyExpiry,
      status: this.computeStatus(detail.status)
    };
  }

  private populateFromDetail(detail: AssetDetail): void {
    this.assetMaster.assetId = detail.assetId ?? '';
    this.assetMaster.assetName = detail.assetName ?? '';
    this.assetMaster.assetCategory = detail.assetCategory ?? '';
    this.assetMaster.assetType = detail.assetType ?? '';
    this.assetMaster.shortDescription = detail.shortDescription ?? '';
    this.assetMaster.status = detail.status ?? '';
    this.assetMaster.criticality = this.normalizeCriticality(detail.criticality);
    this.assetMaster.ownership = detail.ownership ?? '';
    this.currentAssetId = detail.id !== undefined ? String(detail.id) : this.currentAssetId;

    const detailLocation = detail.location;
    if (!detailLocation) {
      this.locationOrg.location = '';
      this.locationOrg.department = '';
      this.locationOrg.costCenter = '';
      this.locationOrg.assignedOwner = '';
      this.locationOrg.maintenanceTeam = '';
    } else if (typeof detailLocation === 'string') {
      this.locationOrg.location = detailLocation;
      this.locationOrg.department = '';
      this.locationOrg.costCenter = '';
      this.locationOrg.assignedOwner = '';
      this.locationOrg.maintenanceTeam = '';
    } else {
      this.locationOrg.location =
        detailLocation.location ??
        detailLocation.primaryLocation ??
        detailLocation.functionalLocation ??
        '';
      this.locationOrg.department = detailLocation.department ?? '';
      this.locationOrg.costCenter = detailLocation.costCenter ?? '';
      this.locationOrg.assignedOwner = detailLocation.assignedOwner ?? '';
      this.locationOrg.maintenanceTeam = detailLocation.maintenanceTeam ?? '';
    }

    const technical = detail.technicalDetails ?? {};
    this.technical.manufacturer = technical.manufacturer ?? '';
    this.technical.model = technical.model ?? '';
    this.technical.serialNumber = technical.serialNumber ?? '';
    this.technical.yearOfManufacture = this.toString(technical.yearOfManufacture);
    this.technical.powerRating = technical.powerRating ?? '';
    this.technical.voltage = technical.voltage ?? '';
    this.technical.capacity = technical.capacity ?? '';

    const financial = detail.financialDetails ?? {};
    this.financial.acquisitionDate = financial.acquisitionDate ?? '';
    this.financial.acquisitionCost = this.toString(financial.acquisitionCost);
    this.financial.supplier = financial.supplier ?? '';
    this.financial.poInvoiceNumber = financial.poInvoiceNumber ?? '';
    this.financial.depreciationMethod = financial.depreciationMethod ?? '';
    this.financial.usefulLife = this.toString(financial.usefulLifeYears);
    this.financial.depreciationStartDate = financial.depreciationStartDate ?? '';
    this.financial.salvageValue = this.toString(financial.salvageValue);
    this.financial.accumulatedDepreciation = this.toString(financial.accumulatedDepreciation);
    this.financial.currentBookValue = this.toString(financial.currentBookValue);

    const warranty = detail.warrantyLifecycle ?? {};
    this.warranty.commissioningDate = warranty.commissioningDate ?? '';
    this.warranty.warrantyStart = warranty.warrantyStart ?? '';
    this.warranty.warrantyEnd = warranty.warrantyEnd ?? '';
    this.warranty.warrantyProvider = warranty.warrantyProvider ?? '';
    this.warranty.serviceContract = warranty.serviceContract ?? '';
    this.warranty.expectedUsefulLifeYears = warranty.expectedUsefulLifeYears ?? undefined;
    this.warranty.plannedReplacementDate = warranty.plannedReplacementDate ?? '';
    this.warranty.lastMaintenanceDate = warranty.lastMaintenanceDate ?? '';
    this.warranty.nextPlannedMaintenance = warranty.nextPlannedMaintenance ?? '';

    const safety = detail.safetyOperations ?? {};
    this.safety.safetyCritical = this.formatSafetyCritical(safety.safetyCritical);
    this.safety.safetyNotes = safety.safetyNotes ?? '';
    this.safety.operatingInstructions = safety.operatingInstructions ?? '';
  }

  private getDetailLocation(detail: AssetDetail): string {
    const location = detail.location;
    if (!location) {
      return '';
    }
    if (typeof location === 'string') {
      return location;
    }
    return (
      location.location ??
      location.primaryLocation ??
      location.functionalLocation ??
      ''
    );
  }

  private toString(value?: string | number | null): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }

  onYearInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 4) {
      value = value.slice(0, 4);
    }
    this.technical.yearOfManufacture = value;
    if (input.value !== value) {
      input.value = value;
    }
  }

  onAutoGenerateAssetIdChange(): void {
    if (this.autoGenerateAssetId) {
      this.assetMaster.assetId = '';
    }
  }

  private parseNumber(value?: string): number | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  private normalizeCriticality(value?: string): string {
    if (!value) {
      return '';
    }

    switch (value.toUpperCase()) {
      case 'HIGH':
        return 'High';
      case 'MEDIUM':
        return 'Medium';
      case 'LOW':
        return 'Low';
      default:
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }
  }

  private formatSafetyCritical(value?: boolean): string {
    if (value === true) {
      return 'Yes';
    }

    if (value === false) {
      return 'No';
    }

    return '';
  }

  private buildLocationPayload():
    AssetLocationOrgPayload | undefined {
    const payload: AssetLocationOrgPayload = {
      location: this.normalizeLocationField(this.locationOrg.location),
      department: this.normalizeLocationField(this.locationOrg.department),
      costCenter: this.normalizeLocationField(this.locationOrg.costCenter),
      assignedOwner: this.normalizeLocationField(this.locationOrg.assignedOwner),
      maintenanceTeam: this.normalizeLocationField(this.locationOrg.maintenanceTeam)
    };

    const hasValue = Object.values(payload).some(value => value !== undefined);
    return hasValue ? payload : undefined;
  }

  private loadTechnicianTeams(): void {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    this.http
      .get<TechnicianTeamResponse>(this.maintenanceTeamsUrl, { headers })
      .pipe(finalize(() => this.cdr.detectChanges()))
      .subscribe({
        next: (response: TechnicianTeamResponse) => {
          this.maintenanceTeams = response.data?.teams ?? [];
        },
        error: () => {
          console.error('Unable to load technician teams for dropdown');
        }
      });
  }

  private normalizeLocationField(value?: string): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private buildTechnicalPayload():
    AssetCreatePayload['technicalDetails'] | undefined {
    const payload = {
      manufacturer: this.technical.manufacturer || undefined,
      model: this.technical.model || undefined,
      serialNumber: this.technical.serialNumber || undefined,
      yearOfManufacture: this.parseNumber(this.technical.yearOfManufacture),
      powerRating: this.technical.powerRating || undefined,
      voltage: this.technical.voltage || undefined,
      capacity: this.technical.capacity || undefined
    };

    const hasValue = Object.values(payload).some(
      value => value !== undefined && value !== ''
    );
    return hasValue ? payload : undefined;
  }

  private buildFinancialPayload():
    AssetCreatePayload['financialDetails'] | undefined {
    const payload = {
      acquisitionDate: this.financial.acquisitionDate || undefined,
      acquisitionCost: this.parseNumber(this.financial.acquisitionCost),
      supplier: this.financial.supplier || undefined,
      poInvoiceNumber: this.financial.poInvoiceNumber || undefined,
      depreciationMethod: this.financial.depreciationMethod || undefined,
      usefulLifeYears: this.parseNumber(this.financial.usefulLife),
      depreciationStartDate: this.financial.depreciationStartDate || undefined,
      salvageValue: this.parseNumber(this.financial.salvageValue),
      accumulatedDepreciation: this.parseNumber(this.financial.accumulatedDepreciation),
      currentBookValue: this.parseNumber(this.financial.currentBookValue)
    };

    const hasValue = Object.values(payload).some(value => value !== undefined);
    return hasValue ? payload : undefined;
  }

  private buildWarrantyPayload():
    AssetCreatePayload['warrantyLifecycle'] | undefined {
    const payload = {
      commissioningDate: this.warranty.commissioningDate || undefined,
      warrantyStart: this.warranty.warrantyStart || undefined,
      warrantyEnd: this.warranty.warrantyEnd || undefined,
      warrantyProvider: this.warranty.warrantyProvider || undefined,
      serviceContract: this.warranty.serviceContract || undefined,
      expectedUsefulLifeYears: this.warranty.expectedUsefulLifeYears,
      plannedReplacementDate: this.warranty.plannedReplacementDate || undefined,
      lastMaintenanceDate: this.warranty.lastMaintenanceDate || undefined,
      nextPlannedMaintenance: this.warranty.nextPlannedMaintenance || undefined
    };

    const hasValue = Object.values(payload).some(value => value !== undefined);
    return hasValue ? payload : undefined;
  }

  private buildSafetyPayload():
    AssetCreatePayload['safetyOperations'] | undefined {
    const safetyCritical =
      this.safety.safetyCritical === 'Yes'
        ? true
        : this.safety.safetyCritical === 'No'
        ? false
        : undefined;

    const payload = {
      safetyCritical,
      safetyNotes: this.safety.safetyNotes || undefined,
      operatingInstructions: this.safety.operatingInstructions || undefined
    };

    const hasValue =
      safetyCritical !== undefined ||
      Boolean(this.safety.safetyNotes) ||
      Boolean(this.safety.operatingInstructions);
    return hasValue ? payload : undefined;
  }

  private buildAssetPayload(): AssetCreatePayload {
    const payload: AssetCreatePayload = {
      assetName: this.assetMaster.assetName,
      shortDescription: this.assetMaster.shortDescription || undefined,
      assetCategory: this.assetMaster.assetCategory,
      status: this.toApiStatus(this.assetMaster.status),
      criticality: this.toApiCriticality(this.assetMaster.criticality),
      ownership: this.assetMaster.ownership || undefined,
      assetTag: this.assetMaster.assetTag || undefined
    };

    if (!this.autoGenerateAssetId && this.assetMaster.assetId) {
      payload.assetId = this.assetMaster.assetId;
    }

    const location = this.normalizeLocationField(this.locationOrg.location);
    if (location) {
      payload.location = location;
    }

    const technical = this.buildTechnicalPayload();
    if (technical) {
      payload.technicalDetails = technical;
    }

    const financial = this.buildFinancialPayload();
    if (financial) {
      payload.financialDetails = financial;
    }

    const warranty = this.buildWarrantyPayload();
    if (warranty) {
      payload.warrantyLifecycle = warranty;
    }

    const safety = this.buildSafetyPayload();
    if (safety) {
      payload.safetyOperations = safety;
    }

    return payload;
  }

  private buildEditPayload(): AssetUpdatePayload {
    const payload: AssetUpdatePayload = {
      assetId: this.assetMaster.assetId,
      basic: {
        assetName: this.assetMaster.assetName,
        shortDescription: this.assetMaster.shortDescription || undefined,
        assetCategory: this.assetMaster.assetCategory,
        assetType: this.assetMaster.assetType || undefined,
        status: this.toApiStatus(this.assetMaster.status),
        criticality: this.toApiCriticality(this.assetMaster.criticality),
        ownership: this.assetMaster.ownership || undefined,
        assetTag: this.assetMaster.assetTag || undefined
      }
    };

    const location = this.buildLocationPayload();
    if (location) {
      payload.locationOrg = location;
    }

    const technical = this.buildTechnicalPayload();
    if (technical) {
      payload.technicalDetails = technical;
    }

    const financial = this.buildFinancialPayload();
    if (financial) {
      payload.financialDetails = financial;
    }

    const warranty = this.buildWarrantyPayload();
    if (warranty) {
      payload.warrantyLifecycle = warranty;
    }

    const safety = this.buildSafetyPayload();
    if (safety) {
      payload.safetyOperations = safety;
    }

    return payload;
  }

  private toApiStatus(status: string): string {
    return status || 'IN_SERVICE';
  }

  private toApiCriticality(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }

    return value.toUpperCase();
  }

  onCancel(): void {
    this.router.navigate(['/assets']);
  }

  onSave(): void {
    this.saveTab(this.activeTab);
  }

  onEditAction(): void {
    if (this.isLastTab) {
      this.updateAsset();
      return;
    }
    this.navigateToNextTab();
  }

  onUploadFile(): void {
    console.log('Upload file clicked');
    // Implement file upload logic
  }

  private saveTab(tabId: string): void {
    console.log('Save requested for tab:', tabId);
    if (this.isEditMode && tabId === 'asset-master') {
      const assetId = this.getAssetIdFromParams();
      this.navigateToTab('location-organization', assetId ? { id: assetId } : undefined);
      return;
    }
    switch (tabId) {
      case 'asset-master':
        this.saveAssetMaster();
        break;
      case 'location-organization':
        this.saveLocationOrganization();
        break;
      case 'technical-manufacturer':
        this.saveTechnicalManufacturer();
        break;
      case 'financial':
        this.saveFinancial();
        break;
      case 'warranty-lifecycle':
        this.saveWarrantyLifecycle();
        break;
      case 'safety-operations':
        this.saveSafetyOperations();
        break;
      default:
        console.warn('No save handler defined for', tabId);
    }
  }

  private saveAssetMaster(): void {
    if (this.isSavingAssetMaster) {
      return;
    }

    const payload = this.buildAssetPayload();
    this.isSavingAssetMaster = true;

    this.assetsService
      .createAsset(payload)
      .pipe(finalize(() => {
        this.isSavingAssetMaster = false;
      }))
      .subscribe({
        next: response => {
          const createdId = response.data?.id ?? response.data?.assetId;
          if (!createdId) {
            console.warn('Asset creation response did not include an ID; staying on current tab');
            return;
          }
          this.currentAssetId = String(createdId);
          this.assetMaster.assetId = response.data?.assetId ?? this.assetMaster.assetId;
          console.log('Asset created with ID', createdId);
          this.navigateToTab(this.locationTabId, { id: createdId });
        },
        error: () => {
          console.error('Failed to create asset');
        }
      });
  }

  get isLastTab(): boolean {
    return this.tabs[this.tabs.length - 1].id === this.activeTab;
  }

  get editActionLabel(): string {
    return this.isLastTab ? 'Update' : 'Next';
  }

  private normalizeTab(tabId: string): string {
    if (tabId === 'location') {
      return this.locationTabId;
    }
    return tabId;
  }

  isActiveTabSaving(): boolean {
    switch (this.activeTab) {
      case 'asset-master':
        return this.isSavingAssetMaster;
      case 'location-organization':
        return this.isSavingLocation;
      case 'technical-manufacturer':
        return this.isSavingTechnical;
      case 'financial':
        return this.isSavingFinancial;
      case 'warranty-lifecycle':
        return this.isSavingWarranty;
      case 'safety-operations':
        return this.isEditMode ? this.isUpdatingAsset : this.isSavingSafety;
      default:
        return false;
    }
  }

  private saveLocationOrganization(): void {
    const payload = this.buildLocationPayload();
    if (!payload) {
      console.warn('No location data to save');
      return;
    }

    const assetId = this.getAssetIdFromParams();
    if (!assetId) {
      console.warn('Cannot save location without asset ID');
      return;
    }

    this.isSavingLocation = true;
    this.assetsService
      .updateLocation(assetId, payload)
      .pipe(finalize(() => {
        this.isSavingLocation = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.navigateToTab('technical-manufacturer', { id: assetId });
          this.loadAssetDetails(assetId);
        },
        error: () => {
          console.error('Failed to save location data');
        }
      });
  }

  private saveTechnicalManufacturer(): void {
    const payload = this.buildTechnicalPayload();
    if (!payload) {
      console.warn('No technical data to save');
      return;
    }

    const assetId = this.getAssetIdFromParams();
    if (!assetId) {
      console.warn('Cannot save technical details without asset ID');
      return;
    }

    this.isSavingTechnical = true;
    this.assetsService
      .updateTechnical(assetId, payload)
      .pipe(finalize(() => {
        this.isSavingTechnical = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.navigateToTab('financial', { id: assetId });
          this.loadAssetDetails(assetId);
        },
        error: () => {
          console.error('Failed to save technical & manufacturer data');
        }
      });
  }

  private saveFinancial(): void {
    const payload = this.buildFinancialPayload();
    if (!payload) {
      console.warn('No financial data to save');
      return;
    }

    const assetId = this.getAssetIdFromParams();
    if (!assetId) {
      console.warn('Cannot save financial data without asset ID');
      return;
    }

    this.isSavingFinancial = true;
    this.assetsService
      .updateFinancial(assetId, payload)
      .pipe(finalize(() => {
        this.isSavingFinancial = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.navigateToTab('warranty-lifecycle', { id: assetId });
          this.loadAssetDetails(assetId);
        },
        error: () => {
          console.error('Failed to save financial data');
        }
      });
  }

  private saveWarrantyLifecycle(): void {
    const payload = this.buildWarrantyPayload();
    if (!payload) {
      console.warn('No warranty data to save');
      return;
    }

    const assetId = this.getAssetIdFromParams();
    if (!assetId) {
      console.warn('Cannot save warranty data without asset ID');
      return;
    }

    this.isSavingWarranty = true;
    this.assetsService
      .updateWarranty(assetId, payload)
      .pipe(finalize(() => {
        this.isSavingWarranty = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.navigateToTab('safety-operations', { id: assetId });
          this.loadAssetDetails(assetId);
        },
        error: () => {
          console.error('Failed to save warranty & lifecycle data');
        }
      });
  }

  private saveSafetyOperations(): void {
    const payload = this.buildSafetyPayload();
    if (!payload) {
      console.warn('No safety data to save');
      return;
    }

    const assetId = this.getAssetIdFromParams();
    if (!assetId) {
      console.warn('Cannot save safety data without asset ID');
      return;
    }

    this.isSavingSafety = true;
    this.assetsService
      .updateSafety(assetId, payload)
      .pipe(finalize(() => {
        this.isSavingSafety = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          const message = this.isEditMode ? 'Asset updated successfully.' : 'Asset added successfully.';
          this.toastr.success(message);
          this.router.navigate(['/assets']);
        },
        error: () => {
          console.error('Failed to save safety & operations data');
          this.toastr.error('Failed to save safety data');
        }
      });
  }

  private updateAsset(): void {
    const assetId = this.getAssetIdFromParams();
    if (!assetId) {
      console.warn('Cannot update asset without identifier');
      return;
    }

    const payload = this.buildEditPayload();
    this.isUpdatingAsset = true;
    this.assetsService
      .updateAsset(assetId, payload)
      .pipe(finalize(() => {
        this.isUpdatingAsset = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.toastr.success('Asset updated successfully.');
          this.router.navigate(['/assets']);
        },
        error: () => {
          console.error('Failed to update asset');
          this.toastr.error('Failed to update asset.');
        }
      });
  }

  private saveAttachments(): void {
    console.log('Saving Attachments data', this.attachments);
    // TODO: implement API call
  }

}
