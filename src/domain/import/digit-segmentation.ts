import type { GrayImage, TabSystem } from './image.types';

const DARK_THRESHOLD = 128;
/** How far from a line's center its own ink reaches, in pixels. */
const LINE_HALF_THICKNESS = 2;
/** A digit is roughly this tall relative to the spacing between strings. */
const MIN_HEIGHT_RATIO = 0.2;
const MAX_HEIGHT_RATIO = 1.1;
const MIN_WIDTH_RATIO = 0.08;
const MAX_WIDTH_RATIO = 1.2;
/** Marks closer than this, in spacings, are two digits of one number. */
const JOIN_GAP_RATIO = 0.35;
/** A guard against a pathological image producing millions of components. */
const MAX_BOXES = 400;

export interface DigitBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function spacingOf(system: TabSystem): number {
  return (system.lineYs[system.lineYs.length - 1] - system.lineYs[0]) / (system.lineYs.length - 1);
}

/**
 * Builds the ink mask with the tablature lines erased.
 *
 * The lines have to go before components are labeled: each runs the full width,
 * so one line would weld every digit sitting on it into a single blob.
 *
 * Erasing whole rows would instead cut in half any digit the line passes
 * through. So a pixel on a line row survives when ink continues directly above
 * or below the line — that ink belongs to a symbol crossing the line, not to
 * the line itself.
 */
function inkMaskWithoutLines(image: GrayImage, system: TabSystem): Uint8Array {
  const { data, width, height } = image;
  const mask = new Uint8Array(width * height);

  for (let i = 0; i < data.length; i += 1) {
    mask[i] = data[i] < DARK_THRESHOLD ? 1 : 0;
  }

  for (const lineY of system.lineYs) {
    const above = lineY - LINE_HALF_THICKNESS - 1;
    const below = lineY + LINE_HALF_THICKNESS + 1;
    const continuesThrough = (x: number) =>
      (above >= 0 && mask[above * width + x] === 1) || (below < height && mask[below * width + x] === 1);

    for (let y = lineY - LINE_HALF_THICKNESS; y <= lineY + LINE_HALF_THICKNESS; y += 1) {
      if (y < 0 || y >= height) continue;
      for (let x = 0; x < width; x += 1) {
        if (mask[y * width + x] === 1 && !continuesThrough(x)) mask[y * width + x] = 0;
      }
    }
  }

  return mask;
}

function boxesOverlapVertically(a: DigitBox, b: DigitBox): boolean {
  const overlap = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return overlap > 0;
}

/** Joins side-by-side marks that form one number, such as the 1 and 2 of "12". */
function joinAdjacent(boxes: DigitBox[], spacing: number): DigitBox[] {
  const joined: DigitBox[] = [];

  for (const box of boxes) {
    const previous = joined[joined.length - 1];
    const closeEnough = previous && box.x0 - previous.x1 <= spacing * JOIN_GAP_RATIO;

    if (previous && closeEnough && boxesOverlapVertically(previous, box)) {
      previous.x1 = Math.max(previous.x1, box.x1);
      previous.y0 = Math.min(previous.y0, box.y0);
      previous.y1 = Math.max(previous.y1, box.y1);
      continue;
    }

    joined.push({ ...box });
  }

  return joined;
}

/**
 * Locates each fret number inside one tablature system.
 *
 * Segmenting before recognition is what makes sparse tablature readable: handed
 * a wide, mostly blank strip, the OCR engine finds nothing, but handed one
 * tightly cropped digit it reads reliably.
 */
export function findDigitBoxes(image: GrayImage, system: TabSystem): DigitBox[] {
  const { width, height } = image;
  const spacing = spacingOf(system);
  const mask = inkMaskWithoutLines(image, system);

  const bandTop = Math.max(0, Math.floor(system.top));
  const bandBottom = Math.min(height - 1, Math.ceil(system.bottom));

  const visited = new Uint8Array(width * height);
  const raw: DigitBox[] = [];

  const isInk = (x: number, y: number) => mask[y * width + x] === 1 && !visited[y * width + x];

  for (let y = bandTop; y <= bandBottom; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!isInk(x, y)) continue;

      // Flood fill this component iteratively; recursion would overflow on a
      // large blob such as a bar line.
      let x0 = x;
      let x1 = x;
      let y0 = y;
      let y1 = y;
      const stack: number[] = [y * width + x];
      visited[y * width + x] = 1;

      while (stack.length > 0) {
        const index = stack.pop()!;
        const cx = index % width;
        const cy = Math.floor(index / width);

        if (cx < x0) x0 = cx;
        if (cx > x1) x1 = cx;
        if (cy < y0) y0 = cy;
        if (cy > y1) y1 = cy;

        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= width || ny < bandTop || ny > bandBottom) continue;
          if (!isInk(nx, ny)) continue;
          visited[ny * width + nx] = 1;
          stack.push(ny * width + nx);
        }
      }

      raw.push({ x0, y0, x1: x1 + 1, y1: y1 + 1 });
      if (raw.length > MAX_BOXES) return [];
    }
  }

  const plausible = raw.filter((box) => {
    const boxHeight = box.y1 - box.y0;
    const boxWidth = box.x1 - box.x0;
    return (
      boxHeight >= spacing * MIN_HEIGHT_RATIO &&
      boxHeight <= spacing * MAX_HEIGHT_RATIO &&
      boxWidth >= spacing * MIN_WIDTH_RATIO &&
      boxWidth <= spacing * MAX_WIDTH_RATIO
    );
  });

  plausible.sort((a, b) => a.x0 - b.x0);
  return joinAdjacent(plausible, spacing);
}

const MIN_OCR_SCALE = 1;
const MAX_OCR_SCALE = 10;

/**
 * How much to enlarge one digit so the OCR sees a consistent size.
 *
 * A fixed multiplier cannot work: a PDF is rasterized at twice its natural
 * size, so the same printed digit arrives twice as tall as it would from a
 * photograph, and one multiplier that suits one source overshoots the other.
 * Normalizing to a target height makes recognition independent of where the
 * page came from.
 */
export function scaleForBox(box: DigitBox, targetHeight: number): number {
  const height = box.y1 - box.y0;
  if (height <= 0) return MIN_OCR_SCALE;

  return Math.min(MAX_OCR_SCALE, Math.max(MIN_OCR_SCALE, targetHeight / height));
}
