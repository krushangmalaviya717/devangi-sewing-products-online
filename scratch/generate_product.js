const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const indexPath = path.join(rootDir, 'index.html');
const productPath = path.join(rootDir, 'product.html');

const content = fs.readFileSync(indexPath, 'utf-8');

const mainStart = content.indexOf('<main>');
const mainEnd = content.indexOf('</main>') + '</main>'.length;

const beforeMain = content.substring(0, mainStart);
const afterMain = content.substring(mainEnd);

const newMain = `
  <main>
    <div class="product-container" style="margin-top: 30px; margin-bottom: 60px;">
      <div class="container" style="display: flex; flex-direction: row; gap: 50px; flex-wrap: wrap;">
        
        <!-- Left Side: Image Gallery -->
        <div class="product-gallery" style="flex: 1; min-width: 300px; display: flex; gap: 15px;">
            <div class="thumbnails" style="display: flex; flex-direction: column; gap: 10px; width: 80px;">
                <!-- 5 mocked thumbnails mapping to the main image -->
                <script>
                    for(let i=0; i<5; i++){
                        document.write('<img src="" class="pdp-thumb" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; border: ' + (i===0 ? '2px solid var(--onyx)' : '1px solid var(--cultured)') + '; cursor: pointer; background-color: #f7f7f7;" alt="thumb">');
                    }
                </script>
            </div>
            <div class="main-image-container" style="flex: 1; background-color: #f7f7f7; border-radius: 12px; overflow: hidden; display: flex; align-items: center; justify-content: center; position: relative;">
                <img id="pdp-image" src="" alt="Product Image" style="width: 100%; height: auto; max-height: 600px; object-fit: contain;">
                <button style="position: absolute; bottom: 20px; right: 20px; background: white; border-radius: 50%; width: 40px; height: 40px; display:flex; align-items:center; justify-content:center; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <ion-icon name="search-outline"></ion-icon>
                </button>
            </div>
        </div>

        <!-- Right Side: Details -->
        <div class="product-details" style="flex: 1; min-width: 300px;">
            <h1 id="pdp-title" style="font-size: 2.2rem; font-weight: bold; color: var(--onyx); margin-bottom: 10px; line-height: 1.2;">Loading...</h1>
            
            <div style="margin-bottom: 30px;">
                <p id="pdp-price" style="font-size: 1.4rem; color: var(--onyx);"></p>
                <p style="font-size: 0.85rem; color: var(--sonic-silver); margin-top: 5px;">Tax excluded.</p>
            </div>

            <div style="margin-bottom: 25px;">
                <p style="font-size: 0.95rem; color: var(--sonic-silver); margin-bottom: 8px;">Select Your Size: <span style="font-weight: bold; color: var(--onyx);">All Size</span></p>
                <select style="width: 100%; padding: 12px 15px; border: 1px solid var(--cultured); border-radius: 8px; font-size: 1rem; color: var(--onyx); background-color: #fafafa; outline: none;">
                    <option>All Size</option>
                    <option>S</option>
                    <option>M</option>
                    <option>L</option>
                    <option>XL</option>
                </select>
            </div>

            <div style="margin-bottom: 30px;">
                <p style="font-size: 0.95rem; color: var(--sonic-silver); margin-bottom: 8px;">Quantity:</p>
                <div style="display: flex; align-items: center; border: 1px solid var(--cultured); border-radius: 30px; width: fit-content; background-color: #fafafa; padding: 5px 15px;">
                    <button style="font-size: 1.2rem; padding: 0 10px; color: var(--onyx);">-</button>
                    <input type="number" value="1" min="1" style="width: 40px; text-align: center; border: none; background: transparent; font-size: 1rem; color: var(--onyx); outline: none;">
                    <button style="font-size: 1.2rem; padding: 0 10px; color: var(--onyx);">+</button>
                </div>
            </div>

            <p style="font-size: 0.9rem; color: var(--sonic-silver); margin-bottom: 20px;">
                Order Only <span style="font-weight:bold; color:var(--onyx);">All Size</span> Farma and Get a <span style="font-weight:bold; color:var(--onyx);">Free Blouse Kit</span> (offer valid till <span style="font-weight:bold; color:var(--onyx);">25-04-2026</span>).
            </p>

            <div style="display: flex; gap: 15px; margin-bottom: 40px; flex-wrap: wrap;">
                <button style="flex:1; min-width: 200px; background-color: #2c2c2c; color: white; border-radius: 30px; padding: 15px 0; font-weight: bold; font-size: 1rem; transition: background 0.2s;" onmouseover="this.style.backgroundColor='#black'" onmouseout="this.style.backgroundColor='#2c2c2c'">
                    Add to cart
                </button>
                <button style="flex:1; min-width: 200px; background-color: #c4801e; color: white; border-radius: 30px; padding: 15px 0; font-weight: bold; font-size: 1rem; display:flex; justify-content:center; align-items:center; gap: 10px; transition: background 0.2s;" onmouseover="this.style.backgroundColor='#a36916'" onmouseout="this.style.backgroundColor='#c4801e'">
                    Buy It Now
                    <div style="display:flex; gap: 4px; background: white; padding: 2px 5px; border-radius: 10px;">
                        <img src="./assets/images/payment.png" style="height: 12px; object-fit: contain;">
                    </div>
                </button>
            </div>

            <!-- Meta details block -->
            <div style="border: 1px solid var(--cultured); border-radius: 8px; overflow: hidden;">
                <div style="padding: 15px; border-bottom: 1px solid var(--cultured); display: flex; align-items: center; gap: 10px;">
                    <div style="color: #00b67a; font-size: 1.1rem; display:flex;">
                        <ion-icon name="star"></ion-icon><ion-icon name="star"></ion-icon><ion-icon name="star"></ion-icon><ion-icon name="star"></ion-icon><ion-icon name="star"></ion-icon>
                    </div>
                    <span style="font-weight: bold; font-size: 0.9rem; color: var(--onyx);">Excellent 4.9/5</span>
                </div>
                <div style="padding: 15px; background-color: #f7f7f7; border-bottom: 1px solid var(--cultured); display: flex; align-items: center; gap: 10px; color: var(--onyx);">
                    <ion-icon name="airplane-outline" style="font-size: 1.2rem;"></ion-icon>
                    <span style="font-size: 0.9rem;"><span style="font-weight: bold;">Free delivery</span> on all prepaid orders</span>
                </div>
                <div style="padding: 15px; background-color: #f7f7f7; border-bottom: 1px solid var(--cultured); display: flex; align-items: center; justify-content: space-between; color: var(--onyx); cursor: pointer;">
                    <div style="display:flex; align-items:center; gap: 10px;">
                        <ion-icon name="cube-outline" style="font-size: 1.2rem;"></ion-icon>
                        <span style="font-size: 0.9rem; font-weight: bold;">Delivery information</span>
                    </div>
                    <ion-icon name="chevron-down-outline"></ion-icon>
                </div>
                <div style="padding: 15px; background-color: #f7f7f7; display: flex; align-items: center; gap: 10px;">
                    <img src="./assets/images/payment.png" style="height: 20px; mix-blend-mode: multiply;">
                </div>
            </div>

        </div>
      </div>
    </div>
  </main>
`;

let finalContent = beforeMain + newMain + afterMain;

// Change title
finalContent = finalContent.replace('<title>Anon - eCommerce Website</title>', '<title>Product Details - Devangi Products</title>');
finalContent = finalContent.replace('<title>Devangi Products - eCommerce Website</title>', '<title>Product Details - Devangi Products</title>');

// Replace dynamic-products.js with product.js
finalContent = finalContent.replace('<script src="./assets/js/dynamic-products.js"></script>', '<script src="./assets/js/product.js"></script>');

fs.writeFileSync(productPath, finalContent);
console.log('product.html successfully regenerated');
