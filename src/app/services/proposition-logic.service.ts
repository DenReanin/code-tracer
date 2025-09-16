import { Injectable } from '@angular/core';
import * as Blockly from 'blockly';

export interface TruthTableEntry {
  assignment: Record<string, boolean>;
  result: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PropositionLogicService {
  constructor() {}

  /**
   * Normaliza una fórmula lógica aplicando reglas estándar
   * Este método mantiene consistencia con el servicio de deducción natural
   */
  normalizeFormula(formula: string): string {
    if (!formula) return '';

    let f = formula.trim();

    // PASO 1: Convertir todo a mayúsculas
    f = f.toUpperCase();

    // PASO 2: Normalizar conectores con espaciado automático
    f = f.replace(/\s*→\s*|\s*->\s*|\s*=>\s*|\s*IMPLIES?\s*/gi, ' → ');
    f = f.replace(/\s*∧\s*|\s*&\s*|\s*&&\s*|\s*AND\s*/gi, ' ∧ ');
    f = f.replace(/\s*∨\s*|\s*\|\s*|\s*\|\|\s*|\s*OR\s*/gi, ' ∨ ');
    f = f.replace(/\s*¬\s*|\s*~\s*|\s*!\s*|\s*NOT\s*/gi, '¬');

    // PASO 3: Limpiar espacios múltiples
    f = f.replace(/\s+/g, ' ').trim();

    // PASO 4: Validar ANTES de procesar
    this.validateBasicStructure(f);

    // PASO 5: Tokenizar y validar estructura completa
    const tokens = this.tokenize(f);
    this.validateTokenSequence(tokens);

    // PASO 6: Construir fórmula normalizada estilo Blockly
    const normalizedFormula = this.buildNormalizedFormula(tokens);

    return normalizedFormula;
  }

  /**
   * Validación básica de caracteres y estructura inicial
   */
  private validateBasicStructure(formula: string): void {
    // Solo caracteres permitidos
    if (!/^[A-Z0-9\s()¬∧∨→]+$/.test(formula)) {
      throw new Error(
        'Solo se permiten letras mayúsculas, números, paréntesis y conectores lógicos (¬, ∧, ∨, →).'
      );
    }

    // Paréntesis balanceados
    if (!this.areParenthesesBalanced(formula)) {
      throw new Error('Paréntesis desbalanceados.');
    }

    // Paréntesis vacíos
    if (/\(\s*\)/.test(formula)) {
      throw new Error('No se permiten paréntesis vacíos.');
    }
  }

  /**
   * Tokeniza la fórmula en elementos básicos
   */
  private tokenize(formula: string): string[] {
    const tokens: string[] = [];
    let i = 0;

    while (i < formula.length) {
      const char = formula[i];

      if (char === ' ') {
        i++;
        continue;
      }

      if (
        char === '(' ||
        char === ')' ||
        char === '∧' ||
        char === '∨' ||
        char === '→' ||
        char === '¬'
      ) {
        tokens.push(char);
        i++;
      } else if (/[A-Z]/.test(char)) {
        // Átomo: letra + números opcionales
        let atom = char;
        i++;
        while (i < formula.length && /[0-9]/.test(formula[i])) {
          atom += formula[i];
          i++;
        }
        tokens.push(atom);
      } else {
        throw new Error(`Carácter no válido: "${char}"`);
      }
    }

    return tokens;
  }

  /**
   * Valida la secuencia de tokens
   */
  private validateTokenSequence(tokens: string[]): void {
    if (tokens.length === 0) {
      throw new Error('Fórmula vacía.');
    }

    // Detectar múltiples conectores del mismo tipo sin paréntesis
    this.validateAmbiguousAssociativity(tokens);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const prevToken = i > 0 ? tokens[i - 1] : null;
      const nextToken = i < tokens.length - 1 ? tokens[i + 1] : null;

      // Validar átomos
      if (/^[A-Z][0-9]*$/.test(token)) {
        // Un átomo no puede estar seguido de otro átomo directamente
        if (nextToken && /^[A-Z][0-9]*$/.test(nextToken)) {
          throw new Error(
            `Los átomos "${token}" y "${nextToken}" deben estar separados por un conector lógico.`
          );
        }
        // Un átomo no puede estar seguido de "("
        if (nextToken === '(') {
          throw new Error(`El átomo "${token}" no puede estar seguido de "(".`);
        }
        continue;
      }

      // Validar conectores binarios
      if (['∧', '∨', '→'].includes(token)) {
        if (
          !prevToken ||
          prevToken === '(' ||
          ['∧', '∨', '→', '¬'].includes(prevToken)
        ) {
          throw new Error(
            `El conector "${token}" necesita un operando izquierdo.`
          );
        }
        if (
          !nextToken ||
          nextToken === ')' ||
          ['∧', '∨', '→'].includes(nextToken)
        ) {
          throw new Error(
            `El conector "${token}" necesita un operando derecho.`
          );
        }
        continue;
      }

      // Validar negación
      if (token === '¬') {
        if (!nextToken) {
          throw new Error('La negación "¬" necesita un operando.');
        }
        if (['∧', '∨', '→', ')'].includes(nextToken)) {
          throw new Error(
            'La negación "¬" no puede ser seguida de un conector binario o ")".'
          );
        }
        continue;
      }

      // Validar paréntesis
      if (token === '(') {
        if (nextToken === ')') {
          throw new Error('No se permiten paréntesis vacíos.');
        }
        if (nextToken && ['∧', '∨', '→'].includes(nextToken)) {
          throw new Error(
            `"(" no puede ser seguido del conector "${nextToken}".`
          );
        }
        continue;
      }

      if (token === ')') {
        if (prevToken === '(') {
          throw new Error('No se permiten paréntesis vacíos.');
        }
        if (prevToken && ['∧', '∨', '→', '¬'].includes(prevToken)) {
          throw new Error(
            `")" no puede ser precedido del conector "${prevToken}".`
          );
        }
        continue;
      }
    }

    // Validar balance general
    this.validateOverallBalance(tokens);
  }

