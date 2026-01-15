import os
import re

# The clipboard icon path (Heroicons style)
new_icon_path = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />'

# Files to update
files = [
    'public/customers.html', 'public/services.html', 'public/bookings.html',
    'public/calendar.html', 'public/locations.html', 'public/vehicles.html',
    'public/routes.html', 'public/settings.html', 'public/index.html'
]

# Regex to find the bookings link and its SVG
# We look for href="bookings.html" ... then inside the svg, the specific path d="..."
# The current path d starts with M8 7V3...

for file_path in files:
    try:
        if not os.path.exists(file_path):
            continue
            
        with open(file_path, 'r') as f:
            content = f.read()
            
        # We need to target the Bookings specific item.
        # Pattern: <a href="bookings.html".*?<svg.*?>(\s*<path.*?/>)\s*</svg>
        
        def replace_icon(match):
            full_match = match.group(0)
            # Just replace the path element inside this match
            # The current path is the calendar one: d="M8 7V3..."
            # We'll validte it's the calendar one to be safe, or just replace content of SVG
            return re.sub(
                r'<path.*?d="M8 7V3.*?"\s*/>', 
                new_icon_path, 
                full_match, 
                flags=re.DOTALL
            )

        # Regex explanation:
        # <a href="bookings.html" ... match until ... </svg>
        pattern = r'<a href="bookings\.html"[^>]*>.*?<svg[^>]*>.*?<\/svg>'
        
        new_content = re.sub(pattern, replace_icon, content, flags=re.DOTALL)
        
        if new_content != content:
            with open(file_path, 'w') as f:
                f.write(new_content)
            print(f"Updated {file_path}")
        else:
            print(f"No changes for {file_path} (match not found?)")
            
    except Exception as e:
        print(f"Error updating {file_path}: {e}")

