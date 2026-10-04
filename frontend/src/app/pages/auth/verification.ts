import { Component } from '@angular/core';
import { AuthLogoWidget } from '@/app/pages/auth/components/authlogowidget';
import { InputOtpModule } from 'primeng/inputotp';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';

@Component({
    selector: 'app-verification',
    imports: [CommonModule, AuthLogoWidget, InputOtpModule, FormsModule, InputTextModule],
    standalone: true,
    template: ` <section class="animate-fadein animate-duration-300 animate-ease-in relative lg:pb-14 lg:py-52 py-36">
        <div class="landing-container mx-auto relative z-10 px-12">
            <div class="relative mt-28 max-w-xl mx-auto">
                <div
                    class="w-full h-full inset-0 bg-white/64 dark:bg-surface-800 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[4deg] lg:rotate-[7deg] backdrop-blur-[90px] rounded-3xl shadow-[0px_87px_24px_0px_rgba(120,149,206,0.00),0px_56px_22px_0px_rgba(120,149,206,0.01),0px_31px_19px_0px_rgba(120,149,206,0.03),0px_14px_14px_0px_rgba(120,149,206,0.04),0px_3px_8px_0px_rgba(120,149,206,0.06)] dark:shadow-sm"
                ></div>
                <div
                    class="w-full h-full inset-0 bg-white/64 dark:bg-surface-800 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[4deg] lg:-rotate-[7deg] backdrop-blur-[90px] rounded-3xl shadow-[0px_87px_24px_0px_rgba(120,149,206,0.00),0px_56px_22px_0px_rgba(120,149,206,0.01),0px_31px_19px_0px_rgba(120,149,206,0.03),0px_14px_14px_0px_rgba(120,149,206,0.04),0px_3px_8px_0px_rgba(120,149,206,0.06)] dark:shadow-sm"
                ></div>
                <form
                    class="p-8 relative z-10 bg-white/64 dark:bg-surface-800 backdrop-blur-[90px] rounded-3xl shadow-[0px_87px_24px_0px_rgba(120,149,206,0.00),0px_56px_22px_0px_rgba(120,149,206,0.01),0px_31px_19px_0px_rgba(120,149,206,0.03),0px_14px_14px_0px_rgba(120,149,206,0.04),0px_3px_8px_0px_rgba(120,149,206,0.06)]"
                >
                    <div class="pt-8 pb-8">
                        <div class="flex items-center justify-center">
                            <auth-logo-widget />
                        </div>
                        <h1 class="text-4xl lg:text-6xl font-semibold text-surface-950 dark:text-surface-0 text-center">Verification</h1>
                        <p class="text-center lg:text-xl text-surface-500 mt-6">Please verify your account.</p>
                    </div>
                    <div class="flex flex-col items-center">
                        <p-inputotp name="otp" [length]="6">
                            <ng-template #input let-token let-events="events" let-index="index">
                                <input pInputText type="text" [maxLength]="1" (input)="events.input($event)" (keydown)="events.keydown($event)" [attr.value]="token" class="custom-otp-input" />
                                @if (index === 3) {
                                    <div class="px-4">
                                        <i class="pi pi-minus"></i>
                                    </div>
                                }
                            </ng-template>
                        </p-inputotp>
                    </div>
                    <div class="flex items-center gap-4 mt-8">
                        <button class="button flex-1">Cancel</button>
                        <button class="button-primary flex-1">Verify</button>
                    </div>
                </form>
            </div>
        </div>
    </section>`,
    styles: `
        .p-inputotp {
            gap: 0;
        }

        .custom-otp-input {
            width: 48px;
            height: 48px;
            font-size: 24px;
            appearance: none;
            text-align: center;
            transition: all 0.2s;
            border-radius: 0;
            border: 1px solid var(--p-inputtext-border-color);
            background: transparent;
            outline-offset: -2px;
            outline-color: transparent;
            border-right: 0 none;
            transition: outline-color 0.3s;
            color: var(--p-inputtext-color);
        }

        .custom-otp-input:focus {
            outline: 2px solid var(--p-focus-ring-color);
        }

        .custom-otp-input:first-child,
        .custom-otp-input:nth-child(5) {
            border-top-left-radius: 12px;
            border-bottom-left-radius: 12px;
        }

        .custom-otp-input:nth-child(3),
        .custom-otp-input:last-child {
            border-top-right-radius: 12px;
            border-bottom-right-radius: 12px;
            border-right-width: 1px;
            border-right-style: solid;
            border-color: var(--p-inputtext-border-color);
        }
    `
})
export class Verification {}
