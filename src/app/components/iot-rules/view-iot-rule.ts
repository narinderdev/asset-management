import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Loader } from '../loader/loader';
import { IotRule, IotRuleService } from '../../services/iot-rule.service';

@Component({
  selector: 'app-view-iot-rule',
  standalone: true,
  imports: [CommonModule, Loader],
  templateUrl: './view-iot-rule.html',
  styleUrls: ['./view-iot-rule.css']
})
export class ViewIotRuleComponent implements OnInit {
  rule?: IotRule;
  isLoading = false;
  hasLoaded = false;
  errorMessage?: string;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly iotRuleService: IotRuleService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'Missing IoT rule identifier.';
      this.hasLoaded = true;
      return;
    }
    this.loadRule(id);
  }

  goBack(): void {
    this.router.navigate(['/iot/rules']);
  }

  editRule(): void {
    if (!this.rule?.id) {
      return;
    }
    this.router.navigate(['/iot/rules/edit', this.rule.id]);
  }

  private loadRule(id: string): void {
    this.isLoading = true;
    this.hasLoaded = false;
    this.errorMessage = undefined;

    this.iotRuleService
      .fetchRuleById(id)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.hasLoaded = true;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.rule = response.data;
          if (!this.rule) {
            this.errorMessage = response.message ?? 'IoT rule not found.';
          }
        },
        error: () => {
          this.rule = undefined;
          this.errorMessage = 'Unable to load IoT rule details.';
        }
      });
  }
}
