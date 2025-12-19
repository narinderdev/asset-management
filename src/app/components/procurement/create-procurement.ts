import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-procurement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-procurement.html',
  styleUrls: ['./create-procurement.css']
})
export class CreateProcurementComponent {
  today = new Date().toISOString().split('T')[0];

  requisition = {
    prId: 'PR-2023',
    requester: '',
    requestDate: this.today,
    requiredBy: this.today,
    priority: 'Low',
    requiredForType: '',
    department: '',
    costCenter: '',
    currency: 'USD - US Dollar',
    preferredVendor: '',
    requiredForReference: '',
    status: 'Draft',
    purpose: ''
  };

  priorityOptions = ['Low', 'Medium', 'High'];
  requiredForOptions = ['Part', 'Service', 'Tool'];
  currencyOptions = ['USD - US Dollar', 'EUR - Euro'];
  statusOptions = ['Draft', 'Pending Approval', 'Approved'];

  lineItem = {
    itemType: 'Part',
    itemDescription: '',
    qty: 1,
    uom: 'Each',
    estimatedUnitPrice: '0.00',
    suggestedVendor: ''
  };

  constructor(private router: Router) {}

  onCancel(): void {
    this.router.navigate(['/procurement']);
  }

  onCreate(): void {
    console.log('Submitting purchase requisition', this.requisition, this.lineItem);
    this.router.navigate(['/procurement']);
  }
}
