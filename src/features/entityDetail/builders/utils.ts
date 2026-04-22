import type { DetailRow, DetailSectionConfig } from '../detailTypes';

export function section(title: string, rows: DetailRow[]): DetailSectionConfig | null {
  const filled = rows.filter(r => r.component !== undefined || r.value.trim() !== '');
  return filled.length > 0 ? { title, rows: filled } : null;
}
