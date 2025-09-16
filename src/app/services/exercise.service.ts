import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Exercise {
  id: number;
  title: string;
  description: string;
  objective: string;
  hint?: string;
  targetFormula?: string;
  targetDerivation?: {
    premises: string[];
    goal: string;
  };
  completed: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'interface' | 'deduction';
  instructions?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class ExerciseService {
  private exercises: Exercise[] = [
    {
      id: 1,
      title: 'Exploración de la Interfaz',
      description:
        'Familiarízate con todos los operadores lógicos y la interfaz de Blockly.',
      objective:
        'Construye una fórmula compleja que use todos los operadores: (P ∧ Q) → (¬R ∨ S)',
      hint: 'Necesitas usar: conjunción (∧), implicación (→), negación (¬), y disyunción (∨). Empieza construyendo las partes más pequeñas y luego combínalas.',
      targetFormula: '((P ∧ Q) → (¬R ∨ S))',
      completed: false,
      difficulty: 'easy',
      type: 'interface',
      instructions: [
        '1. Arrastra un bloque de implicación (→) al workspace',
        '2. En la parte izquierda, construye: P ∧ Q usando un bloque de conjunción',
        '3. En la parte derecha, construye: ¬R ∨ S usando negación y disyunción',
        '4. ¡Genera la tabla de verdad para ver todos los casos posibles!',
        '5. Explora el árbol sintáctico para entender la estructura',
      ],
    },
    {
      id: 2,
      title: 'Deducción Natural: Demostración con Supuesto',
      description:
        'Aprende a usar supuestos temporales para demostrar implicaciones usando el Teorema de Deducción.',
      objective:
        'Demuestra que de las premisas P ∧ Q y Q → R se puede derivar P → R',
      hint: 'Para demostrar P → R, asume P como supuesto y trata de derivar R. Luego usa el Teorema de Deducción para cerrar el supuesto.',
      targetDerivation: {
        premises: ['P ∧ Q', 'Q → R'],
        goal: 'P → R',
      },
      completed: false,
      difficulty: 'medium',
      type: 'deduction',
      instructions: [
        '1. Las premisas ya están cargadas: P ∧ Q, Q → R',
        '2. Para demostrar P → R, cambia a modo "Supuesto" y asume P',
        '3. Selecciona la línea 1 (P ∧ Q) y aplica EC2 para obtener Q',
        '4. Selecciona líneas 2 (Q → R) y la nueva línea con Q, aplica MP para obtener R',
        '5. Aplica TD (Teorema de Deducción) para cerrar el supuesto',
      ],
    },
  ];

  private currentExerciseSubject = new BehaviorSubject<Exercise | null>(null);
  public currentExercise$ = this.currentExerciseSubject.asObservable();

  getExercises(): Exercise[] {
    return [...this.exercises];
  }

  getExercise(id: number): Exercise | undefined {
    return this.exercises.find((ex) => ex.id === id);
  }

  setCurrentExercise(exercise: Exercise | null): void {
    this.currentExerciseSubject.next(exercise);
  }

  completeExercise(id: number): void {
    const exercise = this.exercises.find((ex) => ex.id === id);
    if (exercise) {
      exercise.completed = true;
    }
  }

  checkFormulaMatch(currentFormula: string, targetFormula: string): boolean {
    const normalize = (formula: string) => {
      return formula
        .replace(/\s+/g, ' ')
        .replace(/^\((.+)\)$/, '$1')
        .trim()
        .toLowerCase();
    };

    const normalizedCurrent = normalize(currentFormula);
    const normalizedTarget = normalize(targetFormula);

    return normalizedCurrent === normalizedTarget;
  }
}
