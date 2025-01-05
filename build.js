const esbuild = require('esbuild');

async function build() {
    const ctx = await esbuild.context({
        entryPoints: ['./src/content.js'], // Updated entry point
        outfile: './dist/content.bundle.js', // Bundled output
        bundle: true,
        minify: true,
        sourcemap: false,
        target: ['es2017'], // Target JS version
        platform: 'browser', // Browser platform
    });

    // Start watching for changes
    await ctx.watch();

    console.log('Watching for changes...');
}

build().catch((err) => {
    console.error('Build failed:', err);
    process.exit(1);
});
