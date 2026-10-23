# 0039 — Armazenamento de mídia configurável e privado

- **Status:** Aceito
- **Data:** 2026-10-19
- **Revisões:** 2026-10-23 — migração entre filesystem e S3 pelo comando `transfer_media` (decisão 76, §5);
  fachada única `apps/core/media.py` com `MediaFileField`/`MediaImageField` (decisão 79, §6)

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
   A rota é **só leitura** (`GET`/`HEAD`; envio de arquivo é sempre autenticado, no endpoint do
   recurso) e limitada por IP real do cliente (`DJANGO_MEDIA_DOWNLOAD_RATE`, padrão `120/min` → 429),
   para que um link vazado não vire tráfego ilimitado.
3. **`s3`:** `django-storages` (`S3Storage`, boto3), bucket privado (`default_acl` nulo), URL
   pre-signed (SigV4) com a mesma validade, sem sobrescrever arquivos. `DJANGO_MEDIA_S3_ENDPOINT_URL`
   e `DJANGO_MEDIA_S3_ADDRESSING_STYLE` atendem MinIO e serviços compatíveis; sem chaves, vale a
   credencial do ambiente (perfil/IAM role).
4. **Código de domínio não sabe o modo:** usa `default_storage` / `FileField` e `url()`.
5. **Migração entre modos sem mexer no banco:** o banco guarda só o nome relativo
   (`avatars/ab12.webp`), igual nos dois modos. `manage.py transfer_media --from filesystem --to s3`
   (ou o inverso) copia mantendo os nomes, pula o que já existe com o mesmo tamanho, confere cada
   cópia, não apaga a origem e falha no fim se algo não foi copiado (`--dry-run` só lista).
   Procedimento: configurar `DJANGO_MEDIA_S3_*` → rodar → trocar `DJANGO_MEDIA_STORAGE=s3` e
   reiniciar → rodar de novo (copia o que chegou no meio) → apagar a pasta local quando quiser.

6. **Fachada única (`apps/core/media.py`):** nenhum código fala com o storage do Django direto.
   Models usam `MediaFileField` / `MediaImageField` (herdam os campos do Django: `.url`, `.save`,
   forms, DRF e dimensões continuam), que já vêm com `storage=media.get_storage` (função, não
   instância), nome UUID v7 na `folder` (o nome original nunca é usado), validação de tamanho e
   **tipo pelo conteúdo**, imagens regravadas em WebP (sem EXIF/GPS; `square`/`max_side`) e
   limpeza do arquivo antigo ao trocar ou excluir, **só após o commit**. Fora de models:
   `media.save/url/open_file/exists/delete/delete_on_commit`. Soft delete e `QuerySet.update/delete`
   não disparam a limpeza: o service do domínio chama `media.delete_on_commit`. Um teste falha se
   algum arquivo fora da fachada usar `models.FileField/ImageField`, `default_storage` ou `storages`.
   No frontend, `core/utils/media-url.ts` (`mediaUrl`) é o único ponto que monta o `src`.

## Consequências

- Links vazados expiram; o bucket e a pasta continuam privados.
- No modo `filesystem` com mais de um servidor, a pasta precisa ser compartilhada (volume).
- O frontend resolve URL relativa (modo arquivo) na origem da API e usa a absoluta (S3) como vem.
- Dependências: `django-storages[s3]` (BSD-3), `boto3` (Apache-2.0) e `Pillow` 12.3 (MIT-CMU).

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| Pasta/bucket públicos | expõe dado pessoal sem login |
| Imagem baixada pelo app com JWT (blob) | uma chamada à API por imagem e cache pior |
| Servir `media/` pelo proxy reverso | exigiria autorização no proxy; a URL assinada resolve no Django |
