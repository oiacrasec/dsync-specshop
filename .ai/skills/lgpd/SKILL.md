---
name: lgpd
description: Garante conformidade com a LGPD (Lei 13.709/2018) ao projetar, implementar ou revisar qualquer coisa que toque dados pessoais. Use SEMPRE ao criar/alterar models, cadastros, formulários, APIs, logs, analytics, integrações com terceiros, exportações, autenticação, perfis automatizados ou retenção/exclusão de dados.
---

# LGPD — Lei Geral de Proteção de Dados (Lei 13.709/2018)

Fonte oficial: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm

> **Regra de ouro:** nenhum dado pessoal entra no sistema sem **finalidade definida**, **base legal** e **plano de eliminação**. Na dúvida, não colete.
>
> Esta skill orienta decisões técnicas; não é parecer jurídico. Casos ambíguos → sinalizar ao usuário e ao encarregado (DPO).

## 1. Conceitos que mudam o código (art. 5º)

| Termo | Significado prático |
|---|---|
| **Dado pessoal** | qualquer info que identifique **ou permita identificar** uma pessoa (nome, e-mail, CPF, IP, ID de dispositivo, geolocalização...) |
| **Dado sensível** | origem racial/étnica, religião, opinião política, filiação sindical/religiosa/política, **saúde**, vida sexual, **genético ou biométrico** |
| **Anonimizado** | não permite reidentificação com meios razoáveis → **fora da LGPD** (art. 12). Se dá para reverter, **continua dado pessoal** |
| **Pseudonimizado** | só reidentifica com info guardada à parte (art. 13 §4º) → **continua dado pessoal** |
| **Tratamento** | *qualquer* operação: coletar, armazenar, ler, exibir, logar, exportar, apagar... |
| **Controlador / Operador** | quem decide / quem executa em nome do controlador (art. 5º VI e VII) |
| **Encarregado (DPO)** | canal com titulares e ANPD; contato público obrigatório (art. 41) |

## 2. Princípios → regras de engenharia (art. 6º)

| Princípio | Regra no código |
|---|---|
| **Finalidade** (I) | todo campo pessoal tem propósito documentado; não reutilizar para outro fim incompatível |
| **Adequação** (II) | o uso real bate com o que foi informado ao titular |
| **Necessidade** (III) | **minimização**: só os campos estritamente necessários; nada de "pode ser útil depois" |
| **Livre acesso** (IV) | titular consulta seus dados de forma fácil e **gratuita** |
| **Qualidade** (V) | titular consegue corrigir; dados mantidos atualizados |
| **Transparência** (VI) | política de privacidade clara e acessível |
| **Segurança** (VII) | criptografia, controle de acesso, proteção contra vazamento |
| **Prevenção** (VIII) | pensar no dano antes de implementar |
| **Não discriminação** (IX) | proibido usar dados para fins discriminatórios ilícitos ou abusivos |
| **Responsabilização** (X) | conseguir **provar** conformidade (registros, auditoria, testes) |

## 3. Base legal: obrigatória antes de tratar (art. 7º)

Todo tratamento precisa de **uma** destas bases. Mais comuns no produto:

| Base | Quando | Inciso |
|---|---|---|
| Consentimento | marketing, cookies não essenciais, compartilhamento opcional | I |
| Obrigação legal/regulatória | ex.: guarda de registros do Marco Civil, fiscal | II |
| Execução de contrato | dados necessários para prestar o serviço pedido pelo titular | V |
| Exercício regular de direitos | defesa em processo | VI |
| Legítimo interesse | só com dados **estritamente necessários** + transparência (art. 10) | IX |
| Proteção do crédito | análise de crédito | X |

Dispensa de consentimento **não** dispensa os princípios e os direitos do titular (art. 7º §6º).

### Consentimento válido (arts. 8º e 9º)

