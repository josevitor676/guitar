# Astryx/Gothic Refactor & Audio Fixes — Design Spec

Data: 2026-08-29 (sessão contínua)
Status: Aprovado para planejamento de implementação

## 1. Visão Geral

Refactoring da versão atual do Guitar Teacher: substituição da UI custom em
Tailwind puro por componentes do design system **Astryx** (Meta,
`facebook/astryx` no GitHub) com o tema **Gothic**, troca da navegação por
abas por uma **sidebar colapsável**, redesign do fretboard para marcadores
circulares centralizados nas interseções corda/traste, e duas correções na
camada de playback de áudio. A lógica de domínio, estado (Zustand) e engine
de áudio (Tone.js) já existentes permanecem intactas — este refactor é de
UI/apresentação mais dois ajustes pontuais e cirúrgicos no hook de playback.

## 2. Verificação de Dependências (pesquisa feita antes deste spec)

- `facebook/astryx` é um repositório real e público da organização oficial
  do Facebook no GitHub (criado em 2026-01-09, portanto posterior ao
  conhecimento do assistente; verificado via API do GitHub, não apenas por
  inspeção da página).
- Os pacotes npm corretos são **escopados**: `@astryxdesign/core`,
  `@astryxdesign/theme-gothic`, `@astryxdesign/cli`, com peer dependency
  `@stylexjs/stylex` e requisito mínimo de `react`/`react-dom` 19+. O
  projeto já está em React 19.2.8 — nenhum upgrade necessário.
- O pacote npm **sem escopo** `astryx` pertence a uma pessoa física
  (`elijah kotyluk`), não à Meta — **nunca deve ser instalado**; é
  provável ocupação de nome (squatting) do npm, não relacionado ao projeto
  real.
- O provider de tema correto é `Theme`, exportado de
  `@astryxdesign/core/theme` (confirmado lendo o código-fonte real de
  `packages/core/src/theme/index.ts` — documentação solta de um pacote de
  tema específico menciona `XDSTheme`, mas essa não é a exportação real).
- O tema Gothic (`@astryxdesign/theme-gothic`) é confirmado **dark-only**
  (sempre renderiza escuro, independente da preferência do sistema),
  exporta `gothicTheme` de `@astryxdesign/theme-gothic/built`.
- Componentes confirmados existentes e usados neste spec: `SideNav`,
  `SideNavItem`, `SideNavCollapseButton` (embutido via
  `collapsible={true}`), `Button`, `Icon`. O conjunto de ícones semânticos
  nativos do Astryx é uma lista fixa pequena (close, chevronDown, search,
  stop, microphone, etc.) e **não inclui** ícone de guitarra nem de livro
  — para esses dois, a própria documentação recomenda passar um componente
  SVG diretamente (ex: `lucide-react`), já que o tema Gothic usa ícones
  Lucide internamente.
- O bridge `@astryxdesign/core/tailwind-theme.css` mapeia os tokens do
  Astryx para classes utilitárias do Tailwind (`bg-surface`,
  `text-primary`, etc.), permitindo que o Tailwind já configurado no
  projeto continue funcionando lado a lado sem conflito.

## 3. Setup e Dependências

```bash
npm install @astryxdesign/core @astryxdesign/theme-gothic @stylexjs/stylex lucide-react
npm install -D @astryxdesign/cli
```

- `App.tsx` (ou um novo `main.tsx`/wrapper) envolve toda a aplicação em
  `<Theme theme={gothicTheme} mode="dark">`.
- CSS: importar, nesta ordem, `@astryxdesign/core/reset.css`,
  `@astryxdesign/core/astryx.css`, `@astryxdesign/theme-gothic/theme.css`,
  e o bridge `@astryxdesign/core/tailwind-theme.css` antes das utilities
  do Tailwind (`src/index.css`).
- Divisão de responsabilidade visual: componentes Astryx cuidam de toda a
  "casca" do app (navegação, botões de ação, textos, indicadores) — o
  Tailwind (já configurado) continua sendo usado **apenas** dentro do
  `Fretboard`/`FretMarker`, que é uma visualização de domínio específica
  sem componente equivalente no Astryx.
- Ícones de guitarra ("Prática Livre") e livro ("Exercícios") vêm de
  `lucide-react` (`Guitar`, `BookOpen`) passados diretamente como valor do
  prop `icon`/`selectedIcon` do `SideNavItem`, já que não existem entre os
  nomes semânticos nativos do Astryx.

## 4. Navegação: Sidebar Colapsável (substitui as Tabs)

- `src/state/ui-store.ts` (já existente) é reaproveitado sem mudança de
  forma — continua expondo `activeTab: 'practice' | 'exercises'` e
  `setActiveTab`. Apenas o consumidor visual muda de `Tabs` para a nova
  sidebar.
