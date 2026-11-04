# PROMPT — DESENVOLVIMENTO DE SISTEMA WEB DE MONITORAMENTO ECOLÓGICO COM QUADRATS INTELIGENTES

## 1. OBJETIVO DO PROJETO

Desenvolva um **sistema web completo, funcional, moderno e profissional** para coleta, armazenamento, visualização e análise de dados ecológicos obtidos por quadrats inteligentes.

O projeto deverá ser desenvolvido exclusivamente utilizando **React com Vite e TypeScript**, funcionando diretamente pelo navegador, tanto em computadores quanto em celulares.

O quadrat é uma estrutura física utilizada por ecologistas para delimitar áreas de estudo e analisar espécies presentes, principalmente vegetação.

Cada quadrat poderá conter um ESP32 conectado a sensores ambientais, responsáveis por medir automaticamente as condições do ambiente.

O sistema deverá conectar-se ao ESP32 utilizando **Web Bluetooth API (BLE)**, receber as leituras dos sensores em tempo real e permitir que o ecologista complemente essas informações com registros de espécies, fotografias, localização geográfica, data, hora e observações.

Os registros deverão ser armazenados localmente no navegador, mesmo sem internet, e sincronizados com o Firebase quando houver conectividade.

O sistema deverá permitir colaboração entre ecologistas, pesquisadores e administradores, com organização por projetos e equipes.

### Requisitos fundamentais

- Utilizar exclusivamente React + Vite + TypeScript para a aplicação web.
- Não utilizar React Native.
- Não utilizar Expo.
- Não utilizar NativeWind.
- Não exigir instalação de aplicativo Android.
- Funcionar em navegadores modernos.
- Possuir interface responsiva para desktop, tablet e celular.
- Permitir uso em campo com celulares compatíveis com Web Bluetooth.
- Utilizar ferramentas e bibliotecas gratuitas, preferencialmente open source.
- Evitar serviços pagos, assinaturas e APIs que exijam pagamento.
- Possuir integração real com ESP32.
- Armazenar os dados offline.
- Sincronizar os registros com Firebase.
- Permitir exportação científica dos dados.

**Não desenvolver apenas um protótipo visual.**

Implementar um sistema funcional, com código organizado, comunicação Bluetooth real, banco de dados, autenticação, sincronização e firmware do ESP32.

---

## 2. TECNOLOGIAS OBRIGATÓRIAS

### Frontend

Utilizar:

- React.
- Vite.
- TypeScript com tipagem estrita.
- Tailwind CSS.
- React Router DOM.
- Lucide React para ícones.
- React Hook Form para formulários.
- Zod para validações.
- Context API ou Zustand para gerenciamento de estado.
- Recharts para gráficos estatísticos.
- React Leaflet para mapas.
- OpenStreetMap como fonte cartográfica.
- Firebase SDK modular para Web.
- Firebase Authentication.
- Cloud Firestore.
- IndexedDB com Dexie.js.
- Web Bluetooth API.
- Browser Geolocation API.
- APIs nativas de câmera e arquivos do navegador.
- SheetJS ou biblioteca gratuita equivalente para XLSX.
- Geração de CSV com TypeScript.
- jsPDF para relatórios PDF.
- Bibliotecas gratuitas compatíveis para manipulação e compressão de imagens.

### Firmware

Utilizar:

- ESP32.
- Arduino Framework com C++.
- BLE GATT Server.
- Bibliotecas gratuitas para sensores.
- Comunicação serial para diagnóstico.
- Protocolo de comunicação documentado.
- Identificação persistente dos dispositivos.

### Requisitos de compatibilidade

Utilizar versões estáveis e mutuamente compatíveis.

Não utilizar bibliotecas específicas do React Native.

Não utilizar funcionalidades que dependam exclusivamente de APIs Android.

Todas as funcionalidades deverão ser implementadas utilizando tecnologias disponíveis no ambiente web.

### Requisitos de custo

Priorizar os limites gratuitos do Firebase.

Antes de utilizar qualquer serviço que possa exigir faturamento, explicar a limitação e fornecer uma alternativa sem custo.

Não habilitar automaticamente serviços pagos.

Para fotografias, criar uma camada de armazenamento desacoplada, permitindo Firebase Storage quando viável ou outra alternativa gratuita configurável.

Caso a alternativa gratuita não suporte sincronização de fotografias, manter as imagens localmente e informar claramente o estado da sincronização.

---

## 3. ARQUITETURA GERAL DO SISTEMA

Desenvolver uma Single Page Application (SPA) utilizando React e Vite.

O sistema deverá seguir uma arquitetura modular, separando:

1. Interface.
2. Componentes reutilizáveis.
3. Regras de negócio.
4. Serviços.
5. Repositórios.
6. Comunicação Bluetooth.
7. Persistência local.
8. Firebase.
9. Sincronização.
10. Firmware ESP32.

### Módulos principais

O sistema deverá possuir:

1. Autenticação e gerenciamento de usuários.
2. Dashboard principal.
3. Gerenciamento de projetos ecológicos.
4. Gerenciamento de equipes.
5. Cadastro de áreas de pesquisa.
6. Gerenciamento de quadrats e dispositivos ESP32.
7. Conexão Bluetooth.
8. Monitoramento de sensores.
9. Registro de coletas ecológicas.
10. Cadastro de espécies observadas.
11. Histórico de coletas.
12. Visualização de mapas.
13. Gráficos e análises.
14. Exportação de dados.
15. Sincronização offline.
16. Configurações e perfil.

### Navegação

Em computadores, utilizar um menu lateral responsivo.

Em celulares, utilizar uma navegação simplificada, podendo incluir uma barra inferior para as seções principais.

