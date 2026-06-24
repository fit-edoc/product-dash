const fs = require('fs');
const path = require('path');

const categories = ['Electronics', 'Clothing', 'Books', 'Home & Kitchen', 'Sports & Outdoors'];

const adj = ['Premium', 'Wireless', 'Eco-Friendly', 'Portable', 'Smart', 'Ergonomic', 'Compact', 'Classic', 'Deluxe', 'Heavy-Duty'];
const nouns = {
  'Electronics': ['Headphones', 'Speaker', 'Smartwatch', 'Charger', 'Keyboard', 'Mouse', 'Monitor'],
  'Clothing': ['T-Shirt', 'Hoodie', 'Jacket', 'Socks', 'Jeans', 'Cap', 'Sneakers'],
  'Books': ['Novel', 'Biography', 'Cookbook', 'Sci-Fi Anthology', 'Guidebook', 'History Text'],
  'Home & Kitchen': ['Blender', 'Coffee Maker', 'Air Fryer', 'Toaster', 'Knife Set', 'Mug', 'Scale'],
  'Sports & Outdoors': ['Water Bottle', 'Yoga Mat', 'Dumbbells', 'Backpack', 'Sleeping Bag', 'Tent']
};

const generateProducts = (count = 100) => {
  const products = [];

  for (let i = 1; i <= count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const categoryNouns = nouns[category];
    const noun = categoryNouns[Math.floor(Math.random() * categoryNouns.length)];
    const adjective = adj[Math.floor(Math.random() * adj.length)];
    
    const name = `${adjective} ${noun}`;
    const description = `This is a high-quality ${name.toLowerCase()} designed to elevate your lifestyle. It features premium durability, modern styling, and outstanding reliability.`;
    
    // Price between $5.00 and $500.00
    const price = parseFloat((Math.random() * 495 + 5).toFixed(2));
    
    // Stock between 0 and 250
    const stock = Math.floor(Math.random() * 250);

    // Spread createdAt dates over the last 30 days to check pagination sorts
    const dateOffset = Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000);
    const createdAt = new Date(Date.now() - dateOffset);

    products.push({
      name,
      description,
      price,
      category,
      stock,
      createdAt
    });
  }

  // Sort descending by createdAt so the seed data reflects sorting
  products.sort((a, b) => b.createdAt - a.createdAt);

  const outputPath = path.join(__dirname, 'mockProducts.json');
  fs.writeFileSync(outputPath, JSON.stringify(products, null, 2));
  console.log(`Successfully generated ${count} mock products in ${outputPath}`);
};

// If run directly
if (require.main === module) {
  generateProducts(100);
}

module.exports = generateProducts;
