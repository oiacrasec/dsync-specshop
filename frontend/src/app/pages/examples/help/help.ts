import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccordionModule } from 'primeng/accordion';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';

@Component({
    selector: 'app-help',
    standalone: true,
    imports: [CommonModule, IconFieldModule, InputIconModule, InputTextModule, AccordionModule, FormsModule],
    template: `
        <div>
            <div class="flex flex-col items-center py-12 px-6 card">
                <h1 class="text-5xl font-semibold text-surface-950 dark:text-surface-0 text-center leading-tight">
                    Advice and answers<br />
                    from the Poseidon team
                </h1>
                <p class="mt-3.5 text-surface-500">Get valuable advice and expert answers directly from the Poseidon team.</p>
                <p-iconfield class="mt-8">
                    <p-inputicon class="pi pi-search" />
                    <input pInputText [(ngModel)]="search" placeholder="Search" />
                </p-iconfield>
            </div>
            <div class="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mx-auto">
                @for (item of helps; track $index; let index = $index) {
                    <div class="card p-0 overflow-hidden">
                        <div class="flex items-center gap-3 px-6 py-4 border-b border-primary/10 dark:border-primary/5">
                            <i [ngClass]="item.icon" class="text-xl! text-primary"></i>
                            <h5 class="text-xl font-medium text-surface-950 dark:text-surface-0">{{ item.title }}</h5>
                        </div>
                        <ul class="px-6 pb-6 pt-5 space-y-5">
                            @for (ingredient of item.ingredients; track $index; let index = $index) {
                                <li class="flex items-center gap-2 text-surface-500">
                                    <i class="pi pi-info-circle"></i>
                                    <span class="">{{ ingredient }}</span>
                                </li>
                            }
                        </ul>
                        <a class="inline-flex items-center justify-between w-full cursor-pointer bg-white/40 dark:bg-white/10 px-6 pt-4 pb-5 border-t border-primary/10 dark:border-primary/5">
                            <span class="flex-1 text-primary font-semibold">View all</span>
                            <span><i class="pi pi-arrow-right text-lg! text-primary"></i></span>
                        </a>
                    </div>
                }
            </div>
        </div>
    `
})
export class Help {
    search: string = '';

    helps = [
        {
            icon: 'pi pi-power-off',
            title: 'Getting Started',
            ingredients: ['Sed enim ut sem viverra', 'Duis aute irure dolor in', 'Tortor id aliquet lectus proin nibh', 'Nunc sed blandit libero volutpat sed cras', 'Ut morbi tincidunt augue'],
            to: ''
        },
        {
            icon: 'pi pi-arrows-h',
            title: 'Transactions',
            ingredients: ['Sed enim ut sem viverra', 'Duis aute irure dolor in', 'Tortor id aliquet lectus proin nibh', 'Nunc sed blandit libero volutpat sed cras', 'Ut morbi tincidunt augue'],
            to: ''
        },
        {
            icon: 'pi pi-user',
            title: 'Profile',
            ingredients: ['Sed enim ut sem viverra', 'Duis aute irure dolor in', 'Tortor id aliquet lectus proin nibh', 'Nunc sed blandit libero volutpat sed cras', 'Ut morbi tincidunt augue'],
            to: ''
        },
        {
            icon: 'pi pi-money-bill',
            title: 'Billing',
            ingredients: ['Sed enim ut sem viverra', 'Duis aute irure dolor in', 'Tortor id aliquet lectus proin nibh', 'Nunc sed blandit libero volutpat sed cras', 'Ut morbi tincidunt augue'],
            to: ''
        },
        {
            icon: 'pi pi-database',
            title: 'Integrations',
            ingredients: ['Sed enim ut sem viverra', 'Duis aute irure dolor in', 'Tortor id aliquet lectus proin nibh', 'Nunc sed blandit libero volutpat sed cras', 'Ut morbi tincidunt augue'],
            to: ''
        },
        {
            icon: 'pi pi-shield',
            title: 'Security',
            ingredients: ['Sed enim ut sem viverra', 'Duis aute irure dolor in', 'Tortor id aliquet lectus proin nibh', 'Nunc sed blandit libero volutpat sed cras', 'Ut morbi tincidunt augue'],
            to: ''
        }
    ];
}
