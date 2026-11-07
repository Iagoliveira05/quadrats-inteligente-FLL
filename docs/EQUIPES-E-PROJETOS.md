# Equipes e projetos

## Como funciona

Cada área, quadrat e coleta pertence ao projeto ativo. Um usuário pode participar de vários projetos e alternar entre eles na tela **Equipe**.

Todos os membros do mesmo projeto podem visualizar os registros compartilhados. Novos registros guardam o identificador e o nome do autor.

## Criar uma equipe

1. Entre no sistema.
2. Abra **Equipe** no menu.
3. Preencha nome e descrição em **Criar projeto**.
4. Copie o código de 8 caracteres exibido no projeto ativo.
5. Envie o código apenas às pessoas autorizadas.

Quem cria o projeto torna-se administrador.

## Entrar em uma equipe

1. Crie ou acesse sua própria conta.
2. Abra **Equipe**.
3. Informe o código recebido.
4. Selecione o novo projeto na lista de projetos.

As áreas, quadrats e coletas daquele projeto serão carregados automaticamente.

## Permissões

- Administrador: cria registros, visualiza dados e pode excluir registros.
- Membro: cria e visualiza os registros compartilhados.
- Pessoa sem o código: não consegue entrar no projeto.
- Pessoa fora do projeto: não consegue consultar as subcoleções do projeto.

## Segurança do código

O código funciona como convite. Ele deve ser enviado somente aos participantes da pesquisa. Caso um código seja divulgado indevidamente, a versão atual ainda não possui revogação automática; nesse caso, crie um novo projeto e compartilhe o novo código.

Os códigos novos combinam letras maiúsculas e números. Para evitar erros de leitura, não são utilizados `O`, `0`, `I` e `1`.

## Estrutura no Firestore

```text
projects/{codigoDoProjeto}
  memberIds[]
  memberProfiles{}
  areas/{areaId}
  quadrats/{quadratId}
  collections/{coletaId}
```

As regras em `firestore.rules` precisam estar publicadas para que a entrada por código e o compartilhamento funcionem.
