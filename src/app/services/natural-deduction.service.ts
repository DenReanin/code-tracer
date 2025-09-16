import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  DeductionLine,
  LineType,
  RuleType,
  Derivation,
} from '../models/deduction.model';
import { PropositionLogicService } from './proposition-logic.service';

@Injectable({
  providedIn: 'root',
})
export class NaturalDeductionService {
  private currentDerivation = new BehaviorSubject<Derivation>({
    lines: [],
    currentSubproofLevel: 0,
    closedSubproofs: [],
  });

  private undoStack: Derivation[] = [];
  private redoStack: Derivation[] = [];

  constructor(private logicService: PropositionLogicService) {}

  get derivation$() {
    return this.currentDerivation.asObservable();
  }

  // ==================== GESTIÓN DE ESTADO ====================

  private saveStateForUndo(): void {
    this.undoStack.push(
      JSON.parse(JSON.stringify(this.currentDerivation.value))
    );
    this.redoStack = [];
  }

  undo(): void {
    if (this.undoStack.length > 0) {
      this.redoStack.push(
        JSON.parse(JSON.stringify(this.currentDerivation.value))
      );
      const prev = this.undoStack.pop();
      if (prev) this.currentDerivation.next(prev);
    }
  }

  redo(): void {
    if (this.redoStack.length > 0) {
      this.undoStack.push(
        JSON.parse(JSON.stringify(this.currentDerivation.value))
      );
      const next = this.redoStack.pop();
      if (next) this.currentDerivation.next(next);
    }
  }

  resetDerivation(): void {
    this.currentDerivation.next({
      lines: [],
      currentSubproofLevel: 0,
      closedSubproofs: [],
    });
    this.undoStack = [];
    this.redoStack = [];
  }

  // ==================== NORMALIZACIÓN Y VALIDACIÓN ====================

  /**
   * Normaliza una fórmula lógica aplicando reglas estándar
   * Compatible con el servicio de lógica proposicional
   */
  public normalizeFormula(formula: string): string {
    if (!formula) return '';

    return this.logicService.normalizeFormula(formula);
  }

  private areParenthesesBalanced(str: string): boolean {
    let count = 0;
    for (const char of str) {
      if (char === '(') count++;
      if (char === ')') count--;
      if (count < 0) return false;
    }
    return count === 0;
  }

  private removeRedundantParentheses(formula: string): string {
    let f = formula;
    while (
      f.startsWith('(') &&
      f.endsWith(')') &&
      this.areParenthesesBalanced(f.slice(1, -1))
    ) {
      f = f.slice(1, -1).trim();
    }
    return f;
  }

  // ==================== OPERACIONES PRINCIPALES ====================

  addPremise(formula: string): void {
    try {
      this.saveStateForUndo();
      const normalizedFormula = this.normalizeFormula(formula);
      const derivation = this.currentDerivation.value;
      const lineNumber = derivation.lines.length + 1;

      const newLine: DeductionLine = {
        number: lineNumber,
        formula: normalizedFormula,
        type: LineType.PREMISE,
        subproofLevel: derivation.currentSubproofLevel,
        isDischargedAssumption: false,
      };

      derivation.lines.push(newLine);
      this.currentDerivation.next({ ...derivation });
    } catch (error: any) {
      throw new Error(`Error en premisa: ${error.message}`);
    }
  }

  addAssumption(formula: string): void {
    try {
      this.saveStateForUndo();
      const normalizedFormula = this.normalizeFormula(formula);
      const derivation = this.currentDerivation.value;
      const lineNumber = derivation.lines.length + 1;

      derivation.currentSubproofLevel++;

      const newLine: DeductionLine = {
        number: lineNumber,
        formula: normalizedFormula,
        type: LineType.ASSUMPTION,
        subproofLevel: derivation.currentSubproofLevel,
        isDischargedAssumption: false,
      };

      derivation.lines.push(newLine);
      this.currentDerivation.next({ ...derivation });
    } catch (error: any) {
      throw new Error(`Error en supuesto: ${error.message}`);
    }
  }

