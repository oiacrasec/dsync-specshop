import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { getBackendErrorMessage } from '@/app/pages/administracao/usuario/error-message';
import { BancoGeoespacialService } from '@/app/pages/geoespacial/banco-geoespacial/banco-geoespacial.service';
import { GeoServerBancoService } from '@/app/pages/geoespacial/geoserver-banco/geoserver-banco.service';
import { GeoServerService } from '@/app/pages/geoespacial/geoserver/geoserver.service';
import { UiAutocomplete, UiLookupOptionsProvider } from '@/app/shared/ui/autocomplete/autocomplete';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiCheckbox } from '@/app/shared/ui/checkbox/checkbox';
import { GeoServerBancoUpdate } from '@/app/types/geoserver-banco';

@Component({
    selector: 'app-geoserver-banco-formulario',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, UiAutocomplete, UiCheckbox, UiButton],
    templateUrl: './formulario.html'
})
export class GeoServerBancoFormPage implements OnInit {
    private fb = inject(FormBuilder);
    private geoserverBancoService = inject(GeoServerBancoService);
    private geoserverService = inject(GeoServerService);
    private bancoService = inject(BancoGeoespacialService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);

    saving = false;
    loading = false;
    isEditing = false;
    vinculoId?: number;

    form = this.fb.group({
        geoserver: this.fb.control<number | null>(null, Validators.required),
        banco: this.fb.control<number | null>(null, Validators.required),
        ativo: this.fb.control(true, Validators.required)
    });

    geoserverOptionsProvider: UiLookupOptionsProvider = (query) => this.geoserverService.options(query);
    bancoOptionsProvider: UiLookupOptionsProvider = (query) => this.bancoService.options(query);

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
        this.vinculoId = id;
        this.loadVinculo();
    }

    goBack() {
        this.router.navigateByUrl('/pages/geoespacial/geoserver-bancos');
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

        const request =
            this.isEditing && this.vinculoId
                ? this.geoserverBancoService.update(this.vinculoId, payload)
                : this.geoserverBancoService.create({
                      geoserver: payload.geoserver as number,
                      banco: payload.banco as number,
                      ativo: payload.ativo as boolean
                  });

        request.subscribe({
            next: () => {
                this.saving = false;
                this.messageService.add({
                    severity: 'success',
                    summary: this.isEditing ? 'Vínculo atualizado' : 'Vínculo criado',
                    detail: 'Operação concluída com sucesso.'
                });
                this.goBack();
            },
            error: (error: unknown) => {
                this.saving = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Falha ao salvar',
                    detail: getBackendErrorMessage(error, 'Não foi possível salvar o vínculo.')
                });
            }
        });
    }

    private loadVinculo() {
        if (!this.vinculoId) {
            return;
        }

        this.loading = true;
        this.geoserverBancoService.get(this.vinculoId).subscribe({
            next: (vinculo) => {
                this.loading = false;
                this.form.patchValue({
                    geoserver: vinculo.geoserver,
                    banco: vinculo.banco,
                    ativo: vinculo.ativo
                });
            },
            error: () => {
                this.loading = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Vínculo não encontrado',
                    detail: 'Retornando para a lista.'
                });
                this.goBack();
            }
        });
    }

    private buildPayload(): GeoServerBancoUpdate {
        const raw = this.form.getRawValue();

        return {
            geoserver: Number(raw.geoserver),
            banco: Number(raw.banco),
            ativo: Boolean(raw.ativo)
        };
    }
}
