# Configuração necessária no Firebase Console

Estas ações precisam ser feitas pelo proprietário do projeto Firebase:

1. Em **Authentication → Sign-in method**, habilite **Email/Password**.
2. No mesmo local, habilite **Google** e informe o e-mail de suporte do projeto, se solicitado.
3. Em **Authentication → Settings → Authorized domains**, adicione o domínio de produção e mantenha `localhost` para desenvolvimento.
4. Crie o banco em **Firestore Database** e publique o conteúdo de `firestore.rules`.
5. Verifique em **Project settings → Your apps** se o `firebaseConfig` em `firebase.js` corresponde ao aplicativo Web correto.

O login Google já está implementado em `src/pages/Login.tsx`, usando `signInWithPopup`. Nenhuma chave privada deve ser adicionada ao repositório.

## Atenção sobre hospedagem

O `BrowserRouter` exige fallback para `index.html` no servidor. Ao publicar em Firebase Hosting, mantenha uma configuração de rewrite para `/**` apontando para `/index.html`.

## Atenção sobre fotos

O projeto ainda não envia fotos ao Firebase Storage. Não habilite Storage esperando que essa função esteja pronta; a implementação de fotos e sua política de custo ainda está pendente.
