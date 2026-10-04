import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';

import { getBackendErrorMessage } from '@/app/pages/administracao/usuario/error-message';
import { GeoServerService } from '@/app/pages/geoespacial/geoserver/geoserver.service';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiCheckbox } from '@/app/shared/ui/checkbox/checkbox';
import { UiAutocomplete, UiLookupOptionsProvider } from '@/app/shared/ui/autocomplete/autocomplete';
import { UiInputText } from '@/app/shared/ui/input-text/input-text';
import { WorkspaceService } from '@/app/pages/geoespacial/workspace/workspace.service';

@Component({
    selector: 'app-workspace-formulario',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, UiAutocomplete, UiInputText, UiCheckbox, UiButton, TabsModule],
    templateUrl: './formulario.html'
})
export class WorkspaceFormPage implements OnInit {
    private fb = inject(FormBuilder);
    private workspaceService = inject(WorkspaceService);
    private geoserverService = inject(GeoServerService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);

    saving = false;
    loading = false;
    isEditing = false;
    workspaceId?: number;

    form = this.fb.group({
        geoserver: this.fb.control<number | null>(null, Validators.required),
        nome: this.fb.control('', Validators.required),
        observacoes: this.fb.control(''),
        ativo: this.fb.control(true, Validators.required)
    });
    geoserverOptionsProvider: UiLookupOptionsProvider = (query) => this.geoserverService.options(query);

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
        this.workspaceId = id;
        this.loadWorkspace();
    }

    goBack() {
        this.router.navigateByUrl('/pages/geoespacial/workspaces');
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

        const request = this.isEditing && this.workspaceId ? this.workspaceService.update(this.workspaceId, payload) : this.workspaceService.create(payload);

        request.subscribe({
            next: () => {
                this.saving = false;
                this.messageService.add({
                    severity: 'success',
                    summary: this.isEditing ? 'Workspace atualizado' : 'Workspace criado',
                    detail: 'Operação concluída com sucesso.'
                });
                this.goBack();
            },
            error: (error: unknown) => {
                this.saving = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Falha ao salvar',
                    detail: getBackendErrorMessage(error, 'Não foi possível salvar o workspace.')
                });
            }
        });
    }

    private loadWorkspace() {
        if (!this.workspaceId) {
            return;
        }

        this.loading = true;
        this.workspaceService.get(this.workspaceId).subscribe({
            next: (workspace) => {
                this.loading = false;
                this.form.patchValue({
                    geoserver: workspace.geoserver,
                    nome: workspace.nome,
                    observacoes: workspace.observacoes ?? '',
                    ativo: workspace.ativo
                });
            },
            error: () => {
                this.loading = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Workspace não encontrado',
                    detail: 'Retornando para a lista.'
                });
                this.goBack();
            }
        });
    }

    private buildPayload() {
        const raw = this.form.getRawValue();

        return {
            geoserver: Number(raw.geoserver),
            nome: (raw.nome ?? '').trim(),
            observacoes: (raw.observacoes ?? '').trim() || null,
            ativo: Boolean(raw.ativo)
        };
    }
}