  /**
   * Valida que no haya ambigüedad en la asociatividad
   */
  // Versión simplificada de validateAmbiguousAssociativity

  private validateAmbiguousAssociativity(tokens: string[]): void {
    let parenthesesDepth = 0;
    let connectorsAtLevel0: string[] = [];

    // Recolectar conectores al nivel superior (fuera de paréntesis)
    for (const token of tokens) {
      if (token === '(') {
        parenthesesDepth++;
      } else if (token === ')') {
        parenthesesDepth--;
      } else if (['∧', '∨', '→'].includes(token) && parenthesesDepth === 0) {
        connectorsAtLevel0.push(token);
      }
    }

    // Contar cada tipo de conector
    const counts = { '∧': 0, '∨': 0, '→': 0 };
    connectorsAtLevel0.forEach((conn) => counts[conn as keyof typeof counts]++);

    // Verificar múltiples conectores del mismo tipo
    Object.entries(counts).forEach(([connector, count]) => {
      if (count > 1) {
        throw new Error(
          `Múltiples conectores "${connector}" requieren paréntesis para especificar asociatividad.`
        );
      }
    });

    // Verificar mezcla de diferentes conectores
    const differentConnectors = Object.entries(counts).filter(
      ([, count]) => count > 0
    );
    if (differentConnectors.length > 1) {
      throw new Error(
        'Mezcla de conectores diferentes requiere paréntesis para especificar precedencia.'
      );
    }
  }

  /**
   * Valida balance general de la secuencia
   */
  private validateOverallBalance(tokens: string[]): void {
    const atoms = tokens.filter((t) => /^[A-Z][0-9]*$/.test(t)).length;
    const binaryConnectors = tokens.filter((t) =>
      ['∧', '∨', '→'].includes(t)
    ).length;

    // En una fórmula bien formada: #átomos = #conectores_binarios + 1 (sin contar negaciones y paréntesis)
    if (atoms !== binaryConnectors + 1) {
      throw new Error(
        'La fórmula no está bien formada. Verifique los conectores y átomos.'
      );
    }
  }

  /**
   * Construye la fórmula normalizada estilo Blockly
   */
  private buildNormalizedFormula(tokens: string[]): string {
    // Convertir tokens a expresión parseada
    const parsed = this.parseTokensToExpression(tokens);

    // Convertir expresión a formato Blockly
    return this.expressionToBlocklyFormat(parsed);
  }

