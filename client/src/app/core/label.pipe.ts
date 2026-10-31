import { Pipe, PipeTransform } from '@angular/core';

/** "in-progress" -> "In progress" */
@Pipe({ name: 'label', standalone: true })
export class LabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    const text = value.replace(/-/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}