- ✅ Livre, informado, inequívoco, para **finalidade determinada** (art. 5º XII).
- ✅ Por escrito → **cláusula destacada** (art. 8º §1º). Checkbox **desmarcado** por padrão, separado dos termos.
- ✅ **Granular**: uma autorização por finalidade. Autorizações genéricas são **nulas** (art. 8º §4º).
- ✅ **Ônus da prova é nosso** (art. 8º §2º) → registrar *quem, quando, versão do texto, finalidade, IP/canal*.
- ✅ **Revogável a qualquer momento**, de forma gratuita e fácil (art. 8º §5º) — tão fácil quanto consentir.
- ✅ Mudou finalidade/forma/compartilhamento → **avisar com destaque** e permitir revogar (art. 8º §6º, art. 9º §2º).
- ✅ Compartilhar com outro controlador exige **consentimento específico** (art. 7º §5º).
- ❌ Texto enganoso/abusivo ou não apresentado previamente → consentimento **nulo** (art. 9º §1º).

## 4. Dados sensíveis (art. 11)

- Só com consentimento **específico e destacado** para finalidades específicas, ou nas exceções do inciso II (obrigação legal, proteção da vida, tutela da saúde, prevenção à fraude na autenticação, etc.).
- Biometria para login/antifraude: base do art. 11, II, "g".
- Inferir dado sensível (ex.: deduzir saúde por compras) **também conta** (art. 11 §1º).
- 🔒 Exigem proteção reforçada: criptografia em repouso, acesso mínimo, auditoria.

## 5. Crianças e adolescentes (art. 14)

- Sempre no **melhor interesse** da criança/adolescente.
- Criança (até 12 anos incompletos, conforme o ECA): consentimento **específico e em destaque de pai/mãe/responsável** (§1º), com esforço razoável de verificação (§5º).
- Não condicionar jogos/apps a dados além do estritamente necessário (§4º).
- Linguagem simples e acessível (§6º).

## 6. Fim do tratamento e eliminação (arts. 15 e 16)

- Acabou a finalidade, venceu o prazo ou o titular revogou → **eliminar**.
- Só pode conservar para: obrigação legal, pesquisa (anonimizado), transferência lícita a terceiro, ou uso exclusivo do controlador **anonimizado** (art. 16).
- 👉 Toda entidade com dado pessoal precisa de **política de retenção** definida (prazo + gatilho + rotina de expurgo). *Soft delete* sozinho **não** é eliminação.

## 7. Direitos do titular → funcionalidades obrigatórias (arts. 18 a 20)

| Direito (art. 18) | O sistema deve permitir |
|---|---|
| I/II Confirmação e acesso | ver todos os seus dados |
| III Correção | editar dados incompletos/errados |
| IV Anonimização, bloqueio ou eliminação | do que for desnecessário/excessivo/irregular |
| V Portabilidade | exportar em formato estruturado e interoperável |
| VI Eliminação | apagar dados tratados com consentimento (salvo art. 16) |
| VII Compartilhamentos | saber com quem os dados foram compartilhados |
| VIII Negativa | saber que pode não consentir e as consequências |
| IX Revogação | revogar consentimento |

- **Gratuito** (art. 18 §5º).
- Acesso simplificado: **imediato**; declaração completa: **até 15 dias** (art. 19).
- Formato que favoreça o acesso; cópia eletrônica integral quando a base for consentimento ou contrato (art. 19 §§1º e 3º).
- Corrigiu/apagou/anonimizou/bloqueou → **propagar** aos terceiros com quem compartilhou (art. 18 §6º).
- **Decisões automatizadas** (score, perfil, crédito): direito à **revisão** e a explicação dos critérios (art. 20).
- Dados do exercício de direitos não podem ser usados contra o titular (art. 21).

## 8. Segurança e privacy by design (arts. 46 a 49)

- Medidas técnicas e administrativas contra acesso não autorizado, perda, alteração, vazamento (art. 46).
- **Desde a concepção** do produto até a execução (art. 46 §2º) → privacidade entra no design, não no fim.
- Dever de segurança persiste **mesmo após o término** do tratamento (art. 47).

