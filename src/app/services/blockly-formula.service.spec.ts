import { TestBed } from '@angular/core/testing';

import { BlocklyFormulaService } from './blockly-formula.service';

describe('BlocklyFormulaService', () => {
  let service: BlocklyFormulaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BlocklyFormulaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
