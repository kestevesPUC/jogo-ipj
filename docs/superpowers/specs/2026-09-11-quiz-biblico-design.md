# Quiz Bíblico (estilo Baamboozle) — Design

Data: 2026-09-11

## Contexto e objetivo

Sistema web para conduzir uma competição bíblica presencial na igreja,
inspirado no [Baamboozle](https://www.baamboozle.com/): uma grade de
blocos numerados que os times escolhem um a um, revelando perguntas
bíblicas (com suporte a imagem/gif/vídeo) até o fim do jogo.

O sistema roda **localmente**, em um notebook conectado a um telão —
uma única tela, operada pelo apresentador e vista pelo público ao
mesmo tempo. Não há necessidade de sincronizar múltiplos dispositivos
em tempo real.

Vários líderes/professores podem usar o sistema, cada um com login
próprio (usuário e senha, JWT), enxergando apenas seus próprios temas
e jogos.

## Requisitos funcionais

1. Cadastro de perguntas e respostas, agrupadas em **Temas** (ex: um
   livro da Bíblia), reaproveitáveis entre jogos. Até 100 perguntas
   por tema.
2. Cada pergunta pode ter mídia opcional: imagem, gif ou vídeo, via
   **upload de arquivo** ou **link/URL** externo (ex: YouTube).
3. Autenticação por usuário e senha, sessão via **JWT**.
4. Criação de jogos: título, tema de origem, número de times
   (nomes/cores), quantidade de perguntas desejada (até 100, limitada
   ao total disponível no tema) e percentual de **blocos especiais**.
5. Ao criar o jogo, o sistema **sorteia aleatoriamente** N perguntas do
   tema escolhido e monta a grade de blocos (posições embaralhadas,
   incluindo blocos especiais conforme o percentual definido).
6. Tela de jogo: grade de blocos numerados; ao clicar, revela a
   pergunta (com mídia) em destaque; o apresentador vê a resposta
   correta e decide manualmente, por time, se acertou ou errou,
   ajustando a pontuação. Blocos especiais aplicam efeito automático
   (bônus de pontos, perda de pontos, passa a vez) ao serem revelados.
7. Placar dos times sempre visível durante o jogo.
8. Ao finalizar, o jogo é marcado como concluído e entra no
   **histórico**, com o placar final de cada time.
9. Histórico consultável: lista de jogos finalizados com data, tema e
   placar final.

## Fora de escopo (YAGNI)

- Sincronização em tempo real entre múltiplos dispositivos/telas.
- Cadastro de convidados ou papéis/permissões além de "dono do
  conteúdo" (sem admin global, sem times como usuários logados).
- Deploy em nuvem (fica local; pode ser revisitado depois se
  necessário).
- Verificação automática de resposta certa/errada — decisão é sempre
  manual do apresentador.

## Modelo de dados

- **User**: id, nome, email (único), senha (hash bcrypt)
- **Theme**: id, nome, ownerId (User)
- **Question**: id, themeId, enunciado, resposta, mediaType
  (none/image/gif/video), mediaSource (upload/url), mediaValue
  (caminho do arquivo ou URL)
- **Game**: id, título, ownerId (User), themeId, questionCount,
  specialBlockPercent, status (draft/in_progress/finished),
  createdAt, finishedAt
- **GameBlock**: id, gameId, position, type
  (question/bonus_points/lose_points/skip_turn), questionId (nullable,
  só para type=question), pointsValue (para blocos de bônus/perda),
  revealed (bool)
- **Team**: id, gameId, nome, cor, score

O histórico de jogos é simplesmente a listagem de `Game` com
status=finished, incluindo seus `Team`s e pontuação final — não requer
tabela separada.

### Regras de integridade importantes

- `Question.themeId` obrigatório; limite de 100 perguntas por tema
  validado no service antes de inserir.
- `Game.questionCount` não pode exceder o total de perguntas
  disponíveis no tema escolhido no momento da criação.
- Criação de um `Game` é uma operação **transacional**: sorteio das
  perguntas, criação dos `GameBlock`s e dos `Team`s acontece em uma
  única transação no banco (tudo ou nada).
- `GameBlock.questionId` referencia `Question` só quando
  `type = question`; blocos especiais não têm pergunta associada.

## Arquitetura de código

Stack: **Next.js** (App Router, React + API routes) como aplicação
full-stack única, **SQLite** via **Prisma ORM**, autenticação por
**JWT** (cookie httpOnly) com senha em **bcrypt**. Validação de
entrada com **zod**. Mídia enviada por upload fica em pasta local
(`public/uploads`), servida como arquivo estático; mídia por link é
apenas armazenada como URL e embedada na tela.

Arquitetura em camadas (MVC + Repository):

```
src/
  app/
    api/                  → rotas HTTP (Next.js API routes)
    (paginas)/            → UI (dashboard, temas, jogos, histórico)
  controllers/            → recebe request, valida DTO (zod), chama service, formata response
  services/                → regras de negócio (sorteio de perguntas, geração de blocos,
                              cálculo/ajuste de pontuação, transições de status do jogo)
  repositories/             → única camada que acessa o Prisma
                              (UserRepository, ThemeRepository, QuestionRepository,
                               GameRepository, GameBlockRepository, TeamRepository)
  prisma/                   → schema.prisma + migrations
  dtos/                     → schemas zod de entrada/saída
  lib/                      → auth (jwt/bcrypt), upload handler, utils
  components/                → UI reutilizável (grade de blocos, cards de pergunta, placar)
```

Princípios:

- Controller não contém regra de negócio; apenas orquestra
  validação → service → resposta HTTP.
- Service não conhece Request/Response HTTP, nem Prisma diretamente —
  só fala com repositories.
- Repository é a única camada com `import { prisma }`; troca de
  storage fica isolada aqui.
- Toda migration de schema passa por `prisma migrate`, nunca edição
  manual do banco.
- Segredo do JWT (`JWT_SECRET`) e outras configs sensíveis ficam em
  `.env`, fora do controle de versão.
- Autorização: toda query de Theme/Question/Game filtra por
  `ownerId = usuário logado` na camada de repository/service — um
  usuário nunca acessa dado de outro.

## Fluxo de telas

1. **Login** — usuário/senha → JWT em cookie httpOnly.
2. **Dashboard** — lista de Temas do usuário e lista de Jogos
   (ativos/rascunho e finalizados com link pro histórico).
3. **Gestão de Tema** — criar tema; CRUD de perguntas dentro do tema
   (enunciado, resposta, mídia opcional por upload ou link); contador
   de perguntas (máx. 100).
4. **Criar Jogo** — escolher tema, título, nº de times (nome + cor
   cada), nº de perguntas a sortear, % de blocos especiais → ao
   confirmar, sistema gera a grade (sorteio + embaralhamento).
5. **Tela de Jogo** — grade de blocos numerados; clique revela
   pergunta + mídia em destaque, com resposta certa visível só pro
   apresentador; botões de "time acertou/errou" ajustam a pontuação;
   blocos especiais aplicam efeito automaticamente ao serem
   revelados; placar sempre visível; botão para encerrar o jogo.
6. **Fim de jogo** — tela de resultado final (ranking dos times) →
   jogo salvo como finalizado.
7. **Histórico** — lista de jogos finalizados (data, tema, título,
   placar final de cada time).

## Testes

- Services (regras de negócio: sorteio de perguntas, geração de
  blocos especiais, cálculo de pontuação, limite de 100 perguntas) —
  testados isoladamente com repositories mockados.
- Repositories — testados contra um SQLite de teste (não mockado).
- Fluxos de API críticos (criar jogo, revelar bloco, finalizar jogo)
  com testes de integração.
