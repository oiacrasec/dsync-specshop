import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';

import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { PERMISSION_KEYS } from '@/app/core/tokens/permission.keys';
import { getBackendErrorMessage } from '@/app/pages/administracao/usuario/error-message';
import { BancoGeoespacialService } from '@/app/pages/geoespacial/banco-geoespacial/banco-geoespacial.service';
import { GeoServerBancoService } from '@/app/pages/geoespacial/geoserver-banco/geoserver-banco.service';
import { GeoServerService } from '@/app/pages/geoespacial/geoserver/geoserver.service';
import { UiAutocomplete, UiLookupOptionsProvider } from '@/app/shared/ui/autocomplete/autocomplete';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiCheckbox } from '@/app/shared/ui/checkbox/checkbox';
import { UiConfirmDialog } from '@/app/shared/ui/confirm-dialog/confirm-dialog';
import { UiInputNumber } from '@/app/shared/ui/input-number/input-number';
import { UiInputPassword } from '@/app/shared/ui/input-password/input-password';
import { UiInputText } from '@/app/shared/ui/input-text/input-text';
import { GeoServerBanco } from '@/app/types/geoserver-banco';
import { GeoServerCreate, GeoServerStatus, GeoServerTestConnectionPayload, GeoServerUpdate } from '@/app/types/geoserver';

