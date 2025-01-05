const esbuild = require('esbuild');

esbuild.build({
    entryPoints: ['./src/content.js'], // Your main entry file
    outfile: './dist/content.bundle.js', // Bundled output file
    bundle: true, // Enable bundling
    minify: true, // Minify the output (optional)
    sourcemap: false, // Generate a source map (optional)
    target: ['es2017'], // Target JavaScript version
    platform: 'browser', // Specify the platform (browser environment)
}).then(() => {
    console.log('Build succeeded.');
}).catch(() => {
    console.error('Build failed.');
    process.exit(1);
});
