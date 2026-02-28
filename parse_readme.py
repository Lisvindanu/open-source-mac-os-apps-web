#!/usr/bin/env python3
import re
import json

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

            current_app = {
                'name': app_match.group(1).strip(),
                'url': app_match.group(2).strip(),
                'description': app_match.group(3).strip(),
                'category': current_category,
                'languages': [],
                'website': '',
                'stars': '',
                'license': '',
                'screenshots': []
            }

            # Parse following lines for more details
            i += 1
            while i < len(lines) and not lines[i].startswith('- [') and current_category:
                detail_line = lines[i]

                # Parse languages
                if '**Languages:**' in detail_line:
                    lang_matches = re.findall(r"title='([^']+)'", detail_line)
                    current_app['languages'] = lang_matches

                # Parse website
                website_match = re.search(r'\*\*Website:\*\*\s+\[.+?\]\((.+?)\)', detail_line)
                if website_match:
                    current_app['website'] = website_match.group(1)

                # Parse badges/stars
                stars_match = re.search(r'github\.com/stars/([^?]+)', detail_line)
                if stars_match:
                    current_app['stars'] = stars_match.group(1)

                # Parse license
                license_match = re.search(r'github\.com/license/([^\'">]+)', detail_line)
                if license_match:
                    current_app['license'] = license_match.group(1)

                # Parse screenshots
                if detail_line.strip().startswith('<img src='):
                    screenshot_match = re.search(r"<img src='([^']+)'", detail_line)
                    if screenshot_match:
                        current_app['screenshots'].append(screenshot_match.group(1))

                # Check if we're entering a new category or app
                if re.match(category_pattern, detail_line) or detail_line.startswith('- ['):
                    break

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

    # Save to JSON
    with open('apps.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print("Saved to apps.json")
