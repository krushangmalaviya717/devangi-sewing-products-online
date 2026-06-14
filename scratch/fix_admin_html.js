const fs = require('fs');
let content = fs.readFileSync('admin/index.html', 'utf8');

const badPart = `                <div class="pt-4 flex justify-end space-x-3 border-t border-gray-100">
                    <button type="button" onclick="toggleModal('addBannerModal')" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                    <button type="submit" class="bg-pink-500 hover:bg-pink-600 text-white px-5 py-2 rounded-lg shadow transition-colors font-medium">Save Banner</button>
                </    <!-- ===== PREMIUM ORDER DETAIL MODAL (SHOPIFY STYLE) ===== -->`;

const goodPart = `                <div class="pt-4 flex justify-end space-x-3 border-t border-gray-100">
                    <button type="button" onclick="toggleModal('addBannerModal')" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                    <button type="submit" class="bg-pink-500 hover:bg-pink-600 text-white px-5 py-2 rounded-lg shadow transition-colors font-medium">Save Banner</button>
                </div>
            </form>
        </div>
    </div>

    <!-- ===== PREMIUM ORDER DETAIL MODAL (SHOPIFY STYLE) ===== -->`;

if (content.includes('Save Banner</button>\n                </    <!--')) {
    // Try a more robust match
    content = content.replace(/Save Banner<\/button>\s+<\/    <!--/g, 'Save Banner</button>\n                </div>\n            </form>\n        </div>\n    </div>\n\n    <!--');
    fs.writeFileSync('admin/index.html', content);
    console.log('admin/index.html fixed successfully');
} else {
    // Fallback search
    console.log('Exact match failed, trying alternative search...');
    const parts = content.split('Save Banner</button>');
    if (parts.length > 1) {
        const secondHalf = parts[1].trimStart();
        if (secondHalf.startsWith('</')) {
             const newContent = parts[0] + 'Save Banner</button>\n                </div>\n            </form>\n        </div>\n    </div>\n\n    ' + secondHalf.substring(secondHalf.indexOf('<!--'));
             fs.writeFileSync('admin/index.html', newContent);
             console.log('admin/index.html fixed via fallback');
        } else {
             console.log('No bad tag found at location.');
        }
    } else {
        console.error('Could not find anchor point in admin/index.html');
    }
}
