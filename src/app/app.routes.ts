import { Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component';
import { ModeSelectionComponent } from './mode-selection/mode-selection.component';
import { FreeModeComponent } from './free-mode/free-mode.component';
import { ExerciseListComponent } from './components/exercise-list/exercise-list.component';
import { BlocklyWorkspaceComponent } from './components/blockly-workspace/blockly-workspace.component';
import { NaturalDeductionComponent } from './components/natural-deduction/natural-deduction.component';


export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'modo', component: ModeSelectionComponent },
  { path: 'libre', component: FreeModeComponent },
  { path: 'ejercicios', component: ExerciseListComponent },
  { 
    path: 'ejercicio/:exerciseId', 
    component: BlocklyWorkspaceComponent
  },
  { 
    path: 'deduccion/:exerciseId',
    component: NaturalDeductionComponent
  }


];
