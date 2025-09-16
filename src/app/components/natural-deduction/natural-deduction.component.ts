import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NaturalDeductionService } from '../../services/natural-deduction.service';
import { HostListener } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  DeductionLine,
  LineType,
  RuleType,
} from '../../models/deduction.model';
import { KatexPipe } from '../../pipes/katex.pipe';
import { WorkspaceStateService } from '../../services/workspace-state.service';
import { BlocklyFormulaService } from '../../services/blockly-formula.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ExerciseService, Exercise } from '../../services/exercise.service';

@Component({
  selector: 'app-natural-deduction',
  standalone: true,
  imports: [CommonModule, FormsModule, KatexPipe],
  templateUrl: './natural-deduction.component.html',
  styleUrls: ['./natural-deduction.component.css'],
})
export class NaturalDeductionComponent implements OnInit, OnDestroy {
  // Propiedades para manejar la derivación
  lines: DeductionLine[] = [];
  goalFormula = '';
  goalFormulaError = '';

  // Formularios
  newPremise = '';
  newAssumption = '';
  inputMode: 'premisa' | 'supuesto' | 'regla' = 'premisa';
  inputFormula = '';
  selectedRule: RuleType | null = null;
  selectedLines: number[] = [];
  resultFormula = '';

  // Utilidades
  rules = Object.values(RuleType);
  LineType = LineType; // Para usar en el template
  suggestions: { rule: RuleType; description: string; lines: number[] }[] = [];
  errorMessage = '';
  errorHelpList: string[] = [];
  showHelp = false;

  currentExercise: Exercise | null = null;
  isExerciseMode = false;
  exerciseCompleted = false;

