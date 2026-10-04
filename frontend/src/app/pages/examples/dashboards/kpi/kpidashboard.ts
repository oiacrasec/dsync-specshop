import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { SectionCard } from '@/app/layout/components/ui/sectioncard';

@Component({
    selector: 'app-kpi-dashboard',
    standalone: true,
    imports: [CommonModule, TagModule, SectionCard],
    templateUrl: './kpidashboard.html'
})
export class KpiDashboard {
    tagSeverity: 'secondary' | 'info' | 'success' | 'warn' | 'danger' | 'contrast' | null | undefined;
    lastUpdated = 'ha 2 min';

    kpiTiles = [
        {
            label: 'Camadas ativas',
            value: '128',
            note: '23 com edicao WFS-T',
            icon: 'pi-map',
            tone: 'border border-cyan-100 bg-cyan-50/85 dark:border-cyan-800/40 dark:bg-cyan-900/20',
            iconTone: 'bg-cyan-100 border-cyan-200 text-cyan-700 dark:bg-cyan-900/40 dark:border-cyan-700 dark:text-cyan-200'
        },
        {
            label: 'Registros totais',
            value: '3.4M',
            note: 'crescimento 2.1%/semana',
            icon: 'pi-database',
            tone: 'border border-emerald-100 bg-emerald-50/85 dark:border-emerald-800/40 dark:bg-emerald-900/20',
            iconTone: 'bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-200'
        },
        {
            label: 'Usuarios online',
            value: '42',
            note: 'pico hoje 63',
            icon: 'pi-users',
            tone: 'border border-indigo-100 bg-indigo-50/85 dark:border-indigo-800/40 dark:bg-indigo-900/20',
            iconTone: 'bg-indigo-100 border-indigo-200 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-700 dark:text-indigo-200'
        },
        {
            label: 'Erros criticos',
            value: '3',
            note: 'ultimas 24h',
            icon: 'pi-exclamation-triangle',
            tone: 'border border-amber-100 bg-amber-50/90 dark:border-amber-800/40 dark:bg-amber-900/20',
            iconTone: 'bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-200'
        }
    ];

    services: Array<{ name: string; status: string; severity: NonNullable<KpiDashboard['tagSeverity']>; detail: string }> = [
        { name: 'GeoServer', status: 'Online', severity: 'success', detail: 'uptime 99.9% (24h)' },
        { name: 'PostGIS', status: 'Online', severity: 'success', detail: 'replicacao ok' },
        { name: 'Fila de jobs', status: 'Degradado', severity: 'warn', detail: 'atraso medio 4m' }
    ];

    geoserver = {
        workspaces: 14,
        layers: 312,
        stores: 28,
        latency: '120 ms',
        checks: ['Catalogo consistente', 'Caches ativos', 'Sem erros 5xx nas ultimas 2h']
    };

    syncQueue = {
        backlog: 24,
        successRate: '98.2%',
        avgTime: '3m 10s',
        events: [
            { title: 'Importacao de setor 07', detail: 'GeoPackage validado', time: '2 min' },
            { title: 'WFS-T contrato 12', detail: 'Reprocessamento concluido', time: '12 min' },
            { title: 'Atualizacao de tiles', detail: 'Cache recalculado', time: '30 min' }
        ]
    };

    layers = [
        { name: 'dss_mapa_areas_risco', detail: 'BBOX amplo, SRID 4326', records: '182k', usage: 'alta consulta' },
        { name: 'dss_mapa_logradouros', detail: 'Atualizacao diaria', records: '1.2M', usage: 'uso moderado' },
        { name: 'dss_mapa_setores', detail: 'Topologia validada', records: '4.1k', usage: 'uso alto' }
    ];

    alerts: Array<{ title: string; detail: string; level: string; severity: NonNullable<KpiDashboard['tagSeverity']> }> = [
        { title: 'Geometrias invalidas em dss_mapa_areas_risco', detail: '28 feicoes com self-intersection', level: 'Alto', severity: 'danger' },
        { title: 'CRS divergente em importacao recente', detail: 'detectar e reprojetar para EPSG:4326', level: 'Medio', severity: 'warn' },
        { title: 'Cache de tiles desatualizado', detail: 'rebuild recomendado para zonas urbanas', level: 'Baixo', severity: 'info' }
    ];
}
