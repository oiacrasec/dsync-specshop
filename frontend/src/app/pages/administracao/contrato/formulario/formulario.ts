import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TabsModule } from 'primeng/tabs';

import { UserContextService } from '@/app/core/services/user-context.service';
import { ContratoService } from '../contrato.service';
import { getBackendErrorMessage } from '@/app/pages/administracao/usuario/error-message';
import { UiInputNumber } from '@/app/shared/ui/input-number/input-number';
import { UiInputText } from '@/app/shared/ui/input-text/input-text';
import { UiInputDate } from '@/app/shared/ui/input-date/input-date';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiCheckbox } from '@/app/shared/ui/checkbox/checkbox';
import { ContratoAdministrador, ContratoAdministradorResetSenhaResult, Contrato, ContratoAdministradoresResponse, ContratoCreate, ContratoProvisionamentoInicialCreate, ContratoProvisionamentoInicialResult } from '@/app/types/contrato';

@Component({
    selector: 'app-contrato-formulario',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, UiInputNumber, UiInputText, UiInputDate, UiButton, UiCheckbox, TabsModule, ToastModule],
    templateUrl: './formulario.html',
    providers: []
})
export class ContratoFormPage implements OnInit {
    private fb = inject(FormBuilder);
    private contratoService = inject(ContratoService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private userContextService = inject(UserContextService);

    saving = false;
    provisionandoPrimeiroAcesso = false;
    loading = false;
    loadingAdministradores = false;
    isEditing = false;
    activeTab = 'principal';
    contratoId?: number;
    provisionamentoResult: ContratoProvisionamentoInicialResult | null = null;
    resetSenhaResult: ContratoAdministradorResetSenhaResult | null = null;
    administradores: ContratoAdministrador[] = [];
    private resettingAdminIds = new Set<number>();
    private requestedTab: 'primeiro-acesso' | 'administradores' | null = null;

    form = this.fb.nonNullable.group({
        nome: ['', Validators.required],
        data_inicio: ['', Validators.required],
        data_fim: [''],
        licencas: [1, [Validators.min(1)]],
        ativo: [true]
    });

    primeiroAcessoForm = this.fb.nonNullable.group({
        organizacao_nome: ['', Validators.required],
        usuario_nome: ['', Validators.required],
        usuario_sobrenome: ['', Validators.required],
        usuario_username: ['', Validators.required],
        usuario_email: ['', [Validators.required, Validators.email]]
    });

    ngOnInit() {
        const tabParam = this.route.snapshot.queryParamMap.get('tab');
        if (tabParam === 'primeiro-acesso' || tabParam === 'administradores') {
            this.requestedTab = tabParam;
            this.activeTab = tabParam;
        }

        const idParam = this.route.snapshot.paramMap.get('id');
        if (idParam) {
            this.isEditing = true;
            this.contratoId = Number(idParam);
            this.loadContrato();
            this.loadAdministradores();
        }
    }

    get exibirPrimeiroAcessoTab() {
        return this.isEditing && !this.loadingAdministradores && this.administradores.length === 0;
    }

    get exibirAdministradoresTab() {
        return this.isEditing && !this.loadingAdministradores && this.administradores.length > 0;
    }

    goBack() {
        this.router.navigateByUrl('/pages/administracao/contrato');
    }

    save() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.messageService.add({
                severity: 'warn',
                summary: 'Campos obrigatorios',
                detail: 'Preencha os campos obrigatorios antes de salvar.'
            });
            return;
        }

        const payload = this.buildPayload();
        this.saving = true;

        const request = this.isEditing && this.contratoId ? this.contratoService.update(this.contratoId, payload) : this.contratoService.create(payload);

