import type { Exercise } from './exercise.types';
import type { StringNumber } from '../music-theory/tuning';
import type { Articulation } from '../music-theory/articulation';
import { STANDARD_TUNING } from '../music-theory/tuning';
import { SCALE_PATTERNS, ARPEGGIO_PATTERNS, generatePositionsForPattern } from '../music-theory/scales-arpeggios';

/**
 * Builds a drill that repeats one two-note figure across several strings.
 *
 * Every technique exercise below has the same shape — pick a note, reach the
 * next one with the technique, move to the next string — because that is how
 * these are practised: one movement, repeated, until the hand owns it.
 */
function acrossStrings(
  strings: StringNumber[],
  from: number,
  to: number,
  articulation: Articulation,
) {
  return strings.flatMap((string) => [
    { string, fret: from },
    { string, fret: to, articulation },
  ]);
}

/** Plays a figure over and over, which is what makes a riff a riff. */
function times(count: number, figure: { string: StringNumber; fret: number }[]) {
  return Array.from({ length: count }, () => figure).flat();
}

/** The same spot struck several times running, as a palm-muted pulse is. */
function struck(string: StringNumber, fret: number, count: number) {
  return Array.from({ length: count }, () => ({ string, fret }));
}

const LOW_TO_HIGH: StringNumber[] = [6, 5, 4, 3, 2, 1];
const HIGH_TO_LOW: StringNumber[] = [1, 2, 3, 4, 5, 6];

