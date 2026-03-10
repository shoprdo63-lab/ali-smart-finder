(function () {
  'use strict';

  (async () => {
    await import(
      /* @vite-ignore */
      chrome.runtime.getURL("assets/content.ts-994f4fd8.js")
    );
  })().catch(console.error);

})();
