import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-landing-layout',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: ` <div class="w-full min-h-screen">
        <main>
            <router-outlet />
        </main>
    </div>`
})
export class LandingLayout {}
