import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceStateService {
  private blocklyState: string | null = null;
  private deductionState: any = null;        

  // Blockly
  setBlocklyState(state: string) {
    this.blocklyState = state;
  }
  getBlocklyState(): string | null {
    return this.blocklyState;
  }

  // Deducción Natural
  setDeductionState(state: any) {
    this.deductionState = state;
  }
  getDeductionState(): any {
    return this.deductionState;
  }
}