export enum LineType {
    PREMISE = 'premise',           // Premisa inicial
    ASSUMPTION = 'assumption',     // Supuesto provisional
    DERIVED = 'derived'            // Línea derivada
  }
  
  export enum RuleType {
    // Reglas de implicación
    MP = 'mp',             // Modus Ponens
    TD = 'td',             // Teorema de Deducción
    
    // Reglas de conjunción
    IC = 'ic',             // Introducción de la Conjunción
    EC1 = 'ec1',           // Eliminación de la Conjunción (izquierda)
    EC2 = 'ec2',           // Eliminación de la Conjunción (derecha)
    
    // Reglas de disyunción
    ID1 = 'id1',           // Introducción de la Disyunción (izquierda)
    ID2 = 'id2',           // Introducción de la Disyunción (derecha)
    CASES = 'cases',       // Eliminación de la Disyunción (prueba por casos)
    
    // Reglas de negación
    IN = 'in',             // Introducción de la Negación (reducción al absurdo)
    EN = 'en',             // Eliminación de la Negación
    
    // Reglas derivadas comunes
    //MT = 'mt',             // Modus Tollens
    //SILOGISMO = 'sil'      // Silogismo Hipotético
  }
  
  export interface DeductionLine {
    number: number;                  // Número de línea
    formula: string;                 // La fórmula en notación formal
    type: LineType;                  // Tipo de línea
    rule?: RuleType;                 // Regla aplicada (si es una línea derivada)
    referencedLines?: number[];      // Referencias a líneas usadas en la derivación
    subproofLevel: number;           // Nivel de anidamiento para subpruebas
    isDischargedAssumption?: boolean; // Indica si un supuesto ha sido cancelado
    blocklyBlock?: any;              // Referencia al bloque de Blockly (opcional)
  }
  
  export interface Derivation {
    lines: DeductionLine[];          // Líneas de la derivación
    currentSubproofLevel: number;    // Nivel actual de anidamiento
    goal?: string;                   // Fórmula objetivo a demostrar (opcional)
    closedSubproofs?: {from: number, to: number}[]; // Subpruebas cerradas
  }