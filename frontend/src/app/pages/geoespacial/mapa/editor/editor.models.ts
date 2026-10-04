import { MapaLayerStatus } from '@/app/types/mapa';

export interface LayerMenuItem {
    id: number;
    nome: string;
    visivel: boolean;
    geom_type: string;
    estilo: string;
    ordem: number;
    status: MapaLayerStatus;
}

export type FloatingPanelId = 'zoom-panel' | 'layers-panel';

export interface FloatingPosition {
    x: number;
    y: number;
}

export interface PanelSize {
    width: number;
    height: number;
}
