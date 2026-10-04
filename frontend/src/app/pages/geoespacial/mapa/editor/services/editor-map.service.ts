import { inject, Injectable, NgZone } from '@angular/core';
import Attribution from 'ol/control/Attribution';
import { defaults as defaultControls } from 'ol/control/defaults';
import Draw from 'ol/interaction/Draw';
import Modify from 'ol/interaction/Modify';
import VectorLayer from 'ol/layer/Vector';
import TileLayer from 'ol/layer/Tile';
import OlMap from 'ol/Map';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import VectorSource from 'ol/source/Vector';
import TileWMS from 'ol/source/TileWMS';
import OSM from 'ol/source/OSM';
import View from 'ol/View';
import { unByKey } from 'ol/Observable';
import type { EventsKey } from 'ol/events';
import GeoJSON from 'ol/format/GeoJSON';
import Feature from 'ol/Feature';
import Geometry from 'ol/geom/Geometry';
import type { Coordinate } from 'ol/coordinate';
import type { Pixel } from 'ol/pixel';
import { transform } from 'ol/proj';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';

import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { UserContextService } from '@/app/core/services/user-context.service';
import { API_BASE_URL } from '@/app/core/tokens/api-base-url';
import { MapaLayer, MapaLayerFeature } from '@/app/types/mapa';

type DrawType = 'Point' | 'LineString' | 'Polygon';

export interface MapDrawModeConfig {
    layerId: number;
    geomType: string;
    srid: number;
    onDrawEnd: (geometry: Record<string, any>) => void;
}

export interface EditorMapClickEvent {
    coordinate: Coordinate;
    pixel: Pixel;
}

export interface MapFeatureEditModeConfig {
    geometry: Record<string, any>;
    srid: number;
    fitToGeometry?: boolean;
    onModifyEnd?: (geometry: Record<string, any>) => void;
}

type AuthenticatedTile = {
    getImage: () => HTMLImageElement;
    __blobUrl?: string;
    __requestToken?: number;
    __abortController?: AbortController;
};

@Injectable()
export class EditorMapService {
    private apiBaseUrl = inject(API_BASE_URL);
    private authSession = inject(AuthSessionService);
    private userContextService = inject(UserContextService);

    private olMap?: OlMap;
    private ngZone?: NgZone;
    private readonly geojson = new GeoJSON();

    private readonly drawSource = new VectorSource();
    private readonly highlightSource = new VectorSource();

    private readonly drawLayer = new VectorLayer({
        source: this.drawSource,
        style: new Style({
            fill: new Fill({ color: 'rgba(59, 130, 246, 0.14)' }),
            stroke: new Stroke({ color: '#2563eb', width: 2 }),
            image: new CircleStyle({
                radius: 5,
                fill: new Fill({ color: '#2563eb' }),
                stroke: new Stroke({ color: '#ffffff', width: 1 })
            })
        }),
        zIndex: 900
    });

    private readonly highlightLayer = new VectorLayer({
        source: this.highlightSource,
        style: new Style({
            fill: new Fill({ color: 'rgba(234, 88, 12, 0.18)' }),
            stroke: new Stroke({ color: '#ea580c', width: 3 }),
            image: new CircleStyle({
                radius: 6,
                fill: new Fill({ color: '#ea580c' }),
                stroke: new Stroke({ color: '#ffffff', width: 1 })
            })
        }),
        zIndex: 910
    });

    private readonly featureEditSource = new VectorSource();
    private readonly featureEditLayer = new VectorLayer({
        source: this.featureEditSource,
        style: new Style({
            fill: new Fill({ color: 'rgba(16, 185, 129, 0.16)' }),
            stroke: new Stroke({ color: '#059669', width: 3 }),
            image: new CircleStyle({
                radius: 6,
                fill: new Fill({ color: '#059669' }),
                stroke: new Stroke({ color: '#ffffff', width: 1.2 })
            })
        }),
        zIndex: 905
    });

    private wmsLayers = new Map<number, TileLayer<TileWMS>>();
    private drawInteraction?: Draw;
    private drawModeLayerId: number | null = null;
    private featureEditInteraction?: Modify;
    private featureEditSrid: number | null = null;
    private featureEditModifyCallback?: (geometry: Record<string, any>) => void;
    private mapClickHandler?: (event: EditorMapClickEvent) => void;
    private mapSingleClickKey?: EventsKey;
    private wmsRefreshToken = 0;
    private wmsTileRequestToken = 0;

