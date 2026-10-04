import { Component } from '@angular/core';
import { AuthLogoWidget } from '@/app/pages/auth/components/authlogowidget';
import { GoogleWidget } from '@/app/pages/auth/components/googlewidget';
import { AppleWidget } from '@/app/pages/auth/components/applewidget';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [AuthLogoWidget, GoogleWidget, AppleWidget, ButtonModule, InputTextModule, CheckboxModule, RouterModule],
    template: `
        <section class="animate-fadein animate-duration-300 animate-ease-in relative lg:pb-14 lg:py-52 py-36">
            <div class="landing-container mx-auto relative z-10 px-12">
                <div class="relative mt-28 max-w-184 mx-auto">
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
                            <h1 class="text-4xl lg:text-6xl font-semibold text-surface-950 dark:text-surface-0 text-center">Register</h1>
                            <p class="text-center lg:text-xl text-surface-500 mt-6">Enter your details to create a new account.</p>
                        </div>
                        <div class="flex md:flex-row flex-col items-center gap-4">
                            <a
                                href=""
                                class="w-full md:flex-1 px-6 py-3 rounded-full flex items-center justify-center gap-2 font-medium text-surface-700 dark:text-surface-200 border border-surface shadow-[0px_1px_2px_0px_rgba(18,18,23,0.05)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                            >
                                <google-widget />
                                Sign in with Google
                            </a>
                            <a
                                href=""
                                class="w-full md:flex-1 px-6 py-3 rounded-full flex items-center justify-center gap-2 font-medium text-surface-700 dark:text-surface-200 border border-surface shadow-[0px_1px_2px_0px_rgba(18,18,23,0.05)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                            >
                                <apple-widget />
                                Sign in with Google
                            </a>
                        </div>
                        <div class="flex items-center gap-4">
                            <span class="h-px w-full bg-primary-500/10"></span>
                            <span class="text-surface-400 dark:text-surface-500">or</span>
                            <span class="h-px w-full bg-primary-500/10"></span>
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="username" class="font-medium text-surface-500 dark:text-white/64">User Name</label>
                            <input name="username" pInputText id="username" class="w-full" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="email" class="font-medium text-surface-500 dark:text-white/64">Email Address</label>
                            <input name="email" pInputText id="email" class="w-full" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="password" class="font-medium text-surface-500 dark:text-white/64">Password</label>
                            <input name="password" pInputText id="password" type="password" class="w-full" />
                        </div>
                        <div class="flex items-center gap-2">
                            <p-checkbox name="remember" id="remember" binary />
                            <label for="remember" class="text-surface-500 dark:text-white/64"><span class="text-surface-950 dark:text-surface-0 font-medium">I have read the </span>Terms and Conditions</label>
                        </div>
                        <button pButton class="w-full" rounded>Register</button>
                        <div class="flex items-center justify-center gap-2">
                            <span class="text-surface-500 dark:text-white/64">Already have an account?</span>
                            <a routerLink="/landing/login" class="text-primary">Login</a>
                        </div>
                    </form>
                </div>
            </div>
        </section>
    `
})
export class Register {
    username = '';

    email = '';

    password = '';

    checkbox = false;
}
