/**
 * The fretboard's fixed measurements, shared by the grid that draws it and the
 * hook that decides how many frets fit. They have to agree, or the neck is
 * measured against numbers it is not drawn with.
 */
export const LABEL_WIDTH_PX = 40;
export const FRET_CELL_WIDTH_PX = 56;
/**
 * The neck and the roll are stacked on the exercises tab, and the two of
 * them plus the transport have to fit a window that is often shorter than
 * it looks — a display scaled to 125% leaves about 740 CSS pixels.
 */
export const ROW_HEIGHT_PX = 28;
