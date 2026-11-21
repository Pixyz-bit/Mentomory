import { portraitLooks } from './face/portrait-effects.js';

export const defaultSeats = ['host', 'guest'];
export const sharedFilters = {
  'none': ['Original', 'none'],
  'dark': ['Dark', 'brightness(0.72) contrast(1.12)'],
  'black-white': ['Black and white', 'grayscale(1)'],
  'vintage': ['Vintage', 'sepia(0.75) contrast(0.92)'],
  'vivid': ['Vivid', 'saturate(1.5) contrast(1.08)'],
  'soft': ['Soft', 'contrast(0.85) brightness(1.1)'],
  'golden-hour': ['Golden Hour', 'sepia(.15) saturate(1.12) brightness(1.045) contrast(1.02)'],
  'berry-film': ['Berry Film', 'sepia(.13) hue-rotate(345deg) saturate(1.12) contrast(.96)'],
  'cool-flash': ['Cool Flash', 'sepia(.08) hue-rotate(160deg) saturate(.96) brightness(1.055) contrast(1.06)'],
  'matte-film': ['Matte Film', 'contrast(.83) brightness(1.08) saturate(.8) sepia(.13)'],
  'candy': ['Candy', 'saturate(1.20) hue-rotate(355deg) brightness(1.045) contrast(.97)'],
  'silver': ['Silver Screen', 'grayscale(1) contrast(1.35) brightness(1.08)'],
};

export const sharedFaceEffects = [
  ['none', 'None'],
  ...portraitLooks,
  ['dog', 'Puppy Lens'],
  ['pink-cowboy', 'Pink Cowboy'],
  ['ribbon-bow', 'Ribbon Bow'],
  ['heart-glasses', 'Heart Glasses'],
  ['pearl-tiara', 'Pearl Tiara'],
  ['cosmic-freckles', 'Cosmic Freckles'],
  ['bunny-bonnet', 'Bunny Bonnet'],
];

export function boothGrid(count) {
  return { columns: count === 4 ? 2 : count, rows: count === 4 ? 2 : 1 };
}
