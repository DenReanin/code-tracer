import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';
import {
  SyntaxTreeNode,
  SyntaxTreeService,
} from '../../services/syntax-tree.service';
import * as Blockly from 'blockly';

@Component({
  selector: 'app-syntax-tree-visualizer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="syntax-tree-container">
      <div #treeContainer class="tree-visualization"></div>
    </div>
  `,
})
export class SyntaxTreeVisualizerComponent implements OnChanges, AfterViewInit {
  @Input() block: Blockly.Block | null = null;
  @ViewChild('treeContainer', { static: true }) treeContainer!: ElementRef;

  private tree: SyntaxTreeNode | null = null;
  private svg: any;
  private width = 800;
  private height = 300;
  private margin = { top: 40, right: 90, bottom: 50, left: 90 };

  constructor(private syntaxTreeService: SyntaxTreeService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['block'] && this.block) {
      this.setDimensions();
      this.updateTree();
    }
  }

  ngAfterViewInit(): void {
    this.setDimensions();
    this.initializeD3();
    if (this.block) {
      this.updateTree();
    }
    this.adjustSVGForMobile();
  }

  private setDimensions(): void {
    const container = this.treeContainer?.nativeElement?.parentElement;
    if (container) {
      this.width = Math.max(220, Math.min(container.offsetWidth));
      this.height = 0.45 * this.width + 60;
    }
  }

  private initializeD3(): void {
    d3.select(this.treeContainer.nativeElement).selectAll('*').remove();
    this.svg = d3
      .select(this.treeContainer.nativeElement)
      .append('svg')
      .attr('width', '100%')
      .attr('height', this.height)
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
  }

  private updateTree(): void {
    this.tree = this.syntaxTreeService.buildSyntaxTreeFromBlock(this.block);
    if (!this.tree || !this.svg) return;

    this.svg.selectAll('*').remove();

    const d3Tree = this.convertToD3Hierarchy(this.tree);
    const hierarchy = d3.hierarchy(d3Tree);

    // Calcula profundidad y nodos máximos por nivel
    const depth = this.getTreeDepth(d3Tree);
    const maxNodes = this.getMaxNodesPerLevel(d3Tree);

    // Espaciados ajustables
    const verticalSpacing = 120;   // Más espacio entre niveles
    const horizontalSpacing = 120; // Más espacio entre hermanos

    // Calcula el tamaño necesario
    const neededHeight = Math.max(this.height, depth * verticalSpacing + this.margin.top + this.margin.bottom);
    const neededWidth = Math.max(this.width, maxNodes * horizontalSpacing + this.margin.left + this.margin.right);

    // Actualiza el alto y ancho del SVG y el viewBox
    d3.select(this.treeContainer.nativeElement).select('svg')
      .attr('height', neededHeight)
      .attr('width', neededWidth)
      .attr('viewBox', `0 0 ${neededWidth} ${neededHeight}`);

    const treeLayout = d3
      .tree()
      .size([
        neededWidth - this.margin.left - this.margin.right,
        neededHeight - this.margin.top - this.margin.bottom,
      ]);

    const treeData = treeLayout(hierarchy);

    // Dibuja enlaces
    this.svg
      .selectAll('.link')
      .data(treeData.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr(
        'd',
        d3
          .linkVertical()
          .x((d: any) => d.x)
          .y((d: any) => d.y)
      )
      .style('fill', 'none')
      .style('stroke', '#ccc')
      .style('stroke-width', '2px');

    // Dibuja nodos
    const nodes = this.svg
      .selectAll('.node')
      .data(treeData.descendants())
      .enter()
      .append('g')
      .attr(
        'class',
        (d: any) => 'node' + (d.children ? ' node--internal' : ' node--leaf')
      )
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`);

    nodes
      .append('circle')
      .attr('r', 20)
      .style('fill', (d: any) => {
        switch (d.data.type) {
          case 'negation':
            return '#e57373';
          case 'conjunction':
            return '#81c784';
          case 'disjunction':
            return '#64b5f6';
          case 'implication':
            return '#ba68c8';
          case 'biconditional':
            return '#ffb74d';
          case 'proposition':
            return '#bdbdbd';
          default:
            return '#e0e0e0';
        }
      })
      .style('stroke', '#fff')
      .style('stroke-width', '2px');

    nodes
      .append('text')
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text((d: any) => d.data.name);
  }

  private convertToD3Hierarchy(node: SyntaxTreeNode): any {
    if (!node) return null;
    const children: any[] = [];
    if (node.left) children.push(this.convertToD3Hierarchy(node.left));
    if (node.right) children.push(this.convertToD3Hierarchy(node.right));
    if (node.child) children.push(this.convertToD3Hierarchy(node.child));
    return {
      name: node.value,
      type: node.type,
      children: children.length > 0 ? children : undefined,
    };
  }

  private getTreeDepth(node: any): number {
    if (!node || !node.children || node.children.length === 0) return 1;
    return (
      1 +
      Math.max(...node.children.map((child: any) => this.getTreeDepth(child)))
    );
  }

  private getMaxNodesPerLevel(
    node: any,
    level = 0,
    levels: Record<number, number> = {}
  ): number {
    if (!node) return 0;
    levels[level] = (levels[level] || 0) + 1;
    if (node.children) {
      node.children.forEach((child: any) =>
        this.getMaxNodesPerLevel(child, level + 1, levels)
      );
    }
    return Math.max(...Object.values(levels));
  }

  // Añadir después de la generación del SVG
  private adjustSVGForMobile(): void {
    const svg = this.treeContainer?.nativeElement?.querySelector('svg');
    if (svg) {
      // Asegurar que el SVG tenga viewBox para escalado responsive
      if (!svg.getAttribute('viewBox')) {
        const bbox = svg.getBBox();
        svg.setAttribute('viewBox', `0 0 ${bbox.width + 20} ${bbox.height + 20}`);
      }
      
      // Hacer el SVG responsive
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.style.maxWidth = '100%';
      svg.style.height = 'auto';
    }
  }
}
