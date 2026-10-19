import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { problemMessage } from '@/app/core/utils/api-problem';
import { UUID_PATTERN } from '@/app/core/utils/session-data';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiCheckbox } from '@/app/shared/ui/checkbox/checkbox';
import { UiInputText } from '@/app/shared/ui/input-text/input-text';
import { TemporaryPasswordNotice } from '@/app/shared/ui/temporary-password/temporary-password';
import { ContractUserCreated, ContractUserWrite } from '@/app/types/usuario';
import { UsuarioService } from '../usuario.service';

@Component({
    selector: 'app-usuario-formulario',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, UiInputText, UiCheckbox, UiButton, TemporaryPasswordNotice],
    templateUrl: './formulario.html'
})
export class UsuarioFormPage implements OnInit {
    private fb = inject(FormBuilder);
    private usuarioService = inject(UsuarioService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);

    saving = false;
    isEditing = false;
    userId?: string;
    created: ContractUserCreated | null = null;

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
            this.usuarioService.update(this.userId, payload).subscribe({
                next: () => {
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
