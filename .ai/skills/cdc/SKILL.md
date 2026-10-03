---
name: cdc
description: Garante conformidade com o Código de Defesa do Consumidor (Lei 8.078/1990), o Decreto do e-commerce (7.962/2013) e o Decreto do SAC (11.034/2022). Use SEMPRE ao implementar ofertas, preços, checkout, planos e assinaturas, cancelamento, cobrança, atendimento, termos de uso, publicidade ou crédito ao consumidor.
---

# CDC: Código de Defesa do Consumidor

Fontes oficiais:
- Lei 8.078/1990: https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm
- Decreto 7.962/2013 (comércio eletrônico): https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm
- Decreto 11.034/2022 (SAC): https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/decreto/d11034.htm

> **Regra de ouro:** o consumidor é **vulnerável** (art. 4º I). Na dúvida, a interface, o contrato e a regra de negócio favorecem o consumidor (art. 47). Software (SaaS, app) é **serviço** (art. 3º §2º).

## 1. Informação e oferta

| Regra | Artigo |
|---|---|
| Informação clara sobre características, preço, **tributos** e riscos | art. 6º III |
| Informação acessível à pessoa com deficiência | art. 6º, parágrafo único |
| Oferta em **português**, correta, clara, precisa e ostensiva | art. 31 |
| O que foi anunciado **obriga** e integra o contrato | art. 30 |
| Recusou cumprir a oferta → consumidor exige cumprimento, equivalente ou rescisão com devolução | art. 35 |

E-commerce: local de destaque no site com (Decreto 7.962, art. 2º):
- [ ] razão social + **CNPJ**;
- [ ] endereço físico e eletrônico;
- [ ] características essenciais e riscos;
- [ ] preço com **todas** as despesas adicionais discriminadas (frete, taxas);
- [ ] condições integrais: pagamento, disponibilidade, prazo de entrega/execução;
- [ ] restrições da oferta de forma clara e ostensiva.

## 2. Fluxo de contratação online (Decreto 7.962, art. 4º)

- [ ] **Sumário do contrato antes de contratar**, destacando cláusulas que limitam direitos (I).
- [ ] Ferramentas para **identificar e corrigir erros** antes de finalizar (II) → tela de revisão.
- [ ] **Confirmação imediata** do aceite (III) → e-mail/tela de confirmação.
- [ ] Contrato disponível para **salvar e reproduzir** logo após contratar (IV) → PDF/download.
- [ ] Atendimento eletrônico eficaz para dúvida, reclamação, suspensão e cancelamento (V).
- [ ] Confirmar recebimento das demandas pelo mesmo meio (VI); responder em até **5 dias** (parágrafo único).
- [ ] Segurança eficaz no pagamento e nos dados (VII).

## 3. Direito de arrependimento: 7 dias

- Compra fora do estabelecimento (internet incluída) → desistência em **7 dias** da contratação ou do recebimento, **sem justificativa** (CDC art. 49).
- Devolução **imediata** de tudo que foi pago, atualizado (art. 49, parágrafo único).
- Arrependimento pela **mesma ferramenta** usada para contratar (Decreto 7.962, art. 5º §1º) → botão no app/site, não só por e-mail ou telefone.
- Cancela contratos acessórios sem ônus (§2º); avisar a operadora do cartão para não lançar ou estornar (§3º); confirmar recebimento na hora (§4º).

## 4. Cancelamento e SAC (Decreto 11.034/2022)

- Cancelamento por **todos os meios** usados para contratar; efeito **imediato**, mesmo com débito pendente (art. 14 I e II).
- Comprovante de cancelamento enviado ao consumidor (art. 14 IV).
- 👉 **Proibido** cancelar só por telefone se a contratação foi pelo app. Nada de *dark patterns* ou retenção forçada.
- SAC gratuito (art. 3º); acesso inicial não condicionado a dados (art. 4º §4º); canais acessíveis (art. 6º).
- Número de protocolo e histórico de demandas sem custo, enviado em até **5 dias** se pedido (art. 12).
- Responder em **7 dias corridos**, de forma clara e completa (art. 13). Cobrança indevida → suspender na hora (art. 13 §3º).
- Guardar o registro do atendimento por **2 anos** (art. 12 §5º); gravação de ligação por **90 dias** (§3º).

