// free-mode.component.ts
import { Component } from '@angular/core';
import { BlocklyWorkspaceComponent } from '../components/blockly-workspace/blockly-workspace.component';
import { NaturalDeductionComponent } from '../components/natural-deduction/natural-deduction.component';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-free-mode',
  templateUrl: './free-mode.component.html',
  styleUrls: ['./free-mode.component.css'],
  imports: [CommonModule, BlocklyWorkspaceComponent, NaturalDeductionComponent],
})
export class FreeModeComponent {
  activeTab: 'blockly' | 'deduccion' = 'blockly';

  constructor(private router: Router) {}

  goHome() {
    this.router.navigate(['/modo']);
  }
}