Utilizar React Router DOM para gerenciamento das rotas.

Implementar rotas públicas e protegidas.

O sistema deverá preservar a navegação ao atualizar o navegador, incluindo configuração adequada de fallback para SPA na hospedagem.

---

## 4. AUTENTICAÇÃO

Implementar autenticação utilizando Firebase Authentication.

Permitir:

- Cadastro por e-mail e senha.
- Login por e-mail e senha.
- Login com Google.
- Recuperação de senha.
- Logout.
- Persistência da sessão.
- Atualização do perfil.

### Informações dos usuários

Cada usuário deverá possuir:

- ID único.
- Nome completo.
- E-mail.
- Foto de perfil opcional.
- Data de cadastro.
- Papel na equipe.
- Projetos associados.
- Estado da conta.

### Perfis

**Administrador**

Gerencia usuários autorizados, projetos, equipes, equipamentos, permissões e registros.

**Pesquisador**

Organiza pesquisas, consulta registros, analisa dados e pode editar informações quando autorizado.

**Ecologista**

Realiza coletas, registra espécies, adiciona fotografias e consulta os projetos aos quais pertence.

### Controle de acesso

O acesso deve ser controlado por permissões específicas de cada projeto, e não apenas pelo papel global.

As permissões devem ser validadas pelas regras de segurança do Firestore.

Não confiar apenas nas verificações feitas pelo frontend.

Usuários não autorizados não poderão acessar registros de projetos privados.

A aplicação deverá tratar corretamente sessões expiradas e estados de autenticação offline.

---

## 5. PROJETOS E EQUIPES

Permitir criar diferentes projetos ecológicos.

Exemplo:

- Projeto: Monitoramento da Vegetação.
- Área: Parque Nacional.
- Equipe: Grupo de Pesquisa A.

Cada projeto deverá possuir:

- ID único.
- Nome.
- Descrição.
- Data de criação.
- Responsável.
- Membros.
- Permissões.
- Áreas de pesquisa.
- Quadrats associados.
- Registros ecológicos.

### Equipes

Permitir:

- Criar equipes.
- Adicionar usuários.
- Remover membros.
- Definir permissões.
- Compartilhar registros.
- Consultar dados coletados pelos integrantes.

Um usuário poderá participar de vários projetos.

Cada coleta deverá pertencer obrigatoriamente a um projeto específico.

### Interface

Criar uma página de projetos com cards apresentando:

- Nome do projeto.
- Descrição.
- Quantidade de áreas.
- Quantidade de coletas.
- Número de participantes.
- Data de criação.
- Responsável.

Permitir visualizar detalhes e acessar rapidamente as áreas e coletas do projeto.

---

## 6. CADASTRO DE ÁREAS DE PESQUISA

Criar um módulo para cadastrar locais de estudo.

Cada área deverá conter:

- ID.
- Projeto.
- Nome.
- Descrição.
- Latitude.
- Longitude.
- Data de cadastro.
- Observações.
- Registros associados.

Permitir várias coletas em uma mesma área, realizadas em datas diferentes e utilizando diferentes quadrats.

### Localização

A localização poderá ser obtida automaticamente pela Geolocation API do navegador.

Também deverá ser possível informar latitude e longitude manualmente.

A localização automática deverá exigir autorização do usuário.

Se o navegador não permitir acesso à localização, o sistema deverá continuar funcionando.

Não inventar coordenadas.

### Visualização

Permitir visualizar as áreas cadastradas em um mapa interativo.

Cada marcador deverá abrir um resumo da área e permitir acessar os registros relacionados.

---

## 7. GERENCIAMENTO DE QUADRATS

O sistema deverá suportar múltiplos quadrats inteligentes.

Cada quadrat deverá possuir:

- ID único.
- Nome identificador.
- Identificador físico persistente.
- Identificador BLE quando disponível.
- Código físico do equipamento.
- Modelo do ESP32.
- Versão do firmware.
- Sensores disponíveis.
- Última conexão.
- Estado de conexão.
- Projeto associado.
- Observações.

Exemplo:

- Quadrat: QD-001.
- Equipamento: ESP32-001.
- Sensores: temperatura do ar, umidade do ar, umidade do solo, temperatura do solo, luminosidade e GPS.

### Funcionalidades

Permitir:

- Cadastrar equipamentos.
- Renomear quadrats.
- Associar equipamentos a projetos.
- Identificar equipamentos compatíveis.
- Solicitar conexão Bluetooth.
- Conectar e desconectar.
- Consultar estado da conexão.
- Visualizar última leitura.
- Registrar o equipamento utilizado em cada coleta.

### Identificação

A identidade física do equipamento deverá ser baseada em um ID persistente definido no firmware.

Não depender exclusivamente do identificador fornecido pelo navegador ou do endereço Bluetooth.

A identidade do equipamento deverá ser validada após estabelecer a conexão GATT.

---

## 8. COMUNICAÇÃO BLUETOOTH COM ESP32

Implementar comunicação BLE real utilizando a **Web Bluetooth API**, diretamente pelo navegador.

Não utilizar react-native-ble-plx.

### Compatibilidade

Antes de tentar conectar, verificar:

- Se o navegador possui suporte à Web Bluetooth API.
- Se o contexto é seguro.
- Se o dispositivo possui Bluetooth compatível.
- Se a funcionalidade está disponível.
- Se as permissões necessárias podem ser solicitadas.

Utilizar HTTPS em produção.

Permitir desenvolvimento local utilizando localhost.

Não presumir que qualquer navegador tenha suporte ao Web Bluetooth.

Quando não houver compatibilidade, exibir mensagem explicativa e permitir utilizar as demais funcionalidades do sistema.

### Descoberta

O sistema deverá:

1. Verificar suporte ao Web Bluetooth.
2. Exibir botão "Conectar ESP32".
3. Solicitar a seleção de dispositivo por meio de `navigator.bluetooth.requestDevice()`.
4. Filtrar dispositivos compatíveis pelo serviço GATT personalizado.
5. Exibir os dados de identificação disponíveis.
6. Permitir selecionar um dispositivo.
7. Estabelecer conexão GATT.
8. Descobrir serviços e características.
9. Inscrever-se para receber notificações.

A chamada de seleção deverá ocorrer após uma interação explícita do usuário.

Não criar um scanner contínuo que dependa de APIs inexistentes ou indisponíveis no navegador.

Não prometer acesso à intensidade RSSI nem listagem irrestrita de dispositivos próximos.

### Monitoramento

Após a conexão, o ESP32 deverá transmitir automaticamente as leituras.

Definir intervalo padrão de 5 segundos, configurável no firmware.

O sistema deverá apresentar:

- Temperatura do ar em °C.
- Umidade relativa do ar em %.
- Temperatura do solo em °C.
- Umidade do solo em %.
- Luminosidade em lux.
- Latitude e longitude, quando disponíveis.
- Data e hora da leitura.
- Identificação do equipamento.

### Comportamento

Implementar:

- Atualização de valores em tempo real.
- Indicador de conexão.
- Exibição da última leitura válida.
- Detecção de desconexão.
- Reconexão quando viável.
- Prevenção de conexões duplicadas.
- Encerramento correto de inscrições BLE.
- Validação de medições recebidas.
- Tratamento de pacotes incompletos.
- Mensagens compreensíveis de erro.
- Registro da última medição válida.

Não assumir que a reconexão automática será sempre permitida.

Não prometer manutenção da conexão após o navegador ser fechado ou a aba ser suspensa.

### Protocolo BLE

Criar um serviço GATT personalizado com UUID fixo e documentado.

Criar características para:

- Informações do equipamento.
- Notificações de medições.
- Comandos e configurações.

Utilizar payload JSON compacto em UTF-8, com transporte compatível com as limitações BLE.

Exemplo de medição:

```json
{
  "deviceId": "QD-001",
  "sequence": 152,
  "uptimeMs": 760000,
  "airTemperature": 26.4,
  "airHumidity": 72.5,
  "soilTemperature": 23.1,
  "soilMoisture": 48.2,
  "luminosity": 1350,
  "latitude": -22.47,
  "longitude": -44.45,
  "gpsValid": true
}
```

Esse JSON representa apenas a estrutura esperada.

Não apresentar esses valores como medições reais.

### Fragmentação

Não assumir que um JSON completo caberá em uma única notificação BLE.

Implementar fragmentação e remontagem, ou utilizar um protocolo compacto equivalente.

Considerar:

- MTU negociado.
- Identificador da mensagem.
- Número de sequência.
- Total de fragmentos.
- Tamanho da mensagem.
- Versão do protocolo.
- Verificação de integridade.
- Timeout de remontagem.

Criar um decodificador TypeScript compatível com os dados transmitidos pelo firmware.

O horário oficial de recebimento será registrado pelo navegador.

Quando houver horário GNSS válido, também poderá ser armazenado.

---

## 9. SENSORES DO ESP32

Implementar suporte inicial aos seguintes sensores.

### Temperatura e umidade do ar

Sensor de referência: DHT22 ou equivalente.

Coletar:

- Temperatura em °C.
- Umidade relativa em %.

### Umidade do solo

Sensor capacitivo de umidade.

Permitir calibração de solo seco e úmido.

Converter a leitura analógica para uma porcentagem calibrada.

Informar que a porcentagem depende da calibração e não representa automaticamente o conteúdo volumétrico de água.

### Temperatura do solo

Sensor de referência: DS18B20 à prova d'água.

Coletar temperatura em °C.

### Luminosidade

Sensor de referência: BH1750.

Coletar luminosidade em lux.

### GPS

Prever módulo GNSS externo compatível com ESP32.

O firmware deverá interpretar coordenadas válidas e informar o estado do posicionamento.

Como alternativa, utilizar a geolocalização do navegador quando o ESP32 não possuir módulo GNSS.

### Origem da localização

Registrar:

- GPS/geolocalização do navegador.
- GNSS do ESP32.
- Coordenadas informadas manualmente.

Não inventar coordenadas quando não houver localização disponível.

### Expansibilidade

Organizar o firmware de maneira modular.

Permitir adicionar novos sensores futuramente sem reescrever todo o sistema.

Criar interfaces reutilizáveis para leitura, calibração e validação.

---

## 10. FIRMWARE ESP32

Desenvolver o firmware completo utilizando Arduino Framework em C++.

### Funcionalidades

- Inicialização do ESP32.
- Inicialização dos sensores.
- Inicialização do BLE.
- Divulgação do dispositivo.
- Identificação persistente.
- Leitura periódica dos sensores.
- Envio automático de medições.
- Comunicação por notificações BLE.
- Tratamento de falhas dos sensores.
- Restabelecimento de publicidade após desconexão.
- Monitoramento serial.
- Validação das leituras.
- Configuração do intervalo de envio.

O firmware deverá continuar lendo os sensores quando não houver conexão, respeitando limitações de memória e consumo.

Não exigir Wi-Fi para funcionamento do ESP32.

### Entregáveis

Fornecer:

1. Código completo.
2. Bibliotecas utilizadas.
3. Esquema de ligação.
4. Tabela de pinos.
5. Instruções de instalação.
6. Configuração da placa.
7. Procedimento de gravação.
8. Calibração dos sensores.
9. Testes de comunicação BLE.
10. Diagnóstico de erros.