Checklist técnico mínimo:

- [ ] TLS em todo tráfego; criptografia em repouso para dados sensíveis e documentos.
- [ ] Senhas com hash forte (Django: PBKDF2/Argon2) — nunca reversível.
- [ ] Controle de acesso por papel + princípio do menor privilégio.
- [ ] **Nunca** logar dados pessoais em claro (CPF, e-mail, tokens, senhas, payloads completos). Mascarar.
- [ ] Ambientes de dev/teste/staging **sem dados reais** (usar fixtures/factories ou dados anonimizados).
- [ ] Segredos fora do código (`.env`, nunca versionado).
- [ ] Auditoria de acesso a dados pessoais (quem, quando, o quê).
- [ ] Backups cobertos pela mesma política de retenção e eliminação.

## 9. Incidentes de segurança (art. 48)

- Incidente com risco ou dano relevante → comunicar **ANPD e titulares** em prazo razoável definido pela ANPD.
- A comunicação deve conter: natureza dos dados, titulares afetados, medidas de proteção, riscos, motivo de eventual demora e medidas de mitigação (§1º).
- Dados **ininteligíveis** (criptografados) reduzem a gravidade (§3º) → mais um motivo para criptografar.
- 👉 Ao detectar possível vazamento: **parar, avisar o usuário imediatamente** e preservar evidências.

## 10. Terceiros e transferência internacional

- Operador só trata seguindo **instruções do controlador** (art. 39); operador que descumpre responde solidariamente (art. 42 §1º I).
- Transferência internacional (ex.: cloud/SaaS fora do Brasil) só nas hipóteses do art. 33 (país adequado, cláusulas-padrão, consentimento específico, etc.).
- Antes de integrar SDK/serviço externo (analytics, e-mail, IA, pagamento): verificar **o que** é enviado, **para onde** e **com qual base legal**.

## 11. Registro e governança

- Manter **registro das operações de tratamento** (art. 37), especialmente com legítimo interesse.
- ANPD pode exigir **Relatório de Impacto (RIPD)** (art. 38) → documentar tipos de dados, coleta, segurança e mitigação.
- Contato do encarregado publicado no site (art. 41 §1º).

## 12. Sanções (art. 52)

Advertência · **multa de até 2% do faturamento no Brasil, limitada a R$ 50 milhões por infração** · multa diária · publicização · bloqueio ou eliminação dos dados · suspensão do banco ou da atividade · proibição do tratamento. Além disso, **indenização** por danos (art. 42).

## Checklist antes de entregar uma mudança com dados pessoais

- [ ] Cada novo campo pessoal tem **finalidade** e **base legal** definidas?
- [ ] Coletamos o **mínimo** necessário?
- [ ] Há dado **sensível** ou de **criança**? Regras dos arts. 11/14 aplicadas?
- [ ] Consentimento (se usado) é granular, destacado, registrado e revogável?
- [ ] Os direitos do art. 18 continuam atendíveis (acesso, correção, exportação, exclusão)?
- [ ] Retenção e eliminação definidas (inclusive backups)?
- [ ] Logs, erros e analytics **sem** dados pessoais em claro?
- [ ] Envio a terceiros/exterior mapeado e com base legal?
- [ ] Docs atualizadas (`docs/` e `.ai/knowledge/`) com o mapeamento do dado?

Se algum item falhar → **não implementar em silêncio**: explicar o risco ao usuário e propor alternativa conforme.

## Relação com outras leis

- **Marco Civil da Internet** (skill `marco-civil`): guarda obrigatória de registros de acesso e direitos do usuário de internet. A LGPD alterou o Marco Civil (art. 7º X e art. 16 II).
- **CDC**: relações de consumo seguem também o Código de Defesa do Consumidor (art. 45). Ver skill `cdc`.
- **ECA Digital**: crianças e adolescentes têm regras adicionais (skill `eca-digital`).
- Mapa completo de leis aplicáveis: skill `conformidade-legal`.
