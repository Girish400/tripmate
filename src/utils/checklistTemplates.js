// src/utils/checklistTemplates.js

export const CATEGORY_ICONS = {
  'Campfire':       '🔥',
  'Food':           '🍽️',
  'Kitchen':        '🍳',
  'Sleeping':       '🛏️',
  'Clothing':       '👕',
  'Medications':    '💊',
  'Toiletries':     '🧴',
  'Miscellaneous':  '🎒',
  'Essentials':     '📋',
  'Documents':      '📄',
  'Beach Gear':     '🏖️',
  'Ski Gear':       '⛷️',
  'Car':            '🚗',
  'Snacks':         '🍿',
  'Electronics':    '💻',
  'Other':          '📦',
}

const TENT_CAMPING = [
  {
    category: 'Campfire',
    items: [
      'Tent / Tarp / Pop-up Tent', 'Plastic / Trash Bags', 'Sunscreen / Sunglasses / Hats',
      'Bug Spray / Hand Sanitizer', 'Books', 'Cash / Map', 'Thermo Cooler / Bottles',
      'Outdoor Rug', 'Table Cloth / Cover / Clips', 'Power Bank / Batteries / Cord',
      'Charcoal / Lighter / Grill', 'Broom / Camping Chairs', 'Bucket / Umbrella / Jackets',
      'Extension Cords / Match Sticks', 'Headlights / Flashlights',
      'Cooler / Dry Ice / Water Can', 'Twine', 'Propane / Canister',
      'Rubbermaid Water Cooler', 'Napkins / Paper Towels',
      'Insect / Mosquito Repellent', 'Water Bottles', 'Gas Top', 'Disposable Toilet Paper',
    ],
  },
  {
    category: 'Food',
    items: [
      'Milk', 'Onions / Tomatoes', 'Cucumber', 'Cilantro / Green Peppers',
      'Sweet Corn / Potato', 'Lemon / Garlic', 'Ghee / Cumin / Mustard',
      'Chat Masala', 'Oil / Salt / Butter / Cheese', 'Sugar / Tea Powder',
      'Rice', 'Chilli Powder / Turmeric', 'Apples / Oranges',
      'Strawberry / Banana', 'Bread', 'Paneer / Yogurt',
      'Chutney / Marination', 'Fennel Seeds', 'S\'mores / Snacks',
      'Asparagus', 'Biscuits / Chips / Ketchup',
    ],
  },
  {
    category: 'Kitchen',
    items: [
      'Gas Stove / Top', 'Knife / Forks / Whisk', 'Big Spoon / Spatula',
      'Paper Dishes / Cups', 'Paper Bowls / Plastic Spoons', 'Skewers / Pot Holders',
      'Skillet / Tava / Frying Pan', 'Paper Napkins', 'Dish Soap',
      'Ziploc Bags', 'Can and Bottle Opener', 'Pots / Tea Pot / Iron Skillet',
      'Cutting Board / Peeler', 'Food Storage Containers', 'Sponge / Liquid Detergent',
      'Tea Bags', 'Mixing Bowl / Blender', 'Big and Small Tongs',
      'Canned Beans', 'Aluminum Foil', 'Silver Serving Tray',
    ],
  },
  {
    category: 'Sleeping',
    items: [
      'Sleeping Bag / Blankets / Cot', 'Air Pump', 'Bed Sheets / Pillows',
      'Bath Mat', 'Socks', 'Head Cap / Beanie', 'Lantern', 'Extra Blankets',
      'Handkerchief', 'Pocket Knife', 'Wood Axe / Firewood',
      'S-Hook / Hammock', 'Pen / Notepad', 'Solar Lights',
      'Air Freshener', 'Swimming Costumes', 'Hiking Gear / Shoes',
    ],
  },
  {
    category: 'Clothing',
    items: [
      'Towels / Pajamas', 'Sleepers / Flip Flops / Sandals', 'Jackets / Hoodie',
      'Raincoat / Poncho', 'Sweatshirts', 'Ear Plug / Eye Mask',
      'Long Sleeve Shirt', 'Gloves / Mittens', 'Shorts / Tees', 'Undergarments',
    ],
  },
  {
    category: 'Medications',
    items: [
      'First Aid Kit / Band-Aids', 'Tylenol / Pain Reliever', 'Medical ID / Information',
      'Emergency Contact Info', 'Neosporin', 'Hydrogen Peroxide',
      'Zandu Balm / Vicks', 'Biofreeze', 'NyQuil',
    ],
  },
  {
    category: 'Toiletries',
    items: [
      'Soap / Soap Box', 'Shampoo / Conditioner / Shaving Kit',
      'Comb / Feminine Products', 'Face / Hand Towels',
      'Hand Soap / Deodorant', 'Toothbrush / Toothpaste',
      'Bobby Pins / Hair Pins', 'Moisturizer / Hair Ties',
      'Hand Mirror', 'Toilet Paper / Wipes',
    ],
  },
  {
    category: 'Miscellaneous',
    items: [
      'Car RC Book / Insurance', 'Cards / Dice / Ball / Racket',
      'Car Battery Charger', 'Driving License / Passport',
      'Duct Tape / Scissors', 'Zip Ties / Hammer',
      'Flashlight / Backpack', 'Phone / Wallet / Airtag',
      'Tire Pressure Gauge / Inflator',
    ],
  },
]