  applyRule(
    rule: RuleType,
    referencedLines: number[],
    resultFormula: string
  ): boolean | { success: false; message: string } {
    try {
      this.saveStateForUndo();
      const normalizedResultFormula = this.normalizeFormula(resultFormula);

      const validationResult = this.validateRuleApplication(
        rule,
        referencedLines,
        normalizedResultFormula
      );

      if (validationResult !== true) return validationResult;

      const derivation = this.currentDerivation.value;
      const lineNumber = derivation.lines.length + 1;

      const newLine: DeductionLine = {
        number: lineNumber,
        formula: normalizedResultFormula,
        type: LineType.DERIVED,
        rule: rule,
        referencedLines: referencedLines,
        subproofLevel: derivation.currentSubproofLevel,
        isDischargedAssumption: false,
      };

      derivation.lines.push(newLine);
      this.currentDerivation.next({ ...derivation });
      return true;
    } catch (error: any) {
      return {
        success: false,
        message: `Error al aplicar regla: ${error.message}`,
      };
    }
  }

  dischargeAssumption(
    rule: RuleType,
    referencedLines: number[],
    resultFormula: string
  ): boolean | { success: false; message: string } {
    try {
      this.saveStateForUndo();
      const normalizedResultFormula = this.normalizeFormula(resultFormula);

      const validationResult = this.validateDischarge(
        rule,
        referencedLines,
        normalizedResultFormula
      );

      if (validationResult !== true) return validationResult;

      const derivation = this.currentDerivation.value;

      // Gestionar descarga según el tipo de regla
      this.handleAssumptionDischarge(rule, referencedLines, derivation);

      // Añadir nueva línea con la conclusión
      const lineNumber = derivation.lines.length + 1;
      const newLine: DeductionLine = {
        number: lineNumber,
        formula: normalizedResultFormula,
        type: LineType.DERIVED,
        rule: rule,
        referencedLines: referencedLines,
        subproofLevel: derivation.currentSubproofLevel,
      };

      derivation.lines.push(newLine);
      this.currentDerivation.next({ ...derivation });
      return true;
    } catch (error: any) {
      return {
        success: false,
        message: `Error al descargar supuesto: ${error.message}`,
      };
    }
  }

  private handleAssumptionDischarge(
    rule: RuleType,
    referencedLines: number[],
    derivation: Derivation
  ): void {
    if (rule === RuleType.CASES) {
      // Para casos, descargar múltiples supuestos
      [referencedLines[1], referencedLines[2]].forEach((lineNum) => {
        const assumptionIndex = this.findAssumptionIndex(lineNum);
        if (assumptionIndex >= 0) {
          derivation.lines[assumptionIndex] = {
            ...derivation.lines[assumptionIndex],
            isDischargedAssumption: true,
          };
          this.markSubproofAsClosed(derivation, lineNum);
        }
      });
      derivation.currentSubproofLevel -= 2;
    } else {
      // Para otras reglas, descargar un supuesto
      const assumptionIndex = this.findAssumptionIndex(referencedLines[0]);
      if (assumptionIndex >= 0) {
        derivation.lines[assumptionIndex] = {
          ...derivation.lines[assumptionIndex],
          isDischargedAssumption: true,
        };
        this.markSubproofAsClosed(derivation, referencedLines[0]);
      }
      derivation.currentSubproofLevel--;
    }
  }

  private markSubproofAsClosed(
    derivation: Derivation,
    assumptionLineNumber: number
  ): void {
    const from = assumptionLineNumber;
    const to = derivation.lines[derivation.lines.length - 1]?.number || from;

    if (!derivation.closedSubproofs) derivation.closedSubproofs = [];
    derivation.closedSubproofs.push({ from, to });
  }

  // ==================== VALIDACIÓN DE REGLAS ====================

