(function () {
  'use strict';

  (async () => {
    await import(
      /* @vite-ignore */
      chrome.runtime.getURL("assets/content.ts-6cf5bfa0.js")
    );
  })().catch(console.error);

})();
