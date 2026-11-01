# 0043 — Gateway HTTPS com Nginx e certbot no host

- **Status:** Aceito
- **Data:** 2026-10-31

## Contexto

As aplicações de cada projeto escutam só no loopback da VPS (ADR 0042) e o Nginx do
frontend não encaminha `/api/`. Falta um gateway HTTPS por domínio. Foram comparados
Caddy no host, Nginx + certbot no host e Traefik em contêiner; o usuário já opera
Nginx + certbot e escolheu essa opção pela familiaridade no diagnóstico.

## Decisão

- Gateway é o **Nginx do host**, um site por projeto/domínio, a partir do modelo
  versionado `scripts/nginx-site.conf.example` (troca de domínio e portas do `.env`).
- Certificado Let's Encrypt emitido e renovado pelo **certbot** (`--nginx`), que acrescenta
  o bloco 443 e o redirecionamento de HTTP para HTTPS. Renovação conferida com
  `certbot renew --dry-run`.
- `/api/` vai para a porta do backend; o resto, para a do frontend. O gateway sempre
  sobrescreve `X-Forwarded-Proto`, `X-Real-IP`, `X-Real-Port` e `X-Forwarded-For` com os
  dados da conexão; valores enviados pelo navegador não chegam ao Django.
- `client_max_body_size` 10 MB no modelo (núcleo aceita foto até 2 MB); projetos com
  uploads maiores ajustam gateway e backend juntos. Sem log de acesso no gateway, pois
  URLs assinadas de mídia levam a assinatura no caminho.
- Instalação do Nginx/certbot, DNS e firewall (80/443) ficam com a administração do
  servidor; nenhum script altera `/etc/nginx` automaticamente.

## Consequências

Cada novo projeto exige um arquivo de site e um `certbot --nginx -d <domínio>`. A
renovação depende do timer do certbot e do reload do Nginx; falha precisa de
monitoramento. HSTS do Django vale 1 ano por padrão: em testes, usar valor curto
(`DJANGO_SECURE_HSTS_SECONDS`) até validar o domínio. Gateway em contêiner continua
fora do escopo.
