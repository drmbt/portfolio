import { setupWizard } from '../wizard.js';
import '../wizard.css';

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

class ProjectTemplate {
    constructor() {
        this.app = document.getElementById('app');
        this.lightbox = null;
        this.lightboxImg = null;
        this.currentGallery = [];
        this.currentGalleryIndex = 0;

        this.init();
    }

    async init() {
        this.data = this.parseData();
        if (!this.data) return;

        // Procedurally load related projects if none specified in Markdown
        if (!this.data.relatedProjects || this.data.relatedProjects.length === 0) {
            try {
                const res = await fetch('/projects/index.json');
                if (res.ok) {
                    const allProjects = await res.json();
                    const others = allProjects.filter(p => p.id !== this.data.id);
                    others.sort(() => 0.5 - Math.random());
                    const selected = others.slice(0, 3);

                    this.data.relatedProjects = selected.map(p => ({
                        title: p.title,
                        slug: p.id,
                        thumbnail: p.thumb
                    }));
                }
            } catch (e) {
                console.warn('Failed to load related projects dynamically.', e);
            }
        }

        this.render();
        this.setupGlobalHeader();
        this.setupHeroPlayer();
        this.setupCarousel();
        this.setupOtherVideos();
        this.setupAudioPlayers();
    }

    parseData() {
        try {
            const el = document.getElementById('project-meta');
            return JSON.parse(el.textContent);
        } catch (e) {
            console.error('Failed to parse project data', e);
            return null;
        }
    }