Evitar pinos reservados, conflitos de barramento e problemas conhecidos de ADC.

Preferir ADC1 para sensores analógicos quando aplicável.

Os modelos de sensores são referências iniciais. Suas implementações devem ser isoladas para permitir substituição após a confirmação do hardware físico.

---

## 11. REGISTRO DE COLETAS ECOLÓGICAS

Criar uma página completa para registro de coletas.

### Informações automáticas

- ID da coleta.
- Projeto.
- Área de pesquisa.
- Quadrat utilizado.
- Usuário responsável.
- Data e hora.
- Latitude.
- Longitude.
- Leituras dos sensores.
- Identificação do dispositivo.

### Informações manuais

- Nome da área.
- Descrição do local.
- Espécies identificadas.
- Quantidade de indivíduos.
- Fotografias.
- Observações gerais.

### Registro das espécies

Permitir adicionar várias espécies em uma mesma coleta.

Cada espécie deverá possuir:

- Nome científico, quando conhecido.
- Nome popular opcional.
- Quantidade de indivíduos.
- Observações.
- Fotografias associadas.

A identificação será manual.

Não implementar identificação automática por inteligência artificial nesta primeira versão.

### Fluxo de coleta

1. Selecionar projeto.
2. Selecionar área.
3. Conectar ao quadrat.
4. Visualizar sensores.
5. Iniciar sessão de coleta.
6. Receber medições automaticamente.
7. Registrar espécies.
8. Adicionar fotografias.
9. Adicionar observações.
10. Finalizar a sessão.
11. Salvar localmente.
12. Sincronizar quando possível.

Durante uma sessão, permitir várias medições ambientais.

Armazenar cada medição individualmente e calcular resumos como:

- Média.
- Mínimo.
- Máximo.
- Quantidade de medições válidas.

O sistema deverá permitir finalizar uma coleta mesmo após perder a conexão com o ESP32, indicando quais medições estão disponíveis.

### Proteção contra perda de dados

Salvar progressivamente os dados da sessão no IndexedDB.

Evitar depender exclusivamente do estado React em memória.

Exibir confirmação antes de descartar uma sessão.

Permitir recuperar sessões incompletas após recarregar a página, quando os dados locais estiverem disponíveis.

---

## 12. FOTOGRAFIAS

Permitir:

- Capturar fotografias utilizando recursos compatíveis do navegador.
- Selecionar imagens existentes no dispositivo.
- Adicionar várias fotografias.
- Visualizar miniaturas.
- Ampliar imagens.
- Excluir fotografias antes de salvar.
- Associar fotografias a espécies ou à coleta.

### Implementação web

Utilizar elementos HTML de upload de arquivos.

Em dispositivos compatíveis, permitir captura pela câmera utilizando as funcionalidades disponíveis no navegador.

Quando necessário, utilizar MediaDevices API, após permissão explícita.

Não depender de bibliotecas do Expo.

### Armazenamento

As imagens deverão ser armazenadas localmente antes de qualquer upload.

Utilizar IndexedDB para armazenar arquivos Blob ou referências locais persistentes adequadas.

Não usar URLs temporárias de objeto como referências persistentes.

Implementar compressão configurável para reduzir o consumo de armazenamento.

Registrar metadados:

- ID.
- Data.
- Tamanho.
- Tipo MIME.
- Associação com a coleta.
- Estado de sincronização.

Preservar as imagens locais enquanto a sincronização não estiver confirmada.

Não armazenar imagens Base64 dentro de documentos do Firestore.

---

## 13. FUNCIONAMENTO OFFLINE

O sistema deverá funcionar em campo mesmo sem conexão com a internet.

### Persistência local

Utilizar **IndexedDB com Dexie.js** como banco de dados local principal para dados criados e gerenciados pela aplicação.

Não utilizar SQLite.

Não utilizar expo-sqlite.

Armazenar localmente:

- Projetos previamente acessíveis.
- Áreas cadastradas.
- Informações dos quadrats.
- Coletas.
- Medições.
- Espécies.
- Observações.
- Fotografias.
- Fila de sincronização.

### Firebase offline

Utilizar o recurso de cache persistente do SDK Web do Firestore quando disponível e apropriado.

Diferenciar claramente:

- Banco local de trabalho em Dexie.
- Cache gerenciado pelo Firestore.
- Documentos confirmados no servidor.

Evitar duplicação de operações e sincronizações concorrentes.

Não presumir que o cache do Firestore substitui completamente o banco local de domínio.

### Sincronização

Quando a conexão retornar:

1. Detectar possível conectividade.
2. Verificar autenticação válida.
3. Identificar registros pendentes.
4. Enviar documentos ao Firestore.
5. Enviar imagens ao armazenamento configurado.
6. Confirmar recebimento pelo servidor.
7. Atualizar estado local.
8. Registrar erros, quando necessário.

Não considerar `navigator.onLine` uma confirmação de acesso à internet ou ao Firebase.

### Estados

- Salvo localmente.
- Aguardando sincronização.
- Sincronizando.
- Sincronizado.
- Erro de sincronização.
- Conflito.

Implementar tentativas automáticas com backoff exponencial.

Evitar duplicidade usando IDs gerados no cliente e operações idempotentes.

Não apagar dados locais antes de confirmar o envio.

Tratar conflitos entre edições realizadas em navegadores ou dispositivos diferentes.

Utilizar controle de versão dos registros.

Não sobrescrever silenciosamente alterações conflitantes.

### Limitações da plataforma web

A sincronização deverá funcionar enquanto o sistema estiver aberto ou quando for reaberto.

Não prometer sincronização contínua em segundo plano.

Não presumir armazenamento local ilimitado.

Utilizar APIs apropriadas para consultar estimativas de armazenamento e solicitar persistência quando suportada.

