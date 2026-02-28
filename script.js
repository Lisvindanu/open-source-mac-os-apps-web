// Global variables
let allApps = [];
let filteredApps = [];
let appData = null;

// Load apps from JSON
async function loadApps() {
    try {
        const response = await fetch('apps.json');
        appData = await response.json();

        allApps = appData.apps;
        filteredApps = allApps;

        // Update stats
        updateStats();

        // Initialize filters
        initializeFilters();

        // Display all apps
        displayApps(allApps);
    } catch (error) {
        console.error('Error loading apps:', error);
        document.getElementById('apps-container').innerHTML =
            '<div class="no-results"><p>Error loading applications. Please try again later.</p></div>';
    }
}

// Update statistics
function updateStats() {
    document.getElementById('stat-apps').textContent = appData.stats.total_apps;
    document.getElementById('stat-categories').textContent = appData.stats.total_categories;
    document.getElementById('stat-languages').textContent = appData.languages.length;
    document.getElementById('total-apps').textContent = appData.stats.total_apps;
}

// Initialize filter dropdowns
function initializeFilters() {
    const categoryFilter = document.getElementById('category-filter');
    const languageFilter = document.getElementById('language-filter');

    // Add categories (sorted by name)
    const categories = Object.keys(appData.stats.categories).sort();
    categories.forEach(category => {
        const count = appData.stats.categories[category];
        const option = document.createElement('option');
        option.value = category;
        option.textContent = `${category} (${count})`;
        categoryFilter.appendChild(option);
    });

    // Add languages (already sorted from parser)
    appData.languages.forEach(language => {
        const option = document.createElement('option');
        option.value = language;
        option.textContent = language;
        languageFilter.appendChild(option);
    });

    // Add event listeners
    document.getElementById('search').addEventListener('input', filterApps);
    categoryFilter.addEventListener('change', filterApps);
    languageFilter.addEventListener('change', filterApps);
    document.getElementById('sort-filter').addEventListener('change', filterApps);
}

// Filter apps based on search and filters
function filterApps() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const categoryFilter = document.getElementById('category-filter').value;
    const languageFilter = document.getElementById('language-filter').value;
    const sortFilter = document.getElementById('sort-filter').value;

    filteredApps = allApps.filter(app => {
        // Search filter
        const matchesSearch = !searchTerm ||
            app.name.toLowerCase().includes(searchTerm) ||
            app.description.toLowerCase().includes(searchTerm) ||
            app.languages.some(lang => lang.toLowerCase().includes(searchTerm));

        // Category filter
        const matchesCategory = !categoryFilter || app.category === categoryFilter;

        // Language filter
        const matchesLanguage = !languageFilter || app.languages.includes(languageFilter);

        return matchesSearch && matchesCategory && matchesLanguage;
    });

    // Sort apps
    filteredApps.sort((a, b) => {
        switch (sortFilter) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'name-desc':
                return b.name.localeCompare(a.name);
            case 'recent':
                // Sort by apps with last_commit first, then alphabetically
                if (a.last_commit && !b.last_commit) return -1;
                if (!a.last_commit && b.last_commit) return 1;
                return a.name.localeCompare(b.name);
            case 'popular':
                // Sort by apps with stars first, then alphabetically
                if (a.stars && !b.stars) return -1;
                if (!a.stars && b.stars) return 1;
                return a.name.localeCompare(b.name);
            default:
                return 0;
        }
    });

    updateResultsCount();
    displayApps(filteredApps);
}

// Update results count
function updateResultsCount() {
    const count = filteredApps.length;
    const total = allApps.length;
    const resultsCount = document.getElementById('results-count');

    if (count === total) {
        resultsCount.textContent = `Showing all ${total} applications`;
    } else {
        resultsCount.textContent = `Showing ${count} of ${total} applications`;
    }
}

