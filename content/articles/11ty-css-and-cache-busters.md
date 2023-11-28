---
title: CSS workflow and cache busters in 11ty
desc: How I build/watch CSS with cache busters in 11ty.
tags:
  - 11ty
  - css
date: 2023-05-09 18:41:11
---
During my time with [11ty](https://www.11ty.dev/), I've struggled to incorporate a CSS workflow that met all my needs. My specific requirements:

1. Build the CSS and watch for changes
1. Automate cache busters
1. Don't do a full rebuild just for new CSS

First I'll explain each of these requirements, then I'll get into the code.

---

## Requirement 1: Build the CSS and watch for changes

The first requirement is pretty simple in theory, but its the one I've struggled with the most. Should 11ty be involved in this step? If so, how? And if not, what should I use?

I've used [Gulp](https://gulpjs.com/) as a task runner on several projects, but Gulp and it's many plugins are [no longer actively maintained](https://github.com/gulpjs/gulp/releases) and it makes `npm audit` lose its mind. It's also a pretty heavy solution for my needs, though not as heavy as something like [Webpack](https://webpack.js.org/).

I have also tried making [custom template types in 11ty](https://www.11ty.dev/docs/languages/custom/#example-add-sass-support-to-eleventy). This works very well on smaller sites, but one of the 11ty sites I've created has a huge [global data](https://www.11ty.dev/docs/data/) overhead, and it seems that even when rebuilding a single template, 11ty will re-process global data. There are ways to speed this up with [fetch caching](https://www.11ty.dev/docs/plugins/fetch/) and other shortcuts, but even after all that, I was looking at 25+ seconds just to rebuild the CSS. To be clear, that's not 11ty's fault, that's just how much data was going into this particular site. This issue also ruled out other potential solutions, such adding the CSS build to 11ty's `before` or `after` [events](https://www.11ty.dev/docs/events/).

The solution I settled on was to decouple the CSS build from 11ty entirely and use [npm scripts](https://docs.npmjs.com/cli/v9/using-npm/scripts) as the task runner instead. I wrote small a Node script that runs [postcss](https://postcss.org/) and writes the compiled CSS and sourcemap to 11ty's output folder. The npm script `build:css` executes the Node script with `node -e`.

I also added an npm script called `watch:css` to watch the source stylesheet for changes using the [npm-watch](https://www.npmjs.com/package/npm-watch) library. When it detects changes, it runs `build:css` again.

---

## Requirement 2: Automate cache busters

When a user visits the site, they should always get the latest version of the CSS. I like to accomplish this by placing a querystring parameter at the end of asset urls, like `style.css?v=[cache-buster]`, where the value changes any time the asset has changed. There are many ways to generate a cache buster string like this, but I was looking for something lightweight and simple, with very few dependencies. I ended up spinning up my own solution.

I placed a file in 11ty's [`_data` folder](https://www.11ty.dev/docs/data-global/) called `cacheBusters.js`. This creates a `cacheBusters` object that you can reference in your templates. This file references a small module I wrote called `get-hash` that generates a hash based on a string or a file. This allows me to generate a hash based on the minified CSS from the `postcss` process above.

This hash remains the same if the input doesn't change. If there are any problems generating the hash from the input, the module writes out the error and returns a fake hash based on a random number. This means that even in an error state, the result will still be useful for cache busting. The worst that will happen is the user will download the unchanged CSS again on a later visit.

This could probably be turned into an 11ty shortcode at some point.

---

## Requirement 3: Don't do a full 11ty rebuild just for new CSS

When you're in development mode and running the things locally, you usually don't want to rebuild the entire site just to update the cache buster. In a pinch, you can manually reload with cache disabled, but we can do better than that.

By disconnecting the CSS build process from 11ty, we don't have to worry about 11ty rebuilding the entire site when the CSS changes, because we didn't tell it to [watch anything](https://www.11ty.dev/docs/watch-serve/) related to the CSS. So the cache buster will stay the same in local development (unless the site is rebuilt for some other reason).

You might say that this defeats the purpose of a cache buster, and you'd be right. How does the browser know it needs to load the updated CSS? The answer is to explicitly tell [11ty dev server](https://www.11ty.dev/docs/dev-server/) to [watch for changes](https://www.11ty.dev/docs/dev-server/#options) to the CSS file. This isn't the same thing as [telling 11ty to watch the CSS](https://www.11ty.dev/docs/watch-serve/), which would trigger a build. By default, 11ty dev server watches HTML files in `_site` for changes, but you can tell it to watch other files too, like the stylesheet. The dev server will hot-reload the stylesheet whenever it detects a change, regardless of the value of the cache buster in the HTML.

This only affects the development process running on 11ty dev server. In production, the cache buster will reflect any changes in the stylesheet.

---

## Shut up and show me the code already

- Install the additional modules in terminal.
  ```
  npm i postcss --save-dev
  npm i postcss-import --save-dev
  npm i cssnano --save-dev
  npm i npm-watch --save-dev
  ```

- `lib/process-styles.js` builds the final CSS and sourcemap and moves the files to the 11ty output folder.
  ```
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
  ```

- `package.json` contains the `build:css` and `watch:css` npm scripts, as well as the `npm-watch` config. Your root stylesheet will be `styles/styles.css`. If you want to change this, update the `watch` below and update the path in `process-styles.js` above.

  ```
  …
  "watch": {
    "build:css": {
      "patterns": [ "styles" ],
      "extensions": "css",
      "quiet": false,
      "runOnChangeOnly": false
    }
  },
  "scripts": {
    "build": "npm run clean; npm run build:css; npx @11ty/eleventy",
    "build:css": "node -e 'require(\"./lib/process-styles.js\")();'",
    "clean": "rm -rf _site",
    "dev": "npm run clean; npm run build:css; npm run watch:css & npx @11ty/eleventy --serve --incremental --quiet",
    "watch:css": "npm-watch"
  },
  …
  ```

- `_data/cacheBusters.js` goes in your 11ty `_data` folder and creates a `cacheBusters` object for your templates.

  ```
  const getHash = require('../../lib/get-hash');

  // Generate hashes for assets to use for cache busting
  module.exports = async () => {
    return {
      // Generate a hash based on the minified css
      styles: getHash.fromFile('_site/s/styles/styles.min.css'),
    };
  };
  ```

- `lib/get-hash.js` is used by `cacheBusters.js` and returns a hash key based on a string or a file for use by the cache buster.
  ```
  const crypto = require('crypto');
  const fs = require('fs');
  const path = require('path');

  module.exports.fromFile = async (hashPath) => {
    try {
      const fileBuffer = await fs.promises.readFile(path.resolve(hashPath));
      return _getHash(fileBuffer);
    } catch (e) {
      console.error('There was a problem creating file hash.', e);
      // return something useful anyway
      return _getFakeHash();
    }
  };

  module.exports.fromString = (hashString) => {
    try {
      return _getHash(hashString);
    } catch (e) {
      console.error('There was a problem creating string hash.', e);
      // return something useful anyway
      return _getFakeHash();
    }
  };

  // some random characters
  function _getFakeHash (len = 64) {
    return crypto.randomBytes(len).toString('hex');
  }

  function _getHash (value) {
    const hashSum = crypto.createHash('sha256');
    hashSum.update(value);
    return hashSum.digest('hex');
  }
  ```

- With all of the above in place, you can use the `cacheBusters` values in templates as a querystring parameter when referencing an asset.

  {% assign linkrel = '<link rel="stylesheet" href="/s/styles/styles.min.css?v={{ cacheBusters.styles }}">' -%}
  ```
  {{ linkrel }}
  ```
  This can be expanded to work for any asset. Styles, scripts, images, whatever.

- Add a watch target to the server config in `.eleventy.js` so it will reload the browser when `postcss` updates the stylesheet:

  ```
    eleventyConfig.setServerOptions({
      watch: ['_site/s/**/*'],
    });
  ```
