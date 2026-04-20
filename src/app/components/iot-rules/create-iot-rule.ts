import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { AssetsService } from '../../services/assets.service';
import { IotMetricService } from '../../services/iot-metric.service';
import {
  IotRuleCreatePayload,
  IotRuleOperator,
  IotRuleService,
  IotRuleUpdatePayload
} from '../../services/iot-rule.service';

@Component({
  selector: 'app-create-iot-rule',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-iot-rule.html',
  styleUrl: './create-iot-rule.css'
})
export class CreateIotRuleComponent implements OnInit {
  isEditMode = false;
  ruleId?: string;
  isLoading = false;
  isSubmitting = false;
  errorMessage?: string;

  assetOptions: Array<{ id: string; label: string; locationText: string }> = [];
  metricOptions: Array<{ code: string; label: string }> = [];
  private assetMap: Record<string, { id: string; label: string; locationText: string }> = {};

  form = {
    assetId: '',
    metricCode: '',
    location: '',
    ruleOperator: 'ABOVE' as IotRuleOperator,
    lowThreshold: '',
    mediumThreshold: '',
    highThreshold: '',
    criticalThreshold: '',
    cooldownMinutes: '',
    spikeDelta: '',
    consecutiveAbnormalCount: '',
    autoCreateServiceRequest: true,
    active: true
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly iotRuleService: IotRuleService,
    private readonly iotMetricService: IotMetricService,
    private readonly assetsService: AssetsService,
    private readonly toastr: ToastrService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAssets();
    this.loadMetrics();

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }
    this.isEditMode = true;
    this.ruleId = id;
    this.loadRule(id);
  }

  onCancel(): void {
    this.router.navigate(['/iot/rules']);
  }

  onAssetChange(assetId: string): void {
    this.form.assetId = assetId;
    this.form.location = this.assetMap[assetId]?.locationText ?? '';
  }

  onSubmit(): void {
    const payload = this.buildPayload();
    if (!payload) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = undefined;

    const request$ = this.isEditMode && this.ruleId
      ? this.iotRuleService.updateRule(this.ruleId, payload as IotRuleUpdatePayload)
      : this.iotRuleService.createRule(payload as IotRuleCreatePayload);

    request$
      .pipe(finalize(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.toastr.success(this.isEditMode ? 'IoT rule updated successfully.' : 'IoT rule created successfully.');
          this.router.navigate(['/iot/rules']);
        },
        error: () => {
          this.errorMessage = this.isEditMode
            ? 'Unable to update IoT rule. Please try again.'
            : 'Unable to create IoT rule. Please try again.';
          this.toastr.error(this.errorMessage);
        }
      });
  }

  private loadRule(id: string): void {
    this.isLoading = true;
    this.iotRuleService
      .fetchRuleById(id)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          const rule = response.data;
          if (!rule) {
            this.errorMessage = 'IoT rule not found.';
            return;
          }
          this.form = {
            assetId: rule.assetId ? String(rule.assetId) : '',
            metricCode: rule.metricCode ?? '',
            location: rule.location ?? '',
            ruleOperator: (rule.ruleOperator ?? 'ABOVE') as IotRuleOperator,
            lowThreshold: this.toText(rule.lowThreshold),
            mediumThreshold: this.toText(rule.mediumThreshold),
            highThreshold: this.toText(rule.highThreshold),
            criticalThreshold: this.toText(rule.criticalThreshold),
            cooldownMinutes: this.toText(rule.cooldownMinutes),
            spikeDelta: this.toText(rule.spikeDelta),
            consecutiveAbnormalCount: this.toText(rule.consecutiveAbnormalCount),
            autoCreateServiceRequest: Boolean(rule.autoCreateServiceRequest),
            active: Boolean(rule.active)
          };
        },
        error: () => {
          this.errorMessage = 'Unable to load IoT rule details.';
        }
      });
  }

  private loadAssets(): void {
    this.assetsService.fetchAssets(0, 500).subscribe({
      next: (response) => {
        const content = response.data?.content ?? [];
        this.assetOptions = content
          .filter(asset => asset.id !== undefined)
          .map(asset => ({
            id: String(asset.id),
            label: asset.assetName ?? asset.assetId ?? `Asset ${asset.id}`,
            locationText: this.extractLocationText(asset.location)
          }));
        this.assetMap = this.assetOptions.reduce((acc, asset) => {
          acc[asset.id] = asset;
          return acc;
        }, {} as Record<string, { id: string; label: string; locationText: string }>);
        if (this.form.assetId) {
          this.onAssetChange(this.form.assetId);
        }
      },
      error: () => {
        this.assetOptions = [];
      }
    });
  }

  private loadMetrics(): void {
    this.iotMetricService.fetchMetrics({ page: 0, size: 500 }).subscribe({
      next: (response) => {
        const content = response.data?.content ?? [];
        this.metricOptions = content
          .filter(metric => !!metric.metricCode)
          .map(metric => ({
            code: metric.metricCode as string,
            label: metric.metricName ?? (metric.metricCode as string)
          }));
      },
      error: () => {
        this.metricOptions = [];
      }
    });
  }

  private buildPayload(): IotRuleCreatePayload | IotRuleUpdatePayload | null {
    const assetId = Number(this.form.assetId);
    if (!Number.isFinite(assetId)) {
      this.errorMessage = 'Asset is required.';
      return null;
    }
    if (!this.form.metricCode.trim()) {
      this.errorMessage = 'Metric code is required.';
      return null;
    }

    const payload: IotRuleCreatePayload = {
      assetId,
      metricCode: this.form.metricCode.trim(),
      location: this.form.location.trim(),
      ruleOperator: this.form.ruleOperator,
      lowThreshold: this.toNumber(this.form.lowThreshold),
      mediumThreshold: this.toNumber(this.form.mediumThreshold),
      highThreshold: this.toNumber(this.form.highThreshold),
      criticalThreshold: this.toNumber(this.form.criticalThreshold),
      cooldownMinutes: this.toInt(this.form.cooldownMinutes),
      spikeDelta: this.toNumber(this.form.spikeDelta),
      consecutiveAbnormalCount: this.toInt(this.form.consecutiveAbnormalCount),
      autoCreateServiceRequest: this.form.autoCreateServiceRequest,
      active: this.form.active
    };

    return payload;
  }

  private toNumber(value: string): number {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toInt(value: string): number {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
  }

  private toText(value: number | undefined): string {
    return typeof value === 'number' ? String(value) : '';
  }

  private extractLocationText(location: unknown): string {
    if (!location) {
      return '';
    }
    if (typeof location === 'string') {
      return location;
    }
    if (typeof location === 'object') {
      const loc = location as Record<string, unknown>;
      const candidates = [
        loc['location'],
        loc['primaryLocation'],
        loc['functionalLocation'],
        loc['department'],
        loc['costCenter']
      ];
      const first = candidates.find((v) => typeof v === 'string' && v.trim().length > 0);
      return typeof first === 'string' ? first : '';
    }
    return '';
  }
}
