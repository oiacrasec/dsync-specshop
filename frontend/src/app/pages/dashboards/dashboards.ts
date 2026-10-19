import { Component } from '@angular/core';

// Home após o login. O core entrega a tela vazia: cada projeto derivado implementa os seus
// dashboards (ADR 0036).
@Component({
    selector: 'app-dashboards',
    standalone: true,
    templateUrl: './dashboards.html'
})
export class DashboardsPage {}
