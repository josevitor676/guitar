# Exemplos para testar a importação de tablatura

Arquivos gerados para exercitar o pipeline de importação. `gabarito.json`
traz, para cada arquivo, a lista de notas esperadas no formato
`corda:casa`, na ordem em que devem ser tocadas.

| arquivo | conteúdo | serve para |
| --- | --- | --- |
| `exemplo-1-tercas-repetidas.png` | 3 sistemas, 9 notas cada, padrões repetidos em tercinas, com pauta acima | caso realista denso, parecido com uma folha de estudo |
| `exemplo-2-escala-casas-altas.png` | 1 sistema, casas de dois dígitos (10, 11, 12) | prova que números de dois dígitos são lidos inteiros |
| `exemplo-3-uma-corda-por-sistema.png` | 3 sistemas, só 3 notas cada | caso esparso, que exigiu segmentar os dígitos antes do OCR |
| `exemplo-4-foto-inclinada.jpg` | mesma folha girada 1,6°, fundo amarelado, ruído e compressão JPEG | caso difícil de propósito: foto de celular, endireitada antes da leitura |
| `exemplo-5-duas-paginas.pdf` | PDF de 2 páginas, 1 sistema por página, 4 notas cada | prova o caminho do pdf.js e a concatenação de páginas |
| `exemplo-6-hammer-pull.png` | `3h5`, `7p5` em duas cordas | hammer-on e pull-off |
| `exemplo-7-slide-bend.png` | `5/9`, `9\5`, `7b9`, `5b7` | slide nos dois sentidos e bend |
| `exemplo-8-tecnicas-misturadas.png` | as quatro técnicas em dois sistemas | leitura de técnicas diferentes na mesma folha |
| `exemplo-9-tecnicas.pdf` | PDF de 2 páginas com ligaduras e glissandos | técnicas sobrevivendo à rasterização do PDF |
| `exemplo-10-oitavos-repetidos.png` | blocos de `5-5-5` na mesma casa, mudando de corda | a mesma casa tocada três vezes seguidas |
| `exemplo-11-alternancia.png` | `7-5-7-5-7` e `9-7-5-7-9` | duas notas revezando, cada uma repetida no compasso |
| `exemplo-12-celula-repetida.pdf` | PDF de 2 páginas, célula de 3 notas girando 3 vezes | repetição atravessando a rasterização e a junção de páginas |
| `exemplo-13-corda-solta.png` | arpejo que abre na corda ré solta, cheio de casas 6 | corda solta (casa 0) sobrevivendo à leitura |
| `exemplo-14-corda-solta.pdf` | o mesmo em PDF de 2 páginas | corda solta atravessando a rasterização |
| `exemplo-15-todos-os-digitos.png` | 0 a 12, mais 16 e três 6 | todo dígito que existe numa tablatura, de uma vez |

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
| exemplo-4 | 6 | 6 | 100% |
| exemplo-5 | 8 | 8 | 100% |
| exemplo-6 | 8 | 8 | 100% |
| exemplo-7 | 8 | 8 | 100% |
| exemplo-8 | 12 | 12 | 100% |
| exemplo-9 | 8 | 8 | 100% |
| exemplo-10 | 18 | 18 | 100% |
| exemplo-11 | 12 | 12 | 100% |
| exemplo-12 | 18 | 18 | 100% |
| exemplo-13 | 16 | 16 | 100% |
| exemplo-14 | 16 | 16 | 100% |
| exemplo-15 | 18 | 18 | 100% |

Nos exemplos 6 a 9 a conferência inclui a **articulação**, não só corda e casa:
um `7b9` só conta como acerto se voltar como bend, e não como hammer-on.

Todas as doze saem completas e na ordem certa, inclusive a foto inclinada —
que durante um bom tempo foi a única a falhar, e por um motivo concreto: a
detecção procura linhas horizontais escuras, e a inclinação as dissolve. Ver
"Páginas tortas" abaixo.

Para refazer a medição, gere os arquivos e rode o app contra eles comparando
com `gabarito.json`.

## Notas repetidas

Os exemplos 10 a 12 existem por um motivo específico: até eles, nenhuma folha
tocava a **mesma corda e casa** mais de uma vez, então uma leitura que
descartasse repetições silenciosamente ainda pontuaria 100%. A conferência é
por posição na sequência, não por conjunto — `5 5 5` só conta como certo
quando voltam três notas, não uma.

## Como regerar

`gerador/gerar-exemplos.mjs` desenha as folhas e as fotografa, e atualiza
`gabarito.json` com as notas esperadas de cada uma. Precisa do Playwright e do
pdf-lib, que não são dependências do app:

```
npm i -D playwright pdf-lib && npx playwright install chromium
node exemplos/gerador/gerar-exemplos.mjs
```

Só os exemplos 10 a 12 saem dele; os anteriores foram gerados antes de o
script existir e estão versionados como estão.

## Páginas tortas

Nenhuma foto sai quadrada com a câmera. O detector de linhas procura tinta que
corre ao longo de uma fileira de pixels, e **um grau e meio de inclinação já
espalha cada linha por várias fileiras** — o bastante para ele não achar
tablatura nenhuma, que é por que o `exemplo-4` marcava 0%.

Antes de qualquer medição, a página é endireitada: a leitura procura, entre
−4° e +4°, o ângulo em que a tinta se concentra no menor número de fileiras, e
gira a folha de volta. Uma página já reta mede exatamente zero e não é girada,
porque toda rotação custa um pouco de nitidez.

## A fonte das folhas

Os dígitos não são todos iguais aos olhos do leitor. Medido nestas folhas, com
o mesmo `6` desenhado em cinco tipografias:

| fonte | leu o 6 como |
| --- | --- |
| DejaVu Sans | `3` |
| DejaVu Serif | `5` |
| Ubuntu | `6` |
| Ubuntu Mono | `6` |
| DejaVu Sans Mono | `6` |

Não é espaçamento nem densidade — testei as duas coisas, e o erro não se move.
Também não é o modo do OCR: `SINGLE_CHAR` piora, perde marcas inteiras.

O gerador desenhava em DejaVu Sans, então **as folhas geradas tinham um 6 que
o app não conseguia ler** — e, como quase nenhuma delas usava a casa 6, isso
passou despercebido. Agora ele desenha numa fonte cujos dígitos leem limpo, e
o `exemplo-15` carrega todos os dígitos justamente para que uma fonte ruim não
volte a entrar sem ninguém notar.
