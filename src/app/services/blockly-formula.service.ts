import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BlocklyFormulaService {
  private formulaSubject = new BehaviorSubject<string>('');
  formula$ = this.formulaSubject.asObservable();

  setFormula(formula: string) {
    this.formulaSubject.next(formula);
  }

  getFormula(): string {
    return this.formulaSubject.value;
  }
}