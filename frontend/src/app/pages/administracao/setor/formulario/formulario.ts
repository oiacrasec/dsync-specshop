import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';

import { UiButton } from '@/app/shared/ui/button/button';
import { UiCheckbox } from '@/app/shared/ui/checkbox/checkbox';
import { UiInputText } from '@/app/shared/ui/input-text/input-text';
import { SetorService } from '@/app/pages/administracao/setor/setor.service';

@Component({
    selector: 'app-setor-formulario',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, UiInputText, UiCheckbox, UiButton, TabsModule, ToastModule],
    templateUrl: './formulario.html'
})
export class SetorFormPage implements OnInit {
    private fb = inject(FormBuilder);
    private setorService = inject(SetorService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);

    saving = false;
    loading = false;
    isEditing = false;
    setorId?: number;

    form = this.fb.group({
        nome: this.fb.control('', Validators.required),
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
        this.setorId = id;
        this.loadSetor();
    }

    goBack() {
        this.router.navigateByUrl('/pages/administracao/setor');
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

        const request = this.isEditing && this.setorId
            ? this.setorService.update(this.setorId, payload)
            : this.setorService.create(payload);

        request.subscribe({
            next: () => {
                this.saving = false;
                this.messageService.add({
                    severity: 'success',
                    summary: this.isEditing ? 'Setor atualizado' : 'Setor criado',
                    detail: 'Operacao concluida com sucesso.'
                });
                this.goBack();
            },
            error: () => {
                this.saving = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Falha ao salvar',
                    detail: 'Verifique os dados e tente novamente.'
                });
            }
        });
    }

    private loadSetor() {
        if (!this.setorId) {
            return;
        }

        this.loading = true;
        this.setorService.get(this.setorId).subscribe({
            next: (setor) => {
                this.loading = false;
                this.form.patchValue({
                    nome: setor.nome,
                    ativo: setor.ativo
                });
            },
            error: () => {
                this.loading = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Setor nao encontrado',
                    detail: 'Retornando para a lista.'
                });
                this.goBack();
            }
        });
    }

    private buildPayload() {
        const raw = this.form.getRawValue();

        return {
            nome: (raw.nome ?? '').trim(),
            ativo: Boolean(raw.ativo)
        };
    }
}
