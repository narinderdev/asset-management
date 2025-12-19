import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { FailureCodeComponent } from './failure-code';
import { environment } from '../../../environments/environment';

describe('FailureCodeComponent', () => {
  let component: FailureCodeComponent;
  let fixture: ComponentFixture<FailureCodeComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FailureCodeComponent, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(FailureCodeComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();

    const mockResponse = {
      statusCode: 200,
      status: 'success',
      message: 'Failure codes retrieved successfully',
      data: [
        {
          id: 1,
          failureSymptomCode: 'NOISE',
          symptomDescription: 'Noise',
          failureCauseCode: 'BEARING FAILURE',
          causeDescription: 'Bearing worn out',
          actionCode: 'REPLACE PART',
          actionDescription: 'Replace part'
        }
      ]
    };

    const request = httpMock.expectOne(req =>
      req.url === `${environment.apiUrl}/api/failure-codes`
    );
    expect(request.request.headers.get('ngrok-skip-browser-warning')).toBe('true');
    request.flush(mockResponse);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
