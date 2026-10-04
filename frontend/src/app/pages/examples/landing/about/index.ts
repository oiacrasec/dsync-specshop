import { Component } from '@angular/core';
import { AboutHeroWidget } from './components/aboutherowidget';
import { AboutSectionOneWidget } from './components/aboutsectiononewidget';
import { AboutSectionTwoWidget } from './components/aboutsectiontwowidget';
import { CTAWidget } from '../components/ctawidget';
import { FAQWidget } from '../components/faqwidget';

@Component({
    selector: 'about',
    standalone: true,
    imports: [AboutHeroWidget, AboutSectionOneWidget, AboutSectionTwoWidget, CTAWidget, FAQWidget],
    template: `<about-hero-widget />
        <about-section-one-widget />
        <about-section-two-widget />
        <cta-widget />
        <faq-widget />`
})
export class About {}
