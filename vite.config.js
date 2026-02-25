import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';

function projectDatabasePlugin() {
    function generateProjectDatabase() {
        const projectsDir = path.resolve(__dirname, 'public/projects');
        const projects = [];

        if (fs.existsSync(projectsDir)) {
            const folders = fs.readdirSync(projectsDir).filter(f => fs.statSync(path.join(projectsDir, f)).isDirectory());

            for (const folder of folders) {
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
        fs.writeFileSync(path.join(projectsDir, 'index.json'), JSON.stringify(projects, null, 2));
        console.log('Project database index.json generated successfully.');
    }

    return {
        name: 'vite-plugin-project-database',
        buildStart() {
            generateProjectDatabase();
        },
        handleHotUpdate({ file, server }) {
            if (file.includes('public/projects/') && file.endsWith('index.html')) {
                generateProjectDatabase();
                server.ws.send({ type: 'full-reload' });
            }
        }
    };
}

export default defineConfig({
    plugins: [projectDatabasePlugin()]
});
