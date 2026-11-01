# Deploy por Git e Docker Compose

Servidor Linux com Docker Engine/Compose ≥ 2.24, Git e Python ≥ 3.11 (só biblioteca padrão).
A máquina de operação usa Python com Fabric (`scripts/requirements.txt`) para acionar o servidor por SSH.
Cada projeto tem repositório e implantação próprios; PostgreSQL fica em outra VPS.
Passo a passo de um servidor com N projetos: [tutorial](tutorial.md).
O CORE mantém a automação em `scripts/`, autorizada pelo usuário. Os builds continuam
isolados: backend/ e frontend/ são os únicos contextos das respectivas imagens.

## Primeira configuração

Com o repositório já clonado na VPS, por exemplo em `/srv/apps/proj-x`, rode **na
máquina de operação**, num ambiente Python separado do projeto:

```bash
pip install -r scripts/requirements.txt
python scripts/deploy.py --host proj-x-vps \
  --repo-dir /srv/apps/proj-x --directory /srv/deploy/proj-x setup --name proj-x
```

`--host` é um alias do `~/.ssh/config` ou `usuario@servidor`, com o usuário responsável
pelo deploy (acesso ao Docker e permissão para criar o destino). A conexão usa chave/
agente SSH, sem senha interativa nem PTY, e **recusa servidor desconhecido ou com chave
alterada**: registre a chave do servidor em `known_hosts` antes (por exemplo, um `ssh`
manual conferindo o fingerprint). Fabric fica só na máquina de operação; o código do
worker (`scripts/deploy_server.py`) segue por stdin e roda com o Python do servidor. Docker precisa ser local; bind mounts não apontam para
arquivos do cliente de um daemon remoto. Para preparar `/srv/deploy` use o administrador
do servidor, sem tornar a pasta pública nem executar `chmod 777`.

Resultado:

```text
/srv/deploy/proj-x/
├── deploy.py          # atalho local para scripts/deploy_server.py do checkout
├── .env               # identificação, portas e parâmetros de build
├── backend.env        # segredos/configuração Django; modo 0600
└── media/             # arquivos persistentes, fora do Git e das imagens
```

Preencha `.env` e `backend.env`. No segundo projeto, escolha outras portas locais
(ex.: backend 8001/frontend 8081); o primeiro usa 8000/8080 como valores iniciais.
Não compartilhe credenciais, chaves Django/JWT/MFA ou banco entre projetos.
Use aspas simples em valores dotenv com `$` para preservar o valor literal.
O setup não sobrescreve uma implantação já configurada; preserva mídia e segredos.
Uma configuração parcial exige inspeção manual antes de completar/remover arquivos.
Mover o checkout exige atualizar o atalho deploy.py e REPO_DIR no .env.

O setup deriva `backend.env` de `backend/.env.example`, preservando comentários e
opções. Gera automaticamente DJANGO_SECRET_KEY e DJANGO_JWT_SIGNING_KEY com 48 bytes
aleatórios independentes (hex), e DJANGO_MFA_ENCRYPTION_KEY com 32 bytes em base64
URL-safe, formato Fernet. Usa o módulo `secrets` do Python (CSPRNG do sistema), **na
própria VPS**: as chaves não passam pela máquina de operação nem pelo SSH. Falha
interrompe a configuração. Os valores não são exibidos e o arquivo nasce com modo 0600.
Credenciais do banco/domínio ficam como CHANGE_ME; credenciais S3 ou de outros serviços
continuam externas e não são inventadas. Backend.env preexistente é preservado.
Atualizações não regeneram as chaves: mantenha backup seguro, especialmente da chave
MFA, necessária para descriptografar os autenticadores já cadastrados. O setup não
altera o backend/.env local nem realiza rotação de chaves em implantações existentes.

