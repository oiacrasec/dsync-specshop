# Tutorial — instalar um servidor com N projetos

Passo a passo para colocar **dois projetos** (`proj-x` e `proj-y`) na mesma VPS de
aplicações. Para um terceiro projeto, repita a parte 3 com outro nome e outras portas.
Regras e limites completos: [README](README.md) e [ADR 0042](../adr/0042-deploy-git-compose.md).

```text
Sua máquina (operação)                VPS de aplicações                    VPS do banco
──────────────────────               ─────────────────                    ────────────
checkout de proj-x  ──┐  SSH         /srv/apps/proj-x/   (Git)            PostgreSQL
checkout de proj-y  ──┴────────────▶ /srv/apps/proj-y/   (Git)            ├── banco proj_x
python scripts/deploy.py             /srv/deploy/proj-x/ (config+mídia)   └── banco proj_y
                                     /srv/deploy/proj-y/ (config+mídia)
```

| Onde | O que fica | Vai para o Git? |
|---|---|---|
| `/srv/apps/<projeto>/` | checkout do repositório do projeto | é o próprio Git |
| `/srv/deploy/<projeto>/` | `.env`, `backend.env` (segredos), `media/`, atalho `deploy.py` | **nunca** |

Cada projeto tem repositório, banco, credenciais, portas e pasta de mídia próprios.
Nada é compartilhado entre projetos.

## 1. Preparar a VPS (uma vez)

Feito pelo administrador do servidor:

