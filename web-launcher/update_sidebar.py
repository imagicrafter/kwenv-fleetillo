import os
import re

template_path = 'public/sidebar_template.html'
with open(template_path, 'r') as f:
    template_content = f.read()

# Files to update and their active links
files_map = {
    'public/customers.html': 'customers.html',
    'public/services.html': 'services.html',
    'public/bookings.html': 'bookings.html',
    'public/calendar.html': 'calendar.html',
    'public/locations.html': 'locations.html',
    'public/vehicles.html': 'vehicles.html',
    'public/routes.html': 'routes.html',
    'public/settings.html': 'settings.html'
}

for file_path, active_link in files_map.items():
    try:
        if not os.path.exists(file_path):
            print(f"Skipping {file_path}, not found.")
            continue
            
        with open(file_path, 'r') as f:
            content = f.read()
            
        # Customize template for this file
        current_sidebar = template_content
        
        # Remove active from index
        if active_link != 'index.html':
            current_sidebar = current_sidebar.replace(
                'href="index.html" class="nav-item active"', 
                'href="index.html" class="nav-item"'
            )
            # Add active to target
            current_sidebar = current_sidebar.replace(
                f'href="{active_link}" class="nav-item"', 
                f'href="{active_link}" class="nav-item active"'
            )
            
        # Regex to replace existing nav block
        # Look for <nav class="nav-menu"> ... </script> (since we include script in template)
        # Note: Previous structure had script inside or after nav?
        # The replacement template HAS the script at the end.
        
        # Pattern covers <nav ...> to </nav> AND the following script block if present
        # Adjusting regex to be safe: match <nav class="nav-menu"> until </nav>
        # And if there's a script tag immediately following for toggleGroup, remove it too as it's in template now
        
        new_content = re.sub(
            r'<nav class="nav-menu">.*?</nav>(\s*<script>\s*function toggleGroup.*?</script>)?', 
            current_sidebar, 
            content, 
            flags=re.DOTALL
        )
        
        with open(file_path, 'w') as f:
            f.write(new_content)
            
        print(f"Updated {file_path}")
        
    except Exception as e:
        print(f"Error updating {file_path}: {e}")

