import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HeroWidget } from './components/herowidget';
import { Feature1 } from './components/feature1';
import { Feature2 } from './components/feature2';
import { FinancialManagement } from './components/financialmanagement';
import { MarketingDashboardOverview } from './components/marketingdashboardoverview';
import { TestimonialWidget } from './components/testimonialwidget';
import { CTAWidget } from './components/ctawidget';
import { FAQWidget } from './components/faqwidget';

@Component({
    selector: 'landing',
    standalone: true,
    imports: [CommonModule, HeroWidget, Feature1, Feature2, FinancialManagement, MarketingDashboardOverview, TestimonialWidget, CTAWidget, FAQWidget],
    template: `
        <hero-widget />
        <feature1 />
        <feature2 />
        <financial-management />
        <marketing-dashboard-overview />
        <testimonial-widget />
        <cta-widget />
        <faq-widget />
    `
})
export class Landing {}