@Component({
    selector: 'app-geoserver-formulario',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        UiInputText,
        UiInputPassword,
        UiInputNumber,
        UiCheckbox,
        UiButton,
        UiAutocomplete,
        UiConfirmDialog,
        SelectModule,
        TabsModule
    ],
    templateUrl: './formulario.html',
    providers: [ConfirmationService]
})
export class GeoServerFormPage implements OnInit {
    private fb = inject(FormBuilder);
    private geoserverService = inject(GeoServerService);
    private geoserverBancoService = inject(GeoServerBancoService);
    private bancoService = inject(BancoGeoespacialService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private permissionContext = inject(PermissionContextService);
    private confirmationService = inject(ConfirmationService);

    saving = false;
    testingConnection = false;
    loading = false;
    isEditing = false;
    geoserverId?: number;
    vinculosLoading = false;
    vinculoSaving = false;
    vinculoActionId: number | null = null;
    vinculos: GeoServerBanco[] = [];
    canCreateVinculo = false;
    canUpdateVinculo = false;
    canDeleteVinculo = false;

    statusOptions = [
        { label: 'ACTIVE', value: 'ACTIVE' },
        { label: 'DRAINING', value: 'DRAINING' },
        { label: 'MAINTENANCE', value: 'MAINTENANCE' },
        { label: 'OFFLINE', value: 'OFFLINE' }
    ];

    form = this.fb.group({
        nome: this.fb.control('', Validators.required),
        base_url: this.fb.control('', Validators.required),
        admin_user: this.fb.control('', Validators.required),
        admin_password: this.fb.control(''),
        status: this.fb.control<GeoServerStatus>('ACTIVE', Validators.required),
        prioridade: this.fb.control<number | null>(1, Validators.required),
        limite_workspaces: this.fb.control<number | null>(null),
        observacoes: this.fb.control(''),
        ativo: this.fb.control(true, Validators.required)
    });

    vinculoForm = this.fb.group({
        banco: this.fb.control<number | null>(null, Validators.required),
        ativo: this.fb.control(true, Validators.required)
    });

    bancoOptionsProvider: UiLookupOptionsProvider = (query) => this.bancoService.options(query);

    ngOnInit() {
        this.resolveVinculoPermissions();

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
        this.geoserverId = id;
        this.loadGeoServer();
    }

    goBack() {
        this.router.navigateByUrl('/pages/geoespacial/geoservers');
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

        const adminPassword = (this.form.controls.admin_password.value ?? '').trim();
        if (!this.isEditing && !adminPassword) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Senha obrigatória',
                detail: 'Informe a senha para criar o GeoServer.'
            });
            return;
        }

        this.saving = true;

        const request =
            this.isEditing && this.geoserverId
                ? this.geoserverService.update(this.geoserverId, this.buildUpdatePayload())
                : this.geoserverService.create(this.buildCreatePayload());

        request.subscribe({
            next: () => {
                this.saving = false;
                this.messageService.add({
                    severity: 'success',
                    summary: this.isEditing ? 'GeoServer atualizado' : 'GeoServer criado',
                    detail: 'Operação concluída com sucesso.'
                });
                this.goBack();
            },
            error: (error: unknown) => {
                this.saving = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Falha ao salvar',
                    detail: getBackendErrorMessage(error, 'Não foi possível salvar o GeoServer.')
                });
            }
        });
    }

    testConnection() {
        const raw = this.form.getRawValue();
        const baseUrl = (raw.base_url ?? '').trim();
        const adminUser = (raw.admin_user ?? '').trim();
        const adminPassword = (raw.admin_password ?? '').trim();

        if (!baseUrl || !adminUser) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Campos obrigatórios',
                detail: 'Preencha URL base e usuário admin para testar a conexão.'
            });
            return;
        }

        if (!this.isEditing && !adminPassword) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Senha obrigatória',
                detail: 'Informe a senha para testar a conexão.'
            });
            return;
        }

        const payload: GeoServerTestConnectionPayload = {
            base_url: baseUrl,
            admin_user: adminUser
        };

        if (adminPassword) {
            payload.admin_password = adminPassword;
        }
        if (this.isEditing && this.geoserverId) {
            payload.geoserver_id = this.geoserverId;
        }

        this.testingConnection = true;
        this.geoserverService.testConnection(payload).subscribe({
            next: (response) => {
                this.testingConnection = false;
                this.messageService.add({
                    severity: 'success',
                    summary: 'Conexão válida',
                    detail: response.detail || 'Conexão realizada com sucesso.'
                });
            },
            error: (error: unknown) => {
                this.testingConnection = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Falha na conexão',
                    detail: getBackendErrorMessage(error, 'Não foi possível conectar no GeoServer.')
                });
            }
        });
    }

    private loadGeoServer() {
        if (!this.geoserverId) {
            return;
        }

        this.loading = true;
        this.geoserverService.get(this.geoserverId).subscribe({
            next: (geoserver) => {
                this.loading = false;
                this.form.patchValue({
                    nome: geoserver.nome,
                    base_url: geoserver.base_url,
                    admin_user: geoserver.admin_user,
                    admin_password: '',
                    status: geoserver.status,
                    prioridade: geoserver.prioridade,
                    limite_workspaces: geoserver.limite_workspaces,
                    observacoes: geoserver.observacoes ?? '',
                    ativo: geoserver.ativo
                });
                this.clearAdminPasswordField();
                this.loadVinculos();
            },
            error: () => {
                this.loading = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'GeoServer não encontrado',
                    detail: 'Retornando para a lista.'
                });
                this.goBack();
            }
        });
    }

    private buildCreatePayload(): GeoServerCreate {
        const raw = this.form.getRawValue();
        const payload: GeoServerCreate = {
            nome: (raw.nome ?? '').trim(),
            base_url: (raw.base_url ?? '').trim(),
            admin_user: (raw.admin_user ?? '').trim(),
            status: (raw.status ?? 'ACTIVE') as GeoServerStatus,
            prioridade: Number(raw.prioridade ?? 1),
            limite_workspaces: raw.limite_workspaces === null || raw.limite_workspaces === undefined ? null : Number(raw.limite_workspaces),
            observacoes: (raw.observacoes ?? '').trim() || null,
            ativo: Boolean(raw.ativo)
        };

        const adminPassword = (raw.admin_password ?? '').trim();
        if (adminPassword) {
            payload.admin_password = adminPassword;
        }

        return payload;
    }

    private clearAdminPasswordField() {
        this.form.controls.admin_password.setValue('');
        this.form.controls.admin_password.markAsPristine();
        setTimeout(() => {
            const passwordInput = document.getElementById('senha') as HTMLInputElement | null;
            if (passwordInput) {
                passwordInput.value = '';
            }
        });
    }

    private buildUpdatePayload(): GeoServerUpdate {
        return this.buildCreatePayload();
    }

    createVinculo() {
        if (!this.geoserverId || !this.canCreateVinculo) {
            return;
        }

        if (this.vinculoForm.invalid) {
            this.vinculoForm.markAllAsTouched();
            this.messageService.add({
                severity: 'warn',
                summary: 'Campos obrigatórios',
                detail: 'Selecione o banco para criar o vínculo.'
            });
            return;
        }

        const raw = this.vinculoForm.getRawValue();
        this.vinculoSaving = true;

        this.geoserverBancoService
            .create({
                geoserver: this.geoserverId,
                banco: Number(raw.banco),
                ativo: Boolean(raw.ativo)
            })
            .subscribe({
                next: () => {
                    this.vinculoSaving = false;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Vínculo criado',
                        detail: 'Banco vinculado ao GeoServer com sucesso.'
                    });
                    this.vinculoForm.reset({ banco: null, ativo: true });
                    this.vinculoForm.markAsPristine();
                    this.vinculoForm.markAsUntouched();
                    this.vinculoForm.updateValueAndValidity({ emitEvent: false });
                    this.loadVinculos();
                },
                error: (error: unknown) => {
                    this.vinculoSaving = false;
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Falha ao vincular',
                        detail: getBackendErrorMessage(error, 'Não foi possível criar o vínculo GeoServer x Banco.')
                    });
                }
            });
    }

    toggleVinculo(vinculo: GeoServerBanco) {
        if (!this.canUpdateVinculo) {
            return;
        }

        this.vinculoActionId = vinculo.id;
        this.geoserverBancoService
            .update(vinculo.id, { ativo: !vinculo.ativo })
            .subscribe({
                next: () => {
                    this.vinculoActionId = null;
                    this.vinculos = this.vinculos.map((item) =>
                        item.id === vinculo.id ? { ...item, ativo: !item.ativo } : item
                    );
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Vínculo atualizado',
                        detail: 'Status do vínculo atualizado com sucesso.'
                    });
                },
                error: (error: unknown) => {
                    this.vinculoActionId = null;
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Falha ao atualizar vínculo',
                        detail: getBackendErrorMessage(error, 'Não foi possível atualizar o status do vínculo.')
                    });
                }
            });
    }

    removeVinculo(vinculo: GeoServerBanco) {
        if (!this.canDeleteVinculo) {
            return;
        }

        this.confirmationService.confirm({
            header: 'Excluir vínculo',
            message: `Confirma excluir o vínculo "${vinculo.banco_label ?? vinculo.banco}" deste GeoServer?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.vinculoActionId = vinculo.id;
                this.geoserverBancoService.remove(vinculo.id).subscribe({
                    next: () => {
                        this.vinculoActionId = null;
                        this.vinculos = this.vinculos.filter((item) => item.id !== vinculo.id);
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Vínculo removido',
                            detail: 'Registro excluído com sucesso.'
                        });
                    },
                    error: (error: unknown) => {
                        this.vinculoActionId = null;
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Falha ao excluir vínculo',
                            detail: getBackendErrorMessage(error, 'Não foi possível excluir o vínculo.')
                        });
                    }
                });
            }
        });
    }

    isVinculoBusy(vinculoId: number) {
        return this.vinculoActionId === vinculoId;
    }

    private loadVinculos() {
        if (!this.geoserverId) {
            this.vinculos = [];
            return;
        }

        this.vinculosLoading = true;
        this.geoserverBancoService
            .list({
                geoserver: this.geoserverId,
                rows: 200,
                first: 0
            })
            .subscribe({
                next: (response) => {
                    this.vinculosLoading = false;
                    this.vinculos = response.data;
                },
                error: () => {
                    this.vinculosLoading = false;
                    this.vinculos = [];
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Falha ao carregar vínculos',
                        detail: 'Não foi possível carregar os bancos vinculados ao GeoServer.'
                    });
                }
            });
    }

    private resolveVinculoPermissions() {
        this.canCreateVinculo = this.permissionContext.hasPermission(PERMISSION_KEYS.GEOSERVER_CREATE);
        this.canUpdateVinculo = this.permissionContext.hasPermission(PERMISSION_KEYS.GEOSERVER_UPDATE);
        this.canDeleteVinculo = this.permissionContext.hasPermission(PERMISSION_KEYS.GEOSERVER_DELETE);
    }
}
