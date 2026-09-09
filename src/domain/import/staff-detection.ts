import type { GrayImage, TabSystem } from './image.types';

const DARK_THRESHOLD = 128;
/** A staff line runs nearly the full width; note heads and text do not. */
const MIN_DARK_FRACTION = 0.5;
/** Rasterized PDFs and photos distort line spacing, so the tolerance is generous. */
const SPACING_TOLERANCE = 0.35;
const LINES_PER_TAB_SYSTEM = 6;

function darkFractionPerRow(image: GrayImage): number[] {
  const { data, width, height } = image;
  const fractions: number[] = [];

  for (let y = 0; y < height; y += 1) {
    let dark = 0;
    const rowStart = y * width;
    for (let x = 0; x < width; x += 1) {
      if (data[rowStart + x] < DARK_THRESHOLD) dark += 1;
    }
    fractions.push(dark / width);
  }

  return fractions;
}

/**
 * Collapses each run of adjacent dark rows into its center, so a printed line
 * two or three pixels thick is reported once rather than three times.
 */
function candidateLineYs(fractions: number[]): number[] {
  const lines: number[] = [];
  let runStart: number | null = null;

  for (let y = 0; y <= fractions.length; y += 1) {
    const isLine = y < fractions.length && fractions[y] >= MIN_DARK_FRACTION;

    if (isLine && runStart === null) {
      runStart = y;
    } else if (!isLine && runStart !== null) {
      lines.push(Math.floor((runStart + y - 1) / 2));
      runStart = null;
    }
  }

  return lines;
}

function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Splits the candidates wherever the gap breaks from the run's own spacing. */
function groupByEvenSpacing(lineYs: number[]): number[][] {
  if (lineYs.length < 2) return lineYs.length === 1 ? [lineYs] : [];

  const groups: number[][] = [];
  let current = [lineYs[0]];
  let currentGap: number | null = null;

  for (let i = 1; i < lineYs.length; i += 1) {
    const gap = lineYs[i] - lineYs[i - 1];
    const fitsRun = currentGap === null || Math.abs(gap - currentGap) <= currentGap * SPACING_TOLERANCE;

    if (fitsRun) {
      current.push(lineYs[i]);
      currentGap = currentGap === null ? gap : medianOf([currentGap, gap]);
    } else {
      groups.push(current);
      current = [lineYs[i - 1], lineYs[i]];
      currentGap = gap;
    }
  }

  groups.push(current);
  return groups;
}

/**
 * Finds the tablature systems on a page, ignoring the musical staff.
 *
 * The staff has five lines and the tablature has six, so requiring exactly six
 * evenly spaced lines is what separates them — which is why the notation can be
 * ignored without ever reading it.
 */
export function detectTabSystems(image: GrayImage): TabSystem[] {
  const candidates = candidateLineYs(darkFractionPerRow(image));

  return groupByEvenSpacing(candidates)
    .filter((group) => group.length === LINES_PER_TAB_SYSTEM)
    .map((lineYs) => {
      const spacing = medianOf(lineYs.slice(1).map((y, i) => y - lineYs[i]));
      // Engravers center a fret number slightly off its line, so the capture
      // band reaches half a spacing past the outer lines.
      return {
        lineYs,
        top: lineYs[0] - spacing / 2,
        bottom: lineYs[lineYs.length - 1] + spacing / 2,
      };
    });
}
