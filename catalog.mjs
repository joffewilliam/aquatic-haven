// Aquatic Haven - deterministic 120-product catalog (stable ids, prices, slugs).
// `kw` + `lock` drive the free image download (scripts/fetch-images.mjs).

export const CATEGORIES = [
  { slug: 'freshwater-fish', name: 'Freshwater Fish', kw: 'aquarium,fish' },
  { slug: 'saltwater-fish',  name: 'Saltwater Fish',  kw: 'reef,fish' },
  { slug: 'live-plants',     name: 'Live Plants',     kw: 'aquarium,plant' },
  { slug: 'tanks',           name: 'Aquariums & Tanks', kw: 'aquarium' },
  { slug: 'filtration',      name: 'Filtration',      kw: 'aquarium' },
  { slug: 'lighting',        name: 'Lighting',        kw: 'aquarium,light' },
  { slug: 'heating',         name: 'Heating',         kw: 'aquarium' },
  { slug: 'food',            name: 'Fish Food',       kw: 'fish,food' },
  { slug: 'water-care',      name: 'Water Care',      kw: 'aquarium' },
  { slug: 'decor',           name: 'Substrate & Decor', kw: 'aquarium,gravel' },
];

const POOLS = {
  'freshwater-fish': ['Neon Tetra','Cardinal Tetra','Betta Splendens','Fancy Guppy',"Endler's Livebearer",'Zebra Danio','Cherry Barb','Tiger Barb','Harlequin Rasbora','Panda Corydoras','Bristlenose Pleco','Otocinclus Catfish','German Blue Ram','Bolivian Ram','Silver Angelfish','Blue Discus','Dwarf Gourami','Pearl Gourami','Kuhli Loach','Celestial Pearl Danio','Glowlight Tetra','Black Skirt Tetra','Mickey Mouse Platy','Red Swordtail'],
  'saltwater-fish': ['Ocellaris Clownfish','Maroon Clownfish','Royal Gramma','Yellow Tang','Blue Hippo Tang','Firefish Goby','Banggai Cardinalfish','Mandarin Dragonet','Six Line Wrasse','Flame Angelfish','Coral Beauty Angelfish','Lawnmower Blenny','Yellow Watchman Goby','Green Chromis','Pajama Cardinalfish','Foxface Rabbitfish'],
  'live-plants': ['Java Fern','Anubias Nana','Amazon Sword','Cryptocoryne Wendtii','Java Moss','Dwarf Hairgrass','Monte Carlo','Rotala Rotundifolia','Ludwigia Repens','Jungle Vallisneria','Bucephalandra','Water Wisteria','Hornwort','Marimo Moss Ball','Red Tiger Lotus','Pogostemon Helferi'],
  'tanks': ['Nano Cube 5 Gallon','Rimless 10 Gallon','20 Gallon Long','29 Gallon Aquarium','40 Gallon Breeder','55 Gallon Aquarium','75 Gallon Reef-Ready','Bookshelf 8 Gallon','Cube 15 Gallon','125 Gallon Aquarium'],
  'filtration': ['HOB Power Filter 20','HOB Power Filter 50','Canister Filter 100','Canister Filter 200','Dual Sponge Filter','Internal Power Filter','Protein Skimmer 65','Media Reactor','Bio Balls 500ml','Ceramic Rings 1L','Filter Floss Pad','Activated Carbon 1lb'],
  'lighting': ['LED Planted 24in','LED Planted 36in','LED Reef 48in','Clip-On Nano LED','RGB Full Spectrum LED','Programmable Sunrise LED','T5 HO Dual Light','Moonlight LED Strip'],
  'heating': ['Submersible Heater 50W','Submersible Heater 100W','Submersible Heater 200W','Titanium Heater 300W','Inline Heater 400W','Digital Heater Controller'],
  'food': ['Tropical Flakes','Spirulina Flakes','Algae Wafers','Sinking Pellets','Betta Pellets','Frozen Brine Shrimp','Frozen Bloodworms','Freeze-Dried Tubifex','Marine Pellets','Vacation Feeder Block'],
  'water-care': ['Water Conditioner 500ml','Beneficial Bacteria 250ml','Master Test Kit','Ammonia Test Strips','Aquarium Salt 4lb','Marine Salt Mix 50gal','pH Buffer 8.2','Plant Micro Fertilizer','Algae Control 250ml','Phosphate Remover'],
  'decor': ['Planted Aqua Soil 9L','Natural River Gravel 20lb','Black Aquarium Sand 10lb','Crushed Coral 20lb','Spider Wood Driftwood','Dragon Stone 10lb','Resin Cave Decor','Coconut Hut Decor'],
};

const PRICE = {
  'freshwater-fish': [3, 25], 'saltwater-fish': [18, 90], 'live-plants': [5, 22],
  'tanks': [29, 420], 'filtration': [12, 180], 'lighting': [22, 210],
  'heating': [16, 75], 'food': [4, 28], 'water-care': [6, 45], 'decor': [9, 60],
};

