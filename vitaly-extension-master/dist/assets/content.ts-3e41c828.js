const $="ali_smart_finder_v1",A="http://localhost:3000",m="wc-price-hunter-box",y={CONFIG:"wc_price_hunter_config",POSITION:"wc_price_hunter_position",LAST_SEARCH:"wc_price_hunter_last_search"},S={backendApiUrl:A,enabled:!0,autoShow:!0};let c={isVisible:!1,isMinimized:!1,isLoading:!1,position:{x:20,y:150}},f={...S},a=null;(function(){const t=window.location.host;U().then(()=>{if(!f.enabled){console.log("WC Price Hunter: Extension disabled");return}t.includes("amazon")&&(C(),I())}).catch(r=>{console.error("WC Price Hunter initialization error:",r)})})();async function C(){try{document.querySelector('.s-main-slot, [data-component-type="s-search-result"]')!==null?await k():await P()}catch(t){console.error("WC Price Hunter (Amazon handler):",t)}}async function k(){const t=document.querySelectorAll('.s-main-slot .s-result-item, [data-component-type="s-search-result"]');console.log(`WC Price Hunter: Found ${t.length} products on search page`),t.forEach((r,i)=>{const e=E(r);e&&T(r,e,i)})}function E(t){var r,i;try{const e=t.querySelector('h2 a span, .s-size-mini span, [data-cy="title-recipe-title"]'),o=((r=e==null?void 0:e.textContent)==null?void 0:r.trim())||"";if(!o)return null;const n=t.querySelector(".a-price .a-offscreen, .a-price-whole"),l=(((i=n==null?void 0:n.textContent)==null?void 0:i.trim())||"").replace(/[^\d.,]/g,"");let s=t.getAttribute("data-asin")||"";if(!s){const u=t.querySelector('a[href*="/dp/"]');if(u){const h=u.href.match(/\/dp\/([A-Z0-9]{10})/);s=h?h[1]:""}}const p=t.querySelector('h2 a, a[href*="/dp/"]'),x=p?p.href.startsWith("http")?p.href:`https://www.amazon.com${p.getAttribute("href")}`:"",g=t.querySelector(".s-image"),w=(g==null?void 0:g.src)||"";return{title:o,price:l,currency:"USD",url:x||window.location.href,asin:s,imageUrl:w}}catch(e){return console.error("Error extracting product from search item:",e),null}}function T(t,r,i){if(t.querySelector(".wc-price-hunter-panel"))return;const o=document.createElement("div");o.className="wc-price-hunter-panel",o.dataset.asin=r.asin,o.dataset.index=String(i),Object.assign(o.style,{marginTop:"10px",padding:"12px",background:"linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",borderRadius:"8px",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',fontSize:"13px",zIndex:"1000"}),o.innerHTML=`
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
  `;const n=o.querySelector(".wc-hunter-search-btn");n&&n.addEventListener("click",()=>{z(r)}),t.appendChild(o)}function I(){new MutationObserver(r=>{let i=!1,e=!1;r.forEach(o=>{o.addedNodes.forEach(n=>{var d,l,s,p;n instanceof HTMLElement&&(((d=n.matches)!=null&&d.call(n,'.s-result-item, [data-component-type="s-search-result"]')||(l=n.querySelector)!=null&&l.call(n,'.s-result-item, [data-component-type="s-search-result"]'))&&(i=!0),((s=n.matches)!=null&&s.call(n,"#productTitle, #ppd, #centerCol, #title_feature_div, #apex_desktop, #corePrice_feature_div")||(p=n.querySelector)!=null&&p.call(n,"#productTitle, #ppd, #centerCol, #buybox_feature_div"))&&(e=!0))})}),clearTimeout(window.__wcHunterTimeout),i&&(window.__wcHunterTimeout=setTimeout(()=>{k()},500)),e&&(window.__wcHunterTimeout=setTimeout(()=>{const o=document.querySelector("#productTitle, #ppd")!==null,n=document.getElementById(m);o&&!n&&f.autoShow&&P()},800))}).observe(document.body,{childList:!0,subtree:!0}),console.log("WC Price Hunter: MutationObserver active - watching for Amazon products")}async function P(){const t=F();if(!t){console.log("WC Price Hunter: Could not extract Amazon product info");return}console.log("WC Price Hunter: Found Amazon product:",t.title),f.autoShow?await z(t):H(t)}function L(t,r){const i=r.match(/\/item\/(\d+)\.html/),e=i?i[1]:"";if(e)return`https://s.click.aliexpress.com/deep_link.htm?aff_short_key=${t}&aff_key=${t}&dl_target_url=https://www.aliexpress.com/item/${e}.html`;const o=encodeURIComponent(r);return`https://s.click.aliexpress.com/deep_link.htm?aff_short_key=${t}&dl_target_url=${o}`}async function U(){return new Promise(t=>{chrome.storage.sync.get([y.CONFIG],r=>{r[y.CONFIG]&&(f={...S,...r[y.CONFIG]}),t()})})}function F(){var t,r,i,e;try{const o=["#productTitle",'[data-automation-id="title"]',".product-title","h1.a-size-large"];let n=null;for(const v of o)if(n=document.querySelector(v),(t=n==null?void 0:n.textContent)!=null&&t.trim())break;const d=((r=n==null?void 0:n.textContent)==null?void 0:r.trim())||"";if(!d)return null;const l=[".a-price .a-offscreen",".a-price-whole",'[data-automation-id="price"]',".priceToPay"];let s=null;for(const v of l)if(s=document.querySelector(v),(i=s==null?void 0:s.textContent)!=null&&i.trim())break;const x=(((e=s==null?void 0:s.textContent)==null?void 0:e.trim())||"").replace(/[^\d.,]/g,""),g=window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/),w=g?g[1]:"",u=document.querySelector("#landingImage, #imgBlkFront"),h=(u==null?void 0:u.src)||void 0;return{title:d,price:x,currency:"USD",url:window.location.href,asin:w,imageUrl:h}}catch(o){return console.error("Error extracting Amazon product:",o),null}}async function M(t){var r;try{const i=await fetch(`${f.backendApiUrl}/api/search?query=${encodeURIComponent(t)}`,{method:"GET",headers:{"Content-Type":"application/json"}});if(!i.ok)throw new Error(`API request failed: ${i.status}`);const e=await i.json();if(!e.success||!e.data)throw new Error(((r=e.error)==null?void 0:r.message)||"No matching product found");return e.data}catch(i){throw console.error("Error matching Amazon product:",i),i}}async function z(t){var r,i;try{b({isLoading:!0});const e=await M(t.title);if(!e){b({isLoading:!1,error:"No AliExpress match found"});return}const o=parseFloat(t.price.replace(/[^\d.]/g,"")),n=parseFloat(String(e.aliPrice));let d;if(n<o){const p=o-n,x=Math.round(p/o*100);d={amount:p,percentage:x}}const l=L($,e.aliUrl),s={amazon:t,aliexpress:[{id:((r=e.aliUrl.match(/\/item\/(\d+)\.html/))==null?void 0:r[1])||"",title:e.title,salePrice:String(e.aliPrice),originalPrice:e.originalPrice?String(e.originalPrice):String(e.aliPrice),currency:"USD",imageUrl:e.image,productUrl:e.aliUrl,affiliateUrl:l,discount:e.discount||0,rating:typeof e.rating=="string"?parseFloat(e.rating)||0:e.rating||0,orders:typeof e.orders=="string"?parseInt(e.orders)||0:e.orders||0,packageType:"Standard",seller:{name:"AliExpress",rating:4.5}}],cheapestAliExpress:{id:((i=e.aliUrl.match(/\/item\/(\d+)\.html/))==null?void 0:i[1])||"",title:e.title,salePrice:String(e.aliPrice),originalPrice:e.originalPrice?String(e.originalPrice):String(e.aliPrice),currency:"USD",imageUrl:e.image,productUrl:e.aliUrl,affiliateUrl:l,discount:e.discount||0,rating:typeof e.rating=="string"?parseFloat(e.rating)||0:e.rating||0,orders:typeof e.orders=="string"?parseInt(e.orders)||0:e.orders||0,packageType:"Standard",seller:{name:"AliExpress",rating:4.5}},savings:d};b({isLoading:!1,comparison:s})}catch(e){console.error("Error in price comparison:",e),b({isLoading:!1,error:e instanceof Error?e.message:"Unknown error"})}}function H(t){const r=document.getElementById("wc-price-hunter-toggle");r&&r.remove();const i=document.createElement("div");i.id="wc-price-hunter-toggle",i.innerHTML="💰",Object.assign(i.style,{position:"fixed",top:"150px",right:"20px",width:"50px",height:"50px",background:"linear-gradient(135deg, #667eea 0%, #764ba2 100%)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px",cursor:"pointer",zIndex:"1000000",boxShadow:"0 4px 15px rgba(0,0,0,0.2)",transition:"all 0.3s ease"}),i.addEventListener("mouseenter",()=>{i.style.transform="scale(1.1)"}),i.addEventListener("mouseleave",()=>{i.style.transform="scale(1)"}),i.addEventListener("click",()=>{z(t),i.remove()}),document.body.appendChild(i)}function b(t){c={...c,...t};let r=document.getElementById(m);r||(r=B(),document.body.appendChild(r)),_(r),c.isVisible?(r.style.display="block",O(r)):r.style.display="none"}function B(){const t=document.createElement("div");return t.id=m,Object.assign(t.style,{position:"fixed",top:`${c.position.y}px`,left:`${c.position.x}px`,width:"380px",background:"linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",borderRadius:"16px",boxShadow:"0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)",zIndex:"1000000",fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',fontSize:"14px",display:"none",overflow:"hidden",border:"1px solid rgba(102, 126, 234, 0.3)"}),t}function _(t){if(c.isLoading){t.innerHTML=`
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
        <button onclick="this.closest('#${m}').remove()" style="margin-top: 15px; padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Close</button>
      </div>
    `;return}if(!c.comparison)return;const{amazon:r,cheapestAliExpress:i,savings:e}=c.comparison;t.innerHTML=`
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 18px; cursor: move; border-bottom: 1px solid rgba(255,255,255,0.1);">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="font-weight: bold; font-size: 18px; display: flex; align-items: center; gap: 8px;">
          � Price Hunter
        </div>
        <div style="display: flex; gap: 8px;">
          <button onclick="toggleMinimize()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 14px; transition: all 0.2s;">${c.isMinimized?"📈":"📉"}</button>
          <button onclick="document.getElementById('${m}').remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 14px; transition: all 0.2s;">✕</button>
        </div>
      </div>
    </div>
    
    ${c.isMinimized?`
      <div style="padding: 20px; text-align: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);">
        <div style="font-size: 13px; color: #a0aec0; margin-bottom: 8px;">Amazon vs AliExpress</div>
        ${e?`
          <div style="font-size: 24px; font-weight: bold; color: #48bb78; text-shadow: 0 0 20px rgba(72, 187, 120, 0.5);">Save ${e.percentage}%</div>
          <div style="font-size: 16px; color: #48bb78; margin-top: 4px;">$${e.amount.toFixed(2)}</div>
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
          <div style="font-size: 13px; color: #e2e8f0; margin-bottom: 10px; line-height: 1.5;">${r.title.substring(0,80)}${r.title.length>80?"...":""}</div>
          <div style="font-size: 20px; font-weight: bold; color: #fc8181;">$${r.price}</div>
        </div>
        
        <!-- AliExpress Product -->
        ${i?`
          <div style="margin-bottom: 18px;">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <img src="https://ae01.alicdn.com/kf/S8c5f5c8c4f8f4e2b8d9e6c5a8b7e6d5f.jpg" style="width: 18px; height: 18px; margin-right: 10px; border-radius: 3px;">
              <span style="font-weight: 600; color: #48bb78; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">AliExpress Deal</span>
              ${i.discount>0?`<span style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px; font-weight: 600;">-${i.discount}%</span>`:""}
            </div>
            <div style="display: flex; gap: 12px;">
              <img src="${i.imageUrl}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 10px; border: 2px solid rgba(102, 126, 234, 0.3);">
              <div style="flex: 1;">
                <div style="font-size: 13px; color: #e2e8f0; margin-bottom: 8px; line-height: 1.5;">${i.title.substring(0,60)}${i.title.length>60?"...":""}</div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="font-size: 22px; font-weight: bold; color: #48bb78; text-shadow: 0 0 10px rgba(72, 187, 120, 0.3);">$${i.salePrice}</div>
                  ${i.originalPrice!==i.salePrice?`<div style="font-size: 13px; color: #a0aec0; text-decoration: line-through;">$${i.originalPrice}</div>`:""}
                </div>
                <div style="display: flex; align-items: center; gap: 12px; margin-top: 6px;">
                  <span style="font-size: 12px; color: #ecc94b;">⭐ ${i.rating}</span>
                  <span style="font-size: 12px; color: #a0aec0;">📦 ${i.orders} sold</span>
                </div>
              </div>
            </div>
          </div>
        `:""}
        
        <!-- Savings Badge -->
        ${e?`
          <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 16px; border-radius: 12px; text-align: center; margin-bottom: 18px; box-shadow: 0 10px 30px rgba(72, 187, 120, 0.4), inset 0 1px 0 rgba(255,255,255,0.2);">
            <div style="font-size: 13px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">💰 You Save</div>
            <div style="font-size: 28px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">$${e.amount.toFixed(2)}</div>
            <div style="font-size: 16px; opacity: 0.9; margin-top: 4px;">${e.percentage}% OFF</div>
          </div>
        `:""}
        
        <!-- Action Buttons -->
        <div style="display: flex; gap: 10px;">
          ${i?`
            <button onclick="window.open('${i.affiliateUrl}', '_blank')" style="flex: 1; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 14px; border-radius: 10px; cursor: pointer; font-weight: bold; font-size: 15px; transition: all 0.2s; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
              🛒 Buy on AliExpress
            </button>
          `:""}
          <button onclick="navigator.clipboard.writeText('${(i==null?void 0:i.affiliateUrl)||r.url}'); this.textContent='✓ Copied!'; this.style.background='linear-gradient(135deg, #48bb78 0%, #38a169 100%)'; setTimeout(() => { this.textContent='📋 Copy Link'; this.style.background='rgba(255,255,255,0.1)'; }, 2000)" style="background: rgba(255,255,255,0.1); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.2); padding: 14px; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.2s; min-width: 100px;">
            📋 Copy Link
          </button>
        </div>
      </div>
    `}
  `,c.isVisible=!0}function O(t){if(a)return;a={element:t,isDragging:!1,startX:0,startY:0,initialX:0,initialY:0};const r=t.querySelector('div[style*="cursor: move"]');r&&(r.addEventListener("mousedown",q),document.addEventListener("mousemove",D),document.addEventListener("mouseup",Y))}function q(t){if(!a)return;a.isDragging=!0,a.startX=t.clientX,a.startY=t.clientY;const r=a.element.getBoundingClientRect();a.initialX=r.left,a.initialY=r.top,a.element.style.transition="none"}function D(t){if(!(a!=null&&a.isDragging))return;t.preventDefault();const r=t.clientX-a.startX,i=t.clientY-a.startY,e=a.initialX+r,o=a.initialY+i,n=window.innerWidth-a.element.offsetWidth,d=window.innerHeight-a.element.offsetHeight,l=Math.max(0,Math.min(e,n)),s=Math.max(0,Math.min(o,d));a.element.style.left=`${l}px`,a.element.style.top=`${s}px`,c.position={x:l,y:s}}function Y(){a&&(a.isDragging=!1,a.element.style.transition="",chrome.storage.sync.set({[y.POSITION]:c.position}))}window.toggleMinimize=()=>{c.isMinimized=!c.isMinimized;const t=document.getElementById(m);t&&_(t)};
