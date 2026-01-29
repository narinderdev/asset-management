import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { InventoryService, InventoryDetailResponse } from '../../services/inventory.service';
import { Loader } from '../loader/loader';

@Component({
  selector: 'app-view-inventory',
  standalone: true,
  imports: [CommonModule, Loader],
  templateUrl: './view-inventory.html',
  styleUrls: ['./view-inventory.css']
})
export class ViewInventoryComponent implements OnInit {
  inventoryItem?: InventoryDetailResponse['data'];
  isLoading = false;
  errorMessage?: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private inventoryService: InventoryService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'Missing inventory identifier.';
      return;
    }
    this.loadInventoryItem(id);
  }

  private loadInventoryItem(id: string): void {
    this.isLoading = true;
    this.errorMessage = undefined;

    this.inventoryService.fetchInventoryItemById(id)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: response => {
          if (response.data) {
            this.inventoryItem = response.data;
          } else {
            this.errorMessage = response.message ?? 'Inventory item not found.';
          }
        },
        error: () => {
          this.errorMessage = 'Unable to load inventory item.';
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/inventory']);
  }

  formatDate(value?: string): string {
    if (!value) {
      return '—';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '—';
    }

    return parsed.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }
}
