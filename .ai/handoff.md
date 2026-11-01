# Handoff

- **Atualizado em:** 2026-10-31 22:15
- **Agente:** Claude → próximo agente
- **Plano ativo:** docs/plans/entrega-3-deploy.md
- **Último commit:** ver `git log -2` (e6b0cab gateway + este handoff)

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 3.2 Gateway HTTPS — 🔄 modelo/docs prontos e validados localmente; falta o teste real |
| Próximo passo exato | Perguntar ao usuário qual frente seguir: (a) teste real da 3.2 na VPS; (b) preparar o core para o primeiro projeto derivado, **SPECSHOP** (seção abaixo) |
| Aguardando o usuário? | sim — IP/usuário SSH (fingerprint conferido), subdomínio com DNS A, URL do banco, Docker/Git/Python/Nginx/certbot instalados e portas 80/443 liberadas |

## Entrega 3 até aqui (tudo commitado, sem push)

- 3.1 (5a467a6, ADR 0042): `scripts/deploy.py` na máquina de operação (Fabric 3.2.3,
  `pip install -r scripts/requirements.txt` em venv próprio) aciona a VPS por SSH sem PTY,
  com host desconhecido/alterado recusado. `--host usuario@ip[:porta]` ou alias.
  `scripts/deploy_server.py` vai por stdin e usa só a stdlib (Python ≥ 3.11): `setup`
  cria `/srv/deploy/<nome>/` (.env, backend.env com chaves geradas na VPS, media/, atalho
  deploy.py); `deploy` = Git limpo → pull --ff-only → build → check --deploy → migrate →
  up --wait. Backend não root (`backend/scripts/start.py`), portas só em 127.0.0.1.
- Tutorial N projetos: docs/deployment/tutorial.md (dab4aec), exemplo proj-x/proj-y,
  portas 8000/8080, 8001/8081…
- 3.2 (e6b0cab, ADR 0043): usuário escolheu **Nginx + certbot no host** (familiaridade).
  Modelo `scripts/nginx-site.conf.example`: /api/ → backend, resto → frontend; sobrescreve
  X-Forwarded-Proto/X-Real-IP/X-Real-Port/X-Forwarded-For; 10 MB; sem access_log.
  `certbot --nginx -d <dominio> --redirect` + `certbot renew --dry-run`.
- Validação local: 10 testes `cd scripts && python -m unittest test_deploy`; Fabric real
  contra SSH loopback (/tmp/dsync-fabric-smoke.py, deps em /tmp/dsync-fabric-tool);
  smoke de contêineres (/tmp/dsync-container-smoke.sh); `nginx -t` 1.30.6 e gateway local
  na frente das imagens reais (HTTP chega ao Django e vira 301; cabeçalho forjado
  ignorado; SPA 200; 3 MB sem 413). Certificado/HTTPS real não testado.

## Próxima frente: SPECSHOP a partir do core (ADR 0036)

Usuário quer iniciar o SPECSHOP usando o core como base e continuar levando as
atualizações do core aos projetos. Estratégia do ADR 0036 (fork com histórico, remote
`core`, fluxo só core → projeto, projeto só acrescenta, merge por tags) recomendada e
aceita na conversa. Antes de criar o projeto, tratar **um item por vez, com decisão do
usuário** em cada um:

1. ADR 0036 está "Proposto": revisar com o usuário e passar a "Aceito".
2. Criar a primeira tag do core (`v1.0`) no estado aprovado; o SPECSHOP nasce dela.
3. Ponto de extensão para regras de agente do projeto sem editar o `AGENTS.md` do core
   (ex.: `AGENTS.project.md` também carregado pelo hook de `.claude/settings.json`).
4. Ampliar a lista de arquivos do projeto (item 5 do ADR) com `frontend/src/environments/*`
   (appName/companyName/apiBaseUrl) e `design/`.
5. Automatizar com `merge=ours` no `.gitattributes` (+ `git config merge.ours.driver true`).
6. Roteiro em `docs/`: criar projeto (repo vazio + `clone --mirror`/`push --mirror`, remote
   `core`, nome do sistema, domínio em apps novos), atualizar por tag e vender.

Nada disso foi iniciado; nenhum repositório do SPECSHOP foi criado.

## Cuidados para o teste real

- `DJANGO_SECURE_HSTS_SECONDS=3600` no backend.env do teste (padrão é 1 ano, inclui
  subdomínios); voltar ao padrão só depois de validar.
- Sem o gateway o frontend abre mas não fala com a API (o Nginx do frontend não tem /api/).
- Pelo SSH roda o `deploy_server.py` do checkout local: mantê-lo atualizado.
- Nenhum comando remoto sem autorização explícita do usuário. Nada em /etc/nginx é
  automatizado; instalação de Nginx/certbot/Docker fica com o administrador.

## Pendências gerais

- 3.3: implantação integrada, backup/restauração da mídia e banco, dimensionamento.
- Produção: auditoria das imagens-base; backup das chaves (MFA indispensável);
  migrações incompatíveis exigem backup/janela; sem rollback automático.
- 9.1–9.5 concluídas. 5.3/superadmin paralisados até pedido explícito.
- 20 perfis mock ZZ-01..ZZ-20 no CLIENTE X (banco local): apagar só a pedido.
- Conferência visual no navegador das telas recentes ainda pendente.

## Avisos

- Não imprimir/versionar segredos. Push só quando pedido; nunca --amend na main;
  usuário revisa o diff antes de cada commit.
- Python: /home/cesar/Virtual/datasync-core-3.14/bin/python. Suíte completa após
  subconjuntos: `pytest --reuse-db --create-db`.
- Não reativar telas DESABILITADO. FigCraft: `figcraft --control 7710` / MCP `--attach 7710`.
