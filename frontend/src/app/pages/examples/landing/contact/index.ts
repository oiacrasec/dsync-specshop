import { Component } from '@angular/core';
import { ContactHeroWidget } from './components/contactherowidget';
import { TestimonialWidget } from '../components/testimonialwidget';
import { FAQWidget } from '../components/faqwidget';

@Component({
    selector: 'contact',
    standalone: true,
    imports: [ContactHeroWidget, TestimonialWidget, FAQWidget],
    template: `<contact-hero-widget />
        <testimonial-widget />
        <faq-widget /> `
})
export class Contact {}
