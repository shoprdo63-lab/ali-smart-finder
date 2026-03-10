(function () {
  'use strict';

  (async () => {
    await import(
      /* @vite-ignore */
      chrome.runtime.getURL("assets/content.ts-83e72db3.js")
    );
  })().catch(console.error);

})();
