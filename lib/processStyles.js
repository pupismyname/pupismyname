const cssnano = require('cssnano');
const fs = require('fs');
const path = require('path');
const postcss = require('postcss');

module.exports = (async () => {
  const start = Date.now();
  console.log('Processing styles');
  const srcFolder =          'styles';
  const minFolder = `_site/s/${srcFolder}`;
  const srcFilename =                     'styles.css';
  const minFilename =                     'styles.min.css';
  const mapFilename =                     'styles.css.map';
  const srcFile =           `${srcFolder}/${srcFilename}`;
  const minFile =           `${minFolder}/${minFilename}`;
  const mapFile =           `${minFolder}/${mapFilename}`;
  const annotationFile =               `./${mapFilename}`;
  const fromFile =                     `./${srcFilename}`;
  try {
    await fs.promises.mkdir(minFolder, { recursive: true });
    const srcString = (await fs.promises.readFile(srcFile)).toString();
    const processed = await postcss([ cssnano ]).process(srcString, {
      from: fromFile,
      to: minFolder,
      map: {
        inline: false,
        annotation: annotationFile,
        from: fromFile,
      },
    });
    await fs.promises.writeFile(minFile, processed.css);
    await fs.promises.writeFile(mapFile, processed.map.toString());
    const srcKB = srcString.length / 1000;
    const minKB = processed.css.length / 1000;
    const savings = (srcKB - minKB).toFixed(3);
    const percent = Math.round((minKB / srcKB) * 100);
    console.log(`input: ${srcKB} kB, output: ${minKB} kB, savings: ${savings} kB, ratio: ${percent}%`);
    console.log(`Finished processing styles (${Date.now() - start}ms)`);
    return Promise.resolve();
  } catch (e) {
    console.error('There was a problem processing styles.');
    console.error(e);
    return Promise.reject();
  }
});
