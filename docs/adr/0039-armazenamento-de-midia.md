# 0039 — Armazenamento de mídia configurável e privado

- **Status:** Aceito
- **Data:** 2026-10-19

## Contexto

O Perfil (Bloco 9) traz o primeiro arquivo enviado por usuário: a foto. Cada instalação do core
(e dos projetos derivados, ADR 0036) pode guardar mídia em disco do servidor ou num bucket
S3/compatível, e isso precisa ser escolha de implantação, não de código. A foto é dado pessoal
(LGPD): não pode ficar pública. A API é só JWT, e a tag `<img>` não envia o header de
autenticação.

## Decisão

1. **Escolha por `.env`:** `DJANGO_MEDIA_STORAGE=filesystem` (padrão) ou `s3`, montada em
   `config/storage.py`. Valor desconhecido ou `s3` sem bucket impedem a inicialização.
2. **`filesystem`:** pasta `DJANGO_MEDIA_ROOT` (padrão `backend/media/`), nunca servida
   diretamente. `url()` devolve `/api/v1/media/<token>/`, um token assinado (`django.core.signing`,
   nome + horário) que expira em `DJANGO_MEDIA_URL_EXPIRE` segundos (padrão 300). A view não pede
   JWT: o token é a credencial. Token adulterado, vencido, arquivo ausente ou modo `s3` → 404.
   Resposta com `Cache-Control: private`, `Content-Security-Policy: default-src 'none'; sandbox`.
3. **`s3`:** `django-storages` (`S3Storage`, boto3), bucket privado (`default_acl` nulo), URL
   pre-signed (SigV4) com a mesma validade, sem sobrescrever arquivos. `DJANGO_MEDIA_S3_ENDPOINT_URL`
   e `DJANGO_MEDIA_S3_ADDRESSING_STYLE` atendem MinIO e serviços compatíveis; sem chaves, vale a
   credencial do ambiente (perfil/IAM role).
4. **Código de domínio não sabe o modo:** usa `default_storage` / `FileField` e `url()`.

## Consequências

- Links vazados expiram; o bucket e a pasta continuam privados.
- No modo `filesystem` com mais de um servidor, a pasta precisa ser compartilhada (volume).
- O frontend resolve URL relativa (modo arquivo) na origem da API e usa a absoluta (S3) como vem.
- Dependências: `django-storages[s3]` (BSD-3) e `boto3` (Apache-2.0).

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Pasta/bucket públicos | expõe dado pessoal sem login |
| Imagem baixada pelo app com JWT (blob) | uma chamada à API por imagem e cache pior |
| Servir `media/` pelo proxy reverso | exigiria autorização no proxy; a URL assinada resolve no Django |
