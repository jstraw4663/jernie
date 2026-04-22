// carAssets.ts — Car type metadata for rental car detail views.
//
// Images are served from /public/assets/cars/{slug}.jpg — in-app storage, no external CDN.
// Add the files to public/assets/cars/ to activate images; CarTypeSelector hides them
// gracefully via imgError state if a file is missing.
// unknown.jpg is used as a fallback for unrecognized car type slugs.

export const CAR_TYPE_IMAGES: Record<string, string> = {
  economy:      '/assets/cars/economy.jpg',
  compact:      '/assets/cars/compact.jpg',
  midsize:      '/assets/cars/midsize.jpg',
  fullsize:     '/assets/cars/full-size-sedan.jpg',
  fullsize_suv: '/assets/cars/full-size-suv.jpg',
  suv:          '/assets/cars/suv.jpg',
  minivan:      '/assets/cars/minivan.jpg',
  convertible:  '/assets/cars/convertible.jpg',
  pickup:       '/assets/cars/truck.jpg',
  luxury:       '/assets/cars/luxury.jpg',
  electric:     '/assets/cars/electric.jpg',
  unknown:      '/assets/cars/unknown.jpg',
};

export const CAR_TYPE_LABELS: Record<string, string> = {
  economy:      'Economy',
  compact:      'Compact',
  midsize:      'Midsize',
  fullsize:     'Full-Size Sedan',
  fullsize_suv: 'Full-Size SUV',
  suv:          'SUV',
  minivan:      'Minivan',
  convertible:  'Convertible',
  pickup:       'Pickup Truck',
  luxury:       'Luxury',
  electric:     'Electric',
};

export const CAR_TYPE_OPTIONS: string[] = [
  'economy',
  'compact',
  'midsize',
  'fullsize',
  'fullsize_suv',
  'suv',
  'minivan',
  'convertible',
  'pickup',
  'luxury',
  'electric',
];

/**
 * Returns the image URL for a given car type slug, or null if not found / empty.
 */
export function getCarImageUrl(carType: string | null): string | null {
  if (!carType) return null;
  return CAR_TYPE_IMAGES[carType] ?? CAR_TYPE_IMAGES['unknown'] ?? null;
}
