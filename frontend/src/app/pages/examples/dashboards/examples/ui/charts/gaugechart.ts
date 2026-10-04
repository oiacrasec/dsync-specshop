import { Component, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { LayoutService } from '@/app/layout/service/layout.service';

@Component({
    selector: 'gauge-chart',
    standalone: true,
    imports: [CommonModule, ChartModule],
    template: ` <div [ngClass]="class()" class="relative min-h-32 flex items-center justify-center">
        <p-chart type="doughnut" [data]="chartData()" [options]="chartOptions()" class="h-auto relative z-50 mx-auto cursor-pointer" />
        @if (title() || description()) {
            <div class="absolute z-20 bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center justify-end transition-all" [style]="{ width: chartDim().width + 'px', height: chartDim().height + 'px' }">
                @if (title()) {
                    <h2 class="text-center font-medium text-surface-500 dark:text-white/64">{{ title() }}</h2>
                }
                @if (description()) {
                    <p class="mt-1 text-center text-2xl font-medium text-surface-950 dark:text-surface-0">{{ description() }}</p>
                }
            </div>
        }
    </div>`
})
export class GaugeChart {
    layoutService = inject(LayoutService);

    class = input<string>('');

    inputData = input<number[]>([80, 20], { alias: 'data' });

    labels = input<string[]>(['Score', 'Gray Area']);

    bgColors = input<any[]>();

    description = input<string>();

    title = input<string>();

    chartData = signal<any>({});

    chartOptions = signal<any>({});

    chartPlugins = signal<any>([]);

    chartDim = signal<any>({ width: '100%', height: '100%' });

    chartEffect = effect(() => {
        this.layoutService.layoutConfig().darkTheme;
        this.inputData();
        setTimeout(() => this.initChart(), 150);
    });

    initChart() {
        this.chartData.set(this.setChartData());
        this.chartOptions.set(this.setChartOptions());
        this.chartPlugins.set(this.setChartPlugins());
    }

    setChartData() {
        const rootStyles = getComputedStyle(document.documentElement);
        const bgColors = this.bgColors() as any[];

        return {
            labels: this.labels(),
            datasets: [
                {
                    label: '',
                    data: this.inputData(),
                    backgroundColor: bgColors.map((color: any) => {
                        return rootStyles.getPropertyValue(`--p-${color}`).trim();
                    }),
                    borderWidth: 0,
                    spacing: 6,
                    borderRadius: 6,
                    cutout: '80%',
                    circumference: 180,
                    rotation: 270
                }
            ]
        };
    }

    setChartOptions() {
        return {
            aspectRatio: 1.5,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false,
                    position: 'nearest',
                    external: function (context: any) {
                        const { chart, tooltip } = context;
                        let tooltipEl = chart.canvas.parentNode.querySelector('div.chartjs-tooltip');
                        if (!tooltipEl) {
                            tooltipEl = document.createElement('div');
                            tooltipEl.classList.add(
                                'chartjs-tooltip',
                                'dark:bg-surface-950',
                                'bg-surface-0',
                                'rounded-[8px]',
                                'overflow-hidden',
                                'opacity-100',
                                'border',
                                'border-surface',
                                'absolute',
                                'transition-all',
                                'duration-[0.05s]',
                                'pointer-events-none',
                                'shadow-[0px_16px_32px_-12px_rgba(88,92,95,0.10)]'
                            );
                            chart.canvas.parentNode.appendChild(tooltipEl);
                        }

                        if (tooltip.opacity === 0) {
                            tooltipEl.style.opacity = 0;
                            return;
                        }
                        tooltipEl.innerHTML = '';
                        if (tooltip.body) {
                            const tooltipBody = document.createElement('div');
                            tooltipBody.classList.add('flex', 'itens-center', 'justify-center', 'gap-2', 'px-3', 'py-1.5', 'min-w-12');
                            const value = document.createElement('span');
                            value.appendChild(document.createTextNode(tooltip.dataPoints[0].parsed.toLocaleString('en-US')));
                            value.classList.add('font-semibold', 'text-base', 'text-surface-950', 'dark:text-surface-0', 'text-right');
                            tooltipBody.appendChild(value);
                            tooltipEl.appendChild(tooltipBody);
                        }
                        tooltipEl.style.opacity = 1;
                        tooltipEl.style.font = tooltip.options.bodyFont.string;
                        tooltipEl.style.padding = 0;

                        tooltipEl.style.left = tooltip.x + 'px';
                        tooltipEl.style.top = tooltip.y + 'px';
                    }
                }
            }
        };
    }

    setChartPlugins() {
        return [];
    }
}