// Display apps in the grid
function displayApps(apps) {
    const container = document.getElementById('apps-container');

    if (apps.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <p>No applications found matching your criteria.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = apps.map(app => createAppCard(app)).join('');
}

// Create HTML for a single app card
function createAppCard(app) {
    // Get first screenshot or use placeholder
    const screenshotHTML = app.screenshots.length > 0
        ? `<img src="${app.screenshots[0]}" alt="${escapeHtml(app.name)}" loading="lazy">`
        : `<div class="app-screenshot-placeholder">${getFirstLetter(app.name)}</div>`;

    // No images badge
    const noImageBadge = app.screenshots.length === 0
        ? `<div class="no-image-badge">⚠️ No Images</div>`
        : '';

    // Get first 2 languages for compact display
    const languagesHTML = app.languages.slice(0, 2).map(lang =>
        `<span class="language-tag-small">${lang}</span>`
    ).join('');

    const moreLanguages = app.languages.length > 2
        ? `<span class="language-tag-small">+${app.languages.length - 2}</span>`
        : '';

    return `
        <div class="app-card" onclick="showAppDetail('${app.id}')">
            <div class="app-screenshot">
                ${screenshotHTML}
                ${noImageBadge}
            </div>
            <div class="app-info">
                <div class="app-category-badge">${escapeHtml(app.category)}</div>
                <div class="app-name">${escapeHtml(app.name)}</div>
                <p class="app-description">${escapeHtml(app.description || 'No description available.')}</p>
                ${languagesHTML || moreLanguages ? `
                    <div class="app-languages-compact">
                        ${languagesHTML}
                        ${moreLanguages}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Get first letter for placeholder
function getFirstLetter(name) {
    return name.charAt(0).toUpperCase();
}

// Show app detail modal
function showAppDetail(appId) {
    const app = allApps.find(a => a.id === appId);
    if (!app) return;

    const modal = document.getElementById('app-modal');
    const modalBody = document.getElementById('modal-body');

    // Build header image
    const headerImage = app.screenshots.length > 0
        ? `<img src="${app.screenshots[0]}" alt="${escapeHtml(app.name)}" class="modal-header-image">`
        : '';

    // Build languages section
    const languagesHTML = app.languages.length > 0 ? `
        <div class="modal-section">
            <div class="modal-section-title">Programming Languages</div>
            <div class="modal-languages">
                ${app.languages.map(lang => {
                    const iconPath = getLanguageIcon(lang);
                    return `
                        <span class="language-tag">
                            <img src="${iconPath}" alt="${lang}" class="language-icon" onerror="this.style.display='none'">
                            ${lang}
                        </span>
                    `;
                }).join('')}
            </div>
        </div>
    ` : '';

    // Build links
    const links = [];
    links.push(`
        <a href="${app.url}" target="_blank" rel="noopener noreferrer" class="modal-link">
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            View on GitHub
        </a>
    `);

    if (app.website) {
        links.push(`
            <a href="${app.website}" target="_blank" rel="noopener noreferrer" class="modal-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                Visit Website
            </a>
        `);
    }

    // Build screenshots section
    const screenshotsHTML = app.screenshots.length > 1 ? `
        <div class="modal-section">
            <div class="modal-section-title">Screenshots (${app.screenshots.length})</div>
            <div class="modal-screenshots">
                ${app.screenshots.map(screenshot => `
                    <img src="${screenshot}" alt="${escapeHtml(app.name)} screenshot"
                         class="modal-screenshot" loading="lazy"
                         onclick="window.open('${screenshot}', '_blank')">
                `).join('')}
            </div>
        </div>
    ` : '';

    modalBody.innerHTML = `
        ${headerImage}
        <h2 class="modal-title">${escapeHtml(app.name)}</h2>
        <div class="modal-meta">
            <span class="modal-badge">📂 ${escapeHtml(app.category)}</span>
            ${app.screenshots.length > 0 ? `<span class="modal-badge">📸 ${app.screenshots.length} Screenshots</span>` : ''}
        </div>
        ${app.description ? `<p class="modal-description">${escapeHtml(app.description)}</p>` : ''}
        ${languagesHTML}
        <div class="modal-section">
            <div class="modal-links">
                ${links.join('')}
            </div>
        </div>
        ${screenshotsHTML}
    `;

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal() {
    const modal = document.getElementById('app-modal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Get language icon path
function getLanguageIcon(language) {
    const iconMap = {
        'C': 'icons/c-64.png',
        'C++': 'icons/cpp-64.png',
        'C#': 'icons/csharp-64.png',
        'Clojure': 'icons/clojure-64.png',
        'CoffeeScript': 'icons/coffeescript-64.png',
        'CSS': 'icons/css-64.png',
        'Elm': 'icons/elm-64.png',
        'Go': 'icons/golang-64.png',
        'Haskell': 'icons/haskell-64.png',
        'Java': 'icons/java-64.png',
        'JavaScript': 'icons/javascript-64.png',
        'Lua': 'icons/Lua-64.png',
        'Objective-C': 'icons/objective-c-64.png',
        'Python': 'icons/python-64.png',
        'Ruby': 'icons/ruby-64.png',
        'Rust': 'icons/rust-64.png',
        'Shell': 'icons/shell-64.png',
        'Swift': 'icons/swift-64.png',
        'TypeScript': 'icons/typescript-64.png',
        'Metal': 'icons/metal-64.png'
    };

    return iconMap[language] || 'icons/icon.png';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', loadApps);
