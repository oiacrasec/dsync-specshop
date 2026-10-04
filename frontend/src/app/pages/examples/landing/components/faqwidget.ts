import { LayoutService } from '@/app/layout/service/layout.service';
import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';

@Component({
    selector: 'faq-widget',
    standalone: true,
    imports: [CommonModule, AccordionModule],
    template: `
        <section class="py-12 lg:py-24 landing-container max-w-240 mx-auto">
            <h3 class="text-5xl font-semibold text-surface-950 dark:text-surface-0 text-center">Frequently<br />Asked Questions</h3>
            <p class="mt-8 text-center text-surface-500 text-xl max-w-xl mx-auto">Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
            <div class="mt-14">
                <p-accordion [value]="0" expandIcon="pi pi-plus" collapseIcon="pi pi-minus" class="space-y-4">
                    @for (faq of faqs; track $index; let index = $index) {
                        <p-accordion-panel
                            [value]="index"
                            class="border! border-surface! dark:border-white/10! bg-white/64! dark:bg-white/10! shadow-[0px_10px_10px_-8px_rgba(18,18,23,0.02),0px_2px_2px_-1.5px_rgba(18,18,23,0.02),0px_1px_1px_-0.5px_rgba(18,18,23,0.02),0px_0px_0px_1px_rgba(18,18,23,0.02)]"
                            [ngClass]="{ 'rounded-3xl': preset() == 'Aura' }"
                        >
                            <p-accordion-header [ngClass]="{ 'rounded-none! border!': preset() !== 'Aura' }" class="p-6! bg-transparent! data-[p-active=true]:pb-4! transition-all! duration-200!">
                                <h5 class="font-medium text-xl">{{ faq.question }}</h5>
                            </p-accordion-header>
                            <p-accordion-content>
                                <p class="m-0 text-left text-surface-500 dark:text-white/64!">{{ faq.answer }}</p>
                            </p-accordion-content>
                        </p-accordion-panel>
                    }
                </p-accordion>
            </div>
        </section>
    `,
    styles: `
        :host ::ng-deep {
            .p-accordioncontent-content {
                padding-left: 1.5rem;
                padding-right: 1.5rem;
                background-color: transparent !important;
            }

            .p-accordionheader {
                .pi {
                    font-size: 1.125rem;
                    color: var(--p-surface-950) !important;
                }
            }
        }

        :host-context(.app-dark) ::ng-deep .p-accordionheader .pi {
            color: var(--p-surface-0) !important;
        }
    `
})
export class FAQWidget {
    layoutService: LayoutService = inject(LayoutService);

    preset = computed(() => this.layoutService.layoutConfig().preset);

    faqs = [
        {
            question: 'How do I become a webmaster?',
            answer: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.'
        },
        {
            question: 'What is web traffic?',
            answer: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam.'
        },
        {
            question: 'What is an easy way to make a website?',
            answer: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula. Donec lobortis risus a elit. Etiam tempor. Ut ullamcorper, ligula eu tempor congue, eros est euismod turpis, id tincidunt sapien risus a quam.'
        },
        {
            question: 'How do you know if something is true?',
            answer: 'Cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.'
        }
    ];
}
