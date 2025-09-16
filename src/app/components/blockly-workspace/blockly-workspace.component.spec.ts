import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { BlocklyWorkspaceComponent } from './blockly-workspace.component';

describe('BlocklyWorkspaceComponent', () => {
  let component: BlocklyWorkspaceComponent;
  let fixture: ComponentFixture<BlocklyWorkspaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlocklyWorkspaceComponent],
      providers: [
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        { provide: ActivatedRoute, useValue: { params: { subscribe: () => ({ unsubscribe: () => {} }) } } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlocklyWorkspaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
