import { Component } from '@angular/core';
import { PricingHeroWidget } from './components/pricingherowidget';
import { PricingCompareWidget } from './components/pricingcomparewidget';
import { TestimonialWidget } from '../components/testimonialwidget';
import { FAQWidget } from '../components/faqwidget';

@Component({
    selector: 'pricing',
    standalone: true,
    imports: [PricingHeroWidget, PricingCompareWidget, TestimonialWidget, FAQWidget],
    template: `
        <pricing-hero-widget />
        <pricing-compare-widget />
        <testimonial-widget />
        <faq-widget />
    `
})
export class Pricing {}
