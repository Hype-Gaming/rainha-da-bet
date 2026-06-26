# Irmandade Club Hypegaming

Aplicacao web em Nuxt para a plataforma Irmandade Club, com experiencia de dashboard, autenticacao, area de jogos, mentoria, gestao de banca e fluxo de deposito integrado a API Cactus.

## Tecnologias

- Nuxt 4
- Vue 3
- TypeScript
- Nuxt Icon
- Font Awesome
- Maska

## Requisitos

- Node.js 20 ou superior
- npm

## Instalacao

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

Por padrao, o Nuxt inicia o ambiente local em `http://localhost:3000`.

## Build de producao

```bash
npm run build
```

O script de build atualiza o arquivo de versao antes de gerar a aplicacao.

## Preview local do build

```bash
npm run preview
```

## Start em producao

```bash
npm run start
```

O comando `start` executa a aplicacao na porta `3098`.

## Estrutura principal

```text
app/
  components/      Componentes reutilizaveis
  composables/     Regras de autenticacao, deposito e jogos
  middleware/      Protecao de rotas
  pages/           Paginas da aplicacao
public/            Imagens, manifest, service worker e assets publicos
assets/            Estilos globais
```

## API

A documentacao de integracao com a API Cactus esta em `api.md`.

## Deploy com PM2

O projeto inclui `ecosystem.config.cjs` para executar o build gerado com PM2:

```bash
npm run build
pm2 start ecosystem.config.cjs
```
