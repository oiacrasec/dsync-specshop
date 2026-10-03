---
name: assinatura-eletronica
description: Garante validade jurídica de documentos e assinaturas eletrônicas conforme a MP 2.200-2/2001 (ICP-Brasil) e a Lei 14.063/2020. Use ao implementar aceite de termos, assinatura de contratos, documentos com validade legal, certificados digitais, integração com órgãos públicos, receitas e atestados.
---

# Assinatura eletrônica e ICP-Brasil

Fontes oficiais:
- MP 2.200-2/2001: https://www.planalto.gov.br/ccivil_03/mpv/antigas_2001/2200-2.htm
- Lei 14.063/2020: https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14063.htm

> **Regra de ouro:** escolher o **nível de assinatura** pelo risco e pela exigência legal do ato, e conseguir **provar autoria e integridade** depois.

## 1. Validade

- Documentos eletrônicos são documentos públicos ou particulares para todos os fins (MP 2.200-2, art. 10).
- Assinados com certificado **ICP-Brasil** → **presumem-se verdadeiros** em relação aos signatários (art. 10 §1º).
- Outros meios (inclusive certificados não ICP) são válidos **se aceitos pelas partes** ou por quem recebe o documento (art. 10 §2º).

## 2. Os 3 níveis (Lei 14.063, art. 4º)

| Nível | O que é | Uso típico |
|---|---|---|
| **Simples** | identifica o signatário ou associa dados a ele (login + aceite, e-mail, SMS) | aceite de termos, ações de baixo risco |
| **Avançada** | ligada ao signatário de forma **unívoca**, sob seu **controle exclusivo**, e **detecta qualquer alteração posterior** | contratos entre partes, documentos de saúde (art. 14) |
| **Qualificada** | usa **certificado ICP-Brasil** | máxima confiança; obrigatória em vários atos |

Devem existir formas de **revogar ou cancelar** o meio de assinatura, sobretudo em caso de comprometimento ou vazamento (art. 4º §2º).

## 3. Quando a qualificada (ICP-Brasil) é obrigatória

- Atos de chefes de Poder e Ministros (Lei 14.063, art. 5º §2º I).
- **Notas fiscais eletrônicas** (exceto pessoa física e MEI) (art. 5º §2º III).
- Transferência e registro de **imóveis** (art. 5º §2º IV).
- **Receitas de medicamentos controlados e atestados médicos** eletrônicos (art. 13).
- Demais documentos de profissionais de saúde: avançada ou qualificada (art. 14).
- Em conflito de normas, prevalece a qualificada (art. 5º §5º).

Com órgãos públicos, cada ente define o nível mínimo (art. 5º): simples para baixo impacto, avançada inclusive em juntas comerciais, qualificada aceita em qualquer interação.

## 4. Implementação

Para **assinatura simples/avançada própria** (aceite no sistema), guardar a **evidência**:
- [ ] identidade autenticada do signatário (com MFA nos atos relevantes);
- [ ] **hash (SHA-256)** do documento exato assinado e sua versão;
- [ ] data e hora confiáveis (preferir **carimbo de tempo**), IP e dispositivo;
- [ ] trilha de auditoria **imutável** do fluxo (envio, visualização, assinatura);
- [ ] documento final com manifesto de assinaturas, verificável depois;
- [ ] qualquer alteração posterior detectável (requisito da avançada).

Para **ICP-Brasil**:
- [ ] Usar padrões **PAdES/CAdES/XAdES** e bibliotecas ou provedores homologados.
- [ ] Validar a cadeia até a **AC Raiz (ITI)** e checar **revogação** (LCR/OCSP).
- [ ] A **chave privada é do titular**, de uso e controle exclusivos (MP 2.200-2, art. 6º, parágrafo único) → ❌ nunca gerar nem guardar a chave privada do usuário no servidor.

## Checklist antes de entregar

- [ ] O nível de assinatura atende à exigência legal do ato?
- [ ] A evidência (hash, tempo, identidade, trilha) está guardada e é verificável?
- [ ] Existe revogação ou cancelamento do meio de assinatura?
- [ ] Nenhuma chave privada de usuário sob nosso controle?
