export const defaultSeats = ['host', 'guest'];

export function boothGrid(count) {
  return { columns: count === 4 ? 2 : count, rows: count === 4 ? 2 : 1 };
}
