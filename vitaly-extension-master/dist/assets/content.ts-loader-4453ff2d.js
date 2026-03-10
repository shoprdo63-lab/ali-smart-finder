(function () {
  'use strict';

  (async () => {
    await import(
      /* @vite-ignore */
      chrome.runtime.getURL("assets/content.ts-9801dd5e.js")
    );
  })().catch(console.error);

})();