    initialize(target: HTMLElement, ngZone: NgZone) {
        if (this.olMap) {
            return;
        }

        this.ngZone = ngZone;
        ngZone.runOutsideAngular(() => {
            this.olMap = new OlMap({
                target,
                layers: [
                    new TileLayer({
                        source: new OSM({
                            referrerPolicy: 'strict-origin-when-cross-origin'
                        }),
                        zIndex: 0
                    }),
                    this.drawLayer,
                    this.featureEditLayer,
                    this.highlightLayer
                ],
                controls: defaultControls({
                    zoom: false,
                    rotate: false,
                    attribution: false
                }).extend([
                    new Attribution({
                        collapsible: false
                    })
                ]),
                view: new View({
                    center: [0, 0],
                    zoom: 2
                })
            });
        });

        this.registerMapClickListener();
    }

    destroy() {
        if (!this.olMap) {
            return;
        }

        this.clearDrawMode();
        this.clearFeatureEdit();
        this.clearHighlight();
        this.drawSource.clear();
        if (this.mapSingleClickKey) {
            unByKey(this.mapSingleClickKey);
            this.mapSingleClickKey = undefined;
        }
        this.mapClickHandler = undefined;
        this.wmsLayers.forEach((layer) => this.olMap?.removeLayer(layer));
        this.wmsLayers.clear();
        this.olMap.setTarget(undefined);
        this.olMap = undefined;
        this.ngZone = undefined;
    }

    adjustZoom(delta: number) {
        if (!this.olMap) {
            return;
        }

        const view = this.olMap.getView();
        const currentZoom = view.getZoom() ?? 2;
        const nextZoom = Math.max(1, Math.min(22, currentZoom + delta));

        view.animate({
            zoom: nextZoom,
            duration: 160
        });
    }

    updateSize() {
        this.olMap?.updateSize();
    }

    clearDrawPreview() {
        this.drawSource.clear();
    }

    showDrawPreviewGeometry(geometry: Record<string, any> | null | undefined, srid: number) {
        if (!this.olMap || !geometry || typeof geometry !== 'object') {
            return;
        }

        try {
            const parsedGeometry = this.geojson.readGeometry(geometry, {
                dataProjection: `EPSG:${srid}`,
                featureProjection: 'EPSG:3857'
            });
            this.drawSource.clear();
            this.drawSource.addFeature(new Feature({ geometry: parsedGeometry }));
        } catch {
            this.drawSource.clear();
        }
    }

    setMapClickHandler(handler: ((event: EditorMapClickEvent) => void) | null) {
        this.mapClickHandler = handler ?? undefined;
    }

    syncWmsLayers(mapaId: number, layers: Array<Pick<MapaLayer, 'id' | 'ordem' | 'visivel' | 'status'>>) {
        if (!this.olMap) {
            return;
        }

        const activeLayerIds = new Set<number>();
        for (const layer of layers) {
            if (layer.id <= 0) {
                continue;
            }
            activeLayerIds.add(layer.id);
            const visible = layer.visivel && layer.status === 'ACTIVE';
            const existing = this.wmsLayers.get(layer.id);
            if (!existing) {
                const wmsLayer = new TileLayer({
                    source: this.createAuthenticatedWmsSource(mapaId, layer.id),
                    visible,
                    zIndex: 100 + layer.ordem
                });
                this.wmsLayers.set(layer.id, wmsLayer);
                this.olMap.addLayer(wmsLayer);
                continue;
            }

            existing.setVisible(visible);
            existing.setZIndex(100 + layer.ordem);
        }

        for (const [layerId, layer] of this.wmsLayers.entries()) {
            if (!activeLayerIds.has(layerId)) {
                this.olMap.removeLayer(layer);
                this.wmsLayers.delete(layerId);
            }
        }

        if (this.drawModeLayerId !== null && !activeLayerIds.has(this.drawModeLayerId)) {
            this.clearDrawMode();
        }
    }

    refreshWmsLayer(layerId: number) {
        const layer = this.wmsLayers.get(layerId);
        const source = layer?.getSource();
        if (!source) {
            return;
        }
        this.wmsRefreshToken += 1;
        source.updateParams({
            _ts: `${Date.now()}-${this.wmsRefreshToken}`
        });
        source.refresh();
    }

