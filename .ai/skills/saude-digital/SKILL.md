---
name: saude-digital
description: Garante conformidade de sistemas de saúde com a Lei do Prontuário Eletrônico (13.787/2018), a Lei da Telessaúde (14.510/2022), as regras de assinatura em saúde (Lei 14.063/2020) e a LGPD para dados sensíveis. Use ao implementar prontuário, teleconsulta, receitas, atestados, exames ou qualquer dado de saúde.
---

# Saúde digital

Fontes oficiais:
- Lei 13.787/2018 (prontuário): https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13787.htm
- Lei 14.510/2022 (telessaúde): https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/l14510.htm
- Lei 14.063/2020, arts. 13 e 14: https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14063.htm

> **Regra de ouro:** dado de saúde é **dado sensível** (LGPD art. 5º II): proteção máxima, acesso mínimo e trilha de auditoria completa. Normas éticas dos conselhos profissionais (ex.: CFM) e da ANS/Anvisa complementam esta skill; consultar as vigentes para o caso concreto.

## 1. Prontuário eletrônico (Lei 13.787/2018)

| Regra | Artigo |
|---|---|
| Regido por esta lei **e pela LGPD** | art. 1º |
| Digitalização garante **integridade, autenticidade e confidencialidade** | art. 2º |
| Reproduzir **todas** as informações do original | art. 2º §1º |
| Usar **certificado ICP-Brasil** ou outro padrão legalmente aceito | art. 2º §2º |
| Destruir o papel só após validação por comissão permanente de revisão | art. 3º |
| Proteger contra acesso, uso, alteração, reprodução e destruição não autorizados | art. 4º |
| Controle por **sistema de gerenciamento eletrônico de documentos** | art. 4º, parágrafo único |
| Digitalizado conforme a lei = **mesmo valor probatório** do original | art. 5º |
| Guarda mínima de **20 anos** a partir do último registro | art. 6º |
| Eliminação com sigilo e **registrada**; alternativa: devolver ao paciente | art. 6º §§2º-4º |

Implementação:
- [ ] Prontuário **append-only**: correções viram novo registro, sem apagar o anterior.
- [ ] Assinatura de cada registro clínico (ver `assinatura-eletronica`).
- [ ] Log de **todo acesso** (quem viu qual prontuário e quando).
- [ ] Retenção de 20 anos com rotina de eliminação registrada.
- [ ] Criptografia em repouso e em trânsito; backups com a mesma proteção.

## 2. Telessaúde (Lei 8.080, arts. 26-A a 26-H, incluídos pela Lei 14.510/2022)

- Princípios: **consentimento livre e informado**, direito de **recusar** e ter atendimento presencial, **confidencialidade**, responsabilidade digital (art. 26-A).
- Transmissão **segura** de dados de saúde (art. 26-B).
- O profissional decide se usa ou não a telessaúde (art. 26-C).
- Obedecer **Marco Civil, LGPD, CDC** e Lei do Prontuário (art. 26-G II).
- Empresas intermediadoras de telemedicina registradas no CRM, com diretor técnico médico (Lei 14.510, art. 3º).

Implementação:
- [ ] Registro do **consentimento** do paciente antes da teleconsulta.
- [ ] Opção visível de pedir atendimento presencial.
- [ ] Vídeo e chat com criptografia **ponta a ponta**; gravação só com consentimento e base legal.
- [ ] Teleconsulta registrada no prontuário.

## 3. Receitas, atestados e documentos (Lei 14.063/2020)

| Documento | Assinatura mínima |
|---|---|
| Receita de **medicamento controlado** | **qualificada (ICP-Brasil)** (art. 13) |
| **Atestado médico** eletrônico | **qualificada (ICP-Brasil)** (art. 13) |
| Demais documentos de profissionais de saúde | avançada ou qualificada (art. 14) |

Atos internos do ambiente hospitalar estão fora dessa exigência (art. 13, parágrafo único).

## 4. LGPD para saúde

- Base legal do art. 11 (ex.: tutela da saúde por profissionais ou serviços de saúde, II "f").
- ❌ Compartilhar dados de saúde para **vantagem econômica** é proibido, salvo as exceções legais (art. 11 §4º).
- ❌ Operadoras de plano não podem usar dados de saúde para **seleção de risco** (art. 11 §5º).
- Pesquisa: anonimizar ou pseudonimizar sempre que possível (art. 13).

## Checklist antes de entregar

- [ ] Dado de saúde criptografado, com acesso mínimo e log de todo acesso?
- [ ] Prontuário imutável, assinado e retido por 20 anos?
- [ ] Consentimento para teleconsulta e opção presencial?
- [ ] Receitas controladas e atestados com ICP-Brasil?
- [ ] Nenhum compartilhamento de dado de saúde com fim econômico?