const BLURB = {
  'freshwater-fish': n => `Tank-raised ${n}, a hardy and peaceful community favorite. Sold per fish; acclimate slowly.`,
  'saltwater-fish':  n => `Aquacultured ${n} for the reef or FOWLR aquarium. Reef-safe and eating prepared foods.`,
  'live-plants':     n => `Low-maintenance ${n} shipped as a healthy potted/bunched plant. Great for aquascaping.`,
  'tanks':           n => `Crystal-clear, low-iron glass ${n} with even silicone seams. Leak-tested before shipping.`,
  'filtration':      n => `Quiet, efficient ${n} delivering reliable mechanical and biological filtration.`,
  'lighting':        n => `Energy-efficient ${n} tuned for vivid color and healthy plant or coral growth.`,
  'heating':         n => `Accurate, shatter-resistant ${n} with thermal protection to hold a stable temperature.`,
  'food':            n => `Highly digestible ${n} rich in protein and color enhancers for daily feeding.`,
  'water-care':      n => `Lab-grade ${n} to keep parameters in check and your livestock thriving.`,
  'decor':           n => `Aquarium-safe ${n} that's inert, rinse-and-go, and a natural fit for any aquascape.`,
};

// Accurate-species image source: Wikipedia article titles (resolved via redirects).
// Only fish & plants - equipment keeps keyword photos. Missing/imageless titles
// fall back to loremflickr in the downloader.
const WIKI = {
  'Neon Tetra': 'Neon tetra', 'Cardinal Tetra': 'Cardinal tetra', 'Betta Splendens': 'Siamese fighting fish',
  'Fancy Guppy': 'Guppy', "Endler's Livebearer": "Endler's livebearer", 'Zebra Danio': 'Zebrafish',
  'Cherry Barb': 'Cherry barb', 'Tiger Barb': 'Tiger barb', 'Harlequin Rasbora': 'Harlequin rasbora',
  'Panda Corydoras': 'Corydoras panda', 'Bristlenose Pleco': 'Bristlenose catfish', 'Otocinclus Catfish': 'Otocinclus',
  'German Blue Ram': 'Mikrogeophagus ramirezi', 'Bolivian Ram': 'Mikrogeophagus altispinosus',
  'Silver Angelfish': 'Pterophyllum scalare', 'Blue Discus': 'Symphysodon', 'Dwarf Gourami': 'Dwarf gourami',
  'Pearl Gourami': 'Pearl gourami', 'Kuhli Loach': 'Kuhli loach', 'Celestial Pearl Danio': 'Celestial pearl danio',
  'Glowlight Tetra': 'Glowlight tetra', 'Black Skirt Tetra': 'Black tetra', 'Mickey Mouse Platy': 'Southern platyfish',
  'Red Swordtail': 'Green swordtail',
  'Ocellaris Clownfish': 'Ocellaris clownfish', 'Maroon Clownfish': 'Maroon clownfish', 'Royal Gramma': 'Royal gramma',
  'Yellow Tang': 'Yellow tang', 'Blue Hippo Tang': 'Paracanthurus', 'Firefish Goby': 'Nemateleotris magnifica',
  'Banggai Cardinalfish': 'Banggai cardinalfish', 'Mandarin Dragonet': 'Synchiropus splendidus',
  'Six Line Wrasse': 'Pseudocheilinus hexataenia', 'Flame Angelfish': 'Centropyge loricula',
  'Coral Beauty Angelfish': 'Centropyge bispinosa', 'Lawnmower Blenny': 'Salarias fasciatus',
  'Yellow Watchman Goby': 'Cryptocentrus cinctus', 'Green Chromis': 'Chromis viridis',
  'Pajama Cardinalfish': 'Sphaeramia nematoptera', 'Foxface Rabbitfish': 'Siganus vulpinus',
  'Java Fern': 'Java fern', 'Anubias Nana': 'Anubias barteri', 'Amazon Sword': 'Echinodorus grisebachii',
  'Cryptocoryne Wendtii': 'Cryptocoryne wendtii', 'Java Moss': 'Taxiphyllum barbieri',
  'Dwarf Hairgrass': 'Eleocharis acicularis', 'Monte Carlo': 'Micranthemum',
  'Rotala Rotundifolia': 'Rotala rotundifolia', 'Ludwigia Repens': 'Ludwigia repens',
  'Jungle Vallisneria': 'Vallisneria americana', 'Bucephalandra': 'Bucephalandra',
  'Water Wisteria': 'Hygrophila difformis', 'Hornwort': 'Ceratophyllum', 'Marimo Moss Ball': 'Marimo',
  'Red Tiger Lotus': 'Nymphaea lotus', 'Pogostemon Helferi': 'Pogostemon helferi',
};

const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const PRODUCTS = [];
let n = 0;
for (const cat of CATEGORIES) {
  POOLS[cat.slug].forEach((name, i) => {
    n++;
    const id = String(n).padStart(3, '0');
    const [lo, hi] = PRICE[cat.slug];
    const frac = ((i * 37 + n * 13) % 100) / 100;
    const price = +(lo + frac * (hi - lo)).toFixed(2);
    PRODUCTS.push({
      id, n, name, slug: `${slugify(name)}-${id}`,
      cat: cat.slug, catName: cat.name,
      price, sku: `AH-${id}`,
      stock: n % 11 !== 0,           // ~9 items out of stock
      rating: 3.6 + ((n * 7) % 14) / 10, // 3.6-4.9
      blurb: BLURB[cat.slug](name),
      img: `/assets/v7/img/${id}.jpg`,
      kw: cat.kw, lock: n, wiki: WIKI[name] || null,
    });
  });
}

export const catBySlug = Object.fromEntries(CATEGORIES.map(c => [c.slug, c]));
export const bySlug = Object.fromEntries(PRODUCTS.map(p => [p.slug, p]));
export const byCat = Object.fromEntries(CATEGORIES.map(c => [c.slug, PRODUCTS.filter(p => p.cat === c.slug)]));
export const featured = CATEGORIES.map(c => byCat[c.slug][0]); // one hero pick per department
