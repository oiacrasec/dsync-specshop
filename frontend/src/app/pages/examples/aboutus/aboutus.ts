import { Component } from '@angular/core';
import { LazyImageWidget } from '@/app/pages/examples/landing/components/lazyimagewidget';

@Component({
    selector: 'app-about-us',
    imports: [LazyImageWidget],
    template: `
        <div>
            <h1 class="text-4xl lg:text-6xl font-semibold text-surface-950 dark:text-surface-0 text-center mx-auto">Everything you ever<br class="lg:block hidden" />wanted to know about us</h1>
            <p class="lg:text-xl text-surface-500 dark:text-white/64 text-center mt-6 max-w-4xl mx-auto">
                We are a team of passionate creators, designers, and developers dedicated to building meaningful and impactful experiences. Our mission is to combine innovation with functionality, ensuring that every project we work on exceeds
                expectations.
            </p>
            <lazy-image-widget className="mx-auto w-3/4 max-w-[900px]! aspect-video! object-cover rounded-2xl my-14" src="/demo/images/about-us-image.jpg" />
            <p class="lg:text-xl text-surface-500 dark:text-white/64 text-center mt-6 max-w-4xl mx-auto">
                Driven by our commitment to excellence, we take pride in crafting user-centric solutions that make a difference. Whether it’s product design, software development, or branding, we approach every challenge with creativity and a
                problem-solving mindset. Our journey is defined by growth, teamwork, and the pursuit of perfection.
            </p>
            <div class="flex flex-col gap-28 mt-28">
                <div class="flex md:flex-row flex-col items-center justify-center gap-16">
                    <div class="w-[20rem] h-112 relative rounded-3xl">
                        <div class="absolute inset-0 z-1 rounded-[inherit] bg-white/48 dark:bg-white/32 backdrop-blur-2xl -rotate-6 origin-bottom-left scale-90"></div>
                        <div class="absolute inset-0 z-2 rounded-[inherit] bg-white/48 dark:bg-white/32 backdrop-blur-2xl -rotate-3 origin-bottom-left scale-95"></div>
                        <lazy-image-widget
                            src="/demo/images/avatars/about-us-avatar-1.png"
                            style="border-radius: inherit;"
                            className="relative z-20 shadow-[0px_10px_10px_-8px_rgba(18,18,23,0.02),0px_2px_2px_-1.5px_rgba(18,18,23,0.02),0px_1px_1px_-0.5px_rgba(18,18,23,0.02),0px_0px_0px_1px_rgba(18,18,23,0.02)]"
                        />
                    </div>
                    <div class="max-w-[24rem] lg:max-w-md">
                        <h2 class="text-4xl lg:text-6xl text-surface-950 dark:text-surface-0 font-semibold">Emma Hug</h2>
                        <p class="lg:text-xl text-surface-500 dark:text-white/64 mt-6">Founder and creative mind. She shapes the vision that defines our brand. Passionate about creating customer-focused solutions and strengthening team spirit.</p>
                        <ul class="flex items-center gap-2 mt-8">
                            <li>
                                <a href="" class="h-8 w-14 flex items-center justify-center rounded-full bg-white/64 dark:bg-white/12 hover:bg-white dark:hover:bg-surface-950 transition-all">
                                    <i class="pi pi-youtube text-surface-950 dark:text-surface-0"></i>
                                </a>
                            </li>
                            <li>
                                <a href="" class="h-8 w-14 flex items-center justify-center rounded-full bg-white/64 dark:bg-white/12 hover:bg-white dark:hover:bg-surface-950 transition-all">
                                    <i class="pi pi-twitter text-surface-950 dark:text-surface-0"></i>
                                </a>
                            </li>
                            <li>
                                <a href="" class="h-8 w-14 flex items-center justify-center rounded-full bg-white/64 dark:bg-white/12 hover:bg-white dark:hover:bg-surface-950 transition-all">
                                    <i class="pi pi-facebook text-surface-950 dark:text-surface-0"></i>
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
                <div class="flex md:flex-row-reverse flex-col items-center justify-center gap-16">
                    <div class="w-[20rem] h-112 relative rounded-3xl">
                        <div class="absolute inset-0 z-1 rounded-[inherit] bg-white/48 dark:bg-white/32 backdrop-blur-2xl rotate-6 origin-bottom-right scale-90"></div>
                        <div class="absolute inset-0 z-2 rounded-[inherit] bg-white/48 dark:bg-white/32 backdrop-blur-2xl rotate-3 origin-bottom-right scale-95"></div>
                        <lazy-image-widget
                            style="border-radius: inherit;"
                            src="/demo/images/avatars/about-us-avatar-3.png"
                            className="relative z-20 shadow-[0px_10px_10px_-8px_rgba(18,18,23,0.02),0px_2px_2px_-1.5px_rgba(18,18,23,0.02),0px_1px_1px_-0.5px_rgba(18,18,23,0.02),0px_0px_0px_1px_rgba(18,18,23,0.02)]"
                        />
                    </div>
                    <div class="max-w-[24rem] lg:max-w-md">
                        <h2 class="text-4xl lg:text-6xl text-surface-950 dark:text-surface-0 font-semibold">Robert Smith</h2>
                        <p class="lg:text-xl text-surface-500 dark:text-white/64 mt-6">Product Designer. Focused on user experience, he delivers functional and aesthetic solutions. His attention to detail and innovative approach inspire our team.</p>
                        <ul class="flex items-center gap-2 mt-8">
                            <li>
                                <a href="" class="h-8 w-14 flex items-center justify-center rounded-full bg-white/64 dark:bg-white/12 hover:bg-white dark:hover:bg-surface-950 transition-all">
                                    <i class="pi pi-youtube text-surface-950 dark:text-surface-0"></i>
                                </a>
                            </li>
                            <li>
                                <a href="" class="h-8 w-14 flex items-center justify-center rounded-full bg-white/64 dark:bg-white/12 hover:bg-white dark:hover:bg-surface-950 transition-all">
                                    <i class="pi pi-twitter text-surface-950 dark:text-surface-0"></i>
                                </a>
                            </li>
                            <li>
                                <a href="" class="h-8 w-14 flex items-center justify-center rounded-full bg-white/64 dark:bg-white/12 hover:bg-white dark:hover:bg-surface-950 transition-all">
                                    <i class="pi pi-facebook text-surface-950 dark:text-surface-0"></i>
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
                <div class="flex md:flex-row flex-col items-center justify-center gap-16">
                    <div class="w-[20rem] h-112 relative rounded-3xl">
                        <div class="absolute inset-0 z-1 rounded-[inherit] bg-white/48 dark:bg-white/32 backdrop-blur-2xl -rotate-6 origin-bottom-left scale-90"></div>
                        <div class="absolute inset-0 z-2 rounded-[inherit] bg-white/48 dark:bg-white/32 backdrop-blur-2xl -rotate-3 origin-bottom-left scale-95"></div>
                        <lazy-image-widget
                            style="border-radius: inherit;"
                            src="/demo/images/avatars/about-us-avatar-2.png"
                            className="relative z-20 shadow-[0px_10px_10px_-8px_rgba(18,18,23,0.02),0px_2px_2px_-1.5px_rgba(18,18,23,0.02),0px_1px_1px_-0.5px_rgba(18,18,23,0.02),0px_0px_0px_1px_rgba(18,18,23,0.02)]"
                        />
                    </div>
                    <div class="max-w-[24rem] lg:max-w-md">
                        <h2 class="text-4xl lg:text-6xl text-surface-950 dark:text-surface-0 font-semibold">Lia Anderson</h2>
                        <p class="lg:text-xl text-surface-500 dark:text-white/64 mt-6">
                            Software Developer. With her technical expertise and creative mindset, she brings our projects to life. Her top priority is developing user-friendly solutions through code.
                        </p>
                        <ul class="flex items-center gap-2 mt-8">
                            <li>
                                <a href="" class="h-8 w-14 flex items-center justify-center rounded-full bg-white/64 dark:bg-white/12 hover:bg-white dark:hover:bg-surface-950 transition-all">
                                    <i class="pi pi-youtube text-surface-950 dark:text-surface-0"></i>
                                </a>
                            </li>
                            <li>
                                <a href="" class="h-8 w-14 flex items-center justify-center rounded-full bg-white/64 dark:bg-white/12 hover:bg-white dark:hover:bg-surface-950 transition-all">
                                    <i class="pi pi-twitter text-surface-950 dark:text-surface-0"></i>
                                </a>
                            </li>
                            <li>
                                <a href="" class="h-8 w-14 flex items-center justify-center rounded-full bg-white/64 dark:bg-white/12 hover:bg-white dark:hover:bg-surface-950 transition-all">
                                    <i class="pi pi-facebook text-surface-950 dark:text-surface-0"></i>
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class AboutUs {}
