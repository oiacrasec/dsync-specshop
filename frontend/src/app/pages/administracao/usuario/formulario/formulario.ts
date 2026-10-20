import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';

import { PermissionCatalogService } from '@/app/core/services/permission-catalog.service';
import { PermissionContextService } from '@/app/core/services/permission-context.service';
import { PERMISSION_KEYS } from '@/app/core/tokens/permission.keys';
import { problemMessage } from '@/app/core/utils/api-problem';
import { UUID_PATTERN } from '@/app/core/utils/session-data';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiCheckbox } from '@/app/shared/ui/checkbox/checkbox';
import { UiInputText } from '@/app/shared/ui/input-text/input-text';
import { TemporaryPasswordNotice } from '@/app/shared/ui/temporary-password/temporary-password';
import { PermissionCatalogGroup } from '@/app/types/permission';
import { ContractUserCreated, ContractUserWrite, UserAccess } from '@/app/types/usuario';
import { UserAccessEditor } from '../permissoes/permissoes';
import { UsuarioService } from '../usuario.service';

@Component({
    selector: 'app-usuario-formulario',
    standalone: true,
    imports: [CommonModule, TabsModule, ReactiveFormsModule, UiInputText, UiCheckbox, UiButton, TemporaryPasswordNotice, UserAccessEditor],
    templateUrl: './formulario.html'
})
export class UsuarioFormPage implements OnInit {
    private fb = inject(FormBuilder);
    private usuarioService = inject(UsuarioService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private catalogService = inject(PermissionCatalogService);
    private permissionContext = inject(PermissionContextService);
    private accessEditor = viewChild(UserAccessEditor);

    saving = false;
    isEditing = false;
    userId?: string;
    created: ContractUserCreated | null = null;
    readonly access = signal<UserAccess | null>(null);
    readonly catalog = signal<PermissionCatalogGroup[]>([]);
    readonly canEditAccess = signal(false);

    form = this.fb.nonNullable.group({
        username: ['', Validators.required],
        name: ['', Validators.required],
        is_active: [true]
    });

    ngOnInit() {
        const idParam = this.route.snapshot.paramMap.get('id');

        if (idParam === null) {
            return;
        }

        if (!UUID_PATTERN.test(idParam)) {
            this.goBack();

            return;
        }

        this.isEditing = true;
        this.userId = idParam;
        this.loadUser();
        this.loadAccess();
    }

    goBack() {
        this.router.navigateByUrl('/pages/administracao/usuario');
    }

    save() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.messageService.add({ severity: 'warn', summary: 'Campos obrigatórios', detail: 'Preencha os campos obrigatórios antes de salvar.' });

            return;
        }

        const raw = this.form.getRawValue();
        const payload: ContractUserWrite = { username: raw.username.trim(), name: raw.name.trim(), is_active: raw.is_active };

        this.saving = true;

        if (this.isEditing && this.userId) {
            const userId = this.userId;

            this.usuarioService.update(userId, payload).subscribe({
                next: () => {
                    const editor = this.accessEditor();

                    if (editor?.dirty() && this.canEditAccess()) {
                        this.saveAccess(userId, editor);

                        return;
                    }

                    this.saving = false;
                    this.messageService.add({ severity: 'success', summary: 'Usuário atualizado', detail: 'Operação concluída com sucesso.' });
                    this.goBack();
                },
                error: (error: unknown) => this.fail(error)
            });

            return;
        }

        this.usuarioService.create(payload).subscribe({
            next: (user) => {
                this.saving = false;
                this.created = user;
                this.isEditing = true;
                this.userId = user.public_id;
                this.messageService.add({ severity: 'success', summary: 'Usuário criado', detail: 'Repasse a senha temporária ao usuário; ela não será exibida de novo.' });
            },
            error: (error: unknown) => this.fail(error)
        });
    }

    private saveAccess(userId: string, editor: UserAccessEditor) {
        this.usuarioService.replaceAccess(userId, editor.value()).subscribe({
            next: () => {
                this.saving = false;
                this.messageService.add({ severity: 'success', summary: 'Usuário atualizado', detail: 'Dados e permissões salvos com sucesso.' });
                this.goBack();
            },
            error: (error: unknown) => {
                this.saving = false;
                this.messageService.add({ severity: 'error', summary: 'Falha ao salvar permissões', detail: problemMessage(error, 'Os dados foram salvos, mas as permissões não. Revise e tente novamente.') });
            }
        });
    }

    private loadAccess() {
        if (!this.userId) {
            return;
        }

        this.canEditAccess.set(this.permissionContext.hasPermission(PERMISSION_KEYS.ASSIGNMENT_CREATE) && this.permissionContext.hasPermission(PERMISSION_KEYS.ASSIGNMENT_DELETE));
        this.catalogService.load().subscribe({ next: (groups) => this.catalog.set(groups) });
        this.usuarioService.getAccess(this.userId).subscribe({
            next: (access) => this.access.set(access),
            error: (error: unknown) => this.messageService.add({ severity: 'error', summary: 'Falha ao carregar permissões', detail: problemMessage(error, 'Não foi possível carregar as permissões do usuário.') })
        });
    }

    private fail(error: unknown) {
        this.saving = false;
        this.messageService.add({ severity: 'error', summary: 'Falha ao salvar', detail: problemMessage(error, 'Verifique os dados e tente novamente.') });
    }

    private loadUser() {
        if (!this.userId) {
            return;
        }

        this.usuarioService.get(this.userId).subscribe({
            next: (user) => this.form.patchValue({ username: user.username, name: user.name, is_active: user.is_active }),
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Usuário não encontrado', detail: 'Retornando para a lista.' });
                this.goBack();
            }
        });
    }
}
