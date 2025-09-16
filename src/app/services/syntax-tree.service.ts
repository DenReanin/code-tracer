import { Injectable } from '@angular/core';
import { PropositionLogicService } from './proposition-logic.service';
import * as Blockly from 'blockly';

export interface SyntaxTreeNode {
  type: any;
  value: string;
  left?: SyntaxTreeNode;
  right?: SyntaxTreeNode;
  child?: SyntaxTreeNode; // Para operadores unarios (negación)
}

@Injectable({
  providedIn: 'root',
})
export class SyntaxTreeService {
  constructor(private logicService: PropositionLogicService) {}

  /**
   * Construye un árbol sintáctico directamente desde un bloque de Blockly
   */
  buildSyntaxTreeFromBlock(block: Blockly.Block | null): SyntaxTreeNode | null {
    if (!block) return null;

    switch (block.type) {
      case 'logic_proposition':
        return {
          type: 'proposition',
          value: block.getFieldValue('PROP_NAME') || 'P',
        };

      case 'logic_negation': {
        const inputBlock = block.getInputTargetBlock('INPUT');
        return {
          type: 'negation',
          value: '¬',
          child: this.buildSyntaxTreeFromBlock(inputBlock) || {
            type: 'proposition',
            value: '?',
          },
        };
      }

      case 'logic_conjunction': {
        const leftBlock = block.getInputTargetBlock('LEFT');
        const rightBlock = block.getInputTargetBlock('RIGHT');
        return {
          type: 'conjunction',
          value: '∧',
          left: this.buildSyntaxTreeFromBlock(leftBlock) || {
            type: 'proposition',
            value: '?',
          },
          right: this.buildSyntaxTreeFromBlock(rightBlock) || {
            type: 'proposition',
            value: '?',
          },
        };
      }

      case 'logic_disjunction': {
        const leftBlock = block.getInputTargetBlock('LEFT');
        const rightBlock = block.getInputTargetBlock('RIGHT');
        return {
          type: 'disjunction',
          value: '∨',
          left: this.buildSyntaxTreeFromBlock(leftBlock) || {
            type: 'proposition',
            value: '?',
          },
          right: this.buildSyntaxTreeFromBlock(rightBlock) || {
            type: 'proposition',
            value: '?',
          },
        };
      }

      case 'logic_implication': {
        const leftBlock = block.getInputTargetBlock('LEFT');
        const rightBlock = block.getInputTargetBlock('RIGHT');
        return {
          type: 'implication',
          value: '→',
          left: this.buildSyntaxTreeFromBlock(leftBlock) || {
            type: 'proposition',
            value: '?',
          },
          right: this.buildSyntaxTreeFromBlock(rightBlock) || {
            type: 'proposition',
            value: '?',
          },
        };
      }

      case 'logic_biconditional': {
        const leftBlock = block.getInputTargetBlock('LEFT');
        const rightBlock = block.getInputTargetBlock('RIGHT');
        return {
          type: 'biconditional',
          value: '↔',
          left: this.buildSyntaxTreeFromBlock(leftBlock) || {
            type: 'proposition',
            value: '?',
          },
          right: this.buildSyntaxTreeFromBlock(rightBlock) || {
            type: 'proposition',
            value: '?',
          },
        };
      }

      default:
        return { type: 'proposition', value: '?' };
    }
  }
}
