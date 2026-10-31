# Dependências de autenticação

Revisão posterior de frontend/backend, incluindo Pillow 13.0.0 e os requirements:
[segurança das dependências — 2026-10-31](../../../docs/security/dependencies.md).

Inventário das dependências adicionadas na etapa JWT. O inventário das demais
dependências do backend ainda não foi materializado nesta entrega.

| Biblioteca | Versão verificada | Licença | Fonte |
|---|---|---|---|
| djangorestframework-simplejwt | 5.5.1 | MIT | [PyPI](https://pypi.org/project/djangorestframework-simplejwt/5.5.1/) |
| PyJWT (transitiva) | 2.15.1 | MIT | [PyPI](https://pypi.org/project/PyJWT/2.15.1/) |

SimpleJWT está declarado com `~=` nos requirements; PyJWT é dependência
transitiva da biblioteca, também restringida com `~=` por ser responsável
pela assinatura e verificação de tokens. Os avisos MIT e copyrights são preservados nos
arquivos de licença distribuídos com os pacotes. Ao redistribuir os pacotes,
manter esses arquivos e avisos.

Verificação em 2026-10-03: metadados de ambas as versões no PyPI não listaram
advisories, e `pip check` não encontrou dependências incompatíveis. Esta é uma
verificação das versões instaladas, sem equivaler a garantia de ausência de
vulnerabilidades. Atualizações exigem nova revisão.
