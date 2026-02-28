#!/usr/bin/env python3
import re
import json
import hashlib

def parse_readme(filename='README.md'):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    apps = []
    categories = {}

    # Split by category sections
    category_pattern = r'###\s+(.+?)\s+\((\d+)\)'
    app_pattern = r'^-\s+\[(.+?)\]\((.+?)\)\s+-?\s*(.*?)$'

    lines = content.split('\n')
    current_category = None
    current_app = None
    in_description = False
    i = 0

    while i < len(lines):
        line = lines[i]

        # Check for category header
        cat_match = re.match(category_pattern, line)
        if cat_match:
            category_name = re.sub(r'^[^\w\s]+\s*', '', cat_match.group(1)).strip()
            category_count = int(cat_match.group(2))
            current_category = category_name
            categories[current_category] = category_count
            i += 1
            continue

        # Check for app entry
        app_match = re.match(app_pattern, line)
        if app_match and current_category:
            # Save previous app if exists
            if current_app:
                apps.append(current_app)

            app_name = app_match.group(1).strip()
            app_url = app_match.group(2).strip()

            # Generate unique ID from URL
            app_id = hashlib.md5(app_url.encode()).hexdigest()[:12]

            current_app = {
                'id': app_id,
                'name': app_name,
                'url': app_url,
                'description': app_match.group(3).strip(),
                'category': current_category,
                'languages': [],
                'website': '',
                'screenshots': [],
                'license': '',
                'stars': 0,
                'last_commit': ''
            }

            # Parse following lines for more details
            i += 1
            in_screenshots = False

            while i < len(lines):
                detail_line = lines[i]

                # Stop if we hit a new category or app
                if re.match(category_pattern, detail_line):
                    break
                if detail_line.startswith('- [') and not detail_line.strip().startswith('- [x]'):
                    break

                # Parse languages
                if '**Languages:**' in detail_line:
                    lang_matches = re.findall(r"title='([^']+)'", detail_line)
                    current_app['languages'] = lang_matches

                # Parse website
                website_match = re.search(r'\*\*Website:\*\*\s+\[.+?\]\((.+?)\)', detail_line)
                if website_match:
                    current_app['website'] = website_match.group(1)

                # Parse stars from badge
                stars_match = re.search(r'shields\.io/github/stars/([^?\'">]+)', detail_line)
                if stars_match:
                    # Try to extract from repo path
                    repo_parts = stars_match.group(1).split('/')
                    if len(repo_parts) >= 2:
                        # Store as repo path for now, will use for sorting
                        current_app['stars'] = f"{repo_parts[0]}/{repo_parts[1]}"

                # Parse last commit badge
                commit_match = re.search(r'shields\.io/github/last-commit/([^?\'">]+)', detail_line)
                if commit_match:
                    # Extract repo path
                    repo_parts = commit_match.group(1).split('/')
                    if len(repo_parts) >= 2:
                        current_app['last_commit'] = f"{repo_parts[0]}/{repo_parts[1]}"

                # Check for screenshots section
                if '<details>' in detail_line or 'Screenshots' in detail_line:
                    in_screenshots = True

                # Parse screenshot URLs
                if in_screenshots:
                    # Match both <img src='...' and <img src="..."
                    screenshot_matches = re.findall(r"<img src=['\"]([^'\"]+)['\"]", detail_line)
                    for screenshot_url in screenshot_matches:
                        if screenshot_url and screenshot_url not in current_app['screenshots']:
                            current_app['screenshots'].append(screenshot_url)

                # End of screenshots section
                if '</details>' in detail_line:
                    in_screenshots = False

                i += 1

            continue

        i += 1

    # Add last app
    if current_app:
        apps.append(current_app)

    # Statistics
    stats = {
        'total_apps': len(apps),
        'total_categories': len(categories),
        'categories': categories
    }

    # Get all unique languages
    all_languages = set()
    for app in apps:
        all_languages.update(app['languages'])

    return {
        'stats': stats,
        'languages': sorted(list(all_languages)),
        'apps': apps
    }

if __name__ == '__main__':
    print("Parsing README.md...")
    data = parse_readme()

    print(f"Found {data['stats']['total_apps']} apps")
    print(f"Found {data['stats']['total_categories']} categories")
    print(f"Found {len(data['languages'])} languages")

    # Count apps with screenshots
    apps_with_screenshots = sum(1 for app in data['apps'] if app['screenshots'])
    print(f"Found {apps_with_screenshots} apps with screenshots")

    # Save to JSON
    with open('apps.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print("Saved to apps.json")
