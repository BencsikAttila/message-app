const globals = require('../node_modules/globals/index')

/**
 * @type {Array<import('eslint').ESLint.ConfigData>}
 */
module.exports = [
    {
        languageOptions: {
            globals: globals.node,
            sourceType: 'commonjs',
        }
    },
    ...require('../eslint.config'),
]
