# Arquitetura Local Preparada Para Backend

Este projeto ainda roda localmente via HTML, CSS e JavaScript puro, mas agora possui uma primeira camada organizada para evoluir para backend/API sem reescrever tudo do zero.

## Estrutura

```text
/src
├── /pages
├── /components
├── /styles
├── /assets
├── /utils
├── /services
│   ├── storage.js
│   ├── auth.js
│   ├── users.js
│   ├── cases.js
│   └── posts.js
└── /modules
    ├── admin.js
    └── devmode.js
```

## Camada De Dados

`src/services/storage.js` simula um banco de dados usando `localStorage`, mas expõe métodos assíncronos:

- `list(collection)`
- `read(collection, id)`
- `create(collection, payload)`
- `update(collection, id, patch)`
- `delete(collection, id)`
- `getValue(key)`
- `setValue(key, value)`

Quando houver backend, esta camada pode trocar para `fetch`/API sem obrigar a reescrever toda a interface.

## Serviços

- `auth.js`: registro, login e sessão simulada.
- `users.js`: atualização/listagem de usuários.
- `cases.js`: B.O. privado.
- `posts.js`: mural público com respostas.
- `admin.js`: regra de acesso premium/admin.
- `devmode.js`: ponto de separação para o editor visual.

## Estado Atual Da Migração

O `script.js` ainda mantém grande parte da UI para preservar o funcionamento local. Ele já usa `LevadinhaStorage.sync` quando disponível e os novos serviços assíncronos ficam prontos para a próxima etapa.

Próximos passos recomendados:

1. Extrair autenticação do `script.js` para `auth.js`.
2. Extrair B.O. para `cases.js`.
3. Extrair mural para `posts.js`.
4. Extrair modo desenvolvedor inteiro para `modules/devmode.js`.
5. Separar `styles.css` por responsabilidade.
