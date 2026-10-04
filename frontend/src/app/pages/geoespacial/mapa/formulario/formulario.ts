import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';

import { SetorService } from '@/app/pages/administracao/setor/setor.service';
import { getBackendErrorMessage } from '@/app/pages/administracao/usuario/error-message';
import { MapaService } from '@/app/pages/geoespacial/mapa/mapa.service';
import { StoreService } from '@/app/pages/geoespacial/store/store.service';
import { UiAutocomplete, UiLookupOptionsProvider } from '@/app/shared/ui/autocomplete/autocomplete';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiCheckbox } from '@/app/shared/ui/checkbox/checkbox';
import { UiInputNumber } from '@/app/shared/ui/input-number/input-number';
import { UiInputText } from '@/app/shared/ui/input-text/input-text';
import { UiMultiSelect, UiMultiSelectOption } from '@/app/shared/ui/multi-select/multi-select';
import { Mapa, MapaVisibilidade } from '@/app/types/mapa';

interface MapaPreviewState {
    storeLabel: string;
    workspace: string;
    schemaName: string;
    banco: string;
    host: string;
    setorLabel: string;
}

interface StoreSummaryState {
    id: number;
    label: string;
    workspace: string;
    schemaName: string;
    banco: string;
    host: string;
}

@Component({
    selector: 'app-mapa-formulario',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, UiAutocomplete, UiInputText, UiInputNumber, UiCheckbox, UiButton, UiMultiSelect, SelectModule],
    templateUrl: './formulario.html',
    styles: [
        `
            .mapa-preview-grid {
                background-image: linear-gradient(rgba(71, 85, 105, 0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(71, 85, 105, 0.14) 1px, transparent 1px);
                background-size: 36px 36px;
            }
        `
    ]
})
export class MapaFormPage implements OnInit {
    private fb = inject(FormBuilder);
    private mapaService = inject(MapaService);
    private setorService = inject(SetorService);
    private storeService = inject(StoreService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);

    saving = false;
    loading = false;
    isEditing = false;
    mapaId?: number;
    setorOptions: UiMultiSelectOption[] = [];
    storeSummary: StoreSummaryState | null = null;

    visibilidadeOptions = [
        { label: 'Individual', value: 'INDIVIDUAL' },
        { label: 'Setor', value: 'SETOR' },
        { label: 'Organização', value: 'ORGANIZACAO' },
        { label: 'Compartilhado', value: 'COMPARTILHADO' }
    ];

    form = this.fb.group({
        nome: this.fb.control('', Validators.required),
        store: this.fb.control<number | null>(null, Validators.required),
        visibilidade: this.fb.control<MapaVisibilidade>('SETOR', Validators.required),
        setor: this.fb.control<number | null>(null),
        srid: this.fb.control<number | null>(4326, Validators.required),
        ativo: this.fb.control(true, Validators.required),
        setor_compartilhado_ids: this.fb.nonNullable.control<number[]>([])
    });

    setorOptionsProvider: UiLookupOptionsProvider = (query) => this.setorService.options(query);
    storeOptionsProvider: UiLookupOptionsProvider = (query) => this.storeService.options(query);

    get visibilidadeLabel(): string {
        const visibilidade = this.form.controls.visibilidade.value;

        return this.visibilidadeOptions.find((option) => option.value === visibilidade)?.label ?? 'Visibilidade não definida';
    }

    get preview(): MapaPreviewState {
        const setorId = this.form.controls.setor.value ?? null;

        return {
            storeLabel: this.storeSummary?.label ?? this.resolveStoreLabel(this.form.controls.store.value ?? null),
            workspace: this.storeSummary?.workspace ?? '-',
            schemaName: this.storeSummary?.schemaName ?? '-',
            banco: this.storeSummary?.banco ?? '-',
            host: this.storeSummary?.host ?? '-',
            setorLabel: this.resolveSetorLabel(setorId)
        };
    }

    get showSharedSummary(): boolean {
        const visibilidade = this.form.controls.visibilidade.value;
        const sharedIds = this.form.controls.setor_compartilhado_ids.value ?? [];

        return visibilidade === 'COMPARTILHADO' && sharedIds.length > 0;
    }

    get sharedSetoresSummary(): string {
        const sharedIds = this.form.controls.setor_compartilhado_ids.value ?? [];

        if (sharedIds.length === 0) {
            return 'nenhum setor';
        }

        const labels = sharedIds.map((id) => this.resolveSetorLabel(id));
        const visibleLabels = labels.slice(0, 3).join(', ');
        const extraCount = labels.length - 3;

        if (extraCount <= 0) {
            return visibleLabels;
        }

        return `${visibleLabels} e mais ${extraCount}`;
    }

    ngOnInit() {
        this.updateVisibilityRules(this.form.controls.visibilidade.value);
        this.form.controls.visibilidade.valueChanges.subscribe((visibilidade) => this.updateVisibilityRules(visibilidade));
        this.form.controls.store.valueChanges.subscribe((storeId) => this.loadStoreSummary(storeId));

        this.loadSetores();

        const idParam = this.route.snapshot.paramMap.get('id');

        if (!idParam) {
            return;
        }

        const id = Number(idParam);

        if (!Number.isFinite(id) || id <= 0) {
            this.goBack();

            return;
        }

        this.isEditing = true;
        this.mapaId = id;
        this.loadMapa();
    }

