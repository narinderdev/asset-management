import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CostChart } from './cost-chart';

describe('CostChart', () => {
  let component: CostChart;
  let fixture: ComponentFixture<CostChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CostChart]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CostChart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
