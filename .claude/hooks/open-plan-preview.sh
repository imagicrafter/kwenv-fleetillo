#!/bin/bash
# Open plan documents in VS Code preview mode

# Read stdin into a variable (hooks receive JSON on stdin)
INPUT=$(cat)

# Debug: log to temp file
echo "$(date): Hook triggered" >> /tmp/claude-hook-debug.log
echo "INPUT: $INPUT" >> /tmp/claude-hook-debug.log

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path' 2>/dev/null)

echo "FILE_PATH: $FILE_PATH" >> /tmp/claude-hook-debug.log

if [[ "$FILE_PATH" =~ \.claude/plans/.*\.md$ ]]; then
    if [ -f "$FILE_PATH" ]; then
        # Open file in VS Code and attempt preview
        code "$FILE_PATH" 2>> /tmp/claude-hook-debug.log

        # Try AppleScript for preview (requires Accessibility permissions)
        sleep 0.8
        osascript -e 'tell application "Visual Studio Code" to activate' \
                  -e 'delay 0.2' \
                  -e 'tell application "System Events" to keystroke "v" using {command down, shift down}' \
                  2>> /tmp/claude-hook-debug.log || echo "Note: Grant Accessibility permission to enable auto-preview" >> /tmp/claude-hook-debug.log

        echo "Opened plan document: $FILE_PATH" >> /tmp/claude-hook-debug.log
    else
        echo "File not found: $FILE_PATH" >> /tmp/claude-hook-debug.log
    fi
else
    echo "Pattern did not match: $FILE_PATH" >> /tmp/claude-hook-debug.log
fi

exit 0