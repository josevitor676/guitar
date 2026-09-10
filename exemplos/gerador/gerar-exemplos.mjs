/*
 * Draws tablature sheets as HTML and photographs them, which is how every
 * fixture in this folder was made. Kept in the repository so a sheet can be
 * regenerated or a new one added without reverse-engineering the layout.
 *
 * Needs Playwright, which is not a dependency of the app:
 *   npm i -D playwright && npx playwright install chromium
 *   node exemplos/gerador/gerar-exemplos.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Six evenly spaced lines is what marks a system as tablature rather than staff. */
const STRING_COUNT = 6;
const LINE_GAP = 26;
const NOTE_GAP = 54;
const LEFT_PAD = 104;

/** A note as `corda:casa`, the same shape the ground truth uses. */
const note = (string, fret) => ({ string, fret });
const times = (count, figure) => Array.from({ length: count }, () => figure).flat();
const struck = (string, fret, count) => Array.from({ length: count }, () => note(string, fret));

function systemHtml(notes) {
  const width = LEFT_PAD + notes.length * NOTE_GAP + 40;
  const tabHeight = (STRING_COUNT - 1) * LINE_GAP;

  // A five-line staff above the tablature, exactly as a study sheet prints it.
  // It must be ignored by the reader, so every sheet carries one.
  const staff = Array.from(
    { length: 5 },
    (_, i) => `<line x1="12" y1="${16 + i * LINE_GAP}" x2="${width - 12}" y2="${16 + i * LINE_GAP}"
                     stroke="#111" stroke-width="1.1" />`,
  ).join('');

  const staffBottom = 16 + 4 * LINE_GAP;
  const tabTop = staffBottom + 58;

  const lines = Array.from(
    { length: STRING_COUNT },
    (_, i) => `<line x1="12" y1="${tabTop + i * LINE_GAP}" x2="${width - 12}" y2="${tabTop + i * LINE_GAP}"
                     stroke="#111" stroke-width="1.1" />`,
  ).join('');

  const digits = notes
    .map((n, index) => {
      const y = tabTop + (n.string - 1) * LINE_GAP;
      const x = LEFT_PAD + index * NOTE_GAP;
      const text = String(n.fret);
      // The line is erased behind the digit, which is how printed tablature does it.
      const halfWidth = text.length * 9 + 4;
      return `<rect x="${x - halfWidth}" y="${y - 13}" width="${halfWidth * 2}" height="26" fill="#fff" />
              <text x="${x}" y="${y + 9}" text-anchor="middle"
                    font-family="DejaVu Sans, Arial, sans-serif" font-size="26" fill="#111">${text}</text>`;
    })
    .join('');

  return `<svg width="${width}" height="${tabTop + tabHeight + 30}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#fff" />
    ${staff}
    <text x="${width / 2}" y="${staffBottom + 26}" text-anchor="middle"
          font-family="DejaVu Sans" font-size="13" fill="#111" font-style="italic">mf  sim.</text>
    ${lines}
    <text x="22" y="${tabTop + LINE_GAP * 1.2}" font-family="DejaVu Sans" font-size="17" fill="#111">T</text>
    <text x="22" y="${tabTop + LINE_GAP * 2.5}" font-family="DejaVu Sans" font-size="17" fill="#111">A</text>
    <text x="22" y="${tabTop + LINE_GAP * 3.8}" font-family="DejaVu Sans" font-size="17" fill="#111">B</text>
    ${digits}
  </svg>`;
}

function pageHtml(systems) {
  return `<body style="margin:0;background:#fff">
    <div id="folha" style="display:inline-block;padding:24px;background:#fff">
      ${systems.map((notes) => `<div style="margin-bottom:34px">${systemHtml(notes)}</div>`).join('')}
    </div>
  </body>`;
}

const SHEETS = [
  {
    file: 'exemplo-10-oitavos-repetidos.png',
    systems: [
      [...struck(6, 5, 3), ...struck(5, 5, 3), ...struck(4, 5, 3)],
      [...struck(3, 5, 3), ...struck(4, 5, 3), ...struck(5, 5, 3)],
    ],
  },
  {
    file: 'exemplo-11-alternancia.png',
    systems: [
      [note(2, 4), ...times(2, [note(2, 7), note(2, 5)]), note(2, 7)],
      [note(2, 5), note(2, 9), note(2, 7), note(2, 5), note(2, 7), note(2, 9)],
    ],
  },
  {
    file: 'exemplo-12-celula-repetida.pdf',
    pdf: true,
    systems: [
      times(3, [note(6, 3), note(6, 5), note(6, 7)]),
      times(3, [note(5, 4), note(5, 5), note(5, 7)]),
    ],
  },
];

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await (await browser.newContext({ deviceScaleFactor: 2 })).newPage();
const truth = [];

for (const sheet of SHEETS) {
  await page.setContent(pageHtml(sheet.systems));
  const expected = sheet.systems.flat().map((n) => `${n.string}:${n.fret}`);

  if (sheet.pdf) {
    // One system per page, so the fixture also proves pages are concatenated.
    const pages = [];
    for (const notes of sheet.systems) {
      {
        await page.setContent(pageHtml([notes]));
        // The page has to be taller than the sheet: a system whose lowest
        // line falls off the bottom stops being six evenly spaced lines, and
        // the reader then finds no tablature at all.
        const box = await page.locator('#folha').boundingBox();
        pages.push(
          await page.pdf({
            width: `${Math.ceil(box.width) + 40}px`,
            height: `${Math.ceil(box.height) + 40}px`,
            printBackground: true,
          }),
        );
      }
    }
    const { PDFDocument } = await import('pdf-lib');
    const merged = await PDFDocument.create();
    for (const bytes of pages) {
      const src = await PDFDocument.load(bytes);
      const [copied] = await merged.copyPages(src, [0]);
      merged.addPage(copied);
    }
    writeFileSync(join(OUT, sheet.file), await merged.save());
  } else {
    writeFileSync(join(OUT, sheet.file), await page.locator('#folha').screenshot());
  }

  truth.push({ file: sheet.file, expected });
  console.log(sheet.file, expected.length, 'notas');
}

// The ground truth lives in one file for every fixture, so a regenerated sheet
// and its expected notes can never drift apart.
const gabaritoPath = join(OUT, 'gabarito.json');
const gabarito = JSON.parse(readFileSync(gabaritoPath, 'utf8'));
for (const entry of truth) {
  const existing = gabarito.find((item) => item.file === entry.file);
  if (existing) existing.expected = entry.expected;
  else gabarito.push(entry);
}
writeFileSync(gabaritoPath, `${JSON.stringify(gabarito, null, 2)}\n`);
await browser.close();
