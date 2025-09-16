import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SyntaxTreeVisualizerComponent } from './syntax-tree-visualizer.component';

describe('SyntaxTreeVisualizerComponent', () => {
  let component: SyntaxTreeVisualizerComponent;
  let fixture: ComponentFixture<SyntaxTreeVisualizerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SyntaxTreeVisualizerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SyntaxTreeVisualizerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
