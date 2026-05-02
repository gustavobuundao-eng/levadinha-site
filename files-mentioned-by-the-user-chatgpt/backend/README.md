# Backend Local Da Levadinha

Backend simples e funcional usando apenas Node.js nativo, sem dependencias externas.

Ele serve para transformar o site local em um sistema com:

- contas separadas;
- conta premium unica;
- token de autenticacao;
- B.O. privado visivel apenas para premium;
- denuncias;
- mural publico com respostas;
- banco local em arquivo JSON.

## Rodar

```bash
cd backend
npm start
```

Depois abra:

```text
http://localhost:3000
```

## Conta Premium

Criada automaticamente ao iniciar:

```text
Usuario: Levadinha
Senha: levadinha
```

Para trocar, defina variaveis de ambiente com base em `.env.example`.

## Banco Local

O banco fica em:

```text
backend/src/data/database.json
```

Este arquivo simula um banco de dados. No futuro pode ser trocado por SQLite, PostgreSQL ou Supabase.

## Rotas Principais

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
PATCH /api/users/me

POST /api/cases
GET  /api/admin/cases

POST /api/denunciations

GET  /api/posts
POST /api/posts
POST /api/posts/:id/replies

GET  /api/admin/users
```

Rotas admin exigem token de uma conta premium.
