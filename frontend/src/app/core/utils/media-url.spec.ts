import { mediaUrl } from './media-url';

describe('mediaUrl', () => {
    it('resolve o caminho assinado na origem da API e mantém a URL do S3', () => {
        expect(mediaUrl('/api/v1/media/abc:1:sig/', 'http://api.local/api/v1')).toBe('http://api.local/api/v1/media/abc:1:sig/');
        expect(mediaUrl('/api/v1/media/abc:1:sig/', '/api/v1')).toBe('/api/v1/media/abc:1:sig/');
        expect(mediaUrl('https://bucket.s3.amazonaws.com/media/a.webp?X-Amz-Signature=1', '/api/v1')).toBe('https://bucket.s3.amazonaws.com/media/a.webp?X-Amz-Signature=1');
    });

    it('recusa vazio e caminhos que não são do servidor', () => {
        expect(mediaUrl('', '/api/v1')).toBeNull();
        expect(mediaUrl(null, '/api/v1')).toBeNull();
        expect(mediaUrl('//evil.example/x.png', '/api/v1')).toBeNull();
        expect(mediaUrl('javascript:alert(1)', '/api/v1')).toBeNull();
    });
});
