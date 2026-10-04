import { Component } from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';
import { AuthLogoWidget } from '@/app/pages/auth/components/authlogowidget';
import { ButtonModule } from 'primeng/button';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-new-password',
    imports: [AuthLogoWidget, ButtonModule, RouterModule, InputTextModule],
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
                    class="space-y-8 p-8 relative z-10 bg-white/64 dark:bg-surface-800 backdrop-blur-[90px] rounded-3xl shadow-[0px_87px_24px_0px_rgba(120,149,206,0.00),0px_56px_22px_0px_rgba(120,149,206,0.01),0px_31px_19px_0px_rgba(120,149,206,0.03),0px_14px_14px_0px_rgba(120,149,206,0.04),0px_3px_8px_0px_rgba(120,149,206,0.06)]"
                >
                    <div class="pt-8 pb-8">
                        <div class="flex items-center justify-center">
                            <auth-logo-widget />
                        </div>
                        <h1 class="text-4xl lg:text-5xl font-semibold text-surface-950 dark:text-surface-0 text-center">Create a new password</h1>
                        <p class="text-center lg:text-xl text-surface-500 dark:text-white/64 mt-6 max-w-sm mx-auto">Lorem ipsum dolor sit amet</p>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="password" class="font-medium text-surface-500 dark:text-white/64">Password</label>
                        <input name="password" pInputText id="password" class="w-full" type="password" />
                    </div>
                    <div class="flex items-center gap-4">
                        <button pButton class="flex-1" rounded outlined>Cancel</button>
                        <button pButton class="flex-1" rounded>Submit</button>
                    </div>
                    <div class="flex items-center justify-center gap-2">
                        <span class="text-surface-500 dark:text-white/64">A problem? <a routerLink="/landing/contact" class="text-primary">Click here</a> and let us help you.</span>
                    </div>
                </form>
            </div>
        </div>
    </section>`
})
export class NewPassword {}