  /**
   * Parsea tokens a estructura de expresión
   */
  private parseTokensToExpression(tokens: string[]): any {
    // Implementar parser recursivo descendente
    let index = 0;

    const parseAtom = (): any => {
      if (index >= tokens.length) throw new Error('Expresión incompleta.');

      const token = tokens[index];
      if (/^[A-Z][0-9]*$/.test(token)) {
        index++;
        return { type: 'atom', value: token };
      }

      throw new Error(`Se esperaba un átomo, se encontró: "${token}"`);
    };

    const parseFactor = (): any => {
      if (index >= tokens.length) throw new Error('Expresión incompleta.');

      const token = tokens[index];

      if (token === '¬') {
        index++; // consumir ¬
        const operand = parseFactor();
        return { type: 'negation', operand };
      }

      if (token === '(') {
        index++; // consumir (
        const expr = parseExpression();
        if (index >= tokens.length || tokens[index] !== ')') {
          throw new Error('Se esperaba ")".');
        }
        index++; // consumir )
        return expr;
      }

      return parseAtom();
    };

    const parseConjunction = (): any => {
      let left = parseFactor();

      while (index < tokens.length && tokens[index] === '∧') {
        index++; // consumir ∧
        const right = parseFactor();
        left = { type: 'conjunction', left, right };
      }

      return left;
    };

    const parseDisjunction = (): any => {
      let left = parseConjunction();

      while (index < tokens.length && tokens[index] === '∨') {
        index++; // consumir ∨
        const right = parseConjunction();
        left = { type: 'disjunction', left, right };
      }

      return left;
    };

    const parseExpression = (): any => {
      let expressions = [parseDisjunction()];
      let operators = [];

      while (index < tokens.length && tokens[index] === '→') {
        operators.push(tokens[index]);
        index++; // consumir →
        expressions.push(parseDisjunction());
      }

      // Asociatividad derecha para implicaciones
      if (operators.length > 0) {
        let result = expressions[expressions.length - 1];
        for (let i = expressions.length - 2; i >= 0; i--) {
          result = { type: 'implication', left: expressions[i], right: result };
        }
        return result;
      }

      return expressions[0];
    };

    const result = parseExpression();

    if (index < tokens.length) {
      throw new Error(
        `Tokens inesperados al final: ${tokens.slice(index).join(' ')}`
      );
    }

    return result;
  }

  /**
   * Convierte expresión parseada a formato Blockly
   */
  private expressionToBlocklyFormat(expr: any): string {
    switch (expr.type) {
      case 'atom':
        return expr.value;

      case 'negation':
        const operand = this.expressionToBlocklyFormat(expr.operand);
        // Si el operando es un átomo simple, no usar paréntesis
        if (/^[A-Z][0-9]*$/.test(operand)) {
          return `¬${operand}`;
        }
        return `¬(${operand})`;

      case 'conjunction':
        const leftConj = this.expressionToBlocklyFormat(expr.left);
        const rightConj = this.expressionToBlocklyFormat(expr.right);
        return `(${leftConj} ∧ ${rightConj})`;

      case 'disjunction':
        const leftDisj = this.expressionToBlocklyFormat(expr.left);
        const rightDisj = this.expressionToBlocklyFormat(expr.right);
        return `(${leftDisj} ∨ ${rightDisj})`;

      case 'implication':
        const leftImpl = this.expressionToBlocklyFormat(expr.left);
        const rightImpl = this.expressionToBlocklyFormat(expr.right);
        return `(${leftImpl} → ${rightImpl})`;

      default:
        throw new Error(`Tipo de expresión desconocido: ${expr.type}`);
    }
  }

