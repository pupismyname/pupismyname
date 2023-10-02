---
title: Wrapping EleventyFetch in a Retry Function
desc: Gracefully handle fetch errors when building your site.
tags:
  - 11ty
date: 2023-07-06 21:46:53
---
If your [11ty](https://www.11ty.dev/) build incorporates a lot of [remote content](https://www.11ty.dev/docs/data-js/#fetching-data-from-a-remote-api), you've probably encountered fetch failures. Maybe you hit a rate limit, or a request timed out, or there was a random connection hiccup. This can be a huge pain on large sites. One of our 11ty sites makes over 20,000 remote requests during the build process. It's unreasonable to expect every single request to be successful without a single one failing. And if there's a failure, you wouldn't want the entire build to fail. And you need that image, so skipping it altogether isn't an option either.

So what can we do to make the fetch process a little more robust? The simplest solution is to just try the request again. Usually it will work just fine. So how can we do that?

The first step is to use [EleventyFetch](https://www.11ty.dev/docs/plugins/fetch) instead of native `fetch`. You're probably [already doing that](https://www.11ty.dev/docs/data-js/#fetching-data-from-a-remote-api). Even so, we can also add some additional functionality around EleventyFetch to handle failures a little more gracefully.

## How does EleventyFetch work?

[EleventyFetch](https://www.11ty.dev/docs/plugins/fetch) is a wrapper around Node's native `fetch` function. It offers two additional features that I really love.

- ### Concurrency limit
  By default, EleventyFetch will only have [10 concurrent requests](https://www.11ty.dev/docs/plugins/fetch/#change-global-concurrency) in flight at any given time. This helps prevent overloading either end of the connection when you have a lot of requests to make. You can change this limit if you want to, but the default seems to work well for us.

  This concurrency limit alone goes a long way in improving our build reliability. Native `fetch` has no built-in rate or concurrency limiting functionality, and building our own solution have been annoying.

- ### Caching
  The most useful feature of EleventyFetch is the ability to [cache the results of a request for later](https://www.11ty.dev/docs/plugins/fetch/#cache-a-json-file-from-an-api). This can greatly speed up development. Any subsequent requests to the same endpoint will use the cached copy instead. You can [customize the expiration](https://www.11ty.dev/docs/plugins/fetch/#change-the-cache-duration) of this cache. [A failed request](https://www.11ty.dev/docs/plugins/fetch/#what-happens-when-a-request-fails) will use an expired cached copy if it exits, otherwise it will throw an error.

  It should be noted that the cache feature is meant for local development. [Production builds](https://www.11ty.dev/docs/plugins/fetch/#running-this-on-your-build-server) will not have any existing cache files, which means any failure will throw an error. It's this scenario that's causing problems for us.

## Retry if a request fails

If a fetch request fails, simply trying again later will usually work just fine. To accomplish this, I wrote a wrapper function for EleventyFetch that will catch any failed requests and queue them up again. Drop this in your project somewhere, and replace any calls to `EleventyFetch` with `fetchRetry`. Any failed requests will be noted in the console and placed at the end of the queue. If it fails 5 times, it will throw an error.

```
async function fetchRetry (url, EleventyFetchOptions, attempts = 1) {
  const maxAttempts = 5;
  try {
    return await EleventyFetch(url, EleventyFetchOptions);
  } catch (e) {
    console.error(e.message);
    if (attempts >= maxAttempts) {
      console.error(`Too many retries (${attempts}) for ${url}`);
      throw e;
    } else {
      attempts++;
      console.error(`Will retry (${attempts}) ${url}`);
      return fetchRetry(url, EleventyFetchOptions, attempts);
    }
  }
}
```

Possible future improvements:
- Customize the maximum number of attempts before giving up.
- Add a customizable delay between retry attempts.
- Specify a fallback value that can be used in case of a failure.

Adding this fetch retry functionality has greatly improved the reliability of our 11ty builds. Earlier this year, one of our providers had a rough few weeks where random requests would timeout, and builds were failing more often than they were succeeding. It's frustrating to have a single failed request out of tens of thousands invalidate an entire build, especially when all we need to do is try agaiin.
