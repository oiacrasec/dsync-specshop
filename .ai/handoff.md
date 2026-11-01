# Handoff

- **Atualizado em:** 2026-10-31
- **Agente:** Claude (concluiu a migração Python iniciada pelo Codex)
- **Plano ativo:** docs/plans/entrega-3-deploy.md
- **Último commit:** 593315e — fix(frontend): reduce dependency security warnings
- **Trabalho atual:** 3.1 implementada/validada, sem commit; usuário revisa antes de commitar.

## Situação

| Item | Estado |
|---|---|
| Etapa atual | 3.1 ✅ base local de deploy Git/Compose e mídia persistente |
| Próximo passo exato | Revisar arquivos da 3.1; commit quando solicitado. Depois alinhar gateway HTTPS (3.2), sem implementação automática |
| Aguardando o usuário? | revisão e decisões sobre próxima etapa; sem autorização de deploy externo |

## Implementado / validado

- Usuário escolheu Git pull/build na VPS, aprovou scripts/ na raiz e pediu mídia
  acessível no host para backup por outra máquina. ADR 0042 registra o modelo.
- Automação em Python (os .sh foram removidos). Na máquina de operação:
  `pip install -r scripts/requirements.txt` (Fabric 3.2.3, só operação) e
  `python scripts/deploy.py --host <alias-ssh> --repo-dir /srv/apps/x --directory /srv/deploy/x setup --name x | deploy [--no-pull]`.
  SSH sem PTY/senha interativa; host desconhecido/alterado recusado (RejectPolicy).
- `deploy_server.py` vai por stdin e roda com Python ≥ 3.11 da VPS (só stdlib): setup
  cria .env, backend.env (do .env.example; chaves Django/JWT/MFA via `secrets` na VPS,
  0600, sem exibir), media/ e atalho `deploy.py`; preserva o que existe. Deploy exige Git
  limpo, pull --ff-only, trava, config, build sequencial, check --deploy, migrate, up --wait.
- Compose/Dockerfile por aplicação; Python 3.14.10, Node 24 LTS, Nginx 1.30.6. Backend
  não root, `backend/scripts/start.py` (collectstatic + exec Gunicorn). Mídia bind mount
  só no backend; URLs assinadas (ADR 0039). Portas só em loopback; sem banco no Compose.
- Validação (Claude, 31/10 ~21h): 10 testes `cd scripts && python -m unittest test_deploy`;
  Fabric/Paramiko reais contra SSH local (/tmp/dsync-fabric-smoke.py, deps em
  /tmp/dsync-fabric-tool); imagens reconstruídas com start.py e smoke de contêineres ok
  (/tmp/dsync-container-smoke.sh: check --deploy, API 401, mídia persistente, SPA 200,
  /media 404); `compose config` ok; ruff do backend e dos scripts ok; pip-audit sem vulns.
- Nenhuma conexão com VPS real; nenhum banco/segredo real usado.
- Docs: docs/deployment/README.md, ADR 0042 (revisão Python/Fabric), plano, log.

## Cuidados / próximas frentes

- Gateway HTTPS ainda não escolhido/configurado; precisa encaminhar /api/ e demais
  rotas, sobrescrever IP/porta/protocolo reais. Gateway em contêiner exige rede própria.
- PostgreSQL sempre em outra VPS; um ou N projetos por VPS de aplicações.
- Backup: mídia acessível via SSH/rsync com leitura restrita e ACLs herdáveis; criação
  de usuário/chave/ACL depende do servidor. Segredos precisam de backup separado.
  Coordenar banco/escritas para snapshot consistente, retenção/LegalHold (ADR 0007).
- Migrações incompatíveis exigem backup/janela de manutenção; sem rollback automático
  ou garantia de atualização sem interrupção. Não declarar pronto para produção ainda.
- Relatórios locais: /tmp/dsync-deploy-{backend,frontend}-build.log e
  /tmp/dsync-container-smoke.log. Testes reproduzíveis em scripts/test_deploy.py.
- Entrega 2: npm 101 → 9 moderadas do Karma; produção 21 → zero; Python 39 → zero
  no lote anterior. Detalhes em docs/security/dependencies.md; sem decisão de migração.
- 9.1–9.5 concluídas (b54a38b). 5.3/superadmin paralisados até pedido explícito.
- Não imprimir/versionar segredos. Push só quando pedido; nunca --amend na main.
- Python SDK: /home/cesar/Virtual/datasync-core-3.14/bin/python; consultar PyCharm antes
  de cada comando. Suíte completa após subconjuntos: --reuse-db --create-db.
- Não reativar telas DESABILITADO. 20 mocks ZZ-01..ZZ-20 no CLIENTE X: apagar só a pedido.
- FigCraft --control 7710 / MCP --attach 7710; salvar após editar.
