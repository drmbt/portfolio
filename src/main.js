import './style.css';
import Fuse from 'fuse.js';

class PortfolioApp {
  constructor() {
    this.projects = [];
    this.filteredProjects = [];
    this.activeHashtags = new Set();
    this.viewMode = 'grid'; // 'grid' | 'list'
    this.fuse = null;

    // DOM Elements
    this.container = document.getElementById('project-container');
    this.searchInput = document.getElementById('search-input');
    this.gridViewBtn = document.getElementById('grid-view-btn');
    this.listViewBtn = document.getElementById('list-view-btn');
    this.activeFiltersContainer = document.getElementById('active-filters-container');

    this.init();
  }

  async init() {
    await this.fetchProjects();
    this.setupFuse();
    this.bindEvents();
    this.render();
  }

  async fetchProjects() {
    try {
      // Force cache-busting for static servers that hold onto old JSON
      const res = await fetch(`/projects/index.json?t=${new Date().getTime()}`);
      if (!res.ok) throw new Error('Failed to fetch projects database');
      this.projects = await res.json();

      // Sort projects by date descending (newest first)
      this.projects.sort((a, b) => new Date(b.date) - new Date(a.date));
      this.filteredProjects = [...this.projects];
    } catch (err) {
      console.error(err);
      this.container.innerHTML = `<div class="no-results"><p>Error loading projects. Ensure local server is running.</p></div>`;
    }
  }

  setupFuse() {
    const options = {
      keys: ['title', 'description', 'hashtags'],
      threshold: 0.3, // Lower threshold = stricter matching
      includeScore: true,
      useExtendedSearch: true
    };
    this.fuse = new Fuse(this.projects, options);
  }

  bindEvents() {
    this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

    this.gridViewBtn.addEventListener('click', () => this.setViewMode('grid'));
    this.listViewBtn.addEventListener('click', () => this.setViewMode('list'));

    // Delegate clicks for hashtags within the project container
    this.container.addEventListener('click', (e) => {
      const hashtagElement = e.target.closest('.hashtag');
      if (hashtagElement) {
        e.stopPropagation(); // prevent clicking the card
        const tag = hashtagElement.dataset.tag;
        this.toggleHashtagFilter(tag);
      }
    });

    // Delegate clicks for active filter removals
    this.activeFiltersContainer.addEventListener('click', (e) => {
      const filterTag = e.target.closest('.filter-tag');
      if (filterTag) {
        const tag = filterTag.dataset.tag;
        this.toggleHashtagFilter(tag);
      }
    });
  }

  handleSearch(query) {
    if (!query.trim()) {
      this.applyFilters();
      return;
    }

    const results = this.fuse.search(query);
    // Extract the items from Fuse search results
    const searchedItems = results.map(result => result.item);

    this.applyFilters(searchedItems);
  }

  toggleHashtagFilter(tag) {
    if (this.activeHashtags.has(tag)) {
      this.activeHashtags.delete(tag);
    } else {
      this.activeHashtags.add(tag);
    }

    // Clear search input if user clicks a hashtag to filter
    this.searchInput.value = '';
    this.applyFilters();
    this.renderActiveFilters();
  }

  applyFilters(baseSet = null) {
    let sourceData = baseSet || this.projects;

    if (this.activeHashtags.size > 0) {
      this.filteredProjects = sourceData.filter(project => {
        // Project must have all active hashtags
        const projectTags = new Set(project.hashtags);
        for (const activeTag of this.activeHashtags) {
          if (!projectTags.has(activeTag)) return false;
        }
        return true;
      });
    } else {
      this.filteredProjects = sourceData;
    }

    this.render();
  }

  setViewMode(mode) {
    if (this.viewMode === mode) return;
    this.viewMode = mode;

    this.container.className = `${mode}-view`;

    if (mode === 'grid') {
      this.gridViewBtn.classList.add('active');
      this.listViewBtn.classList.remove('active');
    } else {
      this.listViewBtn.classList.add('active');
      this.gridViewBtn.classList.remove('active');
    }
  }

  renderActiveFilters() {
    this.activeFiltersContainer.innerHTML = '';

    this.activeHashtags.forEach(tag => {
      const tagEl = document.createElement('div');
      tagEl.className = 'filter-tag';
      tagEl.dataset.tag = tag;
      tagEl.innerHTML = `#${tag} <span class="remove">×</span>`;
      this.activeFiltersContainer.appendChild(tagEl);
    });
  }

  render() {
    this.container.innerHTML = '';

    if (this.filteredProjects.length === 0) {
      this.container.innerHTML = '<div class="no-results"><p>No projects found matching your criteria.</p></div>';
      return;
    }

    const fragment = document.createDocumentFragment();

    this.filteredProjects.forEach(project => {
      const card = document.createElement('article');
      card.className = 'project-card';
      // Navigate to the standalone project folder's index.html
      card.addEventListener('click', () => {
        window.location.href = `/projects/${project.id}/index.html`;
      });

      const tagsHtml = project.hashtags
        .map(tag => `<span class="hashtag" data-tag="${tag}">#${tag}</span>`)
        .join('');

      card.innerHTML = `
        <img class="project-thumb" src="${project.thumb}" alt="${project.title}" loading="lazy" />
        <div class="project-info">
          <div>
            <h2 class="project-title">${project.title}</h2>
            ${this.viewMode === 'list' ? `<p class="project-desc">${project.description}</p>` : ''}
          </div>
          <div class="project-hashtags">
            ${tagsHtml}
          </div>
        </div>
      `;

      fragment.appendChild(card);
    });

    this.container.appendChild(fragment);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PortfolioApp();
});
