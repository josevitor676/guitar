/** Longer than this and some file systems, and most download folders, get unhappy. */
const MAX_STEM = 60;

/**
 * A download name taken from the exercise's own title.
 *
 * Accents are folded rather than kept: the title is the student's, and it
 * belongs on the sheet, but a file called `Célula.pdf` travels badly between a
 * phone, a shared drive and a printer.
 */
export function sheetFileName(title: string, extension: string): string {
  const stem = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_STEM)
    .replace(/-+$/, '');

  return `${stem || 'tablatura'}.${extension}`;
}
