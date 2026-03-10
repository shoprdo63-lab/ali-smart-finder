(function () {
  'use strict';

  (async () => {
    await import(
      /* @vite-ignore */
      chrome.runtime.getURL("assets/content.ts-0457ddfa.js")
    );
  })().catch(console.error);

})();
