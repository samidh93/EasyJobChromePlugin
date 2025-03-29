import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';

const commonOptions = {
    bundle: true,
    platform: 'browser',
    target: ['chrome58', 'firefox57', 'safari11', 'edge18'],
    format: 'esm',
    minify: isProduction,
    sourcemap: !isProduction,
    define: {
        'process.env.NODE_ENV': `"${process.env.NODE_ENV || 'development'}"`,
        'global': 'window'
    },
    inject: ['./src/shims/process-shim.js'],
    loader: {
        '.yaml': 'text',
        '.yml': 'text'
    }
};

try {
    // Build content script
    await esbuild.build({
        ...commonOptions,
        entryPoints: ['src/content.js'],
        outfile: 'dist/content.js',
    });

    // Build AIQuestionAnswerer
    await esbuild.build({
        ...commonOptions,
        entryPoints: ['src/AIQuestionAnswerer.js'],
        outfile: 'dist/AIQuestionAnswerer.js',
        external: ['js-yaml'], // Exclude js-yaml from the bundle as it's a runtime dependency
    });

    console.log('Build completed successfully');
} catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
}
