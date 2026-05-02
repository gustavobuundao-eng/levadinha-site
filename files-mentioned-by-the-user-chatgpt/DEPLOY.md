# Como Subir No GitHub E Render

## 1. Criar um repositório no GitHub

1. Entre em https://github.com
2. Clique em `New repository`
3. Nome sugerido: `levadinha-site`
4. Deixe como `Private` se não quiser que outras pessoas vejam o código.
5. Clique em `Create repository`

## 2. Enviar os arquivos

Opção mais simples sem terminal:

1. Abra o repositório criado no GitHub.
2. Clique em `uploading an existing file`.
3. Arraste todos os arquivos e pastas deste projeto, incluindo:
   - `index.html`
   - `galeria.html`
   - `conta.html`
   - `painel.html`
   - `login.html`
   - `styles.css`
   - `script.js`
   - `assets/`
   - `src/`
   - `backend/`
   - `render.yaml`
4. Clique em `Commit changes`.

## 3. Conectar no Render

1. Entre no Render.
2. Clique em `New +`.
3. Escolha `Web Service`.
4. Escolha o repositório do GitHub.
5. Se o Render detectar o `render.yaml`, ele deve configurar sozinho.

Configuração manual, se precisar:

- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

## 4. Conta premium

Por padrão:

```text
Usuário: Levadinha
Senha: levadinha
```

Depois você pode trocar a senha no Render usando a variável `PREMIUM_PASSWORD`.

