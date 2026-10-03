---
name: crimes-ciberneticos
description: Orienta segurança e prevenção com base nos crimes informáticos do Código Penal (Lei 12.737/2012, Lei 14.155/2021 e alterações). Use ao implementar autenticação, controle de acesso, antifraude, logs de auditoria, preservação de evidências, testes de segurança, scraping ou qualquer acesso a sistemas de terceiros, e para recusar pedidos que configurem crime.
---

# Crimes cibernéticos (Código Penal)

Fontes oficiais:
- Código Penal (compilado): https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm
- Lei 12.737/2012: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12737.htm

> Esta skill tem dois lados: **(1) nunca construir nada que seja crime** e **(2) proteger o sistema e os usuários** contra esses crimes, preservando evidências.

## 1. Tipos penais que afetam software

| Crime | O que é | Pena | Artigo |
|---|---|---|---|
| Invasão de dispositivo | invadir dispositivo alheio para obter, adulterar ou destruir dados, ou instalar vulnerabilidade | reclusão 1 a 4 anos | CP 154-A |
| — ferramenta de invasão | **produzir, distribuir ou vender** programa para permitir a invasão | mesma pena | 154-A §1º |
| — com obtenção de dados sigilosos | comunicações privadas, segredos comerciais, controle remoto | reclusão 2 a 5 anos (+1/3 a 2/3 se divulgar) | 154-A §§3º-4º |
| Furto mediante fraude eletrônica | furto via dispositivo, com ou sem malware | reclusão 4 a 10 anos | CP 155 §4º-B |
| Fraude eletrônica (estelionato) | golpe com dados obtidos por redes sociais, telefone, e-mail falso (phishing), clonagem | reclusão 4 a 8 anos | CP 171 §2º-A |
| Interrupção de serviço telemático | derrubar ou impedir restabelecimento (ex.: DDoS) | reclusão 2 a 4 anos | CP 266 §1º |
| Perseguição (stalking) | perseguir reiteradamente, por qualquer meio | reclusão 6 meses a 2 anos | CP 147-A |
| Divulgar nudez/sexo sem consentimento | por qualquer meio, inclusive sistema de informática | reclusão 4 a 10 anos | CP 218-C |
| Inserir dados falsos em sistema público | funcionário autorizado | reclusão 2 a 12 anos | CP 313-A |
| Alterar sistema público sem autorização | funcionário | detenção 3 meses a 2 anos | CP 313-B |
| Cartão de crédito/débito falsificado | equiparado a documento particular | — | CP 298, parágrafo único |

Usar servidor no **exterior** aumenta a pena da fraude eletrônica (CP 155 §4º-C I; 171 §2º-B).

## 2. O que NUNCA implementar

- ❌ Backdoors, acesso oculto, "chave mestra" não documentada.
- ❌ Ferramentas de invasão, malware, coleta de credenciais (154-A §1º).
- ❌ Acesso a sistemas ou contas de terceiros **sem autorização expressa** (inclusive scraping que burle login ou proteção técnica).
- ❌ Telas que imitem outra marca para obter dados (phishing).
- ❌ Rastreamento oculto de pessoas (pode configurar perseguição, 147-A).

Testes de segurança (pentest) só com **autorização formal e escrita** do dono do sistema, com escopo definido.

## 3. O que implementar para proteger

- [ ] Autenticação forte: hash de senha robusto, **MFA** para áreas sensíveis e administrativas, bloqueio após várias tentativas.
- [ ] Controle de acesso por papel e menor privilégio; revisão periódica de permissões.
- [ ] Proteção contra OWASP Top 10 (injeção, XSS, CSRF, SSRF, quebra de controle de acesso).
- [ ] Rate limiting e proteção contra abuso/DoS.
- [ ] Antifraude: alertas de login suspeito, confirmação de operações sensíveis, limites e travas.
- [ ] Segurança como **padrão desde o design** (LGPD art. 46 §2º).

## 4. Evidências e cooperação

- [ ] **Trilha de auditoria** imutável (quem, o quê, quando, de onde), com relógio sincronizado.
- [ ] Registros de acesso conforme o Marco Civil (6 meses; ver `marco-civil`).
- [ ] Em incidente: **preservar** logs e evidências (não apagar nem sobrescrever) e acionar o responsável.
- [ ] Dados entregues a autoridades **só com ordem judicial**, exceto dados cadastrais por autoridade competente (Marco Civil, art. 10).
- [ ] Incidente com dados pessoais → comunicação à ANPD e aos titulares (LGPD art. 48; ver `lgpd`).

## 5. Ação penal

Invasão de dispositivo (154-A) depende de **representação** da vítima, salvo contra a administração pública ou concessionárias (CP 154-B).

## Checklist antes de entregar

- [ ] Nenhum acesso oculto, credencial fixa no código ou funcionalidade que facilite invasão?
- [ ] Autenticação, autorização e rate limiting aplicados?
- [ ] Trilha de auditoria gravando ações sensíveis?
- [ ] Testes de segurança dentro de escopo autorizado?
