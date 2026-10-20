# Preferências do usuário

Aparência da interface escolhida na tela de **Configurações** (menu do avatar), guardada no
próprio usuário para valer em qualquer computador (decisões 65 e 66). Qualquer usuário autenticado,
inclusive o superadmin; não usa `X-Organization-Id`. Respostas `no-store`.

| Método | Rota | Corpo / resposta |
|---|---|---|
| GET | `/api/v1/me/preferences/` | preferências gravadas, completadas com o padrão |
| PUT | `/api/v1/me/preferences/` | conjunto inteiro; responde como o GET |

```json
{"preset": "Aura", "primary": "blue", "dark_mode": false, "menu_mode": "static"}
```

| Campo | Valores | Padrão |
|---|---|---|
| `preset` | `Aura`, `Lara`, `Nora` | `Aura` |
| `primary` | `noir`, `emerald`, `green`, `lime`, `orange`, `amber`, `yellow`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose` | `blue` |
| `dark_mode` | `true` / `false` | `false` |
| `menu_mode` | `static`, `overlay`, `slim`, `compact`, `reveal`, `drawer`, `horizontal` | `static` |

Valor fora da lista ou campo ausente → 422 (nada é gravado). Chaves desconhecidas são ignoradas.
Valor gravado que deixou de existir volta ao padrão na leitura. Grava só a coluna `preferences`
(`users.0005`), um `UPDATE`, sem os locks de contrato e licença.

**LGPD:** só aparência; finalidade de personalização da interface, sem dado pessoal sensível nem
uso para perfilamento.

**Interface:** sem sessão (login), a aparência é a padrão. Ao entrar, o layout busca as
preferências uma vez e aplica; na tela de Configurações as mudanças aparecem na hora, Salvar grava
e sair sem salvar volta ao que estava gravado.
