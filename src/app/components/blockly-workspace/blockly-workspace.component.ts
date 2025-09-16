import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChild,
  OnDestroy,
  HostListener,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import * as Blockly from 'blockly';
import {
  PropositionLogicService,
  TruthTableEntry,
} from '../../services/proposition-logic.service';
import { SyntaxTreeVisualizerComponent } from '../syntax-tree-visualizer/syntax-tree-visualizer.component';
import { WorkspaceStateService } from '../../services/workspace-state.service';
import { BlocklyFormulaService } from '../../services/blockly-formula.service';
import { ExerciseService, Exercise } from '../../services/exercise.service';

@Component({
  selector: 'app-blockly-workspace',
  standalone: true,
  imports: [CommonModule, SyntaxTreeVisualizerComponent],
  templateUrl: './blockly-workspace.component.html',
  styleUrl: './blockly-workspace.component.css',
})
export class BlocklyWorkspaceComponent implements AfterViewInit, OnDestroy {
  @ViewChild('blocklyDiv') blocklyDiv!: ElementRef;

  workspace: Blockly.WorkspaceSvg | null = null;
  formula = '';
  truthTable: TruthTableEntry[] = [];
  variables: string[] = [];
  formulaEvaluated = false;
  currentTopBlock: Blockly.Block | null = null;
  syntaxError: string | null = null;
  showHelp = false;

  // Variables para ejercicios
  currentExercise: Exercise | null = null;
  isExerciseMode = false;
  exerciseCompleted = false;

  // ========== INICIALIZACIÓN Y CICLO DE VIDA ==========
  constructor(
    private logicService: PropositionLogicService,
    private stateService: WorkspaceStateService,
    private blocklyFormulaService: BlocklyFormulaService,
    private exerciseService: ExerciseService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
    
  ) {}

  private resizeBlockly(): void {
    if (this.workspace) {
      Blockly.svgResize(this.workspace);
    }
  }

  ngAfterViewInit(): void {
    this.initializeBlockly();

    // Verificar si estamos en modo ejercicio
    this.route.params.subscribe((params) => {
      if (params['exerciseId']) {
        const exerciseId = parseInt(params['exerciseId']);
        const exercise = this.exerciseService.getExercise(exerciseId);
        if (exercise) {
          this.currentExercise = exercise;
          this.isExerciseMode = true;
          this.exerciseService.setCurrentExercise(exercise);

          this.cdr.detectChanges();

          setTimeout(() => this.resizeBlockly(), 100);

          if (this.workspace) {
            this.workspace.clear();
          }
        }
      } else {
        this.isExerciseMode = false;
        this.currentExercise = null;

        this.cdr.detectChanges();

        setTimeout(() => this.resizeBlockly(), 100);

        const saved = this.stateService.getBlocklyState();
        if (saved && this.workspace) {
          Blockly.Xml.domToWorkspace(
            Blockly.utils.xml.textToDom(saved),
            this.workspace
          );
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.workspace) {
      // Solo guardar estado si no estamos en modo ejercicio
      if (!this.isExerciseMode) {
        const xml = Blockly.Xml.workspaceToDom(this.workspace);
        const xmlText = Blockly.Xml.domToText(xml);
        this.stateService.setBlocklyState(xmlText);
      }
      this.workspace.dispose();
    }
  }
  // ========== EVENTOS Y ATAJOS DE TECLADO ==========

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Ctrl+Enter: Generar tabla de verdad
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      if (this.formula) {
        this.evaluateFormula();
        event.preventDefault();
      }
    }

    // Ctrl+L: Limpiar workspace
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
      if (this.workspace) {
        this.workspace.clear();
        this.formula = '';
        this.variables = [];
        this.truthTable = [];
        this.formulaEvaluated = false;
        event.preventDefault();
      }
    }

    // Ctrl+Z: Deshacer
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      if (this.workspace && (this.workspace as any).undo) {
        (this.workspace as any).undo(false);
        event.preventDefault();
      }
    }

