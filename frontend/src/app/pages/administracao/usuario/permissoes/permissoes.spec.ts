import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PermissionCatalogGroup } from '@/app/types/permission';
import { UserAccess } from '@/app/types/usuario';
import { ALL_ORGANIZATIONS, UserAccessEditor } from './permissoes';

const MATRIZ = '019a0000-0000-7000-8000-00000000000a';
const FILIAL = '019a0000-0000-7000-8000-00000000000b';
const READER = '019a0000-0000-7000-8000-00000000000c';
const CREATOR = '019a0000-0000-7000-8000-00000000000d';
const ADMIN = '019a0000-0000-7000-8000-00000000000e';
const CATALOG: PermissionCatalogGroup[] = [
    {
        resource: 'organization',
        label: 'Organizações',
        permissions: [
            { code: 'organization:view', action: 'view', label: 'Visualizar', scopes: ['CONTRACT', 'ORGANIZATION'], reserved: false },
            { code: 'organization:create', action: 'create', label: 'Criar', scopes: ['CONTRACT'], reserved: false },
            { code: 'organization:update', action: 'update', label: 'Editar', scopes: ['CONTRACT', 'ORGANIZATION'], reserved: false }
        ]
    }
];
const ACCESS: UserAccess = {
    organizations: [
        { public_id: FILIAL, name: 'Filial', is_active: true },
        { public_id: MATRIZ, name: 'Matriz', is_active: true }
    ],
    profiles: [
        { public_id: ADMIN, name: 'Administrador do contrato', is_active: true, is_system: true, is_essential: true, permissions: ['organization:view', 'user:view'] },
        { public_id: READER, name: 'Leitor', is_active: true, is_system: false, is_essential: false, permissions: ['organization:view'] },
        { public_id: CREATOR, name: 'Criador', is_active: true, is_system: false, is_essential: false, permissions: ['organization:create'] }
    ],
    grants: [{ scope: 'CONTRACT', organization: null, profile: READER, permission: '', excluded_organizations: [], is_active: true }]
};

function create() {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(UserAccessEditor);

    fixture.componentRef.setInput('access', ACCESS);
    fixture.componentRef.setInput('catalog', CATALOG);
    fixture.detectChanges();

    return fixture.componentInstance;
}

describe('Aba Permissões do usuário', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('mostra na organização o perfil herdado travado e a exceção o retira', () => {
        const editor = create();

        expect(editor.targetName()).toBe('Todas as organizações');
        editor.select(MATRIZ);
        expect(editor.targetName()).toBe('Matriz');
        expect(editor.inherited().map((item) => item.label)).toEqual(['Perfil Leitor']);
        expect(editor.lockedCodes()).toEqual(['organization:view']);
        editor.setExcluded(editor.inherited()[0], true);
        expect(editor.lockedCodes()).toEqual([]);
        expect(editor.value().grants[0].excluded_organizations).toEqual([MATRIZ]);
        expect(editor.dirty()).toBeTrue();
    });

    it('grava caixas livres como avulsas no escopo da organização selecionada', () => {
        const editor = create();

        editor.select(MATRIZ);
        editor.setDirectCodes(['organization:update']);
        editor.select(ALL_ORGANIZATIONS);
        expect(editor.directCodes()).toEqual([]);
        expect(editor.value().grants).toContain({ scope: 'ORGANIZATION', organization: MATRIZ, profile: null, permission: 'organization:update', excluded_organizations: [] });
    });

    it('só oferece perfis compatíveis com o escopo e ainda não aplicados', () => {
        const editor = create();

        expect(editor.profileOptions().map((option) => option.label)).toEqual(['Administrador do contrato', 'Criador']);
        editor.select(FILIAL);
        expect(editor.profileOptions().map((option) => option.label)).toEqual(['Leitor']);
        editor.selectedProfile = READER;
        editor.applyProfile();
        expect(editor.appliedProfiles().map((profile) => profile.name)).toEqual(['Leitor']);
        editor.removeProfile(editor.appliedProfiles()[0]);
        expect(editor.value().grants.length).toBe(1);
    });

    it('explica a lista vazia de perfis', () => {
        const editor = create();

        expect(editor.profileEmptyMessage()).toBe('Nenhum outro perfil compatível com este escopo.');
        const fixture = TestBed.createComponent(UserAccessEditor);

        fixture.componentRef.setInput('access', { ...ACCESS, profiles: [], grants: [] });
        expect(fixture.componentInstance.profileEmptyMessage()).toBe('Nenhum perfil cadastrado. Crie perfis no menu Perfis.');
    });

    it('aplica o administrador só em todas as organizações, herdado sem exceção', () => {
        const editor = create();

        editor.selectedProfile = ADMIN;
        editor.applyProfile();
        expect(editor.contractAdmin()).toBeTrue();
        editor.select(MATRIZ);
        expect(editor.profileOptions().some((option) => option.value === ADMIN)).toBeFalse();
        expect(editor.inherited().map((item) => [item.label, item.essential])).toEqual([
            ['Perfil Leitor', false],
            ['Perfil Administrador do contrato', true]
        ]);
    });
});
