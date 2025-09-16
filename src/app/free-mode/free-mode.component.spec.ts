import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { FreeModeComponent } from './free-mode.component';

describe('FreeModeComponent', () => {
  let component: FreeModeComponent;
  let fixture: ComponentFixture<FreeModeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FreeModeComponent],
      providers: [
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        { provide: ActivatedRoute, useValue: { params: { subscribe: () => ({ unsubscribe: () => {} }) } } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FreeModeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
