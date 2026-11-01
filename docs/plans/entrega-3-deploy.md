# Entrega 3 — Deploy em VPS / servidor local

Escopo definido: um ou N projetos derivados por servidor de aplicações, PostgreSQL
em outra VPS, atualização por Git e build local no servidor, sem exigir Terraform
ou registro de imagens. Usuário aprovou scripts na raiz e mídia acessível para backup.
Decisão: ADR 0042. A etapa 5.3/superadmin permanece paralisada; nove avisos do executor
Karma da Entrega 2 continuam documentados, sem decisão de migração.

| Etapa | Escopo | Estado |
|---|---|---|
| 3.1 | Setup/deploy (Python + Fabric/SSH), Dockerfiles/Compose independentes e mídia persistente no host | ✅ Implementado e validado localmente; sem commit |
| 3.2 | Gateway HTTPS: Nginx + certbot no host (ADR 0043), modelo de site por projeto, DNS e headers confiáveis | 🔄 Modelo e docs prontos, validados localmente; teste no subdomínio do usuário pendente |
| 3.3 | Validar implantação integrada, backup/restauração e dimensionamento em servidor | ⬜ Pendente de ambiente/configuração real |

## 3.1 — Critérios e implementação

- Scripts Python versionados na raiz, acionados da máquina de operação por Fabric/SSH com
  chave do servidor validada; atalho no destino, sem copiar Compose.
- Setup preserva arquivos existentes e não imprime segredos; falha em configuração parcial.
- Novo backend.env deriva do .env.example; chaves Django/JWT/MFA geradas na VPS pelo
  `secrets` do Python sem exibição e com modo 0600. Arquivos existentes nunca têm chaves regeneradas;
  credenciais externas/domínio manuais. Geração/formato/preservação/falhas testados.
- Deploy exige checkout limpo, pull --ff-only, trava, build sequencial, checks/migrations
  e up --wait. Não limpa mídia, não faz prune/reset ou rollback automático.
- Diretório media da implantação montado só no backend, mantendo URLs assinadas privadas.
  Backup externo por SSH/rsync e leitura restrita; usuário/chave/ACL não provisionados.
- Configuração permite portas locais distintas para vários projetos; sem PostgreSQL
  local e sem acesso público direto às aplicações. Gateway exige alinhamento separado.
- Testar setup/reexecução, preservação, trava, falhas e pull, Compose real, imagens e
  persistência da mídia após recriação; registrar o alcance da validação nas docs.

## Evidências da 3.1

- 10 testes `unittest` dos scripts (setup, chaves, preservação, trava, checkout sujo, ordem
  e falhas do deploy, quoting do comando remoto, host key) e teste Fabric/Paramiko reais
  contra servidor SSH local. `pip-audit` das dependências de operação sem vulnerabilidades.
- Imagens reconstruídas após a troca de `start.sh` por `start.py` (Gunicorn via exec).
- Compose 2.27.1 validou os contextos, duas identidades/redes, bind mount exclusivo
  do backend e publicação loopback das duas aplicações.
- Imagens construídas com sucesso; backend não root. `check --deploy` sem issues.
- PostgreSQL temporário em contêiner separado: migrations aplicadas, perfil sem
  autenticação devolve 401. Mídia escrita pelo backend visível no host e preservada
  após recriação do contêiner. SPA /perfil 200; /media direto no Nginx 404.
- Sem implantação na VPS, gateway/TLS real, coleta por SSH, restore ou teste de carga.
  Nenhum banco de desenvolvimento/produção foi alterado; nenhum segredo real usado.
- OWASP A01–A10 no diff: mídia privada, credenciais fora das imagens/Git, sem execução
  dos arquivos dotenv, trava e falhas bloqueantes. Auditoria das imagens de sistema
  operacional permanece necessária antes de produção; avisos npm da Entrega 2 mantidos.
