# Quiz Bíblico

Jogo de perguntas e respostas no estilo [Baamboozle](https://www.baamboozle.com/), feito para competições bíblicas presenciais (ex: eventos de igreja). Roda **localmente**, operado por um notebook conectado a um telão — uma única tela, vista pelo apresentador e pelo público ao mesmo tempo.

## O que o sistema faz

- **Login e cadastro** de usuários (JWT + cookie httpOnly), cada um com seus próprios temas e jogos.
- **Temas reutilizáveis**: você cria um tema (ex: "Livro de Gênesis", "Vida de Jesus") e cadastra até **100 perguntas** nele, cada uma com resposta e mídia opcional (imagem, gif ou vídeo — por upload de arquivo ou link/URL).
- **Criação de jogos**: escolha um tema, quantas perguntas sortear (até o total disponível), quantos times (nome + cor, 2 a 10) e a % de blocos especiais. O sistema sorteia aleatoriamente as perguntas do tema e monta uma grade de blocos embaralhada — igual ao Baamboozle.
- **Blocos especiais**: além das perguntas normais, parte dos blocos pode ser bônus de pontos, perda de pontos ou "passa a vez". O apresentador escolhe o **"time da vez"** antes de revelar cada bloco, e o efeito do bloco especial se aplica só a esse time.
- **Tela de jogo**: grade de blocos numerados; ao clicar, revela a pergunta (com mídia) e a resposta certa — visível só para o apresentador, que decide manualmente se o time acertou e ajusta a pontuação (+10/-10 rápido, ou o efeito automático dos blocos especiais). Placar sempre visível.
- **Histórico**: ao encerrar um jogo, ele entra no histórico do painel com o placar final de cada time, disponível para consulta depois.

## Stack técnica

- **Next.js 14** (App Router, TypeScript) — aplicação full-stack única
- **Prisma + SQLite** — banco de dados em arquivo local, sem servidor externo
- **JWT** (cookie httpOnly) + **bcrypt** para autenticação
- **Zod** para validação de entrada em toda API
- Arquitetura em camadas: **Controllers** (rotas de API) → **Services** (regras de negócio) → **Repositories** (única camada que acessa o banco)
- **Vitest** para testes (unitários e de integração)

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior
- npm (vem junto com o Node.js)

## Configuração inicial

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie o arquivo de variáveis de ambiente a partir do exemplo:

   ```bash
   cp .env.example .env
   ```

   Abra o `.env` e troque o valor de `JWT_SECRET` por uma string longa e aleatória (ex: gere uma com `openssl rand -hex 32`). Isso é o que assina as sessões de login — nunca compartilhe esse arquivo nem o suba para um repositório público.

3. Crie o banco de dados local e aplique as migrations:

   ```bash
   npx prisma migrate dev
   ```

   Isso cria o arquivo `prisma/dev.db` (SQLite) com todas as tabelas do sistema.

## Rodando o sistema

```bash
npm run dev
```

Acesse **http://localhost:3000** no navegador. Na primeira vez, clique em "Cadastre-se" para criar uma conta (nome, e-mail e senha) — depois é só fazer login normalmente.

O servidor de desenvolvimento recarrega automaticamente ao editar qualquer arquivo.

## Como usar, passo a passo

1. **Crie um tema** no painel (ex: "Livro de Gênesis").
2. **Cadastre perguntas** dentro do tema: enunciado, resposta e, se quiser, uma mídia (upload de arquivo ou link).
3. **Crie um jogo**: escolha o tema, título, quantidade de perguntas a sortear, % de blocos especiais e configure os times (nome e cor).
4. **Jogue**: na tela do jogo, selecione o "time da vez", clique nos blocos da grade para revelar perguntas ou efeitos especiais, e ajuste a pontuação manualmente conforme os times respondem.
5. **Encerre o jogo** quando terminar — o resultado final fica salvo no histórico do painel.

## Rodando com Docker

Se preferir não instalar Node.js na máquina, dá para rodar tudo containerizado com Docker.

**Pré-requisito:** [Docker](https://www.docker.com/) instalado e rodando (Docker Desktop no Windows/Mac, ou Docker Engine no Linux).

1. Crie o `.env` a partir do exemplo, se ainda não tiver:

   ```bash
   cp .env.example .env
   ```

   Edite o `.env` e defina um `JWT_SECRET` forte — o `docker-compose.yml` lê essa variável do `.env` automaticamente.

2. Suba o container:

   ```bash
   docker compose up --build
   ```

   Na primeira vez, isso builda a imagem (instala dependências, compila o Next.js) e sobe o container. As migrations do Prisma são aplicadas automaticamente antes do servidor iniciar.

3. Acesse **http://localhost:3000**.

O banco de dados (`prisma/dev.db`) e os arquivos enviados por upload (`public/uploads/`) ficam salvos em **volumes Docker nomeados** (`quiz-db` e `quiz-uploads`), então persistem entre reinícios do container — só são apagados se você rodar `docker compose down -v`.

Para rodar em segundo plano:

```bash
docker compose up -d --build
```

Para parar:

```bash
docker compose down
```

Para ver os logs:

```bash
docker compose logs -f
```

## Rodando os testes

```bash
npm test
```

Roda toda a suíte (services, repositórios e rotas de API) contra um banco de testes real via Prisma/SQLite.

## Build de produção

```bash
npm run build
npm start
```

Útil se quiser rodar o sistema já compilado (mais rápido) em vez do modo de desenvolvimento.

## Estrutura do projeto

```
src/
  app/
    api/            → rotas HTTP (Next.js API routes / controllers)
    (páginas)/       → telas (login, painel, temas, jogos, resultado)
  controllers        → (dentro das rotas) validação de entrada + delegação
  services/           → regras de negócio (sorteio, pontuação, geração de blocos)
  repositories/        → única camada que acessa o Prisma
  dtos/                → schemas de validação (zod)
  lib/                 → autenticação (JWT/bcrypt), upload de arquivos
  components/           → UI reutilizável (grade de blocos, placar, formulário de pergunta)
prisma/
  schema.prisma        → modelo de dados
  migrations/           → histórico de migrations do banco
```

## Observações

- O sistema foi pensado para uso **local e single-tenant por evento** (cada pessoa roda no próprio notebook) — não há suporte a múltiplos dispositivos sincronizados em tempo real na mesma partida.
- Arquivos enviados por upload ficam salvos em `public/uploads/` (não versionado no git).
- O banco `prisma/dev.db` também não é versionado — cada instalação começa com um banco vazio até você rodar `prisma migrate dev` e cadastrar seus próprios dados.
