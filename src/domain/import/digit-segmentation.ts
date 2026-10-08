import type { GrayImage, TabSystem } from './image.types';

const DARK_THRESHOLD = 128;
/** How far from a line's center its own ink reaches, in pixels. */
const LINE_HALF_THICKNESS = 2;
/** A digit is roughly this tall relative to the spacing between strings. */
const MIN_HEIGHT_RATIO = 0.2;
const MAX_HEIGHT_RATIO = 1.1;
const MIN_WIDTH_RATIO = 0.08;
const MAX_WIDTH_RATIO = 1.2;
/**
 * Marks closer than this, as a fraction of a digit's height, are two digits of
 * one number. Measuring the gap against the digit rather than against the
 * spacing between strings is what keeps it right on both a cramped sheet and a
 * generous one: the strings can be far apart while the numbers are small.
 */
const JOIN_GAP_OF_HEIGHT = 0.5;
/**
 * A fret number is centered on its string, within this fraction of a spacing.
 * Ornaments drawn above the tablature — a bend arrow, a "FULL" label — are not.
 */
const ON_LINE_RATIO = 0.22;
/** How far a fret number's height may stray from the other numbers' on the page. */
const MIN_HEIGHT_OF_MEDIAN = 0.6;
const MAX_HEIGHT_OF_MEDIAN = 1.45;
/** Two halves of a severed digit overlap horizontally by at least this much. */
const STITCH_OVERLAP_RATIO = 0.5;
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
 *
 * That per-column test is not enough on its own. Engraved tablature interrupts
 * the string where a number sits, and inside that gap the only ink on the row
 * is the number's own stroke. Where the stroke runs horizontally for a few
 * pixels — the waist of a 2, the middle of a 3 — no ink lies directly over or
 * under it, and the column test erases it, splitting the digit in half. So a
 * short run of ink on the row, short enough that it cannot be the string, is
 * kept whole as soon as any part of it continues above or below.
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
function joinAdjacent(boxes: DigitBox[], maxGap: number): DigitBox[] {
  const joined: DigitBox[] = [];

  for (const box of boxes) {
    const previous = joined[joined.length - 1];
    const closeEnough = previous && box.x0 - previous.x1 <= maxGap;

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
/**
 * Sews back together a digit the string cut in half.
 *
 * Erasing a string leaves behind whatever ink visibly crosses it, column by
 * column. Where a glyph's own stroke runs flat along the string — the waist of
 * a 2, the middle of a 3 — no ink lies directly above or below it, so those
 * columns go with the string and the digit falls into an upper and a lower
 * piece. Each piece is half-height, which is exactly what an ornament looks
 * like, so they have to be rejoined before anything is thrown away.
 *
 * Two pieces belong together when one sits above a string and the other below
 * that same string, at the same place along it.
 */
function stitchAcrossLines(boxes: DigitBox[], system: TabSystem): DigitBox[] {
  const stitched: DigitBox[] = [];

  for (const box of boxes) {
    const partner = stitched.find((other) => {
      const overlap = Math.min(other.x1, box.x1) - Math.max(other.x0, box.x0);
      const narrower = Math.min(other.x1 - other.x0, box.x1 - box.x0);
      if (overlap < narrower * STITCH_OVERLAP_RATIO) return false;

      const [upper, lower] = other.y0 <= box.y0 ? [other, box] : [box, other];
      if (lower.y0 - upper.y1 > LINE_HALF_THICKNESS * 2 + 2) return false;
      return system.lineYs.some((lineY) => upper.y1 <= lineY + LINE_HALF_THICKNESS && lineY <= lower.y0 + LINE_HALF_THICKNESS);
    });

    if (partner) {
      partner.x0 = Math.min(partner.x0, box.x0);
      partner.x1 = Math.max(partner.x1, box.x1);
      partner.y0 = Math.min(partner.y0, box.y0);
      partner.y1 = Math.max(partner.y1, box.y1);
      continue;
    }

    stitched.push({ ...box });
  }

  return stitched;
}

/** How far a box's middle sits from the nearest string. */
function distanceToNearestLine(box: DigitBox, system: TabSystem): number {
  const center = (box.y0 + box.y1) / 2;
  return Math.min(...system.lineYs.map((lineY) => Math.abs(lineY - center)));
}

/**
 * Drops everything that is not a fret number.
 *
 * Tablature found in the wild draws its techniques as pictures rather than as
 * letters: a slide is a slanted line between two numbers, a bend is a curved
 * arrow arching above the staff with a "½" or "FULL" beside it. Each of those
 * is ink inside the system, so each used to be cropped and handed to the OCR,
 * which dutifully reported a digit for it — one imported sheet came back as a
 * wall of 1s.
 *
 * Two things tell a fret number from a drawing. It sits centered on a string,
 * where an arrow and its label arch above. And it is the same height as the
 * other numbers on the page, where a slide's line is a flat sliver. The height
 * to compare against is measured from the boxes sitting on a string, since
 * those are overwhelmingly the numbers.
 */
function onlyFretNumbers(
  boxes: DigitBox[],
  system: TabSystem,
  spacing: number,
): { kept: DigitBox[]; digitHeight: number } {
  const onLine = boxes.filter((box) => distanceToNearestLine(box, system) <= spacing * ON_LINE_RATIO);
  if (onLine.length === 0) return { kept: boxes, digitHeight: spacing };

  const heights = onLine.map((box) => box.y1 - box.y0).sort((a, b) => a - b);
  const digitHeight = heights[Math.floor(heights.length / 2)];

  const kept = onLine.filter((box) => {
    const boxHeight = box.y1 - box.y0;
    return (
      boxHeight >= digitHeight * MIN_HEIGHT_OF_MEDIAN && boxHeight <= digitHeight * MAX_HEIGHT_OF_MEDIAN
    );
  });

  return { kept, digitHeight };
}

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
  const { kept, digitHeight } = onlyFretNumbers(stitchAcrossLines(plausible, system), system, spacing);
  return joinAdjacent(kept, digitHeight * JOIN_GAP_OF_HEIGHT);
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

/** Whether two boxes sit on the same line of tablature. */
export function boxesShareRow(a: DigitBox, b: DigitBox): boolean {
  return Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0;
}

/**
 * The smallest box containing all of them.
 *
 * Used to re-read a mark together with its neighbours: Tesseract cannot
 * classify a lone slur letter — a bare "p" comes back as a quote mark or as
 * nothing — but reads it reliably inside a word like "7p5", where the digits
 * either side give it a baseline and a size to measure against.
 */
export function mergeBoxes(boxes: DigitBox[]): DigitBox {
  return {
    x0: Math.min(...boxes.map((box) => box.x0)),
    y0: Math.min(...boxes.map((box) => box.y0)),
    x1: Math.max(...boxes.map((box) => box.x1)),
    y1: Math.max(...boxes.map((box) => box.y1)),
  };
}
