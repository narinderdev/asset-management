import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-work-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-work-order.html',
  styleUrls: ['./create-work-order.css']
})
export class CreateWorkOrderComponent {
  dateToday = new Date().toISOString().split('T')[0];

  workOrder = {
    woId: 'WO-2023-0012',
    linkedRequestId: '',
    asset: '',
    location: '',
    workType: '',
    priority: '',
    woTitle: '',
    description: '',
    planner: '',
    assignedTechnician: '',
    assignedCrewTeam: '',
    plannedStartDate: this.dateToday,
    plannedStartTime: '',
    plannedEndDate: this.dateToday,
    plannedEndTime: '',
    targetCompletionDate: this.dateToday,
    status: '',
    woSource: ''
  };

  assetOptions = ['Chiller #1', 'Generator A', 'Conveyor Belt 3'];
  workTypeOptions = ['Corrective', 'Preventive', 'Inspection', 'Emergency'];
  priorityOptions = ['Low', 'Medium', 'High', 'Critical'];
  plannerOptions = ['In-House Planner', 'External Planner', 'Operations Planner'];
  technicianOptions = ['Alex King', 'Dana Rivers', 'Morgan Brooks'];
  crewOptions = ['Team Alpha', 'Team Bravo', 'Field Ops'];
  statusOptions = ['Planned', 'In Progress', 'Pending', 'Completed', 'On Hold'];
  woSourceOptions = ['Service Request', 'Inspection', 'Maintenance Plan', 'Manual Entry'];

  autoGenerateWoId = false;

  constructor(private router: Router) {}

  onCancel(): void {
    this.router.navigate(['/work-orders']);
  }

  onAutoGenerateWoIdChange(): void {
    if (this.autoGenerateWoId) {
      this.workOrder.woId = '';
    }
  }

  onCreate(): void {
    console.log('Creating work order', this.workOrder);
    this.router.navigate(['/work-orders']);
  }
}
