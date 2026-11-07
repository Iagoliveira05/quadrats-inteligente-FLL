# Status de implementação

Este documento acompanha o desenvolvimento por etapas. Cada etapa contém o que já funciona e o que ainda precisa ser ampliado.

## Etapa 1 — Fundação

Status: concluída.

Já foi feito:

- Projeto com React, Vite e TypeScript.
- Rotas públicas e protegidas.
- Layout responsivo com menu lateral no computador e barra inferior no celular.
- Identidade visual e componentes principais.

## Etapa 2 — Autenticação

Status: concluída para o escopo atual.

Já foi feito:

- Cadastro e login com e-mail e senha.
- Login com Google.
- Persistência da sessão.
- Logout e criação do perfil básico no Firestore.
- Proteção das páginas internas.

Não faz parte do escopo atual:

- Recuperação de senha por e-mail.

## Etapa 3 — Firebase e segurança

Status: funcional, com possibilidade de expansão.

Já foi feito:

- Firebase Authentication e Cloud Firestore configurados.
- Regras de segurança para usuários, projetos e subcoleções.
- Projeto pessoal criado automaticamente para cada usuário.
- Dados separados por projeto.

Pode ser ampliado depois:

- Convites de equipe por e-mail.
- Papéis personalizados além de administrador e membro.

## Etapa 4 — Bluetooth e ESP32

Status: funcional para o DHT11.

Já foi feito:

- Conexão Web Bluetooth iniciada por ação do usuário.
- Filtro pelo UUID do serviço do quadrat.
- Recebimento de temperatura e umidade.
- Validação básica dos valores recebidos.
- Detecção de desconexão BLE.
- Firmware com DHT11 no GPIO 4, identificado como D4 em placas compatíveis.

Pode ser ampliado depois:

- Fragmentação de mensagens para payloads maiores.
- Tentativa assistida de reconexão.
- Novos sensores, quando o hardware for definido.

## Etapa 5 — Áreas e quadrats

Status: funcional.

Já foi feito:

- Cadastro e listagem de áreas.
- Latitude e longitude manuais.
- Captura opcional da localização do navegador.
- Cadastro e listagem de quadrats.
- Persistência local e sincronização com o Firestore.

## Etapa 6 — Coletas ecológicas

Status: funcional para a primeira versão.

Já foi feito:

- Registro de coletas.
- Captura da temperatura, umidade e identificador do ESP32.
- Registro de espécies em texto e observações.
- Histórico ordenado por data.
- Finalização da coleta mesmo sem internet.

Pode ser ampliado depois:

- Quantidade individual por espécie.
- Edição e exclusão de coletas.
- Fotografias associadas às espécies.

## Etapa 7 — Offline e sincronização

Status: funcional.

Já foi feito:

- Persistência local com IndexedDB e Dexie.
- Gravação local antes da tentativa de envio ao Firestore.
- Fila de registros pendentes.
- Sincronização ao recuperar a conexão.
- Botão de sincronização manual.
- Aviso visual de modo offline.

## Etapa 8 — Dados e exportação

Status: funcional para CSV.

Já foi feito:

- Resumo com quantidade de coletas.
- Média de temperatura e umidade.
- Exportação das coletas em CSV com codificação UTF-8.

Pode ser ampliado depois:

- Gráficos históricos avançados.
- Exportação XLSX e PDF.
- Mapa interativo com todas as áreas.

## Etapa 9 — Interface mobile

Status: funcional e revisada.

Já foi feito:

- Navegação inferior para telas pequenas.
- Modais em formato de painel inferior.
- Formulários adaptados para celular.
- Resumos empilhados em telas estreitas.
- Suporte às áreas seguras do aparelho.

## Etapa 10 — Testes e publicação

Status: parcialmente concluída.

Já foi feito:

- Compilação TypeScript e build de produção validados.
- Fallback de SPA configurado para o Firebase Hosting.
- Regras do Firestore mantidas no repositório.

Ainda precisa de validação física:

- Teste com o ESP32 e o DHT11 montados.
- Teste do Web Bluetooth em um celular Android compatível.
- Teste do domínio final em HTTPS.
- Publicação das regras após qualquer alteração futura.

## Próxima ordem recomendada

1. Testar cadastro, login Google e sincronização em duas sessões diferentes.
2. Testar o DHT11 conectado ao D4 do ESP32.
3. Criar uma área, um quadrat e uma coleta sem internet.
4. Voltar à internet e confirmar a sincronização no Firestore.
5. Depois dos testes de campo, decidir se fotos, XLSX, PDF e mapa avançado realmente serão necessários.
