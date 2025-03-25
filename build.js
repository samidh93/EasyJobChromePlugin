const esbuild = require('esbuild');

// Development configuration
const isDev = process.env.NODE_ENV !== 'production';

async function build() {
    try {
        // Build content script
        await esbuild.build({
            entryPoints: ['./src/content.js'],
            outfile: './dist/content.bundle.js',
            bundle: true,
            minify: !isDev,
            sourcemap: isDev ? 'inline' : false,
            target: ['es2017'],
            platform: 'browser',
            define: {
                'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production')
            },
            watch: isDev ? {
                onRebuild(error, result) {
                    if (error) console.error('Build failed:', error);
                    else console.log('Build succeeded - ready for testing');
                },
            } : false,
        });

        // Build background script
        await esbuild.build({
            entryPoints: ['./src/background.js'],
            outfile: './dist/background.bundle.js',
            bundle: true,
            minify: !isDev,
            sourcemap: isDev ? 'inline' : false,
            target: ['es2017'],
            platform: 'browser',
            define: {
                'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production')
            },
            watch: isDev ? {
                onRebuild(error, result) {
                    if (error) console.error('Build failed:', error);
                    else console.log('Build succeeded - ready for testing');
                },
            } : false,
        });

        // Copy manifest and other static files
        await esbuild.build({
            entryPoints: ['./src/popup.html', './src/styles.css'],
            loader: {
                '.html': 'copy',
                '.css': 'copy',
            },
            outdir: './dist',
        });

        console.log(isDev ? 'Development build ready - watching for changes...' : 'Production build completed!');
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

build();
