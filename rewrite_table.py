import re

with open('frontend/src/components/dashboard/MainTable.tsx', 'r') as f:
    content = f.read()

# Remove ColumnColorPicker tags
content = re.sub(r'\s*<ColumnColorPicker[^>]+/>', '', content)

# For <th> elements, replace columnColors['X'] with getCellStyles('', 'X').backgroundColor
# and add onContextMenu={(e) => onRightClick(e, 'COLUMN', null, 'X')}
def th_replacer(match):
    prefix = match.group(1)
    col = match.group(2)
    suffix = match.group(3)
    
    # Check if there is already an onClick. We just add onContextMenu.
    # The prefix might contain `style={{ backgroundColor: columnColors['X'] || undefined }}`
    new_prefix = re.sub(r"columnColors\['[^']+'\] \|\| undefined", f"getCellStyles('', '{col}').backgroundColor", prefix)
    new_prefix = re.sub(r"columnColors\['[^']+'\] \|\| ", f"getCellStyles('', '{col}').backgroundColor || ", new_prefix)
    
    if "onContextMenu" not in new_prefix:
        new_prefix += f" onContextMenu={{(e) => onRightClick(e, 'COLUMN', null, '{col}')}}"
        
    return f"{new_prefix}{suffix}"

# Use regex to find <th> with style containing columnColors
# Since regex parsing of HTML is tricky, I'll just replace the specific string:
# style={{ backgroundColor: columnColors['id'] || undefined }}
def style_replacer(match):
    col = match.group(1)
    # We want to know if it's in a th or td. Let's do it generally:
    # We'll replace all style attributes later manually or with a simpler pass.
    pass

# Actually, it's easier to just find all columnColors['...'] and replace.
# In <th>, it's columnColors['id'] -> getCellStyles('', 'id').backgroundColor
# In <td>, it's columnColors['id'] -> getCellStyles(m.instrument, 'id').backgroundColor

# Let's replace <td> first:
# Find: style={{ backgroundColor: columnColors['id'] || undefined }} inside the map.
# Wait, let's just do a blanket replacement in the file. We know the <th> are before <tbody>.

parts = content.split('<tbody>')
thead = parts[0]
tbody = parts[1]

# In thead:
thead = re.sub(r"columnColors\['([^']+)'\] \|\| undefined", r"getCellStyles('', '\1').backgroundColor", thead)
thead = re.sub(r"columnColors\['([^']+)'\] \|\|", r"getCellStyles('', '\1').backgroundColor ||", thead)

# In tbody:
tbody = re.sub(r"columnColors\['([^']+)'\] \|\| undefined", r"getCellStyles(m.instrument, '\1').backgroundColor", tbody)
tbody = re.sub(r"columnColors\['([^']+)'\] \|\|", r"getCellStyles(m.instrument, '\1').backgroundColor ||", tbody)

# Now add onContextMenu to <th>
thead = re.sub(r'(<th\b[^>]*?onClick=\{\(\) => handleSort\(\'([^\']+)\'\)\}[^>]*?)>', r'\1 onContextMenu={(e) => onRightClick(e, "COLUMN", null, "\2")}>', thead)
# Also handle Yearly chart which doesn't have onClick
thead = re.sub(r'(<th\b[^>]*?title="Calendar-year performance[^>]*?)>', r'\1 onContextMenu={(e) => onRightClick(e, "COLUMN", null, "yearlyChart")}>', thead)
thead = re.sub(r'(<th\b[^>]*?title="Monthly series performance[^>]*?)>', r'\1 onContextMenu={(e) => onRightClick(e, "COLUMN", null, "sessionChart")}>', thead)
thead = re.sub(r'(<th\b[^>]*?title="Cumulative series performance[^>]*?)>', r'\1 onContextMenu={(e) => onRightClick(e, "COLUMN", null, "seriesTrend")}>', thead)

# Now add onContextMenu to <td>
tbody = re.sub(r'(<tr\b[^>]*?className="table-row[^>]*?)>', r'\1 onContextMenu={(e) => onRightClick(e, "ROW", m.instrument, null)}>', tbody)
tbody = re.sub(r'(<td\b[^>]*?)(style=\{\{ backgroundColor: getCellStyles\(m\.instrument, \'([^\']+)\'\)\.backgroundColor[^}]*\}\})([^>]*?)>', r'\1\2 onContextMenu={(e) => onRightClick(e, "CELL", m.instrument, "\3")}\4>', tbody)

# We also need to add color text support. We'll change the style to spread getCellStyles.
# e.g. style={{ ...getCellStyles(m.instrument, 'id') }}
# Let's refine the style replacement in tbody:
tbody = re.sub(r'style=\{\{ backgroundColor: getCellStyles\(m\.instrument, \'([^\']+)\'\)\.backgroundColor \|\| undefined \}\}', r'style={getCellStyles(m.instrument, "\1")}', tbody)
# For customChange which has a fallback:
tbody = re.sub(r'style=\{\{ backgroundColor: getCellStyles\(m\.instrument, \'customChange\'\)\.backgroundColor \|\| \(customDate \? \'rgba\(59, 130, 246, 0\.05\)\' : \'transparent\'\) \}\}', r'style={{ ...getCellStyles(m.instrument, "customChange"), backgroundColor: getCellStyles(m.instrument, "customChange").backgroundColor || (customDate ? "rgba(59, 130, 246, 0.05)" : "transparent") }}', tbody)

# Same for thead:
thead = re.sub(r'style=\{\{ backgroundColor: getCellStyles\(\'\', \'([^\']+)\'\)\.backgroundColor \}\}', r'style={getCellStyles("", "\1")}', thead)

content = thead + '<tbody>' + tbody

with open('frontend/src/components/dashboard/MainTable.tsx', 'w') as f:
    f.write(content)

