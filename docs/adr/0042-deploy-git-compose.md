# 0042 — Deploy por Git e Docker Compose

- **Status:** Aceito
- **Data:** 2026-10-31
- **Revisão:** 2026-10-31 — geração inicial de chaves a partir do .env.example, solicitada pelo usuário.
- **Revisão:** 2026-10-31 — automação migrada de Bash para Python, com operação remota por Fabric/SSH.

## Contexto

O usuário definiu VPS/servidor local com um ou N projetos derivados, PostgreSQL sempre
em outra VPS, e escolheu atualizar o checkout com Git e construir imagens no servidor.
Solicitou `scripts/` na raiz com setup inicial e atualização pelo diretório da implantação,
além de mídia facilmente acessível para backup por outra máquina.

## Decisão

- `scripts/` contém a orquestração operacional em Python. Fabric (`scripts/requirements.txt`)
  é só da máquina de operação; o worker na VPS usa apenas a biblioteca padrão (Python ≥ 3.11)
  e não entra nas imagens nem no runtime Django. SSH sem PTY nem senha interativa, com
  chave do servidor obrigatoriamente conhecida (servidor desconhecido/alterado é recusado).
  Backend/frontend mantêm Dockerfiles, contextos de build e Compose independentes.
- Setup cria `/srv/deploy/<nome>/` (destino configurável), arquivos de ambiente e atalho
  `deploy.py` para o script versionado. Compose é lido diretamente do repositório, sem cópia ou link.
- Novo backend.env deriva do modelo backend/.env.example. Chaves Django/JWT independentes
  e MFA/Fernet geradas na própria VPS (`secrets`, CSPRNG do sistema), sem exibição nem
  trânsito pelo SSH; arquivo 0600. Credenciais externas
  continuam para preenchimento. Nunca regenerar/sobrescrever chaves de arquivo existente.
- Checkout fica separado (ex.: `/srv/apps/<nome>`); implantação e segredos não entram no Git.
- Uma implantação Compose por projeto: nomes, portas locais, banco e credenciais próprios.
- Deploy: árvore limpa → pull fast-forward → build sequencial → checks → migrations →
  atualização com verificação básica de saúde. Trava por implantação; falha interrompe.
- Mídia filesystem é bind mount do diretório `media/` da implantação. Acesso de backup
  via filesystem/SSH autorizado; não por HTTP público. ADR 0039 continua vigente.
- Gateway HTTPS é infraestrutura compartilhada a alinhar separadamente. Portas das
  aplicações são publicadas apenas no loopback; nenhum banco é criado nesse Compose.
- Terraform e registro de imagens são opcionais e não integram esta entrega.

## Consequências

Build usa CPU/RAM/disco do servidor; capacidade precisa ser medida na implantação.
Recriar contêineres preserva a mídia. Backup consistente exige coordenação com o banco
externo/escritas; contas SSH, ACLs, retenção e restauração ficam sob gestão operacional.
Não há rollback automático nem garantia de atualização sem interrupção. Migrations
incompatíveis precisam de janela de manutenção e backup prévio. Mudanças no script
carregado entram na próxima execução; Compose/Dockerfiles do pull já entram no build.

## Referência

[Procedimento e limites](../deployment/README.md).
