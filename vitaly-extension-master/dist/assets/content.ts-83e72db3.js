const $="http://localhost:3000",f="wc-price-hunter-box",y={CONFIG:"wc_price_hunter_config",POSITION:"wc_price_hunter_position",LAST_SEARCH:"wc_price_hunter_last_search"},z={backendApiUrl:$,enabled:!0,autoShow:!0};let c={isVisible:!1,isMinimized:!1,isLoading:!1,position:{x:20,y:150}},b={...z},s=null;(function(){const e=window.location.host;L().then(()=>{if(!b.enabled){console.log("WC Price Hunter: Extension disabled");return}e.includes("amazon")&&(A(),T())}).catch(t=>{console.error("WC Price Hunter initialization error:",t)})})();async function A(){try{document.querySelector('.s-main-slot, [data-component-type="s-search-result"]')!==null?await P():await I()}catch(e){console.error("WC Price Hunter (Amazon handler):",e)}}async function P(){const e=document.querySelectorAll('.s-main-slot .s-result-item, [data-component-type="s-search-result"]');console.log(`WC Price Hunter: Found ${e.length} products on search page`),e.forEach((t,n)=>{const o=C(t);o&&E(t,o,n)})}function C(e){var t,n;try{const o=e.querySelector('h2 a span, .s-size-mini span, [data-cy="title-recipe-title"]'),r=((t=o==null?void 0:o.textContent)==null?void 0:t.trim())||"";if(!r)return null;const i=e.querySelector(".a-price .a-offscreen, .a-price-whole"),l=(((n=i==null?void 0:i.textContent)==null?void 0:n.trim())||"").replace(/[^\d.,]/g,"");let a=e.getAttribute("data-asin")||"";if(!a){const g=e.querySelector('a[href*="/dp/"]');if(g){const x=g.href.match(/\/dp\/([A-Z0-9]{10})/);a=x?x[1]:""}}const p=e.querySelector('h2 a, a[href*="/dp/"]'),m=p?p.href.startsWith("http")?p.href:`https://www.amazon.com${p.getAttribute("href")}`:"",u=e.querySelector(".s-image"),v=(u==null?void 0:u.src)||"";return{title:r,price:l,currency:"USD",url:m||window.location.href,asin:a,imageUrl:v}}catch(o){return console.error("Error extracting product from search item:",o),null}}function E(e,t,n){if(e.querySelector(".wc-price-hunter-panel"))return;const r=document.createElement("div");r.className="wc-price-hunter-panel",r.dataset.asin=t.asin,r.dataset.index=String(n),Object.assign(r.style,{marginTop:"10px",padding:"12px",background:"linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",borderRadius:"8px",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',fontSize:"13px",zIndex:"1000"}),r.innerHTML=`
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
      <span style="font-size: 16px;">🔍</span>
      <span style="font-weight: 600; color: #667eea;">Price Hunter</span>
    </div>
    <button class="wc-hunter-search-btn" style="
      width: 100%;
      padding: 8px 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
      transition: transform 0.2s;
    ">Find on AliExpress</button>
  `;const i=r.querySelector(".wc-hunter-search-btn");i&&i.addEventListener("click",()=>{S(t)}),e.appendChild(r)}function T(){const e=new MutationObserver(n=>{let o=!1;n.forEach(r=>{r.addedNodes.forEach(i=>{var d,l;i instanceof HTMLElement&&((d=i.matches)!=null&&d.call(i,'.s-result-item, [data-component-type="s-search-result"]')||(l=i.querySelector)!=null&&l.call(i,'.s-result-item, [data-component-type="s-search-result"]'))&&(o=!0)})}),o&&(clearTimeout(window.__wcHunterTimeout),window.__wcHunterTimeout=setTimeout(()=>{P()},500))}),t=document.querySelector('.s-main-slot, [data-component-type="s-search-results"], #search')||document.body;e.observe(t,{childList:!0,subtree:!0}),console.log("WC Price Hunter: MutationObserver active for dynamic content")}async function I(){const e=M();if(!e){console.log("WC Price Hunter: Could not extract Amazon product info");return}console.log("WC Price Hunter: Found Amazon product:",e.title),b.autoShow?await S(e):F(e)}async function L(){return new Promise(e=>{chrome.storage.sync.get([y.CONFIG],t=>{t[y.CONFIG]&&(b={...z,...t[y.CONFIG]}),e()})})}function M(){var e,t,n,o;try{const r=["#productTitle",'[data-automation-id="title"]',".product-title","h1.a-size-large"];let i=null;for(const w of r)if(i=document.querySelector(w),(e=i==null?void 0:i.textContent)!=null&&e.trim())break;const d=((t=i==null?void 0:i.textContent)==null?void 0:t.trim())||"";if(!d)return null;const l=[".a-price .a-offscreen",".a-price-whole",'[data-automation-id="price"]',".priceToPay"];let a=null;for(const w of l)if(a=document.querySelector(w),(n=a==null?void 0:a.textContent)!=null&&n.trim())break;const m=(((o=a==null?void 0:a.textContent)==null?void 0:o.trim())||"").replace(/[^\d.,]/g,""),u=window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/),v=u?u[1]:"",g=document.querySelector("#landingImage, #imgBlkFront"),x=(g==null?void 0:g.src)||void 0;return{title:d,price:m,currency:"USD",url:window.location.href,asin:v,imageUrl:x}}catch(r){return console.error("Error extracting Amazon product:",r),null}}async function _(e,t){var n,o;try{const r=await fetch(`${b.backendApiUrl}/api/search`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:e,url:t,maxResults:5})});if(!r.ok)throw new Error(`API request failed: ${r.status}`);const i=await r.json();if(!i.success||!((n=i.data)!=null&&n.products))throw new Error(((o=i.error)==null?void 0:o.message)||"No products found");return i.data.products}catch(r){throw console.error("Error searching AliExpress:",r),r}}async function S(e){try{h({isLoading:!0});const t=await _(e.title,e.url);if(t.length===0){h({isLoading:!1,error:"No AliExpress products found"});return}const n=t.reduce((l,a)=>{const p=parseFloat(l.salePrice);return parseFloat(a.salePrice)<p?a:l}),o=parseFloat(e.price.replace(/[^\d.]/g,"")),r=parseFloat(n.salePrice);let i;if(r<o){const l=o-r,a=Math.round(l/o*100);i={amount:l,percentage:a}}h({isLoading:!1,comparison:{amazon:e,aliexpress:t,cheapestAliExpress:n,savings:i}})}catch(t){console.error("Error in price comparison:",t),h({isLoading:!1,error:t instanceof Error?t.message:"Unknown error"})}}function F(e){const t=document.getElementById("wc-price-hunter-toggle");t&&t.remove();const n=document.createElement("div");n.id="wc-price-hunter-toggle",n.innerHTML="💰",Object.assign(n.style,{position:"fixed",top:"150px",right:"20px",width:"50px",height:"50px",background:"linear-gradient(135deg, #667eea 0%, #764ba2 100%)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px",cursor:"pointer",zIndex:"1000000",boxShadow:"0 4px 15px rgba(0,0,0,0.2)",transition:"all 0.3s ease"}),n.addEventListener("mouseenter",()=>{n.style.transform="scale(1.1)"}),n.addEventListener("mouseleave",()=>{n.style.transform="scale(1)"}),n.addEventListener("click",()=>{S(e),n.remove()}),document.body.appendChild(n)}function h(e){c={...c,...e};let t=document.getElementById(f);t||(t=H(),document.body.appendChild(t)),k(t),c.isVisible?(t.style.display="block",B(t)):t.style.display="none"}function H(){const e=document.createElement("div");return e.id=f,Object.assign(e.style,{position:"fixed",top:`${c.position.y}px`,left:`${c.position.x}px`,width:"380px",background:"white",borderRadius:"12px",boxShadow:"0 10px 40px rgba(0,0,0,0.15)",zIndex:"1000000",fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',fontSize:"14px",display:"none",overflow:"hidden"}),e}function k(e){if(c.isLoading){e.innerHTML=`
      <div style="padding: 20px; text-align: center;">
        <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <p style="margin: 10px 0 0 0; color: #666;">Searching AliExpress...</p>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;return}if(c.error){e.innerHTML=`
      <div style="padding: 20px; text-align: center;">
        <div style="color: #e74c3c; font-size: 24px; margin-bottom: 10px;">⚠️</div>
        <p style="margin: 0; color: #666;">${c.error}</p>
        <button onclick="this.closest('#${f}').remove()" style="margin-top: 10px; padding: 5px 10px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
      </div>
    `;return}if(!c.comparison)return;const{amazon:t,cheapestAliExpress:n,savings:o}=c.comparison;e.innerHTML=`
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; cursor: move;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="font-weight: bold; font-size: 16px;">💰 Price Hunter</div>
        <div style="display: flex; gap: 5px;">
          <button onclick="toggleMinimize()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 24px; height: 24px; border-radius: 4px; cursor: pointer;">${c.isMinimized?"📈":"📉"}</button>
          <button onclick="document.getElementById('${f}').remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 24px; height: 24px; border-radius: 4px; cursor: pointer;">✕</button>
        </div>
      </div>
    </div>
    
    ${c.isMinimized?`
      <div style="padding: 15px; text-align: center;">
        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Amazon vs AliExpress</div>
        ${o?`
          <div style="font-size: 18px; font-weight: bold; color: #27ae60;">Save ${o.percentage}%</div>
        `:`
          <div style="font-size: 14px; color: #666;">Click to expand</div>
        `}
      </div>
    `:`
      <div style="padding: 15px;">
        <!-- Amazon Product -->
        <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <img src="https://www.amazon.com/favicon.ico" style="width: 16px; height: 16px; margin-right: 8px;">
            <span style="font-weight: bold; color: #666;">Amazon</span>
          </div>
          <div style="font-size: 12px; color: #333; margin-bottom: 8px; line-height: 1.4;">${t.title.substring(0,80)}${t.title.length>80?"...":""}</div>
          <div style="font-size: 18px; font-weight: bold; color: #e74c3c;">$${t.price}</div>
        </div>
        
        <!-- AliExpress Product -->
        ${n?`
          <div style="margin-bottom: 15px;">
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <img src="https://ae01.alicdn.com/kf/S8c5f5c8c4f8f4e2b8d9e6c5a8b7e6d5f.jpg" style="width: 16px; height: 16px; margin-right: 8px; border-radius: 2px;">
              <span style="font-weight: bold; color: #666;">AliExpress (Best Deal)</span>
              ${n.discount>0?`<span style="background: #27ae60; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-left: 8px;">-${n.discount}%</span>`:""}
            </div>
            <div style="display: flex; gap: 10px;">
              <img src="${n.imageUrl}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 1px solid #eee;">
              <div style="flex: 1;">
                <div style="font-size: 12px; color: #333; margin-bottom: 8px; line-height: 1.4;">${n.title.substring(0,60)}${n.title.length>60?"...":""}</div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="font-size: 18px; font-weight: bold; color: #27ae60;">$${n.salePrice}</div>
                  ${n.originalPrice!==n.salePrice?`<div style="font-size: 12px; color: #999; text-decoration: line-through;">$${n.originalPrice}</div>`:""}
                </div>
                <div style="display: flex; align-items: center; gap: 10px; margin-top: 4px;">
                  <span style="font-size: 11px; color: #666;">⭐ ${n.rating}</span>
                  <span style="font-size: 11px; color: #666;">📦 ${n.orders} sold</span>
                </div>
              </div>
            </div>
          </div>
        `:""}
        
        <!-- Savings Badge -->
        ${o?`
          <div style="background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; padding: 12px; border-radius: 8px; text-align: center; margin-bottom: 15px;">
            <div style="font-size: 12px; opacity: 0.9;">You Save</div>
            <div style="font-size: 20px; font-weight: bold;">$${o.amount.toFixed(2)} (${o.percentage}%)</div>
          </div>
        `:""}
        
        <!-- Action Buttons -->
        <div style="display: flex; gap: 8px;">
          ${n?`
            <button onclick="window.open('${n.affiliateUrl}', '_blank')" style="flex: 1; background: linear-gradient(135deg, #ff6b6b, #ee5a24); color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: transform 0.2s;">
              🛒 Buy on AliExpress
            </button>
          `:""}
          <button onclick="navigator.clipboard.writeText('${(n==null?void 0:n.affiliateUrl)||t.url}'); this.textContent='✓ Copied!'; setTimeout(() => this.textContent='📋 Copy Link', 2000)" style="background: #f8f9fa; color: #333; border: 1px solid #dee2e6; padding: 12px; border-radius: 8px; cursor: pointer; transition: background 0.2s;">
            📋 Copy Link
          </button>
        </div>
      </div>
    `}
  `,c.isVisible=!0}function B(e){if(s)return;s={element:e,isDragging:!1,startX:0,startY:0,initialX:0,initialY:0};const t=e.querySelector('div[style*="cursor: move"]');t&&(t.addEventListener("mousedown",O),document.addEventListener("mousemove",q),document.addEventListener("mouseup",D))}function O(e){if(!s)return;s.isDragging=!0,s.startX=e.clientX,s.startY=e.clientY;const t=s.element.getBoundingClientRect();s.initialX=t.left,s.initialY=t.top,s.element.style.transition="none"}function q(e){if(!(s!=null&&s.isDragging))return;e.preventDefault();const t=e.clientX-s.startX,n=e.clientY-s.startY,o=s.initialX+t,r=s.initialY+n,i=window.innerWidth-s.element.offsetWidth,d=window.innerHeight-s.element.offsetHeight,l=Math.max(0,Math.min(o,i)),a=Math.max(0,Math.min(r,d));s.element.style.left=`${l}px`,s.element.style.top=`${a}px`,c.position={x:l,y:a}}function D(){s&&(s.isDragging=!1,s.element.style.transition="",chrome.storage.sync.set({[y.POSITION]:c.position}))}window.toggleMinimize=()=>{c.isMinimized=!c.isMinimized;const e=document.getElementById(f);e&&k(e)};
