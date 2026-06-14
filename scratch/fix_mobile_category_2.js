const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'assets', 'css', 'style-prefix.css');
const cssPath2 = path.join(__dirname, '..', 'assets', 'css', 'style.css');

const newMobileFix = `
/* Mobile Category Item Fix */
@media (max-width: 570px) {
  .category-item {
    min-width: calc(50% - 15px) !important;
    flex-direction: column !important;
    justify-content: center !important;
    text-align: center !important;
    padding: 10px !important;
    border-radius: 10px !important;
  }
  .category-img-box {
    padding: 6px !important;
    width: 36px !important;
    height: 36px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    margin: 0 auto !important;
  }
  .category-img-box img {
    max-width: 100% !important;
    max-height: 100% !important;
  }
  .category-content-flex {
    flex-direction: column !important;
    gap: 2px !important;
    justify-content: center !important;
    margin-bottom: 2px !important;
  }
  .category-item-title {
    font-size: 11px !important;
    letter-spacing: 0 !important;
  }
  .category-item-amount {
    font-size: 10px !important;
  }
  .category-btn {
    font-size: 10px !important;
    padding: 2px 0 !important;
  }
  .category-item-container {
    gap: 12px !important;
  }
}
/* End Mobile Category Item Fix */
`;

function replaceFix(file) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        
        const startMarker = '/* Mobile Category Item Fix */';
        // Note: The previous append didn't have an end marker, but it was at the end of the file
        if (content.includes(startMarker)) {
            // Find the start and just slice it off, then append the new one
            const idx = content.indexOf(startMarker);
            content = content.slice(0, idx) + newMobileFix;
        } else {
            content += newMobileFix;
        }
        
        fs.writeFileSync(file, content);
        console.log("Updated " + file);
    }
}

replaceFix(cssPath);
replaceFix(cssPath2);