    setDrawMode(config: MapDrawModeConfig | null): boolean {
        if (!this.olMap) {
            return false;
        }

        this.clearDrawMode();
        this.drawSource.clear();
        if (!config) {
            return true;
        }

        const resolvedType = this.resolveDrawType(config.geomType);
        if (!resolvedType) {
            return false;
        }

        const interaction = new Draw({
            source: this.drawSource,
            type: resolvedType
        });
        interaction.on('drawend', (event) => {
            const geometry = this.geojson.writeGeometryObject(event.feature.getGeometry() as Geometry, {
                dataProjection: `EPSG:${config.srid}`,
                featureProjection: 'EPSG:3857'
            });
            this.drawSource.clear();
            if (!geometry || typeof geometry !== 'object') {
                return;
            }
            if (this.ngZone) {
                this.ngZone.run(() => config.onDrawEnd(geometry as Record<string, any>));
                return;
            }
            config.onDrawEnd(geometry as Record<string, any>);
        });

        this.drawInteraction = interaction;
        this.drawModeLayerId = config.layerId;
        this.olMap.addInteraction(interaction);
        return true;
    }

    clearDrawMode() {
        if (!this.olMap || !this.drawInteraction) {
            this.drawInteraction = undefined;
            this.drawModeLayerId = null;
            return;
        }

        this.olMap.removeInteraction(this.drawInteraction);
        this.drawInteraction = undefined;
        this.drawModeLayerId = null;
        this.drawSource.clear();
    }

    startFeatureEditMode(config: MapFeatureEditModeConfig): boolean {
        if (!this.olMap || !config?.geometry || typeof config.geometry !== 'object') {
            return false;
        }

        this.clearFeatureEdit();

        const parsedGeometry = this.geojson.readGeometry(config.geometry, {
            dataProjection: `EPSG:${config.srid}`,
            featureProjection: 'EPSG:3857'
        });

        const feature = new Feature({ geometry: parsedGeometry });
        this.featureEditSource.addFeature(feature);
        this.featureEditSrid = config.srid;
        this.featureEditModifyCallback = config.onModifyEnd;

        const interaction = new Modify({
            source: this.featureEditSource,
            pixelTolerance: 10
        });
        interaction.on('modifyend', () => {
            const geometry = this.getFeatureEditGeometry();
            if (!geometry || !this.featureEditModifyCallback) {
                return;
            }
            this.featureEditModifyCallback(geometry);
        });
        this.featureEditInteraction = interaction;
        this.olMap.addInteraction(interaction);

        if (config.fitToGeometry !== false) {
            const extent = parsedGeometry.getExtent();
            if (extent && Number.isFinite(extent[0])) {
                this.olMap.getView().fit(extent, {
                    padding: [64, 64, 64, 64],
                    duration: 180,
                    maxZoom: 19
                });
            }
        }

        return true;
    }

    clearFeatureEdit() {
        if (this.olMap && this.featureEditInteraction) {
            this.olMap.removeInteraction(this.featureEditInteraction);
        }
        this.featureEditInteraction = undefined;
        this.featureEditSrid = null;
        this.featureEditModifyCallback = undefined;
        this.featureEditSource.clear();
    }

    hasActiveFeatureEdit() {
        return this.featureEditSource.getFeatures().length > 0;
    }

    getFeatureEditGeometry(srid?: number): Record<string, any> | null {
        const feature = this.featureEditSource.getFeatures()[0];
        const geometry = feature?.getGeometry();
        const targetSrid = srid ?? this.featureEditSrid;
        if (!geometry || !targetSrid) {
            return null;
        }

        const serialized = this.geojson.writeGeometryObject(geometry, {
            dataProjection: `EPSG:${targetSrid}`,
            featureProjection: 'EPSG:3857'
        });
        if (!serialized || typeof serialized !== 'object') {
            return null;
        }
        return serialized as Record<string, any>;
    }

    isPixelOnFeatureEdit(pixel: Pixel, hitTolerance = 8) {
        if (!this.olMap || !this.hasActiveFeatureEdit()) {
            return false;
        }

        let hit = false;
        this.olMap.forEachFeatureAtPixel(
            pixel,
            (_feature, layer) => {
                if (layer === this.featureEditLayer) {
                    hit = true;
                    return true;
                }
                return undefined;
            },
            { hitTolerance }
        );
        return hit;
    }

    buildSearchBboxFromPixel(pixel: Pixel, dataSrid: number, tolerancePx = 8): [number, number, number, number] | null {
        if (!this.olMap) {
            return null;
        }

        const topLeft = this.olMap.getCoordinateFromPixel([pixel[0] - tolerancePx, pixel[1] - tolerancePx]);
        const bottomRight = this.olMap.getCoordinateFromPixel([pixel[0] + tolerancePx, pixel[1] + tolerancePx]);
        if (!topLeft || !bottomRight) {
            return null;
        }

        const sourceCode = 'EPSG:3857';
        const targetCode = `EPSG:${dataSrid}`;
        const a = transform(topLeft, sourceCode, targetCode);
        const b = transform(bottomRight, sourceCode, targetCode);

        const minx = Math.min(a[0], b[0]);
        const maxx = Math.max(a[0], b[0]);
        const miny = Math.min(a[1], b[1]);
        const maxy = Math.max(a[1], b[1]);

        if (![minx, miny, maxx, maxy].every(Number.isFinite)) {
            return null;
        }

        return [minx, miny, maxx, maxy];
    }

