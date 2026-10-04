import { Injectable } from '@angular/core';

import { FloatingPanelId, FloatingPosition, PanelSize } from '../editor.models';

@Injectable()
export class EditorLayoutState {
    private readonly margin = 6;

    layersPanelVisible = true;
    layersMenuOpen = true;
    zoomPosition: FloatingPosition = { x: 14, y: 14 };
    layersPosition: FloatingPosition = { x: 300, y: 14 };
    panelsInitialized = false;

    toggleLayersMenu() {
        this.layersMenuOpen = !this.layersMenuOpen;
    }

    toggleLayersPanelVisibility() {
        this.layersPanelVisible = !this.layersPanelVisible;
        if (this.layersPanelVisible) {
            this.layersMenuOpen = true;
        }
    }

    initializeLayersPanelPosition(frame: PanelSize, panelWidth: number) {
        if (!this.layersPanelVisible || panelWidth <= 0 || this.panelsInitialized) {
            return;
        }

        this.layersPosition = {
            x: Math.max(14, frame.width - panelWidth - 14),
            y: 14
        };
        this.panelsInitialized = true;
    }

    updateDraggedPosition(panelId: FloatingPanelId, free: FloatingPosition, frame: PanelSize, panel: PanelSize) {
        const clamped = this.clampPosition(free, frame, panel);

        if (panelId === 'zoom-panel') {
            this.zoomPosition = clamped;
        } else {
            this.layersPosition = clamped;
        }

        return clamped;
    }

    clampPanels(frame: PanelSize, zoomPanel: PanelSize, layersPanel?: PanelSize) {
        this.zoomPosition = this.clampPosition(this.zoomPosition, frame, zoomPanel);

        if (this.layersPanelVisible && layersPanel) {
            this.layersPosition = this.clampPosition(this.layersPosition, frame, layersPanel);
        }
    }

    private clampPosition(position: FloatingPosition, frame: PanelSize, panel: PanelSize): FloatingPosition {
        const maxX = Math.max(this.margin, frame.width - panel.width - this.margin);
        const maxY = Math.max(this.margin, frame.height - panel.height - this.margin);

        return {
            x: Math.min(Math.max(this.margin, position.x), maxX),
            y: Math.min(Math.max(this.margin, position.y), maxY)
        };
    }
}