  private validateRuleApplication(
    rule: RuleType,
    referencedLines: number[],
    resultFormula: string
  ): boolean | { success: false; message: string } {
    const derivation = this.currentDerivation.value;

    // Verificar líneas referenciadas
    const referencedFormulas = this.getReferencedFormulas(
      referencedLines,
      derivation
    );
    if (referencedFormulas.length !== referencedLines.length) {
      return {
        success: false,
        message:
          'Alguna de las líneas seleccionadas no existe o no es accesible.',
      };
    }

    // Validar regla específica
    return this.validateSpecificRule(rule, referencedFormulas, resultFormula);
  }

  private getReferencedFormulas(
    referencedLines: number[],
    derivation: Derivation
  ): string[] {
    return referencedLines
      .map((lineNum) => {
        const line = derivation.lines.find((l) => l.number === lineNum);
        return line && this.isLineAccessible(line.number) ? line.formula : null;
      })
      .filter((f) => f !== null) as string[];
  }

  private validateSpecificRule(
    rule: RuleType,
    referencedFormulas: string[],
    resultFormula: string
  ): boolean | { success: false; message: string } {
    const normalizedResult = this.normalizeFormula(resultFormula);

    switch (rule) {
      case RuleType.MP:
        return this.validateModusPonens(referencedFormulas, normalizedResult);
      case RuleType.IC:
        return this.validateConjunctionIntroduction(
          referencedFormulas,
          normalizedResult
        );
      case RuleType.EC1:
        return this.validateConjunctionElimination1(
          referencedFormulas,
          normalizedResult
        );
      case RuleType.EC2:
        return this.validateConjunctionElimination2(
          referencedFormulas,
          normalizedResult
        );
      case RuleType.ID1:
        return this.validateDisjunctionIntroduction1(
          referencedFormulas,
          normalizedResult
        );
      case RuleType.ID2:
        return this.validateDisjunctionIntroduction2(
          referencedFormulas,
          normalizedResult
        );
      case RuleType.EN:
        return this.validateNegationElimination(
          referencedFormulas,
          normalizedResult
        );
      default:
        return { success: false, message: `Regla ${rule} no implementada.` };
    }
  }

  private validateModusPonens(
    referencedFormulas: string[],
    resultFormula: string
  ): boolean | { success: false; message: string } {
    if (referencedFormulas.length !== 2) {
      return {
        success: false,
        message: 'Modus Ponens requiere exactamente 2 líneas.',
      };
    }

    // Normalizar todas las fórmulas para comparación
    const normalizedFormulas = referencedFormulas.map((f) =>
      this.normalizeFormula(f)
    );
    const normalizedResult = this.normalizeFormula(resultFormula);

    // Buscar la implicación
    let implication: string | null = null;
    let antecedent: string | null = null;
    let consequent: string | null = null;
    let otherFormula: string | null = null;

    for (const formula of normalizedFormulas) {
      const parsed = this.parseImplication(formula);
      if (parsed) {
        implication = formula;
        [antecedent, consequent] = parsed;
        otherFormula = normalizedFormulas.find((f) => f !== formula) || null;
        break;
      }
    }

    if (!implication || !antecedent || !consequent || !otherFormula) {
      return {
        success: false,
        message: 'Modus Ponens requiere una implicación y su antecedente.',
      };
    }

    // Comparar con normalización
    if (
      this.normalizeFormula(otherFormula) !== this.normalizeFormula(antecedent)
    ) {
      return {
        success: false,
        message:
          'La segunda fórmula debe ser el antecedente de la implicación.',
      };
    }

    if (normalizedResult !== this.normalizeFormula(consequent)) {
      return {
        success: false,
        message: `El resultado debe ser "${consequent}".`,
      };
    }

    return true;
  }

