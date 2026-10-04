import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';

@Component({
    selector: 'testimonial-card-widget',
    standalone: true,
    imports: [CommonModule, AvatarModule],
    template: `
        <div class="p-4 lg:p-5 border border-primary/15 bg-white/64 dark:bg-white/10 rounded-2xl" [class]="className">
            <p class="body-medium text-left">
                {{ testimonial.message }}
            </p>
            <div class="flex items-center gap-3 mt-6">
                <p-avatar class="w-14! h-14! border border-surface-200 dark:border-white/10" size="large" [image]="testimonial.avatar" shape="circle" />
                <div class="flex-1">
                    <div class="text-xl font-semibold text-surface-950 dark:text-surface-0">{{ testimonial.name }}</div>
                    <span class="text-lg text-surface-500 dark:text-white/48 mt-2">{{ testimonial.title }}</span>
                </div>
            </div>
        </div>
    `
})
export class TestimonialCardWidget {
    @Input() testimonial: any;

    @Input() className: string = '';
}
