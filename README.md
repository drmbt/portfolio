# Codercat Portfolio

A minimalist, high-contrast, dark-mode portfolio gallery built with a completely standalone architecture.

## Architecture

This project uses a unique "Standalone Case Study" architecture using **Vite** and **Vanilla Javascript**:
- **Fully Transportable:** Every project (e.g. `/public/projects/cyberpunk-city`) is a fully independent website containing its own `index.html` file, images, and embedded JSON metadata.
- **Dynamic Aggregation:** A custom Vite plugin automatically scans the `public/projects/` directory during development and build to extract the embedded metadata into a single `index.json` file.
- **Lightning Fast Filtering:** The main application fetches `index.json` and uses `Fuse.js` for instant fuzzy searching and hashtag filtering across all case studies.

## Tech Stack
- Vanilla HTML/CSS/JS
- Vite build tool
- Fuse.js (Fuzzy Search)
- Custom Vite Plugin Data Extractor

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

## Creating a new Case Study
Create a new folder in `public/projects/` and copy one of the existing `index.html` files. The Vite plugin will automatically parse the embedded metadata and add the project to your main grid!
