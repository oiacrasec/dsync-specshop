# 2001 — Regras de coleta de preços nas fontes

- **Status:** Aceito
- **Data:** 2026-11-07

## Contexto

O núcleo do SPECSHOP é ler preços em sites de terceiros sem conta do cliente (D-31).
Isso toca crimes cibernéticos (CP 154-A: acesso que burle proteção técnica), propriedade
intelectual (Lei 9.610, art. 7º XIII e art. 29: bases de dados e conteúdo de terceiros),
termos de uso de cada fonte (contratual) e LGPD (vendedores pessoa física).

O usuário definiu que o objetivo agora é **implementar**; um advogado será contratado
depois para auditar. Este ADR fixa regras técnicas conservadoras para os conectores e
registra o levantamento feito; **não é parecer jurídico**.

## Decisão

### 1. Regras obrigatórias para todo conector

1. **API oficial primeiro**, com credencial **da aplicação** (nunca do cliente).
2. Sem API, só **páginas públicas** que o `robots.txt` da fonte não bloqueie e que os
   termos não proíbam expressamente para acesso automatizado.
3. **Nunca contornar** login, CAPTCHA, bloqueio por IP/robô, limite de requisições ou
   qualquer proteção técnica. Resposta 401/403/429 ou desafio anti-robô = fonte
   indisponível naquele momento, registrada como estado da pesquisa (nunca vira zero).
4. Limite de requisições próprio por fonte, configurável, e `User-Agent` que identifique
   o SPECSHOP. Sem rotação de IP ou de identidade para escapar de bloqueio.
5. Coletar **apenas dados factuais** da oferta: preço e condições, título, link,
   identificação do vendedor exibida, localização/entrega, condição declarada, nota
   fiscal declarada e data/hora. **Não copiar** imagens, descrições ou avaliações.
6. Toda coleta parte de ação do usuário (D-16); sem varredura ampla de catálogo.
7. Cada fonte tem um interruptor de habilitação: fonte com restrição nova é desligada
   sem deploy de código.

### 2. Dados de vendedores (LGPD)

- **Finalidade:** permitir que o próprio usuário confira a origem do preço (auditoria,
  RF-06). **Base legal:** legítimo interesse (art. 7º IX e art. 10), com minimização.
- **Guardar só:** nome/apelido do vendedor como exibido, identificador do vendedor na
  fonte e localização no nível exibido (cidade/UF). Nada de contato, documento ou perfil.
- Não montar perfil de vendedor nem cruzar vendedores entre fontes.
- Retenção atrelada à da observação de preço (definida na DT-06), com expurgo.

### 3. Situação de cada fonte (levantamento de 2026-11-07)

| Fonte | Achado | Situação para o MVP |
|---|---|---|
| Mercado Livre | [API oficial](https://developers.mercadolivre.com.br/en_us/items-and-searches) com token; relato de 403 em `/sites/MLB/search` para anúncios de outros vendedores e 200 em `/products/search` com token da aplicação ([relato](https://github.com/Maxwbh/Lista_de_Presentes/pull/8)); `robots.txt` bloqueia `/*/p/MLB*/s`, `/perfil/vendedor/` e outros | **Liberada via API**, a confirmar no 0.2 qual endpoint entrega ofertas de terceiros |
| KaBuM! | `robots.txt` libera `/produto/` e bloqueia busca com parâmetros (`/busca/*?`, `*?query=*`) | **Condicionada:** páginas de produto; busca só sem parâmetros; termos a conferir no 0.4 |
| MegaMamute | `robots.txt` libera `/produtos/` e bloqueia `/pesquisa` | **Condicionada:** sem busca própria; precisa de outro meio de achar a página do produto |
| Magazine Luiza | `robots.txt` respondeu 403 ao nosso acesso (proteção anti-robô) | **Indeterminada:** avaliar API de parceiros no 0.4; sem contornar bloqueio |
| Buscapé | `robots.txt` libera páginas de produto e bloqueia busca `*?q=` e `/ajax/pricealert` | **Condicionada**, candidata a histórico (0.3) |
| OLX | `robots.txt` respondeu 403 (proteção anti-robô) | **Indeterminada:** sem contornar bloqueio |
| Facebook Marketplace e lojas Facebook/Instagram | termos da Meta proíbem coleta automatizada sem permissão escrita, inclusive deslogado ([registro da cláusula](https://conductatlas.com/platform/meta/meta-terms-of-service/provision/CA-P-017687/no-automated-data-collection-without-permission/)) | **Bloqueada** no MVP sem permissão da Meta |

"Liberada" e "condicionada" significam compatível com estas regras técnicas, não validação
jurídica. O 0.2 a 0.4 confirmam acesso real e termos de cada fonte.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Esperar parecer jurídico antes de implementar | usuário priorizou implementar; regras conservadoras reduzem o risco até a auditoria |
| Raspagem com rotação de IP, navegador automatizado ou serviços anti-bloqueio | contorna proteção técnica (risco CP 154-A) e viola termos |
| Serviços pagos de terceiros que entregam dados raspados | transfere o risco sem eliminá-lo; reavaliar só se uma fonte for essencial |
| Guardar o perfil completo do vendedor | excede a finalidade da auditoria (LGPD art. 6º III) |

## Consequências

- **Pendência de produto:** o conjunto OLX/Facebook (D-20, D-23) pode ficar vazio no MVP.
  Facebook Marketplace depende de permissão da Meta; OLX de acesso sem contornar bloqueio.
  Levar ao idealizador.
- **Pendência antes da produção:** auditoria jurídica deste ADR e dos termos de cada fonte
  habilitada.
- Termos e `robots.txt` mudam: conferir de novo ao habilitar uma fonte e registrar a data.
- A tela de fontes mostra fonte indisponível/bloqueada como tal, sem simular conexão.

## Revisões

| Data | Mudança |
|---|---|
| 2026-11-07 | Novos testes atualizam o §3: OLX respondeu 200 (`robots.txt` e busca); MegaMamute exibe "Loja em manutenção"; KaBuM! testado. Situação atual por loja em [fontes-de-para.md](../domain/specshop/fontes-de-para.md); Mercado Livre no [ADR 2002](2002-mercado-livre-via-api-de-catalogo.md) |
