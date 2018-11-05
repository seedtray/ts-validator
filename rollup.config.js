// rollup.config.js
import typescript from 'rollup-plugin-typescript2';

export default {
    entry: './src/commands/repl.ts',
    output: {
        file: 'build/repl.js',
        format: 'cjs',
        sourcemap: true,
    },


    plugins: [
        typescript(/*{ plugin options }*/)
    ]
}