  private validateConjunctionIntroduction(
    referencedFormulas: string[],
    resultFormula: string
  ): boolean | { success: false; message: string } {
    if (referencedFormulas.length !== 2) {
      return {
        success: false,
        message: 'Introducción de Conjunción requiere exactamente 2 líneas.',
      };
    }

    const [formA, formB] = referencedFormulas.map((f) =>
      this.normalizeFormula(f)
    );
    const expectedResult1 = `(${formA} ∧ ${formB})`;
    const expectedResult2 = `(${formB} ∧ ${formA})`;
    const normalizedResult = this.normalizeFormula(resultFormula);

    if (
      normalizedResult !== this.normalizeFormula(expectedResult1) &&
      normalizedResult !== this.normalizeFormula(expectedResult2)
    ) {
      return {
        success: false,
        message: `El resultado debe ser "(${formA} ∧ ${formB})".`,
      };
    }

    return true;
  }

  private validateConjunctionElimination1(
    referencedFormulas: string[],
    resultFormula: string
  ): boolean | { success: false; message: string } {
    if (referencedFormulas.length !== 1) {
      return {
        success: false,
        message: 'Eliminación de Conjunción 1 requiere exactamente 1 línea.',
      };
    }

    const conjunctionParts = this.parseConjunction(referencedFormulas[0]);
    if (!conjunctionParts) {
      return {
        success: false,
        message: 'La línea debe ser una conjunción (A ∧ B).',
      };
    }

    if (
      this.normalizeFormula(resultFormula) !==
      this.normalizeFormula(conjunctionParts[0])
    ) {
      return {
        success: false,
        message: `El resultado debe ser "${conjunctionParts[0]}".`,
      };
    }

    return true;
  }

  private validateConjunctionElimination2(
    referencedFormulas: string[],
    resultFormula: string
  ): boolean | { success: false; message: string } {
    if (referencedFormulas.length !== 1) {
      return {
        success: false,
        message: 'Eliminación de Conjunción 2 requiere exactamente 1 línea.',
      };
    }

    const conjunctionParts = this.parseConjunction(referencedFormulas[0]);
    if (!conjunctionParts) {
      return {
        success: false,
        message: 'La línea debe ser una conjunción (A ∧ B).',
      };
    }

    if (
      this.normalizeFormula(resultFormula) !==
      this.normalizeFormula(conjunctionParts[1])
    ) {
      return {
        success: false,
        message: `El resultado debe ser "${conjunctionParts[1]}".`,
      };
    }

    return true;
  }

  private validateDisjunctionIntroduction1(
    referencedFormulas: string[],
    resultFormula: string
  ): boolean | { success: false; message: string } {
    if (referencedFormulas.length !== 1) {
      return {
        success: false,
        message: 'Introducción de Disyunción 1 requiere exactamente 1 línea.',
      };
    }

    const disjunctionParts = this.parseDisjunction(resultFormula);
    if (!disjunctionParts) {
      return {
        success: false,
        message: 'El resultado debe ser una disyunción (A ∨ B).',
      };
    }

    if (
      this.normalizeFormula(disjunctionParts[0]) !==
      this.normalizeFormula(referencedFormulas[0])
    ) {
      return {
        success: false,
        message: 'El primer componente debe ser la fórmula original.',
      };
    }

    return true;
  }

  private validateDisjunctionIntroduction2(
    referencedFormulas: string[],
    resultFormula: string
  ): boolean | { success: false; message: string } {
    if (referencedFormulas.length !== 1) {
      return {
        success: false,
        message: 'Introducción de Disyunción 2 requiere exactamente 1 línea.',
      };
    }

    const disjunctionParts = this.parseDisjunction(resultFormula);
    if (!disjunctionParts) {
      return {
        success: false,
        message: 'El resultado debe ser una disyunción (A ∨ B).',
      };
    }

    if (
      this.normalizeFormula(disjunctionParts[1]) !==
      this.normalizeFormula(referencedFormulas[0])
    ) {
      return {
        success: false,
        message: 'El segundo componente debe ser la fórmula original.',
      };
    }

    return true;
  }

