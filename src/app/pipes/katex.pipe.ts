import { Pipe, PipeTransform } from '@angular/core';
import katex from 'katex';

@Pipe({ name: 'katex', standalone: true })
export class KatexPipe implements PipeTransform {
  transform(value: string): string {
    try {
      return katex.renderToString(value, { throwOnError: false });
    } catch {
      return value;
    }
  }
}