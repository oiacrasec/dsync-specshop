import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDrag, CdkDragEnd, DragDropModule } from '@angular/cdk/drag-drop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Menu, MenuModule } from 'primeng/menu';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { catchError, forkJoin, of } from 'rxjs';

import { getBackendErrorMessage } from '@/app/pages/administracao/usuario/error-message';
import { MapaService } from '@/app/pages/geoespacial/mapa/mapa.service';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiCheckbox } from '@/app/shared/ui/checkbox/checkbox';
import { UiInputDate } from '@/app/shared/ui/input-date/input-date';
import { UiInputNumber } from '@/app/shared/ui/input-number/input-number';
import { UiInputText } from '@/app/shared/ui/input-text/input-text';
import { Mapa, MapaLayerColumn, MapaLayerCreate, MapaLayerFeature, MapaLayerFeatureUpdatePayload } from '@/app/types/mapa';

import { FloatingPanelId, PanelSize } from './editor.models';
import { EditorMapClickEvent, EditorMapService } from './services/editor-map.service';
import { EditorLayoutState } from './state/editor-layout.state';
import { EditorLayersState } from './state/editor-layers.state';

type LayerColumnFormValue = {
    name: string;
    type: string;
    size: number | null;
    nullable: boolean;
    unique: boolean;
};

type LayerColumnFormLike = {
    invalid: boolean;
    markAllAsTouched: () => void;
    getRawValue: () => LayerColumnFormValue;
};

type EditorConfirmAcceptSeverity = 'primary' | 'secondary' | 'danger';

@Component({
    selector: 'app-mapa-editor',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, UiButton, UiInputText, UiInputNumber, UiInputDate, UiCheckbox, DragDropModule, MenuModule, ButtonModule, DialogModule, SelectModule, TabsModule, ToastModule, TooltipModule],
    templateUrl: './editor.html',
    styleUrls: ['./editor.css'],
    providers: [EditorMapService, EditorLayoutState, EditorLayersState]
})
export class MapaEditorPage implements OnInit, AfterViewInit, OnDestroy {
    private fb = inject(FormBuilder);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private mapaService = inject(MapaService);
    private messageService = inject(MessageService);
    private ngZone = inject(NgZone);
    private mapService = inject(EditorMapService);
    private cdRef = inject(ChangeDetectorRef);

    readonly layoutState = inject(EditorLayoutState);
    readonly layersState = inject(EditorLayersState);

    @ViewChild('editorShell') editorShell?: ElementRef<HTMLDivElement>;
    @ViewChild('mapFrame') mapFrame?: ElementRef<HTMLDivElement>;
    @ViewChild('mapContainer') mapContainer?: ElementRef<HTMLDivElement>;
    @ViewChild('zoomPanel') zoomPanel?: ElementRef<HTMLDivElement>;
    @ViewChild('activeLayerPanel') activeLayerPanel?: ElementRef<HTMLDivElement>;
    @ViewChild('layersPanel') layersPanel?: ElementRef<HTMLDivElement>;
    @ViewChild('featureActionsPanel') featureActionsPanel?: ElementRef<HTMLDivElement>;
    @ViewChild('featuresDrawerPanel') featuresDrawerPanel?: ElementRef<HTMLDivElement>;
    @ViewChild('zoomDrag') zoomDrag?: CdkDrag;
    @ViewChild('activeLayerDrag') activeLayerDrag?: CdkDrag;
    @ViewChild('layersDrag') layersDrag?: CdkDrag;
    @ViewChild('featureActionsDrag') featureActionsDrag?: CdkDrag;
    @ViewChild('featuresDrawerDrag') featuresDrawerDrag?: CdkDrag;

    mapaId?: number;
    mapa?: Mapa;
    loading = false;
    readonly toastKey = 'map-editor-toast';
    mapFullscreenActive = false;
    editorConfirmDialogVisible = false;
    editorConfirmDialogHeader = '';
    editorConfirmDialogMessage = '';
    editorConfirmDialogAcceptLabel = 'Confirmar';
    editorConfirmDialogAcceptSeverity: EditorConfirmAcceptSeverity = 'danger';
    quickActionItems: MenuItem[] = [];
    addLayerDialogVisible = false;
    addLayerActiveTab: 'dados' | 'metadados' = 'dados';
    creatingLayer = false;
    layerColumnsDialogVisible = false;
    layerColumnsLoading = false;
    layerColumnsSaving = false;
    layerColumnsTargetId: number | null = null;
    layerColumnsTargetName = '';
    layerColumnsData: MapaLayerColumn[] = [];
    selectedDrawLayerId: number | null = null;
    drawingModeEnabled = false;
    activeLayerPanelPosition = { x: 96, y: 14 };
    featuresDialogVisible = false;
    featuresDialogLoading = false;
    featuresDialogLayerId: number | null = null;
    featuresDialogLayerName = '';
    featuresDialogColumns: MapaLayerColumn[] = [];
    featuresDialogData: MapaLayerFeature[] = [];
    featuresDialogFirst = 0;
    readonly featuresDialogPageSize = 10;
    featuresDialogRows = this.featuresDialogPageSize;
    featuresDialogTotalRecords = 0;
    featuresDrawerCollapsed = false;
    featuresDrawerPosition = { x: 16, y: 8 };
    featureEditDialogVisible = false;
    featureEditSaving = false;
    featureEditLayerId: number | null = null;
    featureEditLayerName = '';
    featureEditFeatureId: number | null = null;
    featureEditColumns: MapaLayerColumn[] = [];
    featureEditValues: Record<string, any> = {};
    featureEditOriginalValues: Record<string, any> = {};
    featureEditTouchedValues: Record<string, boolean> = {};
    featureQuickActionsVisible = false;
    featureQuickActionsCollapsed = true;
    featureQuickActionsFeatureId: number | null = null;
    featureQuickActionsLayerName = '';
    private featureQuickActionsLayerId: number | null = null;
    private featureQuickActionsFeatureData: MapaLayerFeature | null = null;
    featureQuickActionsPosition = { x: 16, y: 16 };
    private pendingCreateFeatureGeometry: Record<string, any> | null = null;
    private editorConfirmDialogAcceptAction: (() => void) | null = null;
    private editorConfirmDialogRejectAction: (() => void) | null = null;
    private editorConfirmDialogResolution: 'none' | 'accept' | 'reject' = 'none';

    geomTypeOptions = [
        { label: 'Geometry', value: 'GEOMETRY' },
        { label: 'Point', value: 'POINT' },
        { label: 'MultiPoint', value: 'MULTIPOINT' },
        { label: 'LineString', value: 'LINESTRING' },
        { label: 'MultiLineString', value: 'MULTILINESTRING' },
        { label: 'Polygon', value: 'POLYGON' },
        { label: 'MultiPolygon', value: 'MULTIPOLYGON' },
        { label: 'GeometryCollection', value: 'GEOMETRYCOLLECTION' }
    ];
    metadataTypeOptions = [
        { label: 'String', value: 'string' },
        { label: 'Integer', value: 'integer' },
        { label: 'Double', value: 'double' },
        { label: 'Boolean', value: 'boolean' },
        { label: 'Date', value: 'date' }
    ];

    layerForm = this.fb.group({
        nome: this.fb.nonNullable.control('', Validators.required),
        geom_type: this.fb.nonNullable.control('GEOMETRY', Validators.required),
        style_name: this.fb.nonNullable.control(''),
        visivel: this.fb.nonNullable.control(true)
    });
    newLayerColumnForm = this.fb.group({
        name: this.fb.nonNullable.control('', Validators.required),
        type: this.fb.nonNullable.control('string', Validators.required),
        size: this.fb.control<number | null>(255),
        nullable: this.fb.nonNullable.control(true),
        unique: this.fb.nonNullable.control(false)
    });
    layerColumnsDraft: MapaLayerColumn[] = [];
    layerColumnForm = this.fb.group({
        name: this.fb.nonNullable.control('', Validators.required),
        type: this.fb.nonNullable.control('string', Validators.required),
        size: this.fb.control<number | null>(255),
        nullable: this.fb.nonNullable.control(true),
        unique: this.fb.nonNullable.control(false)
    });

    private frameResizeObserver?: ResizeObserver;
    private isDestroyed = false;
    private activeGeometryEditFeatureRef: { layerId: number; featureId: number } | null = null;
    private activeGeometryEditDirty = false;
    private activeGeometryEditSaving = false;
    private featureDeletePending = false;
    private featureDeleteConfirmOpen = false;
    private mapClickIdentifySeq = 0;
    private initialFeatureAutoFitStarted = false;
    private initialFeatureAutoFitDone = false;
    private activeLayerPanelManuallyMoved = false;

    ngOnInit() {
        this.refreshQuickActionItems();

        const idParam = this.route.snapshot.paramMap.get('id');
        const id = Number(idParam);
        if (!Number.isFinite(id) || id <= 0) {
            this.goBack();
            return;
        }

        this.mapaId = id;
        this.loadMapa();
        this.loadLayers();
    }

    ngAfterViewInit() {
        this.initializeMapIfNeeded();
        this.mapService.setMapClickHandler((event) => this.onMapSingleClick(event));
        this.syncMapFullscreenState();
        this.refreshQuickActionItems();
        this.setupPanelsLayoutSync();
        this.syncMapLayerRendering();
        this.tryAutoFitMapToFeatures();
    }

    ngOnDestroy() {
        this.isDestroyed = true;
        this.stopDrawingMode(false, false);
        this.frameResizeObserver?.disconnect();
        this.frameResizeObserver = undefined;
        this.mapService.setMapClickHandler(null);
        this.mapService.destroy();
    }

    @HostListener('window:resize')
    onWindowResize() {
        this.mapService.updateSize();
        this.syncFloatingPanelsPosition();
    }

