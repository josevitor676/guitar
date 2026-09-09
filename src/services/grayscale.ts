import type { GrayImage } from '../domain/import/image.types';

/** Rec. 601 luma coefficients: the eye reads green as most of an image's brightness. */
const RED_WEIGHT = 0.299;
const GREEN_WEIGHT = 0.587;
const BLUE_WEIGHT = 0.114;

/** Flattens canvas RGBA down to the single channel the line detector reads. */
export function toGrayImage(imageData: ImageData): GrayImage {
  const { data, width, height } = imageData;
  const gray = new Uint8ClampedArray(width * height);

  for (let i = 0; i < gray.length; i += 1) {
    const offset = i * 4;
    gray[i] = Math.round(
      data[offset] * RED_WEIGHT + data[offset + 1] * GREEN_WEIGHT + data[offset + 2] * BLUE_WEIGHT,
    );
  }

  return { data: gray, width, height };
}
