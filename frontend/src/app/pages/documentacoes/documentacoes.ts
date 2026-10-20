import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface DocumentationEntry {
    route: string;
    icon: string;
    title: string;
    description: string;
}

// Índice das documentações; cada entrada é uma tela filha de /documentacoes.
@Component({
    selector: 'app-documentacoes',
    standalone: true,
    imports: [RouterLink],
    template: `
        <div class="flex flex-col gap-6 bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden p-4 lg:p-6">
            <div class="dss-page-header border-b border-surface-200 dark:border-surface-700">
                <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-0">Documentações</h2>
                <p class="text-sm text-surface-500 dark:text-white/64">Referências do sistema.</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                @for (entry of entries; track entry.route) {
                    <a
                        [routerLink]="entry.route"
                        class="flex items-start gap-4 rounded-xl border border-surface-200 dark:border-surface-700 p-4 hover:bg-surface-50 dark:hover:bg-surface-800/60 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                    >
                        <span class="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300">
                            <i [class]="entry.icon" aria-hidden="true"></i>
                        </span>
                        <span class="flex flex-col gap-1">
                            <span class="font-semibold text-surface-900 dark:text-surface-0">{{ entry.title }}</span>
                            <span class="text-sm text-surface-500 dark:text-white/64">{{ entry.description }}</span>
                        </span>
                    </a>
                }
            </div>
        </div>
    `
})
export class DocumentacoesPage {
    readonly entries: DocumentationEntry[] = [{ route: 'api', icon: 'fa-solid fa-code', title: 'API', description: 'Rotas da API REST, geradas do código, com teste pelo navegador.' }];
}
