export const defaultSeats = ['host', 'guest'];
export const sharedFilters = {
  'none': ['Original', 'none'],
  'dark': ['Dark', 'brightness(0.72) contrast(1.12)'],
  'black-white': ['Black and white', 'grayscale(1)'],
  'vintage': ['Vintage', 'sepia(0.75) contrast(0.92)'],
  'vivid': ['Vivid', 'saturate(1.5) contrast(1.08)'],
  'soft': ['Soft', 'contrast(0.85) brightness(1.1)'],
};

export function boothGrid(count) {
  return { columns: count === 4 ? 2 : count, rows: count === 4 ? 2 : 1 };
}