Alertar sobre o risco de perda de dados ao limpar os dados do navegador ou utilizar navegação privada.

Disponibilizar opção para exportar um backup local.

### PWA opcional

Implementar suporte a Progressive Web App por meio de Vite PWA Plugin, se compatível com a arquitetura.

Permitir:

- Instalação opcional como atalho/aplicativo web.
- Cache dos arquivos estáticos necessários.
- Abertura da interface offline após carregamento prévio.
- Atualização controlada da aplicação.

A instalação como PWA não é obrigatória para utilizar o sistema.

Não confundir cache dos arquivos da PWA com armazenamento das coletas.

---

## 14. DASHBOARD

Criar uma página inicial moderna com informações resumidas.

Exibir:

- Total de projetos.
- Total de coletas.
- Total de espécies registradas.
- Total de quadrats.
- Coletas recentes.
- Equipamentos conectados.
- Registros aguardando sincronização.

### Gráficos

Implementar:

- Temperatura ao longo do tempo.
- Umidade do solo ao longo do tempo.
- Umidade do ar ao longo do tempo.
- Luminosidade ao longo do tempo.
- Quantidade de espécies por área.
- Número de coletas por período.

Utilizar Recharts.

Os gráficos deverão ser:

- Responsivos.
- Interativos.
- Com legendas.
- Com identificação de unidades.
- Com filtros.
- Com informações exibidas ao passar o mouse ou tocar nos dados.

Não misturar medições de sensores diferentes no mesmo eixo sem identificação apropriada.

### Interface

Em desktop, apresentar os gráficos e indicadores em um layout de múltiplas colunas.

Em dispositivos móveis, organizar os componentes verticalmente.

---

## 15. HISTÓRICO DE COLETAS

Criar uma página com todos os registros autorizados.

Cada item deverá apresentar:

- Nome da área.
- Data da coleta.
- Ecologista responsável.
- Quadrat utilizado.
- Quantidade de espécies.
- Estado de sincronização.

### Detalhes da coleta

Permitir abrir uma coleta para visualizar:

- Informações completas.
- Medições ambientais.
- Fotografias.
- Espécies registradas.
- Localização.
- Observações.

### Filtros

Implementar filtros por:

- Período.
- Projeto.
- Área.
- Espécie.
- Ecologista.
- Quadrat.
- Estado de sincronização.

Permitir combinar filtros.

Implementar paginação para evitar carregamento excessivo de registros.

### Apresentação

Em computadores, utilizar tabela responsiva com ordenação.

Em celulares, utilizar cards ou uma apresentação adaptada a telas menores.

---

## 16. MAPAS

Criar uma página de visualização geográfica utilizando **React Leaflet e OpenStreetMap**.

Exibir marcadores das áreas e coletas.

Ao selecionar um marcador, mostrar:

- Nome da área.
- Data.
- Projeto.
- Ecologista.
- Quadrat.
- Resumo da coleta.

Permitir abrir o registro completo.

### Recursos

- Aproximação e afastamento.
- Centralização em uma área.
- Marcadores interativos.
- Seleção de pontos.
- Visualização de coordenadas.
- Filtros por projeto e período.

### Requisitos

Utilizar uma solução que não dependa de API paga.

Respeitar as licenças e políticas de uso dos provedores de mapas.

Não presumir disponibilidade de mapas offline.

Quando não houver acesso aos mapas, continuar exibindo latitude e longitude textualmente.

A aplicação não deverá depender de Google Maps.

---

## 17. EXPORTAÇÃO DE DADOS

Implementar exportação em três formatos.

### CSV

Gerar arquivos CSV compatíveis com Excel.

Utilizar UTF-8 com BOM opcional.

Permitir escolher separador de campos.

Escapar corretamente:

- Aspas.
- Quebras de linha.
- Separadores.
- Caracteres especiais.

### XLSX

Gerar planilhas Excel contendo abas:

- Coletas.
- Medições ambientais.
- Espécies.
- Áreas.
- Quadrats.

Preservar relacionamentos por IDs.

Adicionar:

- Cabeçalhos.
- Unidades de medida.
- Datas formatadas.
- Identificadores dos equipamentos.
- Informações dos responsáveis.

### PDF

Gerar relatório contendo:

- Nome do projeto.
- Período analisado.
- Responsável.
- Resumo das coletas.
- Tabelas.
- Gráficos relevantes.
- Fotografias selecionadas.
- Observações.

Utilizar jsPDF ou alternativa gratuita compatível.

### Opções

Permitir:

- Exportar uma coleta.
- Exportar um projeto.
- Exportar registros filtrados.
- Baixar arquivos pelo navegador.
- Compartilhar arquivos quando a Web Share API estiver disponível.

Utilizar Blob e URLs temporárias para downloads, liberando os recursos após o uso.

Exportar somente registros aos quais o usuário possui acesso.

Quando offline, informar que a exportação considera os dados disponíveis localmente.

---

## 18. MODELAGEM DO FIRESTORE

Propor a seguinte estrutura inicial:

```text
users/{userId}

projects/{projectId}

projects/{projectId}/members/{userId}

projects/{projectId}/areas/{areaId}

projects/{projectId}/devices/{deviceId}

projects/{projectId}/collections/{collectionId}

projects/{projectId}/collections/{collectionId}/measurements/{measurementId}

projects/{projectId}/collections/{collectionId}/species/{speciesRecordId}

projects/{projectId}/collections/{collectionId}/photos/{photoId}
```

Cada documento deverá possuir campos de identificação, criação, atualização e autoria quando aplicável.

### Documento de coleta