1. Instalar **Docker Engine + Compose ≥ 2.24** ([guia oficial](https://docs.docker.com/engine/install/)),
   **Git** e **Python ≥ 3.11** (só a biblioteca padrão; nada de `pip` na VPS).
2. Criar um usuário de deploy (ex.: `deploy`) com acesso ao Docker. Atenção: o grupo
   `docker` equivale a acesso de root no servidor; dê só a quem faz deploy.
3. Criar as pastas-base com dono `deploy`, sem permissão para outros usuários:

   ```text
   /srv/apps/     (checkouts)
   /srv/deploy/   (implantações)
   ```

4. Dar ao usuário `deploy` acesso **só de leitura** a cada repositório (ex.: uma chave de
   deploy por repositório no provedor Git).

## 2. Preparar sua máquina de operação (uma vez)

1. Num ambiente Python separado do projeto (venv próprio):

   ```bash
   pip install -r scripts/requirements.txt    # Fabric; não vai para a VPS
   ```

2. Ter a chave SSH do usuário `deploy` na sua máquina (no agente SSH ou como chave
   padrão, ex.: `~/.ssh/id_ed25519`). Os comandos usam o **IP** direto:
   `--host deploy@203.0.113.10` (porta diferente de 22: `deploy@203.0.113.10:2222`).

3. Conectar uma vez com `ssh deploy@203.0.113.10` e **conferir o fingerprint** do
   servidor antes de aceitar. O script recusa servidor desconhecido ou com chave alterada.

   Se preferir um nome curto ou uma chave fora do padrão, um alias no `~/.ssh/config`
   também funciona (ex.: `Host apps-vps` com `HostName`, `User` e `IdentityFile`; depois
   `--host apps-vps`).

## 3. Adicionar um projeto (repetir para cada um)

### 3.1 Banco (na VPS do banco)

Pedir ao responsável pelo PostgreSQL um banco e um usuário **exclusivos** do projeto,
com acesso liberado só a partir da VPS de aplicações. Guarde a URL de conexão.

### 3.2 Clonar o repositório (na VPS)

```bash
ssh deploy@203.0.113.10
git clone git@github.com:sua-org/proj-x.git /srv/apps/proj-x
```

### 3.3 Criar a implantação (na sua máquina, dentro do checkout do projeto)

```bash
python scripts/deploy.py --host deploy@203.0.113.10 \
  --repo-dir /srv/apps/proj-x --directory /srv/deploy/proj-x \
  setup --name proj-x
```

O setup cria, **na VPS**:

```text
/srv/deploy/proj-x/
├── deploy.py      ← atalho para scripts/deploy_server.py do checkout
├── .env           ← nome, caminhos e portas desta implantação
├── backend.env    ← configuração do Django; chaves já geradas, modo 0600
└── media/         ← arquivos enviados pelos usuários (persistentes)
```

As chaves Django, JWT e MFA são geradas na própria VPS e não aparecem na tela. Rodar o
setup de novo **não** apaga nem regenera nada: ele recusa implantação já existente.

### 3.4 Preencher a configuração (na VPS)

Em `/srv/deploy/proj-x/backend.env`, troque os `CHANGE_ME`:

| Variável | Exemplo proj-x |
|---|---|
| `DATABASE_URL` | `postgres://proj_x:<senha>@10.0.0.5:5432/proj_x` |
| `DJANGO_ALLOWED_HOSTS` | `x.exemplo.com.br` |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | `https://x.exemplo.com.br` |
| `DJANGO_APP_NAME` (opcional; descomente a linha) | nome exibido do sistema |

Em `/srv/deploy/proj-x/.env`, confira as **portas locais**. Cada projeto precisa de um
par diferente:

| Projeto | `BACKEND_PORT` | `FRONTEND_PORT` |
|---|---|---|
| proj-x | 8000 | 8080 |
| proj-y | 8001 | 8081 |
| proj-z | 8002 | 8082 |

As portas ficam só em `127.0.0.1`; ninguém de fora acessa direto.

### 3.5 Primeiro deploy (na sua máquina)

```bash
python scripts/deploy.py --host deploy@203.0.113.10 \
  --repo-dir /srv/apps/proj-x --directory /srv/deploy/proj-x \
  deploy
```

```text
Checkout limpo? → git pull --ff-only → valida Compose → constrói as imagens
      → check --deploy → migrações → sobe os contêineres → confere a saúde
```

Qualquer falha para tudo antes de trocar os contêineres. O deploy nunca apaga mídia,
volumes ou imagens.

### 3.6 Segundo projeto

Mesmos passos 3.1 a 3.5, trocando o nome e as portas:

```bash
# na VPS
git clone git@github.com:sua-org/proj-y.git /srv/apps/proj-y

# na sua máquina, dentro do checkout do proj-y
python scripts/deploy.py --host deploy@203.0.113.10 \
  --repo-dir /srv/apps/proj-y --directory /srv/deploy/proj-y setup --name proj-y
# na VPS: preencher backend.env do proj-y e trocar as portas para 8001/8081 no .env
python scripts/deploy.py --host deploy@203.0.113.10 \
  --repo-dir /srv/apps/proj-y --directory /srv/deploy/proj-y deploy
```

## 4. Publicar na internet — gateway HTTPS

O gateway é o **Nginx do host** com certificado do **certbot** (ADR 0043). Cada projeto
ganha um site que manda `/api/` para a porta do backend e o resto para a do frontend:

| Domínio | `/api/` → | demais → |
|---|---|---|
| x.exemplo.com.br | 127.0.0.1:8000 | 127.0.0.1:8080 |
| y.exemplo.com.br | 127.0.0.1:8001 | 127.0.0.1:8081 |

### 4.1 Preparar (uma vez, administrador do servidor)

- Instalar **Nginx** e **certbot com o plugin do Nginx** pelo gerenciador da distribuição
  ([certbot](https://certbot.eff.org/instructions)).
- Liberar as portas **80 e 443** no firewall. A 80 é usada para emitir o certificado.

### 4.2 Para cada projeto

1. **DNS:** criar um registro **A** de `x.exemplo.com.br` apontando para o IP da VPS
   (e **AAAA**, se a VPS tiver IPv6). Esperar propagar.
2. **Site:** copiar o modelo do repositório e trocar domínio e portas pelos do `.env`:

   ```bash
   sudo cp /srv/apps/proj-x/scripts/nginx-site.conf.example /etc/nginx/sites-available/x.exemplo.com.br
   sudo sed -i 's/DOMINIO/x.exemplo.com.br/; s/BACKEND_PORT/8000/; s/FRONTEND_PORT/8080/' \
     /etc/nginx/sites-available/x.exemplo.com.br
   sudo ln -s /etc/nginx/sites-available/x.exemplo.com.br /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

3. **Certificado:** o certbot acrescenta o HTTPS e o redirecionamento de HTTP:

   ```bash
   sudo certbot --nginx -d x.exemplo.com.br --redirect
   sudo certbot renew --dry-run      # confere que a renovação automática funciona
   ```

4. **Conferir:** `https://x.exemplo.com.br` abre a tela de login e `https://x.exemplo.com.br/api/v1/me/profile/`
   responde 401 (sem login).

O modelo já sobrescreve `X-Forwarded-Proto`, `X-Real-IP`, `X-Real-Port` e
`X-Forwarded-For` com os dados reais da conexão, aceita envios de até 10 MB e não grava
log de acesso (as URLs de mídia levam assinatura no caminho).

### 4.3 HSTS no primeiro teste

O Django manda HSTS de **1 ano** por padrão: o navegador passa a exigir HTTPS nesse
domínio e nos subdomínios dele. No primeiro teste, use um valor curto no `backend.env`
e só depois volte ao padrão:

```text
DJANGO_SECURE_HSTS_SECONDS=3600
```

## 5. Dia a dia

| Tarefa | Como |
|---|---|
| Atualizar um projeto | `python scripts/deploy.py --host deploy@203.0.113.10 --repo-dir … --directory … deploy` |
| Atualizar direto na VPS | `python3 /srv/deploy/proj-x/deploy.py deploy` |
| Publicar o commit já baixado, sem pull | acrescentar `--no-pull` ao `deploy` |
| Backup da mídia | `rsync` da pasta `/srv/deploy/<projeto>/media/` por um usuário só de leitura ([README](README.md#mídia-e-backup-externo)) |
| Backup das chaves | copiar `backend.env` para local seguro, **separado** da mídia |

Pelo SSH, o fluxo executado é o `scripts/deploy_server.py` do **seu** checkout: mantenha-o
atualizado (`git pull`) antes de operar. Sem a chave MFA original, quem ativou a
verificação em duas etapas não consegue entrar.

Antes de migrações em produção, faça backup do banco. Não há rollback automático.
