// Pages the Browser panel shows for the made-up projects, as self-contained
// HTML (no network): a store's checkout, and a notes app.

const BASE = `*{box-sizing:border-box;margin:0}body{font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1d1d1f;background:#f6f5f2}`;

export const CHECKOUT_PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>${BASE}
header{display:flex;align-items:center;justify-content:space-between;padding:14px 24px;background:#fff;border-bottom:1px solid #e7e5e0}
.logo{font-weight:700;letter-spacing:-.02em;font-size:16px}.steps{display:flex;gap:18px;color:#8a8780;font-size:12px}.steps b{color:#1d1d1f}
main{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:20px;max-width:880px;margin:24px auto;padding:0 20px}
@media (max-width:640px){main{grid-template-columns:1fr}}
.card{background:#fff;border:1px solid #e7e5e0;border-radius:12px;padding:16px}
h2{font-size:15px;margin-bottom:12px}
.item{display:flex;gap:12px;align-items:center;padding:10px 0;border-top:1px solid #f0eee9}.item:first-of-type{border-top:0}
.thumb{width:48px;height:48px;border-radius:8px;flex:none}
.name{font-weight:600}.muted{color:#8a8780;font-size:12px}.price{margin-left:auto;font-variant-numeric:tabular-nums}
.qty{display:inline-flex;border:1px solid #e7e5e0;border-radius:6px;margin-top:4px}.qty span{padding:0 8px;font-size:12px}
.row{display:flex;justify-content:space-between;padding:4px 0;font-variant-numeric:tabular-nums}.total{font-weight:700;border-top:1px solid #f0eee9;margin-top:8px;padding-top:10px}
.coupon{display:flex;gap:6px;margin:12px 0}.coupon input{flex:1;border:1px solid #e7e5e0;border-radius:8px;padding:7px 10px;font:inherit}
.btn{display:block;width:100%;border:0;border-radius:9px;padding:11px;background:#1d1d1f;color:#fff;font:600 14px inherit;margin-top:12px}
.note{display:flex;gap:8px;align-items:center;background:#eef6ee;color:#2d6a33;border-radius:8px;padding:8px 10px;font-size:12px;margin-bottom:12px}
</style></head><body>
<header><span class="logo">Northwind Supply</span><span class="steps"><b>Cart</b><span>Shipping</span><span>Payment</span><span>Review</span></span></header>
<main><section class="card"><h2>Your cart</h2>
<div class="note">✓ Signed in. The 3 items from before you signed in are still here.</div>
<div class="item"><div class="thumb" style="background:linear-gradient(135deg,#d9c7a7,#b89b6e)"></div><div><div class="name">Canvas tote</div><div class="muted">Natural · Large</div><div class="qty"><span>−</span><span>1</span><span>+</span></div></div><div class="price">$38.00</div></div>
<div class="item"><div class="thumb" style="background:linear-gradient(135deg,#9fb4c7,#5f7d99)"></div><div><div class="name">Enamel mug</div><div class="muted">Slate · 12 oz</div><div class="qty"><span>−</span><span>2</span><span>+</span></div></div><div class="price">$44.00</div></div>
<div class="item"><div class="thumb" style="background:linear-gradient(135deg,#c9d3b4,#8a9a6a)"></div><div><div class="name">Linen napkins</div><div class="muted">Sage · Set of 4</div><div class="qty"><span>−</span><span>1</span><span>+</span></div></div><div class="price">$24.99</div></div>
</section>
<aside class="card"><h2>Summary</h2>
<div class="row"><span>Subtotal</span><span>$106.99</span></div>
<div class="row"><span>SPRING15</span><span>−$16.05</span></div>
<div class="row"><span>Shipping</span><span>Free</span></div>
<div class="row total"><span>Total</span><span>$90.94</span></div>
<div class="coupon"><input placeholder="Coupon code"><button class="btn" style="width:auto;margin:0;padding:7px 12px">Apply</button></div>
<button class="btn">Continue to shipping</button></aside></main></body></html>`;

export const NOTES_PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>${BASE}
body{display:grid;grid-template-columns:220px 1fr;height:100vh;background:#fbfbfa}
nav{border-right:1px solid #ecebe8;padding:14px 10px;background:#f4f3f0}
.app{font-weight:700;padding:0 8px 12px}.n{padding:7px 8px;border-radius:7px;margin-bottom:2px}.n.on{background:#e7e5e0}.n small{display:block;color:#8a8780}
article{padding:28px 40px;max-width:640px}h1{font-size:24px;letter-spacing:-.02em;margin-bottom:6px}.meta{color:#8a8780;font-size:12px;margin-bottom:18px}
p{margin-bottom:10px}li{margin-left:18px}.sync{position:fixed;right:16px;bottom:14px;font-size:12px;color:#2d6a33;background:#eef6ee;padding:5px 9px;border-radius:999px}
</style></head><body>
<nav><div class="app">Field Notes</div><div class="n on">Trip to the coast<small>Edited just now</small></div><div class="n">Garden plan<small>Yesterday</small></div><div class="n">Reading list<small>Last week</small></div></nav>
<article><h1>Trip to the coast</h1><div class="meta">Synced · 2 devices</div>
<p>Leave early to beat the traffic. Pack the good thermos.</p><ul><li>Check the tide times</li><li>Book the cabin for two nights</li><li>Bring the field guide</li></ul></article>
<span class="sync">✓ All changes synced</span></body></html>`;