```json
{
  "id": "collection-001",
  "projectId": "project-001",
  "areaId": "area-001",
  "deviceId": "QD-001",
  "createdBy": "user-001",
  "startedAt": "2026-10-28T14:00:00Z",
  "finishedAt": "2026-10-28T14:15:00Z",
  "latitude": -22.47,
  "longitude": -44.45,
  "locationSource": "browser",
  "notes": "Área com vegetação rasteira",
  "status": "completed",
  "schemaVersion": 1
}
```

Esse documento é apenas um exemplo da estrutura de dados.

Definir timestamps adequados ao Firestore e serialização local consistente.

Utilizar IDs únicos gerados no cliente para suportar criação offline.

Não colocar milhares de medições em arrays dentro de um único documento.

Criar índices necessários para consultas e filtros.

### Segurança

Implementar regras baseadas na participação e nas permissões dos projetos.

Não utilizar regras públicas como:

```text
allow read, write: if true;
```

Incluir testes de segurança utilizando Firebase Emulator Suite.

### Estrutura local

Criar tabelas/coleções Dexie correspondentes às principais entidades.

Incluir:

- Projetos.
- Áreas.
- Dispositivos.
- Coletas.
- Medições.
- Espécies.
- Fotografias.
- Operações pendentes.
- Metadados de sincronização.

Definir índices locais para consultas frequentes.

Incluir migrações versionadas para mudanças futuras no banco IndexedDB.

---

## 19. INTERFACE E EXPERIÊNCIA DO USUÁRIO

Criar uma interface moderna, científica e profissional.

O sistema deverá parecer uma plataforma real de pesquisa ecológica.

### Identidade visual

Paleta sugerida:

- Verde principal: `#167D57`
- Verde escuro: `#10583E`
- Verde claro: `#E5F4EB`
- Branco: `#FFFFFF`
- Cinza de fundo: `#F5F7F6`
- Texto principal: `#1F2937`
- Azul informativo: `#2563EB`

### Design

Implementar:

- Layout limpo.
- Cards com bordas suaves.
- Ícones consistentes.
- Navegação intuitiva.
- Dashboard com gráficos.
- Indicadores de status.
- Botões de fácil acesso.
- Boa legibilidade em ambientes externos.
- Suporte a telas desktop, tablet e celular.
- Estados de carregamento, erro e ausência de dados.
- Confirmação para ações destrutivas.
- Feedback visual de sincronização.

Utilizar Tailwind CSS como principal sistema de estilização.

Não utilizar NativeWind.

### Navegação principal

O sistema deverá possuir:

- Início.
- Projetos.
- Coletas.
- Mapa.
- Perfil.

As seções de quadrats, dispositivos, equipes e configurações deverão estar acessíveis pela navegação ou por páginas secundárias.

### Desktop

Utilizar:

- Menu lateral.
- Cabeçalho superior.
- Área principal com largura adaptável.
- Cards informativos.
- Tabelas.
- Gráficos responsivos.

### Mobile

Utilizar:

- Navegação adaptada.
- Componentes em coluna.
- Botões adequados ao toque.
- Menus compactos.
- Formulários simplificados.
- Boa visibilidade durante coletas em campo.

### Monitoramento

Criar cards individuais para os sensores:

- Temperatura do ar.
- Umidade do ar.
- Temperatura do solo.
- Umidade do solo.
- Luminosidade.
- Localização.

Cada card deverá apresentar:

- Ícone.
- Nome.
- Valor.
- Unidade.
- Estado da leitura.

Utilizar cores e indicadores para distinguir dados válidos, indisponíveis e desatualizados.

A página de conexão Bluetooth deverá ser rapidamente acessível durante a coleta.

---

## 20. PERMISSÕES E COMPATIBILIDADE WEB

Não implementar permissões específicas do Android.

Gerenciar as permissões utilizando APIs e recursos nativos do navegador.

### Bluetooth

Utilizar Web Bluetooth API.

Verificar `navigator.bluetooth` antes de utilizar os recursos.

Exigir interação do usuário para seleção inicial do dispositivo.

Não tentar contornar restrições de segurança do navegador.

### Localização

Utilizar:

```typescript
navigator.geolocation.getCurrentPosition()
```

Solicitar permissão quando necessário.

Permitir continuar uma coleta sem GPS.

### Câmera e galeria

Utilizar:

- Elementos HTML de seleção de arquivos.
- Atributo `accept="image/*"`.
- Atributo `capture`, quando apropriado e suportado.
- MediaDevices API quando necessário.

Solicitar permissões somente quando a funcionalidade exigir.

### Arquivos

Utilizar APIs de arquivos e downloads do navegador.

Não exigir acesso irrestrito ao sistema de arquivos.

### Conectividade

Implementar verificações de conectividade e disponibilidade dos serviços remotos.

### Compatibilidade

Priorizar navegadores baseados em Chromium com suporte comprovado à Web Bluetooth para coleta conectada ao ESP32.

As demais funcionalidades deverão continuar disponíveis em navegadores sem Web Bluetooth, respeitando suas próprias limitações.

Exibir claramente quando uma funcionalidade não estiver disponível.

### Segurança

Não solicitar permissões desnecessárias.

Não tentar acessar dispositivos Bluetooth sem consentimento.

Não armazenar informações sensíveis em localStorage sem necessidade.

Utilizar HTTPS em produção.

---

## 21. ESTRUTURA DE PASTAS

Organizar o projeto em dois diretórios principais:

```text
quadrat-ecologico/
├── web/
└── firmware/
```

### Aplicação React

Utilizar a seguinte estrutura inicial:

```text
web/
├── public/
│   ├── icons/
│   └── images/
│
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   └── router.tsx
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── charts/
│   │   ├── maps/
│   │   └── sensors/
│   │
│   ├── pages/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── projects/
│   │   ├── teams/
│   │   ├── areas/
│   │   ├── quadrats/
│   │   ├── collections/
│   │   ├── history/
│   │   ├── maps/
│   │   └── settings/
│   │
│   ├── features/
│   │   ├── authentication/
│   │   ├── bluetooth/
│   │   ├── collections/
│   │   ├── devices/
│   │   ├── projects/
│   │   ├── species/
│   │   └── synchronization/
│   │
│   ├── services/
│   │   ├── bluetooth/
│   │   ├── firebase/
│   │   ├── location/
│   │   ├── images/
│   │   ├── exports/
│   │   └── synchronization/
│   │
│   ├── database/
│   │   ├── db.ts
│   │   ├── schema.ts
│   │   └── migrations/
│   │
│   ├── repositories/
│   ├── hooks/
│   ├── contexts/
│   ├── types/
│   ├── utils/
│   ├── constants/
│   ├── assets/
│   ├── styles/
│   ├── tests/
│   └── main.tsx
│
├── firebase/
│   ├── firestore.rules
│   └── firestore.indexes.json
│
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.example
└── README.md
```

### Firmware

```text
firmware/
├── src/
├── include/
├── lib/
├── config/
└── docs/
```

### Organização dos serviços

Separar claramente:

- Serviço Web Bluetooth.
- Serviço de autenticação.
- Serviço Firestore.
- Serviço de imagens.
- Serviço IndexedDB.
- Serviço de sincronização.
- Serviço de localização.
- Serviço de exportação.

Evitar concentrar toda a lógica nos componentes React.

Implementar serviços reutilizáveis e tipados.

---

## 22. TESTES

Implementar testes para:

- Validação de medições.
- Codificação e decodificação BLE.
- Fragmentação e remontagem.
- Criação de coletas.
- Registro de espécies.
- Persistência IndexedDB.
- Sincronização.
- Resolução de conflitos.
- Exportação CSV.
- Exportação XLSX.
- Exportação PDF.
- Permissões de acesso.
- Regras de segurança do Firestore.
- Formulários.
- Navegação.
- Comportamento responsivo.

### Ferramentas

Utilizar preferencialmente:

- Vitest.
- React Testing Library.
- Firebase Emulator Suite.
- Playwright para testes end-to-end.

### Simulação de sensores

Criar um modo de simulação para desenvolvimento sem ESP32 físico.

O modo simulado deverá:

- Estar claramente identificado.
- Ser separado da comunicação real.
- Permitir gerar diferentes cenários.
- Simular erros e desconexões.
- Permitir testar a interface.

Não apresentar dados simulados como medições reais.

### Testes de hardware

Criar instruções para testar o firmware e a integração com o navegador.

Os testes automatizados não substituem os testes em um ESP32 físico.

---

## 23. DOCUMENTAÇÃO

Fornecer README completo contendo:

1. Requisitos de instalação.
2. Versões utilizadas.
3. Instalação do Node.js.
4. Instalação das dependências.
5. Inicialização do projeto Vite.
6. Configuração do Tailwind CSS.
7. Configuração do Firebase.
8. Configuração do login Google.
9. Configuração do Firestore.
10. Regras de segurança.
11. Configuração do armazenamento de imagens.
12. Configuração do IndexedDB.
13. Configuração da Web Bluetooth API.
14. Navegadores compatíveis.
15. Configuração de HTTPS.
16. Configuração do ESP32.
17. Ligação dos sensores.
18. Gravação do firmware.
19. Teste da conexão BLE.
20. Uso offline.
21. Sincronização.
22. Exportação.
23. Build de produção.
24. Publicação em hospedagem gratuita.
25. Resolução de problemas.

### Configuração

Criar arquivo `.env.example`.

Utilizar variáveis de ambiente compatíveis com Vite, seguindo o padrão `VITE_`.

Não incluir credenciais privadas, chaves de serviço ou segredos reais no código.

Documentar quais configurações públicas do Firebase podem ficar no frontend.

Não armazenar segredos em variáveis `VITE_`, pois elas podem ser incorporadas ao build público.

### Execução local

O sistema deverá poder ser executado utilizando:

```bash
npm install
npm run dev
```

Para produção:

```bash
npm run build
npm run preview
```

Explicar como acessar a aplicação por localhost.

Para testes Bluetooth em um celular conectado à rede local, documentar a necessidade de um contexto seguro adequado, sem assumir que um endereço IP HTTP comum será suficiente.

### Hospedagem

Documentar o processo de publicação utilizando uma alternativa gratuita compatível com SPA e HTTPS.

Não exigir servidor Node.js próprio em produção para entregar os arquivos estáticos.

---

## 24. ORDEM DE IMPLEMENTAÇÃO

Desenvolver o sistema em etapas.

### Etapa 1 — Fundação

- Inicializar React com Vite.
- Configurar TypeScript.
- Configurar Tailwind CSS.
- Configurar React Router DOM.
- Criar tema.
- Criar componentes reutilizáveis.
- Criar layout responsivo.

### Etapa 2 — Autenticação

- Configurar Firebase.
- Implementar login.
- Implementar cadastro.
- Implementar Google Login.
- Implementar gerenciamento de sessão.
- Criar rotas protegidas.

### Etapa 3 — Projetos

- Implementar projetos.
- Implementar equipes.
- Implementar permissões.
- Implementar áreas de pesquisa.

### Etapa 4 — Bluetooth

- Verificar suporte do navegador.
- Implementar seleção do ESP32.
- Conectar via Web Bluetooth API.
- Descobrir serviços GATT.
- Receber notificações.
- Interpretar medições.
- Exibir sensores em tempo real.

### Etapa 5 — Coletas