  /**
   * Evalúa una fórmula lógica con una asignación dada de valores de verdad
   * @param block El bloque raíz de la fórmula
   * @param assignment Asignación de valores de verdad a variables proposicionales
   * @returns El valor de verdad de la fórmula
   */
  evaluateFormula(
    block: Blockly.Block | null,
    assignment: Record<string, boolean>
  ): boolean {
    if (!block) return false;

    switch (block.type) {
      case 'logic_proposition':
        const propName = block.getFieldValue('PROP_NAME');
        return assignment[propName] || false;

      case 'logic_negation':
        const inputBlock = block.getInputTargetBlock('INPUT');
        return !this.evaluateFormula(inputBlock, assignment);

      case 'logic_conjunction':
        const leftConjBlock = block.getInputTargetBlock('LEFT');
        const rightConjBlock = block.getInputTargetBlock('RIGHT');
        return (
          this.evaluateFormula(leftConjBlock, assignment) &&
          this.evaluateFormula(rightConjBlock, assignment)
        );

      case 'logic_disjunction':
        const leftDisjBlock = block.getInputTargetBlock('LEFT');
        const rightDisjBlock = block.getInputTargetBlock('RIGHT');
        return (
          this.evaluateFormula(leftDisjBlock, assignment) ||
          this.evaluateFormula(rightDisjBlock, assignment)
        );

      case 'logic_implication':
        const leftImplBlock = block.getInputTargetBlock('LEFT');
        const rightImplBlock = block.getInputTargetBlock('RIGHT');
        return (
          !this.evaluateFormula(leftImplBlock, assignment) ||
          this.evaluateFormula(rightImplBlock, assignment)
        );

      // case 'logic_biconditional':
      //   const leftBiconBlock = block.getInputTargetBlock('LEFT');
      //   const rightBiconBlock = block.getInputTargetBlock('RIGHT');
      //   return (
      //     this.evaluateFormula(leftBiconBlock, assignment) ===
      //     this.evaluateFormula(rightBiconBlock, assignment)
      //   );

      default:
        return false;
    }
  }

  /**
   * Extrae todas las variables proposicionales de una fórmula
   * @param block El bloque raíz de la fórmula
   * @returns Array de nombres de variables proposicionales
   */
  extractPropositionVariables(block: Blockly.Block | null): string[] {
    if (!block) return [];

    let variables: string[] = [];

    if (block.type === 'logic_proposition') {
      const propName = block.getFieldValue('PROP_NAME');
      variables.push(propName);
    } else {
      // Recorrer todas las entradas del bloque
      for (let i = 0; i < block.inputList.length; i++) {
        const input = block.inputList[i];
        if (input.connection) {
          const connectedBlock = input.connection.targetBlock();
          if (connectedBlock) {
            variables = variables.concat(
              this.extractPropositionVariables(connectedBlock)
            );
          }
        }
      }
    }

    // Eliminar duplicados
    return [...new Set(variables)];
  }

  /**
   * Genera todas las posibles asignaciones de valores de verdad para un conjunto de variables
   * @param variables Lista de variables proposicionales
   * @returns Array de todas las posibles asignaciones
   */
  generateAllAssignments(variables: string[]): Record<string, boolean>[] {
    if (variables.length === 0) return [{}];

    const [firstVar, ...rest] = variables;
    const restAssignments = this.generateAllAssignments(rest);

    return [
      ...restAssignments.map((assignment) => ({
        ...assignment,
        [firstVar]: true,
      })),
      ...restAssignments.map((assignment) => ({
        ...assignment,
        [firstVar]: false,
      })),
    ];
  }

  /**
   * Genera la tabla de verdad completa para una fórmula
   * @param block El bloque raíz de la fórmula
   * @returns Tabla de verdad con todas las asignaciones y resultados
   */
  generateTruthTable(block: Blockly.Block | null): TruthTableEntry[] {
    if (!block) return [];

    const variables = this.extractPropositionVariables(block);
    const assignments = this.generateAllAssignments(variables);

    return assignments.map((assignment) => ({
      assignment,
      result: this.evaluateFormula(block, assignment),
    }));
  }

