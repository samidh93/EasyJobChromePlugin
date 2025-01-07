const esbuild = require('esbuild');

async function build() {
    const contextContent = await esbuild.context({
        entryPoints: ['./src/content.js'], // Content script
        outfile: './dist/content.bundle.js',
        bundle: true,
        minify: true,
        sourcemap: false,
        target: ['es2017'],
        platform: 'browser',
    });

    const contextBackground = await esbuild.context({
        entryPoints: ['./src/background.js'], // Background script
        outfile: './dist/background.bundle.js',
        bundle: true,
        minify: true,
        sourcemap: false,
        target: ['es2017'],
        platform: 'browser',
    });

    // Start watch mode
    await contextContent.watch();
    await contextBackground.watch();

    console.log('Watching for changes...');
}

build().catch((err) => {
    console.error('Build failed:', err);
    process.exit(1);
});
