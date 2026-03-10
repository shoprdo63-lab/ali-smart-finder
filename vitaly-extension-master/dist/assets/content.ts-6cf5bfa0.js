const I="ali_smart_finder_v1",_="https://your-app.onrender.com",h="wc-price-hunter-box",v={CONFIG:"wc_price_hunter_config",POSITION:"wc_price_hunter_position",LAST_SEARCH:"wc_price_hunter_last_search"},P={backendApiUrl:_,enabled:!0,autoShow:!0};let p={isVisible:!1,isMinimized:!1,isLoading:!1,position:{x:20,y:150}},b={...P},l=null;(function(){const t=window.location.host;U().then(()=>{if(!b.enabled){console.log("WC Price Hunter: Extension disabled");return}t.includes("amazon")&&(F(),B())}).catch(i=>{console.error("WC Price Hunter initialization error:",i)})})();async function F(){try{document.querySelector('.s-main-slot, [data-component-type="s-search-result"]')!==null?await k():await C()}catch(t){console.error("WC Price Hunter (Amazon handler):",t)}}async function k(){const t=document.querySelectorAll('.s-main-slot .s-result-item, [data-component-type="s-search-result"]');console.log(`WC Price Hunter: Found ${t.length} products on search page`),t.forEach((i,e)=>{const o=L(i);o&&M(i,o,e)})}function L(t){var i,e;try{const o=t.querySelector('h2 a span, .s-size-mini span, [data-cy="title-recipe-title"]'),a=((i=o==null?void 0:o.textContent)==null?void 0:i.trim())||"";if(!a)return null;const n=t.querySelector(".a-price .a-offscreen, .a-price-whole"),c=(((e=n==null?void 0:n.textContent)==null?void 0:e.trim())||"").replace(/[^\d.,]/g,"");let s=t.getAttribute("data-asin")||"";if(!s){const g=t.querySelector('a[href*="/dp/"]');if(g){const f=g.href.match(/\/dp\/([A-Z0-9]{10})/);s=f?f[1]:""}}const d=t.querySelector('h2 a, a[href*="/dp/"]'),m=d?d.href.startsWith("http")?d.href:`https://www.amazon.com${d.getAttribute("href")}`:"",u=t.querySelector(".s-image"),x=(u==null?void 0:u.src)||"";return{title:a,price:c,currency:"USD",url:m||window.location.href,asin:s,imageUrl:x}}catch(o){return console.error("Error extracting product from search item:",o),null}}function M(t,i,e){if(t.querySelector(".wc-price-hunter-panel"))return;const a=document.createElement("div");a.className="wc-price-hunter-panel",a.dataset.asin=i.asin,a.dataset.index=String(e),Object.assign(a.style,{marginTop:"10px",padding:"12px",background:"linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",borderRadius:"8px",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',fontSize:"13px",zIndex:"1000"}),a.innerHTML=`
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
  `;const n=a.querySelector(".wc-hunter-search-btn");n&&n.addEventListener("click",()=>{z(i)}),t.appendChild(a)}function B(){new MutationObserver(i=>{let e=!1,o=!1;i.forEach(a=>{a.addedNodes.forEach(n=>{var r,c,s,d;n instanceof HTMLElement&&(((r=n.matches)!=null&&r.call(n,'.s-result-item, [data-component-type="s-search-result"]')||(c=n.querySelector)!=null&&c.call(n,'.s-result-item, [data-component-type="s-search-result"]'))&&(e=!0),((s=n.matches)!=null&&s.call(n,"#productTitle, #ppd, #centerCol, #title_feature_div, #apex_desktop, #corePrice_feature_div")||(d=n.querySelector)!=null&&d.call(n,"#productTitle, #ppd, #centerCol, #buybox_feature_div"))&&(o=!0))})}),clearTimeout(window.__wcHunterTimeout),e&&(window.__wcHunterTimeout=setTimeout(()=>{k()},500)),o&&(window.__wcHunterTimeout=setTimeout(()=>{const a=document.querySelector("#productTitle, #ppd")!==null,n=document.getElementById(h);a&&!n&&b.autoShow&&C()},800))}).observe(document.body,{childList:!0,subtree:!0}),console.log("WC Price Hunter: MutationObserver active - watching for Amazon products")}async function C(){const t=T();if(!t){console.log("WC Price Hunter: Could not extract Amazon product info");return}console.log("WC Price Hunter: Found Amazon product:",t.title),b.autoShow?await z(t):q(t)}function H(t,i){if(!i)return"";if(i.includes("s.click.aliexpress.com")||i.includes("aff_short_key"))return i;const e=i.match(/\/item\/(\d+)\.html/);return e?`https://www.aliexpress.com/item/${e[1]}.html`:i.startsWith("http://")||i.startsWith("https://")?i:`https://www.aliexpress.com${i.startsWith("/")?"":"/"}${i}`}function $(t){let i=t.replace(/[|:\-]/g," ");[/\b(glacier|charcoal|white|black|red|blue|green|yellow|orange|purple|pink|gray|grey|silver|gold)\b/gi,/\b(bundle|pack|set|kit)\b/gi].forEach(n=>{i=i.replace(n," ")});const a=i.split(/\s+/).filter(n=>n.length>0).slice(0,4).join(" ");return console.log(`🧹 Sanitized: "${t}" → "${a}"`),a.trim()}async function U(){return new Promise(t=>{chrome.storage.sync.get([v.CONFIG],i=>{i[v.CONFIG]&&(b={...P,...i[v.CONFIG]}),t()})})}function T(){var t,i,e,o;try{const a=["#productTitle",'[data-automation-id="title"]',".product-title","h1.a-size-large"];let n=null;for(const y of a)if(n=document.querySelector(y),(t=n==null?void 0:n.textContent)!=null&&t.trim())break;const r=((i=n==null?void 0:n.textContent)==null?void 0:i.trim())||"";if(!r)return null;const c=[".a-price .a-offscreen",".a-price-whole",'[data-automation-id="price"]',".priceToPay"];let s=null;for(const y of c)if(s=document.querySelector(y),(e=s==null?void 0:s.textContent)!=null&&e.trim())break;const m=(((o=s==null?void 0:s.textContent)==null?void 0:o.trim())||"").replace(/[^\d.,]/g,""),u=window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/),x=u?u[1]:"",g=document.querySelector("#landingImage, #imgBlkFront"),f=(g==null?void 0:g.src)||void 0;return{title:r,price:m,currency:"USD",url:window.location.href,asin:x,imageUrl:f}}catch(a){return console.error("Error extracting Amazon product:",a),null}}async function O(t){var i;try{console.log("🔍 Searching AliExpress for:",t);const e=$(t),o=`${b.backendApiUrl}/api/search?query=${encodeURIComponent(e)}`,a=await fetch(o,{method:"GET",headers:{"Content-Type":"application/json"}});if(!a.ok)throw new Error(`API request failed: ${a.status}`);const n=await a.json();if(console.log("📦 API Response:",n),!n.success||!n.data)throw new Error(((i=n.error)==null?void 0:i.message)||"No matching product found");const r=n.data;return{aliPrice:parseFloat(r.aliPrice)||0,aliUrl:r.aliUrl||"",image:r.image||"",title:r.aliTitle||"",aliTitle:r.aliTitle||"",totalCost:r.totalCost||0,shipping:r.shipping||0,originalPrice:parseFloat(r.originalPrice)||0,discount:r.discount||0,rating:r.rating||0,orders:r.orders||0,seller:r.seller||"AliExpress",matchConfidence:r.matchConfidence||0,coupon:r.coupon||null,alternatives:r.alternatives||[]}}catch(e){throw console.error("❌ Error matching Amazon product:",e),e}}async function z(t){var i;try{w({isLoading:!0});const e=await O(t.title);if(!e){w({isLoading:!1,error:"No AliExpress match found"});return}const o=parseFloat((t.price||"0").replace(/[^\d.]/g,""))||0,a=parseFloat(String(e.aliPrice||e.totalCost||0))||0;let n;if(a>0&&a<o){const S=o-a,E=Math.round(S/o*100);n={amount:S,percentage:E}}const r=e.aliUrl||"",c=r?H(I,r):"",s=((i=r.match(/\/item\/(\d+)\.html/))==null?void 0:i[1])||"",d=(e.aliTitle||e.title||"AliExpress Product").substring(0,100),m=String(e.aliPrice||0),u=String(e.originalPrice||e.aliPrice||0),x=typeof e.rating=="string"?parseFloat(e.rating)||0:e.rating||0,g=typeof e.orders=="string"?parseInt(e.orders)||0:e.orders||0,f={id:s,title:d,salePrice:m,originalPrice:u,currency:"USD",imageUrl:e.image||"",productUrl:r,affiliateUrl:c||r,discount:e.discount||0,rating:x,orders:g,packageType:"Standard",seller:{name:e.seller||"AliExpress",rating:x||4.5}};w({isLoading:!1,comparison:{amazon:t,aliexpress:[f],cheapestAliExpress:f,savings:n}})}catch(e){console.error("Error in price comparison:",e),w({isLoading:!1,error:e instanceof Error?e.message:"Unknown error"})}}function q(t){const i=document.getElementById("wc-price-hunter-toggle");i&&i.remove();const e=document.createElement("div");e.id="wc-price-hunter-toggle",e.innerHTML="💰",Object.assign(e.style,{position:"fixed",top:"150px",right:"20px",width:"50px",height:"50px",background:"linear-gradient(135deg, #667eea 0%, #764ba2 100%)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px",cursor:"pointer",zIndex:"1000000",boxShadow:"0 4px 15px rgba(0,0,0,0.2)",transition:"all 0.3s ease"}),e.addEventListener("mouseenter",()=>{e.style.transform="scale(1.1)"}),e.addEventListener("mouseleave",()=>{e.style.transform="scale(1)"}),e.addEventListener("click",()=>{z(t),e.remove()}),document.body.appendChild(e)}function w(t){p={...p,...t};let i=document.getElementById(h);i||(i=D(),document.body.appendChild(i)),A(i),p.isVisible?(i.style.display="block",Y(i)):i.style.display="none"}function D(){const t=document.createElement("div");return t.id=h,Object.assign(t.style,{position:"fixed",top:`${p.position.y}px`,left:`${p.position.x}px`,width:"380px",background:"linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",borderRadius:"16px",boxShadow:"0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)",zIndex:"1000000",fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',fontSize:"14px",display:"none",overflow:"hidden",border:"1px solid rgba(102, 126, 234, 0.3)"}),t}function A(t){if(p.isLoading){t.innerHTML=`
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
    `;return}if(p.error){t.innerHTML=`
      <div style="padding: 25px; text-align: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);">
        <div style="color: #fc8181; font-size: 32px; margin-bottom: 12px;">⚠️</div>
        <p style="margin: 0; color: #a0aec0; font-size: 14px;">${p.error}</p>
        <button onclick="this.closest('#${h}').remove()" style="margin-top: 15px; padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Close</button>
      </div>
    `;return}if(!p.comparison)return;const{amazon:i,cheapestAliExpress:e,savings:o}=p.comparison;t.innerHTML=`
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 18px; cursor: move; border-bottom: 1px solid rgba(255,255,255,0.1);">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="font-weight: bold; font-size: 18px; display: flex; align-items: center; gap: 8px;">
          � Price Hunter
        </div>
        <div style="display: flex; gap: 8px;">
          <button onclick="toggleMinimize()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 14px; transition: all 0.2s;">${p.isMinimized?"📈":"📉"}</button>
          <button onclick="document.getElementById('${h}').remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 14px; transition: all 0.2s;">✕</button>
        </div>
      </div>
    </div>
    
    ${p.isMinimized?`
      <div style="padding: 20px; text-align: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);">
        <div style="font-size: 13px; color: #a0aec0; margin-bottom: 8px;">Amazon vs AliExpress</div>
        ${o?`
          <div style="font-size: 24px; font-weight: bold; color: #48bb78; text-shadow: 0 0 20px rgba(72, 187, 120, 0.5);">Save ${o.percentage}%</div>
          <div style="font-size: 16px; color: #48bb78; margin-top: 4px;">$${o.amount.toFixed(2)}</div>
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
        ${o?`
          <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 16px; border-radius: 12px; text-align: center; margin-bottom: 18px; box-shadow: 0 10px 30px rgba(72, 187, 120, 0.4), inset 0 1px 0 rgba(255,255,255,0.2);">
            <div style="font-size: 13px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">💰 You Save</div>
            <div style="font-size: 28px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">$${o.amount.toFixed(2)}</div>
            <div style="font-size: 16px; opacity: 0.9; margin-top: 4px;">${o.percentage}% OFF</div>
          </div>
        `:""}
        
        <!-- Action Buttons -->
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; gap: 10px;">
            ${e?`
              <button onclick="window.open('${e.affiliateUrl}', '_blank')" style="flex: 1; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 14px; border-radius: 10px; cursor: pointer; font-weight: bold; font-size: 15px; transition: all 0.2s; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                🛒 Buy on AliExpress
              </button>
            `:""}
            <button onclick="navigator.clipboard.writeText('${(e==null?void 0:e.affiliateUrl)||i.url}'); this.textContent='✓ Copied!'; this.style.background='linear-gradient(135deg, #48bb78 0%, #38a169 100%)'; setTimeout(() => { this.textContent='📋'; this.style.background='rgba(255,255,255,0.1)'; }, 2000)" style="background: rgba(255,255,255,0.1); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.2); padding: 14px; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.2s; min-width: 50px;">
              📋
            </button>
          </div>
          <div style="display: flex; gap: 10px;">
            <button id="view-full-comparison-btn" style="flex: 1; background: rgba(255,255,255,0.1); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.2); padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.2s;">
              � View Full Comparison
            </button>
            <button id="download-images-btn" style="flex: 1; background: rgba(255,255,255,0.1); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.2); padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.2s;">
              🖼️ Download Images
            </button>
          </div>
        </div>
      </div>
    `}
  `,p.isVisible=!0,setTimeout(()=>{const a=t.querySelector("#view-full-comparison-btn"),n=t.querySelector("#download-images-btn");a&&a.addEventListener("click",()=>{if(e){const r=$(i.title),c=`https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(r)}`;window.open(c,"_blank")}}),n&&n.addEventListener("click",async()=>{try{const r=n;r.textContent="⏳ Downloading...";const c=[{url:i.imageUrl,name:"amazon-product.jpg"},{url:e==null?void 0:e.imageUrl,name:"aliexpress-product.jpg"}].filter(s=>s.url);for(const s of c){const d=document.createElement("a");d.href=s.url,d.download=s.name,d.target="_blank",document.body.appendChild(d),d.click(),document.body.removeChild(d),await new Promise(m=>setTimeout(m,500))}r.textContent="✓ Downloaded!",setTimeout(()=>{r.textContent="🖼️ Download Images"},2e3)}catch(r){console.error("Error downloading images:",r);const c=n;c.textContent="❌ Error",setTimeout(()=>{c.textContent="🖼️ Download Images"},2e3)}})},100)}function Y(t){if(l)return;l={element:t,isDragging:!1,startX:0,startY:0,initialX:0,initialY:0};const i=t.querySelector('div[style*="cursor: move"]');i&&(i.addEventListener("mousedown",R),document.addEventListener("mousemove",j),document.addEventListener("mouseup",N))}function R(t){if(!l)return;l.isDragging=!0,l.startX=t.clientX,l.startY=t.clientY;const i=l.element.getBoundingClientRect();l.initialX=i.left,l.initialY=i.top,l.element.style.transition="none"}function j(t){if(!(l!=null&&l.isDragging))return;t.preventDefault();const i=t.clientX-l.startX,e=t.clientY-l.startY,o=l.initialX+i,a=l.initialY+e,n=window.innerWidth-l.element.offsetWidth,r=window.innerHeight-l.element.offsetHeight,c=Math.max(0,Math.min(o,n)),s=Math.max(0,Math.min(a,r));l.element.style.left=`${c}px`,l.element.style.top=`${s}px`,p.position={x:c,y:s}}function N(){l&&(l.isDragging=!1,l.element.style.transition="",chrome.storage.sync.set({[v.POSITION]:p.position}))}chrome.runtime.onMessage.addListener((t,i,e)=>{if(t.action==="getProductInfo"){try{const o=T();o&&o.title?e({product:{title:o.title,price:o.price,asin:o.asin,image:o.imageUrl||""}}):e({product:null,error:"No product found on this page"})}catch(o){e({product:null,error:o.message||"Unknown error"})}return!0}});window.toggleMinimize=()=>{p.isMinimized=!p.isMinimized;const t=document.getElementById(h);t&&A(t)};
