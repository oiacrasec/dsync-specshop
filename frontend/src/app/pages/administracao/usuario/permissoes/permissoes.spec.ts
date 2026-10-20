import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PermissionCatalogGroup } from '@/app/types/permission';
import { AccessGrant, UserAccess } from '@/app/types/usuario';
import { ALL_ORGANIZATIONS, UserAccessEditor } from './permissoes';

const MATRIZ = '019a0000-0000-7000-8000-00000000000a';
const FILIAL = '019a0000-0000-7000-8000-00000000000b';
const OPERATOR = '019a0000-0000-7000-8000-00000000000c';
const CREATOR = '019a0000-0000-7000-8000-00000000000d';
const ADMIN = '019a0000-0000-7000-8000-00000000000e';
const VIEW = 'organization:view';
const UPDATE = 'organization:update';
const CATALOG: PermissionCatalogGroup[] = [
    {
        resource: 'organization',
        label: 'Organizações',
        permissions: [
            { code: VIEW, action: 'view', label: 'Visualizar', scopes: ['CONTRACT', 'ORGANIZATION'], reserved: false },
            { code: 'organization:create', action: 'create', label: 'Criar', scopes: ['CONTRACT'], reserved: false },
            { code: UPDATE, action: 'update', label: 'Editar', scopes: ['CONTRACT', 'ORGANIZATION'], reserved: false }
        ]
    }
];

function grant(values: Partial<AccessGrant>): AccessGrant {
    return { scope: 'CONTRACT', organization: null, profile: null, permission: '', excluded_organizations: [], excluded_permissions: [], ...values };
}

function create(grants: AccessGrant[] = [grant({ profile: OPERATOR })], profiles = true) {
    const access: UserAccess = {
        organizations: [
            { public_id: FILIAL, name: 'Filial', is_active: true },
            { public_id: MATRIZ, name: 'Matriz', is_active: true }
        ],
        profiles: profiles
            ? [
                  { public_id: ADMIN, name: 'Administrador do contrato', is_active: true, is_system: true, is_essential: true, permissions: [VIEW, UPDATE, 'user:view'] },
                  { public_id: OPERATOR, name: 'Operador', is_active: true, is_system: false, is_essential: false, permissions: [VIEW, UPDATE] },
                  { public_id: CREATOR, name: 'Criador', is_active: true, is_system: false, is_essential: false, permissions: ['organization:create'] }
              ]
            : [],
        grants
    };

    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(UserAccessEditor);

    fixture.componentRef.setInput('access', access);
    fixture.componentRef.setInput('catalog', CATALOG);
    fixture.detectChanges();

    return fixture.componentInstance;
}

describe('Aba Permissões do usuário', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('mostra o nome do item selecionado', () => {
        const editor = create();

        expect(editor.targetName()).toBe('Todas as organizações');
        editor.select(MATRIZ);
        expect(editor.targetName()).toBe('Matriz');
    });

    it('desmarcar na organização uma permissão do perfil grava a exceção só ali, e marcar desfaz', () => {
        const editor = create();

        editor.select(MATRIZ);
        expect(editor.checkedCodes().sort()).toEqual([VIEW, UPDATE].sort());
        editor.setCodes([VIEW]);
        expect(editor.value().grants).toEqual([grant({ profile: OPERATOR, excluded_permissions: [{ organization: MATRIZ, permission: UPDATE }] })]);
        editor.select(FILIAL);
        expect(editor.checkedCodes()).toContain(UPDATE);
        editor.select(MATRIZ);
        editor.setCodes([VIEW, UPDATE]);
        expect(editor.value().grants).toEqual([grant({ profile: OPERATOR })]);
        expect(editor.dirty()).toBeTrue();
    });

    it('desmarcar em todas tira do perfil em todo lugar; marcar numa organização vira avulsa ali', () => {
        const editor = create();

        editor.setCodes([VIEW]);
        editor.select(MATRIZ);
        expect(editor.checkedCodes()).toEqual([VIEW]);
        editor.setCodes([VIEW, UPDATE]);
        expect(editor.value().grants).toEqual([grant({ profile: OPERATOR, excluded_permissions: [{ organization: null, permission: UPDATE }] }), grant({ scope: 'ORGANIZATION', organization: MATRIZ, permission: UPDATE })]);
    });

    it('avulsa de todas desmarcada numa organização vira exceção de organização', () => {
        const editor = create([grant({ permission: VIEW })]);

        editor.select(MATRIZ);
        editor.setCodes([]);
        expect(editor.value().grants).toEqual([grant({ permission: VIEW, excluded_organizations: [MATRIZ] })]);
        editor.setCodes([VIEW]);
        expect(editor.value().grants).toEqual([grant({ permission: VIEW })]);
    });

    it('caixa nova na organização vira avulsa e desmarcar a remove', () => {
        const editor = create([]);

        editor.select(FILIAL);
        editor.setCodes([VIEW]);
        expect(editor.value().grants).toEqual([grant({ scope: 'ORGANIZATION', organization: FILIAL, permission: VIEW })]);
        editor.setCodes([]);
        expect(editor.value().grants).toEqual([]);
    });

    it('só oferece perfis compatíveis com o escopo e ainda não aplicados, e explica a lista vazia', () => {
        const editor = create();

        expect(editor.profileOptions().map((option) => option.label)).toEqual(['Administrador do contrato', 'Criador']);
        editor.select(FILIAL);
        expect(editor.profileOptions().map((option) => option.label)).toEqual(['Operador']);
        expect(editor.profileEmptyMessage()).toBe('Nenhum outro perfil compatível com este escopo.');
        TestBed.resetTestingModule();
        expect(create([], false).profileEmptyMessage()).toBe('Nenhum perfil cadastrado. Crie perfis no menu Perfis.');
    });

    it('aplica o administrador só em todas as organizações e trava a grade', () => {
        const editor = create([]);

        editor.select(ALL_ORGANIZATIONS);
        editor.selectedProfile = ADMIN;
        editor.applyProfile();
        expect(editor.contractAdmin()).toBeTrue();
        editor.select(MATRIZ);
        expect(editor.profileOptions().some((option) => option.value === ADMIN)).toBeFalse();
        expect(editor.checkedCodes()).toContain(UPDATE);
    });
});
