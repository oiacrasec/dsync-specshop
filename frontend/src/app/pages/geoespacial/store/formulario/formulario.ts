import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { map, of, Subscription } from 'rxjs';

import { getBackendErrorMessage } from '@/app/pages/administracao/usuario/error-message';
import { BancoGeoespacialService } from '@/app/pages/geoespacial/banco-geoespacial/banco-geoespacial.service';
import { GeoServerBancoService } from '@/app/pages/geoespacial/geoserver-banco/geoserver-banco.service';
import { StoreService } from '@/app/pages/geoespacial/store/store.service';
import { WorkspaceService } from '@/app/pages/geoespacial/workspace/workspace.service';
import { UiAutocomplete, UiLookupOptionsProvider, UiLookupOptionsResponse, UiLookupQuery } from '@/app/shared/ui/autocomplete/autocomplete';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiCheckbox } from '@/app/shared/ui/checkbox/checkbox';
import { UiConfirmDialog } from '@/app/shared/ui/confirm-dialog/confirm-dialog';
import { UiInputText } from '@/app/shared/ui/input-text/input-text';
import { StoreCreate, StoreEnsureSchemaPayload, StoreUpdate } from '@/app/types/store';

@Component({
    selector: 'app-store-formulario',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, UiAutocomplete, UiInputText, UiCheckbox, UiButton, UiConfirmDialog, SelectModule, TabsModule],
    templateUrl: './formulario.html',
    providers: [ConfirmationService]
})
export class StoreFormPage implements OnInit, OnDestroy {
    private fb = inject(FormBuilder);
    private storeService = inject(StoreService);
    private workspaceService = inject(WorkspaceService);
    private bancoService = inject(BancoGeoespacialService);
    private geoserverBancoService = inject(GeoServerBancoService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    private workspaceSubscription?: Subscription;
    private workspaceLookupRequestId = 0;

    saving = false;
    loading = false;
    isEditing = false;
    storeId?: number;
    workspaceGeoserverId: number | null = null;

    tipoOptions = [{ label: 'PostGIS', value: 'POSTGIS' }];

    form = this.fb.group({
        workspace: this.fb.control<number | null>(null, Validators.required),
        banco_geoespacial: this.fb.control<number | null>(null, Validators.required),
        nome: this.fb.control('', Validators.required),
        tipo: this.fb.control<'POSTGIS'>('POSTGIS', Validators.required),
        schema_name: this.fb.control('geo', Validators.required),
        ativo: this.fb.control(true, Validators.required)
    });

    workspaceOptionsProvider: UiLookupOptionsProvider = (query) => this.workspaceService.options(query);
    bancoOptionsProvider: UiLookupOptionsProvider = (query) => this.resolveBancoOptions(query);

    ngOnInit() {
        this.observeWorkspaceSelection();

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
        this.storeId = id;
        this.loadStore();
    }

    ngOnDestroy() {
        this.workspaceSubscription?.unsubscribe();
    }

    goBack() {
        this.router.navigateByUrl('/pages/geoespacial/stores');
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

        this.saving = true;
        this.ensureSchemaThenPersist();
    }

    private ensureSchemaThenPersist() {
        const payload = this.buildEnsureSchemaPayload(false);

        this.storeService.ensureSchema(payload).subscribe({
            next: (response) => {
                if (response.exists) {
                    this.persistStore();

                    return;
                }

                if (response.requires_confirmation) {
                    this.saving = false;
                    this.confirmCreateSchemaAndPersist();

                    return;
                }

                this.saving = false;
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Schema inválido',
                    detail: response.detail || 'Não foi possível validar o schema informado.'
                });
            },
            error: (error: unknown) => {
                this.saving = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Falha ao validar schema',
                    detail: getBackendErrorMessage(error, 'Não foi possível validar o schema informado.')
                });
            }
        });
    }

    private confirmCreateSchemaAndPersist() {
        const payload = this.buildEnsureSchemaPayload(true);
        const schemaName = payload.schema_name;

        this.confirmationService.confirm({
            header: 'Schema inexistente',
            message: `O schema "${schemaName}" não existe no banco e será criado. Deseja continuar?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.saving = true;
                this.storeService.ensureSchema(payload).subscribe({
                    next: () => {
                        this.persistStore();
                    },
                    error: (error: unknown) => {
                        this.saving = false;
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Falha ao criar schema',
                            detail: getBackendErrorMessage(error, 'Não foi possível criar o schema informado.')
                        });
                    }
                });
            },
            reject: () => {
                this.saving = false;
                this.messageService.add({
                    severity: 'info',
                    summary: 'Cadastro cancelado',
                    detail: 'Operação cancelada pelo usuário.'
                });
            }
        });
    }

    private persistStore() {
        const request = this.isEditing && this.storeId ? this.storeService.update(this.storeId, this.buildUpdatePayload()) : this.storeService.create(this.buildCreatePayload());

        request.subscribe({
            next: () => {
                this.saving = false;
                this.messageService.add({
                    severity: 'success',
                    summary: this.isEditing ? 'Store atualizado' : 'Store criado',
                    detail: 'Operação concluída com sucesso.'
                });
                this.goBack();
            },
            error: (error: unknown) => {
                this.saving = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Falha ao salvar',
                    detail: getBackendErrorMessage(error, 'Não foi possível salvar o store.')
                });
            }
        });
    }

    private loadStore() {
        if (!this.storeId) {
            return;
        }

        this.loading = true;
        this.storeService.get(this.storeId).subscribe({
            next: (store) => {
                this.loading = false;
                this.form.patchValue({
                    workspace: store.workspace,
                    banco_geoespacial: store.banco_geoespacial,
                    nome: store.nome,
                    tipo: store.tipo,
                    schema_name: store.schema_name,
                    ativo: store.ativo
                });
            },
            error: () => {
                this.loading = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Store não encontrado',
                    detail: 'Retornando para a lista.'
                });
                this.goBack();
            }
        });
    }

    private observeWorkspaceSelection() {
        this.workspaceSubscription = this.form.controls.workspace.valueChanges.subscribe((workspaceId) => {
            this.resolveWorkspaceGeoServer(workspaceId);
        });
    }

    private resolveWorkspaceGeoServer(workspaceId: number | null) {
        if (!workspaceId) {
            this.workspaceLookupRequestId++;
            this.workspaceGeoserverId = null;
            this.form.controls.banco_geoespacial.setValue(null);

            return;
        }

        const requestId = ++this.workspaceLookupRequestId;

        this.workspaceService.get(Number(workspaceId)).subscribe({
            next: (workspace) => {
                if (requestId !== this.workspaceLookupRequestId) {
                    return;
                }

                const previousGeoserverId = this.workspaceGeoserverId;

                this.workspaceGeoserverId = workspace.geoserver;

                if (previousGeoserverId !== null && previousGeoserverId !== workspace.geoserver) {
                    this.form.controls.banco_geoespacial.setValue(null);
                }
            },
            error: () => {
                if (requestId !== this.workspaceLookupRequestId) {
                    return;
                }

                this.workspaceGeoserverId = null;
                this.form.controls.banco_geoespacial.setValue(null);
            }
        });
    }

    private resolveBancoOptions(query: UiLookupQuery) {
        const hasPk = query.pk !== undefined && query.pk !== null && query.pk !== '';

        if (!this.workspaceGeoserverId) {
            if (hasPk) {
                return this.bancoService.options(query);
            }

            return of(this.buildEmptyLookupResponse(query));
        }

        const request = hasPk
            ? this.geoserverBancoService.list({
                  geoserver: this.workspaceGeoserverId,
                  banco: Number(query.pk),
                  ativo: true,
                  first: query.first ?? 0,
                  rows: query.rows ?? 50
              })
            : this.geoserverBancoService.list({
                  geoserver: this.workspaceGeoserverId,
                  ativo: true,
                  q: query.q,
                  first: query.first ?? 0,
                  rows: query.rows ?? 50
              });

        return request.pipe(
            map(
                (response): UiLookupOptionsResponse => ({
                    data: response.data.map((item) => ({
                        value: item.banco,
                        label: item.banco_label ?? String(item.banco)
                    })),
                    totalRecords: response.totalRecords,
                    first: response.first,
                    rows: response.rows,
                    hasNext: response.hasNext
                })
            )
        );
    }

    private buildEmptyLookupResponse(query: UiLookupQuery): UiLookupOptionsResponse {
        return {
            data: [],
            totalRecords: 0,
            first: query.first ?? 0,
            rows: query.rows ?? 50,
            hasNext: false
        };
    }

    private buildCreatePayload(): StoreCreate {
        const raw = this.form.getRawValue();

        return {
            workspace: Number(raw.workspace),
            banco_geoespacial: Number(raw.banco_geoespacial),
            nome: (raw.nome ?? '').trim(),
            tipo: raw.tipo ?? 'POSTGIS',
            schema_name: (raw.schema_name ?? '').trim(),
            ativo: Boolean(raw.ativo)
        };
    }

    private buildUpdatePayload(): StoreUpdate {
        return this.buildCreatePayload();
    }

    private buildEnsureSchemaPayload(createIfMissing: boolean): StoreEnsureSchemaPayload {
        const raw = this.form.getRawValue();
        const payload: StoreEnsureSchemaPayload = {
            schema_name: (raw.schema_name ?? '').trim(),
            create_if_missing: createIfMissing
        };

        if (this.isEditing && this.storeId) {
            payload.store_id = this.storeId;
        }

        if (raw.banco_geoespacial !== null && raw.banco_geoespacial !== undefined) {
            payload.banco_geoespacial = Number(raw.banco_geoespacial);
        }

        return payload;
    }
}
