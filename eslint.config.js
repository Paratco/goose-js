import {createConfig} from "@paratco/eslint-config";

export default createConfig({
    platform: "node",
    style: "stylistic",
    useImport: true,
    typescript: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname
    },
    ignores: ["dist", "eslint.config.js"]
})
