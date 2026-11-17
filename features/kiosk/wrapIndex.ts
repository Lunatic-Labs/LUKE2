/**
 * Moves `step` positions from `index` in a list of `count` items, wrapping
 * around at both ends. Shared by the Prev/Next controls in Majors, Credits,
 * and the video player.
 *
 * JavaScript's `%` is a remainder, not a modulo: `-2 % 8` is `-2`, not `6`.
 * The old inline formula `(i + step + count) % count` only stayed positive
 * for steps no bigger than `count`, so this adds `count` after the remainder
 * and takes the remainder again, which is correct for any step size.
 *
 * An empty list has no valid position, so `count <= 0` returns -1 instead of
 * throwing. Callers should treat -1 as "nothing to show".
 */
export function wrapIndex(index: number, step: number, count: number): number {
  if (count <= 0) return -1;
  return (((index + step) % count) + count) % count;
}