import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';

import { UserContextService } from '@/app/core/services/user-context.service';
import { CidadeService } from '@/app/pages/administracao/cidade/cidade.service';
import { OrganizacaoService } from '@/app/pages/administracao/organizacao/organizacao.service';
import { UiAutocomplete, UiLookupOptionsProvider } from '@/app/shared/ui/autocomplete/autocomplete';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiCheckbox } from '@/app/shared/ui/checkbox/checkbox';
import { UiInputText } from '@/app/shared/ui/input-text/input-text';
import { Organizacao } from '@/app/types/organizacao';

@Component({
    selector: 'app-organizacao-formulario',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, UiAutocomplete, UiInputText, UiCheckbox, UiButton, TabsModule, ToastModule],
    templateUrl: './formulario.html'
})
export class OrganizacaoFormPage implements OnInit {
    private fb = inject(FormBuilder);
    private organizacaoService = inject(OrganizacaoService);
    private cidadeService = inject(CidadeService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private userContextService = inject(UserContextService);

    saving = false;
    loading = false;
    isEditing = false;
    organizacaoId?: number;

    form = this.fb.group({
        nome: this.fb.control('', Validators.required),
        cnpj: this.fb.control(''),
        inscricao_estadual: this.fb.control(''),
        logradouro: this.fb.control(''),
        numero: this.fb.control(''),
        bairro: this.fb.control(''),
        complemento: this.fb.control(''),
        cep: this.fb.control(''),
        cidade: this.fb.control<number | null>(null),
        ativo: this.fb.control(true, Validators.required)
    });

    cidadeOptionsProvider: UiLookupOptionsProvider = (query) => this.cidadeService.options(query);

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
        this.organizacaoId = id;
        this.loadOrganizacao();
    }

    goBack() {
        this.router.navigateByUrl('/pages/administracao/organizacao');
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

        const request = this.isEditing && this.organizacaoId
            ? this.organizacaoService.update(this.organizacaoId, payload)
            : this.organizacaoService.create(payload);

        request.subscribe({
            next: (organizacao: Organizacao) => {
                this.saving = false;
                this.userContextService.updateActiveOrganizationName(organizacao.id, organizacao.nome);
                this.messageService.add({
                    severity: 'success',
                    summary: this.isEditing ? 'Organização atualizada' : 'Organização criada',
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

    private loadOrganizacao() {
        if (!this.organizacaoId) {
            return;
        }

        this.loading = true;
        this.organizacaoService.get(this.organizacaoId).subscribe({
            next: (organizacao) => {
                this.loading = false;
                this.form.patchValue({
                    nome: organizacao.nome,
                    cnpj: organizacao.cnpj ?? '',
                    inscricao_estadual: organizacao.inscricao_estadual ?? '',
                    logradouro: organizacao.logradouro ?? '',
                    numero: organizacao.numero ?? '',
                    bairro: organizacao.bairro ?? '',
                    complemento: organizacao.complemento ?? '',
                    cep: organizacao.cep ?? '',
                    cidade: organizacao.cidade,
                    ativo: organizacao.ativo
                });
            },
            error: () => {
                this.loading = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Organização nao encontrada',
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
            cnpj: this.normalizeOptionalString(raw.cnpj),
            inscricao_estadual: this.normalizeOptionalString(raw.inscricao_estadual),
            logradouro: this.normalizeOptionalString(raw.logradouro),
            numero: this.normalizeOptionalString(raw.numero),
            bairro: this.normalizeOptionalString(raw.bairro),
            complemento: this.normalizeOptionalString(raw.complemento),
            cep: this.normalizeOptionalString(raw.cep),
            cidade: raw.cidade ?? null,
            ativo: Boolean(raw.ativo)
        };
    }

    private normalizeOptionalString(value: string | null | undefined) {
        const normalized = (value ?? '').trim();
        return normalized ? normalized : null;
    }
}
