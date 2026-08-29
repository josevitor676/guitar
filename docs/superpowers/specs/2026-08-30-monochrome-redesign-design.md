# Monochrome Redesign & Astryx Removal — Design Spec

Data: 2026-08-30 (sessão contínua)
Status: Aprovado para planejamento de implementação
Referências visuais: `imagens/imagem_1.png`, `imagens/imagem_2.png`, `imagens/imagem_3.png`

## 1. Visão Geral

Segundo redesign visual completo do Guitar Teacher: abandona o design
system Astryx (Meta/Gothic) e o menu lateral colapsável em favor de um
visual monocromático (cinza/branco/preto, sem cor de destaque colorida)
com navegação por abas no topo, seguindo fielmente as três imagens de
referência. O fretboard muda de um "braço realista" (gradiente amadeirado,
linhas flutuantes) para uma tabela plana com bordas finas. Nenhuma
funcionalidade nova de rastreamento (streak, tempo de sessão) é
implementada — os elementos das imagens que exigiriam esses dados são
removidos ou simplificados. Este spec também documenta um bug real de
áudio já corrigido nesta mesma sessão (fora do escopo de tarefas deste
plano, mas registrado aqui para contexto).

## 2. Correção de Áudio Já Aplicada (contexto, não faz parte deste plano)

Um bug real foi encontrado e corrigido nesta sessão, fora do fluxo formal
de planejamento (debugging direto): `Tone.Transport` nunca era reiniciado
entre reproduções, então clicar em Play após parar no meio de uma
sequência fazia a nova sequência tocar a partir de onde o transporte
"achava" que estava (baseado em ticks acumulados), não do início. Corrigido
em `src/audio/sequence-player.ts` chamando `Tone.Transport.stop()` (que
zera o contador de ticks do Tone.js) antes de `Tone.Transport.start()` em
cada `play()`. Já commitado antes deste spec.

## 3. Remoção do Astryx

- Desinstalar: `@astryxdesign/core`, `@astryxdesign/theme-gothic`,
  `@stylexjs/stylex`, `@astryxdesign/cli`.
- Manter: `lucide-react` (biblioteca de ícones simples, não um design
  system — usada para os ícones de play, alto-falante, reiniciar, etc).
- Remover: `src/components/layout/AppSidebar.tsx` e seu teste, o wrap
  `<Theme theme={gothicTheme} mode="dark">` em `App.tsx`, as três linhas
  de `@import` do Astryx em `src/index.css`, o polyfill de
  `window.matchMedia` em `src/test/setup.ts` (só existia por causa do
  `SideNavItem` do Astryx), e a opção `corePlugins: { preflight: false }`
  em `tailwind.config.ts` (só existia para não conflitar com o CSS em
  camadas do Astryx — sem o Astryx, o preflight padrão do Tailwind volta
  a ser o comportamento correto).
- `src/state/ui-store.ts` (`activeTab`/`setActiveTab`) é mantido sem
  alteração de forma — só muda de consumidor visual (de `AppSidebar` para
  a nova `Tabs`).

## 4. Paleta de Cores

Extraída literalmente da imagem `imagem_3.png`, aplicada via
`tailwind.config.ts` → `theme.extend.colors`:

| Token Tailwind | Valor | Uso |
|---|---|---|
| `accent` | `#ebebeb` | Preenchimento do marcador "tocando agora", elementos de destaque |
| `card` | `#1b1b1b` | Fundo de cards/itens de exercício |
| `surface` | `#262626` | Fundo de chips/controles (BPM, seletor, pill de casas) |
| `body` | `#1b1b1b` | Fundo da página |
| `text-primary` | `#fafafa` | Texto principal |
| `text-secondary` | `#a1a1a1` (inferido — não veio na paleta extraída, ajustável depois) | Labels/subtítulos secundários |
| bordas | `white/10` (rgba branco 10%) | Bordas de células, cards, divisores |

Nenhuma cor de destaque colorida (âmbar, azul, etc.) é usada — o visual é
estritamente monocromático conforme as imagens.

## 5. Header e Navegação por Abas

- Header: caixa quadrada com "GT", texto pequeno "ESTÚDIO DE PRÁTICA"
  acima do título "Guitar Teacher". Remove "Sessão em andamento" e o
  avatar circular (sem conceito de autenticação/multi-usuário no app).
