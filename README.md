# CodeTracer

An interactive educational platform for teaching propositional logic through visual programming. CodeTracer provides two comprehensive learning environments: a Propositional Logic System and a Natural Deduction System, supported by guided exercises and advanced visualization tools.

## Overview

CodeTracer was developed as a Final Degree Project in Multimedia Engineering to revolutionize how students learn formal logic. By combining visual programming with traditional logical notation, it addresses the common challenges students face when studying propositional logic and natural deduction.

## Core Systems

### Propositional Logic System
- **Visual Formula Construction**: Build logical formulas using intuitive drag-and-drop blocks
- **Custom Block Creation**: Design and save personalized logical operators
- **Truth Table Generation**: Automatic computation and interactive truth table visualization
- **Syntax Tree Visualization**: Dynamic tree diagrams showing formula structure
- **Real-time Validation**: Immediate syntax and semantic checking

### Natural Deduction System  
- **Interactive Proof Construction**: Step-by-step proof building with rule validation
- **Rule Library**: Complete set of natural deduction inference rules
- **Proof Verification**: Automatic validation of logical reasoning steps
- **Export Capabilities**: Generate PDF documents of completed proofs

### Guided Exercise System
- **Progressive Learning**: Structured exercises with increasing difficulty
- **Contextual Hints**: Intelligent assistance based on current progress
- **Performance Tracking**: Monitor learning progress and identify areas for improvement
- **Adaptive Content**: Exercises that adapt to individual learning pace

## Key Features

- **Custom Blocks**: Create and reuse personalized logical operators
- **Truth Tables**: Interactive truth table generation and analysis
- **Syntax Trees**: Visual representation of logical formula hierarchy
- **Formula Validation**: Real-time syntax and logical correctness checking
- **PDF Export**: Professional documentation of proofs and exercises
- **Responsive Design**: Optimized for both desktop and tablet use

## Technology Stack

- **Frontend**: Angular 19.2.0
- **Visual Programming**: Google Blockly 11.2.1
- **Mathematical Notation**: KaTeX 0.16.22
- **Tree Visualization**: D3.js 7.9.0
- **Document Generation**: jsPDF 3.0.1

## Getting Started

### Prerequisites
- Node.js 18.19 or higher
- npm 8.0 or higher

### Installation
```bash
git clone https://github.com/DenReanin/code-tracer.git
cd code-tracer
npm install
npm start
```

Visit `http://localhost:4200` to access the application.

### Development

This is an Angular CLI project. For development tasks:

- **Development server**: Run `ng serve` for a dev server
- **Build**: Run `ng build` to build the project  
- **Unit tests**: Run `ng test` to execute tests via Karma
- **Code generation**: Run `ng generate component component-name` to create new components

For more Angular CLI commands, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli).

## Usage

1. **Choose Learning Mode**: Select between Propositional Logic or Natural Deduction systems
2. **Start with Exercises**: Follow guided tutorials to learn fundamental concepts
3. **Explore Free Mode**: Experiment with advanced features and custom blocks
4. **Build Formulas**: Use visual blocks to construct complex logical expressions
5. **Analyze Results**: View truth tables, syntax trees, and proof validations
6. **Export Work**: Generate PDF documents of your logical proofs and exercises

## Academic Context

This project represents a comprehensive approach to teaching formal logic through interactive technology. Developed as a Final Degree Project in Multimedia Engineering, it bridges the gap between theoretical concepts and practical understanding in propositional logic education.

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
