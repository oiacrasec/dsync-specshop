# 0038 — Exceção de permissão na atribuição de perfil

- **Status:** Aceito
- **Data:** 2026-10-19
- **Complementa:** ADR 0009 (§2 perfis vinculados, §3 exceções, §4 permissão efetiva)

## Contexto

Na aba Permissões do usuário (etapa 8.3), o cliente quer escolher um perfil e ajustar o que
precisar, sem cadeados. Ao mesmo tempo, quando um perfil muda, quem já o recebeu deve mudar junto
(perfil vinculado, ADR 0009 §2). Copiar o perfil em permissões avulsas, como o GIS, perde essa
propagação. A exceção do ADR 0009 §3 só tira uma organização inteira de uma atribuição no
contrato; não há como tirar uma permissão só.

## Decisão

1. **A exceção passa a ter dois alvos opcionais:** organização e permissão (pelo menos um).
   | Organização | Permissão | Significado |
   |---|---|---|
   | sim | — | a atribuição no contrato não alcança a organização (ADR 0009 §3) |
   | — | sim | a atribuição de perfil não dá aquela permissão em lugar nenhum |
   | sim | sim | a atribuição de perfil no contrato não dá aquela permissão naquela organização |
2. **Só restringe a própria atribuição.** Não é negação global: outra atribuição pode conceder a
   mesma permissão (ADR 0009 §4 continua: avulsas e perfis só concedem; não há "negar X").
3. **Exceção de permissão só em atribuição de perfil.** Avulsa se remove apagando a atribuição.
   Com organização, só em atribuição no contrato. O perfil essencial não admite exceção.
4. **Perfil vinculado preservado.** Um código novo no perfil chega a quem o tem; as exceções
   do usuário continuam valendo.
5. **Interface:** escolher um perfil marca as caixas; desmarcar algo que veio do perfil grava
   a exceção; marcar algo que nenhum perfil dá grava uma avulsa.

## Consequências

- `AssignmentExclusion` ganha `permission_code` e `excluded_organization` passa a ser opcional
  (migration `rbac.0004`), com restrição de alvo e unicidade por atribuição + alvo.
- O avaliador em Python puro desconta os códigos excluídos (`Grant.excluded_codes`); a visão por
  contrato (ADR 0037) desconta só os excluídos em todo lugar.
- A entrada em organização (ADR 0009 §6) continua pela atribuição que alcança a organização, mesmo
  que as exceções tirem todos os códigos dela.
- `GET/PUT /api/v1/users/{id}/access/` passa a trazer `excluded_permissions` por concessão.

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Copiar o perfil em avulsas (como o GIS) | perde a propagação das mudanças do perfil |
| Perfil vinculado com cadeados (caixas do perfil travadas) | o usuário preferiu customizar livremente |
| Negação global de permissão | contraria o ADR 0009 §4 e afeta concessões de outras origens |