    pickFeatureForMapClick(candidates: MapaLayerFeature[], coordinate: Coordinate, srid: number): MapaLayerFeature | null {
        let selected: MapaLayerFeature | null = null;
        let selectedDistance = Number.POSITIVE_INFINITY;
        let selectedIntersects = false;

        for (const candidate of candidates) {
            if (!candidate?.geometry) {
                continue;
            }

            let geometry: Geometry;
            try {
                geometry = this.geojson.readGeometry(candidate.geometry, {
                    dataProjection: `EPSG:${srid}`,
                    featureProjection: 'EPSG:3857'
                });
            } catch {
                continue;
            }

            const intersects = geometry.intersectsCoordinate(coordinate);
            const closestPoint = geometry.getClosestPoint([coordinate[0], coordinate[1]]);
            const dx = closestPoint[0] - coordinate[0];
            const dy = closestPoint[1] - coordinate[1];
            const distance = dx * dx + dy * dy;

            const shouldReplace = selected === null || (intersects && !selectedIntersects) || (intersects === selectedIntersects && distance < selectedDistance);

            if (shouldReplace) {
                selected = candidate;
                selectedDistance = distance;
                selectedIntersects = intersects;
            }
        }

        return selected;
    }

    fitGeometries(geometries: Array<Record<string, any> | null | undefined>, srid: number): boolean {
        if (!this.olMap || !Array.isArray(geometries) || geometries.length === 0) {
            return false;
        }

        let minx = Number.POSITIVE_INFINITY;
        let miny = Number.POSITIVE_INFINITY;
        let maxx = Number.NEGATIVE_INFINITY;
        let maxy = Number.NEGATIVE_INFINITY;
        let hasGeometry = false;

        for (const geometryPayload of geometries) {
            if (!geometryPayload || typeof geometryPayload !== 'object') {
                continue;
            }
            try {
                const geometry = this.geojson.readGeometry(geometryPayload, {
                    dataProjection: `EPSG:${srid}`,
                    featureProjection: 'EPSG:3857'
                });
                const extent = geometry.getExtent();
                if (!extent || !Number.isFinite(extent[0])) {
                    continue;
                }
                minx = Math.min(minx, extent[0]);
                miny = Math.min(miny, extent[1]);
                maxx = Math.max(maxx, extent[2]);
                maxy = Math.max(maxy, extent[3]);
                hasGeometry = true;
            } catch {
                continue;
            }
        }

        if (!hasGeometry || ![minx, miny, maxx, maxy].every(Number.isFinite)) {
            return false;
        }

        const extent: [number, number, number, number] = [minx, miny, maxx, maxy];
        this.olMap.getView().fit(extent, {
            padding: [64, 64, 64, 64],
            duration: 220,
            maxZoom: 18
        });
        return true;
    }

    highlightGeometry(geometry: Record<string, any> | null | undefined, srid: number) {
        if (!this.olMap || !geometry) {
            return;
        }

        this.highlightSource.clear();
        const parsedGeometry = this.geojson.readGeometry(geometry, {
            dataProjection: `EPSG:${srid}`,
            featureProjection: 'EPSG:3857'
        });

        const feature = new Feature({ geometry: parsedGeometry });
        this.highlightSource.addFeature(feature);

        const extent = parsedGeometry.getExtent();
        if (!extent || !Number.isFinite(extent[0])) {
            return;
        }
        this.olMap.getView().fit(extent, {
            padding: [64, 64, 64, 64],
            duration: 220,
            maxZoom: 18
        });
    }

    clearHighlight() {
        this.highlightSource.clear();
    }

    canDraw(geomType: string): boolean {
        return this.resolveDrawType(geomType) !== null;
    }

    private registerMapClickListener() {
        if (!this.olMap || this.mapSingleClickKey) {
            return;
        }

        this.mapSingleClickKey = this.olMap.on('singleclick', (event: MapBrowserEvent) => {
            if (!this.mapClickHandler) {
                return;
            }

            const payload: EditorMapClickEvent = {
                coordinate: [event.coordinate[0], event.coordinate[1]],
                pixel: [event.pixel[0], event.pixel[1]]
            };

            if (this.ngZone) {
                this.ngZone.run(() => this.mapClickHandler?.(payload));
                return;
            }

            this.mapClickHandler(payload);
        });
    }