export const EXERCISE_CATALOG: Exercise[] = [
  {
    id: 'warmup-1234-low-e',
    name: 'Aquecimento 1-2-3-4 (corda 6)',
    category: 'aquecimento',
    positions: [
      { string: 6, fret: 1 },
      { string: 6, fret: 2 },
      { string: 6, fret: 3 },
      { string: 6, fret: 4 },
    ],
  },
  {
    id: 'fingering-diagonal-6-4',
    name: 'Digitação diagonal (corda 6 à 4)',
    category: 'digitacao',
    positions: [
      { string: 6, fret: 1 },
      { string: 5, fret: 2 },
      { string: 4, fret: 3 },
    ],
  },
  {
    id: 'scale-c-major-open-position',
    name: 'Escala Maior de Dó (posição aberta)',
    category: 'escala',
    positions: generatePositionsForPattern(STANDARD_TUNING, 'C', SCALE_PATTERNS.major, {
      minFret: 1,
      maxFret: 4,
    }),
  },
  {
    id: 'arpeggio-c-major-open-position',
    name: 'Arpejo Maior de Dó (posição aberta)',
    category: 'arpejo',
    positions: generatePositionsForPattern(STANDARD_TUNING, 'C', ARPEGGIO_PATTERNS.majorTriad, {
      minFret: 1,
      maxFret: 4,
    }),
  },
  {
    id: 'technique-hammer-on-ladder',
    name: 'Hammer-on em todas as cordas',
    category: 'tecnica',
    howTo:
      'Hammer-on é ligar duas notas subindo sem palhetar a segunda. Palhete a casa 5 com o ' +
      'indicador e, com a nota ainda soando, bata o dedo anelar na casa 7 com força e perto do ' +
      'traste. O som da segunda nota vem da batida do dedo, não da palheta. Mantenha o indicador ' +
      'apoiado na casa 5 o tempo todo.',
    // Pick the 5th fret, hammer the 7th with the ring finger, string by string.
    positions: acrossStrings(LOW_TO_HIGH, 5, 7, 'hammerOn'),
  },
  {
    id: 'technique-pull-off-ladder',
    name: 'Pull-off em todas as cordas',
    category: 'tecnica',
    howTo:
      'Pull-off é o caminho de volta: ligar duas notas descendo sem palhetar a segunda. Prenda as ' +
      'duas casas antes de tocar — indicador na 5, anelar na 7 — palhete a casa 7 e então puxe o ' +
      'anelar para o lado, arranhando a corda de leve ao sair. Se você só levantar o dedo, a nota ' +
      'da casa 5 sai fraca ou não sai.',
    // The mirror of the hammer drill: fret both notes, pick the 7th, pull to the 5th.
    positions: acrossStrings(HIGH_TO_LOW, 7, 5, 'pullOff'),
  },
  {
    id: 'technique-slide-shift',
    name: 'Slide subindo e descendo o braço',
    category: 'tecnica',
    howTo:
      'Slide é arrastar o dedo pela corda de uma casa até outra, sem soltar a pressão. Palhete a ' +
      'casa 5 e deslize o mesmo dedo até a 9 mantendo o peso na corda; só a primeira nota é ' +
      'palhetada. Chegue na casa certa e pare — se aliviar a pressão no meio do caminho o som ' +
      'morre antes de chegar.',
    // Long shifts, which is what a slide is for: it carries the hand to a new position.
    positions: [
      { string: 3, fret: 5 },
      { string: 3, fret: 9, articulation: 'slide' },
      { string: 3, fret: 9 },
      { string: 3, fret: 5, articulation: 'slide' },
      { string: 2, fret: 7 },
      { string: 2, fret: 12, articulation: 'slide' },
      { string: 2, fret: 12 },
      { string: 2, fret: 7, articulation: 'slide' },
    ],
  },
  {
    id: 'technique-whole-step-bend',
    name: 'Bend de um tom nas cordas agudas',
    category: 'tecnica',
    howTo:
      'Bend é empurrar a corda para o lado para subir a afinação sem mudar de casa. Prenda a casa ' +
      '8 com o anelar, apoie o médio e o indicador atrás dele, e gire o pulso para empurrar a ' +
      'corda em direção ao teto. Duas casas de bend é um tom: toque antes a casa 10 para ouvir o ' +
      'alvo, e empurre até chegar exatamente nela. A força vem do pulso, não dos dedos.',
    // Two frets is a whole step, bent on the strings where bends actually live.
    positions: [
      { string: 2, fret: 8 },
      { string: 2, fret: 10, articulation: 'bend' },
      { string: 1, fret: 7 },
      { string: 1, fret: 9, articulation: 'bend' },
      { string: 2, fret: 10 },
      { string: 2, fret: 12, articulation: 'bend' },
      { string: 1, fret: 9 },
      { string: 1, fret: 11, articulation: 'bend' },
    ],
  },
  {
    id: 'repeat-ode-to-joy',
    name: 'Ode à Alegria (tema)',
    category: 'repeticao',
    howTo:
      'Melodia de Beethoven, em domínio público, escolhida porque quase toda frase dela repete a ' +
      'nota anterior: mi-mi, sol-sol, dó-dó, ré-ré. Toque devagar e conte — o erro comum é comer ' +
      'a segunda de cada par, e é exatamente isso que a linha do tempo deixa visível.',
    positions: [
      { string: 2, fret: 5 },
      { string: 2, fret: 5 },
      { string: 2, fret: 6 },
      { string: 2, fret: 8 },
      { string: 2, fret: 8 },
      { string: 2, fret: 6 },
      { string: 2, fret: 5 },
      { string: 3, fret: 7 },
      { string: 3, fret: 5 },
      { string: 3, fret: 5 },
      { string: 3, fret: 7 },
      { string: 2, fret: 5 },
      { string: 2, fret: 5 },
      { string: 3, fret: 7 },
      { string: 3, fret: 7 },
    ],
  },
  {
    id: 'repeat-happy-birthday',
    name: 'Parabéns pra Você',
    category: 'repeticao',
    howTo:
      'A melodia mais repetida do mundo, e também em domínio público. As três primeiras frases ' +
      'começam com a mesma nota tocada duas vezes, e o "fa-fa" do fim faz o mesmo. Serve para ' +
      'conferir que notas repetidas sobrevivem a salvar e recarregar o exercício.',
    positions: [
      { string: 4, fret: 5 },
      { string: 4, fret: 5 },
      { string: 4, fret: 7 },
      { string: 4, fret: 5 },
      { string: 3, fret: 5 },
      { string: 3, fret: 4 },
      { string: 4, fret: 5 },
      { string: 4, fret: 5 },
      { string: 4, fret: 7 },
      { string: 4, fret: 5 },
      { string: 3, fret: 7 },
      { string: 3, fret: 5 },
      { string: 4, fret: 5 },
      { string: 4, fret: 5 },
      { string: 2, fret: 8 },
      { string: 2, fret: 5 },
      { string: 3, fret: 5 },
      { string: 3, fret: 4 },
      { string: 4, fret: 7 },
      { string: 2, fret: 6 },
      { string: 2, fret: 6 },
      { string: 2, fret: 5 },
      { string: 3, fret: 5 },
      { string: 3, fret: 7 },
      { string: 3, fret: 5 },
    ],
  },
  {
    id: 'repeat-frere-jacques',
    name: 'Frei João (Frère Jacques)',
    category: 'repeticao',
    howTo:
      'Canção tradicional em que cada frase é tocada duas vezes seguidas — a repetição não é de ' +
      'uma nota, é do trecho inteiro. Bom para conferir que a sequência não é reordenada nem ' +
      'reduzida: são 32 notas, e nenhuma pode sumir.',
    positions: [
      { string: 3, fret: 5 },
      { string: 3, fret: 7 },
      { string: 2, fret: 5 },
      { string: 3, fret: 5 },
      { string: 3, fret: 5 },
      { string: 3, fret: 7 },
      { string: 2, fret: 5 },
      { string: 3, fret: 5 },
      { string: 2, fret: 5 },
      { string: 2, fret: 6 },
      { string: 2, fret: 8 },
      { string: 2, fret: 5 },
      { string: 2, fret: 6 },
      { string: 2, fret: 8 },
      { string: 2, fret: 8 },
      { string: 2, fret: 10 },
      { string: 2, fret: 8 },
      { string: 2, fret: 6 },
      { string: 2, fret: 5 },
      { string: 3, fret: 5 },
      { string: 2, fret: 8 },
      { string: 2, fret: 10 },
      { string: 2, fret: 8 },
      { string: 2, fret: 6 },
      { string: 2, fret: 5 },
      { string: 3, fret: 5 },
      { string: 3, fret: 5 },
      { string: 4, fret: 5 },
      { string: 3, fret: 5 },
      { string: 3, fret: 5 },
      { string: 4, fret: 5 },
      { string: 3, fret: 5 },
    ],
  },
  {
    id: 'repeat-pedal-note',
    name: 'Nota pedal na corda 6',
    category: 'repeticao',
    howTo:
      'O recurso mais comum do rock: uma nota grave repetida sem parar enquanto outra nota sobe ' +
      'por cima dela. Aqui o pedal é a casa 5 da corda 6, batida duas vezes antes de cada nota ' +
      'nova. Palhete tudo para baixo e mantenha o pulso constante — o pedal é o tempo.',
    positions: [
      ...times(1, [...struck(6, 5, 2), { string: 6, fret: 7 }]),
      ...times(1, [...struck(6, 5, 2), { string: 6, fret: 8 }]),
      ...times(1, [...struck(6, 5, 2), { string: 6, fret: 10 }]),
      ...times(1, [...struck(6, 5, 2), { string: 6, fret: 8 }]),
    ],
  },
  {
    id: 'repeat-blues-shuffle',
    name: 'Shuffle de blues em Lá',
    category: 'repeticao',
    howTo:
      'A levada de blues: a nota grave volta antes de cada mudança, então ela aparece oito vezes ' +
      'em cada compasso. Toque com os dedos indicador e anelar, sem tirar o indicador da casa. As ' +
      'quatro últimas repetem as quatro primeiras, que é a volta ao acorde inicial.',
    positions: [
      ...times(2, [
        { string: 6, fret: 5 },
        { string: 5, fret: 7 },
        { string: 6, fret: 5 },
        { string: 5, fret: 9 },
      ]),
      ...times(2, [
        { string: 5, fret: 5 },
        { string: 4, fret: 7 },
        { string: 5, fret: 5 },
        { string: 4, fret: 9 },
      ]),
      ...times(2, [
        { string: 6, fret: 5 },
        { string: 5, fret: 7 },
        { string: 6, fret: 5 },
        { string: 5, fret: 9 },
      ]),
    ],
  },
  {
    id: 'repeat-palm-mute-eighths',
    name: 'Oitavos abafados na mesma casa',
    category: 'repeticao',
    howTo:
      'Três batidas na mesma casa antes de mudar de corda, que é o padrão de acompanhamento mais ' +
      'usado no rock. Apoie a lateral da mão direita junto ao cavalete para abafar, e palhete ' +
      'tudo para baixo. Se as três soarem como uma só, a mão direita está atrasando.',
    positions: [
      ...struck(6, 5, 3),
      ...struck(5, 5, 3),
      ...struck(4, 5, 3),
      ...struck(3, 5, 3),
      ...struck(4, 5, 3),
      ...struck(5, 5, 3),
    ],
  },
  {
    id: 'repeat-alternating-two-notes',
    name: 'Alternância 7-5-7-5-7',
    category: 'repeticao',
    howTo:
      'Duas notas revezando, cada uma tocada três vezes no compasso. É o padrão que mais quebra ' +
      'um editor de sequência: sem repetição, ele vira apenas "7 e 5". Suba a posição a cada ' +
      'compasso mantendo a mesma digitação — indicador e anelar.',
    positions: [
      { string: 2, fret: 4 },
      ...times(1, [
        { string: 2, fret: 7 },
        { string: 2, fret: 5 },
        { string: 2, fret: 7 },
        { string: 2, fret: 5 },
        { string: 2, fret: 7 },
      ]),
      { string: 2, fret: 5 },
      ...times(1, [
        { string: 2, fret: 9 },
        { string: 2, fret: 7 },
        { string: 2, fret: 5 },
        { string: 2, fret: 7 },
        { string: 2, fret: 9 },
      ]),
      { string: 2, fret: 7 },
      ...times(1, [
        { string: 2, fret: 10 },
        { string: 2, fret: 9 },
        { string: 2, fret: 7 },
        { string: 2, fret: 9 },
        { string: 2, fret: 10 },
      ]),
    ],
  },
  {
    id: 'repeat-three-note-cell',
    name: 'Célula 3-5-7 repetida',
    category: 'repeticao',
    howTo:
      'A mesma célula de três notas girando quatro vezes antes de mudar de corda. É assim que se ' +
      'constrói velocidade: o padrão não muda, só o número de voltas. Palhete alternado, e conte ' +
      'as voltas em voz alta para não perder o lugar.',
    positions: [
      ...times(4, [
        { string: 6, fret: 3 },
        { string: 6, fret: 5 },
        { string: 6, fret: 7 },
      ]),
      ...times(4, [
        { string: 5, fret: 4 },
        { string: 5, fret: 5 },
        { string: 5, fret: 7 },
      ]),
      ...times(4, [
        { string: 4, fret: 5 },
        { string: 4, fret: 7 },
        { string: 4, fret: 8 },
      ]),
    ],
  },
];