    @HostListener('document:fullscreenchange')
    onDocumentFullscreenChange() {
        this.syncMapFullscreenState();
        this.refreshQuickActionItems();
        requestAnimationFrame(() => {
            this.mapService.updateSize();
            this.syncFloatingPanelsPosition();
        });
    }

    @HostListener('window:keydown', ['$event'])
    onWindowKeydown(event: KeyboardEvent) {
        if (event.key !== 'Delete' && event.code !== 'Delete') {
            return;
        }
        if (!this.canHandleFeatureDeleteShortcut(event)) {
            return;
        }

        const currentEdit = this.activeGeometryEditFeatureRef;
        if (!currentEdit) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        this.confirmFeatureDeletion(currentEdit.layerId, currentEdit.featureId);
    }

    goBack() {
        this.router.navigateByUrl('/pages/geoespacial/mapas');
    }

    zoomIn() {
        this.mapService.adjustZoom(1);
    }

    zoomOut() {
        this.mapService.adjustZoom(-1);
    }

    toggleLayersMenu() {
        this.layoutState.toggleLayersMenu();
        requestAnimationFrame(() => this.syncFloatingPanelsPosition());
    }

    get overlayAppendTarget(): HTMLElement | 'body' {
        const shell = this.editorShell?.nativeElement;
        if (this.mapFullscreenActive && shell) {
            return shell;
        }
        return 'body';
    }

    get menuLayers() {
        return this.layersState.layers.filter((layer) => layer.id > 0 && layer.status === 'ACTIVE');
    }

    selectedDrawLayerCanDraw() {
        const layer = this.selectedDrawLayer;
        if (!layer) {
            return false;
        }
        return this.mapService.canDraw(layer.geom_type);
    }

    get selectedDrawLayer() {
        if (!this.selectedDrawLayerId) {
            return null;
        }
        return this.layersState.findLayer(this.selectedDrawLayerId) ?? null;
    }

    get activeLayerDrawTooltip() {
        return this.drawingModeEnabled ? 'Parar desenho' : 'Desenhar';
    }

    get featureEditDialogHeader() {
        return this.isFeatureCreateDialogMode() ? 'Nova feição - atributos' : 'Editar atributos da feição';
    }

    get featureEditSaveButtonLabel() {
        return this.isFeatureCreateDialogMode() ? 'Salvar feição' : 'Salvar atributos';
    }

    get featureEditFeatureLabel() {
        if (this.isFeatureCreateDialogMode()) {
            return 'Nova (desenho)';
        }
        return this.featureEditFeatureId ? `#${this.featureEditFeatureId}` : '-';
    }

    isFeatureColumnBoolean(column: MapaLayerColumn) {
        const type = this.getFeatureColumnType(column);
        return type === 'boolean' || type === 'bool';
    }

    isFeatureColumnDate(column: MapaLayerColumn) {
        return this.getFeatureColumnType(column) === 'date';
    }

    isFeatureColumnNumber(column: MapaLayerColumn) {
        const type = this.getFeatureColumnType(column);
        return type === 'integer' || type === 'bigint' || type === 'double' || type === 'numeric' || type === 'float' || type === 'real';
    }

    isFeatureColumnInteger(column: MapaLayerColumn) {
        const type = this.getFeatureColumnType(column);
        return type === 'integer' || type === 'bigint';
    }

    onFeatureFieldValueChange(columnName: string, value: any) {
        this.featureEditValues[columnName] = value;
        this.featureEditTouchedValues[columnName] = true;
    }

    openFeatureAttributesFromQuickActions() {
        if (!this.featureQuickActionsLayerId || !this.featureQuickActionsFeatureData) {
            return;
        }
        this.openFeatureEditDialogByLayerFeature(this.featureQuickActionsLayerId, this.featureQuickActionsLayerName, this.featureQuickActionsFeatureData);
    }

    confirmRemoveFeatureFromQuickActions() {
        if (!this.featureQuickActionsLayerId || !this.featureQuickActionsFeatureId) {
            return;
        }
        this.confirmFeatureDeletion(this.featureQuickActionsLayerId, this.featureQuickActionsFeatureId);
    }

    toggleFeatureQuickActionsCollapsed() {
        this.featureQuickActionsCollapsed = !this.featureQuickActionsCollapsed;
        this.refreshView();
        requestAnimationFrame(() => this.ensureFeatureQuickActionsInBounds());
    }

    openQuickActionsMenu(event: Event, menu: Menu) {
        menu.toggle(event);
    }

    onSelectedDrawLayerChange(silent = false) {
        const currentEdit = this.activeGeometryEditFeatureRef;
        if (currentEdit && currentEdit.layerId !== this.selectedDrawLayerId) {
            this.closeActiveFeatureGeometryEdit({ silent: true });
        }

        const selectedLayer = this.selectedDrawLayer;
        if (!selectedLayer && this.drawingModeEnabled) {
            this.stopDrawingMode(!silent);
            return;
        }
        if (!selectedLayer) {
            this.mapService.clearHighlight();
            this.refreshView();
            return;
        }

        if (!this.mapService.canDraw(selectedLayer.geom_type) && this.drawingModeEnabled) {
            this.stopDrawingMode();
        }
        this.mapService.clearHighlight();
        this.refreshView();
    }

    onLayersPanelBackgroundClick(event: MouseEvent) {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }

        if (target.closest('button, input, label, .layer-row, .drag-handle, a, [role="button"]')) {
            return;
        }

