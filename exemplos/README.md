# Exemplos para testar a importação de tablatura

Arquivos gerados para exercitar o pipeline de importação. `gabarito.json`
traz, para cada arquivo, a lista de notas esperadas no formato
`corda:casa`, na ordem em que devem ser tocadas.

| arquivo | conteúdo | serve para |
| --- | --- | --- |
| `exemplo-1-tercas-repetidas.png` | 3 sistemas, 9 notas cada, padrões repetidos em tercinas, com pauta acima | caso realista denso, parecido com uma folha de estudo |
| `exemplo-2-escala-casas-altas.png` | 1 sistema, casas de dois dígitos (10, 11, 12) | prova que números de dois dígitos são lidos inteiros |
| `exemplo-3-uma-corda-por-sistema.png` | 3 sistemas, só 3 notas cada | caso esparso, que exigiu segmentar os dígitos antes do OCR |
| `exemplo-4-foto-inclinada.jpg` | mesma folha girada 1,6°, fundo amarelado, ruído e compressão JPEG | caso difícil de propósito: foto de celular |
| `exemplo-5-duas-paginas.pdf` | PDF de 2 páginas, 1 sistema por página, 4 notas cada | prova o caminho do pdf.js e a concatenação de páginas |
| `exemplo-6-hammer-pull.png` | `3h5`, `7p5` em duas cordas | hammer-on e pull-off |
| `exemplo-7-slide-bend.png` | `5/9`, `9\5`, `7b9`, `5b7` | slide nos dois sentidos e bend |
| `exemplo-8-tecnicas-misturadas.png` | as quatro técnicas em dois sistemas | leitura de técnicas diferentes na mesma folha |
| `exemplo-9-tecnicas.pdf` | PDF de 2 páginas com ligaduras e glissandos | técnicas sobrevivendo à rasterização do PDF |

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
| exemplo-3 | 9 | 9 | 100% |
| exemplo-4 | 6 | 0 | 0% |
| exemplo-5 | 8 | 8 | 100% |
| exemplo-6 | 8 | 8 | 100% |
| exemplo-7 | 8 | 8 | 100% |
| exemplo-8 | 12 | 12 | 100% |
| exemplo-9 | 8 | 8 | 100% |

Nos exemplos 6 a 9 a conferência inclui a **articulação**, não só corda e casa:
um `7b9` só conta como acerto se voltar como bend, e não como hammer-on.

Tudo que não está girado sai completo e na ordem certa. O único que falha é
o exemplo-4, girado 1,6° de propósito: a detecção depende de linhas
horizontais escuras, e a inclinação as dissolve. Está descrito em
`docs/superpowers/specs/2026-09-09-tab-import-design.md`.

Para refazer a medição, gere os arquivos e rode o app contra eles comparando
com `gabarito.json`.
