// ESLint flat config (etapa 6.2a). Regras herdadas do datasync-gis, agora com parser TypeScript.
// Formatação fica com o Prettier (`npm run format:check`); eslint-config-prettier desliga regras conflitantes.
import eslint from '@eslint/js';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

const paddingLines = [
    'error',
    { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
    { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
    { blankLine: 'any', prev: ['case', 'default'], next: 'break' },
    { blankLine: 'any', prev: 'case', next: 'case' },
    { blankLine: 'always', prev: '*', next: 'return' },
    { blankLine: 'always', prev: 'block', next: '*' },
    { blankLine: 'always', prev: '*', next: 'block' },
    { blankLine: 'always', prev: 'block-like', next: '*' },
    { blankLine: 'always', prev: '*', next: 'block-like' },
    { blankLine: 'always', prev: ['import'], next: ['const', 'let', 'var'] }
];

export default tseslint.config(
    { ignores: ['dist/**', '.angular/**', 'node_modules/**', 'public/**'] },
    // DESABILITADO: telas fora do escopo atual (etapa 6.2). Ao reativar uma tela, remova-a
    // daqui e corrija o lint dela no mesmo commit.
    {
        ignores: [
            'src/app/pages/examples/**/*',
            '!src/app/pages/examples/notfound/**/*',
            '!src/app/pages/examples/oops/**/*',
            'src/app/pages/geoespacial/**/*',
            'src/app/pages/administracao/{organizacao,setor,cidade,usuario}/**/*',
            'src/app/pages/auth/{register,forgotpassword,newpassword,verification,lockscreen}.ts'
        ]
    },
    {
        files: ['**/*.ts'],
        extends: [eslint.configs.recommended, ...tseslint.configs.recommended, ...angular.configs.tsRecommended, prettier],
        processor: angular.processInlineTemplates,
        rules: {
            'padding-line-between-statements': paddingLines,
            '@angular-eslint/component-selector': ['error', { type: ['element', 'attribute'], prefix: ['app', 'ui'], style: 'kebab-case' }],
            '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: ['app', 'ui'], style: 'camelCase' }],
            '@angular-eslint/component-class-suffix': ['error', { suffixes: [''] }],
            '@angular-eslint/no-output-on-prefix': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/member-ordering': [
                'error',
                { default: ['public-static-field', 'static-field', 'instance-field', 'public-instance-method', 'public-static-field'] }
            ],
            'arrow-body-style': ['error', 'as-needed'],
            curly: 'off',
            'no-console': 'off',
            'prefer-const': 'off'
        }
    },
    {
        files: ['**/*.html'],
        extends: [...angular.configs.templateRecommended, prettier],
        rules: {
            '@angular-eslint/template/eqeqeq': ['error', { allowNullOrUndefined: true }]
        }
    }
);
