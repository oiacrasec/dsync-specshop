import { CommonModule } from '@angular/common';
import { Component, ElementRef, computed, input, signal, viewChild } from '@angular/core';

@Component({
    selector: 'lazy-image-widget',
    standalone: true,
    imports: [CommonModule],
    template: `<img [src]="isIntersecting() ? src() : ''" [alt]="alt()" [ngClass]="imgClass()" (load)="handleLoad()" #image [style]="style()" />`
})
export class LazyImageWidget {
    src = input.required<string>();
    alt = input<string>('');
    className = input<string>('');
    style = input<any>({});

    isIntersecting = signal(false);
    isLoaded = signal(false);

    image = viewChild<ElementRef<HTMLImageElement>>('image');

    imgClass = computed(() => ({
        [this.className()]: !!this.className(),
        'opacity-0': !this.isLoaded(),
        'transition-opacity duration-700 ease-out delay-75': true
    }));

    handleLoad() {
        this.isLoaded.set(true);
    }

    ngAfterViewInit() {
        const imageEl = this.image();
        if (!imageEl) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.1) {
                    this.isIntersecting.set(true);
                    observer.unobserve(imageEl.nativeElement);
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(imageEl.nativeElement);
    }
}
