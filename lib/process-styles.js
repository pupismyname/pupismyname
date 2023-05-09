const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const cssnano = require('cssnano');
const atImport = require('postcss-import');

// Build the css and its map, write them to the 11ty output folder

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
    // wait for mkdir and postcss to finish
    await Promise.all([ mkdir, processed ]);
    // write out the minified css and the source map
    const minWrite = fs.promises.writeFile(minFile, processed.css);
    const mapWrite = fs.promises.writeFile(mapFile, processed.map.toString());
    // wait for the writes to finish
    await Promise.all([ minWrite, mapWrite ]);
    console.log(`Finished processing styles (${Date.now() - start}ms)`);
    return processed.css; // return the css
  } catch (e) {
    console.error('There was a problem processing styles.');
    console.error(e);
    return Promise.reject();
  }
};
