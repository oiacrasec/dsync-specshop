import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { concatMap, forkJoin, of } from 'rxjs';

import { AuthService } from '@/app/core/services/auth.service';
import { AuthSessionService } from '@/app/core/services/auth-session.service';
import { ProfileService } from '@/app/core/services/profile.service';
import { problemMessage } from '@/app/core/utils/api-problem';
import { supportedTimeZones } from '@/app/core/utils/time-zone';
import { UiButton } from '@/app/shared/ui/button/button';
import { UiInputPassword } from '@/app/shared/ui/input-password/input-password';
import { UiImagePreview } from '@/app/shared/ui/image-preview/image-preview';
import { UiInputText } from '@/app/shared/ui/input-text/input-text';
import { ZonedDatePipe } from '@/app/shared/pipes/zoned-date.pipe';
import { LoginHistoryItem, UserSession } from '@/app/types/profile';
import { MfaSettings } from './mfa-settings';
import { MyPermissions } from './my-permissions';

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

// Perfil do usuário logado (9.2): aba Principal (foto, nome, usuário, fuso) num PUT multipart e aba
// Senha no endpoint próprio (decisão 80). Um Salvar envia o perfil e, se preenchida, a senha.
@Component({
    selector: 'app-perfil',
    standalone: true,
    imports: [FormsModule, ReactiveFormsModule, AvatarModule, SelectModule, TabsModule, UiButton, UiImagePreview, UiInputPassword, UiInputText, ZonedDatePipe, MfaSettings, MyPermissions],
    templateUrl: './perfil.html'
})
export class PerfilPage implements OnInit, OnDestroy {
    private fb = inject(FormBuilder);
    private profileService = inject(ProfileService);
    private auth = inject(AuthService);
    private messages = inject(MessageService);
    private session = inject(AuthSessionService);
    private router = inject(Router);

    readonly activeTab = signal<string | number | undefined>('principal');
    readonly permissionsOpened = signal(false);
    readonly showMyPermissions = computed(() => !this.session.getUser()?.is_superuser);
    readonly username = signal('');
    readonly currentAvatar = this.profileService.avatarSrc;
    readonly selectedFile = signal<File | null>(null);
    readonly previewUrl = signal<string | null>(null);
    readonly removeAvatar = signal(false);
    readonly previewOpen = signal(false);
    readonly timeZone = this.profileService.timeZone;
    readonly sessions = signal<UserSession[] | null>(null);
    readonly logins = signal<LoginHistoryItem[]>([]);
    readonly avatarSrc = computed(() => this.previewUrl() ?? (this.removeAvatar() ? null : this.currentAvatar()));
    readonly timeZoneOptions = signal<string[]>(supportedTimeZones());
    saving = false;

    form = this.fb.nonNullable.group({
        name: ['', [Validators.required, Validators.maxLength(150)]],
        time_zone: ['', Validators.required]
    });

    passwordForm = this.fb.nonNullable.group({
        current_password: [''],
        new_password: [''],
        new_password_confirm: ['']
    });

    ngOnInit() {
        this.profileService.load().subscribe({
            next: (profile) => {
                this.username.set(profile.username);
                this.form.setValue({ name: profile.name, time_zone: profile.time_zone });

                if (!this.timeZoneOptions().includes(profile.time_zone)) {
                    this.timeZoneOptions.update((zones) => [profile.time_zone, ...zones]);
                }
            },
            error: (error: unknown) => this.messages.add({ severity: 'error', summary: 'Falha ao carregar', detail: problemMessage(error, 'Não foi possível carregar o seu perfil.') })
        });
    }

    ngOnDestroy() {
        this.revokePreview();
    }

    deviceIcon(device: string) {
        return /\b(Android|iOS|iPadOS)$/.test(device) ? 'fa-solid fa-mobile-screen' : 'fa-solid fa-display';
    }

    // A aba Sessões só busca os dados quando é aberta pela primeira vez.
    onTabChange(tab: string | number | undefined) {
        this.activeTab.set(tab);

        if (tab === 'permissoes' && this.showMyPermissions()) {
            this.permissionsOpened.set(true);
        }

        if (tab !== 'sessoes' || this.sessions() !== null) {
            return;
        }

        forkJoin({ sessions: this.profileService.sessions(), logins: this.profileService.logins() }).subscribe({
            next: ({ sessions, logins }) => {
                this.sessions.set(sessions);
                this.logins.set(logins);
            },
            error: (error: unknown) => this.messages.add({ severity: 'error', summary: 'Falha ao carregar', detail: problemMessage(error, 'Não foi possível carregar as sessões.') })
        });
    }

    onMfaChanged() {
        this.session.clearSession();
        this.messages.add({ severity: 'success', summary: 'Verificação em duas etapas atualizada', detail: 'As sessões foram encerradas. Entre novamente.' });
        void this.router.navigateByUrl('/landing/login');
    }

    chooseAvatar(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0] ?? null;

        input.value = '';

        if (!file) {
            return;
        }

        if (!AVATAR_TYPES.includes(file.type) || file.size > AVATAR_MAX_BYTES) {
            this.messages.add({ severity: 'warn', summary: 'Foto não aceita', detail: 'Use JPG, PNG ou WebP de até 2 MB.' });

            return;
        }

        this.revokePreview();
        this.selectedFile.set(file);
        this.previewUrl.set(URL.createObjectURL(file));
        this.removeAvatar.set(false);
    }

    clearAvatar() {
        this.revokePreview();
        this.selectedFile.set(null);
        this.removeAvatar.set(true);
    }

    save() {
        const password = this.passwordForm.getRawValue();
        const changingPassword = Object.values(password).some((value) => value !== '');

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.messages.add({ severity: 'warn', summary: 'Campos obrigatórios', detail: 'Preencha nome e fuso horário.' });

            return;
        }

        if (changingPassword && (!password.current_password || !password.new_password || password.new_password !== password.new_password_confirm)) {
            this.messages.add({ severity: 'warn', summary: 'Senha', detail: 'Informe a senha atual e repita a nova senha igual nos dois campos.' });

            return;
        }

        const raw = this.form.getRawValue();

        this.saving = true;
        this.profileService
            .save({ name: raw.name.trim(), time_zone: raw.time_zone, avatar: this.selectedFile(), remove_avatar: this.removeAvatar() })
            .pipe(concatMap(() => (changingPassword ? this.auth.changePassword(password) : of(null))))
            .subscribe({
                next: () => {
                    this.saving = false;
                    this.revokePreview();
                    this.selectedFile.set(null);
                    this.removeAvatar.set(false);
                    this.passwordForm.reset();
                    this.messages.add({ severity: 'success', summary: 'Perfil salvo', detail: changingPassword ? 'Dados e senha atualizados.' : 'Dados atualizados.' });
                },
                error: (error: unknown) => {
                    this.saving = false;
                    this.messages.add({ severity: 'error', summary: 'Falha ao salvar', detail: problemMessage(error, 'Verifique os dados e tente novamente.') });
                }
            });
    }

    private revokePreview() {
        const url = this.previewUrl();

        if (url) {
            URL.revokeObjectURL(url);
            this.previewUrl.set(null);
        }
    }
}
