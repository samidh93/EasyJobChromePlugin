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
    if (!fs.existsSync('dist/resume')) {
        fs.mkdirSync('dist/resume');
    }
    if (!fs.existsSync('dist/libs')) {
        fs.mkdirSync('dist/libs');
    }
    
    // ✅ Copy example profile to dist folder
    fs.copyFileSync('input/example_profile.yaml', 'dist/input/example_profile.yaml');
    console.log('Example profile copied to dist/input/');
    
    // ✅ Copy resumeParser to dist folder
    fs.copyFileSync('src/resume/resumeParser.js', 'dist/resume/resumeParser.js');
    console.log('ResumeParser copied to dist/resume/');
    
    // ✅ Copy library files to dist folder
    fs.copyFileSync('src/libs/js-yaml.min.js', 'dist/libs/js-yaml.min.js');
    fs.copyFileSync('src/libs/pdf.min.js', 'dist/libs/pdf.min.js');
    fs.copyFileSync('src/libs/pdf.worker.min.js', 'dist/libs/pdf.worker.min.js');
    console.log('Libraries copied to dist/libs/');
    
    // ✅ Copy popup initialization script to dist folder
    fs.copyFileSync('src/popup/popup-init.js', 'dist/popup-init.js');
    console.log('Popup initialization script copied to dist/');
    
    // ✅ Copy manifest.json to dist folder
    fs.copyFileSync('manifest.json', 'dist/manifest.json');
    console.log('Manifest copied to dist/');
    
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
    
    // ✅ Copy static files (excluding popup files - now handled by React webpack build)
    // Note: popup.html, popup.js are now built by webpack with React
    
    console.log('Build completed successfully');
    console.log('Note: Run "npm run build:react" to build the React popup');
} catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
}
