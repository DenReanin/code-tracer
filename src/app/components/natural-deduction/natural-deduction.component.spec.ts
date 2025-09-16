import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { NaturalDeductionComponent } from './natural-deduction.component';

describe('NaturalDeductionComponent', () => {
  let component: NaturalDeductionComponent;
  let fixture: ComponentFixture<NaturalDeductionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NaturalDeductionComponent],
      providers: [
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        { provide: ActivatedRoute, useValue: { params: { subscribe: () => ({ unsubscribe: () => {} }) } } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NaturalDeductionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
