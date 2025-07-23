// gefifi-2/functions/eslint.config.js
const globals = require('globals');
const tseslint = require('typescript-eslint');
const js = require('@eslint/js');

/**
 * This is the modern, flat ESLint configuration for the Cloud Functions directory.
 * It is self-contained and does not inherit from the root configuration.
 */
module.exports = tseslint.config(
	// 1. Global ignores
	{
		ignores: [
			'lib/', // Ignore the compiled output directory
			'node_modules/',
			'eslint.config.js' // Ignore the config file itself
		]
	},

	// 2. Apply the recommended ESLint and TypeScript rules
	js.configs.recommended,
	...tseslint.configs.recommended,

	// 3. Configure settings specifically for TypeScript files
	{
		files: ['src/**/*.ts', '*.ts'],
		languageOptions: {
			// Set the parser to the TypeScript parser
			parser: tseslint.parser,
			parserOptions: {
				// Tell the parser where to find the tsconfig.json file
				project: 'tsconfig.json',
				tsconfigRootDir: __dirname
			},
			// Define global variables available in a Node.js environment
			globals: {
				...globals.node
			}
		},
		rules: {
			// Disable the problematic rule entirely
			'@typescript-eslint/no-unused-expressions': 'off',
			// You can add custom rule overrides here.
			// For example, this warns about unused variables instead of erroring,
			// which can be helpful during development.
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
			// It's good practice to avoid 'any', but we'll set it to a warning for now.
			'@typescript-eslint/no-explicit-any': 'warn'
		}
	}
);
