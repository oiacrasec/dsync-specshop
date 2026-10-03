---
name: conformidade-legal
description: Roteador de conformidade legal brasileira. Use ANTES de projetar ou implementar qualquer funcionalidade para descobrir quais leis se aplicam (LGPD, Marco Civil, CDC, acessibilidade, ECA Digital, assinatura eletrônica, LAI, Cadastro Positivo, saúde, Banco Central, IA, crimes cibernéticos, propriedade intelectual) e carregar as skills correspondentes.
---

# Conformidade legal: roteador

> **Princípio:** nenhuma mudança pode violar a legislação brasileira. Este roteador diz **quais skills legais carregar** para cada tipo de funcionalidade. Na dúvida entre aplicar ou não uma skill, **aplique**.
>
> As skills orientam decisões técnicas; não são parecer jurídico. Casos ambíguos → sinalizar ao usuário e ao jurídico/DPO.

## 1. Base: valem para todo software

| Skill | Lei | Por quê |
|---|---|---|
| `lgpd` | Lei 13.709/2018 | qualquer dado pessoal (até IP e e-mail) |
| `marco-civil` | Lei 12.965/2014 | toda aplicação de internet: logs de acesso, termos, conteúdo |
| `acessibilidade` | Lei 13.146/2015 | site/app de empresa com sede no Brasil **deve** ser acessível |
| `propriedade-intelectual` | Leis 9.609/98 e 9.610/98 | licenças de dependências, autoria do código, conteúdo de terceiros |
| `crimes-ciberneticos` | Código Penal (Lei 12.737/12 e 14.155/21) | segurança, fraude, evidências, o que nunca fazer |

## 2. Por domínio: carregar quando a funcionalidade envolver

| Se a funcionalidade... | Carregar |
|---|---|
| vende, cobra, assina planos, tem checkout ou atendimento ao cliente | `cdc` |
| pode ser usada por menores de 18 (mesmo que não seja o público-alvo) | `eca-digital` |
| coleta assinatura, aceite formal, contratos ou documentos com validade jurídica | `assinatura-eletronica` |
| atende órgão público ou entidade que recebe recurso público | `lai` |
| faz análise de crédito, score ou consulta a birôs | `cadastro-positivo` + `cdc` |
| trata prontuário, telessaúde, receitas, atestados ou dados de saúde | `saude-digital` |
| é instituição financeira, de pagamento, Pix ou Open Finance | `financeiro-bacen` |
| usa IA, modelos, decisões automatizadas, recomendação ou geração de conteúdo | `inteligencia-artificial` |

## 3. Matriz rápida: funcionalidade → skills

| Funcionalidade | Skills |
|---|---|
| Cadastro / login | `lgpd`, `marco-civil`, `acessibilidade`, `eca-digital`* |
| Logs e auditoria | `marco-civil`, `lgpd`, `crimes-ciberneticos` |
| Checkout / pagamento | `cdc`, `lgpd`, `financeiro-bacen`* |
| Assinatura recorrente / cancelamento | `cdc` |
| Upload de conteúdo / comentários | `marco-civil`, `eca-digital`*, `propriedade-intelectual` |
| Notificações / marketing | `lgpd`, `cdc`, `eca-digital`* |
| Exportação de dados | `lgpd` |
| Integração com terceiros / cloud | `lgpd`, `financeiro-bacen`* |
| Recomendação / perfilamento | `lgpd`, `inteligencia-artificial`, `eca-digital`* |
| Score / aprovação automática | `lgpd`, `cadastro-positivo`, `inteligencia-artificial` |
| Termos de uso / contratos | `cdc`, `marco-civil`, `assinatura-eletronica` |
| Telas / componentes de UI | `acessibilidade` |
| Portal de transparência | `lai`, `acessibilidade` |

\* quando o domínio se aplicar (ver seção 2).

## 4. Procedimento

1. Identificar o que a funcionalidade faz (seções 2 e 3).
2. Ler **todas** as skills aplicáveis em `.ai/skills/<nome>/SKILL.md`.
3. Rodar o checklist de cada uma antes de entregar.
4. Conflito entre leis → vale a **mais protetiva** ao titular/consumidor/criança; sinalizar ao usuário.
5. Pedido do usuário que viole uma lei → **não implementar em silêncio**: explicar o risco, citar o artigo e propor alternativa conforme.

## 5. Manutenção

- Leis mudam. Cada skill cita a fonte oficial: conferir a redação vigente antes de decisões críticas.
- Lei nova relevante → nova skill em `.ai/skills/<nome>/` + linha neste roteador + registro no `AGENTS.md`.
