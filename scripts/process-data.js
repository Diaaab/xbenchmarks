import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATASET_DIR = path.resolve(PROJECT_ROOT, '../whole-dataset');
const OUTPUT_DIR = path.resolve(PROJECT_ROOT, 'src/data');

async function ensureDir(dir) {
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
}

async function processFile(filename, type) {
    console.log(`Processing ${type} from ${filename}...`);
    const filePath = path.join(DATASET_DIR, filename);

    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const comparisons = JSON.parse(fileContent);
        const map = new Map();

        comparisons.forEach(comp => {
            const { metadata, images, prices, review_scores, specs, benchmarks } = comp;
            if (!metadata || !metadata.ids || metadata.ids.length < 2) return;

            const names = metadata.names;
            const ids = metadata.ids;
            const slugs = metadata.slugs;

            // Process both items in the comparison pair
            [0, 1].forEach(index => {
                const id = ids[index];
                if (!id) return;

                const name = names[index];
                const slug = slugs ? slugs[index] : null; // Slugs might be missing in some datasets based on earlier view, but Laptops had them.

                // If already processed, skip (or merge if we want to be fancy, but first found is likely sufficient for static data)
                if (map.has(id)) return;

                const itemImages = {};
                // Extract images specific to this item
                // structure: images: { "Name 1": "url", "Name 2": "url" }
                if (images) {
                    // Try to match by exact name
                    if (images[name]) itemImages.main = images[name];
                    // Fallback logic if needed
                }

                const itemPrice = prices && prices[name] ? prices[name] : null;

                const itemScores = {};
                if (review_scores) {
                    for (const [category, values] of Object.entries(review_scores)) {
                        if (values && values[name] !== undefined) {
                            itemScores[category] = values[name];
                        } else {
                            // sometimes keys might be slightly different or short names
                            // Try to find a key that is a substring of the name or vice versa
                            const key = Object.keys(values).find(k => name.includes(k) || k.includes(name));
                            if (key) itemScores[category] = values[key];
                        }
                    }
                }

                const itemSpecs = {};
                if (specs) {
                    for (const [category, values] of Object.entries(specs)) {
                        if (values && values[name] !== undefined) {
                            itemSpecs[category] = values[name];
                        }
                    }
                }

                // Construct clean object
                const profile = {
                    id,
                    name,
                    slug,
                    type,
                    images: itemImages,
                    price: itemPrice,
                    scores: itemScores,
                    specs: itemSpecs,
                    // Pass strict configs if we can separate them, otherwise maybe just rely on specs text
                    // For now, I will NOT attach the mixed `configurations` object to avoid data pollution.
                    // The `specs` object already contains the specific options for THIS laptop (e.g. Display: "1920x1200 \n 3200x2000").
                    // That is safer and accurate.
                };

                map.set(id, profile);
            });
        });

        console.log(`Extracted ${map.size} unique ${type} profiles.`);
        return Array.from(map.values());

    } catch (err) {
        console.error(`Error processing ${filename}:`, err);
        return [];
    }
}

async function main() {
    await ensureDir(OUTPUT_DIR);

    // Process Laptops
    const laptops = await processFile('scraped_data_chunk_final.json', 'laptop');
    await fs.writeFile(path.join(OUTPUT_DIR, 'laptops.json'), JSON.stringify(laptops, null, 2));

    // Process CPUs
    const cpus = await processFile('cpu_scraped_data_chunk_final.json', 'cpu');
    await fs.writeFile(path.join(OUTPUT_DIR, 'cpus.json'), JSON.stringify(cpus, null, 2));

    // Process GPUs
    const gpus = await processFile('gpu_scraped_data_chunk_final.json', 'gpu');
    await fs.writeFile(path.join(OUTPUT_DIR, 'gpus.json'), JSON.stringify(gpus, null, 2));

    console.log('Data processing complete.');
}

main();
