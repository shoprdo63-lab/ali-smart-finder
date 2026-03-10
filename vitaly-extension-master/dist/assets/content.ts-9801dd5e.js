const E="ali_smart_finder_v1",T="http://localhost:3000",x="wc-price-hunter-box",v={CONFIG:"wc_price_hunter_config",POSITION:"wc_price_hunter_position",LAST_SEARCH:"wc_price_hunter_last_search"},P={backendApiUrl:T,enabled:!0,autoShow:!0};let c={isVisible:!1,isMinimized:!1,isLoading:!1,position:{x:20,y:150}},b={...P},a=null;(function(){const t=window.location.host;O().then(()=>{if(!b.enabled){console.log("WC Price Hunter: Extension disabled");return}t.includes("amazon")&&(I(),F())}).catch(i=>{console.error("WC Price Hunter initialization error:",i)})})();async function I(){try{document.querySelector('.s-main-slot, [data-component-type="s-search-result"]')!==null?await k():await $()}catch(t){console.error("WC Price Hunter (Amazon handler):",t)}}async function k(){const t=document.querySelectorAll('.s-main-slot .s-result-item, [data-component-type="s-search-result"]');console.log(`WC Price Hunter: Found ${t.length} products on search page`),t.forEach((i,e)=>{const r=L(i);r&&M(i,r,e)})}function L(t){var i,e;try{const r=t.querySelector('h2 a span, .s-size-mini span, [data-cy="title-recipe-title"]'),o=((i=r==null?void 0:r.textContent)==null?void 0:i.trim())||"";if(!o)return null;const n=t.querySelector(".a-price .a-offscreen, .a-price-whole"),d=(((e=n==null?void 0:n.textContent)==null?void 0:e.trim())||"").replace(/[^\d.,]/g,"");let s=t.getAttribute("data-asin")||"";if(!s){const g=t.querySelector('a[href*="/dp/"]');if(g){const f=g.href.match(/\/dp\/([A-Z0-9]{10})/);s=f?f[1]:""}}const p=t.querySelector('h2 a, a[href*="/dp/"]'),h=p?p.href.startsWith("http")?p.href:`https://www.amazon.com${p.getAttribute("href")}`:"",u=t.querySelector(".s-image"),m=(u==null?void 0:u.src)||"";return{title:o,price:d,currency:"USD",url:h||window.location.href,asin:s,imageUrl:m}}catch(r){return console.error("Error extracting product from search item:",r),null}}function M(t,i,e){if(t.querySelector(".wc-price-hunter-panel"))return;const o=document.createElement("div");o.className="wc-price-hunter-panel",o.dataset.asin=i.asin,o.dataset.index=String(e),Object.assign(o.style,{marginTop:"10px",padding:"12px",background:"linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",borderRadius:"8px",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',fontSize:"13px",zIndex:"1000"}),o.innerHTML=`
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
  `;const n=o.querySelector(".wc-hunter-search-btn");n&&n.addEventListener("click",()=>{z(i)}),t.appendChild(o)}function F(){new MutationObserver(i=>{let e=!1,r=!1;i.forEach(o=>{o.addedNodes.forEach(n=>{var l,d,s,p;n instanceof HTMLElement&&(((l=n.matches)!=null&&l.call(n,'.s-result-item, [data-component-type="s-search-result"]')||(d=n.querySelector)!=null&&d.call(n,'.s-result-item, [data-component-type="s-search-result"]'))&&(e=!0),((s=n.matches)!=null&&s.call(n,"#productTitle, #ppd, #centerCol, #title_feature_div, #apex_desktop, #corePrice_feature_div")||(p=n.querySelector)!=null&&p.call(n,"#productTitle, #ppd, #centerCol, #buybox_feature_div"))&&(r=!0))})}),clearTimeout(window.__wcHunterTimeout),e&&(window.__wcHunterTimeout=setTimeout(()=>{k()},500)),r&&(window.__wcHunterTimeout=setTimeout(()=>{const o=document.querySelector("#productTitle, #ppd")!==null,n=document.getElementById(x);o&&!n&&b.autoShow&&$()},800))}).observe(document.body,{childList:!0,subtree:!0}),console.log("WC Price Hunter: MutationObserver active - watching for Amazon products")}async function $(){const t=A();if(!t){console.log("WC Price Hunter: Could not extract Amazon product info");return}console.log("WC Price Hunter: Found Amazon product:",t.title),b.autoShow?await z(t):q(t)}function H(t,i){if(!i)return"";const e=i.match(/\/item\/(\d+)\.html/),r=e?e[1]:"";return r?`https://www.aliexpress.com/item/${r}.html`:i.startsWith("http://")||i.startsWith("https://")?i:`https://www.aliexpress.com${i.startsWith("/")?"":"/"}${i}`}async function O(){return new Promise(t=>{chrome.storage.sync.get([v.CONFIG],i=>{i[v.CONFIG]&&(b={...P,...i[v.CONFIG]}),t()})})}function A(){var t,i,e,r;try{const o=["#productTitle",'[data-automation-id="title"]',".product-title","h1.a-size-large"];let n=null;for(const y of o)if(n=document.querySelector(y),(t=n==null?void 0:n.textContent)!=null&&t.trim())break;const l=((i=n==null?void 0:n.textContent)==null?void 0:i.trim())||"";if(!l)return null;const d=[".a-price .a-offscreen",".a-price-whole",'[data-automation-id="price"]',".priceToPay"];let s=null;for(const y of d)if(s=document.querySelector(y),(e=s==null?void 0:s.textContent)!=null&&e.trim())break;const h=(((r=s==null?void 0:s.textContent)==null?void 0:r.trim())||"").replace(/[^\d.,]/g,""),u=window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/),m=u?u[1]:"",g=document.querySelector("#landingImage, #imgBlkFront"),f=(g==null?void 0:g.src)||void 0;return{title:l,price:h,currency:"USD",url:window.location.href,asin:m,imageUrl:f}}catch(o){return console.error("Error extracting Amazon product:",o),null}}async function B(t){var i;try{const e=await fetch(`${b.backendApiUrl}/api/search?query=${encodeURIComponent(t)}`,{method:"GET",headers:{"Content-Type":"application/json"}});if(!e.ok)throw new Error(`API request failed: ${e.status}`);const r=await e.json();if(!r.success||!r.data)throw new Error(((i=r.error)==null?void 0:i.message)||"No matching product found");return r.data}catch(e){throw console.error("Error matching Amazon product:",e),e}}async function z(t){var i;try{w({isLoading:!0});const e=await B(t.title);if(!e){w({isLoading:!1,error:"No AliExpress match found"});return}const r=parseFloat((t.price||"0").replace(/[^\d.]/g,""))||0,o=parseFloat(String(e.aliPrice||e.totalCost||0))||0;let n;if(o>0&&o<r){const S=r-o,_=Math.round(S/r*100);n={amount:S,percentage:_}}const l=e.aliUrl||"",d=l?H(E,l):"",s=((i=l.match(/\/item\/(\d+)\.html/))==null?void 0:i[1])||"",p=(e.aliTitle||e.title||"AliExpress Product").substring(0,100),h=String(e.aliPrice||0),u=String(e.originalPrice||e.aliPrice||0),m=typeof e.rating=="string"?parseFloat(e.rating)||0:e.rating||0,g=typeof e.orders=="string"?parseInt(e.orders)||0:e.orders||0,f={id:s,title:p,salePrice:h,originalPrice:u,currency:"USD",imageUrl:e.image||"",productUrl:l,affiliateUrl:d||l,discount:e.discount||0,rating:m,orders:g,packageType:"Standard",seller:{name:e.seller||"AliExpress",rating:m||4.5}};w({isLoading:!1,comparison:{amazon:t,aliexpress:[f],cheapestAliExpress:f,savings:n}})}catch(e){console.error("Error in price comparison:",e),w({isLoading:!1,error:e instanceof Error?e.message:"Unknown error"})}}function q(t){const i=document.getElementById("wc-price-hunter-toggle");i&&i.remove();const e=document.createElement("div");e.id="wc-price-hunter-toggle",e.innerHTML="💰",Object.assign(e.style,{position:"fixed",top:"150px",right:"20px",width:"50px",height:"50px",background:"linear-gradient(135deg, #667eea 0%, #764ba2 100%)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px",cursor:"pointer",zIndex:"1000000",boxShadow:"0 4px 15px rgba(0,0,0,0.2)",transition:"all 0.3s ease"}),e.addEventListener("mouseenter",()=>{e.style.transform="scale(1.1)"}),e.addEventListener("mouseleave",()=>{e.style.transform="scale(1)"}),e.addEventListener("click",()=>{z(t),e.remove()}),document.body.appendChild(e)}function w(t){c={...c,...t};let i=document.getElementById(x);i||(i=U(),document.body.appendChild(i)),C(i),c.isVisible?(i.style.display="block",D(i)):i.style.display="none"}function U(){const t=document.createElement("div");return t.id=x,Object.assign(t.style,{position:"fixed",top:`${c.position.y}px`,left:`${c.position.x}px`,width:"380px",background:"linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",borderRadius:"16px",boxShadow:"0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)",zIndex:"1000000",fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',fontSize:"14px",display:"none",overflow:"hidden",border:"1px solid rgba(102, 126, 234, 0.3)"}),t}function C(t){if(c.isLoading){t.innerHTML=`
      <div style="padding: 30px; text-align: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);">
        <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid rgba(102, 126, 234, 0.3); border-top: 3px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <p style="margin: 15px 0 0 0; color: #a0aec0; font-size: 14px;">Finding best AliExpress deal...</p>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;return}if(c.error){t.innerHTML=`
      <div style="padding: 25px; text-align: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);">
        <div style="color: #fc8181; font-size: 32px; margin-bottom: 12px;">⚠️</div>
        <p style="margin: 0; color: #a0aec0; font-size: 14px;">${c.error}</p>
        <button onclick="this.closest('#${x}').remove()" style="margin-top: 15px; padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Close</button>
      </div>
    `;return}if(!c.comparison)return;const{amazon:i,cheapestAliExpress:e,savings:r}=c.comparison;t.innerHTML=`
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 18px; cursor: move; border-bottom: 1px solid rgba(255,255,255,0.1);">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="font-weight: bold; font-size: 18px; display: flex; align-items: center; gap: 8px;">
          � Price Hunter
        </div>
        <div style="display: flex; gap: 8px;">
          <button onclick="toggleMinimize()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 14px; transition: all 0.2s;">${c.isMinimized?"📈":"📉"}</button>
          <button onclick="document.getElementById('${x}').remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 14px; transition: all 0.2s;">✕</button>
        </div>
      </div>
    </div>
    
    ${c.isMinimized?`
      <div style="padding: 20px; text-align: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);">
        <div style="font-size: 13px; color: #a0aec0; margin-bottom: 8px;">Amazon vs AliExpress</div>
        ${r?`
          <div style="font-size: 24px; font-weight: bold; color: #48bb78; text-shadow: 0 0 20px rgba(72, 187, 120, 0.5);">Save ${r.percentage}%</div>
          <div style="font-size: 16px; color: #48bb78; margin-top: 4px;">$${r.amount.toFixed(2)}</div>
        `:`
          <div style="font-size: 14px; color: #a0aec0;">Click to expand</div>
        `}
      </div>
    `:`
      <div style="padding: 20px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);">
        <!-- Amazon Product -->
        <div style="margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <img src="https://www.amazon.com/favicon.ico" style="width: 18px; height: 18px; margin-right: 10px; border-radius: 3px;">
            <span style="font-weight: 600; color: #a0aec0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Amazon</span>
          </div>
          <div style="font-size: 13px; color: #e2e8f0; margin-bottom: 10px; line-height: 1.5;">${i.title.substring(0,80)}${i.title.length>80?"...":""}</div>
          <div style="font-size: 20px; font-weight: bold; color: #fc8181;">$${i.price}</div>
        </div>
        
        <!-- AliExpress Product -->
        ${e?`
          <div style="margin-bottom: 18px;">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <img src="https://ae01.alicdn.com/kf/S8c5f5c8c4f8f4e2b8d9e6c5a8b7e6d5f.jpg" style="width: 18px; height: 18px; margin-right: 10px; border-radius: 3px;">
              <span style="font-weight: 600; color: #48bb78; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">AliExpress Deal</span>
              ${e.discount>0?`<span style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px; font-weight: 600;">-${e.discount}%</span>`:""}
            </div>
            <div style="display: flex; gap: 12px;">
              <img src="${e.imageUrl}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 10px; border: 2px solid rgba(102, 126, 234, 0.3);">
              <div style="flex: 1;">
                <div style="font-size: 13px; color: #e2e8f0; margin-bottom: 8px; line-height: 1.5;">${e.title.substring(0,60)}${e.title.length>60?"...":""}</div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="font-size: 22px; font-weight: bold; color: #48bb78; text-shadow: 0 0 10px rgba(72, 187, 120, 0.3);">$${e.salePrice}</div>
                  ${e.originalPrice!==e.salePrice?`<div style="font-size: 13px; color: #a0aec0; text-decoration: line-through;">$${e.originalPrice}</div>`:""}
                </div>
                <div style="display: flex; align-items: center; gap: 12px; margin-top: 6px;">
                  <span style="font-size: 12px; color: #ecc94b;">⭐ ${e.rating}</span>
                  <span style="font-size: 12px; color: #a0aec0;">📦 ${e.orders} sold</span>
                </div>
              </div>
            </div>
          </div>
        `:""}
        
        <!-- Savings Badge -->
        ${r?`
          <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 16px; border-radius: 12px; text-align: center; margin-bottom: 18px; box-shadow: 0 10px 30px rgba(72, 187, 120, 0.4), inset 0 1px 0 rgba(255,255,255,0.2);">
            <div style="font-size: 13px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">💰 You Save</div>
            <div style="font-size: 28px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">$${r.amount.toFixed(2)}</div>
            <div style="font-size: 16px; opacity: 0.9; margin-top: 4px;">${r.percentage}% OFF</div>
          </div>
        `:""}
        
        <!-- Action Buttons -->
        <div style="display: flex; gap: 10px;">
          ${e?`
            <button onclick="window.open('${e.affiliateUrl}', '_blank')" style="flex: 1; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 14px; border-radius: 10px; cursor: pointer; font-weight: bold; font-size: 15px; transition: all 0.2s; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
              🛒 Buy on AliExpress
            </button>
          `:""}
          <button onclick="navigator.clipboard.writeText('${(e==null?void 0:e.affiliateUrl)||i.url}'); this.textContent='✓ Copied!'; this.style.background='linear-gradient(135deg, #48bb78 0%, #38a169 100%)'; setTimeout(() => { this.textContent='📋 Copy Link'; this.style.background='rgba(255,255,255,0.1)'; }, 2000)" style="background: rgba(255,255,255,0.1); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.2); padding: 14px; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.2s; min-width: 100px;">
            📋 Copy Link
          </button>
        </div>
      </div>
    `}
  `,c.isVisible=!0}function D(t){if(a)return;a={element:t,isDragging:!1,startX:0,startY:0,initialX:0,initialY:0};const i=t.querySelector('div[style*="cursor: move"]');i&&(i.addEventListener("mousedown",Y),document.addEventListener("mousemove",N),document.addEventListener("mouseup",W))}function Y(t){if(!a)return;a.isDragging=!0,a.startX=t.clientX,a.startY=t.clientY;const i=a.element.getBoundingClientRect();a.initialX=i.left,a.initialY=i.top,a.element.style.transition="none"}function N(t){if(!(a!=null&&a.isDragging))return;t.preventDefault();const i=t.clientX-a.startX,e=t.clientY-a.startY,r=a.initialX+i,o=a.initialY+e,n=window.innerWidth-a.element.offsetWidth,l=window.innerHeight-a.element.offsetHeight,d=Math.max(0,Math.min(r,n)),s=Math.max(0,Math.min(o,l));a.element.style.left=`${d}px`,a.element.style.top=`${s}px`,c.position={x:d,y:s}}function W(){a&&(a.isDragging=!1,a.element.style.transition="",chrome.storage.sync.set({[v.POSITION]:c.position}))}chrome.runtime.onMessage.addListener((t,i,e)=>{if(t.action==="getProductInfo"){try{const r=A();r&&r.title?e({product:{title:r.title,price:r.price,asin:r.asin,image:r.imageUrl||""}}):e({product:null,error:"No product found on this page"})}catch(r){e({product:null,error:r.message||"Unknown error"})}return!0}});window.toggleMinimize=()=>{c.isMinimized=!c.isMinimized;const t=document.getElementById(x);t&&C(t)};
