# Quadrats Inteligentes — App Mobile (Capacitor / Android)

Aplicativo mobile independente do site web, estruturado com **Capacitor + React + Vite + TypeScript**, pronto para abrir no **Android Studio** e funcionar **100% offline em campo**.

> O código do site web na raiz do repositório **não foi alterado**. Toda a camada mobile e o projeto Android ficam isolados nesta pasta `mobile/`.

## Recursos offline e nativos incluídos

- **Abertura 100% offline:** código e fontes (`DM Sans` e `Manrope`) embutidos diretamente no `.apk`.
- **Modo Offline sem conta:** na tela de login, toque em **Continuar sem internet (Modo Offline)** para registrar áreas, quadrats, coletas 5×5, fotos e leituras do ESP32 mesmo sem nunca ter conectado à internet.
- **Bluetooth BLE nativo (`@capacitor-community/bluetooth-le`):** conecta diretamente ao ESP32 (`QUADRAT_SERVICE_UUID`) offline, com permissões Android 12+ (`BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`) e Android ≤ 11 configuradas.
- **GPS nativo (`@capacitor/geolocation`):** captura coordenadas por satélite sem internet.
- **Mapa offline com cache automático:** os blocos (tiles) do mapa visualizados são salvos localmente no IndexedDB, e há um botão **Offline** no mapa para baixar previamente a região de estudo antes de ir a campo.
- **Fotos comprimidas offline (IndexedDB):** captura pela câmera traseira ou galeria com compressão local e visualização em tela cheia.
- **Exportação CSV nativa (`@capacitor/filesystem` + `@capacitor/share`):** abre o menu nativo de compartilhamento/salvamento do Android.
- **Sincronização automática:** quando autenticado com conta Firebase, os registros feitos offline ficam na fila local e sincronizam ao recuperar a internet.

## Como abrir no Android Studio e gerar o `.apk`

### 1. Atualizar o build web e sincronizar com o Android

Sempre que alterar algum arquivo em `mobile/src/`, rode dentro da pasta `mobile/`:

```powershell
cd mobile
npm run cap:sync
```

### 2. Abrir no Android Studio

Você pode abrir diretamente pelo comando:

```powershell
cd mobile
npm run cap:open
```

Ou manualmente no **Android Studio**:
1. Clique em **File → Open**.
2. Selecione a pasta `mobile/android`.
3. **Importante (JDK 21):** o **JDK 21** já foi baixado em `C:\Users\leohi\.jdks\jdk-21.0.13.1+2` e o `android.overridePathCheck=true` já está configurado em `mobile/android/gradle.properties`. Se o Android Studio usar o JBR 25 por padrão, vá em **File → Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK** e selecione **jdk-21.0.13.1+2**.
4. Aguarde o Gradle sincronizar (se pedir para baixar o **Android SDK Platform 36**, aceite o download automático).
5. Conecte seu celular Android por USB (com **Depuração USB** ativada) e clique em **Run (▶)**, ou vá em **Build → Build Bundle(s) / APK(s) → Build APK(s)** para gerar o arquivo `.apk`.

## Scripts disponíveis (`mobile/`)

- `npm run dev` — pré-visualiza a versão mobile no navegador local.
- `npm run build` — valida TypeScript e gera `mobile/dist`.
- `npm run lint` — executa o ESLint.
- `npm run cap:sync` — compila `mobile/dist` e sincroniza assets e plugins com `mobile/android`.
- `npm run cap:open` — abre `mobile/android` no Android Studio.