- Novo `src/components/layout/Tabs.tsx` (recriado — havia sido removido
  na sessão anterior): abas estilo breadcrumb ("Prática / Fretboard
  Livre", sublinhado quando ativa), com suporte a um badge numérico
  opcional por aba. A aba "Exercícios" mostra `EXERCISE_CATALOG.length`
  como badge (dado real).
- Seção "hero" por aba: rótulo pequeno ("MODO LIVRE" / "TREINO GUIADO"),
  título grande, subtítulo descritivo. **Sem** o contador "07 DIAS DE
  SEQUÊNCIA" das imagens — exigiria rastreamento persistido não pedido
  neste escopo.
- `App.tsx` volta ao layout vertical empilhado (header → abas → conteúdo),
  substituindo o layout `flex` horizontal com sidebar da sessão anterior.

## 6. Fretboard em Tabela Plana

Substitui completamente a abordagem de "braço realista" (gradiente
amadeirado, linhas de corda/traste como camadas absolutas flutuantes) das
duas últimas sessões:

- Fundo plano (`bg-card` ou similar), sem gradiente.
- Nova linha de cabeçalho com os números das casas visíveis (1 a
  `maxFret`), alinhados a cada coluna.
- Cada célula da grade tem bordas finas (`border-white/10`) à direita e
  embaixo, formando uma tabela visível — não mais linhas decorativas
  soltas.
- Pontos de referência (casas 3/5/7): mantém a camada de bolinhas cinza
  discretas já implementada e testada em refactors anteriores,
  centralizada verticalmente no grid inteiro.
- Marcadores de nota (`FretMarker`): círculo pequeno centralizado na
  célula.
  - **Selecionado**: contorno claro (`border border-white/40`), fundo
    transparente, texto branco — estilo "outline", não mais preenchido em
    âmbar.
  - **Destacado durante o playback** (`highlighted`): preenchimento
    sólido `bg-accent` com texto escuro (`text-body` ou similar) — usado
    para indicar visualmente "tocando agora", já que as imagens estáticas
    não mostram esse estado; esta é uma decisão de design deste spec, não
    uma cópia literal das imagens.
  - **Vazio**: totalmente transparente, sem contorno visível.

## 7. Barra de Controles

- Botão "Começar" (renomeado de "Play"), com ícone de play (lucide-react
  `Play`), mesma lógica de `useNotePlayback` (alterna para "Parar"
  durante o playback).
- Stepper de BPM ("−", valor, "+") e seletor de "Figura rítmica" — lógica
  inalterada, apenas reestilizados como chips (`bg-surface`, bordas
  arredondadas).
- "🔈 Metrônomo ativo": texto estático informativo com ícone
  (lucide-react `Volume2`) — não é mais um botão (o botão de
  iniciar/parar o clique do metrônomo já havia sido removido em um
  refactor anterior); apenas comunica visualmente que a configuração de
  ritmo está ativa para o playback.
- "↺ Reiniciar" (lucide-react `RotateCcw`): botão real, conectado a
  `useFretboardStore.getState().clearSelection()` — limpa a sequência de
  notas marcadas. Diferente das imagens (que sugerem "reiniciar sessão"),
  esta é a interpretação funcional mais direta e honesta com o estado que
  o app realmente tem.
- **Sem** "Sessão de hoje 12 min" — exigiria um cronômetro de sessão não
  pedido neste escopo.

## 8. Lista de Exercícios

- Cada item mostra categoria (rótulo pequeno, maiúsculo) + nome do
  exercício — dados que já existem em `EXERCISE_CATALOG`.
- **Sem** a linha "Iniciante · 80 BPM" das imagens — exigiria um campo
  novo (dificuldade/BPM sugerido) no modelo de `Exercise` que não existe
  hoje; adicionar esse campo está fora do escopo "apenas visual" acordado.
- Estilo de card: `bg-card`, borda `white/10`, item ativo com destaque
  sutil (ex: borda mais clara), sem cor de acento colorida.

## 9. Testes

- Testes de `Fretboard.test.tsx`/`FretMarker` relacionados à camada de
  linhas de corda/traste "flutuantes" e ao gradiente amadeirado são
  removidos/substituídos por testes da nova estrutura de tabela (cabeçalho
  de casas, bordas de célula via classe, contorno em vez de preenchimento
  no marcador selecionado).
- `Tabs.test.tsx` é recriado do zero (mesmo nome de arquivo removido
  antes), cobrindo: renderização das duas abas, badge numérico correto na
  aba Exercícios, alternância de aba ao clicar.
- `AppSidebar.tsx`/teste são removidos.
- `App.test.tsx` é atualizado para interagir via `role="tab"` novamente
  (em vez de `role="button"` da sidebar), mantendo os testes de
  persistência de `minFret` já existentes.
- Novo teste para o botão "Reiniciar" chamando `clearSelection()`.
- Nenhuma mudança em `src/audio/**`, `src/domain/**`, ou nas stores além
  do já descrito.

## 10. Fora de Escopo

- Contador de dias em sequência (streak), cronômetro de sessão, conceito
  de "sessão em andamento"/usuário autenticado — nenhum desses vira
  funcionalidade real nesta sessão.
- Campo de dificuldade/BPM sugerido no catálogo de exercícios.
- Reativação do botão de iniciar/parar o clique do metrônomo.
- Qualquer mudança na lógica de áudio além da correção já aplicada
  (Seção 2, já commitada antes deste spec).
- O finding já conhecido e parado (localStorage gravando a cada pulso do
  metrônomo) não faz parte deste refactor.
