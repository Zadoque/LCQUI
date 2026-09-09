# LCQUI - Laboratório de Ciências Químicas Integrado

O **LCQUI** é um sistema completo desenvolvido para o gerenciamento de inventário, auditoria, almoxarifado, controle de lotes, reagentes, bens patrimoniais e gestão acadêmica (turmas, roteiros de experimentos e alunos). 

A aplicação foi projetada com base em uma arquitetura _serverless_ no Firebase e frontend robusto em Next.js (React), com tipagem rigorosa através do TypeScript e Zod.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** Next.js (App Router), React, TailwindCSS, Lucide Icons, TypeScript.
- **Backend:** Firebase (Firestore, Cloud Functions, Authentication, Rules).
- **Validação de Dados:** Zod.
- **Testes:** Jest (Testes de segurança de regras do Firestore).
- **Emuladores:** Firebase Local Emulator Suite (para desenvolvimento e testes locais sem custo).

---

## 🚀 Como Rodar o Projeto

Para executar este projeto na sua máquina, você precisa ter instalado:
1. **Node.js** (Versão 18 ou superior recomendada).
2. **Java Runtime Environment (JRE)** (Requerido pelo Emulador do Firebase).
3. **NPM** ou **Yarn**.
4. **Firebase CLI** (`npm install -g firebase-tools`).

### 🐧 Instalação no Linux (Ubuntu/Debian, Arch, Fedora)

1. Clone o repositório e instale as dependências:
```bash
git clone https://github.com/Zadoque/LCQUI.git
cd LCQUI

# Instalar dependências do Frontend
cd frontend
npm install

# Instalar dependências do Backend (Cloud Functions)
cd ../functions
npm install
npm run build
```

2. Certifique-se de que o **Java** está instalado (necessário para os emuladores Firebase):
```bash
# Ubuntu/Debian
sudo apt install default-jre

# Arch Linux
sudo pacman -S jre-openjdk
```

### 🪟 Instalação no Windows

1. Baixe e instale o [Node.js](https://nodejs.org/) (marcando a opção para instalar as ferramentas adicionais do C/C++ build tools se solicitado).
2. Baixe e instale o [Java JRE](https://www.java.com/pt-BR/download/).
3. Instale a Firebase CLI globalmente: `npm install -g firebase-tools`.
4. Clone o repositório, abra no VS Code ou terminal de preferência (PowerShell) e siga o mesmo fluxo de `npm install` na pasta `frontend` e `functions` (seguido de `npm run build` na `functions`).

### ❄️ Instalação em Sistemas NixOS (Sessão Especial)

O NixOS possui uma forma declarativa de gerenciar pacotes. O Java e as bibliotecas C/C++ exigidas por pacotes Node mais antigos precisam de um ambiente (`nix-shell` ou `direnv`).

1. Crie um arquivo `shell.nix` na raiz do seu projeto contendo:
```nix
{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs_20
    jre8  # Essencial para rodar o Firebase Local Emulator Suite
    firebase-tools
  ];
}
```
2. Inicie o ambiente isolado rodando `nix-shell`.
3. Navegue pelas pastas `frontend` e `functions` e rode `npm install` (e `npm run build` na functions). Se algum pacote como *bcrypt* reclamar de *build tools*, adicione `python3` e `gcc` ao seu `buildInputs`.

---

## 🏃‍♀️ Iniciando os Ambientes Localmente

Você precisará de **dois terminais abertos**.

**Terminal 1 - Emuladores do Firebase (Backend + Banco de Dados):**
```bash
cd functions
npm run build
npx firebase emulators:start --project lcqui-uenf
```
Isso subirá o banco de dados localmente nas portas 8080 (Firestore) e 9099 (Auth). Acesse a UI do emulador em `http://localhost:4000`.

**Terminal 2 - Frontend Next.js:**
```bash
cd frontend
npm run dev
```
Acesse o sistema em `http://localhost:3000`.

---

## 🌱 Seed Inicial de Dados

Para facilitar o desenvolvimento, construímos um script `seed.ts` unificado que popula o banco local com:
- **Papéis Administrativos:** 1 Chefe Geral, 1 Gestor de Almoxarifado, 1 Gestor de Patrimônio e 1 Bolsista.
- **Professores & Turmas:** 3 Professores (cada um contendo 3 Turmas vinculadas).
- **Alunos:** 6 Alunos.
- **Reagentes:** 20 Substâncias Químicas Base (10 Puras, 10 Misturas).

Para rodar o seed, garanta que os Emuladores do Firebase (Terminal 1) estejam rodando e, em um novo terminal, execute:

```bash
cd functions
npx tsx scripts/seed.ts
```
*(Nota: O usuário Chefe Geral gerado pelo seed é `chefe@lcqui.uenf.br` com a senha `password123`. Os demais seguem o padrão definido no log do terminal).*

---

## 🛡️ Testes de Segurança

O sistema possui testes automatizados intensos validando as Regras de Segurança do Firestore, garantindo que Alunos não tenham acesso a rotas de Gestores, etc.

Para rodá-los:
```bash
cd functions
npm run test:security
```