    private createAuthenticatedWmsSource(mapaId: number, layerId: number) {
        return new TileWMS({
            url: `${this.apiBaseUrl}/mapeditor/mapas/${mapaId}/layers/${layerId}/wms/`,
            params: {
                TILED: true,
                VERSION: '1.1.1',
                FORMAT: 'image/png',
                TRANSPARENT: 'true'
            },
            transition: 0,
            tileLoadFunction: (tile, src) => this.loadAuthenticatedTile(tile as unknown as AuthenticatedTile, src)
        });
    }

    private loadAuthenticatedTile(tile: AuthenticatedTile, src: string) {
        const image = tile.getImage();
        if (!image) {
            return;
        }

        const headers = this.buildMapApiHeaders();
        if (!headers.has('Authorization')) {
            image.removeAttribute('src');
            return;
        }

        tile.__abortController?.abort();
        const abortController = new AbortController();
        tile.__abortController = abortController;
        const requestToken = ++this.wmsTileRequestToken;
        tile.__requestToken = requestToken;

        const previousBlobUrl = tile.__blobUrl;
        if (previousBlobUrl) {
            URL.revokeObjectURL(previousBlobUrl);
            tile.__blobUrl = undefined;
        }

        void fetch(src, { headers, mode: 'cors', cache: 'no-store', signal: abortController.signal })
            .then((response) => {
                if (tile.__requestToken !== requestToken) {
                    return null;
                }
                const contentType = String(response.headers.get('Content-Type') || response.headers.get('content-type') || '').toLowerCase();
                if (!response.ok) {
                    return response
                        .text()
                        .catch(() => '')
                        .then((bodyText) => {
                            const snippet = bodyText.slice(0, 300).trim();
                            throw new Error(`Falha no carregamento WMS (${response.status})${snippet ? `: ${snippet}` : ''}`);
                        });
                }
                if (contentType && !contentType.startsWith('image/')) {
                    return response
                        .text()
                        .catch(() => '')
                        .then((bodyText) => {
                            const snippet = bodyText.slice(0, 300).trim();
                            throw new Error(`Resposta WMS nao e imagem (${contentType || 'desconhecido'})${snippet ? `: ${snippet}` : ''}`);
                        });
                }
                return response.blob();
            })
            .then((blob) => {
                if (!(blob instanceof Blob)) {
                    return;
                }
                if (tile.__requestToken !== requestToken) {
                    return;
                }
                const objectUrl = URL.createObjectURL(blob);
                if (tile.__requestToken !== requestToken) {
                    URL.revokeObjectURL(objectUrl);
                    return;
                }
                tile.__blobUrl = objectUrl;

                image.onload = () => {
                    if (tile.__blobUrl === objectUrl) {
                        URL.revokeObjectURL(objectUrl);
                        tile.__blobUrl = undefined;
                    }
                };
                image.onerror = () => {
                    if (tile.__blobUrl === objectUrl) {
                        URL.revokeObjectURL(objectUrl);
                        tile.__blobUrl = undefined;
                    }
                };
                image.src = objectUrl;
            })
            .catch((error) => {
                if (abortController.signal.aborted || tile.__requestToken !== requestToken) {
                    return;
                }
                // Ajuda a diagnosticar erro de proxy/autenticacao/GeoServer sem depender do ORB do browser.
                console.error('[MapEditor][WMS] Falha ao carregar tile', error);
                image.removeAttribute('src');
            });
    }

    private buildMapApiHeaders() {
        const headers = new Headers();
        const token = this.authSession.getAccessToken();
        if (!token) {
            return headers;
        }

        headers.set('Authorization', `Bearer ${token}`);

        const user = this.authSession.getUser();
        if (user?.is_superuser) {
            return headers;
        }

        const context = this.userContextService.getActiveContext();
        if (!context) {
            return headers;
        }

        headers.set('X-Contrato-Id', String(context.contrato_id));
        headers.set('X-Organizacao-Id', String(context.organizacao_id));
        return headers;
    }

    private resolveDrawType(geomType: string): DrawType | null {
        const normalizedType = String(geomType || '')
            .trim()
            .toUpperCase();
        if (!normalizedType) {
            return null;
        }
        if (normalizedType === 'POINT' || normalizedType === 'MULTIPOINT') {
            return 'Point';
        }
        if (normalizedType === 'LINESTRING' || normalizedType === 'MULTILINESTRING') {
            return 'LineString';
        }
        if (normalizedType === 'POLYGON' || normalizedType === 'MULTIPOLYGON') {
            return 'Polygon';
        }
        return null;
    }
}