        this.clearSelectedDrawLayer();
    }

    clearSelectedDrawLayer() {
        if (this.selectedDrawLayerId == null) {
            return;
        }
        this.selectedDrawLayerId = null;
        this.activeLayerPanelManuallyMoved = false;
        this.onSelectedDrawLayerChange(true);
    }

    selectDrawLayer(layerId: number) {
        const layer = this.layersState.findLayer(layerId);
        if (!layer || layer.id <= 0 || layer.status !== 'ACTIVE') {
            return;
        }
        if (this.isLayerDeletePending(layerId)) {
            return;
        }
        if (this.selectedDrawLayerId === layerId) {
            return;
        }

        this.cancelDrawingMenuActionsOnLayerSelection();
        this.activeLayerPanelManuallyMoved = false;
        this.selectedDrawLayerId = layerId;
        this.onSelectedDrawLayerChange();
        requestAnimationFrame(() => this.syncFloatingPanelsPosition());
    }

    toggleDrawingMode() {
        if (!this.drawingModeEnabled && this.activeGeometryEditFeatureRef) {
            const closedNow = this.closeActiveFeatureGeometryEdit({ silent: true });
            if (!closedNow) {
                return;
            }
        }
        if (this.drawingModeEnabled) {
            this.stopDrawingMode();
            return;
        }
        this.startDrawingMode();
    }

    startDrawingMode() {
        if (!this.mapaId || !this.mapa) {
            return;
        }
        const layer = this.selectedDrawLayer;
        if (!layer) {
            this.messageService.add({
                key: this.toastKey,
                severity: 'warn',
                summary: 'Selecione um layer',
                detail: 'Escolha o layer para iniciar o desenho.'
            });
            return;
        }
        if (!this.mapService.canDraw(layer.geom_type)) {
            this.messageService.add({
                key: this.toastKey,
                severity: 'warn',
                summary: 'Geometria não suportada',
                detail: `O tipo ${layer.geom_type} não está habilitado para desenho direto no editor.`
            });
            return;
        }

        const enabled = this.mapService.setDrawMode({
            layerId: layer.id,
            geomType: layer.geom_type,
            srid: this.mapa.srid,
            onDrawEnd: (geometry) => this.createFeatureFromDraw(layer.id, geometry)
        });
        if (!enabled) {
            this.messageService.add({
                key: this.toastKey,
                severity: 'warn',
                summary: 'Desenho indisponível',
                detail: 'Não foi possível iniciar o modo desenho para este layer.'
            });
            return;
        }

        this.drawingModeEnabled = true;
        this.messageService.add({
            key: this.toastKey,
            severity: 'info',
            summary: 'Modo desenho ativo',
            detail: `Desenhe no mapa para criar feições no layer "${layer.nome}".`
        });
        this.refreshView();
    }

    stopDrawingMode(showMessage = true, triggerRefresh = true) {
        this.mapService.clearDrawMode();
        const wasEnabled = this.drawingModeEnabled;
        this.drawingModeEnabled = false;
        if (showMessage && wasEnabled) {
            this.messageService.add({
                key: this.toastKey,
                severity: 'info',
                summary: 'Modo desenho finalizado',
                detail: 'O desenho de novas geometrias foi encerrado.'
            });
        }
        if (triggerRefresh) {
            this.refreshView();
        }
    }

    toggleLayer(layerId: number, checked: boolean) {
        if (!this.mapaId) {
            return;
        }

        if (this.activeGeometryEditFeatureRef?.layerId === layerId) {
            const closedNow = this.closeActiveFeatureGeometryEdit({ silent: true });
            if (!closedNow) {
                this.messageService.add({
                    key: this.toastKey,
                    severity: 'info',
                    summary: 'Finalizando edição',
                    detail: 'Aguarde a finalização da edição da geometria para alterar a visibilidade do layer.'
                });
                return;
            }
        }

        const currentLayer = this.layersState.findLayer(layerId);
        if (!currentLayer || currentLayer.visivel === checked) {
            return;
        }
        if (layerId <= 0) {
            return;
        }

        const previousValue = currentLayer.visivel;
        this.layersState.setLayerVisibility(layerId, checked);
        this.syncMapLayerRendering();
        this.layersState.setVisibilityPending(layerId, true);
        this.mapaService.updateLayer(this.mapaId, layerId, { visivel: checked }).subscribe({
            next: (layer) => {
                this.layersState.setVisibilityPending(layerId, false);
                this.layersState.upsertLayer(layer);
                this.syncMapLayerRendering();
                this.refreshView();
            },
            error: (error: unknown) => {
                this.layersState.setLayerVisibility(layerId, previousValue);
                this.layersState.setVisibilityPending(layerId, false);
                this.syncMapLayerRendering();
                this.messageService.add({
                    key: this.toastKey,
                    severity: 'error',
                    summary: 'Falha ao atualizar layer',
                    detail: getBackendErrorMessage(error, 'Não foi possível atualizar a visibilidade do layer.')
                });
                this.refreshView();
            }
        });
    }

    addLayer() {
        this.layerForm.reset({
            nome: '',
            geom_type: 'GEOMETRY',
            style_name: '',
            visivel: true
        });
        this.addLayerActiveTab = 'dados';
        this.resetNewLayerColumnsDraft();
        this.addLayerDialogVisible = true;
    }

    closeAddLayerDialog() {
        if (this.creatingLayer) {
            return;
        }
        this.addLayerDialogVisible = false;
        this.addLayerActiveTab = 'dados';
    }

    createLayer() {
        if (!this.mapaId) {
            return;
        }

        if (this.layerForm.invalid) {
            this.layerForm.markAllAsTouched();
            this.messageService.add({
                key: this.toastKey,
                severity: 'warn',
                summary: 'Campos obrigatórios',
                detail: 'Informe nome e tipo de geometria do layer.'
            });
            return;
        }

        const raw = this.layerForm.getRawValue();
        const layerName = raw.nome.trim();
        if (!layerName) {
            this.messageService.add({
                key: this.toastKey,
                severity: 'warn',
                summary: 'Nome obrigatório',
                detail: 'Informe um nome válido para o layer.'
            });
            return;
        }

        const payload: MapaLayerCreate = {
            nome: layerName,
            geom_type: raw.geom_type,
            visivel: raw.visivel
        };
        const styleName = raw.style_name.trim();
        if (styleName) {
            payload.style_name = styleName;
        }
        if (this.layerColumnsDraft.length > 0) {
            payload.columns = this.layerColumnsDraft;
        }

        const provisionalLayerId = -Date.now();
        this.layersState.upsertProvisionalLayer(provisionalLayerId, {
            nome: layerName,
            geomType: raw.geom_type,
            visivel: raw.visivel
        });

        this.creatingLayer = true;
        this.mapaService.createLayer(this.mapaId, payload).subscribe({
            next: (layer) => {
                this.creatingLayer = false;
                this.addLayerDialogVisible = false;
                this.layersState.removeLayer(provisionalLayerId);
                this.layersState.upsertLayer(layer);
                if (!this.selectedDrawLayerId && layer.status === 'ACTIVE') {
                    this.selectedDrawLayerId = layer.id;
                }
                this.syncMapLayerRendering();
                this.messageService.add({
                    key: this.toastKey,
                    severity: 'success',
                    summary: 'Layer criado',
                    detail: `Layer "${layer.nome}" criado com sucesso.`
                });
                this.refreshView();
            },
            error: (error: unknown) => {
                this.creatingLayer = false;
                this.layersState.removeLayer(provisionalLayerId);
                this.syncMapLayerRendering();
                this.messageService.add({
                    key: this.toastKey,
                    severity: 'error',
                    summary: 'Falha ao criar layer',
                    detail: getBackendErrorMessage(error, 'Não foi possível criar o layer.')
                });
                this.refreshView();
            }
        });
    }

    confirmRemoveLayer(layerId: number, layerName: string) {
        if (!this.mapaId || this.layersState.isDeletePending(layerId)) {
            return;
        }
        if (layerId <= 0) {
            return;
        }

        this.openEditorConfirmDialog({
            header: 'Remover layer',
            message: `Deseja remover o layer "${layerName}"?`,
            acceptLabel: 'Remover',
            acceptSeverity: 'danger',
            onAccept: () => this.removeLayer(layerId, layerName)
        });
    }

    openLayerColumns(layerId: number, layerName: string) {
        if (!this.mapaId || layerId <= 0) {
            return;
        }

        this.layerColumnsDialogVisible = true;
        this.layerColumnsTargetId = layerId;
        this.layerColumnsTargetName = layerName;
        this.layerColumnsData = [];
        this.resetLayerColumnForm();
        this.loadLayerColumns();
    }

    closeLayerColumnsDialog() {
        if (this.layerColumnsSaving) {
            return;
        }
        this.layerColumnsDialogVisible = false;
        this.layerColumnsTargetId = null;
        this.layerColumnsTargetName = '';
        this.layerColumnsData = [];
    }

    addDraftColumnToNewLayer() {
        const column = this.buildColumnFromForm(this.newLayerColumnForm);
        if (!column) {
            return;
        }

        const exists = this.layerColumnsDraft.some((item) => item.name.toLowerCase() === column.name.toLowerCase());
        if (exists) {
            this.messageService.add({
                key: this.toastKey,
                severity: 'warn',
                summary: 'Coluna duplicada',
                detail: 'Já existe uma coluna com esse nome na lista de criação.'
            });
            return;
        }

        this.layerColumnsDraft = [...this.layerColumnsDraft, column];
        this.resetNewLayerColumnForm();
    }

    removeDraftColumnFromNewLayer(index: number) {
        this.layerColumnsDraft = this.layerColumnsDraft.filter((_, currentIndex) => currentIndex !== index);
    }

    addColumnToLayer() {
        if (!this.mapaId || !this.layerColumnsTargetId) {
            return;
        }

        const column = this.buildColumnFromForm(this.layerColumnForm);
        if (!column) {
            return;
        }

        this.layerColumnsSaving = true;
        this.mapaService.addLayerColumn(this.mapaId, this.layerColumnsTargetId, column).subscribe({
            next: (columns) => {
                this.layerColumnsSaving = false;
                this.layerColumnsData = columns;
                this.resetLayerColumnForm();
                this.messageService.add({
                    key: this.toastKey,
                    severity: 'success',
                    summary: 'Coluna adicionada',
                    detail: `A coluna "${column.name}" foi adicionada ao layer.`
                });
                this.refreshView();
            },
            error: (error: unknown) => {
                this.layerColumnsSaving = false;
                this.messageService.add({
                    key: this.toastKey,
                    severity: 'error',
                    summary: 'Falha ao adicionar coluna',
                    detail: getBackendErrorMessage(error, 'Não foi possível adicionar a coluna ao layer.')
                });
                this.refreshView();
            }
        });
    }

    confirmRemoveLayerColumn(columnName: string) {
        if (!this.mapaId || !this.layerColumnsTargetId || this.layerColumnsSaving) {
            return;
        }

        this.openEditorConfirmDialog({
            header: 'Remover coluna',
            message: `A remoção da coluna "${columnName}" é irreversível e pode causar perda permanente de dados. Deseja continuar?`,
            acceptLabel: 'Remover',
            acceptSeverity: 'danger',
            onAccept: () => this.removeLayerColumn(columnName)
        });
    }

    openFeaturesDialog(layerId: number, layerName: string) {
        if (!this.mapaId || layerId <= 0) {
            return;
        }
        this.featuresDialogVisible = true;
        this.featuresDialogLayerId = layerId;
        this.featuresDialogLayerName = layerName;
        this.featuresDialogFirst = 0;
        this.featuresDialogRows = this.featuresDialogPageSize;
        this.featuresDialogTotalRecords = 0;
        this.featuresDialogData = [];
        this.featuresDialogColumns = [];
        this.featuresDrawerCollapsed = false;
        this.loadFeaturesDialogColumnsAndData();
        requestAnimationFrame(() => this.resetFeaturesDrawerPosition());
    }

    closeFeaturesDialog() {
        this.featuresDialogVisible = false;
        this.featuresDialogLayerId = null;
        this.featuresDialogLayerName = '';
        this.featuresDialogData = [];
        this.featuresDialogColumns = [];
        this.featuresDialogLoading = false;
        this.featuresDrawerCollapsed = false;
        this.mapService.clearHighlight();
        this.closeFeatureEditDialog();
        this.refreshView();
    }

    toggleFeaturesDrawerCollapsed() {
        this.featuresDrawerCollapsed = !this.featuresDrawerCollapsed;
        this.refreshView();
        requestAnimationFrame(() => this.ensureFeaturesDrawerInBounds());
    }

    previousFeaturesPage() {
        if (!this.featuresDialogVisible || this.featuresDialogFirst <= 0) {
            return;
        }
        const nextFirst = Math.max(0, this.featuresDialogFirst - this.featuresDialogRows);
        this.featuresDialogFirst = nextFirst;
        this.loadFeaturesDialogData();
    }

    nextFeaturesPage() {
        if (!this.featuresDialogVisible) {
            return;
        }
        const nextFirst = this.featuresDialogFirst + this.featuresDialogRows;
        if (nextFirst >= this.featuresDialogTotalRecords) {
            return;
        }
        this.featuresDialogFirst = nextFirst;
        this.loadFeaturesDialogData();
    }

    canLoadNextFeaturesPage() {
        return this.featuresDialogFirst + this.featuresDialogRows < this.featuresDialogTotalRecords;
    }

    currentFeaturePageEnd() {
        return Math.min(this.featuresDialogFirst + this.featuresDialogData.length, this.featuresDialogTotalRecords);
    }

    currentFeaturePageStart() {
        if (this.featuresDialogTotalRecords === 0) {
            return 0;
        }
        return this.featuresDialogFirst + 1;
    }

    featureValue(feature: MapaLayerFeature, columnName: string) {
        return feature.attributes?.[columnName];
    }

    formatFeatureValue(value: any, column?: MapaLayerColumn) {
        if (value === null || value === undefined || value === '') {
            return '-';
        }
        if (column && this.isFeatureColumnDateLike(column)) {
            return this.formatFeatureDateValue(value, column);
        }
        if (typeof value === 'boolean') {
            return value ? 'Sim' : 'Não';
        }
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value);
            } catch {
                return String(value);
            }
        }
        return String(value);
    }

    private onMapSingleClick(event: EditorMapClickEvent) {
        if (!this.mapaId || !this.mapa || this.loading || this.drawingModeEnabled || this.activeGeometryEditSaving) {
            return;
        }

        if (this.mapService.hasActiveFeatureEdit()) {
            if (this.mapService.isPixelOnFeatureEdit(event.pixel)) {
                return;
            }
            this.closeActiveFeatureGeometryEdit();
            return;
        }

        const selectedLayer = this.selectedDrawLayer;
        if (!selectedLayer || selectedLayer.id <= 0 || selectedLayer.status !== 'ACTIVE' || !selectedLayer.visivel) {
            return;
        }

        this.identifyFeatureForGeometryEdit(selectedLayer.id, event);
    }

    private identifyFeatureForGeometryEdit(layerId: number, event: EditorMapClickEvent) {
        if (!this.mapaId || !this.mapa) {
            return;
        }

        const bbox = this.mapService.buildSearchBboxFromPixel(event.pixel, this.mapa.srid, 8);
        if (!bbox) {
            return;
        }

        const requestSeq = ++this.mapClickIdentifySeq;
        const bboxParam = bbox.join(',');

        this.mapaService
            .listLayerFeatures(this.mapaId, layerId, {
                first: 0,
                rows: 20,
                bbox: bboxParam
            })
            .subscribe({
                next: (response) => {
                    if (requestSeq !== this.mapClickIdentifySeq || !this.mapa) {
                        return;
                    }
                    if (this.selectedDrawLayerId !== layerId) {
                        return;
                    }
                    if (this.mapService.hasActiveFeatureEdit() || this.activeGeometryEditSaving || this.drawingModeEnabled) {
                        return;
                    }

                    const feature = this.mapService.pickFeatureForMapClick(response.data ?? [], event.coordinate, this.mapa.srid);
                    if (!feature || !feature.geometry) {
                        return;
                    }

                    this.openFeatureGeometryEdit(layerId, feature, event.pixel as number[]);
                },
                error: (error: unknown) => {
                    if (requestSeq !== this.mapClickIdentifySeq) {
                        return;
                    }
                    this.messageService.add({
                        key: this.toastKey,
                        severity: 'error',
                        summary: 'Falha ao selecionar feição',
                        detail: getBackendErrorMessage(error, 'Não foi possível identificar a feição clicada no mapa.')
                    });
                    this.refreshView();
                }
            });
    }

    private openFeatureGeometryEdit(layerId: number, feature: MapaLayerFeature, mapPixel?: number[]) {
        if (!this.mapa || !feature.geometry) {
            return;
        }

        const started = this.mapService.startFeatureEditMode({
            geometry: feature.geometry,
            srid: this.mapa.srid,
            fitToGeometry: true,
            onModifyEnd: () => {
                this.activeGeometryEditDirty = true;
                this.refreshView();
            }
        });
        if (!started) {
            this.messageService.add({
                key: this.toastKey,
                severity: 'warn',
                summary: 'Edição indisponível',
                detail: 'Não foi possível abrir a geometria para edição no mapa.'
            });
            return;
        }

        this.mapService.clearHighlight();
        this.activeGeometryEditFeatureRef = {
            layerId,
            featureId: feature.id
        };
        this.activeGeometryEditDirty = false;
        this.activeGeometryEditSaving = false;
        this.showFeatureQuickActions(layerId, feature, mapPixel);
        this.refreshView();
    }

    private closeActiveFeatureGeometryEdit(options: { persistChanges?: boolean; silent?: boolean } = {}): boolean {
        const persistChanges = options.persistChanges !== false;
        const silent = options.silent === true;
        const currentEdit = this.activeGeometryEditFeatureRef;

        if (!currentEdit) {
            if (this.mapService.hasActiveFeatureEdit()) {
                this.mapService.clearFeatureEdit();
            }
            return true;
        }
        if (!this.mapaId || !this.mapa) {
            this.resetActiveGeometryEditState();
            return true;
        }
        if (this.activeGeometryEditSaving) {
            return false;
        }

        if (!persistChanges || !this.activeGeometryEditDirty) {
            this.resetActiveGeometryEditState();
            this.refreshView();
            return true;
        }

        const geometry = this.mapService.getFeatureEditGeometry(this.mapa.srid);
        if (!geometry) {
            this.resetActiveGeometryEditState();
            this.refreshView();
            return true;
        }

        this.activeGeometryEditSaving = true;
        this.mapaService.updateLayerFeature(this.mapaId, currentEdit.layerId, currentEdit.featureId, { geometry }).subscribe({
            next: (feature) => {
                this.mapService.refreshWmsLayer(currentEdit.layerId);
                this.upsertFeatureInDialog(feature);
                this.resetActiveGeometryEditState();
                if (!silent) {
                    this.messageService.add({
                        key: this.toastKey,
                        severity: 'success',
                        summary: 'Geometria atualizada',
                        detail: `Feição #${feature.id} atualizada no mapa.`
                    });
                }
                this.refreshView();
            },
            error: (error: unknown) => {
                this.activeGeometryEditSaving = false;
                this.messageService.add({
                    key: this.toastKey,
                    severity: 'error',
                    summary: 'Falha ao salvar geometria',
                    detail: getBackendErrorMessage(error, 'Não foi possível salvar a geometria editada.')
                });
                this.refreshView();
            }
        });

        return false;
    }

    private resetActiveGeometryEditState(clearOverlay = true) {
        if (clearOverlay) {
            this.mapService.clearFeatureEdit();
        }
        this.activeGeometryEditFeatureRef = null;
        this.activeGeometryEditDirty = false;
        this.activeGeometryEditSaving = false;
        this.hideFeatureQuickActions();
    }

    focusFeature(feature: MapaLayerFeature) {
        if (!this.mapa) {
            return;
        }
        this.mapService.highlightGeometry(feature.geometry, this.mapa.srid);
    }

    openFeatureEditDialog(feature: MapaLayerFeature, event?: Event) {
        event?.stopPropagation();
        if (!this.featuresDialogLayerId) {
            return;
        }
        this.openFeatureEditDialogByLayerFeature(this.featuresDialogLayerId, this.featuresDialogLayerName, feature);
    }

    closeFeatureEditDialog(silentDiscard = false) {
        const discardCreateDrawing = this.isFeatureCreateDialogMode() && this.pendingCreateFeatureGeometry !== null;
        this.featureEditDialogVisible = false;
        this.featureEditSaving = false;
        this.featureEditLayerId = null;
        this.featureEditLayerName = '';
        this.featureEditFeatureId = null;
        this.featureEditColumns = [];
        this.featureEditValues = {};
        this.featureEditOriginalValues = {};
        this.featureEditTouchedValues = {};
        this.pendingCreateFeatureGeometry = null;
        if (discardCreateDrawing) {
            this.mapService.clearDrawPreview();
        }

        if (discardCreateDrawing && !silentDiscard) {
            this.messageService.add({
                key: this.toastKey,
                severity: 'info',
                summary: 'Desenho descartado',
                detail: 'A feição desenhada não foi salva porque o preenchimento de atributos foi cancelado.'
            });
        }
    }

    private cancelDrawingMenuActionsOnLayerSelection() {
        this.stopDrawingMode(false, false);
        if (this.featuresDialogVisible) {
            this.closeFeaturesDialog();
            return;
        }
        if (this.featureEditDialogVisible) {
            this.closeFeatureEditDialog(true);
        }
    }

    saveFeatureAttributes() {
        if (!this.mapaId || !this.featureEditLayerId) {
            return;
        }
        const layerId = this.featureEditLayerId;
        const normalizedAttributes = this.normalizeFeatureAttributes(this.featureEditValues);
        const missingRequiredFields = this.getMissingRequiredFeatureFields(this.featureEditColumns, normalizedAttributes);
        if (missingRequiredFields.length > 0) {
            this.messageService.add({
                key: this.toastKey,
                severity: 'warn',
                summary: 'Campos obrigatórios pendentes',
                detail: `Preencha os campos obrigatórios: ${missingRequiredFields.join(', ')}.`
            });
            this.refreshView();
            return;
        }

        this.featureEditSaving = true;

        if (!this.featureEditFeatureId) {
            const geometry = this.pendingCreateFeatureGeometry;
            if (!geometry) {
                this.featureEditSaving = false;
                this.closeFeatureEditDialog(true);
                this.messageService.add({
                    key: this.toastKey,
                    severity: 'error',
                    summary: 'Falha ao criar feição',
                    detail: 'A geometria desenhada não está disponível para envio.'
                });
                this.refreshView();
                return;
            }

            this.mapaService
                .createLayerFeature(this.mapaId, layerId, {
                    geometry,
                    attributes: normalizedAttributes
                })
                .subscribe({
                    next: (feature) => {
                        this.featureEditSaving = false;
                        this.closeFeatureEditDialog(true);
                        this.messageService.add({
                            key: this.toastKey,
                            severity: 'success',
                            summary: 'Feição criada',
                            detail: `Feição #${feature.id} criada com sucesso.`
                        });
                        this.mapService.refreshWmsLayer(layerId);
                        if (this.mapa) {
                            this.mapService.highlightGeometry(feature.geometry, this.mapa.srid);
                        }
                        if (this.featuresDialogVisible && this.featuresDialogLayerId === layerId) {
                            this.loadFeaturesDialogData();
                        }
                        this.refreshView();
                    },
                    error: (error: unknown) => {
                        this.featureEditSaving = false;
                        this.messageService.add({
                            key: this.toastKey,
                            severity: 'error',
                            summary: 'Falha ao criar feição',
                            detail: getBackendErrorMessage(error, 'Não foi possível salvar a feição desenhada.')
                        });
                        this.refreshView();
                    }
                });
            return;
        }

        const payload: MapaLayerFeatureUpdatePayload = {
            attributes: normalizedAttributes
        };
        this.mapaService.updateLayerFeature(this.mapaId, layerId, this.featureEditFeatureId, payload).subscribe({
            next: (feature) => {
                this.featureEditSaving = false;
                this.closeFeatureEditDialog(true);
                this.messageService.add({
                    key: this.toastKey,
                    severity: 'success',
                    summary: 'Feição atualizada',
                    detail: 'Atributos da feição salvos com sucesso.'
                });
                this.upsertFeatureInDialog(feature);
                if (this.mapa) {
                    this.mapService.highlightGeometry(feature.geometry, this.mapa.srid);
                }
                this.mapService.refreshWmsLayer(layerId);
                this.refreshView();
            },
            error: (error: unknown) => {
                this.featureEditSaving = false;
                this.messageService.add({
                    key: this.toastKey,
                    severity: 'error',
                    summary: 'Falha ao salvar feição',
                    detail: getBackendErrorMessage(error, 'Não foi possível atualizar os atributos da feição.')
                });
                this.refreshView();
            }
        });
    }

    confirmRemoveFeature(feature: MapaLayerFeature, event?: Event) {
        event?.stopPropagation();
        if (!this.mapaId || !this.featuresDialogLayerId) {
            return;
        }
        this.confirmFeatureDeletion(this.featuresDialogLayerId, feature.id);
    }

    isLayerVisibilityPending(layerId: number) {
        return this.layersState.isVisibilityPending(layerId);
    }

    isLayerDeletePending(layerId: number) {
        return this.layersState.isDeletePending(layerId);
    }

    shouldShowSizeField(formName: 'new' | 'edit') {
        const form = formName === 'new' ? this.newLayerColumnForm : this.layerColumnForm;
        return form.controls.type.value === 'string';
    }

    onPanelDragEnd(panelId: FloatingPanelId, event: CdkDragEnd) {
        const frame = this.getFrameSize(this.mapFrame?.nativeElement);
        const panel = this.getPanelElement(panelId);
        const panelSize = this.getElementSize(panel);
        if (!frame || !panelSize) {
            return;
        }

        const free = event.source.getFreeDragPosition();
        const clamped = this.layoutState.updateDraggedPosition(panelId, free, frame, panelSize);
        event.source.setFreeDragPosition(clamped);
        this.syncFloatingPanelsPosition();
    }

    onActiveLayerPanelDragEnd(event: CdkDragEnd) {
        const frame = this.getFrameSize(this.mapFrame?.nativeElement);
        const panelSize = this.getElementSize(this.activeLayerPanel?.nativeElement);
        if (!frame || !panelSize) {
            return;
        }

        const free = event.source.getFreeDragPosition();
        const clamped = this.clampFreePosition(free, frame, panelSize, 8);
        this.activeLayerPanelPosition = clamped;
        this.activeLayerPanelManuallyMoved = true;
        event.source.setFreeDragPosition(clamped);
    }

    onFeatureQuickActionsDragEnd(event: CdkDragEnd) {
        const frame = this.getFrameSize(this.mapFrame?.nativeElement);
        const panelSize = this.getElementSize(this.featureActionsPanel?.nativeElement);
        if (!frame || !panelSize) {
            return;
        }

        const free = event.source.getFreeDragPosition();
        const clamped = this.clampFreePosition(free, frame, panelSize, 8);
        this.featureQuickActionsPosition = clamped;
        event.source.setFreeDragPosition(clamped);
    }

    onFeaturesDrawerDragEnd(event: CdkDragEnd) {
        const frame = this.getFrameSize(this.mapFrame?.nativeElement);
        const panelSize = this.getElementSize(this.featuresDrawerPanel?.nativeElement);
        if (!frame || !panelSize) {
            return;
        }

        const free = event.source.getFreeDragPosition();
        const clamped = this.clampFreePosition(free, frame, panelSize, 8);
        this.featuresDrawerPosition = clamped;
        event.source.setFreeDragPosition(clamped);
    }

    private loadMapa() {
        if (!this.mapaId) {
            return;
        }

        this.loading = true;
        this.mapaService.get(this.mapaId).subscribe({
            next: (mapa) => {
                this.loading = false;
                this.mapa = mapa;
                this.tryAutoFitMapToFeatures();
                this.refreshView();
            },
            error: (error: unknown) => {
                this.loading = false;
                this.messageService.add({
                    key: this.toastKey,
                    severity: 'error',
                    summary: 'Falha ao carregar mapa',
                    detail: getBackendErrorMessage(error, 'Não foi possível carregar o cabeçalho do mapa.')
                });
                this.goBack();
                this.refreshView();
            }
        });
    }

    private loadLayers() {
        if (!this.mapaId) {
            return;
        }

        this.layersState.loading = true;
        this.mapaService.listLayers(this.mapaId).subscribe({
            next: (layers) => {
                this.layersState.loading = false;
                this.layersState.setLayers(layers);
                this.syncMapLayerRendering();
                this.tryAutoFitMapToFeatures();
                this.refreshView();
            },
            error: (error: unknown) => {
                this.layersState.loading = false;
                this.messageService.add({
                    key: this.toastKey,
                    severity: 'error',
                    summary: 'Falha ao carregar layers',
                    detail: getBackendErrorMessage(error, 'Não foi possível carregar os layers do mapa.')
                });
                this.refreshView();
            }
        });
    }

    private initializeMapIfNeeded() {
        if (!this.mapContainer?.nativeElement) {
            return;
        }

        this.mapService.initialize(this.mapContainer.nativeElement, this.ngZone);
    }

    private setupPanelsLayoutSync() {
        if (typeof ResizeObserver !== 'undefined') {
            this.frameResizeObserver = new ResizeObserver(() => this.syncFloatingPanelsPosition());
            if (this.mapFrame?.nativeElement) {
                this.frameResizeObserver.observe(this.mapFrame.nativeElement);
            }
            if (this.layersPanel?.nativeElement) {
                this.frameResizeObserver.observe(this.layersPanel.nativeElement);
            }
        }

        requestAnimationFrame(() => this.syncFloatingPanelsPosition());
        setTimeout(() => this.syncFloatingPanelsPosition(), 0);
    }

    private syncFloatingPanelsPosition() {
        const frame = this.getFrameSize(this.mapFrame?.nativeElement);
        if (!frame || frame.width <= 0 || frame.height <= 0) {
            return;
        }

        const zoomPanel = this.zoomPanel?.nativeElement;
        const zoomSize = this.getElementSize(zoomPanel);
        if (!zoomSize) {
            return;
        }

        const layersPanel = this.layersPanel?.nativeElement;
        if (this.layoutState.layersPanelVisible && layersPanel && layersPanel.offsetWidth > 0) {
            this.layoutState.initializeLayersPanelPosition(frame, layersPanel.offsetWidth || 320);
        }

        const layersSize = this.layoutState.layersPanelVisible ? this.getElementSize(layersPanel) : null;
        this.layoutState.clampPanels(frame, zoomSize, layersSize ?? undefined);

        if (this.selectedDrawLayerId != null) {
            const activeLayerPanelSize = this.getElementSize(this.activeLayerPanel?.nativeElement);
            if (activeLayerPanelSize) {
                if (!this.activeLayerPanelManuallyMoved) {
                    this.activeLayerPanelPosition = {
                        x: this.layoutState.zoomPosition.x + zoomSize.width + 10,
                        y: this.layoutState.zoomPosition.y
                    };
                }
                this.activeLayerPanelPosition = this.clampFreePosition(this.activeLayerPanelPosition, frame, activeLayerPanelSize, 8);
            }
        }

        this.applyDragPositions();
        if (this.featureQuickActionsVisible) {
            this.ensureFeatureQuickActionsInBounds();
        }
        if (this.featuresDialogVisible) {
            this.ensureFeaturesDrawerInBounds();
        }
    }

    private applyDragPositions() {
        this.zoomDrag?.setFreeDragPosition(this.layoutState.zoomPosition);
        if (this.selectedDrawLayerId != null) {
            this.activeLayerDrag?.setFreeDragPosition(this.activeLayerPanelPosition);
        }
        if (this.layoutState.layersPanelVisible) {
            this.layersDrag?.setFreeDragPosition(this.layoutState.layersPosition);
        }
        if (this.featureQuickActionsVisible) {
            this.featureActionsDrag?.setFreeDragPosition(this.featureQuickActionsPosition);
        }
        if (this.featuresDialogVisible) {
            this.featuresDrawerDrag?.setFreeDragPosition(this.featuresDrawerPosition);
        }
    }

    private getPanelElement(panelId: FloatingPanelId): HTMLDivElement | null {
        if (panelId === 'zoom-panel') {
            return this.zoomPanel?.nativeElement ?? null;
        }
        return this.layersPanel?.nativeElement ?? null;
    }

    private getFrameSize(frame?: HTMLDivElement): PanelSize | null {
        if (!frame) {
            return null;
        }

        return {
            width: frame.clientWidth,
            height: frame.clientHeight
        };
    }

    private getElementSize(element?: HTMLDivElement | null): PanelSize | null {
        if (!element) {
            return null;
        }

        return {
            width: element.offsetWidth,
            height: element.offsetHeight
        };
    }

    private toggleLayersPanelVisibility() {
        const panel = this.layersPanel?.nativeElement;
        if (panel && this.frameResizeObserver && this.layoutState.layersPanelVisible) {
            this.frameResizeObserver.unobserve(panel);
        }

        this.layoutState.toggleLayersPanelVisibility();
        this.refreshQuickActionItems();

        if (this.layoutState.layersPanelVisible) {
            requestAnimationFrame(() => {
                if (this.layersPanel?.nativeElement && this.frameResizeObserver) {
                    this.frameResizeObserver.observe(this.layersPanel.nativeElement);
                }
                this.syncFloatingPanelsPosition();
            });
            return;
        }

        requestAnimationFrame(() => this.syncFloatingPanelsPosition());
    }

    private syncMapFullscreenState() {
        const shell = this.editorShell?.nativeElement;
        if (!shell || typeof document === 'undefined') {
            this.mapFullscreenActive = false;
            return;
        }
        this.mapFullscreenActive = document.fullscreenElement === shell;
    }

    private async toggleMapFullscreen() {
        const shell = this.editorShell?.nativeElement;
        if (!shell || typeof document === 'undefined') {
            return;
        }

        try {
            const isFullscreen = document.fullscreenElement === shell;
            if (isFullscreen) {
                await document.exitFullscreen();
            } else {
                await shell.requestFullscreen();
            }
        } catch (error: unknown) {
            this.messageService.add({
                key: this.toastKey,
                severity: 'warn',
                summary: 'Tela cheia indisponível',
                detail: getBackendErrorMessage(error, 'Não foi possível alternar para tela cheia neste navegador.')
            });
        }
    }

    private refreshQuickActionItems() {
        this.quickActionItems = [
            {
                label: this.mapFullscreenActive ? 'Sair de tela cheia' : 'Entrar em tela cheia',
                icon: this.mapFullscreenActive ? 'pi pi-window-minimize' : 'pi pi-window-maximize',
                command: () => {
                    this.ngZone.run(() => void this.toggleMapFullscreen());
                }
            },
            {
                label: this.layoutState.layersPanelVisible ? 'Ocultar layers' : 'Exibir layers',
                icon: this.layoutState.layersPanelVisible ? 'pi pi-eye-slash' : 'pi pi-eye',
                command: () => {
                    this.ngZone.run(() => this.toggleLayersPanelVisibility());
                }
            }
        ];
    }

    private removeLayer(layerId: number, layerName: string) {
        if (!this.mapaId) {
            return;
        }

        this.layersState.setDeletePending(layerId, true);
        this.mapaService.removeLayer(this.mapaId, layerId).subscribe({
            next: () => {
                this.layersState.setDeletePending(layerId, false);
                this.layersState.removeLayer(layerId);
                if (this.activeGeometryEditFeatureRef?.layerId === layerId) {
                    this.resetActiveGeometryEditState();
                }
                if (this.featuresDialogVisible && this.featuresDialogLayerId === layerId) {
                    this.closeFeaturesDialog();
                }
                if (this.selectedDrawLayerId === layerId) {
                    this.selectedDrawLayerId = null;
                    this.activeLayerPanelManuallyMoved = false;
                    this.stopDrawingMode(false);
                }
                this.syncMapLayerRendering();
                this.messageService.add({
                    key: this.toastKey,
                    severity: 'success',
                    summary: 'Layer removido',
                    detail: `Layer "${layerName}" removido com sucesso.`
                });
                this.refreshView();
            },
            error: (error: unknown) => {
                this.layersState.setDeletePending(layerId, false);
                this.syncMapLayerRendering();
                this.messageService.add({
                    key: this.toastKey,
                    severity: 'error',
                    summary: 'Falha ao remover layer',
                    detail: getBackendErrorMessage(error, 'Não foi possível remover o layer.')
                });
                this.refreshView();
            }
        });
    }

    private removeLayerColumn(columnName: string) {
        if (!this.mapaId || !this.layerColumnsTargetId) {
            return;
        }

        this.layerColumnsSaving = true;
        this.mapaService.removeLayerColumn(this.mapaId, this.layerColumnsTargetId, columnName, true).subscribe({
            next: (columns) => {
                this.layerColumnsSaving = false;
                this.layerColumnsData = columns;
                this.messageService.add({
                    key: this.toastKey,
                    severity: 'success',
                    summary: 'Coluna removida',
                    detail: `A coluna "${columnName}" foi removida do layer.`
                });
                this.refreshView();
            },
            error: (error: unknown) => {
                this.layerColumnsSaving = false;
                this.messageService.add({
                    key: this.toastKey,
                    severity: 'error',
                    summary: 'Falha ao remover coluna',
                    detail: getBackendErrorMessage(error, 'Não foi possível remover a coluna do layer.')
                });
                this.refreshView();
            }
        });
    }

    private loadLayerColumns() {
        if (!this.mapaId || !this.layerColumnsTargetId) {
            return;
        }

        this.layerColumnsLoading = true;
        this.mapaService.listLayerColumns(this.mapaId, this.layerColumnsTargetId).subscribe({
            next: (columns) => {
                this.layerColumnsLoading = false;
                this.layerColumnsData = columns;
                this.refreshView();
            },
            error: (error: unknown) => {
                this.layerColumnsLoading = false;
                this.messageService.add({
                    key: this.toastKey,
                    severity: 'error',
                    summary: 'Falha ao carregar colunas',
                    detail: getBackendErrorMessage(error, 'Não foi possível carregar as colunas do layer.')
                });
                this.refreshView();
            }
        });
    }

    private createFeatureFromDraw(layerId: number, geometry: Record<string, any>) {
        if (!this.mapaId || !this.mapa) {
            this.mapService.clearDrawPreview();
            return;
        }
        if (this.featureEditDialogVisible || this.featureEditSaving) {
            this.mapService.clearDrawPreview();
            this.messageService.add({
                key: this.toastKey,
                severity: 'warn',
                summary: 'Preenchimento pendente',
                detail: 'Conclua o preenchimento dos atributos da feição atual antes de desenhar uma nova.'
            });
            this.refreshView();
            return;
        }

        this.mapService.showDrawPreviewGeometry(geometry, this.mapa.srid);
        const layerName = this.layersState.findLayer(layerId)?.nome ?? `#${layerId}`;
        this.mapaService.listLayerColumns(this.mapaId, layerId).subscribe({
            next: (columns) => {
                this.pendingCreateFeatureGeometry = geometry;
                this.featureEditLayerId = layerId;
                this.featureEditLayerName = layerName;
                this.featureEditFeatureId = null;
                this.featureEditColumns = [...columns];
                this.featureEditValues = {};
                this.featureEditOriginalValues = {};
                this.featureEditTouchedValues = {};
                for (const column of this.featureEditColumns) {
                    this.featureEditValues[column.name] = null;
                    this.featureEditOriginalValues[column.name] = null;
                    this.featureEditTouchedValues[column.name] = false;
                }
                this.featureEditDialogVisible = true;
                this.refreshView();
            },
            error: (error: unknown) => {
                this.mapService.clearDrawPreview();
                this.messageService.add({
                    key: this.toastKey,
                    severity: 'error',
                    summary: 'Falha ao preparar feição',
                    detail: getBackendErrorMessage(error, 'Não foi possível carregar os atributos do layer. O desenho foi descartado.')
                });
                this.refreshView();
            }
        });
    }

    private removeFeatureByLayerId(layerId: number, featureId: number) {
        if (!this.mapaId || layerId <= 0 || this.featureDeletePending) {
            return;
        }

        this.featureDeletePending = true;
        const isActiveMapEditTarget = this.activeGeometryEditFeatureRef?.layerId === layerId && this.activeGeometryEditFeatureRef.featureId === featureId;

        this.mapaService.removeLayerFeature(this.mapaId, layerId, featureId).subscribe({
            next: () => {
                this.featureDeletePending = false;
                if (isActiveMapEditTarget) {
                    this.resetActiveGeometryEditState();
                }
                if (this.featureEditDialogVisible && this.featureEditLayerId === layerId && this.featureEditFeatureId === featureId) {
                    this.closeFeatureEditDialog();
                }
                this.messageService.add({
                    key: this.toastKey,
                    severity: 'success',
                    summary: 'Feição removida',
                    detail: `Feição #${featureId} removida com sucesso. Geometria e atributos relacionados foram excluídos.`
                });
                this.removeFeatureFromDialogState(layerId, featureId);
                this.mapService.refreshWmsLayer(layerId);
                this.mapService.clearHighlight();
                this.refreshView();
            },
            error: (error: unknown) => {
                this.featureDeletePending = false;
                this.messageService.add({
                    key: this.toastKey,
                    severity: 'error',
                    summary: 'Falha ao remover feição',
                    detail: getBackendErrorMessage(error, 'Não foi possível remover a feição.')
                });
                this.refreshView();
            }
        });
    }

    private confirmFeatureDeletion(layerId: number, featureId: number) {
        if (!this.mapaId || layerId <= 0 || this.featureDeletePending || this.featureDeleteConfirmOpen) {
            return;
        }

        this.featureDeleteConfirmOpen = true;
        this.openEditorConfirmDialog({
            header: 'Remover feição',
            message: `Deseja remover a feição #${featureId}? A geometria e os atributos relacionados serão excluídos.`,
            acceptLabel: 'Remover feição',
            acceptSeverity: 'danger',
            onAccept: () => {
                this.featureDeleteConfirmOpen = false;
                this.removeFeatureByLayerId(layerId, featureId);
            },
            onReject: () => {
                this.featureDeleteConfirmOpen = false;
            }
        });
    }

    onEditorConfirmDialogAccept() {
        if (!this.editorConfirmDialogVisible) {
            return;
        }
        this.editorConfirmDialogResolution = 'accept';
        this.editorConfirmDialogVisible = false;
    }

    onEditorConfirmDialogReject() {
        if (!this.editorConfirmDialogVisible) {
            return;
        }
        this.editorConfirmDialogResolution = 'reject';
        this.editorConfirmDialogVisible = false;
    }

    onEditorConfirmDialogHide() {
        const resolution = this.editorConfirmDialogResolution;
        const onAccept = this.editorConfirmDialogAcceptAction;
        const onReject = this.editorConfirmDialogRejectAction;
        this.resetEditorConfirmDialogState();

        if (resolution === 'accept') {
            onAccept?.();
            return;
        }
        onReject?.();
    }

    private openEditorConfirmDialog(options: { header: string; message: string; acceptLabel?: string; acceptSeverity?: EditorConfirmAcceptSeverity; onAccept: () => void; onReject?: () => void }) {
        if (this.editorConfirmDialogVisible) {
            return;
        }

        this.editorConfirmDialogHeader = options.header;
        this.editorConfirmDialogMessage = options.message;
        this.editorConfirmDialogAcceptLabel = options.acceptLabel || 'Confirmar';
        this.editorConfirmDialogAcceptSeverity = options.acceptSeverity || 'danger';
        this.editorConfirmDialogAcceptAction = options.onAccept;
        this.editorConfirmDialogRejectAction = options.onReject || null;
        this.editorConfirmDialogResolution = 'none';
        this.editorConfirmDialogVisible = true;
    }

    private resetEditorConfirmDialogState() {
        this.editorConfirmDialogVisible = false;
        this.editorConfirmDialogHeader = '';
        this.editorConfirmDialogMessage = '';
        this.editorConfirmDialogAcceptLabel = 'Confirmar';
        this.editorConfirmDialogAcceptSeverity = 'danger';
        this.editorConfirmDialogAcceptAction = null;
        this.editorConfirmDialogRejectAction = null;
        this.editorConfirmDialogResolution = 'none';
    }

    private removeFeatureFromDialogState(layerId: number, featureId: number) {
        if (!this.featuresDialogVisible || this.featuresDialogLayerId !== layerId) {
            return;
        }

        const hasFeatureOnPage = this.featuresDialogData.some((feature) => feature.id === featureId);
        if (hasFeatureOnPage) {
            this.featuresDialogData = this.featuresDialogData.filter((feature) => feature.id !== featureId);
        }
        this.featuresDialogTotalRecords = Math.max(0, this.featuresDialogTotalRecords - 1);

        if (this.featuresDialogData.length === 0 && this.featuresDialogFirst > 0) {
            this.featuresDialogFirst = Math.max(0, this.featuresDialogFirst - this.featuresDialogRows);
            this.loadFeaturesDialogData();
        }
    }

    private canHandleFeatureDeleteShortcut(event: KeyboardEvent) {
        if (!this.mapaId || this.loading || this.drawingModeEnabled || this.activeGeometryEditSaving || this.featureDeletePending || this.featureDeleteConfirmOpen) {
            return false;
        }
        if (!this.activeGeometryEditFeatureRef) {
            return false;
        }
        if (event.repeat) {
            return false;
        }
        return !this.isTypingInEditableElement(event);
    }

    private isTypingInEditableElement(event: KeyboardEvent) {
        if (typeof document === 'undefined') {
            return false;
        }

        const targets: Array<EventTarget | null> = [event.target, document.activeElement];
        for (const target of targets) {
            if (!(target instanceof Element)) {
                continue;
            }
            if (target.closest('input, textarea, select, [contenteditable], [role=\"textbox\"]')) {
                return true;
            }
        }
        return false;
    }

    private isFeatureCreateDialogMode() {
        return this.featureEditFeatureId == null && this.pendingCreateFeatureGeometry !== null;
    }

    private normalizeFeatureAttributes(values: Record<string, any>) {
        const normalized: Record<string, any> = {};
        for (const column of this.featureEditColumns) {
            const columnName = column.name;
            let value = values[columnName];
            if (this.isFeatureColumnBoolean(column) && this.featureEditTouchedValues[columnName] !== true) {
                value = this.featureEditOriginalValues[columnName] ?? null;
            }
            if (typeof value === 'string') {
                const trimmed = value.trim();
                normalized[columnName] = trimmed === '' ? null : trimmed;
                continue;
            }
            normalized[columnName] = value === '' ? null : value;
        }
        return normalized;
    }

    private getMissingRequiredFeatureFields(columns: MapaLayerColumn[], attributes: Record<string, any>) {
        return columns
            .filter((column) => column.nullable === false)
            .filter((column) => {
                const value = attributes[column.name];
                if (value === null || value === undefined) {
                    return true;
                }
                if (typeof value === 'string') {
                    return value.trim() === '';
                }
                return false;
            })
            .map((column) => column.name);
    }

    private getFeatureColumnType(column: MapaLayerColumn) {
        return String(column.type ?? '')
            .trim()
            .toLowerCase();
    }

    private isFeatureColumnDateLike(column: MapaLayerColumn) {
        const type = this.getFeatureColumnType(column);
        return type === 'date' || type === 'timestamp' || type === 'timestamptz';
    }

    private formatFeatureDateValue(value: any, column: MapaLayerColumn) {
        const locale = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'pt-BR';
        const type = this.getFeatureColumnType(column);
        const parsedDate = this.parseFeatureDateValue(value, type);
        if (!parsedDate) {
            return String(value);
        }

        if (type === 'date') {
            return new Intl.DateTimeFormat(locale).format(parsedDate);
        }

        return new Intl.DateTimeFormat(locale, {
            dateStyle: 'short',
            timeStyle: 'short'
        }).format(parsedDate);
    }

    private parseFeatureDateValue(value: any, columnType: string) {
        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : value;
        }
        if (typeof value !== 'string') {
            return null;
        }

        const raw = value.trim();
        if (!raw) {
            return null;
        }

        if (columnType === 'date') {
            const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (!match) {
                return null;
            }
            const year = Number(match[1]);
            const month = Number(match[2]);
            const day = Number(match[3]);
            const date = new Date(year, month - 1, day);
            return Number.isNaN(date.getTime()) ? null : date;
        }

        const datetime = new Date(raw);
        return Number.isNaN(datetime.getTime()) ? null : datetime;
    }

    private openFeatureEditDialogByLayerFeature(layerId: number, layerName: string, feature: MapaLayerFeature) {
        if (!this.mapaId || layerId <= 0) {
            return;
        }

        this.mapaService.listLayerColumns(this.mapaId, layerId).subscribe({
            next: (columns) => {
                this.pendingCreateFeatureGeometry = null;
                this.featureEditLayerId = layerId;
                this.featureEditLayerName = layerName || this.layersState.findLayer(layerId)?.nome || `#${layerId}`;
                this.featureEditFeatureId = feature.id;
                this.featureEditColumns = [...columns];
                this.featureEditValues = {};
                this.featureEditOriginalValues = {};
                this.featureEditTouchedValues = {};

                for (const column of this.featureEditColumns) {
                    const value = feature.attributes?.[column.name] ?? null;
                    this.featureEditValues[column.name] = value;
                    this.featureEditOriginalValues[column.name] = value;
                    this.featureEditTouchedValues[column.name] = false;
                }

                this.featureEditDialogVisible = true;
                this.refreshView();
            },
            error: (error: unknown) => {
                this.messageService.add({
                    key: this.toastKey,
                    severity: 'error',
                    summary: 'Falha ao abrir atributos',
                    detail: getBackendErrorMessage(error, 'Não foi possível carregar os metadados do layer para editar a feição.')
                });
                this.refreshView();
            }
        });
    }

    private showFeatureQuickActions(layerId: number, feature: MapaLayerFeature, mapPixel?: number[] | null) {
        this.featureQuickActionsLayerId = layerId;
        this.featureQuickActionsFeatureId = feature.id;
        this.featureQuickActionsLayerName = this.layersState.findLayer(layerId)?.nome ?? `#${layerId}`;
        this.featureQuickActionsFeatureData = feature;
        this.featureQuickActionsCollapsed = true;
        this.updateFeatureQuickActionsPosition(mapPixel ?? null);
        this.featureQuickActionsVisible = true;
        this.refreshView();
        requestAnimationFrame(() => this.ensureFeatureQuickActionsInBounds());
    }

    private hideFeatureQuickActions() {
        this.featureQuickActionsVisible = false;
        this.featureQuickActionsCollapsed = true;
        this.featureQuickActionsLayerId = null;
        this.featureQuickActionsFeatureId = null;
        this.featureQuickActionsLayerName = '';
        this.featureQuickActionsFeatureData = null;
    }

    private updateFeatureQuickActionsPosition(mapPixel: number[] | null) {
        const frame = this.mapFrame?.nativeElement;
        if (!frame) {
            this.featureQuickActionsPosition = { x: 16, y: 16 };
            return;
        }

        const anchoredToLayers = this.buildFeatureQuickActionsPositionFromLayersPanel(frame);
        if (anchoredToLayers) {
            this.featureQuickActionsPosition = anchoredToLayers;
            return;
        }

        if (!mapPixel || mapPixel.length < 2) {
            this.featureQuickActionsPosition = { x: 16, y: 16 };
            return;
        }

        const panelWidth = 230;
        const panelHeight = 52;
        const padding = 8;
        const offsetX = 14;
        const offsetY = 10;

        const rawX = Number(mapPixel[0]) + offsetX;
        const rawY = Number(mapPixel[1]) - panelHeight - offsetY;

        const maxX = Math.max(padding, frame.clientWidth - panelWidth - padding);
        const maxY = Math.max(padding, frame.clientHeight - panelHeight - padding);

        this.featureQuickActionsPosition = {
            x: Math.min(maxX, Math.max(padding, rawX)),
            y: Math.min(maxY, Math.max(padding, rawY))
        };
    }

    private buildFeatureQuickActionsPositionFromLayersPanel(frame: HTMLDivElement): { x: number; y: number } | null {
        if (!this.layoutState.layersPanelVisible) {
            return null;
        }

        const layersPanel = this.layersPanel?.nativeElement;
        if (!layersPanel || layersPanel.offsetWidth <= 0 || layersPanel.offsetHeight <= 0) {
            return null;
        }

        const layersPosition = this.layersDrag ? this.layersDrag.getFreeDragPosition() : this.layoutState.layersPosition;
        const panelWidth = 230;
        const panelHeight = 52;
        const padding = 8;
        const verticalSpacing = 10;

        const rawX = Number(layersPosition?.x ?? this.layoutState.layersPosition.x);
        const rawY = Number(layersPosition?.y ?? this.layoutState.layersPosition.y) + layersPanel.offsetHeight + verticalSpacing;
        const maxX = Math.max(padding, frame.clientWidth - panelWidth - padding);
        const maxY = Math.max(padding, frame.clientHeight - panelHeight - padding);

        return {
            x: Math.min(maxX, Math.max(padding, rawX)),
            y: Math.min(maxY, Math.max(padding, rawY))
        };
    }

    private ensureFeatureQuickActionsInBounds() {
        if (!this.featureQuickActionsVisible) {
            return;
        }

        const frame = this.getFrameSize(this.mapFrame?.nativeElement);
        const panelSize = this.getElementSize(this.featureActionsPanel?.nativeElement);
        if (!frame || !panelSize) {
            return;
        }

        const clamped = this.clampFreePosition(this.featureQuickActionsPosition, frame, panelSize, 8);
        this.featureQuickActionsPosition = clamped;
        this.featureActionsDrag?.setFreeDragPosition(clamped);
    }

    private resetFeaturesDrawerPosition() {
        if (!this.featuresDialogVisible) {
            return;
        }

        const frame = this.getFrameSize(this.mapFrame?.nativeElement);
        const panelSize = this.getElementSize(this.featuresDrawerPanel?.nativeElement);
        if (!frame || !panelSize) {
            return;
        }

        const target = this.clampFreePosition(
            {
                x: frame.width - panelSize.width - 8,
                y: 8
            },
            frame,
            panelSize,
            8
        );
        this.featuresDrawerPosition = target;
        this.featuresDrawerDrag?.setFreeDragPosition(target);
    }

    private ensureFeaturesDrawerInBounds() {
        if (!this.featuresDialogVisible) {
            return;
        }

        const frame = this.getFrameSize(this.mapFrame?.nativeElement);
        const panelSize = this.getElementSize(this.featuresDrawerPanel?.nativeElement);
        if (!frame || !panelSize) {
            return;
        }

        const clamped = this.clampFreePosition(this.featuresDrawerPosition, frame, panelSize, 8);
        this.featuresDrawerPosition = clamped;
        this.featuresDrawerDrag?.setFreeDragPosition(clamped);
    }

    private clampFreePosition(position: { x: number; y: number }, frame: PanelSize, panel: PanelSize, padding = 0) {
        const maxX = Math.max(padding, frame.width - panel.width - padding);
        const maxY = Math.max(padding, frame.height - panel.height - padding);
        return {
            x: Math.min(maxX, Math.max(padding, Number(position.x ?? 0))),
            y: Math.min(maxY, Math.max(padding, Number(position.y ?? 0)))
        };
    }

    private loadFeaturesDialogColumnsAndData() {
        if (!this.mapaId || !this.featuresDialogLayerId) {
            return;
        }

        this.featuresDialogLoading = true;
        this.mapaService.listLayerColumns(this.mapaId, this.featuresDialogLayerId).subscribe({
            next: (columns) => {
                this.featuresDialogColumns = columns;
                this.loadFeaturesDialogData();
            },
            error: (error: unknown) => {
                this.featuresDialogLoading = false;
                this.messageService.add({
                    key: this.toastKey,
                    severity: 'error',
                    summary: 'Falha ao carregar colunas',
                    detail: getBackendErrorMessage(error, 'Não foi possível carregar as colunas de metadados do layer.')
                });
                this.refreshView();
            }
        });
    }

    private loadFeaturesDialogData() {
        if (!this.mapaId || !this.featuresDialogLayerId) {
            return;
        }

        this.featuresDialogLoading = true;
        this.mapaService
            .listLayerFeatures(this.mapaId, this.featuresDialogLayerId, {
                first: this.featuresDialogFirst,
                rows: this.featuresDialogPageSize
            })
            .subscribe({
                next: (response) => {
                    this.featuresDialogLoading = false;
                    this.featuresDialogData = response.data ?? [];
                    this.featuresDialogTotalRecords = Number(response.totalRecords ?? 0);
                    this.featuresDialogFirst = Number(response.first ?? this.featuresDialogFirst);
                    this.featuresDialogRows = this.featuresDialogPageSize;
                    this.refreshView();
                },
                error: (error: unknown) => {
                    this.featuresDialogLoading = false;
                    this.messageService.add({
                        key: this.toastKey,
                        severity: 'error',
                        summary: 'Falha ao carregar feições',
                        detail: getBackendErrorMessage(error, 'Não foi possível carregar os dados do layer.')
                    });
                    this.refreshView();
                }
            });
    }

    private upsertFeatureInDialog(feature: MapaLayerFeature) {
        if (!this.featuresDialogVisible) {
            return;
        }
        const index = this.featuresDialogData.findIndex((item) => item.id === feature.id);
        if (index < 0) {
            this.featuresDialogData = [feature, ...this.featuresDialogData];
            this.featuresDialogTotalRecords += 1;
            return;
        }
        const updated = [...this.featuresDialogData];
        updated[index] = feature;
        this.featuresDialogData = updated;
    }

    private syncMapLayerRendering() {
        if (!this.mapaId) {
            return;
        }
        this.mapService.syncWmsLayers(this.mapaId, this.layersState.layers);
        this.reconcileDrawLayerSelection();
    }

    private tryAutoFitMapToFeatures() {
        if (this.initialFeatureAutoFitDone || this.initialFeatureAutoFitStarted) {
            return;
        }
        if (!this.mapaId || !this.mapa || !this.mapContainer?.nativeElement) {
            return;
        }
        if (this.layersState.loading) {
            return;
        }

        const targetLayers = this.layersState.layers.filter((layer) => layer.id > 0 && layer.status === 'ACTIVE' && layer.visivel);
        this.initialFeatureAutoFitStarted = true;

        if (targetLayers.length === 0) {
            this.initialFeatureAutoFitDone = true;
            return;
        }

        const requests = targetLayers.map((layer) =>
            this.mapaService.listLayerFeatures(this.mapaId!, layer.id, { first: 0, rows: 200 }).pipe(
                catchError(() =>
                    of({
                        data: [],
                        totalRecords: 0,
                        first: 0,
                        rows: 200,
                        hasNext: false,
                        hasPrevious: false
                    })
                )
            )
        );

        forkJoin(requests).subscribe({
            next: (responses) => {
                if (!this.mapa) {
                    this.initialFeatureAutoFitDone = true;
                    return;
                }

                const geometries = responses.flatMap((response) => (response.data ?? []).map((feature) => feature.geometry));
                this.mapService.fitGeometries(geometries, this.mapa.srid);
                this.initialFeatureAutoFitDone = true;
            },
            error: () => {
                this.initialFeatureAutoFitDone = true;
            }
        });
    }

    private reconcileDrawLayerSelection() {
        if (this.selectedDrawLayerId == null) {
            if (this.activeGeometryEditFeatureRef) {
                this.closeActiveFeatureGeometryEdit({ silent: true });
            }
            return;
        }
        const selectedLayer = this.layersState.findLayer(this.selectedDrawLayerId);
        if (!selectedLayer || selectedLayer.id <= 0 || selectedLayer.status !== 'ACTIVE') {
            if (this.activeGeometryEditFeatureRef?.layerId === this.selectedDrawLayerId) {
                this.closeActiveFeatureGeometryEdit({ silent: true });
            }
            this.selectedDrawLayerId = null;
            this.activeLayerPanelManuallyMoved = false;
            this.stopDrawingMode(false);
            return;
        }
        if (this.activeGeometryEditFeatureRef?.layerId === selectedLayer.id && !selectedLayer.visivel) {
            this.closeActiveFeatureGeometryEdit({ silent: true });
        }
        if (!this.mapService.canDraw(selectedLayer.geom_type) && this.drawingModeEnabled) {
            this.stopDrawingMode(false);
        }
    }

    private refreshView() {
        if (this.isDestroyed) {
            return;
        }
        queueMicrotask(() => {
            if (this.isDestroyed) {
                return;
            }
            this.cdRef.detectChanges();
        });
    }

    private buildColumnFromForm(form: LayerColumnFormLike): MapaLayerColumn | null {
        if (form.invalid) {
            form.markAllAsTouched();
            this.messageService.add({
                key: this.toastKey,
                severity: 'warn',
                summary: 'Campos obrigatórios',
                detail: 'Informe nome e tipo da coluna.'
            });
            return null;
        }

        const raw = form.getRawValue();
        const name = raw.name.trim();
        if (!name) {
            this.messageService.add({
                key: this.toastKey,
                severity: 'warn',
                summary: 'Nome obrigatório',
                detail: 'Informe um nome válido para a coluna.'
            });
            return null;
        }

        const backendType = this.toBackendColumnType(raw.type);
        const column: MapaLayerColumn = {
            name,
            type: backendType,
            nullable: raw.nullable,
            unique: raw.unique
        };
        if (backendType === 'varchar') {
            const size = raw.size ?? 255;
            if (!Number.isFinite(size) || size <= 0) {
                this.messageService.add({
                    key: this.toastKey,
                    severity: 'warn',
                    summary: 'Tamanho inválido',
                    detail: 'Informe um tamanho válido para coluna string.'
                });
                return null;
            }
            column.size = Number(size);
        }
        return column;
    }

    private toBackendColumnType(value: string): string {
        if (value === 'string') {
            return 'varchar';
        }
        if (value === 'integer') {
            return 'integer';
        }
        if (value === 'double') {
            return 'double';
        }
        if (value === 'boolean') {
            return 'boolean';
        }
        if (value === 'date') {
            return 'date';
        }
        return value;
    }

    private resetNewLayerColumnsDraft() {
        this.layerColumnsDraft = [];
        this.resetNewLayerColumnForm();
    }

    private resetNewLayerColumnForm() {
        this.newLayerColumnForm.reset({
            name: '',
            type: 'string',
            size: 255,
            nullable: true,
            unique: false
        });
    }

    private resetLayerColumnForm() {
        this.layerColumnForm.reset({
            name: '',
            type: 'string',
            size: 255,
            nullable: true,
            unique: false
        });
    }
}
