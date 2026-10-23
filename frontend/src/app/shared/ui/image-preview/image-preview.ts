import { Component, computed, effect, input, model, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;

// Modal que mostra uma imagem em tamanho maior (foto, anexo), com girar, zoom, espelhar e baixar.
// Fecha no X, no Esc ou clicando fora. Desenhado no body para cobrir o menu lateral.
// Uso: <ui-image-preview [(visible)]="aberto" [src]="url" title="Sua foto" alt="Foto do perfil" downloadName="foto" />
@Component({
    selector: 'ui-image-preview',
    standalone: true,
    imports: [DialogModule, TooltipModule],
    template: `
        <p-dialog [(visible)]="visible" [modal]="true" appendTo="body" [dismissableMask]="true" [draggable]="false" [resizable]="false" [breakpoints]="{ '960px': '85vw', '640px': '95vw' }" [style]="{ width: '48rem' }">
            <ng-template #header>
                <div class="flex flex-1 flex-wrap items-center justify-between gap-3">
                    <span class="font-semibold text-lg">{{ title() }}</span>
                    <div class="flex items-center gap-1" role="toolbar" [attr.aria-label]="'Ferramentas da imagem'">
                        @for (tool of tools; track tool.label) {
                            <button
                                type="button"
                                class="w-9 h-9 rounded-full flex items-center justify-center text-surface-600 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                [attr.aria-label]="tool.label"
                                [pTooltip]="tool.label"
                                tooltipPosition="bottom"
                                [disabled]="tool.disabled()"
                                (click)="tool.run()"
                            >
                                <i [class]="tool.icon" aria-hidden="true"></i>
                            </button>
                        }
                    </div>
                </div>
            </ng-template>
            @if (src()) {
                <div class="flex items-center justify-center overflow-auto min-h-[50vh] max-h-[70vh]">
                    <img [src]="src()" [alt]="alt()" class="max-w-full max-h-[65vh] rounded-lg object-contain transition-transform duration-200" [style.transform]="transform()" />
                </div>
            }
        </p-dialog>
    `
})
export class UiImagePreview {
    readonly visible = model(false);
    // Já resolvido por quem usa: `mediaUrl(...)` para mídia da API, ou `blob:` de um arquivo local.
    // O componente nunca monta URL de mídia.
    readonly src = input<string | null>(null);
    readonly title = input('Imagem');
    readonly alt = input('');
    readonly downloadName = input('imagem');

    readonly rotation = signal(0);
    readonly zoom = signal(1);
    readonly flipX = signal(1);
    readonly flipY = signal(1);
    readonly transform = computed(() => `rotate(${this.rotation()}deg) scale(${this.zoom() * this.flipX()}, ${this.zoom() * this.flipY()})`);

    readonly tools = [
        { label: 'Girar para a esquerda', icon: 'fa-solid fa-rotate-left', run: () => this.rotation.update((value) => value - 90), disabled: () => false },
        { label: 'Girar para a direita', icon: 'fa-solid fa-rotate-right', run: () => this.rotation.update((value) => value + 90), disabled: () => false },
        { label: 'Aproximar', icon: 'fa-solid fa-magnifying-glass-plus', run: () => this.zoom.update((value) => Math.min(ZOOM_MAX, value + ZOOM_STEP)), disabled: () => this.zoom() >= ZOOM_MAX },
        { label: 'Afastar', icon: 'fa-solid fa-magnifying-glass-minus', run: () => this.zoom.update((value) => Math.max(ZOOM_MIN, value - ZOOM_STEP)), disabled: () => this.zoom() <= ZOOM_MIN },
        { label: 'Espelhar na horizontal', icon: 'fa-solid fa-left-right', run: () => this.flipX.update((value) => -value), disabled: () => false },
        { label: 'Espelhar na vertical', icon: 'fa-solid fa-up-down', run: () => this.flipY.update((value) => -value), disabled: () => false },
        { label: 'Baixar', icon: 'fa-solid fa-download', run: () => this.download(), disabled: () => !this.src() }
    ];

    constructor() {
        // Cada abertura começa da imagem original.
        effect(() => {
            if (this.visible()) {
                this.rotation.set(0);
                this.zoom.set(1);
                this.flipX.set(1);
                this.flipY.set(1);
            }
        });
    }

    // Baixa o arquivo como veio da API (o link assinado pode ser de outra origem, onde o atributo
    // `download` do <a> é ignorado): busca o conteúdo e salva com o nome informado.
    async download() {
        const src = this.src();

        if (!src) {
            return;
        }

        const response = await fetch(src);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const extension = blob.type.split('/')[1] ?? 'bin';

        link.href = url;
        link.download = `${this.downloadName()}.${extension}`;
        link.click();
        URL.revokeObjectURL(url);
    }
}
