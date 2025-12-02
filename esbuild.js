const esbuild = require('esbuild');

// Check for flags in process.argv
const production = process.argv.includes('--production') || process.env.NODE_ENV === 'production';
const watch = process.argv.includes('--watch');

console.log(`Building in ${production ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
console.log(`Source maps: ${!production ? 'ENABLED' : 'DISABLED'}`);
console.log(`Minification: ${production ? 'ENABLED' : 'DISABLED'}`);

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    outfile: 'dist/extension.js',
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    sourcemap: !production,
    minify: production,
    logLevel: 'info',
  });

  if (watch) {
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log('Build complete!');
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});