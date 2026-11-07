# Configuração necessária no Firebase Console

Estas ações precisam ser feitas pelo proprietário do projeto Firebase:

1. Em **Authentication → Sign-in method**, habilite **Email/Password**.
2. No mesmo local, habilite **Google** e informe o e-mail de suporte do projeto, se solicitado.
3. Em **Authentication → Settings → Authorized domains**, adicione o domínio de produção e mantenha `localhost` para desenvolvimento.
4. Crie o banco em **Firestore Database** e publique o conteúdo de `firestore.rules`.
5. Verifique em **Project settings → Your apps** se o `firebaseConfig` em `firebase.js` corresponde ao aplicativo Web correto.

O login Google usa popup iniciado diretamente pelo botão tanto em computadores quanto em dispositivos móveis. O domínio `quadrats-inteligente-fll.vercel.app` foi incluído nos domínios autorizados do Firebase em 7 de novembro de 2026. Nenhuma chave privada deve ser adicionada ao repositório.

## Regras para projetos e equipes

O arquivo `firestore.rules` foi atualizado para permitir:

- criação de projetos pelo usuário autenticado;
- leitura compartilhada entre membros;
- entrada em uma equipe quando o usuário conhece o código exato;
- criação de áreas, quadrats e coletas pelos membros;
- exclusão e administração pelo responsável do projeto.

Publique novamente as regras depois desta atualização:

```powershell
firebase deploy --only firestore:rules
```

As regras de equipes foram publicadas no projeto `quadrats-inteligente-fll` em 7 de novembro de 2026. Execute o comando novamente sempre que `firestore.rules` for alterado.

## Atenção sobre hospedagem

O site atual está no Vercel. O domínio `quadrats-inteligente-fll.vercel.app` precisa permanecer em **Authentication → Settings → Authorized domains**.

## Atenção sobre fotos

O projeto ainda não envia fotos ao Firebase Storage. Não habilite Storage esperando que essa função esteja pronta; a implementação de fotos e sua política de custo ainda está pendente.
