const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../frontend/src/components/instruments/InstrumentsPage.tsx');
let content = fs.readFileSync(p, 'utf-8');

// Add selectedIds state and delete function
content = content.replace(
  "const [filterMode, setFilterMode] = useState<'ALL' | 'FAVOURITES'>('ALL');",
  "const [filterMode, setFilterMode] = useState<'ALL' | 'FAVOURITES'>('ALL');\n  const [selectedIds, setSelectedIds] = useState<number[]>([]);\n\n  const handleDelete = async (ids: number[]) => {\n    if (!confirm('Are you sure you want to delete ' + ids.length + ' instrument(s)?')) return;\n    try {\n      const res = await fetch('http://localhost:3001/api/instruments/delete', {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify({ ids })\n      });\n      const json = await res.json();\n      if (json.success) {\n        setSelectedIds([]);\n        setIsEditModalOpen(false);\n        fetchInstruments();\n        showToast('Deleted successfully');\n      } else {\n        alert('Error: ' + json.error);\n      }\n    } catch (err) {\n      alert('Network error');\n    }\n  };\n"
);

// Add bulk delete button to toolbar
content = content.replace(
  /<button className="btn-primary" onClick=\{.*?setIsAddModalOpen\(true\).*?Add Instrument\n\s*<\/button>/s,
  `$&
          {selectedIds.length > 0 && (
            <button className="btn-primary" style={{ marginLeft: '8px', backgroundColor: '#dc2626' }} onClick={() => handleDelete(selectedIds)}>
              Delete Selected ({selectedIds.length})
            </button>
          )}`
);

// Change table headers
content = content.replace(
  /<th className="col-center">★<\/th>/,
  `<th className="col-center">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(filtered.map(i => i.id));
                      else setSelectedIds([]);
                    }}
                  />
                </th>
                <th className="col-center">#</th>`
);

// Change table rows
content = content.replace(
  /filtered\.map\(inst => \{/,
  `filtered.map((inst, index) => {`
);

content = content.replace(
  /<td className="col-center" onClick=\{\(e\) => toggleFavourite\(e, inst.symbol, inst.isFavourite\)\}>\s*<Star.*?\/>\s*<\/td>/s,
  `<td className="col-center" onClick={e => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(inst.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds([...selectedIds, inst.id]);
                          else setSelectedIds(selectedIds.filter(id => id !== inst.id));
                        }}
                      />
                    </td>
                    <td className="col-center">{index + 1}</td>`
);

// Add delete button to edit modal
content = content.replace(
  /<button type="button" onClick=\{deactivateInstrument\}.*?Archive size=\{16\} \/> Deactivate\n\s*<\/button>/s,
  `$&
                  <button type="button" onClick={() => handleDelete([selectedInst.id])} className="btn-primary" style={{ backgroundColor: '#991b1b', marginRight: 'auto' }}>
                    <X size={16} /> Delete
                  </button>`
);

fs.writeFileSync(p, content);
console.log("InstrumentsPage updated");
