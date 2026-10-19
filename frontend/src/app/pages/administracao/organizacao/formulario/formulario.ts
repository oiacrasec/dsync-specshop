import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { UserContextService } from '@/app/core/services/user-context.service';
import { problemMessage } from '@/app/core/utils/api-problem';
import { UUID_PATTERN } from '@/app/core/utils/session-data';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiCheckbox } from '@/app/shared/ui/checkbox/checkbox';
import { UiInputText } from '@/app/shared/ui/input-text/input-text';
import { Organization, OrganizationWrite } from '@/app/types/organizacao';
import { OrganizacaoService } from '../organizacao.service';

@Component({
    selector: 'app-organizacao-formulario',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, UiInputText, UiCheckbox, UiButton],
    templateUrl: './formulario.html'
})
export class OrganizacaoFormPage implements OnInit {
    private fb = inject(FormBuilder);
    private organizacaoService = inject(OrganizacaoService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private contexts = inject(UserContextService);

    saving = false;
    loading = false;
    isEditing = false;
    organizationId?: string;

    form = this.fb.nonNullable.group({
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
        this.organizationId = idParam;
        this.loadOrganization();
    }

    goBack() {
        this.router.navigateByUrl('/pages/administracao/organizacao');
    }

    save() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.messageService.add({ severity: 'warn', summary: 'Campos obrigatórios', detail: 'Preencha os campos obrigatórios antes de salvar.' });

            return;
        }

        const raw = this.form.getRawValue();
        const payload: OrganizationWrite = { name: raw.name.trim(), is_active: raw.is_active };
        const request = this.isEditing && this.organizationId ? this.organizacaoService.update(this.organizationId, payload) : this.organizacaoService.create(payload);

        this.saving = true;
        request.subscribe({
            next: (organization: Organization) => {
                this.saving = false;
                this.syncActiveName(organization);
                this.messageService.add({ severity: 'success', summary: this.isEditing ? 'Organização atualizada' : 'Organização criada', detail: 'Operação concluída com sucesso.' });
                this.goBack();
            },
            error: (error: unknown) => {
                this.saving = false;
                this.messageService.add({ severity: 'error', summary: 'Falha ao salvar', detail: problemMessage(error, 'Verifique os dados e tente novamente.') });
            }
        });
    }

    private syncActiveName(organization: Organization) {
        const active = this.contexts.getActiveContext();

        if (active?.organization_public_id === organization.public_id && active.organization_name !== organization.name) {
            this.contexts.setActiveContext({ organization_public_id: organization.public_id, organization_name: organization.name });
        }
    }

    private loadOrganization() {
        if (!this.organizationId) {
            return;
        }

        this.loading = true;
        this.organizacaoService.get(this.organizationId).subscribe({
            next: (organization) => {
                this.loading = false;
                this.form.patchValue({ name: organization.name, is_active: organization.is_active });
            },
            error: () => {
                this.loading = false;
                this.messageService.add({ severity: 'error', summary: 'Organização não encontrada', detail: 'Retornando para a lista.' });
                this.goBack();
            }
        });
    }
}
