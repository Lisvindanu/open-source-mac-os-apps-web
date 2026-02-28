// Global variables
let allApps = [];
let filteredApps = [];
let categories = new Set();
let languages = new Set();

// Load and parse README
async function loadApps() {
    try {
        const response = await fetch('README.md');
        const text = await response.text();
        parseReadme(text);
        initializeFilters();
        displayApps(allApps);
    } catch (error) {
        console.error('Error loading README:', error);
        document.getElementById('apps-container').innerHTML = '<div class="no-results">Error loading applications. Please try again later.</div>';
    }
}

// Parse README markdown
function parseReadme(text) {
    const lines = text.split('\n');
    let currentCategory = '';
    let currentApp = null;
    let inApp = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Match category headers like "### 🎵 Audio (39)"
        const categoryMatch = line.match(/^###\s+(.+?)\s+\((\d+)\)/);
        if (categoryMatch) {
            currentCategory = categoryMatch[1].replace(/^[^\w]+/, '').trim(); // Remove emoji
            categories.add(currentCategory);
            continue;
        }

        // Match app entries (lines starting with "- [")
        const appMatch = line.match(/^-\s+\[(.+?)\]\((.+?)\)\s+-?\s*(.*)/);
        if (appMatch && currentCategory) {
            // Save previous app if exists
            if (currentApp) {
                allApps.push(currentApp);
            }

            currentApp = {
                name: appMatch[1],
                url: appMatch[2],
                description: appMatch[3] || '',
                category: currentCategory,
                languages: [],
                website: '',
                badges: []
            };
            inApp = true;
            continue;
        }

        if (inApp && currentApp) {
            // Parse languages
            const langMatch = line.match(/\*\*Languages:\*\*(.+)/);
            if (langMatch) {
                const langText = langMatch[1];
                const langMatches = langText.matchAll(/alt='(\w+).*?'.*?title='(\w+)'/g);
                for (const match of langMatches) {
                    const lang = match[2];
                    currentApp.languages.push(lang);
                    languages.add(lang);
                }
            }

            // Parse website
            const websiteMatch = line.match(/\*\*Website:\*\*\s+\[(.+?)\]\((.+?)\)/);
            if (websiteMatch) {
                currentApp.website = websiteMatch[2];
            }

            // Detect end of app entry (empty line or new app)
            if (line.trim() === '' || line.startsWith('- [')) {
                if (line.startsWith('- [')) {
                    i--; // Reprocess this line
                }
                inApp = false;
            }
        }
    }

    // Add last app
    if (currentApp) {
        allApps.push(currentApp);
    }

    // Update stats
    document.getElementById('total-apps').textContent = allApps.length;
    document.getElementById('total-categories').textContent = categories.size;
}

// Initialize filter dropdowns
function initializeFilters() {
    const categoryFilter = document.getElementById('category-filter');
    const languageFilter = document.getElementById('language-filter');

    // Sort and add categories
    const sortedCategories = Array.from(categories).sort();
    sortedCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });

    // Sort and add languages
    const sortedLanguages = Array.from(languages).sort();
    sortedLanguages.forEach(language => {
        const option = document.createElement('option');
        option.value = language;
        option.textContent = language;
        languageFilter.appendChild(option);
    });

    // Add event listeners
    document.getElementById('search').addEventListener('input', filterApps);
    categoryFilter.addEventListener('change', filterApps);
    languageFilter.addEventListener('change', filterApps);
}

// Filter apps based on search and filters
function filterApps() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const categoryFilter = document.getElementById('category-filter').value;
    const languageFilter = document.getElementById('language-filter').value;

    filteredApps = allApps.filter(app => {
        // Search filter
        const matchesSearch = !searchTerm ||
            app.name.toLowerCase().includes(searchTerm) ||
            app.description.toLowerCase().includes(searchTerm);

        // Category filter
        const matchesCategory = !categoryFilter || app.category === categoryFilter;

        // Language filter
        const matchesLanguage = !languageFilter || app.languages.includes(languageFilter);

        return matchesSearch && matchesCategory && matchesLanguage;
    });

    displayApps(filteredApps);
}

// Display apps in the grid
function displayApps(apps) {
    const container = document.getElementById('apps-container');

    if (apps.length === 0) {
        container.innerHTML = '<div class="no-results">No applications found matching your criteria.</div>';
        return;
    }

    container.innerHTML = apps.map(app => createAppCard(app)).join('');
}

// Create HTML for a single app card
function createAppCard(app) {
    const languagesHTML = app.languages.map(lang => {
        const iconPath = getLanguageIcon(lang);
        return `
            <span class="language-tag">
                <img src="${iconPath}" alt="${lang}" class="language-icon">
                ${lang}
            </span>
        `;
    }).join('');

    const websiteHTML = app.website ?
        `<a href="${app.website}" target="_blank" class="app-website">🌐 Website</a>` : '';

    return `
        <div class="app-card">
            <div class="app-header">
                <a href="${app.url}" target="_blank" class="app-name">${app.name}</a>
                <span class="app-category">${app.category}</span>
            </div>
            <p class="app-description">${app.description}</p>
            ${languagesHTML ? `<div class="app-languages">${languagesHTML}</div>` : ''}
            ${websiteHTML}
        </div>
    `;
}

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

// Initialize on page load
document.addEventListener('DOMContentLoaded', loadApps);
