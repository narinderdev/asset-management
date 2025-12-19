import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-failure-code',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-failure-code.html',
  styleUrls: ['./create-failure-code.css']
})
export class CreateFailureCodeComponent {
  failureCode = {
    symptomCode: '',
    symptomDescription: '',
    failureCauseCode: '',
    causeDescription: '',
    actionCode: '',
    actionDescription: ''
  };

  constructor(private router: Router) {}

  onCancel(): void {
    this.router.navigate(['/failure-codes']);
  }

  onCreate(): void {
    console.log('Adding failure code', this.failureCode);
    this.router.navigate(['/failure-codes']);
  }
}