    render() {
        const headerHtml = `
            <div class="global-header" id="global-header">
                <div>
                    <a href="/index.html" class="hero-return-btn">RETURN TO PROJECTS</a>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem;">
                    <div>${this.data.title}</div>
                    <div style="color: #888;">${this.data.client || ''}</div>
                    <button id="edit-project-btn" title="Edit Project" style="background:none;border:none;color:#888;cursor:pointer;padding:0;margin-top:4px;transition:color 0.2s;display:flex;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        // 1. Hero
        let heroHtml = '';
        if (this.data.hero?.type === 'video') {
            heroHtml = `
                <div class="hero-section" id="hero-section">
                    <video class="hero-video" id="hero-video" autoplay muted loop playsinline poster="${this.data.hero.poster || ''}">
                        ${this.data.hero.sources.map(src => `<source src="${src}" type="video/mp4">`).join('')}
                    </video>
                    <div class="hero-overlay" id="hero-overlay">
                        <div class="hero-controls">
                            <button id="hero-play-btn" style="background: none; border: none; color: white; cursor: pointer; font-family: inherit;">PAUSE</button>
                            <button id="hero-mute-btn" style="background: none; border: none; color: white; cursor: pointer; font-family: inherit; margin-left: 1rem;">UNMUTE</button>
                            <div class="scrub-bar" id="hero-scrub-bar">
                                <div class="scrub-progress" id="hero-scrub-progress"></div>
                            </div>
                            <div id="hero-timecode">0:00</div>
                        </div>
                    </div>
                </div>
            `;
        } else if (this.data.hero?.type === 'image') {
            heroHtml = `
                <div class="hero-section">
                    <img class="hero-video" src="${this.data.hero.poster || this.data.hero.sources[0]}" alt="${this.data.title}" />
                    <div class="hero-overlay" id="hero-overlay">
                    </div>
                </div>
            `;
        }

        // 2. Ramp
        const rampHtml = `<div class="ramp-section"></div>`;

        // 3. Overview
        const overviewHtml = `
            <section class="overview-section">
                <div class="section-label">PROJECT OVERVIEW</div>
                <div class="overview-content">${this.data.overview || ''}</div>
            </section>
        `;

        // 4. Other Videos
        let otherVideosHtml = '';
        if (this.data.otherVideos && this.data.otherVideos.length > 0) {
            otherVideosHtml = `
                <section class="other-videos-section">
                    <div class="section-label">OTHER VIDEOS</div>
                    <div class="other-videos-grid">
                        ${this.data.otherVideos.map((vid, idx) => `
                            <div class="video-thumb" data-idx="${idx}">
                                <video class="video-thumb-preview" muted playsinline style="width:100%; aspect-ratio:16/9; object-fit:cover; pointer-events:none; border:1px solid rgba(255,255,255,0.1);">
                                    <source src="${vid.sources[0]}#t=3" type="video/mp4">
                                </video>
                                <div class="video-thumb-title">${vid.title}</div>
                            </div>
                        `).join('')}
                    </div>
                </section>
            `;
        }

        // 4.5 Audio
        let audioHtml = '';
        if (this.data.audioFiles && this.data.audioFiles.length > 0) {
            audioHtml = `
                <section class="audio-section">
                    <div class="section-label">AUDIO</div>
                    <div class="audio-list">
                        ${this.data.audioFiles.map((aud, idx) => `
                            <div class="audio-player" data-idx="${idx}">
                                <audio class="audio-element" src="${aud.path}" preload="metadata"></audio>
                                <button class="audio-play-btn" style="background:none;border:none;color:inherit;cursor:pointer;font-family:inherit;padding-right:1rem;">PLAY</button>
                                <div class="audio-title" style="min-width: 150px;">${aud.title}</div>
                                <div class="scrub-bar audio-scrub-bar" style="flex-grow:1; margin:0 1rem; position:relative; height:4px; background:rgba(255,255,255,0.3); cursor:pointer;">
                                    <div class="scrub-progress audio-scrub-progress" style="height:100%; background:var(--text-color); width:0%;"></div>
                                </div>
                                <div class="audio-timecode" style="min-width:40px; text-align:right;">0:00</div>
                                <button class="audio-mute-btn" style="background:none;border:none;color:inherit;cursor:pointer;font-family:inherit;margin-left:1rem;">MUTE</button>
                            </div>
                        `).join('')}
                    </div>
                </section>
            `;
        }

        // 5. Poster
        let posterHtml = '';
        if (this.data.posterImages && this.data.posterImages.length > 0) {
            posterHtml = `
                <section class="poster-section">
                    ${this.data.posterImages.map(row => {
                // Support legacy 1D arrays or new 2D rows
                const items = Array.isArray(row) ? row : [row];
                return `
                        <div class="poster-row">
                            ${items.map(img => `
                                <img src="${img}" class="poster-img lightbox-trigger" data-gallery="poster" loading="lazy" />
                            `).join('')}
                        </div>
                        `;
            }).join('')}
                </section>
            `;
        }

        // 6. Carousel
        let carouselHtml = '';
        if (this.data.carouselImages && this.data.carouselImages.length > 0) {
            // Duplicate images for infinite scroll effect immediately in DOM
            const allImages = [...this.data.carouselImages, ...this.data.carouselImages];
            carouselHtml = `
                <section class="carousel-section">
                    <div class="section-label" style="margin-left: 2rem;">OTHER CONTENT</div>
                    <div class="carousel-track" id="carousel-track">
                        ${allImages.map((img, idx) => `
                            <img src="${img}" class="carousel-img lightbox-trigger" data-gallery="carousel" data-raw-idx="${idx % this.data.carouselImages.length}" draggable="false" />
                        `).join('')}
                    </div>
                </section>
            `;
        }

        // 7. Credits
        let creditsHtml = '';
        const rolesData = this.data.roles || this.data.credits;
        if (rolesData && rolesData.length > 0) {
            creditsHtml = `
                <section class="credits-section">
                    <div class="section-label">ROLES</div>
                    <div class="credits-list">
                    ${rolesData.map(cred => `
                        <div class="credit-row">
                            <span class="credit-role">${cred.role}</span>
                            <span class="credit-separator">&bull;</span>
                            <span class="credit-name">${cred.name}</span>
                        </div>
                    `).join('')}
                    </div>
                </section>
            `;
        }

        // 8. Other Projects
        let relatedHtml = '';
        if (this.data.relatedProjects && this.data.relatedProjects.length > 0) {
            relatedHtml = `
                <section class="related-projects-section">
                    <div class="section-label">PROJECTS</div>
                    <div class="related-projects-grid">
                        ${this.data.relatedProjects.map(proj => `
                            <a href="/projects/${proj.slug}/index.html" class="related-project">
                                <img src="${proj.thumbnail}" alt="${proj.title}" loading="lazy" />
                                <div>${proj.title}</div>
                            </a>
                        `).join('')}
                    </div>
                </section>
            `;
        }

        // Lightbox Shell
        const lightboxHtml = `
            <div class="lightbox" id="lightbox">
                <button class="lightbox-close" id="lightbox-close">ESC / CLOSE</button>
                <img class="lightbox-img" id="lightbox-img" src="" alt="Fullscreen Image" />
                <div class="lightbox-nav">
                    <button id="lightbox-prev">&larr;</button>
                    <button id="lightbox-next">&rarr;</button>
                </div>
            </div>
        `;

        this.app.innerHTML = `
            ${headerHtml}
            ${heroHtml}
            ${rampHtml}
            ${overviewHtml}
            ${otherVideosHtml}
            ${audioHtml}
            ${posterHtml}
            ${carouselHtml}
            ${creditsHtml}
            ${relatedHtml}
            ${lightboxHtml}
        `;

        this.setupLightbox();
    }

    setupHeroPlayer() {
        const video = document.getElementById('hero-video');
        if (!video) return;

        const overlay = document.getElementById('hero-overlay');
        const playBtn = document.getElementById('hero-play-btn');
        const muteBtn = document.getElementById('hero-mute-btn');
        const scrubBar = document.getElementById('hero-scrub-bar');
        const scrubProgress = document.getElementById('hero-scrub-progress');
        const timecode = document.getElementById('hero-timecode');

        let idleTimeout;
        const resetIdle = () => {
            const header = document.getElementById('global-header');
            if (overlay) overlay.classList.remove('idle');
            if (header) header.classList.remove('idle');

            clearTimeout(idleTimeout);
            idleTimeout = setTimeout(() => {
                if (overlay) overlay.classList.add('idle');
                if (header) header.classList.add('idle');
            }, 3000);
        };

        document.addEventListener('mousemove', resetIdle);
        document.addEventListener('keydown', resetIdle);
        resetIdle();

        playBtn.addEventListener('click', () => {
            if (video.paused) {
                video.play();
                playBtn.textContent = 'PAUSE';
            } else {
                video.pause();
                playBtn.textContent = 'PLAY';
            }
        });

        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                video.muted = !video.muted;
                muteBtn.textContent = video.muted ? 'UNMUTE' : 'MUTE';
            });
        }

        video.addEventListener('timeupdate', () => {
            if (!video.duration) return;
            const progress = (video.currentTime / video.duration) * 100;
            scrubProgress.style.width = `${progress}%`;

            const mins = Math.floor(video.currentTime / 60);
            const secs = Math.floor(video.currentTime % 60).toString().padStart(2, '0');
            timecode.textContent = `${mins}:${secs}`;
        });

        scrubBar.addEventListener('click', (e) => {
            const rect = scrubBar.getBoundingClientRect();
            const pos = clamp((e.clientX - rect.left) / rect.width, 0, 1);
            video.currentTime = pos * video.duration;
        });
    }

    setupGlobalHeader() {
        const header = document.getElementById('global-header');
        if (!header) return;

        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });

        const editBtn = document.getElementById('edit-project-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                if (window.openNewProjectWizard) {
                    window.openNewProjectWizard(this.data);
                }
            });
        }
    }

    setupCarousel() {
        const track = document.getElementById('carousel-track');
        if (!track) return;

        let scrollPos = 0;
        let isDragging = false;
        let startX = 0;
        let scrollLeft = 0;
        let rafId;
        let autoScrollSpeed = 1.2; // Increased speed
        let isAutoScrolling = true;
        let resumeTimeout;

        let loopWidth = 0;

        // Use ResizeObserver to dynamically update loopWidth as lazy-loaded images load in.
        const observer = new ResizeObserver(() => {
            loopWidth = track.scrollWidth / 2;
        });
        observer.observe(track);

        const tick = () => {
            if (isAutoScrolling && !isDragging && loopWidth > 0) {
                scrollPos += autoScrollSpeed;
                if (scrollPos >= loopWidth) {
                    scrollPos -= loopWidth; // Smooth loop instead of jumping to 0
                }
                track.style.transform = `translateX(-${scrollPos}px)`;
            }
            rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);

        const stopAuto = () => {
            isAutoScrolling = false;
            clearTimeout(resumeTimeout);
        };

        const resumeAuto = () => {
            clearTimeout(resumeTimeout);
            resumeTimeout = setTimeout(() => {
                isAutoScrolling = true;
            }, 2000);
        };

        // Trackpad / Scroll Wheel Support
        track.addEventListener('wheel', (e) => {
            // Prevent vertical page scroll if they're trying to scroll horizontally
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                e.preventDefault();
            }

            stopAuto();

            scrollPos += e.deltaX;

            // Manual looping bounds
            if (loopWidth > 0) {
                if (scrollPos < 0) {
                    scrollPos += loopWidth;
                } else if (scrollPos >= loopWidth) {
                    scrollPos -= loopWidth;
                }
            }

            track.style.transform = `translateX(-${scrollPos}px)`;
            resumeAuto();
        }, { passive: false });

        track.addEventListener('mousedown', (e) => {
            isDragging = true;
            stopAuto();
            // Calculate current translation
            const style = window.getComputedStyle(track);
            const matrix = new WebKitCSSMatrix(style.transform);
            scrollPos = Math.abs(matrix.m41);
            startX = e.pageX;
            scrollLeft = scrollPos;
        });

        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                resumeAuto();
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX;
            const walk = (x - startX) * 1.5; // Scroll fast
            scrollPos = scrollLeft - walk;

            // Handle manual looping
            if (scrollPos < 0) {
                scrollPos += loopWidth;
                startX = x;
                scrollLeft = scrollPos;
            } else if (scrollPos >= loopWidth) {
                scrollPos -= loopWidth;
                startX = x;
                scrollLeft = scrollPos;
            }

            track.style.transform = `translateX(-${scrollPos}px)`;
        });

        track.addEventListener('mouseenter', stopAuto);
        track.addEventListener('mouseleave', () => {
            if (!isDragging) resumeAuto();
        });
    }

    setupLightbox() {
        this.lightbox = document.getElementById('lightbox');
        this.lightboxImg = document.getElementById('lightbox-img');

        const closeBtn = document.getElementById('lightbox-close');
        const prevBtn = document.getElementById('lightbox-prev');
        const nextBtn = document.getElementById('lightbox-next');

        const triggers = document.querySelectorAll('.lightbox-trigger');
        triggers.forEach((el, index) => {
            el.addEventListener('click', (e) => {
                // If it was a drag, don't open
                if (e.defaultPrevented) return;

                const galleryType = el.dataset.gallery;
                if (galleryType === 'carousel') {
                    this.currentGallery = this.data.carouselImages;
                    this.currentGalleryIndex = parseInt(el.dataset.rawIdx);
                } else {
                    // Flatten the 2D array if it's composed of rows
                    this.currentGallery = this.data.posterImages.flat();
                    // Find index among posters in the DOM
                    const posters = Array.from(document.querySelectorAll('.poster-img'));
                    this.currentGalleryIndex = posters.indexOf(el);
                }

                this.openLightbox();
            });
        });

        closeBtn.addEventListener('click', () => this.closeLightbox());
        prevBtn.addEventListener('click', () => this.navigateLightbox(-1));
        nextBtn.addEventListener('click', () => this.navigateLightbox(1));

        document.addEventListener('keydown', (e) => {
            if (!this.lightbox.classList.contains('active')) return;
            if (e.key === 'Escape') this.closeLightbox();
            if (e.key === 'ArrowLeft') this.navigateLightbox(-1);
            if (e.key === 'ArrowRight') this.navigateLightbox(1);
        });
    }

    openLightbox() {
        this.updateLightboxImg();
        this.lightbox.classList.add('active');
    }

    closeLightbox() {
        this.lightbox.classList.remove('active');
    }

    navigateLightbox(dir) {
        this.currentGalleryIndex += dir;
        if (this.currentGalleryIndex < 0) {
            this.currentGalleryIndex = this.currentGallery.length - 1;
        } else if (this.currentGalleryIndex >= this.currentGallery.length) {
            this.currentGalleryIndex = 0;
        }
        this.updateLightboxImg();
    }

    updateLightboxImg() {
        // Simple wipe trick by resetting src
        const src = this.currentGallery[this.currentGalleryIndex];
        this.lightboxImg.style.animation = 'none';
        this.lightboxImg.offsetHeight; /* trigger reflow */
        this.lightboxImg.style.animation = null;
        this.lightboxImg.src = src;
    }

    setupOtherVideos() {
        // Clicking "other video" swaps it into the hero and moves the old hero into the grid
        const videoThumbs = document.querySelectorAll('.video-thumb');
        videoThumbs.forEach((thumb, domIdx) => {
            thumb.addEventListener('click', () => {
                const idx = thumb.dataset.idx;
                const clickedVideoData = this.data.otherVideos[idx];

                // Cache current hero data
                const oldHeroData = {
                    title: this.data.title, // or 'HERO', depending on naming convention
                    sources: [...this.data.hero.sources],
                    poster: this.data.hero.poster
                };

                // Swap data logic
                this.data.hero.sources = clickedVideoData.sources;
                this.data.hero.poster = clickedVideoData.poster;

                this.data.otherVideos[idx] = {
                    title: oldHeroData.title,
                    sources: oldHeroData.sources,
                    poster: oldHeroData.poster
                };

                // Re-render the entire view to reflect the swapped data blocks
                // We clear standard event listeners internally by overwriting innerHTML and recalling setups
                // It's cleaner than modifying individual DOM nodes heavily.
                this.render();
                this.setupGlobalHeader();
                this.setupHeroPlayer();
                this.setupCarousel();
                this.setupOtherVideos();
                this.setupAudioPlayers();

                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }

    setupAudioPlayers() {
        const audioPlayers = document.querySelectorAll('.audio-player');
        audioPlayers.forEach(player => {
            const audio = player.querySelector('.audio-element');
            const playBtn = player.querySelector('.audio-play-btn');
            const scrubBar = player.querySelector('.audio-scrub-bar');
            const scrubProgress = player.querySelector('.audio-scrub-progress');
            const timecode = player.querySelector('.audio-timecode');
            const muteBtn = player.querySelector('.audio-mute-btn');

            playBtn.addEventListener('click', () => {
                if (audio.paused) {
                    // Auto-pause other audios
                    document.querySelectorAll('.audio-element').forEach(a => {
                        if (a !== audio) {
                            a.pause();
                            const otherPlayBtn = a.parentElement.querySelector('.audio-play-btn');
                            if (otherPlayBtn) otherPlayBtn.textContent = 'PLAY';
                        }
                    });

                    audio.play();
                    playBtn.textContent = 'PAUSE';
                } else {
                    audio.pause();
                    playBtn.textContent = 'PLAY';
                }
            });

            if (muteBtn) {
                muteBtn.addEventListener('click', () => {
                    audio.muted = !audio.muted;
                    muteBtn.textContent = audio.muted ? 'UNMUTE' : 'MUTE';
                });
            }

            audio.addEventListener('timeupdate', () => {
                if (!audio.duration) return;
                const progress = (audio.currentTime / audio.duration) * 100;
                scrubProgress.style.width = `${progress}%`;

                const mins = Math.floor(audio.currentTime / 60);
                const secs = Math.floor(audio.currentTime % 60).toString().padStart(2, '0');
                timecode.textContent = `${mins}:${secs}`;
            });

            // Update scrub bar on scrub
            scrubBar.addEventListener('click', (e) => {
                const rect = scrubBar.getBoundingClientRect();
                const pos = clamp((e.clientX - rect.left) / rect.width, 0, 1);
                if (audio.duration) {
                    audio.currentTime = pos * audio.duration;
                }
            });

            // Reset when audio finishes playing
            audio.addEventListener('ended', () => {
                playBtn.textContent = 'PLAY';
                scrubProgress.style.width = '0%';
                audio.currentTime = 0;
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupWizard();
    new ProjectTemplate();
});
