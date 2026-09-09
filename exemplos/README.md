# Exemplos para testar a importação de tablatura

Arquivos gerados para exercitar o pipeline de importação. `gabarito.json`
traz, para cada arquivo, a lista de notas esperadas no formato
`corda:casa`, na ordem em que devem ser tocadas.

| arquivo | conteúdo | serve para |
| --- | --- | --- |
| `exemplo-1-tercas-repetidas.png` | 3 sistemas, 9 notas cada, padrões repetidos em tercinas, com pauta acima | caso realista denso, parecido com uma folha de estudo |
| `exemplo-2-escala-casas-altas.png` | 1 sistema, casas de dois dígitos (10, 11, 12) | prova que números de dois dígitos são lidos inteiros |
| `exemplo-3-uma-corda-por-sistema.png` | 3 sistemas, só 3 notas cada | caso esparso — hoje o OCR não dá conta |
| `exemplo-4-foto-inclinada.jpg` | mesma folha girada 1,6°, fundo amarelado, ruído e compressão JPEG | caso difícil de propósito: foto de celular |
| `exemplo-5-duas-paginas.pdf` | PDF de 2 páginas, 1 sistema por página, 4 notas cada | prova o caminho do pdf.js e a concatenação de páginas |

Todas as folhas trazem **pauta de cinco linhas junto da tablatura**, além de
marcações de quiáltera e dinâmica, justamente para verificar que a notação é
ignorada e só a tablatura é lida.

## Resultado medido

Medição feita com o pipeline real, Tesseract de verdade, comparando contra o
gabarito:

| arquivo | esperadas | extraídas corretas | taxa |
| --- | --- | --- | --- |
| exemplo-1 | 27 | 27 | 100% |
| exemplo-2 | 9 | 9 | 100% |
| exemplo-3 | 9 | 0 | 0% |
| exemplo-4 | 6 | 0 | 0% |
| exemplo-5 | 8 | 1 | 13% |

Os dois primeiros são o caso de uso real — tablatura gravada, limpa e densa.
Os três últimos são limites conhecidos, descritos em
`docs/superpowers/specs/2026-09-09-tab-import-design.md`.
