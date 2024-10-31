/* eslint-disable no-undef */

const pluginJs = require('@eslint/js')
const stylistic = require('@stylistic/eslint-plugin-js')

/**
 * @type {Array<import('eslint').ESLint.ConfigData>}
 */
module.exports = [
    {
        plugins: {
            '@stylistic/js': stylistic
        },
        rules: {
            ...pluginJs.configs.all.rules,
            '@stylistic/js/block-spacing': ['warn', 'always'],
            '@stylistic/js/eol-last': ['warn', 'always'],
            '@stylistic/js/indent': ['warn', 4, { SwitchCase: 1 }],
            '@stylistic/js/linebreak-style': ['warn', 'unix'],
            '@stylistic/js/no-extra-semi': ['warn'],
            '@stylistic/js/no-mixed-spaces-and-tabs': ['warn'],
            '@stylistic/js/no-multi-spaces': ['warn'],
            '@stylistic/js/no-multiple-empty-lines': ['warn', { max: 1 }],
            '@stylistic/js/no-trailing-spaces': ['warn'],
            '@stylistic/js/quotes': ['warn', 'single'],
            'prefer-promise-reject-errors': 'off',
            'no-warning-comments': 'warn',
            'dot-notation': 'off',
            'camelcase': 'error',
            'func-names': 'off',
            'no-unused-vars': 'off',
            'one-var': 'off',
            'sort-keys': 'off',
            'no-console': 'off',
            'capitalized-comments': 'off',
            'strict': 'off',
            'no-magic-numbers': 'off',
            'new-cap': 'off',
            'func-style': ['error', 'declaration'],
            'semi': ['error', 'never']
        }
    }
]