- Criar sessões.
- Registrar espécies.
- Adicionar fotografias.
- Registrar localização.
- Salvar medições.
- Finalizar sessões.

### Etapa 6 — Offline

- Configurar IndexedDB.
- Implementar Dexie.js.
- Criar fila de sincronização.
- Sincronizar com Firestore.
- Tratar conflitos.
- Implementar persistência e recuperação de sessões.

### Etapa 7 — Visualização

- Dashboard.
- Histórico.
- Gráficos.
- Mapas.
- Filtros.
- Detalhes de coletas.

### Etapa 8 — Exportação

- CSV.
- XLSX.
- PDF.

### Etapa 9 — Firmware

- Configurar ESP32.
- Integrar sensores.
- Implementar BLE.
- Testar protocolo.
- Validar integração com o navegador.

### Etapa 10 — Finalização

- Testes.
- Correções.
- Otimização.
- Responsividade.
- Documentação.
- Build web.
- Publicação.

---

## 25. CRITÉRIOS DE ACEITAÇÃO

O projeto somente será considerado funcional quando:

1. Um usuário conseguir cadastrar-se e entrar no sistema pelo navegador.
2. O usuário conseguir criar ou acessar um projeto autorizado.
3. O sistema conseguir selecionar e conectar-se a um ESP32 real em navegador compatível.
4. As leituras reais aparecerem automaticamente na interface.
5. O usuário conseguir iniciar uma coleta.
6. As medições forem associadas à coleta correta.
7. O usuário conseguir registrar várias espécies.
8. Fotografias puderem ser adicionadas.
9. Coordenadas GPS puderem ser registradas.
10. A coleta puder ser salva sem internet.
11. Os registros puderem ser sincronizados posteriormente.
12. Um membro autorizado conseguir visualizar dados compartilhados.
13. As regras do Firebase impedirem acessos não autorizados.
14. Os gráficos apresentarem dados reais armazenados.
15. As coletas puderem ser visualizadas no mapa.
16. CSV e XLSX puderem ser exportados e abertos corretamente.
17. Um relatório PDF puder ser gerado.
18. O sistema puder ser acessado em computadores e celulares.
19. A interface for responsiva.
20. O firmware compilar e transmitir dados compatíveis com o protocolo definido.
21. A comunicação Bluetooth funcionar em pelo menos um ambiente web compatível validado com hardware real.
22. O sistema informar corretamente quando o navegador não suportar Bluetooth.
23. Os dados persistirem localmente após atualizar a página, respeitando as limitações do navegador.
24. O build Vite de produção funcionar corretamente.
25. Nenhuma funcionalidade depender obrigatoriamente de serviço pago sem alternativa gratuita documentada.

---

## 26. INSTRUÇÕES FINAIS PARA A IA

Desenvolva o projeto completo, e não apenas exemplos isolados.

Não crie botões sem funcionalidade.

Não substitua comunicação BLE real por dados simulados na versão de produção.

Não utilize dados fictícios como se fossem registros reais.

Não omita configurações essenciais.

Não deixe funções críticas como TODO.

Não exponha credenciais privadas.

Não implemente regras inseguras no Firebase.

Explique limitações reais dos navegadores.

Quando uma dependência não for compatível, escolha uma alternativa gratuita e justifique.

Priorize uma implementação simples, modular, segura e fácil de manter.

### Restrições obrigatórias

- Não utilizar React Native.
- Não utilizar Expo.
- Não utilizar NativeWind.
- Não utilizar expo-sqlite.
- Não utilizar react-native-ble-plx.
- Não utilizar bibliotecas específicas do Android.
- Não criar backend próprio desnecessariamente.
- Não exigir serviços pagos.
- Não implementar apenas interfaces ilustrativas.
- Não simular funcionalidades como se estivessem conectadas ao hardware.
- Não armazenar dados científicos exclusivamente na memória do React.
- Não utilizar localStorage como banco de dados principal.
- Não depender de conectividade com a internet para concluir uma coleta já iniciada.
- Não utilizar tecnologias desnecessárias que aumentem a complexidade.

### Processo de geração

Antes de escrever os arquivos:

1. Apresente a arquitetura final.
2. Apresente a estrutura de pastas.
3. Apresente o esquema do Firestore.
4. Apresente o esquema do IndexedDB.
5. Documente o protocolo BLE.
6. Liste as dependências escolhidas.
7. Explique o fluxo de sincronização.
8. Explique as limitações de compatibilidade do navegador.

Depois, gere o código completo por etapas, apresentando os arquivos e seus caminhos correspondentes.

Não pule arquivos necessários.

Não apresente trechos isolados que não possam ser integrados ao projeto.

Ao final de cada etapa, forneça instruções para executar e testar.

### Resultado esperado

O resultado final deve ser um **sistema web completo de monitoramento ecológico**, desenvolvido exclusivamente com:

**React + Vite + TypeScript + Tailwind CSS + Firebase + IndexedDB + Web Bluetooth API + ESP32.**

O sistema deverá permitir:

- Autenticação de usuários.
- Gerenciamento de projetos.
- Colaboração entre pesquisadores.
- Cadastro de áreas ecológicas.
- Gerenciamento de quadrats inteligentes.
- Conexão real com ESP32.
- Monitoramento ambiental em tempo real.
- Registro de espécies e fotografias.
- Coleta científica offline.
- Sincronização com Firebase.
- Visualização de mapas.
- Análises estatísticas.
- Exportação CSV, XLSX e PDF.
- Utilização em computadores e celulares compatíveis.

**O projeto deverá ser funcional, responsivo, gratuito para desenvolvimento e uso inicial dentro dos limites dos serviços escolhidos, organizado, seguro e preparado para futuras expansões.**
