import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { CustomersLogoWidget } from '../../components/customerslogowidget';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';

@Component({
    selector: 'contact-hero-widget',
    standalone: true,
    imports: [CommonModule, CustomersLogoWidget, InputTextModule, ButtonModule, FormsModule, TextareaModule],
    template: ` <section class="animate-fadein animate-duration-300 animate-ease-in relative lg:pb-14 lg:pt-52 pt-36 pb-10 overflow-hidden">
        <div class="landing-container mx-auto relative z-10 px-12">
            <h1 class="text-4xl lg:text-6xl font-semibold text-surface-950 dark:text-surface-0 text-center">Get in Touch with Us</h1>
            <p class="mt-8 text-center lg:text-xl text-surface-500 max-w-2xl mx-auto">We’re here to assist you with any questions or concerns—reach out to our dedicated support team anytime.</p>
            <div class="relative mt-28 max-w-218 mx-auto">
                <div
                    class="w-full h-full inset-0 bg-white/64 dark:bg-surface-800 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[4deg] lg:rotate-[7deg] backdrop-blur-[90px] rounded-3xl shadow-[0px_87px_24px_0px_rgba(120,149,206,0.00),0px_56px_22px_0px_rgba(120,149,206,0.01),0px_31px_19px_0px_rgba(120,149,206,0.03),0px_14px_14px_0px_rgba(120,149,206,0.04),0px_3px_8px_0px_rgba(120,149,206,0.06)] dark:shadow-sm"
                ></div>
                <div
                    class="w-full h-full inset-0 bg-white/64 dark:bg-surface-800 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[4deg] lg:-rotate-[7deg] backdrop-blur-[90px] rounded-3xl shadow-[0px_87px_24px_0px_rgba(120,149,206,0.00),0px_56px_22px_0px_rgba(120,149,206,0.01),0px_31px_19px_0px_rgba(120,149,206,0.03),0px_14px_14px_0px_rgba(120,149,206,0.04),0px_3px_8px_0px_rgba(120,149,206,0.06)] dark:shadow-sm"
                ></div>
                <form
                    class="space-y-8 p-8 relative z-10 bg-white/64 dark:bg-surface-800 backdrop-blur-[90px] rounded-3xl shadow-[0px_87px_24px_0px_rgba(120,149,206,0.00),0px_56px_22px_0px_rgba(120,149,206,0.01),0px_31px_19px_0px_rgba(120,149,206,0.03),0px_14px_14px_0px_rgba(120,149,206,0.04),0px_3px_8px_0px_rgba(120,149,206,0.06)] dark:shadow-sm"
                >
                    <div class="flex sm:flex-row flex-col gap-8">
                        <div class="flex flex-col gap-2 flex-1">
                            <label for="first_name" class="font-medium text-surface-500">First Name</label>
                            <input name="first_name" pInputText id="first_name" [(ngModel)]="first_name" class="w-full" />
                        </div>
                        <div class="flex flex-col gap-2 flex-1">
                            <label for="last_name" class="font-medium text-surface-500">Last Name</label>
                            <input name="last_name" pInputText id="last_name" [(ngModel)]="last_name" class="w-full" />
                        </div>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="email" class="font-medium text-surface-500">Email Address</label>
                        <input name="email" pInputText id="email" [(ngModel)]="email" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="phone" class="font-medium text-surface-500">Phone Number</label>
                        <input name="phone" pInputText id="phone" [(ngModel)]="phone" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="message" class="font-medium text-surface-500">Message</label>
                        <textarea name="message" pTextarea id="message" [(ngModel)]="message" rows="6" class="w-full rounded-2xl!"></textarea>
                    </div>
                    <button pButton class="w-full" rounded>Submit</button>
                </form>
            </div>
        </div>
        <customers-logo-widget class="my-24 py-16 landing-container mx-auto" />
    </section>`
})
export class ContactHeroWidget {
    first_name = '';

    last_name = '';

    email = '';

    phone = '';

    message = '';
}