    // Ctrl+Y: Rehacer
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      if (this.workspace && (this.workspace as any).undo) {
        (this.workspace as any).undo(true);
        event.preventDefault();
      }
    }

    // Ctrl+1: Insertar variable
    if ((event.ctrlKey || event.metaKey) && event.key === '1') {
      if (this.workspace) {
        const block = this.workspace.newBlock('logic_proposition');
        block.initSvg();
        const metrics = this.workspace.getMetrics();
        const centerX = metrics.viewLeft + metrics.viewWidth / 2;
        const centerY = metrics.viewTop + metrics.viewHeight / 2;
        block.moveBy(centerX, centerY);
        event.preventDefault();
      }
    }

    // Ctrl+2: Insertar negación
    if ((event.ctrlKey || event.metaKey) && event.key === '2') {
      if (this.workspace) {
        const block = this.workspace.newBlock('logic_negation');
        block.initSvg();
        const metrics = this.workspace.getMetrics();
        const centerX = metrics.viewLeft + metrics.viewWidth / 2;
        const centerY = metrics.viewTop + metrics.viewHeight / 2;
        block.moveBy(centerX, centerY);
        event.preventDefault();
      }
    }

    // Ctrl+3: Insertar conjunción
    if ((event.ctrlKey || event.metaKey) && event.key === '3') {
      if (this.workspace) {
        const block = this.workspace.newBlock('logic_conjunction');
        block.initSvg();
        const metrics = this.workspace.getMetrics();
        const centerX = metrics.viewLeft + metrics.viewWidth / 2;
        const centerY = metrics.viewTop + metrics.viewHeight / 2;
        block.moveBy(centerX, centerY);
        event.preventDefault();
      }
    }

    // Ctrl+4: Insertar disyunción
    if ((event.ctrlKey || event.metaKey) && event.key === '4') {
      if (this.workspace) {
        const block = this.workspace.newBlock('logic_disjunction');
        block.initSvg();
        const metrics = this.workspace.getMetrics();
        const centerX = metrics.viewLeft + metrics.viewWidth / 2;
        const centerY = metrics.viewTop + metrics.viewHeight / 2;
        block.moveBy(centerX, centerY);
        event.preventDefault();
      }
    }

    // Ctrl+5: Insertar implicación
    if ((event.ctrlKey || event.metaKey) && event.key === '5') {
      if (this.workspace) {
        const block = this.workspace.newBlock('logic_implication');
        block.initSvg();
        const metrics = this.workspace.getMetrics();
        const centerX = metrics.viewLeft + metrics.viewWidth / 2;
        const centerY = metrics.viewTop + metrics.viewHeight / 2;
        block.moveBy(centerX, centerY);
        event.preventDefault();
      }
    }
  }

  // ========== TOOLBOX Y WORKSPACE ==========
  private initializeBlockly(): void {
    // Definir los bloques de lógica proposicional
    this.definePropositionBlocks();

    // Configuración del toolbox
    const toolbox = {
      kind: 'flyoutToolbox',
      contents: [
        { kind: 'block', type: 'logic_proposition' },
        { kind: 'block', type: 'logic_negation' },
        { kind: 'block', type: 'logic_conjunction' },
        { kind: 'block', type: 'logic_disjunction' },
        { kind: 'block', type: 'logic_implication' },
      ],
    };

    // Inicializar el workspace de Blockly
    this.workspace = Blockly.inject(this.blocklyDiv.nativeElement, {
      toolbox: toolbox,
      trashcan: true,
      scrollbars: true,
      grid: {
        spacing: 20,
        length: 3,
        colour: '#ccc',
        snap: true,
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 1.0,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2,
      },
    });

    // Listener para cambios en el workspace
    this.workspace.addChangeListener(() => {
      this.updateFormula();
      // Reiniciar la evaluación cuando cambia la fórmula
      this.formulaEvaluated = false;
      this.truthTable = [];
      // Forzar actualización del árbol sintáctico
      this.currentTopBlock = this.workspace!.getTopBlocks(true)[0] || null;
    });
  }

  // ========== BLOQUES DE LÓGICA PROPOSICIONAL ==========

  private definePropositionBlocks(): void {
    // 1. Bloque para proposición atómica
    Blockly.Blocks['logic_proposition'] = {
      init: function () {
        this.appendDummyInput().appendField(
          new Blockly.FieldTextInput('P'),
          'PROP_NAME'
        );
        this.setOutput(true, 'Boolean');
        this.setColour('#bdbdbd');
        this.setTooltip('Una proposición atómica');
      },
    };

    // 2. Bloque de negación (¬)
    Blockly.Blocks['logic_negation'] = {
      init: function () {
        this.appendValueInput('INPUT').setCheck('Boolean').appendField('¬');
        this.setOutput(true, 'Boolean');
        this.setColour('#e57373');
        this.setTooltip('Negación lógica');
      },
    };

    // 3. Bloque de conjunción (∧)
    Blockly.Blocks['logic_conjunction'] = {
      init: function () {
        this.appendValueInput('LEFT').setCheck('Boolean');
        this.appendValueInput('RIGHT').setCheck('Boolean').appendField('∧');
        this.setOutput(true, 'Boolean');
        this.setColour('#81c784');
        this.setTooltip('Conjunción lógica (Y)');
      },
    };

    // 4. Bloque de disyunción (∨)
    Blockly.Blocks['logic_disjunction'] = {
      init: function () {
        this.appendValueInput('LEFT').setCheck('Boolean');
        this.appendValueInput('RIGHT').setCheck('Boolean').appendField('∨');
        this.setOutput(true, 'Boolean');
        this.setColour('#64b5f6');
        this.setTooltip('Disyunción lógica (O)');
      },
    };

    // 5. Bloque de implicación (→)
    Blockly.Blocks['logic_implication'] = {
      init: function () {
        this.appendValueInput('LEFT').setCheck('Boolean');
        this.appendValueInput('RIGHT').setCheck('Boolean').appendField('→');
        this.setOutput(true, 'Boolean');
        this.setColour('#ba68c8');
        this.setTooltip('Implicación lógica (Si-entonces)');
      },
    };
  }

  // ========== ACTUALIZACIÓN Y EVALUACIÓN ==========
  // Actualiza la representación textual de la fórmula
  updateFormula(): void {
    if (!this.workspace) return;

    const topBlocks = this.workspace.getTopBlocks(true);
    if (topBlocks.length === 0) {
      this.formula = '';
      this.variables = [];
      this.currentTopBlock = null;
      this.blocklyFormulaService.setFormula('');
      this.exerciseCompleted = false;
      return;
    }

    this.currentTopBlock = topBlocks[0];
    this.formula = this.logicService.blockToFormula(this.currentTopBlock);
    this.variables = this.logicService.extractPropositionVariables(
      this.currentTopBlock
    );
    this.blocklyFormulaService.setFormula(this.formula);

    this.checkExerciseCompletion();
  }

  checkExerciseCompletion(): void {
    if (!this.isExerciseMode || !this.currentExercise) return;

    if (
      this.exerciseService.checkFormulaMatch(
        this.formula,
        this.currentExercise.targetFormula!
      )
    ) {
      if (!this.exerciseCompleted) {
        this.exerciseCompleted = true;
        this.exerciseService.completeExercise(this.currentExercise.id);

        this.cdr.detectChanges();

        setTimeout(() => {
          alert(
            '¡Ejercicio completado correctamente! 🎉\n\nPuedes generar la tabla de verdad y ver el árbol sintáctico para explorar más.'
          );
        }, 500);
      }
    } else {
      this.exerciseCompleted = false;
      this.cdr.detectChanges();
    }
  }

  goBackToExercises(): void {
    this.router.navigate(['/ejercicios']);
  }

  showHint(): void {
    if (this.currentExercise?.hint) {
      alert(`💡 Pista: ${this.currentExercise.hint}`);
    }
  }

  // Evalúa la fórmula lógica y genera la tabla de verdad
  evaluateFormula(): void {
    if (!this.workspace) return;

    const topBlocks = this.workspace.getTopBlocks(true);
    if (topBlocks.length === 0) return;

    // Validación de sintaxis antes de evaluar
    const error = this.validateWorkspace();
    if (error) {
      this.syntaxError = error;
      return;
    }

    this.truthTable = this.logicService.generateTruthTable(topBlocks[0]);
    this.formulaEvaluated = true;
  }

  validateWorkspace(): string | null {
    if (!this.workspace) return 'No hay workspace.';
    const topBlocks = this.workspace.getTopBlocks(true);
    if (topBlocks.length === 0) return 'No hay fórmula construida.';
    if (topBlocks.length > 1)
      return 'Hay varias fórmulas desconectadas. Usa solo una fórmula principal o guarda las fórmulas en la zona de almacenamiento.';
    return this.logicService.validateFormulaBlockWithWarnings(topBlocks[0]);
  }

  openTreeFullscreen(): void {
    const syntaxTreeComponent = document.querySelector(
      'app-syntax-tree-visualizer'
    );
    const svgElement = syntaxTreeComponent?.querySelector('svg');
    if (!svgElement) return;

    const clonedSvg = svgElement.cloneNode(true) as SVGElement;

    const modal = document.createElement('div');
    modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.9); display: flex; align-items: center;
    justify-content: center; z-index: 9999; padding: 20px; box-sizing: border-box;
  `;

    const container = document.createElement('div');
    container.style.cssText = `
    background: white; border-radius: 8px; padding: 20px; max-width: 95vw;
    max-height: 95vh; overflow: auto; position: relative; display: flex;
    align-items: center; justify-content: center;
  `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
    position: absolute; top: 10px; right: 10px; background: #f44336;
    color: white; border: none; border-radius: 50%; width: 30px; height: 30px;
    cursor: pointer; font-size: 16px; z-index: 10;
  `;

    clonedSvg.style.cssText = `
    max-width: 80vw; max-height: 80vh; width: auto; height: auto;
  `;

    closeBtn.onclick = () => document.body.removeChild(modal);
    modal.onclick = (e) => {
      if (e.target === modal) document.body.removeChild(modal);
    };

    container.appendChild(closeBtn);
    container.appendChild(clonedSvg);
    modal.appendChild(container);
    document.body.appendChild(modal);
  }

  showInstructionsModal(): void {
  if (this.currentExercise?.instructions) {
    const instructionsList = this.currentExercise.instructions.join('\n');
    alert(`📋 Instrucciones paso a paso:\n\n${instructionsList}`);
  }
}
}