> O Decreto 11.034 vale diretamente para setores regulados pelo governo federal; é a **referência de boas práticas** para os demais.

## 5. Práticas proibidas (art. 39)

- ❌ Venda casada (I).
- ❌ Enviar produto ou **ativar serviço sem pedido** → é amostra grátis, não se cobra (III e parágrafo único). Ex.: upgrade automático sem consentimento.
- ❌ Aproveitar a vulnerabilidade (idade, saúde, conhecimento) (IV).
- ❌ Vantagem manifestamente excessiva (V).
- ❌ Repassar informação depreciativa sobre quem exerceu seus direitos (VII).
- ❌ Subir preço sem justa causa (X); prazo de obrigação a critério só do fornecedor (XII); reajuste fora do índice combinado (XIII).

## 6. Publicidade (arts. 36 e 37)

- Publicidade identificável como tal (art. 36) → marcar conteúdo patrocinado.
- ❌ Enganosa, inclusive por **omissão** de dado essencial (art. 37 §§1º e 3º).
- ❌ Abusiva: discriminatória, que explore medo ou **a inexperiência da criança** (art. 37 §2º).

## 7. Contratos e termos de uso

- Não obrigam se o consumidor não teve acesso prévio ou se forem incompreensíveis (art. 46).
- Contrato de adesão: termos claros, fonte **≥ corpo 12**, cláusulas que limitam direitos **em destaque** (art. 54 §§3º e 4º).
- **Cláusulas nulas** (art. 51), entre outras: isentar o fornecedor de responsabilidade (I); impedir reembolso (II); **arbitragem compulsória** (VII); **alterar preço** (X) ou **o contrato unilateralmente** (XIII); cancelar unilateralmente sem dar o mesmo direito ao consumidor (XI); limitar acesso ao Judiciário (XVII).

## 8. Responsabilidade pelo serviço

- Responde **sem culpa** por defeito e por informação insuficiente sobre uso e riscos (art. 14). Defeito = não oferece a segurança esperada → **vazamento e falha de segurança** entram aqui.
- Vício de qualidade → reexecução, devolução ou abatimento, à escolha do consumidor (art. 20).
- Prazo para reclamar: 30 dias (não durável) / 90 dias (durável) (art. 26).

## 9. Cobrança e cadastros

- Cobrança sem ridículo, constrangimento ou ameaça (art. 42); cobrou indevidamente → devolve **em dobro** (parágrafo único).
- Documento de cobrança com nome, endereço e CPF/CNPJ do fornecedor (art. 42-A).
- Cadastros de consumidores (art. 43): acesso do consumidor; dados objetivos e claros; negativação de no máximo **5 anos**; abertura comunicada por escrito; correção em **5 dias úteis**; formatos acessíveis. Ver também `cadastro-positivo`.

## 10. Crédito e superendividamento (arts. 54-B a 54-D)

Na oferta de crédito ou venda a prazo:
- [ ] Mostrar **CET**, juros mensais, encargos de atraso, valor das parcelas, validade da oferta (mínimo 2 dias) e direito à quitação antecipada (54-B).
- [ ] ❌ Prometer crédito "sem consulta" ou ocultar riscos; ❌ assediar, sobretudo idosos e vulneráveis (54-C).
- [ ] Avaliar a capacidade de pagamento de forma responsável (54-D II).

## 11. Sanções (art. 56)

Multa, suspensão do serviço, suspensão de atividade, interdição, contrapropaganda e outras, inclusive cumulativas e cautelares.

## Checklist antes de entregar

- [ ] Preço final com todas as taxas visível **antes** do pagamento?
- [ ] Tela de revisão, confirmação imediata e contrato baixável?
- [ ] Arrependimento em 7 dias pelo mesmo canal, com estorno?
- [ ] Cancelamento tão fácil quanto contratar, com efeito imediato e comprovante?
- [ ] Nenhuma ativação ou cobrança sem pedido explícito?
- [ ] Termos sem cláusulas do art. 51, com limitações em destaque?
- [ ] Publicidade identificada e sem omissões?
- [ ] Canal de atendimento com protocolo e resposta em prazo?
