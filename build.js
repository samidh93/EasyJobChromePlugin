import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
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

    loader: {
        '.yaml': 'text',
        '.yml': 'text'
    }
};

try {
    // ✅ Create dist directories if they don't exist
    if (!fs.existsSync('dist')) {
        fs.mkdirSync('dist');
    }
    if (!fs.existsSync('dist/input')) {
        fs.mkdirSync('dist/input');
    }
    
    // ✅ Copy example profile to dist folder
    fs.copyFileSync('input/example_profile.yaml', 'dist/input/example_profile.yaml');
    console.log('Example profile copied to dist/input/');
    
    // ✅ Build Content Script
    await esbuild.build({
        ...commonOptions,
        entryPoints: ['src/content.js'],
        outfile: 'dist/content.bundle.js',
    });

    // ✅ Build Background Script (Service Worker Safe)
    await esbuild.build({
        ...commonOptions,
        entryPoints: ['src/background.js'],
        outfile: 'dist/background.bundle.js',
    });

    // ✅ Build AIQuestionAnswerer
    await esbuild.build({
        ...commonOptions,
        entryPoints: ['src/ai/AIQuestionAnswerer.js'],
        outfile: 'dist/ai/AIQuestionAnswerer.js',
        external: ['js-yaml'], // Exclude js-yaml from the bundle
    });
    
    // ✅ Copy static files
    await esbuild.build({
        entryPoints: ['./src/popup.html', './src/popup.js', './src/styles.css'],
        loader: {
            '.html': 'copy',
            '.js': 'copy',
            '.css': 'copy',
        },
        outdir: './dist',
    });

    console.log('Build completed successfully');
} catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
}
