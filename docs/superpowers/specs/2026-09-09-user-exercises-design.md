# Exercícios do Aluno — Design Spec

Data: 2026-09-09
Status: Aprovado para implementação

## 1. Visão Geral

Bloco B de três. O bloco A (redesign + linha do tempo) está entregue. Este
spec permite que o aluno monte uma sequência no braço, dê um nome e salve
— e que ela apareça na aba Exercícios junto com o catálogo fixo. O bloco C
(importar imagem/PDF) depende deste, porque o exercício importado precisa
de um lugar para ser guardado.

Hoje `EXERCISE_CATALOG` é um array estático em código e `exercise-store`
só sabe selecionar dele. Nada do que o aluno monta sobrevive a um reload.

Fora de escopo: editar um exercício salvo, renomear, reordenar, pastas ou
categorias personalizadas, e sincronização entre dispositivos.

## 2. Modelo de Domínio

`Exercise` ganha campos opcionais e um novo tipo derivado:

```ts
export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  positions: FretPosition[];
}

export interface UserExercise extends Exercise {
  category: 'meu';
  bpm: number;
  subdivision: Subdivision;
  createdAt: number;   // Date.now(), usado para ordenar do mais novo ao mais antigo
}
```

`ExerciseCategory` ganha o valor `'meu'`, reservado para o que o aluno
cria. O catálogo fixo nunca usa essa categoria, e é isso que separa as
duas listas na interface sem precisar de um campo `source` extra.

O exercício salvo guarda **posições, BPM e figura rítmica global**. Não
guarda o modo por corda nem as figuras por corda: são seis campos a mais
para um recurso que a maioria das sequências não personaliza. Se um dia
precisar, entra como uma migração de versão do armazenamento.

## 3. Armazenamento

Novo módulo `src/state/exercise-library.ts`, separado de
`persistence.ts` porque tem outra chave, outro formato e outro ciclo de
vida — preferências mudam a cada clique, a biblioteca só em salvar e
remover.

```ts
export const EXERCISES_STORAGE_KEY = 'guitar-teacher:exercises';

export function loadUserExercises(): UserExercise[];
export function saveUserExercises(exercises: UserExercise[]): void;
```

`loadUserExercises` valida cada item e **descarta silenciosamente os
inválidos**, devolvendo os que sobraram, em vez de jogar fora a
biblioteca inteira por causa de um registro corrompido. Um JSON ilegível
ou uma raiz que não seja array devolve `[]`. A validação segue o estilo
que `persistence.ts` já usa: checagem estrutural explícita, sem
biblioteca de schema.

Um exercício é válido quando tem `id` e `name` não vazios, `category`
igual a `'meu'`, `bpm` finito, `subdivision` conhecida, `createdAt`
finito, e `positions` sendo um array não vazio de posições com corda de
1 a 6 e casa inteira ≥ 0.

## 4. Estado

`exercise-store` passa a conhecer as duas fontes:

```ts
interface ExerciseState {
  activeExerciseId: string | null;
  userExercises: UserExercise[];
  selectExercise: (id: string) => void;
  saveCurrentSelection: (name: string) => UserExercise | null;
  deleteUserExercise: (id: string) => void;
  hydrateUserExercises: () => void;
}
```

- `hydrateUserExercises` lê do localStorage; chamado uma vez pelo `App`.
- `saveCurrentSelection` lê a seleção atual do `fretboard-store` e o BPM e
  a subdivisão do `metronome-store`, monta o `UserExercise`, grava e
  devolve o que criou. Devolve `null` — sem gravar nada — quando a
  seleção está vazia ou o nome, já sem espaços nas pontas, é vazio.
- `selectExercise` procura primeiro no catálogo fixo e depois na
  biblioteca do aluno. Ao selecionar um exercício do aluno, restaura
  também o BPM e a figura rítmica que estavam salvos.
- `deleteUserExercise` remove da lista e do armazenamento; se o
  removido era o ativo, `activeExerciseId` volta a `null`.

O comportamento atual de alargar o alcance de casas para caber o
exercício é preservado e passa a valer para as duas fontes.

O id é gerado como `user-${createdAt}-${sufixo aleatório}`, para que dois
exercícios salvos no mesmo milissegundo não colidam.

## 5. Interface

**Salvar.** Um botão "Salvar sequência" na barra de controles, ao lado do
"Limpar seleção". Clicar abre um campo de nome inline no próprio painel,
com "Salvar" e "Cancelar". O botão fica desabilitado enquanto não houver
nota selecionada — não faz sentido salvar o vazio. Após salvar, o campo
fecha e o exercício recém-criado passa a ser o ativo.

**Listar.** `ExerciseList` passa a ter duas seções empilhadas: "Meus
exercícios" no topo (mais novo primeiro) e "Catálogo" embaixo. A seção do
aluno só aparece quando existe pelo menos um. Cada card do aluno mostra o
nome e o BPM salvo, e traz um botão de remover.

**Remover.** O botão de remover é de dois toques: o primeiro troca o
rótulo para "Confirmar?" e o segundo apaga. Isso evita apagar por engano
sem trazer um diálogo modal para o projeto. Sair do card com o mouse ou
clicar em outro cancela a confirmação.

**Contador.** A aba Exercícios mostra hoje o total do catálogo. Passa a
mostrar catálogo + biblioteca do aluno.

## 6. Testes

- `exercise-library.test.ts` — ida e volta pelo localStorage, JSON
  ilegível, raiz que não é array, registro inválido descartado sem
  levar os válidos junto, posições fora da faixa rejeitadas.
- `exercise-store.test.ts` — salvar com seleção vazia não grava, nome só
  com espaços não grava, exercício salvo é selecionável e restaura BPM e
  figura, remover limpa o ativo, ids não colidem.
- `ExerciseList.test.tsx` — as duas seções, a seção do aluno ausente
  quando a biblioteca está vazia, e o remover de dois toques.
- `ControlBar.test.tsx` — salvar desabilitado sem seleção, o formulário
  abre e fecha, salvar cria o exercício.
- `App.test.tsx` — a biblioteca é hidratada na montagem e o badge da aba
  soma as duas fontes.