const RV_CAMPING = [
  {
    category: 'Campfire',
    items: [
      'RV Hookup Cable / Adapter', 'Leveling Blocks', 'Sewer Dump Hose',
      'Freshwater Hose', 'RV Awning', 'Outdoor Rug', 'Camping Chairs',
      'Propane / Canister', 'Charcoal / Lighter / Grill',
      'Extension Cords', 'Power Bank / Batteries',
      'Headlights / Flashlights', 'Cooler / Water Can',
      'Trash Bags', 'Napkins / Paper Towels',
      'Insect / Mosquito Repellent', 'Water Bottles',
      'Bug Spray / Hand Sanitizer', 'Sunscreen / Sunglasses / Hats',
    ],
  },
  ...TENT_CAMPING.filter(c => c.category !== 'Campfire').map(c =>
    c.category === 'Sleeping'
      ? { ...c, items: c.items.filter(i => i !== 'Tent / Tarp / Pop-up Tent') }
      : c
  ),
]

const BEACH_GLAMPING = [
  {
    category: 'Essentials',
    items: [
      'Passport / ID', 'Cash', 'Credit Card',
      'Smartphone and Charger', 'Health Insurance Card',
      'Accommodation Booking', 'Emergency Contacts',
    ],
  },
  {
    category: 'Beach Gear',
    items: [
      'Sunscreen (SPF 50+)', 'Beach Towels', 'Beach Umbrella',
      'Swimsuits', 'Flip Flops', 'Sunglasses', 'Beach Chairs',
      'Cooler / Ice Chest', 'Sand Toys', 'Snorkel Gear',
      'Life Jackets', 'Beach Bag', 'Waterproof Phone Case',
      'After-Sun Lotion', 'Insect Repellent',
    ],
  },
  {
    category: 'Clothing',
    items: [
      'T-Shirts', 'Shorts / Skirts', 'Dresses / Cover-Ups',
      'Underwear', 'Socks', 'Sandals', 'Hat / Cap',
      'Light Jacket', 'Pajamas',
    ],
  },
  {
    category: 'Toiletries',
    items: [
      'Toothbrush / Toothpaste', 'Shampoo / Conditioner',
      'Soap / Body Wash', 'Deodorant', 'Face Cleanser / Moisturizer',
      'Hair Brush / Comb', 'Feminine Products', 'Medications',
      'First Aid Kit',
    ],
  },
  {
    category: 'Other',
    items: [
      'Books / Kindle', 'Camera and Charger', 'Powerbank',
      'Water Bottles', 'Snacks', 'Bluetooth Speaker',
    ],
  },
]

const SKI = [
  {
    category: 'Essentials',
    items: [
      'ID / Passport', 'Cash / Credit Card', 'Ski Pass / Lift Tickets',
      'Accommodation Booking', 'Emergency Contacts', 'Travel Insurance',
    ],
  },
  {
    category: 'Ski Gear',
    items: [
      'Skis / Snowboard', 'Ski Boots', 'Ski Poles',
      'Helmet', 'Goggles', 'Ski Gloves', 'Ski Jacket',
      'Ski Pants', 'Thermal Base Layers', 'Ski Socks',
      'Neck Gaiter / Balaclava', 'Hand Warmers',
      'Ski Lock', 'Boot Bag',
    ],
  },
  {
    category: 'Clothing',
    items: [
      'Thermal Underwear', 'Fleece / Sweater', 'Warm Socks',
      'Beanie', 'Waterproof Gloves', 'Winter Coat',
      'Casual Clothes', 'Pajamas', 'Underwear',
    ],
  },
  {
    category: 'Toiletries',
    items: [
      'Toothbrush / Toothpaste', 'Shampoo / Conditioner',
      'Soap / Body Wash', 'Deodorant', 'Lip Balm',
      'Sunscreen (high SPF for snow)', 'Moisturizer / Chapstick',
      'Feminine Products',
    ],
  },
  {
    category: 'Other',
    items: [
      'First Aid Kit', 'Pain Reliever', 'Camera and Charger',
      'Powerbank', 'Snacks / Energy Bars', 'Water Bottle',
      'Guidebook / Trail Map',
    ],
  },
]

