import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';

import { ContratoService } from '../contrato.service';
import { problemMessage } from '@/app/core/utils/api-problem';
import { UUID_PATTERN } from '@/app/core/utils/session-data';
import { UiAutocomplete } from '@/app/shared/ui/autocomplete/autocomplete';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiCheckbox } from '@/app/shared/ui/checkbox/checkbox';
import { UiConfirmDialog } from '@/app/shared/ui/confirm-dialog/confirm-dialog';
import { UiInputDate } from '@/app/shared/ui/input-date/input-date';
import { UiInputNumber } from '@/app/shared/ui/input-number/input-number';
import { UiInputText } from '@/app/shared/ui/input-text/input-text';
import { TemporaryPasswordNotice } from '@/app/shared/ui/temporary-password/temporary-password';
import { Contract, ContractAdmin, ContractAdminPasswordReset, ContractProvision, ContractProvisionResult, ContractWrite } from '@/app/types/contrato';

type ContractTab = 'principal' | 'primeiro-acesso' | 'administradores';

// Retenção pós-contrato (ADR 0007): padrão 90 dias, máximo 365.
const DEFAULT_RETENTION_DAYS = 90;
const MAX_RETENTION_DAYS = 365;

@Component({
    selector: 'app-contrato-formulario',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, UiAutocomplete, UiInputNumber, UiInputText, UiInputDate, UiButton, UiCheckbox, UiConfirmDialog, TabsModule, TagModule, TemporaryPasswordNotice],
    templateUrl: './formulario.html',
    providers: [ConfirmationService]
})
export class ContratoFormPage implements OnInit {
    private fb = inject(FormBuilder);
    readonly contratoService = inject(ContratoService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    readonly maxRetentionDays = MAX_RETENTION_DAYS;

    saving = false;
    provisioning = false;
    loading = false;
    loadingAdmins = false;
    isEditing = false;
    activeTab: ContractTab = 'principal';
    contractId?: string;
    provisionResult: ContractProvisionResult | null = null;
    resetResult: ContractAdminPasswordReset | null = null;
    admins: ContractAdmin[] = [];
    private resettingAdminIds = new Set<string>();
    private requestedTab: ContractTab | null = null;

    form = this.fb.group({
        name: this.fb.nonNullable.control('', Validators.required),
        plan: this.fb.control<string | null>(null),
        start_date: this.fb.nonNullable.control('', Validators.required),
        end_date: this.fb.nonNullable.control(''),
        licenses: this.fb.nonNullable.control(1, [Validators.required, Validators.min(1)]),
        post_termination_retention_days: this.fb.nonNullable.control(DEFAULT_RETENTION_DAYS, [Validators.required, Validators.min(0), Validators.max(MAX_RETENTION_DAYS)]),
        is_active: this.fb.nonNullable.control(true)
    });

    provisionForm = this.fb.nonNullable.group({
        organization_name: ['', Validators.required],
        username: ['', Validators.required],
        name: ['', Validators.required]
    });

    ngOnInit() {
        const tabParam = this.route.snapshot.queryParamMap.get('tab');

        if (tabParam === 'primeiro-acesso' || tabParam === 'administradores') {
            this.requestedTab = tabParam;
            this.activeTab = tabParam;
        }

        const idParam = this.route.snapshot.paramMap.get('id');

        if (idParam !== null && !UUID_PATTERN.test(idParam)) {
            // Só public_id UUID chega à API; link forjado volta para a lista (CSPT).
            this.goBack();

            return;
        }

        if (idParam) {
            this.isEditing = true;
            this.contractId = idParam;
            this.loadContract();
            this.loadAdmins();
        }
    }

    get showProvisionTab() {
        return this.isEditing && !this.loadingAdmins && this.admins.length === 0;
    }

    get showAdminsTab() {
        return this.isEditing && !this.loadingAdmins && this.admins.length > 0;
    }

    goBack() {
        this.router.navigateByUrl('/pages/administracao/contrato');
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

        const payload = this.buildPayload();

        this.saving = true;

        const request = this.isEditing && this.contractId ? this.contratoService.update(this.contractId, payload) : this.contratoService.create(payload);

        request.subscribe({
            next: (contract: Contract) => {
                this.saving = false;
                this.messageService.add({
                    severity: 'success',
                    summary: this.isEditing ? 'Contrato atualizado' : 'Contrato criado',
                    detail: 'Operação concluída com sucesso.'
                });

                if (this.isEditing) {
                    this.goBack();

                    return;
                }

                this.router.navigate(['/pages/administracao/contrato', contract.public_id], { queryParams: { tab: 'primeiro-acesso' } });
            },
            error: (error: unknown) => {
                this.saving = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Falha ao salvar',
                    detail: problemMessage(error, 'Verifique os dados e tente novamente.')
                });
            }
        });
    }

    provision() {
        if (!this.contractId) {
            return;
        }

        if (this.provisionForm.invalid) {
            this.provisionForm.markAllAsTouched();
            this.messageService.add({
                severity: 'warn',
                summary: 'Campos obrigatórios',
                detail: 'Preencha os campos obrigatórios para provisionar o primeiro acesso.'
            });

            return;
        }

        this.provisioning = true;

        this.contratoService.provision(this.contractId, this.buildProvisionPayload()).subscribe({
            next: (result: ContractProvisionResult) => {
                this.provisioning = false;
                this.provisionResult = result;
                this.resetResult = null;
                this.provisionForm.reset();
                this.messageService.add({
                    severity: 'success',
                    summary: 'Primeiro acesso provisionado',
                    detail: 'Organização e administrador do contrato criados com sucesso.'
                });
                this.loadAdmins();
            },
            error: (error: unknown) => {
                this.provisioning = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Falha no provisionamento',
                    detail: problemMessage(error, 'Não foi possível provisionar o primeiro acesso.')
                });
            }
        });
    }

    confirmResetPassword(admin: ContractAdmin) {
        if (!this.contractId || this.isResetting(admin.public_id)) {
            return;
        }

        this.confirmationService.confirm({
            header: 'Redefinir senha',
            message: `Gerar uma nova senha temporária para "${admin.username}"? As sessões abertas desse usuário serão encerradas.`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.resetPassword(admin)
        });
    }

    isResetting(adminPublicId: string) {
        return this.resettingAdminIds.has(adminPublicId);
    }

    private resetPassword(admin: ContractAdmin) {
        if (!this.contractId) {
            return;
        }

        this.resettingAdminIds.add(admin.public_id);
        this.contratoService.resetAdminPassword(this.contractId, admin.public_id).subscribe({
            next: (result: ContractAdminPasswordReset) => {
                this.resettingAdminIds.delete(admin.public_id);
                this.resetResult = result;
                this.provisionResult = null;
                this.admins = this.admins.map((item) => (item.public_id === result.user.public_id ? result.user : item));
                this.messageService.add({
                    severity: 'success',
                    summary: 'Senha redefinida',
                    detail: `Senha temporária gerada para o usuário ${result.user.username}.`
                });
            },
            error: (error: unknown) => {
                this.resettingAdminIds.delete(admin.public_id);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Falha ao redefinir senha',
                    detail: problemMessage(error, 'Não foi possível redefinir a senha do administrador.')
                });
            }
        });
    }

    private loadContract() {
        if (!this.contractId) {
            return;
        }

        this.loading = true;
        this.contratoService.get(this.contractId).subscribe({
            next: (contract) => {
                this.loading = false;
                this.form.patchValue({
                    name: contract.name,
                    plan: contract.plan,
                    start_date: contract.start_date,
                    end_date: contract.end_date ?? '',
                    licenses: contract.licenses,
                    post_termination_retention_days: contract.post_termination_retention_days,
                    is_active: contract.is_active
                });

                if (!this.provisionForm.controls.organization_name.value.trim()) {
                    this.provisionForm.patchValue({ organization_name: `${contract.name} - Organização Principal` });
                }
            },
            error: () => {
                this.loading = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Contrato não encontrado',
                    detail: 'Retornando para a lista.'
                });
                this.goBack();
            }
        });
    }

    private loadAdmins() {
        if (!this.contractId) {
            return;
        }

        this.loadingAdmins = true;
        this.contratoService.admins(this.contractId).subscribe({
            next: (response) => {
                this.loadingAdmins = false;
                this.admins = response.data ?? [];
                this.syncConditionalTab();
            },
            error: (error: unknown) => {
                this.loadingAdmins = false;
                this.admins = [];
                this.syncConditionalTab();
                this.messageService.add({
                    severity: 'error',
                    summary: 'Falha ao carregar administradores',
                    detail: problemMessage(error, 'Não foi possível carregar os administradores do contrato.')
                });
            }
        });
    }

    private syncConditionalTab() {
        if (!this.isEditing) {
            return;
        }

        if (this.requestedTab) {
            const requested = this.requestedTab;

            this.requestedTab = null;

            if (requested === 'primeiro-acesso' && this.admins.length === 0) {
                this.activeTab = 'primeiro-acesso';

                return;
            }

            if (requested === 'administradores' && this.admins.length > 0) {
                this.activeTab = 'administradores';

                return;
            }
        }

        if (this.admins.length > 0 && this.activeTab === 'primeiro-acesso') {
            this.activeTab = 'administradores';

            return;
        }

        if (this.admins.length === 0 && this.activeTab === 'administradores') {
            this.activeTab = 'primeiro-acesso';
        }
    }

    private buildPayload(): ContractWrite {
        const raw = this.form.getRawValue();

        return {
            name: raw.name.trim(),
            plan: raw.plan || null,
            start_date: raw.start_date,
            end_date: raw.end_date ? raw.end_date : null,
            licenses: raw.licenses,
            post_termination_retention_days: raw.post_termination_retention_days,
            is_active: raw.is_active
        };
    }

    private buildProvisionPayload(): ContractProvision {
        const raw = this.provisionForm.getRawValue();

        return {
            organization_name: raw.organization_name.trim(),
            username: raw.username.trim(),
            name: raw.name.trim()
        };
    }
}
