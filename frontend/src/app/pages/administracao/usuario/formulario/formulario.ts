import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';

import { OrganizacaoService } from '@/app/pages/administracao/organizacao/organizacao.service';
import { getBackendErrorMessage } from '@/app/pages/administracao/usuario/error-message';
import { UsuarioService } from '@/app/pages/administracao/usuario/usuario.service';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiCheckbox } from '@/app/shared/ui/checkbox/checkbox';
import { UiConfirmDialog } from '@/app/shared/ui/confirm-dialog/confirm-dialog';
import { UiInputText } from '@/app/shared/ui/input-text/input-text';
import { UiMultiSelect, UiMultiSelectOption } from '@/app/shared/ui/multi-select/multi-select';
import { Usuario, UsuarioConfiguracao, UsuarioConfiguracaoUpdate, UsuarioOrganizacaoResumo, UsuarioPermissaoCatalogoItem, UsuarioPermissaoPreset } from '@/app/types/usuario';

@Component({
    selector: 'app-usuario-formulario',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule, UiInputText, UiButton, UiCheckbox, UiConfirmDialog, UiMultiSelect, SelectModule, TabsModule],
    templateUrl: './formulario.html',
    providers: [ConfirmationService]
})
export class UsuarioFormPage implements OnInit {
    private fb = inject(FormBuilder);
    private usuarioService = inject(UsuarioService);
    private organizacaoService = inject(OrganizacaoService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    loading = false;
    saving = false;
    isEditing = false;
    usuarioId?: number;
    organizacaoOptions: UiMultiSelectOption[] = [];
    createdUser: Usuario | null = null;
    contratoAdmin = false;

    organizacoesVinculadas: UsuarioOrganizacaoResumo[] = [];
    selectedOrganizacaoId: number | null = null;
    catalogoPermissoes: UsuarioPermissaoCatalogoItem[] = [];
    presets: UsuarioPermissaoPreset[] = [];
    selectedPresetCode: string | null = null;
    permissoesPorOrganizacao: Record<number, string[]> = {};
    permissionRoleOptions = [
        { label: 'Administrador', value: 'ROLE_ORGANIZACAO_ADMINISTRADOR' },
        { label: 'Editor', value: 'ROLE_ORGANIZACAO_EDITOR' },
        { label: 'Pesquisador', value: 'ROLE_ORGANIZACAO_PESQUISADOR' }
    ];

    form = this.fb.nonNullable.group({
        nome: ['', Validators.required],
        sobrenome: ['', Validators.required],
        username: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        organizacao_ids: this.fb.nonNullable.control<number[]>([], [Validators.required])
    });

    ngOnInit() {
        const idParam = this.route.snapshot.paramMap.get('id');

        if (!idParam) {
            this.loadOrganizacoes();

            return;
        }

        const id = Number(idParam);

        if (!Number.isFinite(id) || id <= 0) {
            this.goBack();

            return;
        }

        this.isEditing = true;
        this.usuarioId = id;
        this.form.controls.organizacao_ids.disable({ emitEvent: false });
        this.loadConfiguracao();
    }

    get selectedOrganizacaoNome() {
        if (!this.selectedOrganizacaoId) {
            return null;
        }

        return this.organizacoesVinculadas.find((item) => item.id === this.selectedOrganizacaoId)?.nome ?? null;
    }

    get presetOptions() {
        return this.presets.map((preset) => ({ label: preset.label, value: preset.code }));
    }

    goBack() {
        this.router.navigateByUrl('/pages/administracao/usuario');
    }

    submit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.messageService.add({
                severity: 'warn',
                summary: 'Campos obrigatorios',
                detail: 'Preencha os campos obrigatorios antes de salvar.'
            });

            return;
        }

        if (this.isEditing && !this.validatePermissionConfiguration()) {
            return;
        }

        this.saving = true;
        const request: Observable<Usuario | UsuarioConfiguracao> = this.isEditing && this.usuarioId ? this.usuarioService.updateConfiguracao(this.usuarioId, this.buildConfigurationPayload()) : this.usuarioService.create(this.form.getRawValue());

