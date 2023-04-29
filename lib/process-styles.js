const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const cssnano = require('cssnano');
const atImport = require('postcss-import');

// Build the css and its map, write them to the 11ty output folder
// Called from _data/cacheBusters.js

module.exports = async () => {
  const start = Date.now();
  console.log('Processing styles');

  const srcFile = 'styles/styles.css';
  const minFile = '_site/s/styles/styles.min.css';
  const mapFile = '_site/s/styles/styles.min.css.map';

  try {

    // process read, process, and write css
    const srcString = (await fs.promises.readFile(srcFile)).toString();
    const mkdir = fs.promises.mkdir(path.dirname(minFile), { recursive: true });
    const processed = postcss([ cssnano, atImport ]).process(srcString, {
      from: srcFile, to: minFile, map: { inline: false },
    });
    await Promise.all([ mkdir, processed ]);
    const minWrite = fs.promises.writeFile(minFile, processed.css);
    const mapWrite = fs.promises.writeFile(mapFile, processed.map.toString());

    // output some stats
    const srcKB = srcString.length / 1000;
    const minKB = processed.css.length / 1000;
    const savings = (srcKB - minKB).toFixed(3);
    const percent = Math.round(100 - (minKB / srcKB) * 100);
    console.log(`input: ${srcKB} kB, output: ${minKB} kB, savings: ${savings} kB, ratio: ${percent}%`);

    await Promise.all([ minWrite, mapWrite ]);
    console.log(`Finished processing styles (${Date.now() - start}ms)`);

    return processed.css; // return the css

  } catch (e) {
    console.error('There was a problem processing styles.');
    console.error(e);
    return Promise.reject();
  }
};
