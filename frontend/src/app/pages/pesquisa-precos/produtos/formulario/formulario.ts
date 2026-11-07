import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';

import { apiProblem, problemMessage } from '@/app/core/utils/api-problem';
import { UUID_PATTERN } from '@/app/core/utils/session-data';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiInputText } from '@/app/shared/ui/input-text/input-text';
import { TrackedProduct, TrackedProductWrite } from '@/app/types/produto';
import { ProdutosService } from '../produtos.service';

type ProductField = keyof TrackedProductWrite;

const REQUIRED_MESSAGES: Record<ProductField, string> = {
    name: 'Informe o nome do produto.',
    model: 'Informe o modelo do produto.',
    brand: '',
    ean: ''
};

@Component({
    selector: 'app-produto-formulario',
    standalone: true,
    imports: [CommonModule, TabsModule, ReactiveFormsModule, UiInputText, UiButton],
    templateUrl: './formulario.html'
})
export class ProdutoFormPage implements OnInit {
    private fb = inject(FormBuilder);
    private produtosService = inject(ProdutosService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);

    saving = false;
    loading = false;
    isEditing = false;
    productId?: string;
    // Erro do backend (422) por campo; some quando o campo é alterado.
    serverErrors: Partial<Record<ProductField, string>> = {};

    form = this.fb.nonNullable.group({
        name: ['', Validators.required],
        model: ['', Validators.required],
        brand: [''],
        ean: ['']
    });

    ngOnInit() {
        for (const field of Object.keys(this.form.controls) as ProductField[]) {
            this.form.controls[field].valueChanges.subscribe(() => delete this.serverErrors[field]);
        }

        const idParam = this.route.snapshot.paramMap.get('id');

        if (idParam === null) {
            return;
        }

        if (!UUID_PATTERN.test(idParam)) {
            this.goBack();

            return;
        }

        this.isEditing = true;
        this.productId = idParam;
        this.loadProduct();
    }

    errorMessage(field: ProductField) {
        return this.serverErrors[field] ?? REQUIRED_MESSAGES[field];
    }

    goBack() {
        this.router.navigateByUrl('/pages/pesquisa-precos/produtos');
    }

    save() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.messageService.add({ severity: 'warn', summary: 'Campos obrigatórios', detail: 'Preencha os campos obrigatórios antes de salvar.' });

            return;
        }

        const raw = this.form.getRawValue();
        const payload: TrackedProductWrite = { name: raw.name.trim(), model: raw.model.trim(), brand: raw.brand.trim(), ean: raw.ean.trim() };
        const request = this.isEditing && this.productId ? this.produtosService.update(this.productId, payload) : this.produtosService.create(payload);

        this.saving = true;
        request.subscribe({
            next: () => {
                this.saving = false;
                this.messageService.add({ severity: 'success', summary: this.isEditing ? 'Produto atualizado' : 'Produto cadastrado', detail: 'Operação concluída com sucesso.' });
                this.goBack();
            },
            error: (error: unknown) => {
                this.saving = false;
                this.showFieldErrors(error);
                this.messageService.add({ severity: 'error', summary: 'Falha ao salvar', detail: problemMessage(error, 'Verifique os dados e tente novamente.') });
            }
        });
    }

    private showFieldErrors(error: unknown) {
        const problem = apiProblem(error);

        if (problem?.status !== 422 || !problem.errors) {
            return;
        }

        for (const [field, messages] of Object.entries(problem.errors)) {
            const control = this.form.controls[field as ProductField];
            const message = Array.isArray(messages) ? messages.find((value) => typeof value === 'string') : undefined;

            if (control && message) {
                control.setErrors({ server: true });
                control.markAsTouched();
                this.serverErrors[field as ProductField] = message;
            }
        }
    }

    private loadProduct() {
        if (!this.productId) {
            return;
        }

        this.loading = true;
        this.produtosService.get(this.productId).subscribe({
            next: (product: TrackedProduct) => {
                this.loading = false;
                this.form.patchValue({ name: product.name, model: product.model, brand: product.brand, ean: product.ean });
            },
            error: () => {
                this.loading = false;
                this.messageService.add({ severity: 'error', summary: 'Produto não encontrado', detail: 'Retornando para a lista.' });
                this.goBack();
            }
        });
    }
}
