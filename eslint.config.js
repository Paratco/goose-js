import paratcoEslintConfig from "@paratco/eslint-config";

export default [
    ...paratcoEslintConfig.node,
    ...paratcoEslintConfig.stylisticFormatter,
    ...paratcoEslintConfig.import,
    // TypeScript Rules
    {
        files: ["**/*.{ts,tsx,js}"],
        languageOptions: {
            parserOptions: {
                ecmaVersion: 2025,
                project: true,
                tsconfigRootDir: import.meta.dirname
            }
        },
    },
    {
        ignores: [
            "dist",
            "eslint.config.js",
            "*.html",
            "**/__mocks__/*", // devDependency error
        ]
    }
];