        request.subscribe({
            next: (contrato: Contrato) => {
                this.saving = false;
                this.userContextService.updateActiveContractName(contrato.id, contrato.nome);
                this.messageService.add({
                    severity: 'success',
                    summary: this.isEditing ? 'Contrato atualizado' : 'Contrato criado',
                    detail: 'Operação concluída com sucesso.'
                });

                if (this.isEditing) {
                    this.goBack();
                    return;
                }

                this.router.navigate(['/pages/administracao/contrato', contrato.id], { queryParams: { tab: 'primeiro-acesso' } });
            },
            error: (error: unknown) => {
                this.saving = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Falha ao salvar',
                    detail: getBackendErrorMessage(error, 'Verifique os dados e tente novamente.')
                });
            }
        });
    }

    provisionarPrimeiroAcesso() {
        if (!this.contratoId) {
            return;
        }

        if (this.primeiroAcessoForm.invalid) {
            this.primeiroAcessoForm.markAllAsTouched();
            this.messageService.add({
                severity: 'warn',
                summary: 'Campos obrigatórios',
                detail: 'Preencha os campos obrigatórios para provisionar o primeiro acesso.'
            });
            return;
        }

        this.provisionandoPrimeiroAcesso = true;
        const payload = this.buildPrimeiroAcessoPayload();

        this.contratoService.provisionarPrimeiroAcesso(this.contratoId, payload).subscribe({
            next: (result: ContratoProvisionamentoInicialResult) => {
                this.provisionandoPrimeiroAcesso = false;
                this.provisionamentoResult = result;
                this.resetSenhaResult = null;
                this.messageService.add({
                    severity: 'success',
                    summary: 'Primeiro acesso provisionado',
                    detail: 'Organização e usuário admin do contrato criados com sucesso.'
                });
                this.loadAdministradores();
            },
            error: (error: unknown) => {
                this.provisionandoPrimeiroAcesso = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Falha no provisionamento',
                    detail: getBackendErrorMessage(error, 'Não foi possível provisionar o primeiro acesso.')
                });
            }
        });
    }

    resetarSenhaAdministrador(administrador: ContratoAdministrador) {
        if (!this.contratoId || this.isResetandoAdministrador(administrador.id)) {
            return;
        }

        this.resettingAdminIds.add(administrador.id);
        this.contratoService.resetarSenhaAdministrador(this.contratoId, administrador.id).subscribe({
            next: (result: ContratoAdministradorResetSenhaResult) => {
                this.resettingAdminIds.delete(administrador.id);
                this.resetSenhaResult = result;
                this.provisionamentoResult = null;
                this.messageService.add({
                    severity: 'success',
                    summary: 'Senha resetada',
                    detail: `Senha temporária gerada para o usuário ${result.usuario.username}.`
                });
            },
            error: (error: unknown) => {
                this.resettingAdminIds.delete(administrador.id);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Falha ao resetar senha',
                    detail: getBackendErrorMessage(error, 'Não foi possível resetar a senha do administrador.')
                });
            }
        });
    }

    isResetandoAdministrador(administradorId: number) {
        return this.resettingAdminIds.has(administradorId);
    }

    copyTemporaryPassword() {
        const temporaryPassword = this.provisionamentoResult?.senha_temporaria;
        if (!temporaryPassword) {
            return;
        }

        navigator.clipboard
            .writeText(temporaryPassword)
            .then(() => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Senha copiada',
                    detail: 'Senha temporária copiada para a área de transferência.'
                });
            })
            .catch(() => {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Cópia indisponível',
                    detail: 'Não foi possível copiar automaticamente. Copie manualmente.'
                });
            });
    }

    copyResetTemporaryPassword() {
        const temporaryPassword = this.resetSenhaResult?.senha_temporaria;
        if (!temporaryPassword) {
            return;
        }

        navigator.clipboard
            .writeText(temporaryPassword)
            .then(() => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Senha copiada',
                    detail: 'Senha temporária copiada para a área de transferência.'
                });
            })
            .catch(() => {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Cópia indisponível',
                    detail: 'Não foi possível copiar automaticamente. Copie manualmente.'
                });
            });
    }

    private loadContrato() {
        if (!this.contratoId) {
            return;
        }

        this.loading = true;
        this.contratoService.get(this.contratoId).subscribe({
            next: (contrato) => {
                this.loading = false;
                this.form.patchValue({
                    nome: contrato.nome,
                    data_inicio: contrato.data_inicio,
                    data_fim: contrato.data_fim ?? '',
                    licencas: contrato.licencas,
                    ativo: contrato.ativo
                });

                const currentOrganizationName = this.primeiroAcessoForm.controls.organizacao_nome.value.trim();
                if (!currentOrganizationName) {
                    this.primeiroAcessoForm.patchValue({
                        organizacao_nome: `${contrato.nome} - Organização Principal`
                    });
                }
            },
            error: () => {
                this.loading = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Contrato nao encontrado',
                    detail: 'Retornando para a lista.'
                });
                this.goBack();
            }
        });
    }

    private loadAdministradores() {
        if (!this.contratoId) {
            return;
        }

        this.loadingAdministradores = true;
        this.contratoService.administradores(this.contratoId).subscribe({
            next: (response: ContratoAdministradoresResponse) => {
                this.loadingAdministradores = false;
                this.administradores = response.data ?? [];
                this.syncConditionalTab();
            },
            error: (error: unknown) => {
                this.loadingAdministradores = false;
                this.administradores = [];
                this.syncConditionalTab();
                this.messageService.add({
                    severity: 'error',
                    summary: 'Falha ao carregar administradores',
                    detail: getBackendErrorMessage(error, 'Não foi possível carregar os administradores do contrato.')
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

            if (requested === 'primeiro-acesso' && this.administradores.length === 0) {
                this.activeTab = 'primeiro-acesso';
                return;
            }

            if (requested === 'administradores' && this.administradores.length > 0) {
                this.activeTab = 'administradores';
                return;
            }
        }

        if (this.administradores.length > 0 && this.activeTab === 'primeiro-acesso') {
            this.activeTab = 'administradores';
            return;
        }

        if (this.administradores.length === 0 && this.activeTab === 'administradores') {
            this.activeTab = 'primeiro-acesso';
        }
    }

    private buildPayload(): ContratoCreate {
        const raw = this.form.getRawValue();
        return {
            nome: raw.nome.trim(),
            data_inicio: raw.data_inicio,
            data_fim: raw.data_fim ? raw.data_fim : null,
            licencas: raw.licencas,
            ativo: raw.ativo
        };
    }

    private buildPrimeiroAcessoPayload(): ContratoProvisionamentoInicialCreate {
        const raw = this.primeiroAcessoForm.getRawValue();
        return {
            organizacao_nome: raw.organizacao_nome.trim(),
            usuario_nome: raw.usuario_nome.trim(),
            usuario_sobrenome: raw.usuario_sobrenome.trim(),
            usuario_username: raw.usuario_username.trim(),
            usuario_email: raw.usuario_email.trim().toLowerCase()
        };
    }
}
