export interface PageSize {
  label: string;
  value: string;
  width: number;
  height: number;
}

export const PAGE_SIZES: PageSize[] = [
  { label: 'A4', value: 'a4', width: 210, height: 297 },
  { label: 'A3', value: 'a3', width: 297, height: 420 },
  { label: 'Letter', value: 'letter', width: 216, height: 279 },
];

export const OrientationOptions = [
  { label: 'Portrait', value: 'portrait' as const },
  { label: 'Landscape', value: 'landscape' as const },
];