    goBack() {
        this.router.navigateByUrl('/pages/geoespacial/mapas');
    }

    save() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.messageService.add({
                severity: 'warn',
                summary: 'Campos obrigatórios',
                detail: 'Preencha os campos obrigatórios antes de salvar.'
            });

            return;
        }

        const visibilidade = this.form.controls.visibilidade.value;
        const setor = this.form.controls.setor.value;
        const sharedIds = this.form.controls.setor_compartilhado_ids.value ?? [];

        if (visibilidade === 'SETOR' && !setor) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Setor obrigatório',
                detail: 'Selecione o setor quando a visibilidade for SETOR.'
            });

            return;
        }

        if (visibilidade === 'COMPARTILHADO' && sharedIds.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Compartilhamento obrigatório',
                detail: 'Selecione ao menos um setor para visibilidade compartilhada.'
            });

            return;
        }

        const payload = this.buildPayload();

        this.saving = true;

        const request = this.isEditing && this.mapaId ? this.mapaService.update(this.mapaId, payload) : this.mapaService.create(payload);

        request.subscribe({
            next: () => {
                this.saving = false;
                this.messageService.add({
                    severity: 'success',
                    summary: this.isEditing ? 'Mapa atualizado' : 'Mapa criado',
                    detail: 'Operação concluída com sucesso.'
                });
                this.goBack();
            },
            error: (error: unknown) => {
                this.saving = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Falha ao salvar',
                    detail: getBackendErrorMessage(error, 'Não foi possível salvar o mapa.')
                });
            }
        });
    }

    private loadMapa() {
        if (!this.mapaId) {
            return;
        }

        this.loading = true;
        this.mapaService.get(this.mapaId).subscribe({
            next: (mapa: Mapa) => {
                this.loading = false;
                this.form.patchValue({
                    nome: mapa.nome,
                    store: mapa.store,
                    visibilidade: mapa.visibilidade,
                    setor: mapa.setor,
                    srid: mapa.srid,
                    ativo: mapa.ativo,
                    setor_compartilhado_ids: (mapa.setores_compartilhados ?? []).map((item) => item.id)
                });
                this.loadStoreSummary(mapa.store);
            },
            error: () => {
                this.loading = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Mapa não encontrado',
                    detail: 'Retornando para a lista.'
                });
                this.goBack();
            }
        });
    }

    private loadSetores() {
        this.setorService
            .list({
                first: 0,
                rows: 500,
                ativo: true,
                ordering: 'nome'
            })
            .subscribe({
                next: (response) => {
                    this.setorOptions = response.data.map((setor) => ({
                        label: setor.nome,
                        value: setor.id
                    }));
                },
                error: () => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Falha ao carregar setores',
                        detail: 'Não foi possível carregar os setores do contexto ativo.'
                    });
                }
            });
    }

    private buildPayload() {
        const raw = this.form.getRawValue();
        const visibilidade = raw.visibilidade ?? 'SETOR';
        const sharedIds = visibilidade === 'COMPARTILHADO' ? (raw.setor_compartilhado_ids ?? []) : [];

        return {
            nome: (raw.nome ?? '').trim(),
            store: Number(raw.store),
            visibilidade,
            setor: visibilidade === 'SETOR' ? Number(raw.setor) : null,
            srid: Number(raw.srid),
            ativo: Boolean(raw.ativo),
            setor_compartilhado_ids: sharedIds
        };
    }

    private updateVisibilityRules(visibilidade: MapaVisibilidade | null) {
        const sharedControl = this.form.controls.setor_compartilhado_ids;
        const setorControl = this.form.controls.setor;

        if (visibilidade === 'COMPARTILHADO') {
            sharedControl.enable({ emitEvent: false });
        } else {
            sharedControl.setValue([], { emitEvent: false });
            sharedControl.disable({ emitEvent: false });
        }

        if (visibilidade === 'SETOR') {
            setorControl.setValidators([Validators.required]);
        } else {
            setorControl.setValidators([]);
        }

        setorControl.updateValueAndValidity({ emitEvent: false });
    }

    private resolveSetorLabel(setorId: number | null) {
        if (!setorId) {
            return 'Setor não selecionado';
        }

        const matchedSetor = this.setorOptions.find((option) => option.value === setorId);

        if (matchedSetor) {
            return matchedSetor.label;
        }

        return `Setor #${setorId}`;
    }

    private loadStoreSummary(storeId: number | null) {
        if (!storeId) {
            this.storeSummary = null;

            return;
        }

        this.storeService.get(Number(storeId)).subscribe({
            next: (store) => {
                this.storeSummary = {
                    id: store.id,
                    label: store.nome,
                    workspace: store.workspace_label ?? String(store.workspace),
                    schemaName: store.schema_name ?? '-',
                    banco: store.banco,
                    host: store.host
                };
            },
            error: () => {
                this.storeSummary = {
                    id: Number(storeId),
                    label: `Store #${storeId}`,
                    workspace: '-',
                    schemaName: '-',
                    banco: '-',
                    host: '-'
                };
            }
        });
    }

    private resolveStoreLabel(storeId: number | null) {
        if (!storeId) {
            return 'Store não selecionado';
        }

        if (this.storeSummary && this.storeSummary.id === storeId) {
            return this.storeSummary.label;
        }

        return `Store #${storeId}`;
    }
}
