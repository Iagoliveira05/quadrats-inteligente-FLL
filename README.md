# Quadrats Inteligentes

Sistema web para registrar dados ecológicos, receber temperatura e umidade de um ESP32 por Bluetooth e compartilhar coletas entre integrantes de um projeto.

## Recursos atuais

- Login por e-mail/senha e Google.
- Login Google adaptado para Android.
- Projetos e equipes com código de convite.
- Alternância entre vários projetos.
- Áreas, quadrats e coletas compartilhados entre membros.
- Atualização manual dos registros compartilhados e preservação da tela atual após refresh.
- Registro do autor de cada novo item.
- DHT11 conectado ao ESP32 por BLE.
- Persistência offline com IndexedDB/Dexie.
- Sincronização com Cloud Firestore.
- Histórico, detalhes e exclusão confirmada de coletas.
- Exportação CSV.
- Interface responsiva para computador e celular.

## Executar localmente

```bash
npm install
npm run dev
```

Web Bluetooth funciona em contexto seguro: `localhost` durante o desenvolvimento ou HTTPS em produção.

## Verificações

```bash
npm run build
npm run lint
```

## Firebase

O projeto usa a configuração Web presente em `firebase.js`. Depois de alterar `firestore.rules`, publique as regras:

```bash
firebase deploy --only firestore:rules
```

O domínio de produção deve constar nos domínios autorizados do Firebase Authentication.

## Vercel e rotas

O arquivo `vercel.json` redireciona rotas do React, como `/login` e `/cadastro`, para `index.html`. Esse fallback evita erro 404 ao atualizar a página ou abrir uma rota diretamente.

## ESP32 e DHT11

- DHT11 `VCC` → `3V3`
- DHT11 `GND` → `GND`
- DHT11 `OUT` → `GPIO 4` ou `D4`

O firmware está em `firmware/quadrat_ble/quadrat_ble.ino`.

## Documentação

- `docs/STATUS-IMPLEMENTACAO.md`: estado e próximas etapas.
- `docs/FIREBASE-CONFIGURACAO.md`: configuração do Firebase.
- `docs/EQUIPES-E-PROJETOS.md`: criação e entrada em equipes.
- `docs/ESP32-CONEXAO.md`: montagem, firmware e testes do ESP32.
