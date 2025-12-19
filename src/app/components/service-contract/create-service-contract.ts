import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-service-contract',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-service-contract.html',
  styleUrls: ['./create-service-contract.css']
})
export class CreateServiceContractComponent {
  contract = {
    contractId: 'CNTR-2023',
    contractName: '',
    vendor: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    coveredAssets: '',
    coverageType: '',
    responseTimeSla: '32 Hrs',
    uptimeSla: '99.9%',
    notes: ''
  };

  contractNames = ['Annual Pump Maintenance', 'Transformer Warranty', 'Boiler Coverage'];
  vendorOptions = ['FGGRGWE', 'XYZ Services', 'ABC Industrial'];
  coverageOptions = ['Full Service', 'Warranty Extension', 'Parts Only'];

  constructor(private router: Router) {}

  onCancel(): void {
    this.router.navigate(['/service-contracts']);
  }

  onCreate(): void {
    console.log('Creating service contract', this.contract);
    this.router.navigate(['/service-contracts']);
  }
}
