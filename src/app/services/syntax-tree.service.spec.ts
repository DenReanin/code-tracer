import { TestBed } from '@angular/core/testing';

import { SyntaxTreeService } from './syntax-tree.service';

describe('SyntaxTreeService', () => {
  let service: SyntaxTreeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SyntaxTreeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