- Novo componente `src/components/layout/AppSidebar.tsx`: um `SideNav`
  com `collapsible={true}` (dá o comportamento de recolher/expandir e o
  botão de colapsar embutido, atendendo ao pedido de "botão de
  hambúrguer"), contendo dois `SideNavItem`:
  - "Prática Livre" — `icon={Guitar}` (lucide-react), `isSelected`
    ligado a `activeTab === 'practice'`, `onClick` chama
    `setActiveTab('practice')`.
  - "Exercícios" — `icon={BookOpen}` (lucide-react), mesma lógica para
    `'exercises'`.
- `src/components/layout/Tabs.tsx` e `Tabs.test.tsx` são **removidos**
  (não ficam código morto).
- `App.tsx` muda de layout vertical empilhado para `flex` horizontal:
  `AppSidebar` fixa à esquerda, área de conteúdo principal (`flex-1`) que
  se ajusta dinamicamente conforme a sidebar colapsa ou expande — o
  próprio `SideNav` cuida da largura/transição, o conteúdo só precisa
  ocupar o espaço restante.
- O conteúdo de cada "página" (Prática / Exercícios) continua exatamente
  o que já existe hoje (fretboard, controles, lista de exercícios) — só
  muda o container de navegação em volta.

## 5. Redesign do Fretboard: Marcadores Circulares

Aplica-se apenas a `src/components/fretboard/Fretboard.tsx` e
`FretMarker.tsx`. Nenhuma mudança de props, hooks, ou lógica de seleção —
puramente estrutural/visual.

- **Camada de linhas de trastes (nova)**: uma linha vertical fina e
  metálica por casa visível, posicionada com a mesma matemática de pixel
  já usada e testada para os inlays (`LABEL_WIDTH_PX`,
  `FRET_CELL_WIDTH_PX`), numa camada absoluta `z-0` atrás de tudo.
- **Linhas de corda**: cada linha de corda deixa de ser uma borda no
  rodapé da célula (`border-b-[...]`) e passa a ser uma linha fina
  **centralizada verticalmente** dentro da sua row (`absolute inset-x-0
  top-1/2 -translate-y-1/2`), preservando a mesma espessura progressiva
  (corda 6 mais grossa, corda 1 mais fina) já validada no refactor
  anterior — só muda a âncora vertical.
- **`FretMarker` vira um círculo**: em vez de um botão retangular
  preenchendo a célula inteira (`h-10 w-14`), o marcador visível passa a
  ser um círculo pequeno e fixo (`rounded-full`, ~28px) centralizado
  dentro da célula (a célula continua com a mesma área de clique de
  antes, só o conteúdo visual muda). Estado vazio: fundo transparente
  (deixa a linha de corda/traste aparecer por trás). Estado
  selecionado/destacado: círculo preenchido em âmbar com o efeito de
  glow/anel já existente (reaproveitado do refactor anterior).
- A camada de inlays (casas 3/5/7) já existente permanece, sem mudanças.
- Nenhuma mudança em `aria-label`, `aria-pressed`, `onClick`,
  `positionsEqual`, ou qualquer lógica de seleção/highlight.

## 6. Correções de Playback de Áudio

### 6.1 Ordem estrita de reprodução

Investigação prévia confirmou que **não existe nenhum `.sort()`** no
código atual — a ordem de clique já é preservada fielmente desde
`fretboard-store.toggleNote` (append/filter simples, sem reordenação) até
`ToneSequencePlayer.play()` (mapeia o array na mesma ordem recebida). Em
vez de uma "correção" sobre um bug não localizado, este item vira um
**teste de regressão explícito**, cobrindo especificamente o caso de
notas repetidas em posições diferentes (ex: a mesma nota "F#" tocada em
duas cordas/casas diferentes) — garantindo que a store não deduplica por
nome de nota (só por posição exata `{string, fret}`) e que a ordem de
clique sobrevive intacta até a chamada de `sequencePlayer.play()`.

### 6.2 Reset do índice de playback ao iniciar

`useNotePlayback.play()` hoje não reseta `currentIndex` antes de iniciar
uma nova sequência — entre o clique em Play e o primeiro callback real do
`Tone.Sequence`, um destaque residual de uma tocada anterior pode
permanecer visível no fretboard. Correção: `play()` chama
`setCurrentIndex(null)` explicitamente antes de `sequencePlayer.play(...)`.
Combinado com a decisão já tomada nesta sessão de que `stop()` também
mantém `currentIndex: null` (nenhuma bolinha "presa" como destaque após
parar), o comportamento fica consistente: nenhum destaque residual em
nenhum dos dois pontos de transição (start e stop).

## 7. Testes

- Novos testes para `AppSidebar.tsx` (renderiza os dois itens, marca o
  ativo via `aria-current`/estado de seleção do `SideNavItem`, clique
  chama `setActiveTab` corretamente).
- `App.test.tsx` atualizado para navegar pela sidebar em vez de por
  `role="tab"`.
- `Tabs.test.tsx` removido junto com `Tabs.tsx`.
- `Fretboard.test.tsx` ganha testes para a nova camada de linhas de
  trastes (mesma técnica de `data-testid` já usada para inlays) e mantém
  os testes de ordem de string/inlay/glow já existentes (que não
  dependem da forma retangular vs. circular do marcador).
- `FretMarker.tsx` não tem teste dedicado (como já era o caso) — segue
  exercitado indiretamente via `Fretboard.test.tsx`.
- Novo teste de regressão em `useNotePlayback.test.tsx` (ou
  `fretboard-store.test.ts`, o que for mais direto) cobrindo notas
  repetidas em posições diferentes mantendo ordem de clique.
- Novo teste em `useNotePlayback.test.tsx` provando que `play()` chama
  `setCurrentIndex(null)` antes de `sequencePlayer.play(...)`.

## 8. Fora de Escopo

- Nenhuma mudança em `src/audio/**` (Tone.js), `src/domain/**`, ou nas
  stores de fretboard/metrônomo/persistência além do já descrito na seção
  6.2.
- Nenhuma reativação do botão de metrônomo (continua fora, decisão da
  sessão anterior).
- Nenhuma migração de componentes que já funcionam bem em Tailwind puro
  (o próprio Fretboard) para componentes genéricos do Astryx — Astryx
  entra apenas na navegação e na "casca" do app.
- O finding já conhecido e parado (localStorage gravando a cada pulso do
  metrônomo) não faz parte deste refactor.
