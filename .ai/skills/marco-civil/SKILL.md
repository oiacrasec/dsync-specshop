---
name: marco-civil
description: Garante conformidade com o Marco Civil da Internet (Lei 12.965/2014) ao projetar, implementar ou revisar a aplicação web/API. Use SEMPRE ao mexer em logs de acesso, registros de IP, termos de uso, política de privacidade, exclusão de conta, conteúdo gerado por usuários, moderação/remoção de conteúdo, comunicações privadas ou atendimento a ordens judiciais.
---

# Marco Civil da Internet (Lei 12.965/2014)

Fonte oficial: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm

> **Nosso papel:** o datasync-core é um **provedor de aplicações de internet** (art. 5º VII). As regras de provedor de **conexão** (arts. 13 e 14) não se aplicam a nós.
>
> Esta skill orienta decisões técnicas; não é parecer jurídico. Casos ambíguos → sinalizar ao usuário e ao jurídico.

## 1. Conceitos (art. 5º)

| Termo | Significado prático |
|---|---|
| **Aplicações de internet** | funcionalidades acessadas por um terminal conectado → **nosso sistema** |
| **Registros de acesso a aplicações** | **data e hora** de uso da aplicação **a partir de um IP** → o que somos obrigados a guardar |
| **Registro de conexão** | início/fim/duração da conexão + IP → obrigação do provedor de conexão, **não nossa** |
| **Endereço IP** | identifica o terminal → também é **dado pessoal** (LGPD) |

## 2. Guarda obrigatória de registros de acesso (art. 15)

Provedor de aplicação **pessoa jurídica, organizado, profissional e com fins econômicos** deve:

- ✅ Guardar os registros de acesso a aplicações **por 6 meses** (mínimo legal).
- ✅ **Sob sigilo**, em **ambiente controlado e de segurança**.
- ✅ Prazo pode ser **estendido** a pedido cautelar de autoridade policial/administrativa/MP (§2º), que tem 60 dias para pedir autorização judicial (art. 13 §§3º e 4º, por remissão). Manter **sigilo** sobre o pedido.
- ✅ Entregar registros **somente com ordem judicial** (§3º e art. 10 §1º).

Implementação:

- [ ] Tabela/stream de **access log** com, no mínimo: `user_id` (se autenticado), **IP**, **porta de origem** (necessária para identificar usuários atrás de CGNAT), **timestamp com fuso (UTC)**.
- [ ] Retenção: **6 meses** e depois **expurgo automático**. Guardar mais que o necessário fere a LGPD (necessidade) e o art. 16 II.
- [ ] Suporte a **legal hold** (congelar o expurgo de registros específicos quando houver pedido de autoridade).
- [ ] Acesso restrito, auditado e criptografado. **Não** expor a times sem necessidade.
- [ ] Relógio sincronizado (NTP): o registro só vale com hora confiável.

## 3. O que é proibido guardar (art. 16)

- ❌ Registros de acesso a **outras** aplicações sem consentimento prévio do titular (I) → nada de rastrear o que o usuário faz fora do nosso sistema (pixels, fingerprinting entre sites etc.) sem consentimento.
- ❌ Dados pessoais **excessivos** em relação à finalidade consentida, salvo as hipóteses da LGPD (II).

## 4. Direitos do usuário → requisitos do produto (art. 7º)

| Direito | Requisito |
|---|---|
| I Intimidade e vida privada | indenização por violação → privacidade por padrão |
| II/III Sigilo das comunicações (fluxo e armazenadas) | mensagens privadas só acessíveis por **ordem judicial**; nada de ler/analisar conteúdo privado sem base legal |
| VI Informação clara nos contratos | termos explicam o regime de proteção dos **registros de acesso** |
| VII Não fornecer dados a terceiros | só com consentimento **livre, expresso e informado** ou hipótese legal |
| VIII Informação sobre coleta e uso | dados usados só para finalidades que justifiquem a coleta, não vedadas em lei e **especificadas nos termos** |
| IX Consentimento expresso | **destacado** das demais cláusulas contratuais |
| X Exclusão definitiva | ao fim da relação, **a pedido**, apagar os dados fornecidos, salvo a guarda obrigatória (art. 15) e as hipóteses da LGPD |
| XI Políticas públicas e claras | termos de uso e política de privacidade publicados e compreensíveis |
| XII Acessibilidade | considerar limitações físico-motoras, perceptivas, sensoriais, intelectuais e mentais |
| XIII CDC | relações de consumo também seguem o Código de Defesa do Consumidor |

