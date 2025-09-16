import { Component } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { BlocklyWorkspaceComponent } from './components/blockly-workspace/blockly-workspace.component';
// import { NaturalDeductionComponent } from './components/natural-deduction/natural-deduction.component';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'CodeTracer';
  activeTab: 'deduccion' | 'blockly' = 'blockly';
}
