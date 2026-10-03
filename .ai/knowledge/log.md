# Histórico do conhecimento

## 2026-10-03 — Etapa 0.1: remoção do Django Admin e sessões

- Removidos Django Admin, sessions, messages e integrações associadas.
- Mantida permissão global `IsAuthenticated`, sem autenticadores até a etapa 0.3.
- Testadas rotas ausentes (404) e criação de superusuário sem o Admin.
- Atualizados `backend/config/settings/{base,production}.py`, `backend/config/urls.py`,
  `backend/apps/users/admin.py` (removido), testes de core/users, `backend/AGENTS.md`,
  `backend/README.md`, `docs/architecture/overview.md`, plano da Entrega 1 e handoff.
- Conhecimento compilado em `.ai/knowledge/architecture/backend.md`.
- Validador completo passou: 5 testes, lint, formatação, migrations sem alterações,
  system checks e checks de produção. Aviso não impeditivo de cache do pytest.