👉 **Exclusão de conta:** apagar os dados do usuário, mas **manter os registros de acesso dos últimos 6 meses** (obrigação legal) e expurgá-los ao fim do prazo.

## 5. Termos de uso: cláusulas nulas (art. 8º)

São **nulas** as cláusulas que:

- ❌ ofendam a inviolabilidade e o sigilo das comunicações privadas;
- ❌ em contrato de adesão, não ofereçam o **foro brasileiro** como alternativa para serviços prestados no Brasil.

## 6. Lei brasileira se aplica (art. 11)

Se **qualquer** etapa (coleta, armazenamento, guarda, tratamento) ocorrer no Brasil, ou o serviço for ofertado ao público brasileiro, vale a **lei brasileira**, mesmo com servidor ou empresa no exterior.

## 7. Requisição de dados por terceiros (arts. 10, 22 e 23)

| Pedido | Exigência |
|---|---|
| Registros de acesso (com ou sem dados pessoais) | **ordem judicial** (art. 10 §1º) |
| Conteúdo de comunicações privadas | **ordem judicial**, nas hipóteses legais (art. 10 §2º) |
| Dados cadastrais (qualificação, filiação, endereço) | autoridade administrativa **com competência legal** pode requisitar (art. 10 §3º) |

- Pedido judicial válido tem: indícios do ilícito, justificativa e **período** dos registros (art. 22).
- 👉 Exportar **apenas** o recorte pedido (usuário + período). Nunca o banco inteiro. Registrar a entrega (quem, quando, base).
- Medidas de segurança e sigilo devem ser informadas de forma clara (art. 10 §4º).

## 8. Conteúdo gerado por usuários (arts. 19 a 21)

Se a aplicação permitir publicar conteúdo (comentários, arquivos, perfis):

- **Regra do texto da lei (art. 19):** responsabilidade civil por conteúdo de terceiro só se, **após ordem judicial específica**, não tornarmos o conteúdo indisponível no prazo. A ordem deve identificar o conteúdo com clareza, com **URL ou localização inequívoca** (§1º).
- **Nudez ou ato sexual privado sem consentimento (art. 21):** basta a **notificação do participante** (sem ordem judicial). Remover com diligência, senão respondemos subsidiariamente.
- **Ao remover (art. 20):** avisar o autor do conteúdo com os motivos, para permitir defesa. A pedido dele, substituir o conteúdo pela motivação ou ordem judicial.

⚠️ **Atenção, entendimento do STF:** em 2025 o STF (Temas 533 e 987) declarou o art. 19 **parcialmente inconstitucional**. A responsabilização passou a ser possível, em diversos casos, após **notificação extrajudicial**, e há **dever de cuidado** para conteúdos ilícitos graves. O texto do Planalto **não reflete** essa decisão. Antes de definir o fluxo de moderação, **confirmar o regime vigente com o jurídico**.

Implementação, se houver conteúdo de usuário:

- [ ] Canal de **notificação/denúncia** com identificação do conteúdo (URL/ID) e de quem denuncia.
- [ ] Fluxo de remoção com **prazo**, registro de decisão e motivo.
- [ ] Notificação ao autor + possibilidade de contestação.
- [ ] Prioridade máxima para conteúdo íntimo não consentido (art. 21).

## 9. Sanções (art. 12)

Violar os arts. 10 e 11 (proteção de registros, dados e comunicações) sujeita a: advertência · **multa de até 10% do faturamento do grupo econômico no Brasil** · suspensão temporária · **proibição** das atividades. Isso sem prejuízo de sanções cíveis, criminais e administrativas.

## Checklist antes de entregar

- [ ] Access log grava IP + porta + timestamp UTC + usuário, com retenção de **6 meses** e expurgo automático?
- [ ] Registros sob sigilo, criptografados, com acesso restrito e auditado?
- [ ] Nenhum rastreamento de outras aplicações sem consentimento?
- [ ] Termos e política claros, consentimento **destacado**, foro brasileiro disponível?
- [ ] Exclusão de conta apaga os dados e preserva só a guarda legal?
- [ ] Dados ou registros só saem com **ordem judicial** (ou requisição cadastral legal)?
- [ ] Se há conteúdo de usuário: fluxo de notificação, remoção e aviso ao autor?

## Relação com a LGPD

O Marco Civil define **o que guardar e por quanto tempo** (registros de acesso). A LGPD define **como tratar** esses dados (IP é dado pessoal). Aplicar as duas juntas: guardar o obrigatório, **nada além**, com segurança. Ver skill `lgpd`.
