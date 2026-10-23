# Perfil do usuário

Tela **Perfil** (menu do avatar, `/perfil`, etapa 9.2, decisões 69, 77 e 80). Qualquer usuário
autenticado, inclusive o superadmin; sem `X-Organization-Id`. Respostas `no-store`.

| Método | Rota | Corpo / resposta |
|---|---|---|
| GET | `/api/v1/me/profile/` | `{username, name, time_zone, avatar_url}` |
| PUT | `/api/v1/me/profile/` | `multipart/form-data`: `name`, `time_zone`, `avatar` (arquivo, opcional), `remove_avatar` (`true`, opcional); responde como o GET |

A **senha não entra aqui**: `POST /api/v1/auth/change-password/` (a tela chama depois do PUT, só se
a aba Senha foi preenchida).

| Campo | Regra |
|---|---|
| `username` | só leitura |
| `name` | obrigatório, até 150, espaços externos removidos |
| `time_zone` | nome IANA (`zoneinfo`); o do sistema (`America/Sao_Paulo`) é guardado vazio. Só muda a exibição: o banco segue em UTC |
| `avatar` | JPG, PNG ou WebP até 2 MB, tipo pelo conteúdo; regravado em WebP 256 × 256 sem metadados (EXIF/GPS) |
| `avatar_url` | link assinado temporário (ADR 0039); vazio sem foto. Arquivo em `<public_id do contrato>/avatars/` (`system/avatars/` para superadmin) |

Inválido → 422 em `errors.<campo>`, e nada é gravado. Trocar ou remover a foto apaga a anterior
depois do commit; excluir o usuário apaga a foto (LGPD: finalidade de identificação visual, opcional).