Referências: [secrets](https://docs.python.org/3/library/secrets.html),
[formato da chave Fernet](https://cryptography.io/en/stable/fernet/).

## Gateway HTTPS — requisito separado

Este lote entrega as aplicações, não instala/configura o gateway do servidor.
Cada porta é publicada apenas em `127.0.0.1`. Um gateway no host deverá encaminhar:

- `/api/` para a porta do backend, preservando o caminho.
- Demais rotas para a porta do frontend.
- Sobrescrever X-Real-IP, X-Real-Port e X-Forwarded-Proto com os dados reais da conexão.
  Não confiar nos valores enviados pelo navegador. Backend não pode ficar exposto
  diretamente à internet. Atrás de outro balanceador, alinhar a cadeia de confiança.

Gateway em contêiner exige uma integração de rede própria, ainda por alinhar: o
loopback desse contêiner não é o host. HTTPS, DNS e os headers devem estar corretos
antes de declarar a implantação pronta para produção. O acesso HTTP direto ao backend
é redirecionado para HTTPS pelos settings de produção.

FRONTEND_API_BASE_URL padrão `/api/v1`: o Dockerfile aplica o valor só na cópia
interna do environment de produção durante o build; o checkout permanece intacto.
Os nomes appName/companyName seguem a configuração existente do projeto.

## Atualizar

```bash
python scripts/deploy.py --host proj-x-vps \
  --repo-dir /srv/apps/proj-x --directory /srv/deploy/proj-x deploy
```

Na própria VPS, o atalho faz o mesmo: `python3 /srv/deploy/proj-x/deploy.py deploy`.

O script verifica árvore Git limpa, executa `git pull --ff-only`, valida Compose sem
imprimir segredos, constrói sequencialmente as imagens com bases atualizadas, roda
`check --deploy` (warnings impedem avançar), migrations e `up --wait`. Falha interrompe
a sequência. Não cria usuário/admin de produção ou dados de exemplo.
Uma trava por implantação impede dois deploys simultâneos. Checkout deve ser exclusivo
da implantação. Pelo SSH, o fluxo executado é o `deploy_server.py` da **máquina de
operação** (mantenha-a atualizada); pelo atalho na VPS, é o do checkout, carregado antes
do pull. Compose/Dockerfiles atualizados pelo pull já são lidos no build.
Não execute como root um checkout que outro usuário sem confiança pode alterar.

`deploy --no-pull` usa o commit local (também exige árvore limpa), por exemplo
para primeiro deploy de um checkout já preparado ou restauração de uma versão escolhida.
Nunca faz reset/clean, prune ou down -v. Não há rollback automático de banco/imagens.

Antes de migrations em produção, faça backup e avalie compatibilidade com a versão
que ainda está atendendo; alterações incompatíveis precisam de janela de manutenção.
Backup e coordenação com o banco externo não são automatizados por estes scripts.
`up --wait` verifica HTTP do frontend e abertura da porta Gunicorn; não substitui
validação integrada de login/MFA, uploads, gateway e banco. A execução pode ter breve
indisponibilidade durante a recriação; não oferece atualização sem interrupção.

## Mídia e backup externo

O backend monta `/srv/deploy/proj-x/media/` em `/app/media` por bind mount. Apenas o
backend recebe essa pasta. O filesystem permanece privado (ADR 0039), servido por
URLs assinadas na API, nunca diretamente pelo Nginx ou gateway. Rebuild/recriação
não apagam os arquivos; a automação não muda recursivamente permissões existentes.

O container usa UID/GID do usuário do setup (ou 10001 quando setup executado como root).
Para mídia preexistente, conferir se esse UID/GID tem leitura/escrita. A pasta nova é
0750; não conceder acesso global. O backup não precisa de socket Docker ou acesso aos
segredos do backend. Configure um usuário SSH dedicado com leitura/travessia somente
na mídia, inclusive ACLs herdáveis para novos diretórios/arquivos, e sem escrita.
A criação da conta/chave SSH e ACLs depende dos usuários do servidor e não é automática.

Exemplo de coleta **na máquina de backup**, após configurar esse acesso:

```bash
rsync -a --no-owner --no-group -e ssh \
  backup@servidor:/srv/deploy/proj-x/media/ /backup/proj-x/media/
```

Não usa `--delete`: retenção/expurgo precisam de política definida, inclusive exclusões
legais/LegalHold (ADR 0007). Proteger/encriptar o destino e testar restauração. Uma cópia
com uploads/exclusões em andamento não é snapshot consistente; coordenar pausa de
escritas ou snapshot e backup do banco para recuperar o mesmo ponto no tempo.
As chaves Django/JWT/MFA exigem backup seguro separado da mídia. Não publicar a pasta
para facilitar a coleta. Script de backup externo não está incluído neste lote.

## Validação e limites

- Validação local desta entrega: imagens construídas, `check --deploy` sem issues,
  migrations em PostgreSQL temporário separado e perfil sem autenticação com HTTP 401.
  Backend não root escreveu mídia no host, preservada após recriação; SPA /perfil
  respondeu 200 e acesso /media direto no Nginx recebeu 404. Scripts passaram seus
  testes e Compose confirmou identidades/redes distintas e contextos isolados.
- Sem execução na VPS real, backup por SSH/restauração, gateway/TLS real ou carga.
- Testes da automação: `cd scripts && python -m unittest test_deploy` (temporários, sem
  SSH, banco ou Docker reais). Fabric/Paramiko também validados contra um servidor SSH
  local de teste, com chave do servidor conferida. `pip-audit`: dependências sem
  vulnerabilidades conhecidas (Fabric 3.2.3, Paramiko 5.1.0, cryptography 50.0.2).
- Configuração real: `docker compose --env-file <destino>/.env -f scripts/compose.yaml config --quiet`
  com REPO_DIR/DEPLOY_DIR definidos como caminhos absolutos.
- Build na própria VPS consome CPU/RAM/disco; serviços são construídos sequencialmente.
  Não há dimensionamento/carga medidos neste lote. Workers configuráveis, logs Docker
  limitados a 3 × 10 MB por serviço; mídia cresce conforme uploads, monitorar capacidade.
- Bibliotecas de aplicação mantidas nas faixas atuais; imagens-base também precisam
  de auditoria de segurança própria. Nove avisos npm de ferramentas seguem no relatório
  `docs/security/dependencies.md`; não foram ocultados por esta entrega.

Referências: [bind mounts](https://docs.docker.com/engine/storage/bind-mounts/),
[variáveis Compose](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/),
[produção](https://docs.docker.com/compose/how-tos/production/).
