const esbuild = require('esbuild');

module.exports = async () => {
  const start = Date.now();
  console.log('Processing client-side javascript');
  const esbuildOptions = {
    outdir: `_site/s/js`, // copy directly to dist
    bundle: true, // copy dependencies into the file itself
    minify: true, // minify output file
    sourcemap: true, // generate source maps
    target: 'es6', // https://caniuse.com/?search=es6
    // list scripts manually, don't just scrape the `js` folder
    // these should also be added to `cacheBusters.js`
    entryPoints: [
      'js/scroll-to-top.js',
      'js/hero.js',
    ],
  };
  try {
    await esbuild.build(esbuildOptions);
    console.log(`Finished processing client-side javascript (${Date.now() - start}ms)`);
  } catch (e) {
    console.error('There was a problem processing client-side javascript.');
    console.error(e);
    return Promise.reject();
  }
};
