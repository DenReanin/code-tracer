import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ExerciseService, Exercise } from '../../services/exercise.service';

@Component({
  selector: 'app-exercise-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './exercise-list.component.html',
  styleUrls: ['./exercise-list.component.css']
})
export class ExerciseListComponent implements OnInit {
  exercises: Exercise[] = [];

  constructor(
    private exerciseService: ExerciseService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.exercises = this.exerciseService.getExercises();
  }

  startExercise(exercise: Exercise): void {
    this.exerciseService.setCurrentExercise(exercise);
    
    if (exercise.type === 'deduction') {
      this.router.navigate(['/deduccion', exercise.id]);
    } else {
      this.router.navigate(['/ejercicio', exercise.id]);
    }
  }

  getExerciseIcon(exercise: Exercise): string {
    switch (exercise.type) {
      case 'interface': return '🖥️';
      case 'deduction': return '🧠';
      default: return '📝';
    }
  }

  getTypeDescription(type: string): string {
    switch (type) {
      case 'interface': return 'Interfaz';
      case 'deduction': return 'Deducción';
      default: return 'General';
    }
  }

  goBack(): void {
    this.router.navigate(['/modo']);
  }
}