  private validateNegationElimination(
    referencedFormulas: string[],
    resultFormula: string
  ): boolean | { success: false; message: string } {
    if (referencedFormulas.length !== 1) {
      return {
        success: false,
        message: 'Eliminación de Negación requiere exactamente 1 línea.',
      };
    }

    const innerNeg = this.parseNegation(referencedFormulas[0]);
    if (!innerNeg) {
      return {
        success: false,
        message: 'La línea debe ser una negación (¬A).',
      };
    }

    const doubleNegContent = this.parseNegation(innerNeg);
    if (!doubleNegContent) {
      return {
        success: false,
        message: 'La línea debe ser una doble negación (¬¬A).',
      };
    }

    if (
      this.normalizeFormula(resultFormula) !==
      this.normalizeFormula(doubleNegContent)
    ) {
      return {
        success: false,
        message: `El resultado debe ser "${doubleNegContent}".`,
      };
    }

    return true;
  }

  // ==================== VALIDACIÓN DE DESCARGA ====================

  private validateDischarge(
    rule: RuleType,
    referencedLines: number[],
    resultFormula: string
  ): boolean | { success: false; message: string } {
    const derivation = this.currentDerivation.value;

    switch (rule) {
      case RuleType.TD:
        return this.validateDeductionTheorem(
          referencedLines,
          resultFormula,
          derivation
        );
      case RuleType.IN:
        return this.validateNegationIntroduction(
          referencedLines,
          resultFormula,
          derivation
        );
      case RuleType.CASES:
        return this.validateCaseAnalysis(
          referencedLines,
          resultFormula,
          derivation
        );
      default:
        return {
          success: false,
          message: `Regla ${rule} no soportada para descarga de supuestos.`,
        };
    }
  }

  private validateDeductionTheorem(
    referencedLines: number[],
    resultFormula: string,
    derivation: Derivation
  ): boolean | { success: false; message: string } {
    if (referencedLines.length !== 2) {
      return {
        success: false,
        message: 'Teorema de Deducción requiere exactamente 2 líneas.',
      };
    }

    const assumptionLine = derivation.lines.find(
      (l) => l.number === referencedLines[0]
    );
    const conclusionLine = derivation.lines.find(
      (l) => l.number === referencedLines[1]
    );

    if (!assumptionLine || assumptionLine.type !== LineType.ASSUMPTION) {
      return {
        success: false,
        message: 'La primera línea debe ser un supuesto.',
      };
    }

    if (!conclusionLine) {
      return { success: false, message: 'La segunda línea no existe.' };
    }

    if (assumptionLine.subproofLevel !== derivation.currentSubproofLevel) {
      return {
        success: false,
        message: 'El supuesto a descargar debe ser el más reciente.',
      };
    }

    const expectedFormula = `(${assumptionLine.formula} → ${conclusionLine.formula})`;
    if (
      this.normalizeFormula(resultFormula) !==
      this.normalizeFormula(expectedFormula)
    ) {
      return {
        success: false,
        message: `El resultado debe ser "${expectedFormula}".`,
      };
    }

    return true;
  }

  private validateNegationIntroduction(
    referencedLines: number[],
    resultFormula: string,
    derivation: Derivation
  ): boolean | { success: false; message: string } {
    if (referencedLines.length < 2) {
      return {
        success: false,
        message: 'Introducción de Negación requiere al menos 2 líneas.',
      };
    }

    const assumptionLine = derivation.lines.find(
      (l) => l.number === referencedLines[0]
    );
    if (!assumptionLine || assumptionLine.type !== LineType.ASSUMPTION) {
      return {
        success: false,
        message: 'La primera línea debe ser un supuesto.',
      };
    }

    const expectedFormula = `¬${assumptionLine.formula}`;
    if (
      this.normalizeFormula(resultFormula) !==
      this.normalizeFormula(expectedFormula)
    ) {
      return {
        success: false,
        message: `El resultado debe ser "${expectedFormula}".`,
      };
    }

    return true;
  }

