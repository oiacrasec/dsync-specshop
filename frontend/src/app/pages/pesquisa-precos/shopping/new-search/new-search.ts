import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';

import { problemMessage } from '@/app/core/utils/api-problem';
import { BRAZIL_STATE_OPTIONS, MAX_PRODUCTS_PER_SEARCH, SOURCE_OPTIONS } from '@/app/project/pricing.constants';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiInputText } from '@/app/shared/ui/input-text/input-text';
import { UiMultiSelect, UiMultiSelectOption } from '@/app/shared/ui/multi-select/multi-select';
import { TrackedProduct } from '@/app/types/produto';
import { ProdutosService } from '../../produtos/produtos.service';
import { ShoppingService } from '../shopping.service';

// Opções da seleção de produtos: até 100 por vez (limite das listagens do Core).
const PRODUCT_OPTIONS_ROWS = 100;

@Component({
    selector: 'app-new-search',
    standalone: true,
    imports: [CommonModule, TabsModule, ReactiveFormsModule, UiMultiSelect, UiInputText, UiButton],
    templateUrl: './new-search.html'
})
export class NewSearchPage implements OnInit {
    private fb = inject(FormBuilder);
    private produtosService = inject(ProdutosService);
    private shoppingService = inject(ShoppingService);
    private router = inject(Router);
    private messageService = inject(MessageService);

    readonly maxProducts = MAX_PRODUCTS_PER_SEARCH;
    readonly sourceOptions = SOURCE_OPTIONS;
    readonly stateOptions = BRAZIL_STATE_OPTIONS;
    // Zoneless: o estado que muda após respostas HTTP fica em signals para a tela redesenhar.
    readonly productOptions = signal<UiMultiSelectOption[]>([]);
    readonly saving = signal(false);

    form = this.fb.nonNullable.group({
        products: [[] as string[], [Validators.required, Validators.maxLength(MAX_PRODUCTS_PER_SEARCH)]],
        sources: [SOURCE_OPTIONS.map((option) => String(option.value)), Validators.required],
        seller_states: [[] as string[]],
        destination_zip: ['']
    });

    ngOnInit() {
        this.produtosService.list({ first: 0, rows: PRODUCT_OPTIONS_ROWS, ordering: 'name' }).subscribe({
            next: (page) => {
                this.productOptions.set(page.data.map((product: TrackedProduct) => ({ label: `${product.name} · ${product.model}`, value: product.public_id })));
            },
            error: () => this.messageService.add({ severity: 'error', summary: 'Falha ao carregar produtos', detail: 'Tente abrir a tela de novo.' })
        });
    }

    get selectedCount() {
        return this.form.controls.products.value.length;
    }

    get overLimit() {
        return this.selectedCount > this.maxProducts;
    }

    goBack() {
        this.router.navigateByUrl('/pages/pesquisa-precos/shopping');
    }

    search() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            const detail = this.overLimit ? `Você pode pesquisar até ${this.maxProducts} produtos por vez.` : 'Selecione os produtos e as fontes.';

            this.messageService.add({ severity: 'warn', summary: 'Confira a seleção', detail });

            return;
        }

        this.saving.set(true);
        this.shoppingService.create(this.form.getRawValue()).subscribe({
            next: (search) => {
                this.saving.set(false);
                // A coleta começa porque o usuário clicou em Pesquisar (D-16); o resultado executa as linhas.
                this.router.navigate(['/pages/pesquisa-precos/shopping', search.public_id], { state: { autorun: true } });
            },
            error: (error: unknown) => {
                this.saving.set(false);
                this.messageService.add({ severity: 'error', summary: 'Falha ao pesquisar', detail: problemMessage(error, 'Verifique a seleção e tente novamente.') });
            }
        });
    }
}
