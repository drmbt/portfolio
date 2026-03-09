import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';
import matter from 'gray-matter';
import { marked } from 'marked';

function projectDatabasePlugin() {
    function generateProjectDatabase() {
        const projectsDir = path.resolve(__dirname, 'public/projects');
        const projects = [];

        if (fs.existsSync(projectsDir)) {
            const folders = fs.readdirSync(projectsDir).filter(f => fs.statSync(path.join(projectsDir, f)).isDirectory());

            for (const folder of folders) {
                // Check for a markdown spec first
                const mdPath = path.join(projectsDir, folder, `${folder}.md`);
                if (fs.existsSync(mdPath)) {
                    const mdContent = fs.readFileSync(mdPath, 'utf-8');
                    const { data, content } = matter(mdContent);
                    const htmlDescription = marked.parse(content);

                    // --- Procedural Asset Discovery ---
                    const assetsDir = path.join(projectsDir, folder, 'assets');
                    const videoDir = path.join(assetsDir, 'video');
                    const imageDir = path.join(assetsDir, 'image');
                    const posterDir = path.join(assetsDir, 'poster');

                    let discoveredHero = null;
                    let discoveredOtherVideos = [];
                    let discoveredCarousel = [];
                    let discoveredPosters = [];

                    // Scan Videos
                    if (fs.existsSync(videoDir)) {
                        const vids = fs.readdirSync(videoDir).filter(f => !f.startsWith('.'));
                        for (const v of vids) {
                            const p = `/projects/${folder}/assets/video/${v}`;
                            if (v.toLowerCase().startsWith('hero')) {
                                discoveredHero = { type: 'video', sources: [p], aspectRatios: ["16:9"] };
                            } else {
                                // Extract a title from filename
                                const title = v.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").toUpperCase();
                                discoveredOtherVideos.push({ title, sources: [p], poster: `${p}#t=0`, aspectRatios: ["16:9"] });
                            }
                        }
                    }

                    // Scan Carousel Images
                    if (fs.existsSync(imageDir)) {
                        const imgs = fs.readdirSync(imageDir).filter(f => !f.startsWith('.')).sort();
                        for (const img of imgs) {
                            const p = `/projects/${folder}/assets/image/${img}`;
                            if (img.toLowerCase().startsWith('hero') && !discoveredHero) {
                                discoveredHero = { type: 'image', sources: [p] };
                            } else {
                                discoveredCarousel.push(p);
                            }
                        }
                    }

                    // Scan Poster Images
                    if (fs.existsSync(posterDir)) {
                        const posters = fs.readdirSync(posterDir).filter(f => !f.startsWith('.')).sort();
                        for (const p of posters) {
                            discoveredPosters.push(`/projects/${folder}/assets/poster/${p}`);
                        }
                    }

                    // Merge frontmatter with discovered assets (Frontmatter wins if explicitly defined)
                    data.hero = data.hero || discoveredHero;

                    if (data.hero && data.hero.type === 'video' && data.hero.sources) {
                        discoveredOtherVideos = discoveredOtherVideos.filter(ov => !data.hero.sources.includes(ov.sources[0]));
                    }

                    if (!data.otherVideos && discoveredOtherVideos.length > 0) data.otherVideos = discoveredOtherVideos;
                    if (!data.carouselImages && discoveredCarousel.length > 0) data.carouselImages = discoveredCarousel;
                    if (!data.posterImages && discoveredPosters.length > 0) data.posterImages = [discoveredPosters]; // wrap in row array

                    // Ensure hero video has a poster if available
                    if (data.hero && data.hero.type === 'video' && !data.hero.poster && discoveredPosters.length > 0) {
                        data.hero.poster = discoveredPosters[0];
                    }
                    // ----------------------------------

                    // Compile HTML Template
                    const templateHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${data.title || 'Project'}</title>
    <link rel="stylesheet" href="/src/project-template/style.css" />
</head>
<body>
    <div id="app"></div>
    <script type="application/json" id="project-meta">
        ${JSON.stringify({ ...data, overview: htmlDescription, id: folder })}
    </script>
    <script type="module" src="/src/project-template/app.js"></script>
</body>
</html>`;

                    const targetHTMLPath = path.join(projectsDir, folder, 'index.html');
                    let shouldWriteHtml = true;
                    if (fs.existsSync(targetHTMLPath)) {
                        const existingHtml = fs.readFileSync(targetHTMLPath, 'utf-8');
                        if (existingHtml === templateHtml) {
                            shouldWriteHtml = false;
                        }
                    }
                    if (shouldWriteHtml) {
                        fs.writeFileSync(targetHTMLPath, templateHtml);
                    }

                    // Add to global index database
                    projects.push({
                        id: folder,
                        title: data.title || folder,
                        description: data.client || 'Project',
                        date: data.date || new Date().toISOString().split('T')[0],
                        thumb: data.hero?.poster || `/projects/${folder}/thumb.jpg`,
                        hashtags: [data.client?.toLowerCase()].filter(Boolean)
                    });

                    continue; // skip the index.html parsing below if MD exists
                }

                // Fallback to reading existing index.html for manual projects
                const indexPath = path.join(projectsDir, folder, 'index.html');
                if (fs.existsSync(indexPath)) {
                    const htmlContent = fs.readFileSync(indexPath, 'utf-8');
                    const match = htmlContent.match(/<script type="application\/json" id="project-meta">\s*([\s\S]*?)\s*<\/script>/);
                    if (match && match[1]) {
                        try {
                            const metadata = JSON.parse(match[1]);
                            metadata.id = folder;
                            if (!metadata.thumb) {
                                metadata.thumb = `/projects/${folder}/thumb.jpg`;
                            }
                            projects.push(metadata);
                        } catch (e) {
                            console.error('Failed to parse metadata in folder:', folder, e.message);
                        }
                    }
                }
            }
        }
        // Write the index.json file physically to disk
        const indexJsonPath = path.join(projectsDir, 'index.json');
        const indexJsonContent = JSON.stringify(projects, null, 2);
        let shouldWriteJson = true;
        if (fs.existsSync(indexJsonPath)) {
            const existingJson = fs.readFileSync(indexJsonPath, 'utf-8');
            if (existingJson === indexJsonContent) {
                shouldWriteJson = false;
            }
        }
        if (shouldWriteJson) {
            fs.writeFileSync(indexJsonPath, indexJsonContent);
            console.log('Project database index.json generated successfully.');
        }
    }

    return {
        name: 'vite-plugin-project-database',
        buildStart() {
            generateProjectDatabase();
        },
        handleHotUpdate({ file, server }) {
            if (file.includes('public/projects/') && (file.endsWith('index.html') || file.endsWith('.md'))) {
                generateProjectDatabase();
                server.ws.send({ type: 'full-reload' });
            }
        }
    };
}

export default defineConfig({
    plugins: [projectDatabasePlugin()]
});
