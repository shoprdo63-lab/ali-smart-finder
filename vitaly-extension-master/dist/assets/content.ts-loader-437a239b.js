(function () {
  'use strict';

  (async () => {
    await import(
      /* @vite-ignore */
      chrome.runtime.getURL("assets/content.ts-afde7ebd.js")
    );
  })().catch(console.error);

})();