  /**
   * Convierte un bloque a su representación como fórmula lógica textual
   * @param block El bloque a convertir
   * @returns Representación textual de la fórmula
   */
  blockToFormula(block: Blockly.Block | null): string {
    if (!block) return '';

    switch (block.type) {
      case 'logic_proposition':
        return block.getFieldValue('PROP_NAME') || 'P';

      // Mejorar blockToFormula para negaciones (~línea 325)
      case 'logic_negation': {
        const inputBlock = block.getInputTargetBlock('INPUT');
        if (!inputBlock) return '¬(?)';
        const inner = this.blockToFormula(inputBlock);

        // Si es un átomo simple (solo una letra + números), no usar paréntesis
        if (/^[A-Z][0-9]*$/.test(inner)) {
          return `¬${inner}`;
        }

        // Para expresiones complejas, usar paréntesis
        return `¬(${inner})`;
      }

      case 'logic_conjunction': {
        const leftBlock = block.getInputTargetBlock('LEFT');
        const rightBlock = block.getInputTargetBlock('RIGHT');
        const left = leftBlock ? this.blockToFormula(leftBlock) : '?';
        const right = rightBlock ? this.blockToFormula(rightBlock) : '?';
        return `(${left} ∧ ${right})`;
      }

      case 'logic_disjunction': {
        const leftBlock = block.getInputTargetBlock('LEFT');
        const rightBlock = block.getInputTargetBlock('RIGHT');
        const left = leftBlock ? this.blockToFormula(leftBlock) : '?';
        const right = rightBlock ? this.blockToFormula(rightBlock) : '?';
        return `(${left} ∨ ${right})`;
      }

      case 'logic_implication': {
        const leftBlock = block.getInputTargetBlock('LEFT');
        const rightBlock = block.getInputTargetBlock('RIGHT');
        const left = leftBlock ? this.blockToFormula(leftBlock) : '?';
        const right = rightBlock ? this.blockToFormula(rightBlock) : '?';
        return `(${left} → ${right})`;
      }

      // case 'logic_biconditional': {
      //   const leftBlock = block.getInputTargetBlock('LEFT');
      //   const rightBlock = block.getInputTargetBlock('RIGHT');
      //   const left = leftBlock ? this.blockToFormula(leftBlock) : '?';
      //   const right = rightBlock ? this.blockToFormula(rightBlock) : '?';
      //   return `(${left} ↔ ${right})`;
      // }

      default:
        return '?';
    }
  }

  /**
   * Valida recursivamente la sintaxis de una fórmula lógica construida con bloques.
   * @param block El bloque raíz de la fórmula
   * @returns null si es válida, o un mensaje de error si no lo es
   */
  validateFormulaBlockWithWarnings(block: Blockly.Block | null): string | null {
    if (!block) return 'No hay fórmula construida.';

    // Limpia cualquier warning anterior
    block.setWarningText(null);

    const operatorNames: Record<string, string> = {
      conjunction: 'conjunción (∧)',
      disjunction: 'disyunción (∨)',
      implication: 'implicación (→)',
      // biconditional: 'bicondicional (↔)',
    };

    switch (block.type) {
      case 'logic_proposition': {
        const propName = block.getFieldValue('PROP_NAME');
        if (!propName || propName.trim() === '') {
          block.setWarningText('Variable proposicional vacía.');
          return 'Variable proposicional vacía.';
        }
        return null;
      }

      case 'logic_negation': {
        const inputBlock = block.getInputTargetBlock('INPUT');
        if (!inputBlock) {
          block.setWarningText('La negación (¬) debe tener una subfórmula.');
          return 'La negación (¬) debe tener una subfórmula.';
        }
        const childError = this.validateFormulaBlockWithWarnings(inputBlock);
        if (childError) block.setWarningText(childError);
        return childError;
      }

      case 'logic_conjunction':
      case 'logic_disjunction':
      case 'logic_implication':
      case 'logic_biconditional': {
        const left = block.getInputTargetBlock('LEFT');
        const right = block.getInputTargetBlock('RIGHT');
        const opKey = block.type.replace('logic_', '');
        const opName = operatorNames[opKey] || opKey;
        if (!left || !right) {
          block.setWarningText(
            `El operador ${opName} debe tener dos subfórmulas.`
          );
          return `El operador ${opName} debe tener dos subfórmulas.`;
        }
        const leftError = this.validateFormulaBlockWithWarnings(left);
        const rightError = this.validateFormulaBlockWithWarnings(right);
        const error = leftError || rightError;
        if (error) block.setWarningText(error);
        return error;
      }

      default:
        block.setWarningText('Bloque desconocido o no soportado.');
        return 'Bloque desconocido o no soportado.';
    }
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
}
