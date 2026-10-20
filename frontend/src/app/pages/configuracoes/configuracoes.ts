import { NgClass } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TabsModule } from 'primeng/tabs';

import { PreferencesService } from '@/app/core/services/preferences.service';
import { problemMessage } from '@/app/core/utils/api-problem';
import { MenuMode } from '@/app/layout/service/layout.service';
import { PRESET_NAMES, ThemeService } from '@/app/layout/service/theme.service';
import { UiButton } from '@/app/shared/ui/button/button';
import { UserPreferences } from '@/app/types/preferences';

const PRIMARY_LABELS: Record<string, string> = {
    noir: 'Neutro',
    emerald: 'Esmeralda',
    green: 'Verde',
    lime: 'Lima',
    orange: 'Laranja',
    amber: 'Âmbar',
    yellow: 'Amarelo',
    teal: 'Verde-azulado',
    cyan: 'Ciano',
    sky: 'Céu',
    blue: 'Azul',
    indigo: 'Índigo',
    violet: 'Violeta',
    purple: 'Roxo',
    fuchsia: 'Fúcsia',
    pink: 'Rosa',
    rose: 'Rosé'
};

// Aparência escolhida pelo usuário e guardada nele (GET/PUT /me/preferences/). As mudanças
// aparecem na hora; Salvar grava, e sair sem salvar volta ao que estava gravado.
@Component({
    selector: 'app-configuracoes',
    standalone: true,
    imports: [NgClass, FormsModule, SelectButtonModule, TabsModule, UiButton],
    templateUrl: './configuracoes.html'
})
export class ConfiguracoesPage implements OnInit, OnDestroy {
    private preferencesService = inject(PreferencesService);
    private theme = inject(ThemeService);
    private router = inject(Router);
    private messageService = inject(MessageService);

    readonly saved = signal<UserPreferences | null>(null);
    readonly draft = signal<UserPreferences | null>(null);
    readonly dirty = computed(() => JSON.stringify(this.saved()) !== JSON.stringify(this.draft()));
    saving = false;

    readonly primaryColors = this.theme.primaryColors;
    readonly presetOptions = PRESET_NAMES.map((name) => ({ label: name, value: name }));
    readonly schemeOptions = [
        { label: 'Claro', value: false },
        { label: 'Escuro', value: true }
    ];
    readonly menuOptions: { label: string; value: MenuMode }[] = [
        { label: 'Fixo', value: 'static' },
        { label: 'Sobreposto', value: 'overlay' },
        { label: 'Estreito', value: 'slim' },
        { label: 'Compacto', value: 'compact' },
        { label: 'Revelar', value: 'reveal' },
        { label: 'Gaveta', value: 'drawer' },
        { label: 'Horizontal', value: 'horizontal' }
    ];

    ngOnInit() {
        this.preferencesService.load().subscribe({
            next: (preferences) => {
                this.saved.set(preferences);
                this.draft.set(preferences);
            },
            error: (error: unknown) => {
                const current = this.theme.current();

                this.saved.set(current);
                this.draft.set(current);
                this.messageService.add({ severity: 'error', summary: 'Falha ao carregar', detail: problemMessage(error, 'Não foi possível carregar suas preferências.') });
            }
        });
    }

    ngOnDestroy() {
        const saved = this.saved();

        if (saved && this.dirty()) {
            this.theme.apply(saved);
        }
    }

    primaryLabel(name: string | undefined) {
        return PRIMARY_LABELS[name ?? ''] ?? name ?? '';
    }

    change(values: Partial<UserPreferences>) {
        const draft = this.draft();

        if (!draft) {
            return;
        }

        const next = { ...draft, ...values };

        this.draft.set(next);
        this.theme.apply(next);
    }

    cancel() {
        this.router.navigateByUrl('/');
    }

    save() {
        const draft = this.draft();

        if (!draft) {
            return;
        }

        this.saving = true;
        this.preferencesService.save(draft).subscribe({
            next: (preferences) => {
                this.saving = false;
                this.saved.set(preferences);
                this.draft.set(preferences);
                this.messageService.add({ severity: 'success', summary: 'Configurações salvas', detail: 'Sua aparência vale em qualquer computador.' });
            },
            error: (error: unknown) => {
                this.saving = false;
                this.messageService.add({ severity: 'error', summary: 'Falha ao salvar', detail: problemMessage(error, 'Não foi possível salvar suas preferências.') });
            }
        });
    }
}
