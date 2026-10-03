---
name: financeiro-bacen
description: Orienta sistemas de instituições financeiras e de pagamento conforme a Resolução CMN 4.893/2021 (e a equivalente Resolução BCB 85/2021 para instituições de pagamento) sobre segurança cibernética e contratação de nuvem. Use ao construir ou integrar sistemas para bancos, fintechs, Pix, pagamentos, Open Finance, ou ao contratar processamento e armazenamento em nuvem para esses clientes.
---

# Financeiro: segurança cibernética e nuvem (Banco Central)

Fontes oficiais:
- Resolução CMN 4.893/2021 (instituições autorizadas pelo BC), alterada pelas Res. CMN 5.117/2024 e 5.274/2025: https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Resolução%20CMN&numero=4893
- Resolução BCB 85/2021 (mesma matéria para **instituições de pagamento**, corretoras, distribuidoras, câmbio e consórcio): https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Resolução%20BCB&numero=85

> **Quando se aplica:** o cliente do sistema é instituição regulada pelo BC, ou o sistema é um serviço relevante contratado por ela. Normas específicas de **Pix**, **Open Finance** e prevenção à lavagem de dinheiro complementam esta skill; consultar os regulamentos vigentes do BC para cada integração.

## 1. Controles mínimos de segurança (Res. 4.893, art. 3º §2º)

Todos devem valer também no **desenvolvimento de sistemas** e na adoção de novas tecnologias (§3º):

| Controle | No sistema |
|---|---|
| Autenticação | MFA; obrigatório para acesso **externo** à rede corporativa (§9º III) |
| Criptografia | em trânsito (TLS) e em repouso |
| Prevenção e detecção de intrusão | WAF, IDS, alertas |
| Prevenção de vazamento | DLP, mascaramento, segregação |
| Proteção contra malware | — |
| **Rastreabilidade** | trilhas de auditoria **fim a fim** de transações, com retenção definida e **segura** (§7º) |
| Backups | gestão de cópias de segurança |
| Vulnerabilidades | testes e varreduras periódicos, **pentest anual independente**, correção tempestiva (§8º e art. 22-A) |
| Controle de acesso | menor privilégio, revisão periódica (sobretudo de terceiros) (§9º) |
| Configuração segura | patches regulares, troca de senhas e padrões de fábrica (§10) |
| Proteção de rede | segmentação, isolando a **produção**; monitorar conexões atípicas à noite e em dias não úteis (§11) |
| Certificados digitais | monitorar uso, proteger chaves privadas, checar revogação (§12) |
| Integração por APIs | requisitos de segurança para interfaces eletrônicas (XIII) |

**Pix e STR** (art. 3º-A): MFA no acesso administrativo; **ambiente Pix isolado** física e logicamente (instância dedicada na nuvem); validar a integridade fim a fim da transação antes de assinar a mensagem; ❌ terceiros não acessam as chaves privadas de assinatura.

## 2. Incidentes (arts. 3º IV, 6º e 20)

- [ ] Registrar, analisar causa e impacto e controlar efeitos de incidentes relevantes, inclusive os vindos de fornecedores.
- [ ] Plano de ação e de resposta a incidentes, com área responsável.
- [ ] Comunicar o **BC** tempestivamente em situação de crise.
- [ ] Testes de continuidade de negócios com cenários de incidente.

## 3. Contratação de nuvem e processamento (arts. 11 a 17)

Antes de contratar um serviço relevante, verificar se o prestador garante: cumprimento da lei, **acesso** da instituição aos dados, confidencialidade, integridade, disponibilidade e recuperação, certificações, relatórios de **auditoria independente**, monitoramento, **segregação dos dados** de cada cliente e bons controles de acesso (art. 12).

O contrato deve prever (art. 17):
- [ ] **países e regiões** onde os dados ficam;
- [ ] segurança na transmissão e no armazenamento;
- [ ] segregação de dados durante o contrato;
- [ ] no fim do contrato: **portabilidade** para o novo prestador e **exclusão** depois de confirmada a integridade;
- [ ] aviso de subcontratação;
- [ ] **acesso do Banco Central** a contratos, dados, backups e códigos de acesso.

Comunicar o BC em até **10 dias** após contratar (art. 15). Nuvem **no exterior** exige convênio entre o BC e o país, ou autorização prévia com **60 dias** de antecedência (art. 16).

## 4. Documentação

Política de segurança e plano de incidentes aprovados pela diretoria, revisados **anualmente** (arts. 9º e 10); relatório anual (art. 8º); documentos guardados por **5 anos** (art. 23).

## Checklist antes de entregar

- [ ] MFA, criptografia, segmentação e trilha de auditoria fim a fim?
- [ ] Logs de transações retidos com segurança e prazo definido?
- [ ] Pentest anual e correção de vulnerabilidades no processo?
- [ ] Nuvem com região definida, segregação, portabilidade e acesso do BC no contrato?
- [ ] Integração com `lgpd` (dados financeiros) e `cdc` (cliente consumidor)?
