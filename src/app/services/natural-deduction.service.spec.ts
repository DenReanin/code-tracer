import { TestBed } from '@angular/core/testing';

import { NaturalDeductionService } from './natural-deduction.service';

describe('NaturalDeductionService', () => {
  let service: NaturalDeductionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NaturalDeductionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
