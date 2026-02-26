import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, NavigationEnd, Params, Router } from '@angular/router';
import { filter, finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { Asset } from '../../models/assets.models';
import {
  AssetsService,
  AssetDetailResponse,
  AssetCreatePayload,
  AssetUpdatePayload,
  AssetLocationOrgPayload,
  AssetCategory,
  AssetType
} from '../../services/assets.service';
import { TechnicianTeam, TechnicianTeamResponse } from '../../services/technician.service';
import { PmTemplateService, PredictiveThresholdPayload } from '../../services/pm-template.service';
import { environment } from '../../../environments/environment';
import { Loader } from '../loader/loader';

type AssetDetail = NonNullable<AssetDetailResponse['data']>;

@Component({
  selector: 'app-add-asset',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
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
  isSavingInsurance = false;
  isSavingTechnical = false;
  isSavingFinancial = false;
  isSavingThreshold = false;
  isSavingWarranty = false;
  isSavingSafety = false;
  private readonly maintenanceTeamsUrl = `${environment.apiUrl}/api/technician-teams`;

  // Tab options
  tabs = [
    { id: 'asset-master', label: 'Asset Master' },
    { id: 'location-organization', label: 'Location & Organization' },
    { id: 'insurance', label: 'Insurance' },
    { id: 'technical-manufacturer', label: 'Technical & Manufacturer' },
    { id: 'financial', label: 'Financial' },
    { id: 'threshold', label: 'Threshold' },
    { id: 'warranty-lifecycle', label: 'Warranty & Lifecycle' },
    { id: 'safety-operations', label: 'Safety & Operations' }
  ];

  // Asset Master Data
  assetMaster = {
    assetId: '',
    assetName: '',
    shortDescription: '',
    assetCategory: '',
    assetTypeId: null as number | null,
    assetType: '',
    status: '',
    criticality: '',
    ownership: '',
    assetTag: '',
    functionalClass: '',      // NEW
    retirementUnit: '',       // NEW
    utilityAccount: '',       // NEW
    propertyGroup: '',        // NEW
    propertyUnit: '',         // NEW
    serialNumber: ''          // NEW
  };
  categoryOptions: AssetCategory[] = [];
  categoryLoading = false;
  readonly categoryDataListId = 'asset-category-options';
  filteredCategories: AssetCategory[] = [];
  showCategoryDropdown = false;
  autoGenerateAssetId = false;
  assetTypeOptions: AssetType[] = [];
  assetTypeLoading = false;

  // Location & Organization Data
  locationOrg = {
    location: '',
    department: '',
    costCenter: '',
    assignedOwner: '',
    maintenanceTeam: ''
  };
  maintenanceTeams: TechnicianTeam[] = [];
  locationError?: string;

  // Insurance Data
  insurance = {
    insuranceProvider: '',
    policyNumber: '',
    policyStartDate: '',
    policyExpiryDate: '',
    insuranceStatus: 'ACTIVE',
    policyType: '',
    certificateUrl: '',
    coverageAmount: '',
    premiumAmount: ''
  };

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
  yearOptions: string[] = [];

  // Financial Data
  financial = {
    acquisitionDate: '',
    acquisitionCost: '',
    supplier: '',
    poInvoiceNumber: '',
    depreciationMethod: '',
    usefulLife: '',
    expectedUsefulLifeYears: '',
    depreciationStartDate: '',
    salvageValue: '',
    accumulatedDepreciation: '',
    currentBookValue: ''
  };

  // Threshold Data
  threshold = {
    assetId: null as number | null,
    meterType: 'RUN_HOURS',
    warningThreshold: '',
    criticalThreshold: '',
    autoCreateWo: true,
    defaultPriority: 'LOW',
    cooldownHours: ''
  };

  get cooldownLabel(): string {
    switch (this.threshold.meterType) {
      case 'RUN_HOURS':
        return 'Cool down Hours';
      case 'CYCLES':
        return 'Cool down Cycles';
      case 'MILEAGE':
        return 'Cool down Mileage';
      default:
        return 'Cool down';
    }
  }

  showCooldown(): boolean {
    return this.threshold.meterType !== 'TEMPERATURE';
  }

  get unitLabel(): string {
    switch (this.threshold.meterType) {
      case 'RUN_HOURS':
        return 'Hours';
      case 'MILEAGE':
        return 'Miles';
      case 'CYCLES':
        return 'Cycles';
      case 'TEMPERATURE':
        return '\u00B0C';
      default:
        return '';
    }
  }

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
  typeOptions = ['Air Condition', 'Generator', 'Passenger Lift', 'Pump'];
  statusOptions = [
    { value: 'IN_SERVICE', label: 'In Service' },
    { value: 'OUT_OF_SERVICE', label: 'Out of Service' },
    { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
    { value: 'DISPOSED', label: 'Disposed' }
  ];
  criticalityOptions = ['High', 'Medium', 'Low', 'Critical'];
  ownershipOptions = ['Owned', 'Leased', 'Rented'];
  insuranceStatusOptions = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'PENDING_RENEWAL', label: 'Pending Renewal' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ];
  policyTypeOptions = [
    'Liability',
    'Property',
    'Comprehensive',
    'Fire',
    'Equipment Breakdown',
    'Well Control',
    'Environmental/Pollution',
    'Pipeline',
    'Offshore/Marine',
    'Cargo',
    'Business Interruption'
  ];
  depreciationMethodOptions = [
    { value: 'STRAIGHT_LINE', label: 'Straight Line' },
    { value: 'DECLINING_BALANCE', label: 'Declining Balance' },
    { value: 'SUM_OF_YEARS_DIGITS', label: 'Sum of Years Digits' },
    { value: 'UNIT_OF_PRODUCTION', label: 'Unit of Production' },
    { value: 'NONE', label: 'None' }
  ];
  meterTypeOptions = [
    { label: 'Run Hours', value: 'RUN_HOURS' },
    { label: 'Cycles', value: 'CYCLES' },
    { label: 'Mileage', value: 'MILEAGE' },
    { label: 'Temperature', value: 'TEMPERATURE' }
  ];
  priorityOptions = [
    { label: 'Low', value: 'LOW' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'High', value: 'HIGH' },
    { label: 'Critical', value: 'CRITICAL' }
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
    private toastr: ToastrService,
    private pmTemplateService: PmTemplateService
  ) {}

  ngOnInit(): void {
    this.yearOptions = this.buildYearOptions();
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
    this.loadCategories();
    this.loadAssetTypes();

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

  private buildYearOptions(): string[] {
    const currentYear = new Date().getFullYear();
    const years: string[] = [];
    for (let year = currentYear; year >= 1950; year--) {
      years.push(String(year));
    }
    return years;
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
    this.assetMaster.assetTypeId = null;
    this.assetMaster.status = asset.status;
    this.assetMaster.shortDescription = asset.assetName;
    // Add these lines if your Asset interface has these fields
    // this.assetMaster.functionalClass = asset.functionalClass ?? '';
    // this.assetMaster.retirementUnit = asset.retirementUnit ?? '';
    // this.assetMaster.utilityAccount = asset.utilityAccount ?? '';
    // this.assetMaster.propertyGroup = asset.propertyGroup ?? '';
    // this.assetMaster.serialNumber = asset.serialNumber ?? '';
    
    this.locationOrg.location = asset.location ?? '';
    this.locationOrg.department = '';
    this.locationOrg.costCenter = '';
    this.locationOrg.assignedOwner = '';
    this.locationOrg.maintenanceTeam = '';
    this.setThresholdAssetFromCurrent(asset.id);
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
    this.assetMaster.assetTypeId = detail.assetTypeId ?? null;
    this.assetMaster.shortDescription = detail.shortDescription ?? '';
    this.assetMaster.status = detail.status ?? '';
    this.assetMaster.criticality = this.normalizeCriticality(detail.criticality);
    this.assetMaster.ownership = detail.ownership ?? '';
    // NEW FIELDS - Populate from API response
    this.assetMaster.functionalClass = (detail as any).functionalClass ?? '';
    this.assetMaster.retirementUnit = (detail as any).retirementUnit ?? '';
    this.assetMaster.utilityAccount = (detail as any).utilityAccount ?? '';
    this.assetMaster.propertyGroup = (detail as any).propertyGroup ?? '';
    this.assetMaster.propertyUnit = (detail as any).propertyUnit ?? '';
    this.assetMaster.serialNumber = (detail as any).serialNumber ?? '';
    
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

    const insuranceData = (detail as any).insurance ?? {};
    this.insurance.insuranceProvider = insuranceData.insuranceProvider ?? '';
    this.insurance.policyNumber = insuranceData.policyNumber ?? '';
    this.insurance.policyStartDate = insuranceData.policyStartDate ?? '';
    this.insurance.policyExpiryDate = insuranceData.policyExpiryDate ?? '';
    this.insurance.insuranceStatus = insuranceData.insuranceStatus ?? 'ACTIVE';
    this.insurance.policyType = insuranceData.policyType ?? '';
    this.insurance.certificateUrl = insuranceData.certificateUrl ?? '';
    this.insurance.coverageAmount = this.formatCurrencyValue(insuranceData.coverageAmount);
    this.insurance.premiumAmount = this.formatCurrencyValue(insuranceData.premiumAmount);

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
    this.financial.acquisitionCost = this.formatCurrencyValue(financial.acquisitionCost);
    this.financial.supplier = financial.supplier ?? '';
    this.financial.poInvoiceNumber = financial.poInvoiceNumber ?? '';
    this.financial.depreciationMethod = financial.depreciationMethod ?? '';
    this.financial.usefulLife = this.toString(financial.usefulLifeYears);
    this.financial.expectedUsefulLifeYears = this.toString((financial as any).expectedUsefulLifeYears);
    this.financial.depreciationStartDate = financial.depreciationStartDate ?? '';
    this.financial.salvageValue = this.formatCurrencyValue(financial.salvageValue);
    this.financial.accumulatedDepreciation = this.formatCurrencyValue(financial.accumulatedDepreciation);
    this.financial.currentBookValue = this.formatCurrencyValue(financial.currentBookValue);

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

    this.setThresholdAssetFromCurrent(detail.id);
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

  private formatCurrencyValue(value?: string | number | null): string {
    const source = this.toString(value);
    if (!source) {
      return '';
    }

    const raw = source.replace(/[^0-9.]/g, '');
    if (!raw) {
      return '';
    }

    const [intPart, decimalPart] = raw.split('.');
    const intFormatted = Number(intPart || 0).toLocaleString('en-US');
    return decimalPart !== undefined ? `${intFormatted}.${decimalPart.slice(0, 2)}` : intFormatted;
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

  formatCurrencyInput(
    field: 'coverageAmount' | 'premiumAmount' | 'acquisitionCost' | 'salvageValue',
    section: 'insurance' | 'financial',
    event: Event
  ): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/[^0-9.]/g, '');
    if (!raw) {
      if (section === 'insurance') {
        (this.insurance as any)[field] = '';
      } else {
        (this.financial as any)[field] = '';
      }
      input.value = '';
      return;
    }
    const [intPart, decimalPart] = raw.split('.');
    const intFormatted = Number(intPart).toLocaleString('en-US');
    const formatted = decimalPart !== undefined ? `${intFormatted}.${decimalPart.slice(0, 2)}` : intFormatted;
    if (section === 'insurance') {
      (this.insurance as any)[field] = formatted;
    } else {
      (this.financial as any)[field] = formatted;
    }
    input.value = formatted;
  }

  formatNumberInput(
    field: 'warningThreshold' | 'criticalThreshold' | 'cooldownHours',
    event: Event
  ): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/[^0-9.]/g, '');
    if (!raw) {
      (this.threshold as any)[field] = '';
      input.value = '';
      return;
    }
    const [intPart, decimalPart] = raw.split('.');
    const intFormatted = Number(intPart).toLocaleString('en-US');
    const formatted = decimalPart !== undefined ? `${intFormatted}.${decimalPart.slice(0, 2)}` : intFormatted;
    (this.threshold as any)[field] = formatted;
    input.value = formatted;
  }

  onAutoGenerateAssetIdChange(): void {
    if (this.autoGenerateAssetId) {
      this.assetMaster.assetId = '';
    }
  }

  onLocationChange(): void {
    if (this.locationOrg.location && this.locationOrg.location.trim()) {
      this.locationError = undefined;
    }
  }

  private parseNumber(value?: string): number | undefined {
    if (!value) {
      return undefined;
    }

    const str = typeof value === 'number' ? String(value) : value;
    const cleaned = str.replace(/,/g, '');
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  private computePlannedReplacementDate(): string {
    const start = this.warranty.commissioningDate;
    const lifeYears = this.parseNumber(this.financial.expectedUsefulLifeYears);
    if (!start || lifeYears === undefined) {
      return '';
    }
    const base = this.parseDateFlexible(start);
    if (!base) {
      return '';
    }
    base.setFullYear(base.getFullYear() + lifeYears);
    const iso = base.toISOString().slice(0, 10); // yyyy-MM-dd
    return iso;
  }

  private parseDateFlexible(value: string): Date | null {
    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) {
      return direct;
    }
    const parts = value.split(/[-/]/);
    if (parts.length === 3) {
      const [a, b, c] = parts;
      const isDMY = a.length === 2 && b.length === 2 && c.length === 4;
      const isYMD = a.length === 4 && b.length === 2 && c.length === 2;
      if (isDMY) {
        const day = Number(a);
        const month = Number(b) - 1;
        const year = Number(c);
        const date = new Date(year, month, day);
        return Number.isNaN(date.getTime()) ? null : date;
      }
      if (isYMD) {
        const year = Number(a);
        const month = Number(b) - 1;
        const day = Number(c);
        const date = new Date(year, month, day);
        return Number.isNaN(date.getTime()) ? null : date;
      }
    }
    return null;
  }

  onCommissioningChange(): void {
    this.applyPlannedReplacementFromInputs();
  }

  onExpectedUsefulLifeChange(): void {
    this.applyPlannedReplacementFromInputs();
  }

  private applyPlannedReplacementFromInputs(): void {
    const computed = this.computePlannedReplacementDate();
    this.warranty.lastMaintenanceDate = computed || '';
    this.cdr.detectChanges();
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

  private buildInsurancePayload():
    AssetCreatePayload['insurance'] | undefined {
    const payload = {
      insuranceProvider: this.insurance.insuranceProvider || undefined,
      policyNumber: this.insurance.policyNumber || undefined,
      policyStartDate: this.insurance.policyStartDate || undefined,
      policyExpiryDate: this.insurance.policyExpiryDate || undefined,
      insuranceStatus: this.insurance.insuranceStatus || 'ACTIVE',
      policyType: this.insurance.policyType || undefined,
      certificateUrl: this.insurance.certificateUrl || undefined,
      coverageAmount: this.parseNumber(this.insurance.coverageAmount),
      premiumAmount: this.parseNumber(this.insurance.premiumAmount)
    };

    const hasValue = Object.values(payload).some(value => value !== undefined && value !== 'ACTIVE');
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

  private setThresholdAssetFromCurrent(assetId?: number | string): void {
    if (assetId === null || assetId === undefined) {
      return;
    }
    const numericId = Number(assetId);
    if (Number.isNaN(numericId)) {
      return;
    }
    this.threshold.assetId = numericId;
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
      expectedUsefulLifeYears: this.parseNumber(this.financial.expectedUsefulLifeYears),
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
      assetType: this.assetMaster.assetType || undefined,
      assetTypeId: this.assetMaster.assetTypeId ?? undefined,
      status: this.toApiStatus(this.assetMaster.status),
      criticality: this.toApiCriticality(this.assetMaster.criticality),
      ownership: this.assetMaster.ownership || undefined,
      assetTag: this.assetMaster.assetTag || undefined,
      // NEW FIELDS
      functionalClass: this.assetMaster.functionalClass || undefined,
      retirementUnit: this.assetMaster.retirementUnit || undefined,
      utilityAccount: this.assetMaster.utilityAccount || undefined,
      propertyGroup: this.assetMaster.propertyGroup || undefined,
      propertyUnit: this.assetMaster.propertyUnit || undefined,
      serialNumber: this.assetMaster.serialNumber || undefined
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

    const insuranceData = this.buildInsurancePayload();
    if (insuranceData) {
      payload.insurance = insuranceData;
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

  private buildThresholdPayload(): PredictiveThresholdPayload | undefined {
    const assetIdFromParams = this.getAssetIdFromParams();
    const assetId = assetIdFromParams ? Number(assetIdFromParams) : this.threshold.assetId;
    if (assetId === null || assetId === undefined || Number.isNaN(Number(assetId))) {
      return undefined;
    }

    return {
      assetId: Number(assetId),
      meterType: this.threshold.meterType || 'RUN_HOURS',
      warningThreshold: this.parseNumber(this.threshold.warningThreshold) ?? 0,
      criticalThreshold: this.parseNumber(this.threshold.criticalThreshold) ?? 0,
      autoCreateWo: Boolean(this.threshold.autoCreateWo),
      defaultPriority: this.threshold.defaultPriority || 'LOW',
      cooldownHours: this.parseNumber(this.threshold.cooldownHours) ?? 0
    };
  }

  private buildEditPayload(): AssetUpdatePayload {
    const payload: AssetUpdatePayload = {
      assetId: this.assetMaster.assetId,
      basic: {
        assetName: this.assetMaster.assetName,
        shortDescription: this.assetMaster.shortDescription || undefined,
        assetCategory: this.assetMaster.assetCategory,
        assetType: this.assetMaster.assetType || undefined,
        assetTypeId: this.assetMaster.assetTypeId ?? undefined,
        status: this.toApiStatus(this.assetMaster.status),
        criticality: this.toApiCriticality(this.assetMaster.criticality),
        ownership: this.assetMaster.ownership || undefined,
        assetTag: this.assetMaster.assetTag || undefined,
        // NEW FIELDS
        functionalClass: this.assetMaster.functionalClass || undefined,
        retirementUnit: this.assetMaster.retirementUnit || undefined,
        utilityAccount: this.assetMaster.utilityAccount || undefined,
        propertyGroup: this.assetMaster.propertyGroup || undefined,
        propertyUnit: this.assetMaster.propertyUnit || undefined,
        serialNumber: this.assetMaster.serialNumber || undefined
      }
    };

    const location = this.buildLocationPayload();
    if (location) {
      payload.locationOrg = location;
    }

    const insuranceData = this.buildInsurancePayload();
    if (insuranceData) {
      payload.insurance = insuranceData;
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
      case 'insurance':
        this.saveInsurance();
        break;
      case 'technical-manufacturer':
        this.saveTechnicalManufacturer();
        break;
      case 'financial':
        this.saveFinancial();
        break;
      case 'threshold':
        this.saveThreshold();
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
          this.setThresholdAssetFromCurrent(createdId);
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
      case 'insurance':
        return this.isSavingInsurance;
      case 'technical-manufacturer':
        return this.isSavingTechnical;
      case 'financial':
        return this.isSavingFinancial;
      case 'threshold':
        return this.isSavingThreshold;
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
    if (!payload || !payload.location) {
      this.locationError = 'Location is required';
      this.cdr.detectChanges();
      console.warn('No location data to save');
      return;
    }
    this.locationError = undefined;

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
          this.navigateToTab('insurance', { id: assetId });
          this.loadAssetDetails(assetId);
        },
        error: () => {
          console.error('Failed to save location data');
        }
      });
  }

  private saveInsurance(): void {
    const payload = this.buildInsurancePayload();
    if (!payload) {
      console.warn('No insurance data to save');
      const assetId = this.getAssetIdFromParams();
      if (assetId) {
        this.navigateToTab('technical-manufacturer', { id: assetId });
      }
      return;
    }

    const assetId = this.getAssetIdFromParams();
    if (!assetId) {
      console.warn('Cannot save insurance data without asset ID');
      return;
    }

    this.isSavingInsurance = true;
    this.assetsService
      .updateInsurance(assetId, payload)
      .pipe(finalize(() => {
        this.isSavingInsurance = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.navigateToTab('technical-manufacturer', { id: assetId });
          this.loadAssetDetails(assetId);
        },
        error: () => {
          console.error('Failed to save insurance data');
          this.toastr.error('Failed to save insurance data');
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
          this.navigateToTab('threshold', { id: assetId });
          this.loadAssetDetails(assetId);
        },
        error: () => {
          console.error('Failed to save financial data');
        }
      });
  }

  private saveThreshold(): void {
    const payload = this.buildThresholdPayload();
    if (!payload) {
      this.toastr.error('Asset information is missing. Please complete previous steps first.');
      return;
    }

    this.isSavingThreshold = true;
    this.pmTemplateService.createPredictiveThreshold(payload).pipe(
      finalize(() => {
        this.isSavingThreshold = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        const assetId = this.getAssetIdFromParams();
        this.navigateToTab('warranty-lifecycle', assetId ? { id: assetId } : undefined);
      },
      error: () => {
        console.error('Failed to save threshold data');
        this.toastr.error('Failed to save threshold data');
      }
    });
  }

  private loadCategories(): void {
    this.categoryLoading = true;
    this.assetsService
      .fetchAssetCategories()
      .pipe(
        finalize(() => {
          this.categoryLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.categoryOptions = (response.data ?? []).filter((cat): cat is AssetCategory => Boolean(cat?.name));
          this.filteredCategories = [...this.categoryOptions];
        },
        error: () => {
          this.categoryOptions = [];
        }
      });
  }

  private loadAssetTypes(): void {
    this.assetTypeLoading = true;
    this.assetsService
      .fetchAssetTypes()
      .pipe(
        finalize(() => {
          this.assetTypeLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.assetTypeOptions = response.data ?? [];
        },
        error: () => {
          this.assetTypeOptions = [];
        }
      });
  }

  onCategoryInput(value: string): void {
    this.assetMaster.assetCategory = value;
    const term = value.toLowerCase();
    this.filteredCategories = this.categoryOptions.filter(cat =>
      (cat.name ?? '').toLowerCase().includes(term)
    );
    this.showCategoryDropdown = this.filteredCategories.length > 0;
  }

  selectCategory(name: string): void {
    this.assetMaster.assetCategory = name;
    this.showCategoryDropdown = false;
  }

  handleCategoryFocus(): void {
    this.filteredCategories = [...this.categoryOptions];
    this.showCategoryDropdown = this.filteredCategories.length > 0;
  }

  handleCategoryBlur(): void {
    setTimeout(() => {
      this.showCategoryDropdown = false;
      this.cdr.detectChanges();
    }, 150);
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

  onAssetTypeSelected(value: string): void {
    this.assetMaster.assetType = value;
    const selected = this.assetTypeOptions.find(
      (type) => type.name === value || type.code === value
    );
    if (!selected) {
      this.assetMaster.assetTypeId = null;
      return;
    }

    this.assetMaster.assetTypeId = selected.id ?? null;

    if (selected.assetCategory) {
      this.assetMaster.assetCategory = selected.assetCategory;
    }

    if (selected.defaultCriticality) {
      this.assetMaster.criticality = this.normalizeCriticality(selected.defaultCriticality);
    }

    if (typeof selected.active === 'boolean') {
      this.assetMaster.status = selected.active ? 'IN_SERVICE' : 'OUT_OF_SERVICE';
    }
  }

}



