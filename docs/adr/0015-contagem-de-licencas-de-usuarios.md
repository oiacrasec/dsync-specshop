# 0015 — Contagem de licenças de usuários

- **Status:** Aceito
- **Data:** 2026-10-03
- **Complementa:** ADR 0006 §2.1

## Contexto

O contrato limita a quantidade de usuários, mas o ADR 0006 não definia se
usuários inativos consumiriam licenças. O usuário escolheu contá-los também.

## Decisão

- Todo usuário comum não excluído consome uma licença do seu contrato,
  independentemente de `is_active`.
- Desativar não libera licença; soft delete libera.
- Cadastro, transferência para outro contrato e restauração exigem vaga no
  contrato de destino. Editar ou reativar um usuário não excluído não usa outra vaga.
- Superadmins não pertencem a contrato e não consomem licenças contratuais.
- A verificação e a escrita são transacionais, com lock no contrato de destino,
  para serializar escritas que consomem vagas.

## Alternativas consideradas

Contar apenas usuários ativos: descartado por decisão explícita do usuário.
Isso liberaria vagas por simples desativação, comportamento não desejado.

## Consequências

Escritas de usuários devem passar pelo serviço central. Constraints no banco
garantem o vínculo conforme o papel, mas não a contagem agregada de licenças.
SQL direto, `bulk_create`, `update` ou `save` direto não podem ser usados para
consumir vagas ou restaurar usuários. Quotas opcionais do Plan continuam sem
enforcement; esta decisão trata somente das licenças já contratadas.
