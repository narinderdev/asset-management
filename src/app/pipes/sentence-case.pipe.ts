import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sentenceCase',
  standalone: true
})
export class SentenceCasePipe implements PipeTransform {
  transform(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    const normalized = String(value).trim().replace(/[_-]+/g, ' ').toLowerCase();
    if (!normalized) {
      return '';
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
}
