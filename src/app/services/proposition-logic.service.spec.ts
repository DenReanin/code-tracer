// EJEMPLO: Test mejorado para PropositionLogicService
import { TestBed } from '@angular/core/testing';
import { PropositionLogicService } from './proposition-logic.service';

describe('PropositionLogicService', () => {
  let service: PropositionLogicService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PropositionLogicService);
  });

  describe('Truth Table Generation', () => {
    it('should generate correct truth table for simple conjunction', () => {
      const formula = 'P ∧ Q';
      const result = service.generateTruthTable(formula, ['P', 'Q']);
      
      expect(result).toEqual([
        { P: true, Q: true, result: true },
        { P: true, Q: false, result: false },
        { P: false, Q: true, result: false },
        { P: false, Q: false, result: false }
      ]);
    });

    it('should handle complex formulas with precedence', () => {
      const formula = '(P ∨ Q) ∧ ¬R';
      const result = service.generateTruthTable(formula, ['P', 'Q', 'R']);
      
      expect(result.length).toBe(8); // 2^3 combinations
      expect(result.every(row => typeof row.result === 'boolean')).toBe(true);
    });

    it('should throw error for invalid formulas', () => {
      expect(() => {
        service.generateTruthTable('P ∧ ∧ Q', ['P', 'Q']);
      }).toThrowError('Invalid formula syntax');
    });
  });

  describe('Formula Validation', () => {
    it('should validate well-formed formulas', () => {
      expect(service.validateFormula('P ∧ Q')).toBe(true);
      expect(service.validateFormula('(P → Q) ↔ (¬P ∨ Q)')).toBe(true);
    });

    it('should reject malformed formulas', () => {
      expect(service.validateFormula('P ∧')).toBe(false);
      expect(service.validateFormula('(P')).toBe(false);
      expect(service.validateFormula('')).toBe(false);
    });
  });
});