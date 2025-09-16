import { LineType, DeductionLine, Derivation } from './deduction.model';

describe('Deduction Models', () => {
  it('should correctly create a derivation object', () => {
    const derivation: Derivation = {
      lines: [],
      currentSubproofLevel: 0
    };
    expect(derivation).toBeTruthy();
    expect(derivation.currentSubproofLevel).toBe(0);
  });

  it('should correctly create a deduction line', () => {
    const line: DeductionLine = {
      number: 1,
      formula: 'p → q',
      type: LineType.PREMISE,
      subproofLevel: 0
    };
    expect(line).toBeTruthy();
    expect(line.type).toBe(LineType.PREMISE);
  });
});