const ROAD_TRIP = [
  {
    category: 'Essentials',
    items: [
      'Driver\'s License', 'Car Insurance / Registration',
      'Cash / Credit Card', 'Smartphone and Charger',
      'Car Phone Mount', 'Roadside Emergency Kit',
    ],
  },
  {
    category: 'Car',
    items: [
      'Jumper Cables', 'Spare Tire / Jack', 'Roadside Flares',
      'First Aid Kit', 'Car Tool Kit', 'Trash Bags',
      'Sunshade / Windshield Cover', 'GPS / Downloaded Maps',
      'Tire Pressure Gauge',
    ],
  },
  {
    category: 'Snacks',
    items: [
      'Water Bottles', 'Energy Drinks / Coffee', 'Granola Bars',
      'Chips / Crackers', 'Fruit', 'Sandwiches', 'Candy / Gum',
    ],
  },
  {
    category: 'Clothing',
    items: [
      'Comfortable Clothes', 'Pajamas', 'Underwear / Socks',
      'Shoes / Sneakers', 'Light Jacket', 'Sunglasses', 'Hat',
    ],
  },
  {
    category: 'Toiletries',
    items: [
      'Toothbrush / Toothpaste', 'Deodorant', 'Soap / Wipes',
      'Feminine Products', 'Hand Sanitizer', 'Medications',
    ],
  },
  {
    category: 'Other',
    items: [
      'Headphones / AUX Cable', 'Books / Audiobooks', 'Camera',
      'Powerbank', 'Travel Pillow / Blanket', 'Notebook and Pen',
    ],
  },
]

const INTERNATIONAL = [
  {
    category: 'Essentials',
    items: [
      'Passport', 'Visa Documents', 'Travel Insurance Policy',
      'Flight Tickets / Boarding Pass', 'Hotel / Accommodation Booking',
      'International SIM / Phone Plan', 'Foreign Currency / Cash',
      'Credit Card (notify bank)', 'Emergency Contacts',
    ],
  },
  {
    category: 'Documents',
    items: [
      'Passport Copies (2x)', 'Visa Copies', 'Insurance Policy Copy',
      'ESTA / Entry Requirements', 'International Driving Permit',
      'Vaccination Records', 'Travel Itinerary Printout',
    ],
  },
  {
    category: 'Clothing',
    items: [
      'Underwear', 'Socks', 'T-Shirts', 'Shirts / Blouses',
      'Pants / Jeans', 'Shorts', 'Dresses / Skirts',
      'Formal Clothes', 'Sweaters / Fleece', 'Swimsuits',
      'Coat / Jacket', 'Rain Coat', 'Formal Shoes',
      'Leisure Shoes', 'Sandals / Flip Flops', 'Hat / Cap',
      'Scarf / Belt', 'Pajamas', 'Laundry Bag',
    ],
  },
  {
    category: 'Toiletries',
    items: [
      'Toothbrush / Toothpaste', 'Dental Floss / Mouthwash',
      'Shampoo / Conditioner', 'Soap / Body Wash',
      'Deodorant', 'Face Cleanser / Moisturizer',
      'Sunscreen', 'Razor / Shaving Kit', 'Makeup / Remover',
      'Perfume / Cologne', 'Feminine Products', 'Medications',
      'First Aid Kit', 'Insect Repellent', 'Hand Sanitizer',
      'Wet Wipes', 'Toilet Paper (travel pack)',
    ],
  },
  {
    category: 'Electronics',
    items: [
      'Smartphone and Charger', 'Universal Power Adapter',
      'Laptop / Tablet and Charger', 'Powerbank',
      'Camera and Charger / Memory Card', 'Headphones / Earbuds',
      'E-reader / Kindle',
    ],
  },
  {
    category: 'Other',
    items: [
      'Guidebook / Maps', 'Travel Lock', 'Luggage Tags',
      'Neck Pillow', 'Sleep Mask', 'Earplugs',
      'Snacks for Flight', 'Tote / Shopping Bag',
      'Umbrella', 'Notebook and Pen',
    ],
  },
]

// Keys must match tripType values used in NewTripModal / getTripEmoji
export const TEMPLATES = {
  'Tent Camping':           TENT_CAMPING,
  'RV':                     RV_CAMPING,
  'Glamping':               BEACH_GLAMPING,
  'Beach':                  BEACH_GLAMPING,
  'Ski/Snow':               SKI,
  'Road Trip':              ROAD_TRIP,
  'International Vacation': INTERNATIONAL,
  'Picnic':                 TENT_CAMPING,  // fallback
  'Day Trip':               ROAD_TRIP,     // fallback
}
