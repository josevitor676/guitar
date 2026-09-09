# Hammer-on e Pull-off — Design Spec

Data: 2026-09-09
Status: Aprovado para implementação

## 1. Visão Geral

Primeira fatia do suporte a técnicas de expressão. Cobre **hammer-on e
pull-off**, que são as duas que dão para fazer bem com o motor de áudio
atual. Slide e bend exigem variar a altura durante a nota, o que o
`Tone.Sampler` não oferece por nota, e ficam para uma fatia posterior.

Hoje uma tablatura com `3h5` é importada como duas notas palhetadas: as
alturas saem certas e a técnica se perde. Medido, os símbolos `h`, `p`,
`/` e `b` são descartados em silêncio, sem gerar nota fantasma.

Fora de escopo: marcar articulação à mão no braço (só a importação cria),
slide, bend, tapping, vibrato e ligaduras entre cordas diferentes.

## 2. Onde a Articulação Mora

Uma articulação descreve **como uma nota é alcançada a partir da
anterior**, então ela pertence à nota de destino dentro de uma sequência
ordenada:

```ts
export type Articulation = 'hammerOn' | 'pullOff';

export interface FretPosition {
  string: StringNumber;
  fret: number;
  articulation?: Articulation;
}
```

O campo entra em `FretPosition` como opcional, e não num tipo novo de
"nota de sequência", por um motivo prático: `FretPosition` atravessa
stores, biblioteca, timeline e parser, e um tipo novo obrigaria a
reescrever tudo isso de uma vez. É um compromisso consciente — uma
posição usada fora de uma sequência, como as que o gerador de escalas
devolve, carrega um campo que ali não significa nada. `positionsEqual`
continua comparando só corda e casa, então nada que compara posições
muda de comportamento.

## 3. Ordenação e Direção

Uma ligadura liga duas notas **vizinhas na sequência**. Reordenar ou
inverter a sequência mexe nessa vizinhança, e ignorar isso produziria
ligaduras mentirosas.

- **`orderAlongNeck`** (vista Braço) reordena pelo braço e portanto
  **descarta as articulações**: a vizinhança em que elas faziam sentido
  deixou de existir. Na vista Braço um exercício importado toca com todas
  as notas palhetadas.
- **`applyDirection`**:
  - `sixthToFirst` mantém tudo como está.
  - `firstToSixth` inverte a sequência e **troca hammer-on por pull-off**,
    porque ir da casa 3 para a 5 é um hammer-on e voltar da 5 para a 3 é
    um pull-off. A articulação também muda de nota: ela descreve a
    chegada, e na volta quem chega é outra.
  - `roundTrip` faz a ida intacta e a volta com as ligaduras trocadas.
- A primeira nota de qualquer sequência nunca tem articulação: não há
  nota anterior de onde partir.

## 4. Leitura do Arquivo

O OCR hoje usa lista branca só de dígitos, então o recorte de um `h`
volta vazio e é jogado fora. A leitura ganha um **segundo passe**:

1. Passe atual: cada caixa é lida com a lista branca `0123456789`.
2. As caixas que voltaram vazias — e só elas — passam por um segundo
   leitor com a lista branca `hp`.

O segundo passe é separado de propósito. Misturar letras na lista branca
única degrada o reconhecimento dos números, que hoje acerta 100% nas
folhas de exemplo, e os números são o que não pode errar.

No parser, caminhando da esquerda para a direita dentro de um sistema:
uma letra entre dois dígitos **da mesma corda** vira a articulação da
nota seguinte. `h` é hammer-on, `p` é pull-off. Uma letra solta, ou entre
dígitos de cordas diferentes, é descartada — ligadura entre cordas está
fora de escopo e seria mais provável ruído que música.

## 5. Áudio

Uma nota ligada não é palhetada: ela soa porque o dedo bate ou arranca a
corda que já vibra. Com um sampler não há como suprimir o ataque da
amostra, então a aproximação é **tocar a nota ligada com velocidade
reduzida**, o que a deixa mais fraca que a nota palhetada anterior e
produz o contorno dinâmico certo.

`ISequencePlayer` passa a receber uma velocidade por nota, e o sampler a
repassa ao `triggerAttackRelease`. É explicitamente uma aproximação, não
legato de verdade; legato exigiria uma voz que sustenta e muda de altura.

## 6. Interface

Na **linha do tempo**, uma ligadura em arco liga as duas notas, com uma
etiqueta `h` ou `p` no meio, no acento laranja. Na vista **Braço** não
aparece nada, porque ali as articulações foram descartadas.

Na tela de importação, o chip de revisão de uma nota ligada mostra a
articulação, para o aluno conferir o que foi lido.

## 7. Persistência

A biblioteca do aluno valida o campo novo: se presente, precisa ser
`hammerOn` ou `pullOff`, senão o registro é descartado como já acontece
com qualquer campo inválido. Exercícios salvos antes desta versão não têm
o campo e continuam válidos, então não há migração.

## 8. Testes

- `articulation.test.ts` — inversão de hammer-on para pull-off.
- `fretboard-model.test.ts` — `orderAlongNeck` descarta; `applyDirection`
  inverte e troca; a primeira nota nunca tem articulação.
- `tab-parser.test.ts` — `h` e `p` entre dígitos da mesma corda; letra
  solta descartada; letra entre cordas diferentes descartada; letra
  desconhecida descartada.
- `import-pipeline.test.ts` — o segundo passe só recebe as caixas que o
  primeiro não leu.
- `sequence-player.test.ts` — nota ligada sai com velocidade menor.
- `TimelineRoll.test.tsx` — a ligadura é desenhada entre as duas notas
  certas e some quando não há articulação.
- `exercise-library.test.ts` — articulação inválida derruba só o registro.
