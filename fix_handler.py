import re

with open('frontend/src/components/dashboard/MainTable.tsx', 'r') as f:
    content = f.read()

# Change handleSetOverride definition
content = content.replace(
    "const handleSetOverride = async (color: string, type: 'FILL' | 'TEXT') => {",
    "const handleSetOverride = async (color: string, type: 'FILL' | 'TEXT', scope: string, instrumentSymbol: string | null, columnId: string | null) => {"
)
# Remove the contextMenu extraction from handleSetOverride
content = re.sub(r'    if \(!contextMenu\) return;\n    const \{ scope, instrumentSymbol, columnId \} = contextMenu;\n', '', content)

# Do the same for handleClearOverride
content = content.replace(
    "const handleClearOverride = async () => {",
    "const handleClearOverride = async (scope: string, instrumentSymbol: string | null, columnId: string | null) => {"
)
content = re.sub(r'    if \(!contextMenu\) return;\n    const \{ scope, instrumentSymbol, columnId \} = contextMenu;\n', '', content)

# Now we need to update onRightClick to pass these args to the bound functions
# Actually, it's easier to just bind them in onRightClick!
# Wait, let's just create a wrapper function in onRightClick:
old_right_click = """      onSetColor: handleSetOverride,
      onClearColor: handleClearOverride"""

new_right_click = """      onSetColor: (color, type) => handleSetOverride(color, type, scope, instrumentSymbol, columnId),
      onClearColor: () => handleClearOverride(scope, instrumentSymbol, columnId)"""

content = content.replace(old_right_click, new_right_click)

with open('frontend/src/components/dashboard/MainTable.tsx', 'w') as f:
    f.write(content)

