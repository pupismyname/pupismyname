---
title: Track data across builds in 11ty
date: 2022-12-06 19:38:45
---

When developing an [11ty](https://www.11ty.dev/) site using `--serve`, you might have the need to track some data across rebuilds. In my case, I wanted a way count the number of builds in the current session, and I needed to set some flags so I didn't create duplicate watch processes.

11ty runs all `addGlobalData` functions on every build and rebuild. Knowing this, we can create a variable outside of `addGlobalData` to track any data we want. Inside `addGlobalData` we can clone the variable, modify the original as needed, then return the clone. Since we are modifying the original variable after cloning, any modifications will be picked up on the next rebuild.

In this example, I'm tracking the number of builds and tracking whether or not a watch process is running.

### `.eleventy.js`
```
module.exports = function (eleventyConfig) {

  // this object is outside `addGlobalData`
  const buildData = {
    builds: 1, // this is the first build
    stylesWatched: false, // styles have not been watched yet
  };

  // track some data across rebuilds
  eleventyConfig.addGlobalData('buildData', () => {

    console.log(`This is build number ${buildData.builds}`);

    // clone the object
    const data = {...buildData};

    // modify the original object. new values will be present on next rebuild.
    buildData.builds++; // increment build count for next run
    buildData.stylesWatched = true; // now styles have a watcher

    // return cloned object, which doesn't have any modifications
    return data;
  });

  // ...
  // the rest of your 11ty config
  // ...

}
```

## Use the data in a template

Now you can use this data in your templates. Note that if you have `--incremental` builds on, this template will not update unless it changes or a full build runs.

### `builds.md`
```
---
title: Number of builds
---
This is build number {{ '{{ buildData.builds }}' }}.
```

You can also use this data in javascript templates.

### `build-styles.11ty.js`
```
const fs = require('fs');

module.exports = class {

  data () {
    return {
      permalink: false,
      eleventyExcludeFromCollections: true
    }
  }

  async render (data) {
    try {
      await build();
      // don't run a watch in production
      if (data.environment !== 'production' && !data.buildData.stylesWatched) {
        fs.watch(inputFolder, { recursive: true }, build);
      }
    } catch (e) {
      console.error('There was a problem processing the CSS.');
      console.error(e);
    }
  }
}

async function build () {
  console.log('Processing styles');
  // ...
  // do your stuff
  // ...
  console.log('Finished processing styles');
}
```

If you're wondering why I'm using `fs.watch` and not 11ty's `.addWatchTarget`, or why I'm building styles with an 11ty template in the first place, I'm planning on writing articles about those topics in the future.

When you stop the 11ty `--serve` process, the values reset to their original state. If you wanted to persist the values between sessions, you might look into caching the object to the filesystem. That's beyond the scope of this article.

Other things you might track are the date/time of the first build, or the date/time of the previous build. Good luck!
