const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'assets', 'css', 'style-prefix.css');
let css = fs.readFileSync(cssPath, 'utf8');

const mobileFix = `

/* Mobile Category Item Fix */
@media (max-width: 570px) {
  .category-item {
    min-width: calc(50% - 15px) !important;
    flex-direction: column !important;
    justify-content: center !important;
    text-align: center !important;
    padding: 15px 10px !important;
  }
  .category-content-flex {
    flex-direction: column !important;
    gap: 5px !important;
    justify-content: center !important;
  }
  .category-item-container {
    gap: 15px !important;
  }
}
`;

if (!css.includes('/* Mobile Category Item Fix */')) {
    fs.appendFileSync(cssPath, mobileFix);
    console.log("Appended to style-prefix.css");
} else {
    console.log("Already appended");
}

const cssPath2 = path.join(__dirname, '..', 'assets', 'css', 'style.css');
if (fs.existsSync(cssPath2)) {
    let css2 = fs.readFileSync(cssPath2, 'utf8');
    if (!css2.includes('/* Mobile Category Item Fix */')) {
        fs.appendFileSync(cssPath2, mobileFix);
        console.log("Appended to style.css");
    }
}