  constructor(
    private deductionService: NaturalDeductionService,
    private stateService: WorkspaceStateService,
    public blocklyFormulaService: BlocklyFormulaService,
    private route: ActivatedRoute,
    private router: Router,
    private exerciseService: ExerciseService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      if (params['exerciseId']) {
        // Modo ejercicio
        const exerciseId = parseInt(params['exerciseId']);
        const exercise = this.exerciseService.getExercise(exerciseId);
        if (exercise && exercise.type === 'deduction') {
          this.currentExercise = exercise;
          this.isExerciseMode = true;
          this.exerciseService.setCurrentExercise(exercise);
          this.setupExercise();
        }
      } else {
        // Modo libre
        this.isExerciseMode = false;
        this.currentExercise = null;
        this.exerciseCompleted = false;
        
        // Limpiar completamente
        this.deductionService.resetDerivation();
        this.goalFormula = '';
        
        // Restaurar estado guardado si existe
        setTimeout(() => {
          const saved = this.stateService.getDeductionState();
          if (saved && saved.lines && saved.lines.length > 0) {
            this.deductionService.loadDerivation(saved);
            if (saved.goalFormula) {
              this.goalFormula = saved.goalFormula;
            }
          }
        }, 10);
      }
    });

    // Suscribirse a los cambios en la derivación
    this.deductionService.derivation$.subscribe((derivation) => {
      this.lines = derivation.lines;
      this.updateSuggestions();
      if (this.isExerciseMode) {
        this.checkExerciseCompletion();
      }
    });
  }

  ngOnDestroy(): void {
    if (!this.isExerciseMode) {
      // Modo libre: guardar estado completo
      const state = this.deductionService.getCurrentDerivation();
      const stateWithGoal = {
        ...state,
        goalFormula: this.goalFormula
      };
      this.stateService.setDeductionState(stateWithGoal);
    } else {
      this.deductionService.resetDerivation();
    }
  }

  setupExercise(): void {
    if (!this.currentExercise?.targetDerivation) return;

    // Limpiar todo el estado anterior
    this.deductionService.resetDerivation();
    this.selectedLines = [];
    this.selectedRule = null;
    this.inputFormula = '';
    this.errorMessage = '';

    // Configurar objetivo
    this.goalFormula = this.currentExercise.targetDerivation.goal;

    // Pre-cargar premisas
    if (this.currentExercise.targetDerivation.premises) {
      this.currentExercise.targetDerivation.premises.forEach(premise => {
        try {
          this.deductionService.addPremise(premise);
        } catch (error) {
          console.error('Error al agregar premisa:', error);
        }
      });
    }
  }

  checkExerciseCompletion(): void {
    if (!this.currentExercise?.targetDerivation) return;

    const goalAchieved = this.lines.length > 0 &&
      this.lines[this.lines.length - 1].formula.replace(/\s/g, '') ===
      this.goalFormula.replace(/\s/g, '');

    if (goalAchieved && !this.exerciseCompleted) {
      this.exerciseCompleted = true;
      this.exerciseService.completeExercise(this.currentExercise.id);
      this.cdr.detectChanges();

      setTimeout(() => {
        alert('¡Ejercicio de deducción completado correctamente! 🎉\n\nHas demostrado exitosamente la derivación solicitada.');
      }, 500);
    } else if (!goalAchieved) {
      this.exerciseCompleted = false;
      this.cdr.detectChanges();
    }
  }

  showInstructionsModal(): void {
    if (this.currentExercise?.instructions) {
      const instructionsList = this.currentExercise.instructions.join('\n');
      alert(`📋 Instrucciones paso a paso:\n\n${instructionsList}`);
    }
  }

  showHintModal(): void {
    if (this.currentExercise?.hint) {
      alert(`💡 Pista: ${this.currentExercise.hint}`);
    }
  }

  goBackToExercises(): void {
    this.router.navigate(['/ejercicios']);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      this.undo();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      this.redo();
    }
  }

  // Exportar la derivación a PDF
  exportToPDF() {
    const doc = new jsPDF();
    let yPosition = 20;

    // === HEADER ===
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 62, 80); // Color azul oscuro
    doc.text('Derivación de Deducción Natural', 20, yPosition);

    // Línea decorativa
    doc.setDrawColor(52, 152, 219);
    doc.setLineWidth(2);
    doc.line(20, yPosition + 5, 190, yPosition + 5);
    yPosition += 20;

    // === OBJETIVO ===
    if (this.goalFormula) {
      // Fondo del objetivo
      if (this.goalAchieved) {
        doc.setFillColor(213, 244, 230);
      } else {
        doc.setFillColor(255, 243, 205);
      }
      doc.rect(20, yPosition - 3, 170, 15, 'F');

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('OBJETIVO: ', 25, yPosition + 5); // SIN EMOJI

      // Fórmula del objetivo
      doc.setFont('courier', 'bold');
      doc.setTextColor(231, 76, 60);
      doc.text(this.formatFormulaForPDF(this.goalFormula), 80, yPosition + 5); 

      // Estado
      if (this.goalAchieved) {
        doc.setTextColor(39, 174, 96);
        doc.setFont('helvetica', 'bold');
        doc.text('DEMOSTRADO', 160, yPosition + 5);
      }

      yPosition += 25;
    }

    // === TABLA DE DERIVACIÓN ===
    const tableData = this.prepareTableData();

    autoTable(doc, {
      head: [['Linea', 'Formula', 'Regla', 'Refs.']],
      body: tableData,
      startY: yPosition,
      styles: {
        fontSize: 10,
        cellPadding: 5,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
        font: 'helvetica',
        overflow: 'linebreak',
        halign: 'left',
      },
      headStyles: {
        fillColor: [52, 73, 94],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 11,
      },
      columnStyles: {
        0: {
          cellWidth: 25,
          halign: 'center',
          fontSize: 10,
        },
        1: {
          cellWidth: 85,
          fontStyle: 'normal',
          fontSize: 9,
        },
        2: {
          cellWidth: 35,
          halign: 'center',
          fontSize: 9,
        },
        3: {
          cellWidth: 25,
          halign: 'center',
          fontSize: 9,
        },
      },
      didDrawCell: (data) => {
        if (data.section === 'body') {
          const line = this.lines[data.row.index];

          // Colorear filas especiales
          if (line?.isDischargedAssumption) {
            doc.setFillColor(255, 235, 235);
          } else if (line?.type === LineType.ASSUMPTION) {
            doc.setFillColor(235, 248, 255);
          } else if (line?.type === LineType.PREMISE) {
            doc.setFillColor(235, 255, 235);
          }

          if (data.column.index === 1 && line?.subproofLevel > 0) {
            const x = data.cell.x;
            const y = data.cell.y;
            const height = data.cell.height;
            const textStartX = x + 8 + line.subproofLevel * 15;

            // Solo dibujar si hay espacio suficiente
            if (textStartX < x + data.cell.width - 10) {
              for (let level = 1; level <= line.subproofLevel; level++) {
                const lineX = x + 3 + (level - 1) * 15;

                doc.setDrawColor(80, 80, 80);
                doc.setLineWidth(1.2);
                doc.line(lineX, y + 2, lineX, y + height - 2);

                // Línea horizontal
                if (level === line.subproofLevel) {
                  doc.line(lineX, y + height / 2, lineX + 10, y + height / 2);
                }
              }
            }
          }
        }
      },
      margin: { left: 20, right: 20 },
    });

    // === LEYENDA===
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    this.addLegendToPDF(doc, finalY);

    // === PIE DE PÁGINA ===
    this.addFooterToPDF(doc);

    // Guardar
    doc.save(`derivacion_${new Date().getTime()}.pdf`);
  }

  /**
   * Prepara los datos de la tabla con formato mejorado
   */
  private prepareTableData(): string[][] {
    return this.lines.map((line) => {
      const spaces = '            '.repeat(line.subproofLevel); 
      const lineNumber = line.number.toString();

      let formulaDisplay = spaces + this.formatFormulaForPDF(line.formula);

      // Indicador de descarga
      if (line.isDischargedAssumption) {
        formulaDisplay = `${spaces}[D] ${this.formatFormulaForPDF(
          line.formula
        )}`;
      }

      // Regla formateada
      let ruleText = '';
      if (line.type === LineType.PREMISE) {
        ruleText = 'Premisa';
      } else if (line.type === LineType.ASSUMPTION) {
        ruleText = line.isDischargedAssumption ? 'Sup.D' : 'Supuesto';
      } else if (line.rule) {
        ruleText = line.rule.toUpperCase();
      }

      // Referencias
      const refs = line.referencedLines?.join(', ') || '';

      return [lineNumber, formulaDisplay, ruleText, refs];
    });
  }
  /**
   * Añade leyenda explicativa al PDF
   */
  private addLegendToPDF(doc: jsPDF, y: number) {
    // Marco de la leyenda
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.5);
    doc.rect(20, y - 8, 170, 55);

    // Fondo suave
    doc.setFillColor(248, 249, 250);
    doc.rect(20, y - 8, 170, 55, 'F');

    // Título
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(52, 73, 94);
    doc.text('LEYENDA DE SIMBOLOS Y REGLAS', 25, y + 3);

    // Línea separadora bajo el título
    doc.setDrawColor(52, 73, 94);
    doc.setLineWidth(0.8);
    doc.line(25, y + 6, 185, y + 6);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(73, 80, 87);

    // Símbolos lógicos
    doc.setFont('helvetica', 'bold');
    doc.text('Simbolos logicos:', 25, y + 15);
    doc.setFont('helvetica', 'normal');
    doc.text(
      '~ (negacion)    & (conjuncion)    | (disyuncion)    -> (implicacion)',
      25,
      y + 22
    );

    // Reglas principales
    doc.setFont('helvetica', 'bold');
    doc.text('Reglas principales:', 25, y + 31);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'MP (Modus Ponens)    TD (Teorema Deduccion)    IC/EC (Intro/Elim Conjuncion)',
      25,
      y + 38
    );
    doc.text(
      'ID (Intro Disyuncion)    IN/EN (Intro/Elim Negacion)    CASES (Prueba por Casos)',
      25,
      y + 44
    );
  }

  /**
   * Añade pie de página con información
   */
  private addFooterToPDF(doc: jsPDF) {
    const pageHeight = doc.internal.pageSize.height;
    const timestamp = new Date().toLocaleString('es-ES');
    const stats = this.getDerivationStats();

    // Línea separadora
    doc.setDrawColor(189, 195, 199);
    doc.setLineWidth(0.3);
    doc.line(20, pageHeight - 25, 190, pageHeight - 25);

    // Información
    doc.setFontSize(8);
    doc.setTextColor(127, 140, 141);
    doc.text(`Generado: ${timestamp}`, 20, pageHeight - 15);
    doc.text(
      `Líneas: ${stats.totalLines} | Premisas: ${stats.premises} | Supuestos: ${stats.assumptions}`,
      20,
      pageHeight - 8
    );

    // Aplicación
    doc.text('Code Tracer - Deducción Natural', 130, pageHeight - 15);
  }

  /**
   * Convierte símbolos lógicos para PDF
   */
  private formatFormulaForPDF(formula: string): string {
    return formula
      .replace(/¬/g, '~')
      .replace(/∧/g, ' & ')
      .replace(/∨/g, ' | ')
      .replace(/→/g, ' -> ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Obtiene estadísticas de la derivación
   */
  private getDerivationStats() {
    return {
      totalLines: this.lines.length,
      premises: this.lines.filter((l) => l.type === LineType.PREMISE).length,
      assumptions: this.lines.filter((l) => l.type === LineType.ASSUMPTION)
        .length,
      maxLevel: Math.max(...this.lines.map((l) => l.subproofLevel), 0),
    };
  }

  // Actualiza las sugerencias basadas en el estado actual
  updateSuggestions(): void {
    this.suggestions = this.deductionService.suggestApplicableRules();
  }

  // Métodos para manejar acciones del usuario
  addPremise(premise?: string): void {
    const formula = premise || this.newPremise.trim();
    if (!formula) {
      this.errorMessage = 'La premisa no puede estar vacía';
      return;
    }

    try {
      this.deductionService.addPremise(formula);
      this.newPremise = '';
      this.errorMessage = '';
      this.errorHelpList = [];
    } catch (e: any) {
      this.showError(e.message);
    }
  }

  addAssumption(assumption?: string): void {
    const formula = assumption || this.newAssumption.trim();
    if (!formula) {
      this.errorMessage = 'El supuesto no puede estar vacío';
      return;
    }

    try {
      this.deductionService.addAssumption(formula);
      this.newAssumption = '';
      this.errorMessage = '';
      this.errorHelpList = [];
    } catch (e: any) {
      this.showError(e.message);
    }
  }

  addLine() {
    if (!this.inputFormula.trim()) {
      this.errorMessage =
        'Debes introducir una fórmula lógica antes de añadir.';
      return;
    }
    this.errorMessage = '';
    if (this.inputMode === 'premisa') {
      this.addPremise(this.inputFormula);
    } else if (this.inputMode === 'supuesto') {
      this.addAssumption(this.inputFormula);
    } else if (this.inputMode === 'regla') {
      if (!this.selectedRule || this.selectedLines.length === 0) return;
      if (
        this.selectedRule === RuleType.TD ||
        this.selectedRule === RuleType.CASES ||
        this.selectedRule === RuleType.IN
      ) {
        const result = this.deductionService.dischargeAssumption(
          this.selectedRule,
          this.selectedLines,
          this.inputFormula.trim()
        );
        if (typeof result === 'object' && !result.success) {
          this.showError(result.message);
          return;
        }
      } else {
        const result = this.deductionService.applyRule(
          this.selectedRule,
          this.selectedLines,
          this.inputFormula.trim()
        );
        if (typeof result === 'object' && !result.success) {
          this.showError(result.message);
          return;
        }
      }
      this.selectedRule = null;
      this.selectedLines = [];
    }
    //this.inputFormula = '';
  }

  // Aplicar una regla seleccionada
  applySelectedRule(): void {
    if (!this.selectedRule) {
      this.showError('Debe seleccionar una regla');
      return;
    }

    if (this.selectedLines.length === 0) {
      this.showError('Debe seleccionar al menos una línea de referencia');
      return;
    }

    if (!this.resultFormula.trim()) {
      this.showError('Debe ingresar la fórmula resultante');
      return;
    }

    // Verificar si la regla implica cancelar un supuesto
    if (
      this.selectedRule === RuleType.TD ||
      this.selectedRule === RuleType.CASES ||
      this.selectedRule === RuleType.IN
    ) {
      const result = this.deductionService.dischargeAssumption(
        this.selectedRule,
        this.selectedLines,
        this.resultFormula.trim()
      );

      if (typeof result === 'object' && !result.success) {
        this.showError(result.message);
        return;
      }
    } else {
      const result = this.deductionService.applyRule(
        this.selectedRule,
        this.selectedLines,
        this.resultFormula.trim()
      );

      if (typeof result === 'object' && !result.success) {
        this.showError(result.message);
        return;
      }
    }

    // Limpiar selecciones después de aplicar la regla
    this.selectedRule = null;
    this.selectedLines = [];
    this.resultFormula = '';
    this.errorMessage = '';
    this.errorHelpList = [];
  }

  // Manejar la selección/deselección de líneas
  toggleLineSelection(lineNumber: number): void {
    const index = this.selectedLines.indexOf(lineNumber);
    if (index > -1) {
      this.selectedLines.splice(index, 1);
    } else {
      this.selectedLines.push(lineNumber);
    }
  }

  // Aplicar una sugerencia
  applySuggestion(suggestion: {
    rule: RuleType;
    description: string;
    lines: number[];
  }): void {
    this.selectedRule = suggestion.rule;
    this.selectedLines = [...suggestion.lines];
    this.resultFormula = ''; // No autocompletar, dejar vacío

    // // Intentar generar automáticamente la fórmula resultante
    // const formulas = this.selectedLines.map(
    //   (idx) => this.lines[idx - 1]?.formula?.trim() || ''
    // );

    // switch (suggestion.rule) {
    //   case RuleType.MP: {
    //     // MP: A → B, A ⊢ B
    //     const implicationFormula = formulas.find((f) => f.includes('→')) || '';
    //     if (implicationFormula) {
    //       const parsed =
    //         this.deductionService['parseImplication'](implicationFormula);
    //       this.resultFormula = parsed ? parsed[1] : '';
    //     } else {
    //       this.resultFormula = '';
    //     }
    //     break;
    //   }
    //   case RuleType.IC: {
    //     // IC: A, B ⊢ (A ∧ B) (quita paréntesis exteriores redundantes)
    //     if (formulas.length === 2) {
    //       const removeOuter = (s: string) => {
    //         s = s.trim();
    //         while (s.startsWith('(') && s.endsWith(')')) {
    //           s = s.slice(1, -1).trim();
    //         }
    //         return s;
    //       };
    //       const left = removeOuter(formulas[0]);
    //       const right = removeOuter(formulas[1]);
    //       this.resultFormula = `(${left} ∧ ${right})`;
    //     }
    //     break;
    //   }
    //   case RuleType.EC1: {
    //     // EC1: A ∧ B ⊢ A
    //     const parsed = this.deductionService['parseConjunction'](formulas[0]);
    //     this.resultFormula = parsed ? parsed[0] : '';
    //     break;
    //   }
    //   case RuleType.EC2: {
    //     // EC2: A ∧ B ⊢ B
    //     const parsed = this.deductionService['parseConjunction'](formulas[0]);
    //     this.resultFormula = parsed ? parsed[1] : '';
    //     break;
    //   }
    //   case RuleType.ID1: {
    //     // ID1: A ⊢ A ∨ B (no se puede autocompletar B)
    //     if (formulas[0]) {
    //       const removeOuter = (s: string) => {
    //         s = s.trim();
    //         while (s.startsWith('(') && s.endsWith(')')) {
    //           s = s.slice(1, -1).trim();
    //         }
    //         return s;
    //       };
    //       this.resultFormula = `${removeOuter(formulas[0])} ∨ `;
    //     }
    //     break;
    //   }
    //   case RuleType.ID2: {
    //     // ID2: B ⊢ A ∨ B (no se puede autocompletar A)
    //     if (formulas[0]) {
    //       const removeOuter = (s: string) => {
    //         s = s.trim();
    //         while (s.startsWith('(') && s.endsWith(')')) {
    //           s = s.slice(1, -1).trim();
    //         }
    //         return s;
    //       };
    //       this.resultFormula = ` ∨ ${removeOuter(formulas[0])}`;
    //     }
    //     break;
    //   }
    //   case RuleType.EN: {
    //     // EN: ¬¬A ⊢ A
    //     let f = formulas[0].trim();
    //     if (f.startsWith('¬¬')) {
    //       this.resultFormula = f.slice(2).trim();
    //     } else {
    //       this.resultFormula = '';
    //     }
    //     break;
    //   }
    //   case RuleType.MT: {
    //     // MT: A → B, ¬B ⊢ ¬A
    //     const implicationFormula = formulas.find((f) => f.includes('→')) || '';
    //     if (implicationFormula) {
    //       const parsed =
    //         this.deductionService['parseImplication'](implicationFormula);
    //       this.resultFormula = parsed ? `¬${parsed[0]}` : '';
    //     } else {
    //       this.resultFormula = '';
    //     }
    //     break;
    //   }
    //   case RuleType.SILOGISMO: {
    //     // SILOGISMO: A → B, B → C ⊢ A → C
    //     if (
    //       formulas.length === 2 &&
    //       formulas[0].includes('→') &&
    //       formulas[1].includes('→')
    //     ) {
    //       const parsed1 = this.deductionService['parseImplication'](
    //         formulas[0]
    //       );
    //       const parsed2 = this.deductionService['parseImplication'](
    //         formulas[1]
    //       );
    //       if (parsed1 && parsed2) {
    //         this.resultFormula = `(${parsed1[0]} → ${parsed2[1]})`;
    //       } else {
    //         this.resultFormula = '';
    //       }
    //     }
    //     break;
    //   }
    //   // Para reglas más complejas como TD, IN, CASES, no se puede autocompletar
    //   default:
    //     this.resultFormula = '';
    // }
  }

  // Reiniciar la derivación
  resetDerivation(): void {
    this.deductionService.resetDerivation();
    this.selectedRule = null;
    this.selectedLines = [];
    this.resultFormula = '';
    this.newPremise = '';
    this.newAssumption = '';
    this.errorMessage = '';
  }

  // Métodos auxiliares para el template
  getRuleDescription(rule: RuleType): string {
    const descriptions: Record<RuleType, string> = {
      [RuleType.MP]: 'Modus Ponens',
      [RuleType.TD]: 'Teorema de Deducción',
      [RuleType.IC]: 'Introducción de Conjunción',
      [RuleType.EC1]: 'Eliminación de Conjunción 1',
      [RuleType.EC2]: 'Eliminación de Conjunción 2',
      [RuleType.ID1]: 'Introducción de Disyunción 1',
      [RuleType.ID2]: 'Introducción de Disyunción 2',
      [RuleType.CASES]: 'Prueba por Casos',
      [RuleType.IN]: 'Introducción de Negación',
      [RuleType.EN]: 'Eliminación de Negación',
      //[RuleType.MT]: 'Modus Tollens',
      //[RuleType.SILOGISMO]: 'Silogismo Hipotético',
    };

    return descriptions[rule] || rule;
  }

  // Para renderizar el nivel de sangría de las subpruebas
  getIndentationStyle(line: DeductionLine): object {
    return {
      'margin-left': `${line.subproofLevel * 20}px`,
    };
  }

  // Para mostrar visualmente las líneas seleccionadas
  isLineSelected(lineNumber: number): boolean {
    return this.selectedLines.includes(lineNumber);
  }

  // Verifica si una línea es una subprueba cerrada
  isClosedLine(line: DeductionLine): boolean {
    const derivation = this.deductionService['currentDerivation'].value;
    if (!derivation.closedSubproofs) return false;
    return derivation.closedSubproofs.some(
      (range) => line.number >= range.from && line.number <= range.to
    );
  }

  showError(msg: string) {
    this.errorMessage = msg;
    // Mensajes didácticos según el motivo
    if (msg.includes('no es una fórmula lógica válida')) {
      this.errorHelpList = [
        'Asegúrate de que la fórmula esté correctamente parentizada y estructurada.',
        'Ejemplo válido: ((P ∧ Q) → (Q ∧ P))',
        'No válido: (P ∧ Q → Q ∧ P)',
      ];
    } else if (msg.includes('Paréntesis desbalanceados')) {
      this.errorHelpList = [
        'Cada "(" debe tener un ")" correspondiente.',
        'Ejemplo válido: ((P ∧ Q) → (Q ∧ P))',
      ];
    } else if (msg.includes('pegadas sin conector')) {
      this.errorHelpList = [
        'Entre dos subfórmulas debe haber un conector lógico.',
        'Ejemplo válido: (P ∧ Q)',
        'No válido: (P)(Q)',
      ];
    } else if (msg.includes('No se permiten paréntesis vacíos')) {
      this.errorHelpList = [
        'No se permiten paréntesis vacíos.',
        'Ejemplo válido: (P)',
        'No válido: ()',
      ];
    } else if (msg.includes('No se permiten dos conectores lógicos seguidos')) {
      this.errorHelpList = [
        'No se permiten dos conectores lógicos seguidos.',
        'Ejemplo válido: (P ∧ Q)',
        'No válido: (P ∧ ∧ Q)',
      ];
    } else if (msg.includes('Falta subfórmula')) {
      this.errorHelpList = [
        'Falta una subfórmula después del conector.',
        'Ejemplo válido: ¬P',
        'No válido: ¬',
      ];
    } else if (msg.includes('No hay conector entre átomos')) {
      this.errorHelpList = [
        'Entre dos átomos debe haber un conector lógico.',
        'Ejemplo válido: (P ∧ Q)',
        'No válido: (P Q)',
      ];
    } else if (msg.includes('No es átomo válido')) {
      this.errorHelpList = [
        'Un átomo debe ser una sola letra (por ejemplo, "P" o "Q1").',
        'No se permiten palabras largas como "PP".',
        'Ejemplo válido: P',
      ];
    } else if (msg.includes('Falta operando derecho')) {
      this.errorHelpList = [
        'Falta el operando derecho del conector lógico.',
        'Ejemplo válido: (P ∧ Q)',
        'No válido: (P ∧)',
      ];
    } else if (msg.includes('Falta operando izquierdo')) {
      this.errorHelpList = [
        'Falta el operando izquierdo del conector lógico.',
        'Ejemplo válido: (P ∧ Q)',
        'No válido: (∧ Q)',
      ];
    } else if (msg.includes('No está completamente parentizada')) {
      this.errorHelpList = [
        'Las fórmulas deben estar completamente parentizadas.',
        'Ejemplo válido: ((P ∧ Q) ∧ R)',
        'No válido: (P ∧ Q ∧ R)',
      ];
    } else if (msg.includes('Solo se permiten letras')) {
      this.errorHelpList = [
        'Solo se permiten letras, números, paréntesis y conectores lógicos.',
        'Ejemplo válido: (P ∧ Q)',
        'No válido: esto no es una fórmula',
      ];
    } else {
      this.errorHelpList = [];
    }
  }

  undo() {
    this.deductionService.undo();
  }
  redo() {
    this.deductionService.redo();
  }

  // copyToClipboard(symbol: string) {
  //   navigator.clipboard.writeText(symbol);
  //   //alert(`Símbolo "${symbol}" copiado al portapapeles.`);
  // }
  insertSymbolInFormula(symbol: string): void {
    const formulaInput = document.querySelector(
      '.formula-input'
    ) as HTMLInputElement;

    if (formulaInput) {
      const start = formulaInput.selectionStart || 0;
      const end = formulaInput.selectionEnd || 0;
      const currentValue = this.inputFormula || '';

      // Insertar el símbolo en la posición del cursor
      this.inputFormula =
        currentValue.substring(0, start) + symbol + currentValue.substring(end);

      // Restaurar el foco y posición del cursor después del símbolo insertado
      setTimeout(() => {
        formulaInput.focus();
        formulaInput.setSelectionRange(
          start + symbol.length,
          start + symbol.length
        );
      }, 0);
    }
  }

  validateGoalFormula() {
    if (!this.goalFormula?.trim()) {
      this.goalFormulaError = '';
      return;
    }

    try {
      // Normalizar automáticamente cuando el usuario termina de escribir
      const normalized = this.deductionService.normalizeFormula(
        this.goalFormula.trim()
      );

      // Si cambió, actualizar silenciosamente
      if (normalized !== this.goalFormula.trim()) {
        this.goalFormula = normalized;
        console.log(
          `Objetivo auto-normalizado: "${this.goalFormula}" → "${normalized}"`
        );
      }

      this.goalFormulaError = '';
    } catch (error: any) {
      this.goalFormulaError = error.message;
    }
  }

  get goalAchieved(): boolean {
    return (
      this.goalFormula.trim() !== '' &&
      this.lines.length > 0 &&
      this.lines[this.lines.length - 1].formula.replace(/\s/g, '') ===
        this.goalFormula.replace(/\s/g, '')
    );
  }

  useBlocklyFormula() {
    const formula = this.blocklyFormulaService.getFormula();
    if (!formula) {
      this.errorMessage = 'No hay fórmula construida en Blockly.';
      return;
    }
    this.inputFormula = formula;
    this.errorMessage = '';
  }

  useBlocklyFormulaAsGoal() {
    const formula = this.blocklyFormulaService.getFormula();
    if (!formula) {
      this.errorMessage = 'No hay fórmula construida en Blockly.';
      return;
    }

    // Usar la misma lógica que useBlocklyFormula pero para el objetivo
    this.goalFormula = formula;
    this.goalFormulaError = '';

    // Validar automáticamente (esto normalizará la fórmula)
    this.validateGoalFormula();
  }
}
