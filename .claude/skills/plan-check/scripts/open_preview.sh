#!/bin/bash
#
# Open a markdown file in VS Code preview mode
#
# Usage: open_preview.sh <file_path>
#
# Platform support:
#   - macOS: Uses AppleScript to trigger Cmd+Shift+V after opening
#   - Linux: Uses xdotool if available, falls back to just opening
#   - Windows: Falls back to just opening (WSL compatibility)
#

set -e

FILE="$1"

if [ -z "$FILE" ]; then
    echo "Usage: open_preview.sh <file_path>" >&2
    exit 1
fi

if [ ! -f "$FILE" ]; then
    echo "Error: File not found: $FILE" >&2
    exit 1
fi

# Get absolute path
FILE="$(cd "$(dirname "$FILE")" && pwd)/$(basename "$FILE")"

# Detect platform
OS="$(uname -s)"

case "$OS" in
    Darwin)
        # macOS: Open file, wait for VS Code to focus, then trigger preview
        code "$FILE"
        sleep 0.5

        # Trigger Cmd+Shift+V (markdown preview)
        osascript -e '
            tell application "System Events"
                tell process "Code"
                    set frontmost to true
                    delay 0.2
                    keystroke "v" using {command down, shift down}
                end tell
            end tell
        ' 2>/dev/null || {
            echo "Note: Could not auto-trigger preview. Press Cmd+Shift+V to open preview." >&2
        }
        ;;

    Linux)
        code "$FILE"
        sleep 0.5

        # Try xdotool if available
        if command -v xdotool &>/dev/null; then
            # Find VS Code window and send Ctrl+Shift+V
            WID=$(xdotool search --name "Visual Studio Code" | head -1)
            if [ -n "$WID" ]; then
                xdotool windowactivate "$WID"
                sleep 0.2
                xdotool key --window "$WID" ctrl+shift+v
            else
                echo "Note: Could not find VS Code window. Press Ctrl+Shift+V to open preview." >&2
            fi
        else
            echo "Note: Install xdotool for auto-preview. Press Ctrl+Shift+V to open preview." >&2
        fi
        ;;

    MINGW*|MSYS*|CYGWIN*)
        # Windows via Git Bash or similar
        code "$FILE"
        echo "Note: Auto-preview not supported on Windows. Press Ctrl+Shift+V to open preview." >&2
        ;;

    *)
        # Unknown platform - just open the file
        code "$FILE"
        echo "Note: Press Ctrl+Shift+V (or Cmd+Shift+V on Mac) to open preview." >&2
        ;;
esac

echo "Opened: $FILE"
