import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { PermissionCatalogService } from '@/app/core/services/permission-catalog.service';
import { problemMessage } from '@/app/core/utils/api-problem';
import { UUID_PATTERN } from '@/app/core/utils/session-data';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiCheckbox } from '@/app/shared/ui/checkbox/checkbox';
import { UiInputText } from '@/app/shared/ui/input-text/input-text';
import { PermissionGrid } from '@/app/shared/ui/permission-grid/permission-grid';
import { ProfileWrite } from '@/app/types/perfil';
import { PermissionCatalogGroup } from '@/app/types/permission';
import { PerfilService } from '../perfil.service';

@Component({
    selector: 'app-perfil-formulario',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, UiInputText, UiCheckbox, UiButton, PermissionGrid],
    templateUrl: './formulario.html'
})
export class PerfilFormPage implements OnInit {
    private fb = inject(FormBuilder);
    private perfilService = inject(PerfilService);
    private catalogService = inject(PermissionCatalogService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);

    saving = false;
    isEditing = false;
    profileId?: string;
    readonly readOnly = signal(false);
    readonly essential = signal(false);
    readonly catalog = signal<PermissionCatalogGroup[]>([]);
    readonly permissions = signal<string[]>([]);

    form = this.fb.nonNullable.group({
        name: ['', Validators.required],
        is_active: [true]
    });

    ngOnInit() {
        this.catalogService.load().subscribe({
            next: (groups) => this.catalog.set(groups),
            error: () => this.messageService.add({ severity: 'error', summary: 'Falha ao carregar permissões', detail: 'Não foi possível carregar o catálogo de permissões.' })
        });

        const idParam = this.route.snapshot.paramMap.get('id');

        if (idParam === null) {
            return;
        }

        if (!UUID_PATTERN.test(idParam)) {
            this.goBack();

            return;
        }

        this.isEditing = true;
        this.profileId = idParam;
        this.loadProfile();
    }

    goBack() {
        this.router.navigateByUrl('/pages/administracao/perfil');
    }

    save() {
        if (this.readOnly()) {
            return;
        }

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.messageService.add({ severity: 'warn', summary: 'Campos obrigatórios', detail: 'Preencha os campos obrigatórios antes de salvar.' });

            return;
        }

        const raw = this.form.getRawValue();
        const payload: ProfileWrite = { name: raw.name.trim(), is_active: raw.is_active, permissions: this.permissions() };
        const request$ = this.isEditing && this.profileId ? this.perfilService.update(this.profileId, payload) : this.perfilService.create(payload);

        this.saving = true;
        request$.subscribe({
            next: () => {
                this.saving = false;
                this.messageService.add({ severity: 'success', summary: this.isEditing ? 'Perfil atualizado' : 'Perfil criado', detail: 'Operação concluída com sucesso.' });
                this.goBack();
            },
            error: (error: unknown) => {
                this.saving = false;
                this.messageService.add({ severity: 'error', summary: 'Falha ao salvar', detail: problemMessage(error, 'Verifique os dados e tente novamente.') });
            }
        });
    }

    private loadProfile() {
        if (!this.profileId) {
            return;
        }

        this.perfilService.get(this.profileId).subscribe({
            next: (profile) => {
                this.form.patchValue({ name: profile.name, is_active: profile.is_active });
                this.permissions.set(profile.permissions);
                this.essential.set(profile.is_essential);
                this.readOnly.set(profile.is_system);

                if (profile.is_system) {
                    this.form.disable();
                }
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Perfil não encontrado', detail: 'Retornando para a lista.' });
                this.goBack();
            }
        });
    }
}