        request.pipe(finalize(() => (this.saving = false))).subscribe({
            next: (response: Usuario | UsuarioConfiguracao) => {
                if (this.isEditing) {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Usuario atualizado',
                        detail: 'Alteracoes salvas com sucesso.'
                    });
                    this.goBack();

                    return;
                }

                this.createdUser = response as Usuario;
                this.form.reset({
                    nome: '',
                    sobrenome: '',
                    username: '',
                    email: '',
                    organizacao_ids: []
                });
                this.messageService.add({
                    severity: 'success',
                    summary: 'Usuario criado',
                    detail: 'Cadastro concluido. Guarde a senha temporaria exibida abaixo.'
                });
            },
            error: (error: unknown) => {
                this.messageService.add({
                    severity: 'error',
                    summary: this.isEditing ? 'Falha ao atualizar usuario' : 'Falha ao criar usuario',
                    detail: getBackendErrorMessage(error, 'Nao foi possivel salvar o usuario.')
                });
            }
        });
    }

    copyTemporaryPassword() {
        const temporaryPassword = this.createdUser?.senha_temporaria;

        if (!temporaryPassword) {
            return;
        }

        navigator.clipboard
            .writeText(temporaryPassword)
            .then(() => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Senha copiada',
                    detail: 'Senha temporaria copiada para a area de transferencia.'
                });
            })
            .catch(() => {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Copia indisponivel',
                    detail: 'Nao foi possivel copiar automaticamente. Copie manualmente.'
                });
            });
    }

    selectOrganizacao(organizacaoId: number) {
        this.selectedOrganizacaoId = organizacaoId;
    }

    hasPermissaoSelecionada(permissionKey: string) {
        if (!this.selectedOrganizacaoId) {
            return false;
        }

        const selectedPermissions = this.permissoesPorOrganizacao[this.selectedOrganizacaoId] ?? [];

        return selectedPermissions.includes(permissionKey);
    }

    setPermissaoSelecionada(permissionKey: string, checked: boolean) {
        if (!this.selectedOrganizacaoId) {
            return;
        }

        const currentPermissions = [...(this.permissoesPorOrganizacao[this.selectedOrganizacaoId] ?? [])];

        if (checked) {
            if (!currentPermissions.includes(permissionKey)) {
                currentPermissions.push(permissionKey);
            }

            this.permissoesPorOrganizacao[this.selectedOrganizacaoId] = this.normalizePermissions(currentPermissions);

            return;
        }

        this.permissoesPorOrganizacao[this.selectedOrganizacaoId] = currentPermissions.filter((item) => item !== permissionKey);
    }

    applyPresetToSelectedOrganizacao() {
        if (!this.selectedOrganizacaoId || !this.selectedPresetCode) {
            return;
        }

        const preset = this.presets.find((item) => item.code === this.selectedPresetCode);

        if (!preset) {
            return;
        }

        this.permissoesPorOrganizacao[this.selectedOrganizacaoId] = this.normalizePermissions([...preset.permissions]);
        this.messageService.add({
            severity: 'success',
            summary: 'Preset aplicado',
            detail: 'Permissoes atualizadas para a organizacao selecionada.'
        });
    }

    applyPresetToAllOrganizacoes() {
        if (!this.selectedPresetCode) {
            return;
        }

        const preset = this.presets.find((item) => item.code === this.selectedPresetCode);

        if (!preset) {
            return;
        }

        for (const organizacao of this.organizacoesVinculadas) {
            this.permissoesPorOrganizacao[organizacao.id] = this.normalizePermissions([...preset.permissions]);
        }

        this.messageService.add({
            severity: 'success',
            summary: 'Preset aplicado',
            detail: 'Permissoes atualizadas para todas as organizacoes.'
        });
    }

    confirmApplyPresetToAllOrganizacoes() {
        if (!this.selectedPresetCode) {
            return;
        }

        this.confirmationService.confirm({
            header: 'Confirmar aplicação em todas',
            message: 'Deseja aplicar este preset para todas as organizações do usuário?',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Aplicar em todas',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-info',
            accept: () => this.applyPresetToAllOrganizacoes()
        });
    }

    private loadConfiguracao() {
        if (!this.usuarioId) {
            return;
        }

        this.loading = true;
        this.usuarioService
            .getConfiguracao(this.usuarioId)
            .pipe(finalize(() => (this.loading = false)))
            .subscribe({
                next: (usuario: UsuarioConfiguracao) => {
                    this.form.patchValue({
                        nome: usuario.nome,
                        sobrenome: usuario.sobrenome,
                        username: usuario.username,
                        email: usuario.email,
                        organizacao_ids: usuario.organizacoes.map((item) => item.id)
                    });
                    this.organizacaoOptions = usuario.organizacoes.map((item) => ({
                        label: item.nome,
                        value: item.id
                    }));
                    this.organizacoesVinculadas = usuario.organizacoes;
                    this.catalogoPermissoes = usuario.catalogo_permissoes ?? [];
                    this.presets = usuario.presets ?? [];
                    this.selectedPresetCode = this.presets.length ? this.presets[0].code : null;
                    this.applyPermissoesConfiguracao(usuario);
                    this.selectedOrganizacaoId = this.organizacoesVinculadas.length ? this.organizacoesVinculadas[0].id : null;
                },
                error: () => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Usuario nao encontrado',
                        detail: 'Retornando para a lista.'
                    });
                    this.goBack();
                }
            });
    }

    private loadOrganizacoes() {
        this.loading = true;
        this.organizacaoService
            .list({
                first: 0,
                rows: 500,
                ativo: true,
                ordering: 'nome'
            })
            .pipe(finalize(() => (this.loading = false)))
            .subscribe({
                next: (response) => {
                    this.organizacaoOptions = response.data.map((item) => ({
                        label: item.nome,
                        value: item.id
                    }));
                },
                error: () => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Falha ao carregar organizacoes',
                        detail: 'Nao foi possivel carregar as organizacoes do contrato.'
                    });
                }
            });
    }

    private buildConfigurationPayload(): UsuarioConfiguracaoUpdate {
        const raw = this.form.getRawValue();

        return {
            username: (raw.username ?? '').trim(),
            email: (raw.email ?? '').trim().toLowerCase(),
            nome: (raw.nome ?? '').trim(),
            sobrenome: (raw.sobrenome ?? '').trim(),
            contrato_admin: this.contratoAdmin,
            permissoes_organizacoes: this.organizacoesVinculadas.map((organizacao) => ({
                organizacao_id: organizacao.id,
                permissoes: [...(this.permissoesPorOrganizacao[organizacao.id] ?? [])]
            }))
        };
    }

    private applyPermissoesConfiguracao(usuario: UsuarioConfiguracao) {
        const nextMap: Record<number, string[]> = {};

        for (const organizacao of usuario.organizacoes) {
            nextMap[organizacao.id] = [];
        }

        for (const permissao of usuario.permissoes_organizacoes) {
            nextMap[permissao.organizacao_id] = this.normalizePermissions([...(permissao.permissoes ?? [])]);
        }

        this.permissoesPorOrganizacao = nextMap;
        this.contratoAdmin = Boolean(usuario.contrato_admin);
    }

    private validatePermissionConfiguration() {
        if (!this.organizacoesVinculadas.length) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Usuario sem organizacoes',
                detail: 'Vincule ao menos uma organizacao antes de configurar permissoes.'
            });

            return false;
        }

        for (const organizacao of this.organizacoesVinculadas) {
            if (!this.permissoesPorOrganizacao[organizacao.id]) {
                this.permissoesPorOrganizacao[organizacao.id] = [];
            }
        }

        return true;
    }

    private normalizePermissions(permissions: string[]) {
        return Array.from(new Set(permissions));
    }
}