  private validateCaseAnalysis(
    referencedLines: number[],
    resultFormula: string,
    derivation: Derivation
  ): boolean | { success: false; message: string } {
    if (referencedLines.length < 3) {
      return {
        success: false,
        message: 'Prueba por Casos requiere al menos 3 líneas.',
      };
    }

    const disjunctionLine = derivation.lines.find(
      (l) => l.number === referencedLines[0]
    );
    if (!disjunctionLine || !this.isDisjunction(disjunctionLine.formula)) {
      return {
        success: false,
        message: 'La primera línea debe ser una disyunción (A ∨ B).',
      };
    }

    const [leftDisjunct, rightDisjunct] = this.parseDisjunction(
      disjunctionLine.formula
    ) || ['', ''];

    const leftAssumption = derivation.lines.find(
      (l) => l.number === referencedLines[1]
    );
    const rightAssumption = derivation.lines.find(
      (l) => l.number === referencedLines[2]
    );

    if (
      !leftAssumption ||
      leftAssumption.type !== LineType.ASSUMPTION ||
      this.normalizeFormula(leftAssumption.formula) !==
        this.normalizeFormula(leftDisjunct)
    ) {
      return {
        success: false,
        message:
          'La segunda línea debe ser el supuesto del primer componente de la disyunción.',
      };
    }

    if (
      !rightAssumption ||
      rightAssumption.type !== LineType.ASSUMPTION ||
      this.normalizeFormula(rightAssumption.formula) !==
        this.normalizeFormula(rightDisjunct)
    ) {
      return {
        success: false,
        message:
          'La tercera línea debe ser el supuesto del segundo componente de la disyunción.',
      };
    }

    // Verificar que ambas subpruebas llegan a la misma conclusión
    const leftConclusion = this.findSubproofConclusion(
      leftAssumption,
      derivation
    );
    const rightConclusion = this.findSubproofConclusion(
      rightAssumption,
      derivation
    );

    if (!leftConclusion || !rightConclusion) {
      return {
        success: false,
        message: 'No se encontró la conclusión de alguna subprueba.',
      };
    }

    if (
      this.normalizeFormula(leftConclusion.formula) !==
        this.normalizeFormula(rightConclusion.formula) ||
      this.normalizeFormula(leftConclusion.formula) !==
        this.normalizeFormula(resultFormula)
    ) {
      return {
        success: false,
        message:
          'Ambas subpruebas deben concluir exactamente la misma fórmula que el resultado.',
      };
    }

    return true;
  }

  private findSubproofConclusion(
    assumption: DeductionLine,
    derivation: Derivation
  ): DeductionLine | null {
    const subproofLines = derivation.lines.filter(
      (l) =>
        l.number > assumption.number &&
        l.subproofLevel === assumption.subproofLevel
    );

    return subproofLines.length > 0
      ? subproofLines[subproofLines.length - 1]
      : null;
  }

  // ==================== PARSERS DE FÓRMULAS ====================

  private parseImplication(formula: string): [string, string] | null {
    const f = this.normalizeFormula(formula);
    const patterns = [/^\((.+?)→(.+?)\)$/, /^(.+?)→(.+?)$/];

    for (const pattern of patterns) {
      const match = f.match(pattern);
      if (match) {
        return [match[1].trim(), match[2].trim()];
      }
    }
    return null;
  }

  private parseConjunction(formula: string): [string, string] | null {
    const f = this.normalizeFormula(formula);
    const patterns = [/^\((.+?)∧(.+?)\)$/, /^(.+?)∧(.+?)$/];

    for (const pattern of patterns) {
      const match = f.match(pattern);
      if (match) {
        return [match[1].trim(), match[2].trim()];
      }
    }
    return null;
  }

  private parseDisjunction(formula: string): [string, string] | null {
    const f = this.normalizeFormula(formula);
    const patterns = [/^\((.+?)∨(.+?)\)$/, /^(.+?)∨(.+?)$/];

    for (const pattern of patterns) {
      const match = f.match(pattern);
      if (match) {
        return [match[1].trim(), match[2].trim()];
      }
    }
    return null;
  }

