# API de produtos acompanhados (SPECSHOP)

`/api/v1/products/` — CRUD dos produtos que o cliente acompanha (RF-01, D-24), no app
`apps/catalog`. Contrato completo em [openapi-v1.yaml](openapi-v1.yaml).

| Item | Regra |
|---|---|
| Escopo | `ContractScopedModel`: o produto é do contrato e aparece em todas as organizações (ADR 2003 §1) |
| Header | `X-Organization-Id` obrigatório, como em todo endpoint de negócio |
| Permissões | `product:view`, `product:create`, `product:update`, `product:delete` (rótulo "Arquivar"); concedidas em qualquer escopo valem para o contrato (`ContractWidePermission`) |
| Campos | `name` e `model` obrigatórios (texto aparado); `brand` e `ean` opcionais |
| EAN | 8 ou 13 dígitos com dígito verificador; inválido → 422 em `ean` |
| Duplicado | mesmo nome e modelo no contrato, sem diferenciar maiúsculas → 422 em `name`; produto arquivado não conta |
| Arquivar | `DELETE` é exclusão lógica do core (`deleted_at`, `deleted_by`); o histórico de preços continua |
| Busca e filtros | `search` em nome, modelo, marca e EAN; `brand` (igual, sem maiúsculas); `ordering` por `name`, `model`, `brand`, `created_at`, `updated_at` |
| Auditoria | eventos `product.created`, `product.updated`, `product.deleted` com nome, modelo, marca e EAN |
| Contrato | vem do contexto; `contract` no payload é ignorado |
