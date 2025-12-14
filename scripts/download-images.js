#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const url = require('url');

// Paths
const DATA_DIR = path.join(__dirname, '../src/data');
const IMAGES_DIR = path.join(__dirname, '../public/images');

// Create images directory if it doesn't exist
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Function to extract all image URLs from data files
function extractImageUrls() {
    const urls = new Set();
    const files = ['laptops.json', 'gpus.json', 'cpus.json'];

    files.forEach(file => {
        const filePath = path.join(DATA_DIR, file);
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const traverse = (obj) => {
                if (obj && typeof obj === 'object') {
                    if (obj.main && typeof obj.main === 'string' && obj.main.includes('nanoreview.net')) {
                        urls.add(obj.main);
                    }
                    Object.values(obj).forEach(val => traverse(val));
                }
            };
            traverse(data);
        }
    });

    return Array.from(urls);
}

// Function to convert URL to local path
function getLocalPath(imageUrl) {
    try {
        const urlObj = url.parse(imageUrl);
        const pathname = urlObj.pathname; // e.g., /common/images/laptop/xxx.jpeg
        const parts = pathname.split('/').filter(p => p); // ['common', 'images', 'laptop', 'xxx.jpeg']
        
        // Extract category (laptop, gpu, cpu) and filename
        const filename = parts[parts.length - 1];
        const category = parts[parts.length - 2];
        
        const localFilename = `${category}-${filename}`;
        const localPath = path.join(IMAGES_DIR, localFilename);
        
        return {
            localPath,
            localUrl: `/images/${localFilename}`,
            filename: localFilename
        };
    } catch (e) {
        console.error('Error parsing URL:', imageUrl, e.message);
        return null;
    }
}

// Function to download image
function downloadImage(imageUrl, localPath) {
    return new Promise((resolve, reject) => {
        const { dir } = path.parse(localPath);
        
        // Create directory if needed
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Check if file already exists
        if (fs.existsSync(localPath)) {
            console.log(`✓ Already exists: ${path.basename(localPath)}`);
            resolve();
            return;
        }

        https.get(imageUrl, (response) => {
            if (response.statusCode === 200) {
                const fileStream = fs.createWriteStream(localPath);
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    console.log(`✓ Downloaded: ${path.basename(localPath)}`);
                    resolve();
                });
            } else {
                reject(new Error(`HTTP ${response.statusCode}: ${imageUrl}`));
            }
        }).on('error', reject);
    });
}

// Function to update JSON files with local paths
function updateJsonFiles() {
    const files = ['laptops.json', 'gpus.json', 'cpus.json'];
    const urlMap = new Map(); // Map original URLs to local URLs

    // Build URL mapping
    const urls = extractImageUrls();
    urls.forEach(imageUrl => {
        const pathInfo = getLocalPath(imageUrl);
        if (pathInfo) {
            urlMap.set(imageUrl, pathInfo.localUrl);
        }
    });

    // Update each JSON file
    files.forEach(file => {
        const filePath = path.join(DATA_DIR, file);
        if (fs.existsSync(filePath)) {
            let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            // Traverse and replace URLs
            const traverse = (obj) => {
                if (obj && typeof obj === 'object') {
                    if (obj.main && typeof obj.main === 'string' && urlMap.has(obj.main)) {
                        obj.main = urlMap.get(obj.main);
                    }
                    Object.values(obj).forEach(val => traverse(val));
                }
            };
            traverse(data);
            
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`✓ Updated: ${file}`);
        }
    });
}

// Main execution
async function main() {
    console.log('🔍 Extracting image URLs...');
    const urls = extractImageUrls();
    console.log(`Found ${urls.length} unique image URLs\n`);

    console.log('📥 Downloading images...');
    let downloaded = 0;
    let failed = 0;

    for (const imageUrl of urls) {
        const pathInfo = getLocalPath(imageUrl);
        if (pathInfo) {
            try {
                await downloadImage(imageUrl, pathInfo.localPath);
                downloaded++;
            } catch (error) {
                console.error(`✗ Failed: ${imageUrl}`);
                console.error(`  Error: ${error.message}`);
                failed++;
            }
        }
    }

    console.log(`\n✅ Downloaded ${downloaded} images`);
    if (failed > 0) {
        console.log(`⚠️  Failed: ${failed} images`);
    }

    console.log('\n📝 Updating JSON files with local paths...');
    updateJsonFiles();

    console.log('\n✨ Done! All images have been downloaded and JSON files updated.');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
