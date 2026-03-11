import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';
import matter from 'gray-matter';
import { marked } from 'marked';
import multer from 'multer';

function projectCreatorPlugin() {
    return {
        name: 'vite-plugin-project-creator',
        configureServer(server) {
            const upload = multer({ dest: 'public/projects/.tmp/' }); // Temporary staging area

            server.middlewares.use('/api/create-project', (req, res, next) => {
                if (req.method !== 'POST') {
                    return next();
                }

                upload.any()(req, res, (err) => {
                    if (err) {
                        res.statusCode = 500;
                        return res.end(JSON.stringify({ success: false, error: err.message }));
                    }

                    try {
                        const { title, description, client = "Project", date = new Date().toISOString().split('T')[0], hashtags_json, project_id, existing_thumb, ...rest } = req.body;

                        let hashtags = [];
                        if (hashtags_json) {
                            try {
                                hashtags = JSON.parse(hashtags_json);
                            } catch (e) { }
                        }

                        // Parse credits from rest keys (e.g. credit_role_0, credit_name_0)
                        const credits = [];
                        let i = 0;
                        while (req.body[`credit_role_${i}`] !== undefined) {
                            if (req.body[`credit_role_${i}`].trim() || req.body[`credit_name_${i}`].trim()) {
                                credits.push({
                                    role: req.body[`credit_role_${i}`].trim(),
                                    name: req.body[`credit_name_${i}`].trim()
                                });
                            }
                            i++;
                        }

                        const folderName = project_id ? project_id : title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                        if (!folderName) throw new Error("Invalid title");

                        const projectsDir = path.resolve(__dirname, 'public/projects');
                        const newProjectDir = path.join(projectsDir, folderName);

                        if (!fs.existsSync(newProjectDir)) {
                            fs.mkdirSync(newProjectDir, { recursive: true });
                        }

                        // Create asset dirs
                        const videoDir = path.join(newProjectDir, 'assets', 'video');
                        const imageDir = path.join(newProjectDir, 'assets', 'image');
                        const posterDir = path.join(newProjectDir, 'assets', 'poster');
                        const audioDir = path.join(newProjectDir, 'assets', 'audio');
                        fs.mkdirSync(videoDir, { recursive: true });
                        fs.mkdirSync(imageDir, { recursive: true });
                        fs.mkdirSync(posterDir, { recursive: true });
                        fs.mkdirSync(audioDir, { recursive: true });

                        let thumbPath = '';
                        let existingThumbFlag = existing_thumb || '';
                        let explicitThumbFlag = req.body.explicit_thumb || '';

                        // process existing media updates
                        if (project_id && req.body.existing_media) {
                            try {
                                const edits = JSON.parse(req.body.existing_media);

                                const allExistingFiles = [];
                                const scanDir = (dir, rootName) => {
                                    if (fs.existsSync(dir)) {
                                        fs.readdirSync(dir).forEach(f => {
                                            if (!f.startsWith('.')) {
                                                allExistingFiles.push({ name: f, fullPath: path.join(dir, f), parent: rootName });
                                            }
                                        });
                                    }
                                };
                                scanDir(videoDir, 'video');
                                scanDir(imageDir, 'image');
                                scanDir(posterDir, 'poster');
                                scanDir(audioDir, 'audio');

                                if (fs.existsSync(newProjectDir)) {
                                    fs.readdirSync(newProjectDir).forEach(f => {
                                        if (f.toLowerCase().startsWith('thumb') && !f.endsWith('.md') && !f.endsWith('.json') && !f.endsWith('.html')) {
                                            allExistingFiles.push({ name: f, fullPath: path.join(newProjectDir, f), parent: 'root' });
                                        }
                                    });
                                }

                                for (const existing of allExistingFiles) {
                                    const match = edits.find(e => e.name === existing.name && e.path && e.path.endsWith(existing.name));
                                    if (!match) {
                                        fs.unlinkSync(existing.fullPath);
                                        if (existing.parent === 'root' && existing.name.toLowerCase().startsWith('thumb')) {
                                            existingThumbFlag = '';
                                        }
                                    } else {
                                        if (match.role !== match.targetRole) {
                                            const ext = path.extname(existing.name).toLowerCase();
                                            const isVideo = ['.mp4', '.webm', '.ogg'].includes(ext) && existing.parent === 'video';
                                            const isAudio = ['.mp3', '.m4a', '.wav', '.ogg'].includes(ext) && existing.parent === 'audio';
                                            let targetDir = isVideo ? videoDir : (isAudio ? audioDir : imageDir);
                                            let finalName = existing.name;

                                            if (match.targetRole === 'hero') {
                                                finalName = `hero${ext}`;
                                            } else if (match.targetRole === 'poster') {
                                                targetDir = posterDir;
                                            } else if (match.targetRole === 'audio') {
                                                targetDir = audioDir;
                                            } else if (match.targetRole === 'thumbnail') {
                                                targetDir = newProjectDir;
                                                finalName = `thumb${ext}`;
                                                existingThumbFlag = `/projects/${folderName}/${finalName}`;
                                            }

                                            // Ensure not to overwrite inadvertently unless it's the exact same hero or thumb file
                                            let uniqueTargetPath = path.join(targetDir, finalName);
                                            if (uniqueTargetPath !== existing.fullPath) {
                                                let counter = 1;
                                                while (fs.existsSync(uniqueTargetPath) && !['hero', 'thumb'].some(p => finalName.startsWith(p))) {
                                                    uniqueTargetPath = path.join(targetDir, `${path.basename(finalName, ext)}_${counter}${ext}`);
                                                    counter++;
                                                }
                                                // Check again if we're overwriting something critical. For hero/thumb it's OK locally since it's the same project.
                                                fs.renameSync(existing.fullPath, uniqueTargetPath);
                                            }
                                            if (explicitThumbFlag === match.path) {
                                                explicitThumbFlag = `/projects/${folderName}/${targetDir === newProjectDir ? '' : 'assets/' + path.basename(targetDir) + '/'}${path.basename(uniqueTargetPath)}`;
                                            }
                                        }
                                    }
                                }
                            } catch (e) {
                                console.error('Error applying existing media updates:', e);
                            }
                        }

                        // Process uploaded files
                        // req.files contains an array of file objects
                        if (req.files && req.files.length > 0) {
                            for (const file of req.files) {
                                // file.fieldname maps to the election choice if any: 
                                // e.g. "hero", "poster", "carousel", "video" based on frontend form input schema
                                let targetDir = imageDir;
                                const ext = path.extname(file.originalname).toLowerCase();
                                const isVideo = ['.mp4', '.webm', '.ogg'].includes(ext);
                                const isAudio = ['.mp3', '.m4a', '.wav'].includes(ext);

                                if (isVideo) targetDir = videoDir;
                                else if (isAudio) targetDir = audioDir;

                                let finalName = file.originalname;

                                // Check what role user elected for this file
                                const role = req.body[`file_role_${file.originalname}`];
                                if (role === 'hero') {
                                    finalName = `hero${ext}`;
                                } else if (role === 'poster') {
                                    targetDir = posterDir;
                                    // Make sure it doesn't overwrite if multiple posters
                                    // if it's the only poster it's fine, else poster1, poster2
                                } else if (role === 'audio') {
                                    targetDir = audioDir;
                                } else if (role === 'thumbnail') {
                                    targetDir = newProjectDir;
                                    finalName = `thumb${ext}`;
                                    thumbPath = `/projects/${folderName}/${finalName}`;
                                }

                                const targetPath = path.join(targetDir, finalName);

                                // Ensure unique name if not hero
                                let uniqueTargetPath = targetPath;
                                let counter = 1;
                                while (fs.existsSync(uniqueTargetPath)) {
                                    uniqueTargetPath = path.join(targetDir, `${path.basename(finalName, ext)}_${counter}${ext}`);
                                    counter++;
                                }

                                fs.renameSync(file.path, uniqueTargetPath);

                                if (req.body.explicit_thumb_new === file.originalname) {
                                    explicitThumbFlag = `/projects/${folderName}/${targetDir === newProjectDir ? '' : 'assets/' + path.basename(targetDir) + '/'}${path.basename(uniqueTargetPath)}`;
                                }
                            }
                        }

                        // Generate Markdown File
                        let mdContent = `---
title: "${title}"
date: "${date}"
client: "${client}"
`;
                        if (explicitThumbFlag) {
                            mdContent += `thumb: "${explicitThumbFlag}"\n`;
                        } else if (thumbPath) {
                            mdContent += `thumb: "${thumbPath}"\n`;
                        } else if (existingThumbFlag) {
                            mdContent += `thumb: "${existingThumbFlag}"\n`;
                        }
                        if (hashtags.length > 0) {
                            mdContent += 'hashtags:\n';
                            for (const tag of hashtags) {
                                mdContent += `  - "${tag.replace(/"/g, '\\"')}"\n`;
                            }
                        }
                        // add roles
                        if (credits.length > 0) {
                            mdContent += 'roles:\n';
                            for (const c of credits) {
                                mdContent += `  - role: "${c.role}"\n    name: "${c.name}"\n`;
                            }
                        }
                        mdContent += `---\n\n${description}`;

                        const mdPath = path.join(newProjectDir, `${folderName}.md`);
                        fs.writeFileSync(mdPath, mdContent);

                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ success: true, folder: folderName }));

                    } catch (e) {
                        res.statusCode = 500;
                        res.end(JSON.stringify({ success: false, error: e.message }));
                    }
                });
            });

            server.middlewares.use('/api/delete-project', (req, res, next) => {
                if (req.method !== 'POST') {
                    return next();
                }

                let body = '';
                req.on('data', chunk => {
                    body += chunk.toString();
                });
                req.on('end', () => {
                    try {
                        const payload = JSON.parse(body);
                        const projectId = payload.project_id;
                        if (!projectId) throw new Error('No project_id provided');

                        const targetDir = path.resolve(__dirname, 'public/projects', projectId);
                        // Ensure we are strictly inside the projects directory
                        if (!targetDir.startsWith(path.resolve(__dirname, 'public/projects'))) {
                            throw new Error('Invalid project_id');
                        }

                        if (fs.existsSync(targetDir)) {
                            fs.rmSync(targetDir, { recursive: true, force: true });
                        }

                        generateProjectDatabase();
                        server.ws.send({ type: 'full-reload' });

                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ success: true }));
                    } catch (e) {
                        res.statusCode = 500;
                        res.end(JSON.stringify({ success: false, error: e.message }));
                    }
                });
            });
        }
    };
}

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
                const audioDir = path.join(assetsDir, 'audio');

                let discoveredHero = null;
                let discoveredOtherVideos = [];
                let discoveredCarousel = [];
                let discoveredPosters = [];
                let discoveredAudio = [];
                let existingMedia = [];

                // Scan Videos
                if (fs.existsSync(videoDir)) {
                    const vids = fs.readdirSync(videoDir).filter(f => !f.startsWith('.'));
                    for (const v of vids) {
                        const p = `/projects/${folder}/assets/video/${v}`;
                        const isHero = v.toLowerCase().startsWith('hero');
                        if (isHero) {
                            discoveredHero = { type: 'video', sources: [p], aspectRatios: ["16:9"] };
                        } else {
                            // Extract a title from filename
                            const title = v.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").toUpperCase();
                            discoveredOtherVideos.push({ title, sources: [p], poster: `${p}#t=0`, aspectRatios: ["16:9"] });
                        }
                        existingMedia.push({ name: v, path: p, role: isHero ? 'hero' : 'auto' });
                    }
                }

                // Scan Carousel Images
                if (fs.existsSync(imageDir)) {
                    const imgs = fs.readdirSync(imageDir).filter(f => !f.startsWith('.')).sort();
                    for (const img of imgs) {
                        const p = `/projects/${folder}/assets/image/${img}`;
                        const isHero = img.toLowerCase().startsWith('hero') && !discoveredHero;
                        if (isHero) {
                            discoveredHero = { type: 'image', sources: [p] };
                        } else {
                            discoveredCarousel.push(p);
                        }
                        existingMedia.push({ name: img, path: p, role: isHero ? 'hero' : 'auto' });
                    }
                }

                // Scan Poster Images
                if (fs.existsSync(posterDir)) {
                    const posters = fs.readdirSync(posterDir).filter(f => !f.startsWith('.')).sort();
                    for (const p of posters) {
                        discoveredPosters.push(`/projects/${folder}/assets/poster/${p}`);
                        existingMedia.push({ name: p, path: `/projects/${folder}/assets/poster/${p}`, role: 'poster' });
                    }
                }

                // Scan Audio
                if (fs.existsSync(audioDir)) {
                    const audios = fs.readdirSync(audioDir).filter(f => !f.startsWith('.')).sort();
                    for (const a of audios) {
                        const p = `/projects/${folder}/assets/audio/${a}`;
                        const title = a.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").toUpperCase();
                        discoveredAudio.push({ title, path: p });
                        existingMedia.push({ name: a, path: p, role: 'audio' });
                    }
                }

                // Scan Thumbnail at root
                const rootFiles = fs.readdirSync(path.join(projectsDir, folder)).filter(f => !fs.statSync(path.join(projectsDir, folder, f)).isDirectory());
                for (const f of rootFiles) {
                    const l = f.toLowerCase();
                    if (l.startsWith('thumb') && !l.endsWith('.md') && !l.endsWith('.json') && !l.endsWith('.html')) {
                        existingMedia.push({ name: f, path: `/projects/${folder}/${f}`, role: 'thumbnail' });
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
                if (!data.audioFiles && discoveredAudio.length > 0) data.audioFiles = discoveredAudio;

                // Ensure hero video has a poster if available
                if (data.hero && data.hero.type === 'video' && !data.hero.poster && discoveredPosters.length > 0) {
                    data.hero.poster = discoveredPosters[0];
                }
                data.existingMedia = existingMedia;
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
        ${JSON.stringify({ ...data, overview: htmlDescription, descriptionRaw: content, id: folder })}
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

                // Extract plain text for search indexing
                const plainDescription = content.replace(/#(.*)/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1').replace(/\n/g, ' ').substring(0, 500).trim();

                // Add to global index database
                projects.push({
                    id: folder,
                    title: data.title || folder,
                    client: data.client || data.author || 'Project',
                    description: plainDescription || data.description || '',
                    date: data.date || new Date().toISOString().split('T')[0],
                    thumb: data.thumb || data.hero?.poster || (data.hero?.type === 'image' ? data.hero.sources?.[0] : null) || `/projects/${folder}/thumb.jpg`,
                    hashtags: data.hashtags ? (Array.isArray(data.hashtags) ? data.hashtags : [data.hashtags]) : [data.client?.toLowerCase(), data.author?.toLowerCase()].filter(Boolean),
                    roles: data.roles || data.credits || []
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
                        // Handle legacy bindings
                        metadata.roles = metadata.roles || metadata.credits || [];
                        metadata.client = metadata.client || metadata.author || '';
                        if (!metadata.description && metadata.overview) {
                            metadata.description = metadata.overview.replace(/<[^>]*>?/gm, '').substring(0, 500).trim();
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

function projectDatabasePlugin() {
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
    plugins: [projectDatabasePlugin(), projectCreatorPlugin()]
});