  private parseNegation(formula: string): string | null {
    const f = this.normalizeFormula(formula);

    if (f.startsWith('¬')) {
      const inner = f.slice(1).trim();
      return this.removeRedundantParentheses(inner);
    }
    return null;
  }

  // ==================== FUNCIONES AUXILIARES ====================

  private isImplication(formula: string): boolean {
    return this.parseImplication(formula) !== null;
  }

  private isConjunction(formula: string): boolean {
    return this.parseConjunction(formula) !== null;
  }

  private isDisjunction(formula: string): boolean {
    return this.parseDisjunction(formula) !== null;
  }

  private isNegation(formula: string): boolean {
    return this.parseNegation(formula) !== null;
  }

  private findAssumptionIndex(lineNumber: number): number {
    const derivation = this.currentDerivation.value;
    return derivation.lines.findIndex(
      (line) => line.type === LineType.ASSUMPTION && line.number === lineNumber
    );
  }

  private isLineAccessible(lineNumber: number): boolean {
    const derivation = this.currentDerivation.value;
    const line = derivation.lines.find((l) => l.number === lineNumber);

    if (!line) return false;

    // Línea descargada no es accesible
    if (line.isDischargedAssumption) {
      return false;
    }

    // Línea en subprueba cerrada no es accesible
    if (
      derivation.closedSubproofs?.some(
        (range) => line.number >= range.from && line.number <= range.to
      )
    ) {
      return false;
    }

    // Líneas en nivel actual o inferior son accesibles
    return line.subproofLevel <= derivation.currentSubproofLevel;
  }

  // ==================== SUGERENCIAS ====================

  suggestApplicableRules(): {
    rule: RuleType;
    description: string;
    lines: number[];
  }[] {
    const suggestions: {
      rule: RuleType;
      description: string;
      lines: number[];
    }[] = [];
    const derivation = this.currentDerivation.value;
    const accessibleLines = derivation.lines.filter((l) =>
      this.isLineAccessible(l.number)
    );

    // Modus Ponens
    for (const line1 of accessibleLines) {
      if (this.isImplication(line1.formula)) {
        const [antecedent] = this.parseImplication(line1.formula) || [''];
        for (const line2 of accessibleLines) {
          if (
            line1.number !== line2.number &&
            this.normalizeFormula(line2.formula) ===
              this.normalizeFormula(antecedent)
          ) {
            suggestions.push({
              rule: RuleType.MP,
              description: 'Aplicar Modus Ponens (MP)',
              lines: [line1.number, line2.number],
            });
          }
        }
      }
    }

    // Eliminación de Conjunción
    for (const line of accessibleLines) {
      if (this.isConjunction(line.formula)) {
        suggestions.push({
          rule: RuleType.EC1,
          description: 'Aplicar Eliminación de Conjunción 1 (EC1)',
          lines: [line.number],
        });
        suggestions.push({
          rule: RuleType.EC2,
          description: 'Aplicar Eliminación de Conjunción 2 (EC2)',
          lines: [line.number],
        });
      }
    }

    // Eliminación de Negación
    for (const line of accessibleLines) {
      const innerNeg = this.parseNegation(line.formula);
      if (innerNeg && this.isNegation(innerNeg)) {
        suggestions.push({
          rule: RuleType.EN,
          description: 'Aplicar Eliminación de Negación (EN)',
          lines: [line.number],
        });
      }
    }

    return suggestions;
  }

  // ==================== GESTIÓN DE ESTADO ====================

  getCurrentDerivation(): any {
    const derivation = this.currentDerivation.value;
    return {
      lines: derivation.lines,
      currentSubproofLevel: derivation.currentSubproofLevel,
      closedSubproofs: derivation.closedSubproofs ?? [],
    };
  }

  loadDerivation(state: any): void {
    if (!state) return;
    this.currentDerivation.next({
      lines: state.lines || [],
      currentSubproofLevel: state.currentSubproofLevel || 0,
      closedSubproofs: state.closedSubproofs || [],
    });
  }
}
