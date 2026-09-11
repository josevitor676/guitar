import type { GrayImage } from './image.types';

const DARK_THRESHOLD = 128;
/**
 * How far from level the search looks. A page further round than this is not a
 * sheet that slipped under a phone camera, and widening the search only gives
 * it more chances to lock onto something that is not a line.
 */
export const MAX_SKEW_DEGREES = 4;
const SEARCH_STEP_DEGREES = 0.1;
/** Below this there is not enough ink to tell a line from a smudge. */
const MIN_DARK_PIXELS = 200;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

function darkPixels(image: GrayImage): { xs: Int32Array; ys: Int32Array } {
  const { data, width, height } = image;
  const xs: number[] = [];
  const ys: number[] = [];

  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      if (data[row + x] < DARK_THRESHOLD) {
        xs.push(x);
        ys.push(y);
      }
    }
  }

  return { xs: Int32Array.from(xs), ys: Int32Array.from(ys) };
}

/**
 * How concentrated the ink becomes when the page is read at this angle.
 *
 * Turning a sheet of horizontal lines to level gathers each line into a single
 * row, so a few rows hold nearly all the ink. Summing the square of each row's
 * count rewards exactly that: the same ink spread over many rows scores far
 * less than the same ink piled into few.
 */
function concentrationAt(xs: Int32Array, ys: Int32Array, degrees: number, height: number): number {
  const angle = toRadians(degrees);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  // Projecting can push a row past either end of the page, so the buckets have
  // room on both sides and the origin sits in the middle.
  const offset = height;
  const buckets = new Int32Array(height * 3);

  for (let i = 0; i < xs.length; i += 1) {
    const projected = Math.round(ys[i] * cos - xs[i] * sin) + offset;
    if (projected >= 0 && projected < buckets.length) buckets[projected] += 1;
  }

  let score = 0;
  for (let i = 0; i < buckets.length; i += 1) score += buckets[i] * buckets[i];
  return score;
}

/**
 * The tilt of the page, in degrees, positive when the lines run downhill to
 * the right. Zero when there is nothing to go on.
 */
export function detectSkew(image: GrayImage): number {
  const { xs, ys } = darkPixels(image);
  if (xs.length < MIN_DARK_PIXELS) return 0;

  let best = 0;
  let bestScore = -1;

  // Counted in whole steps rather than added up: adding 0.1 forty times lands
  // near zero but never on it, so a page that is already straight would be
  // measured as a fraction of a degree off and turned for no reason.
  const steps = Math.round(MAX_SKEW_DEGREES / SEARCH_STEP_DEGREES);
  for (let step = -steps; step <= steps; step += 1) {
    const degrees = step * SEARCH_STEP_DEGREES;
    const score = concentrationAt(xs, ys, degrees, image.height);
    // Ties go to the smaller angle: two readings that concentrate the ink
    // equally well mean the page tells us nothing, and leaving it alone is the
    // answer that adds no error.
    if (score > bestScore || (score === bestScore && Math.abs(degrees) < Math.abs(best))) {
      bestScore = score;
      best = degrees;
    }
  }

  return Number(best.toFixed(2));
}

/**
 * Turns the page back to level.
 *
 * Each output pixel asks where it came from and takes the nearest input pixel,
 * rather than each input pixel choosing an output — that way every output
 * pixel gets a value, instead of the rotation leaving a grid of holes behind.
 */
export function deskew(image: GrayImage, degrees: number): GrayImage {
  if (degrees === 0) return image;

  const { data, width, height } = image;
  const angle = toRadians(degrees);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const centreX = width / 2;
  const centreY = height / 2;
  // White, so the wedges the rotation opens at the corners read as paper. Ink
  // there would look like a line to the detector that runs next.
  const out = new Uint8ClampedArray(width * height).fill(255);

  for (let y = 0; y < height; y += 1) {
    const dy = y - centreY;
    for (let x = 0; x < width; x += 1) {
      const dx = x - centreX;
      const sourceX = Math.round(centreX + dx * cos - dy * sin);
      const sourceY = Math.round(centreY + dx * sin + dy * cos);
      if (sourceX < 0 || sourceX >= width || sourceY < 0 || sourceY >= height) continue;
      out[y * width + x] = data[sourceY * width + sourceX];
    }
  }

  return { data: out, width, height };
}
