import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartData,
  ChartOptions,
  Legend,
  LinearScale,
  Title,
  Tooltip
} from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title);

export interface TopNOnHandQtyItem {
  itemName?: string;
  itemCode: string;
  onHandQty: number;
}

interface PreparedBarItem {
  fullLabel: string;
  shortLabel: string;
  qty: number;
}

@Component({
  selector: 'app-top-n-onhand-qty-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './top-n-onhand-qty-chart.html',
  styleUrls: ['./top-n-onhand-qty-chart.css']
})
export class TopNOnHandQtyChartComponent implements OnChanges {
  @Input() items: TopNOnHandQtyItem[] | null | undefined = [];
  @Input() topN = 10;
  @Input() chartTitle = 'Top 5 items by On-hand Qty';
  @Input() yBeginAtZero = true;
  @Input() sortByValue = true;
  @Input() centerZero = false;

  readonly chartType = 'bar' as const;
  hasData = false;

  chartData: ChartData<'bar', number[], string> = {
    labels: [],
    datasets: [
      {
        label: 'On-hand Quantity',
        data: [],
        borderRadius: 6,
        backgroundColor: '#3b82f6',
        hoverBackgroundColor: '#2563eb',
        maxBarThickness: 48
      }
    ]
  };

  chartOptions: ChartOptions<'bar'> = this.buildChartOptions();

  private readonly numberFormatter = new Intl.NumberFormat('en-US');
  private fullLabels: string[] = [];
  private yAxisMin?: number;
  private yAxisMax?: number;

  ngOnChanges(_: SimpleChanges): void {
    this.rebuildChart();
    this.chartOptions = this.buildChartOptions();
  }

  private rebuildChart(): void {
    const source = Array.isArray(this.items) ? this.items : [];
    const limit = this.getTopN();

    let processed: PreparedBarItem[] = source
      .map(item => {
        const fullLabel = this.buildLabel(item);
        return {
          fullLabel,
          shortLabel: this.truncateLabel(fullLabel),
          qty: Number(item.onHandQty ?? 0)
        };
      })
      .filter(item => item.fullLabel.length > 0 && Number.isFinite(item.qty));

    if (this.sortByValue) {
      processed = processed.sort((a, b) => b.qty - a.qty);
    }

    processed = processed.slice(0, limit);

    const hasNegativeValues = processed.some(item => item.qty < 0);
    const backgroundColors = hasNegativeValues
      ? processed.map(item => (item.qty < 0 ? '#ef4444' : '#3b82f6'))
      : '#3b82f6';
    const hoverBackgroundColors = hasNegativeValues
      ? processed.map(item => (item.qty < 0 ? '#dc2626' : '#2563eb'))
      : '#2563eb';

    this.fullLabels = processed.map(item => item.fullLabel);

    if (this.centerZero && processed.length > 0) {
      const maxAbs = Math.max(...processed.map(item => Math.abs(item.qty)), 1);
      this.yAxisMin = -maxAbs;
      this.yAxisMax = maxAbs;
    } else {
      this.yAxisMin = undefined;
      this.yAxisMax = undefined;
    }

    this.chartData = {
      labels: processed.map(item => item.shortLabel),
      datasets: [
        {
          ...this.chartData.datasets[0],
          backgroundColor: backgroundColors,
          hoverBackgroundColor: hoverBackgroundColors,
          data: processed.map(item => item.qty)
        }
      ]
    };
    this.hasData = processed.length > 0;
  }

  private getTopN(): number {
    const parsed = Number(this.topN);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 10;
    }
    return Math.floor(parsed);
  }

  private buildChartOptions(): ChartOptions<'bar'> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 900,
        easing: 'easeOutCubic'
      },
      animations: {
        y: {
          from: 0,
          duration: 900,
          easing: 'easeOutCubic',
          delay: context => {
            if (context.type !== 'data' || context.mode === 'resize') {
              return 0;
            }
            return context.dataIndex * 80;
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: this.chartTitle || 'Top 5 items by On-hand Qty',
          align: 'start',
          color: '#1f2937',
          font: {
            size: 18,
            weight: 600
          },
          padding: {
            top: 8,
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            title: tooltipItems => {
              const index = tooltipItems[0]?.dataIndex ?? -1;
              return index >= 0 ? this.fullLabels[index] ?? '' : '';
            },
            label: tooltipItem => {
              const index = tooltipItem.dataIndex;
              const label = index >= 0 ? this.fullLabels[index] ?? '' : '';
              const qty = Number(tooltipItem.raw ?? 0);
              return `${label}: ${this.numberFormatter.format(qty)}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#6b7280',
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: this.yBeginAtZero,
          min: this.yAxisMin,
          max: this.yAxisMax,
          ticks: {
            color: '#6b7280',
            callback: value => this.numberFormatter.format(Number(value))
          },
          grid: {
            color: context => (Number((context as any)?.tick?.value ?? 0) === 0 ? '#9ca3af' : '#e5e7eb')
          }
        }
      }
    };
  }

  private buildLabel(item: TopNOnHandQtyItem): string {
    const itemName = item.itemName?.trim();
    if (itemName) {
      return itemName;
    }
    return item.itemCode?.trim() || '';
  }

  private truncateLabel(value: string): string {
    const maxLength = 18;
    if (value.length <= maxLength) {
      return value;
    }
    return `${value.slice(0, maxLength - 1)}\u2026`;
  }
}

