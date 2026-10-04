import { Injectable } from '@angular/core';
import { map, tap } from 'rxjs/operators';

import { BaseCrudService } from '@/app/core/services/base-crud.service';
import {
    Mapa,
    MapaCreate,
    MapaLayer,
    MapaLayerColumn,
    MapaLayerCreate,
    MapaLayerFeature,
    MapaLayerFeatureCreatePayload,
    MapaLayerFeatureListQuery,
    MapaLayerFeatureListResponse,
    MapaLayerFeatureUpdatePayload,
    MapaLayerUpdate,
    MapaUpdate
} from '@/app/types/mapa';
import { PaginatedResponse } from '@/app/types/pagination';

export interface MapaQuery {
    page?: number;
    rows?: number;
    first?: number;
    nome?: string;
    visibilidade?: string;
    setor?: number;
    store?: number;
    srid?: number;
    ativo?: boolean;
    ordering?: string;
    id?: number;
    id__in?: string;
}

@Injectable({ providedIn: 'root' })
export class MapaService extends BaseCrudService {
    list(query: MapaQuery = {}) {
        const params = this.buildParams(query);
        return this.http.get<PaginatedResponse<Mapa>>(`${this.baseUrl}/mapa/mapa/`, { params });
    }

    get(id: number) {
        return this.http.get<Mapa>(`${this.baseUrl}/mapa/mapa/${id}/`);
    }

    create(payload: MapaCreate) {
        return this.http.post<Mapa>(`${this.baseUrl}/mapa/mapa/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    update(id: number, payload: MapaUpdate) {
        return this.http.patch<Mapa>(`${this.baseUrl}/mapa/mapa/${id}/`, payload).pipe(tap(() => this.invalidateTableCache()));
    }

    remove(id: number) {
        return this.http.delete<void>(`${this.baseUrl}/mapa/mapa/${id}/`).pipe(tap(() => this.invalidateTableCache()));
    }

    listLayers(mapaId: number) {
        return this.http.get<{ data: MapaLayer[] }>(`${this.baseUrl}/mapeditor/mapas/${mapaId}/layers/`).pipe(map((response) => response.data ?? []));
    }

    createLayer(mapaId: number, payload: MapaLayerCreate) {
        return this.http.post<MapaLayer>(`${this.baseUrl}/mapeditor/mapas/${mapaId}/layers/`, payload);
    }

    updateLayer(mapaId: number, layerId: number, payload: MapaLayerUpdate) {
        return this.http.patch<MapaLayer>(`${this.baseUrl}/mapeditor/mapas/${mapaId}/layers/${layerId}/`, payload);
    }

    removeLayer(mapaId: number, layerId: number) {
        return this.http
            .delete<{ detail?: string }>(`${this.baseUrl}/mapeditor/mapas/${mapaId}/layers/${layerId}/`)
            .pipe(tap(() => this.invalidateTableCache()));
    }

    listLayerColumns(mapaId: number, layerId: number) {
        return this.http
            .get<{ data: MapaLayerColumn[] }>(`${this.baseUrl}/mapeditor/mapas/${mapaId}/layers/${layerId}/colunas/`)
            .pipe(map((response) => response.data ?? []));
    }

    addLayerColumn(mapaId: number, layerId: number, payload: MapaLayerColumn) {
        return this.http
            .post<{ data: MapaLayerColumn[] }>(`${this.baseUrl}/mapeditor/mapas/${mapaId}/layers/${layerId}/colunas/`, payload)
            .pipe(map((response) => response.data ?? []));
    }

    removeLayerColumn(mapaId: number, layerId: number, columnName: string, confirmIrreversible = true) {
        const encodedColumn = encodeURIComponent(columnName);
        return this.http
            .delete<{ data: MapaLayerColumn[]; detail?: string }>(
                `${this.baseUrl}/mapeditor/mapas/${mapaId}/layers/${layerId}/colunas/${encodedColumn}/`,
                {
                    params: this.buildParams({ confirm_irreversible: confirmIrreversible })
                }
            )
            .pipe(map((response) => response.data ?? []));
    }

    buildLayerWmsUrl(mapaId: number, layerId: number) {
        return `${this.baseUrl}/mapeditor/mapas/${mapaId}/layers/${layerId}/wms/`;
    }

    listLayerFeatures(mapaId: number, layerId: number, query: MapaLayerFeatureListQuery = {}) {
        return this.http.get<MapaLayerFeatureListResponse>(
            `${this.baseUrl}/mapeditor/mapas/${mapaId}/layers/${layerId}/features/`,
            {
                params: this.buildParams(query)
            }
        );
    }

    getLayerFeature(mapaId: number, layerId: number, featureId: number) {
        return this.http.get<MapaLayerFeature>(`${this.baseUrl}/mapeditor/mapas/${mapaId}/layers/${layerId}/features/${featureId}/`);
    }

    createLayerFeature(mapaId: number, layerId: number, payload: MapaLayerFeatureCreatePayload) {
        return this.http.post<MapaLayerFeature>(`${this.baseUrl}/mapeditor/mapas/${mapaId}/layers/${layerId}/features/`, payload);
    }

    updateLayerFeature(mapaId: number, layerId: number, featureId: number, payload: MapaLayerFeatureUpdatePayload) {
        return this.http.patch<MapaLayerFeature>(`${this.baseUrl}/mapeditor/mapas/${mapaId}/layers/${layerId}/features/${featureId}/`, payload);
    }

    removeLayerFeature(mapaId: number, layerId: number, featureId: number) {
        return this.http.delete<{ detail?: string }>(
            `${this.baseUrl}/mapeditor/mapas/${mapaId}/layers/${layerId}/features/${featureId}/`
        );
    }
}
