import { Injectable } from '@angular/core';

import { MapaLayer } from '@/app/types/mapa';

import { LayerMenuItem } from '../editor.models';

@Injectable()
export class EditorLayersState {
    layers: LayerMenuItem[] = [];
    loading = false;

    private pendingVisibilityLayerIds = new Set<number>();
    private pendingDeleteLayerIds = new Set<number>();

    setLayers(layers: MapaLayer[]) {
        this.pendingVisibilityLayerIds.clear();
        this.pendingDeleteLayerIds.clear();
        this.layers = layers
            .map((layer) => ({
                id: layer.id,
                nome: layer.nome,
                visivel: layer.visivel,
                geom_type: layer.geom_type,
                estilo: layer.estilo,
                ordem: layer.ordem,
                status: layer.status
            }))
            .sort((a, b) => (a.ordem === b.ordem ? a.id - b.id : a.ordem - b.ordem));
    }

    upsertLayer(layer: MapaLayer) {
        const mappedLayer: LayerMenuItem = {
            id: layer.id,
            nome: layer.nome,
            visivel: layer.visivel,
            geom_type: layer.geom_type,
            estilo: layer.estilo,
            ordem: layer.ordem,
            status: layer.status
        };

        const existingIndex = this.layers.findIndex((current) => current.id === layer.id);
        if (existingIndex === -1) {
            this.layers = [...this.layers, mappedLayer].sort((a, b) => (a.ordem === b.ordem ? a.id - b.id : a.ordem - b.ordem));
            return;
        }

        const updated = [...this.layers];
        updated[existingIndex] = mappedLayer;
        this.layers = updated.sort((a, b) => (a.ordem === b.ordem ? a.id - b.id : a.ordem - b.ordem));
    }

    upsertProvisionalLayer(
        tempId: number,
        payload: {
            nome: string;
            geomType: string;
            visivel: boolean;
        }
    ) {
        const { nome, geomType, visivel } = payload;
        const nextOrder = this.layers.reduce((acc, layer) => Math.max(acc, layer.ordem), 0) + 1;
        const provisional: LayerMenuItem = {
            id: tempId,
            nome,
            visivel,
            geom_type: geomType,
            estilo: '',
            ordem: nextOrder,
            status: 'PROVISIONING'
        };
        const existingIndex = this.layers.findIndex((current) => current.id === tempId);
        if (existingIndex === -1) {
            this.layers = [...this.layers, provisional].sort((a, b) => (a.ordem === b.ordem ? a.id - b.id : a.ordem - b.ordem));
            return;
        }

        const updated = [...this.layers];
        updated[existingIndex] = provisional;
        this.layers = updated.sort((a, b) => (a.ordem === b.ordem ? a.id - b.id : a.ordem - b.ordem));
    }

    setLayerVisibility(layerId: number, visivel: boolean) {
        this.layers = this.layers.map((layer) => (layer.id === layerId ? { ...layer, visivel } : layer));
    }

    removeLayer(layerId: number) {
        this.layers = this.layers.filter((layer) => layer.id !== layerId);
        this.pendingVisibilityLayerIds.delete(layerId);
        this.pendingDeleteLayerIds.delete(layerId);
    }

    findLayer(layerId: number) {
        return this.layers.find((layer) => layer.id === layerId);
    }

    setVisibilityPending(layerId: number, pending: boolean) {
        if (pending) {
            this.pendingVisibilityLayerIds.add(layerId);
            return;
        }
        this.pendingVisibilityLayerIds.delete(layerId);
    }

    setDeletePending(layerId: number, pending: boolean) {
        if (pending) {
            this.pendingDeleteLayerIds.add(layerId);
            return;
        }
        this.pendingDeleteLayerIds.delete(layerId);
    }

    isVisibilityPending(layerId: number) {
        return this.pendingVisibilityLayerIds.has(layerId);
    }

    isDeletePending(layerId: number) {
        return this.pendingDeleteLayerIds.has(layerId);
    }
}
