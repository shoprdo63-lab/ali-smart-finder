(function () {
  'use strict';

  (async () => {
    await import(
      /* @vite-ignore */
      chrome.runtime.getURL("assets/content.ts-3e41c828.js")
    );
  })().catch(console.error);

})();
