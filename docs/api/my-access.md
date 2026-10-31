# Minhas permissões

`GET /api/v1/me/access/` — retrato somente leitura do acesso do próprio usuário
de contrato, para a aba **Minhas permissões** do Perfil (9.5, decisões 89–91).
Exige JWT válido e contrato disponível. Não exige nem interpreta `X-Organization-Id`.
Não recebe identificador de outra conta e não oferece operações de escrita.
Todas as respostas são `no-store`.

```json
{
  "organizations": [
    {
      "public_id": "019a0000-0000-7000-8000-000000000001",
      "name": "Matriz",
      "profiles": [
        {"public_id": "019a0000-0000-7000-8000-000000000002", "name": "Leitor"}
      ],
      "permissions": ["organization:view"],
      "all_permissions": false
    }
  ]
}
```

- `organizations`: todas as organizações **acessíveis**, ativas e não excluídas do
  próprio contrato, em ordem de nome. É o retrato composto do acesso, como o conjunto
  de organizações de `/me/organizations/`, sem paginação por organização.
- `profiles`: somente perfis ativos/não excluídos com atribuições ativas que alcançam
  aquela organização; sem duplicatas. Não inclui perfis atribuíveis ou de outras contas.
  A lista pode estar vazia quando o acesso vem de permissões avulsas.
- `permissions`: códigos efetivos ordenados, calculados pelo mesmo avaliador da
  autorização; respeita exclusões de organização e de permissão, inclusive globais.
  Outra concessão pode restaurar o que uma excluiu. Pode estar vazia mesmo com acesso à organização.
- `all_permissions`: perfil essencial do administrador alcança a organização. Concede
  todos os códigos atuais e futuros do registry. A interface mostra o aviso de acesso
  total e não repete a grade de ações. O campo é calculado no servidor.
- Conta sem atribuições ativas: `{"organizations": []}`.

Os rótulos de recursos/ações vêm do catálogo `/api/v1/permissions/`. Este retrato é
informativo: cada endpoint continua autorizando sua própria operação. Não substitui
`/me/permissions/`, que alimenta menus/botões no contexto ativo, nem
`/users/{public_id}/access/`, usado pelo administrador para editar concessões.

O frontend carrega ao abrir a aba pela primeira vez, destaca/abre a organização atual
e reutiliza o resultado enquanto o Perfil está aberto; falhas oferecem nova tentativa.
O resultado fica em memória no componente, sem persistência em storage. Troca de
contexto/sessão mantém os controles centrais do ADR 0035. Superadmin não vê a aba.

Erros seguem RFC 9457: 401 sem autenticação, 403 para contrato indisponível ou troca
obrigatória de senha, conforme os tipos existentes. Superadmin recebe 403
`permission-denied`, antes de consultar concessões. Métodos de escrita retornam 405.

Performance: quatro SELECTs de dados de acesso quando há perfis e organizações,
sem crescimento com o número de organizações/atribuições, além da autenticação.
Sem INSERT/UPDATE/DELETE ou locks de linha. Concessões são carregadas uma vez e
avaliadas em memória por organização; processamento e resposta crescem com os dados
do retrato. O teste com 30 organizações/perfis adicionais cobre consultas constantes,
sem afirmar capacidade sob carga de produção.
