import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';

import { getBackendErrorMessage } from '@/app/pages/administracao/usuario/error-message';
import { BancoGeoespacialService } from '@/app/pages/geoespacial/banco-geoespacial/banco-geoespacial.service';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiCheckbox } from '@/app/shared/ui/checkbox/checkbox';
import { UiInputNumber } from '@/app/shared/ui/input-number/input-number';
import { UiInputPassword } from '@/app/shared/ui/input-password/input-password';
import { UiInputText } from '@/app/shared/ui/input-text/input-text';
import { BancoGeoespacialCreate, BancoGeoespacialTestConnectionPayload, BancoGeoespacialUpdate } from '@/app/types/banco-geoespacial';

@Component({
    selector: 'app-banco-geoespacial-formulario',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, UiInputText, UiInputNumber, UiInputPassword, UiCheckbox, UiButton, TabsModule],
    templateUrl: './formulario.html'
})
export class BancoGeoespacialFormPage implements OnInit {
    private fb = inject(FormBuilder);
    private bancoService = inject(BancoGeoespacialService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);

    saving = false;
    testingConnection = false;
    loading = false;
    isEditing = false;
    bancoId?: number;

    form = this.fb.group({
        nome: this.fb.control('', Validators.required),
        host: this.fb.control('', Validators.required),
        porta: this.fb.control<number | null>(5432, Validators.required),
        database_name: this.fb.control('', Validators.required),
        usuario: this.fb.control('', Validators.required),
        senha: this.fb.control(''),
        observacoes: this.fb.control(''),
        ativo: this.fb.control(true, Validators.required)
    });

    ngOnInit() {
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
        this.bancoId = id;
        this.loadBanco();
    }

    goBack() {
        this.router.navigateByUrl('/pages/geoespacial/bancos');
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

        const senha = (this.form.controls.senha.value ?? '').trim();
        if (!this.isEditing && !senha) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Senha obrigatória',
                detail: 'Informe a senha para criar o banco geoespacial.'
            });
            return;
        }

        this.saving = true;

        const request = this.isEditing && this.bancoId ? this.bancoService.update(this.bancoId, this.buildUpdatePayload()) : this.bancoService.create(this.buildCreatePayload());

        request.subscribe({
            next: () => {
                this.saving = false;
                this.messageService.add({
                    severity: 'success',
                    summary: this.isEditing ? 'Banco atualizado' : 'Banco criado',
                    detail: 'Operação concluída com sucesso.'
                });
                this.goBack();
            },
            error: (error: unknown) => {
                this.saving = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Falha ao salvar',
                    detail: getBackendErrorMessage(error, 'Não foi possível salvar o banco geoespacial.')
                });
            }
        });
    }

    testConnection() {
        const raw = this.form.getRawValue();
        const host = (raw.host ?? '').trim();
        const databaseName = (raw.database_name ?? '').trim();
        const usuario = (raw.usuario ?? '').trim();
        const senha = (raw.senha ?? '').trim();
        const porta = Number(raw.porta ?? 0);

        if (!host || !databaseName || !usuario || !Number.isFinite(porta) || porta <= 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Campos obrigatórios',
                detail: 'Preencha host, porta, banco e usuário para testar a conexão.'
            });
            return;
        }

        if (!this.isEditing && !senha) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Senha obrigatória',
                detail: 'Informe a senha para testar a conexão.'
            });
            return;
        }

        const payload: BancoGeoespacialTestConnectionPayload = {
            host,
            porta,
            database_name: databaseName,
            usuario
        };

        if (senha) {
            payload.senha = senha;
        }
        if (this.isEditing && this.bancoId) {
            payload.banco_id = this.bancoId;
        }

        this.testingConnection = true;
        this.bancoService.testConnection(payload).subscribe({
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
                    detail: getBackendErrorMessage(error, 'Não foi possível conectar no banco geoespacial.')
                });
            }
        });
    }

    private loadBanco() {
        if (!this.bancoId) {
            return;
        }

        this.loading = true;
        this.bancoService.get(this.bancoId).subscribe({
            next: (banco) => {
                this.loading = false;
                this.form.patchValue({
                    nome: banco.nome,
                    host: banco.host,
                    porta: banco.porta,
                    database_name: banco.database_name,
                    usuario: banco.usuario,
                    senha: '',
                    observacoes: banco.observacoes ?? '',
                    ativo: banco.ativo
                });
            },
            error: () => {
                this.loading = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Banco não encontrado',
                    detail: 'Retornando para a lista.'
                });
                this.goBack();
            }
        });
    }

    private buildCreatePayload(): BancoGeoespacialCreate {
        const raw = this.form.getRawValue();
        const payload: BancoGeoespacialCreate = {
            nome: (raw.nome ?? '').trim(),
            host: (raw.host ?? '').trim(),
            porta: Number(raw.porta ?? 5432),
            database_name: (raw.database_name ?? '').trim(),
            usuario: (raw.usuario ?? '').trim(),
            observacoes: (raw.observacoes ?? '').trim() || null,
            ativo: Boolean(raw.ativo)
        };

        const senha = (raw.senha ?? '').trim();
        if (senha) {
            payload.senha = senha;
        }

        return payload;
    }

    private buildUpdatePayload(): BancoGeoespacialUpdate {
        return this.buildCreatePayload();
    }
}
