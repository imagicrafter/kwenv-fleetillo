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
        # Use full path to VS Code (adjust if needed)
        /usr/local/bin/code "$FILE_PATH" 2>> /tmp/claude-hook-debug.log || \
        /Applications/Visual\ Studio\ Code.app/Contents/Resources/app/bin/code "$FILE_PATH" 2>> /tmp/claude-hook-debug.log

        sleep 0.5
        /usr/local/bin/code --command "markdown.showPreview" 2>> /tmp/claude-hook-debug.log || true

        echo "Opened plan document: $FILE_PATH" >> /tmp/claude-hook-debug.log
    else
        echo "File not found: $FILE_PATH" >> /tmp/claude-hook-debug.log
    fi
else
    echo "Pattern did not match: $FILE_PATH" >> /tmp/claude-hook-debug.log
fi

exit 0