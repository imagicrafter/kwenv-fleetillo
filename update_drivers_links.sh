#!/bin/bash

# Files to update
FILES="web-launcher/public/customers.html web-launcher/public/calendar.html web-launcher/public/locations.html web-launcher/public/routes.html web-launcher/public/services.html web-launcher/public/settings.html"

for file in $FILES; do
  if [ -f "$file" ]; then
    echo "Checking $file..."
    if grep -q "Drivers" "$file"; then
      echo "  - Found Drivers link, checking if needs update..."
      if grep -q 'href="#".*Drivers' "$file" || grep -q 'Drivers.*badge new' "$file"; then
        echo "  - Needs update!"
      else
        echo "  - Already updated or different format"
      fi
    else
      echo "  - No Drivers link found"
    fi
  fi
done
