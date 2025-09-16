import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mode-selection',
  templateUrl: './mode-selection.component.html',
  styleUrls: ['./mode-selection.component.css']
})
export class ModeSelectionComponent {
  constructor(private router: Router) {}

  goToFreeMode() {
    this.router.navigate(['/libre']);
  }

  goToExercises() {
    this.router.navigate(['/ejercicios']);
  }
}