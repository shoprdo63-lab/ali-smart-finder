(function () {
  'use strict';

  (async () => {
    await import(
      /* @vite-ignore */
      chrome.runtime.getURL("assets/content.ts-129af5e2.js")
    );
  })().catch(console.error);

})();
