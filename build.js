const esbuild = require('esbuild');

// Development configuration
const isDev = process.env.NODE_ENV !== 'production';

async function build() {
    try {
        // Common build options
        const commonOptions = {
            bundle: true,
            minify: !isDev,
            sourcemap: isDev ? 'inline' : false,
            target: ['es2017'],
            platform: 'browser',
            define: {
                'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production')
            }
        };

        // Build content script
        await esbuild.build({
            ...commonOptions,
            entryPoints: ['./src/content.js'],
            outfile: './dist/content.bundle.js',
            ...(isDev && {
                watch: {
                    onRebuild(error, result) {
                        if (error) console.error('Build failed:', error);
                        else console.log('Build succeeded - ready for testing');
                    },
                }
            })
        });

        // Build background script
        await esbuild.build({
            ...commonOptions,
            entryPoints: ['./src/background.js'],
            outfile: './dist/background.bundle.js',
            ...(isDev && {
                watch: {
                    onRebuild(error, result) {
                        if (error) console.error('Build failed:', error);
                        else console.log('Build succeeded - ready for testing');
                    },
                }
            })
        });

        // Copy static files
        await esbuild.build({
            entryPoints: ['./src/popup.html', './src/popup.js', './src/styles.css'],
            loader: {
                '.html': 'copy',
                '.js': 'copy',
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
