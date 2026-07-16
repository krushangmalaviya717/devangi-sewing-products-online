
        function toggleMobileMenu() {
            const sidebar = document.getElementById('admin-sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            sidebar.classList.toggle('-translate-x-full');
            overlay.classList.toggle('hidden');
        }

        let fields = [];

        async function loadFields() {
            try {
                const res = await fetch('/api/farma-fields');
                fields = await res.json();
                renderTable();
            } catch (err) {
                console.error(err);
                alert('Failed to load fields');
            }
        }

        function renderTable() {
            const tbody = document.getElementById('fields-table-body');
            if (fields.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500 text-sm">No fields found. Create one to get started.</td></tr>';
                return;
            }

            tbody.innerHTML = fields.map(f => `
                <tr class="hover:bg-gray-50/50 transition-colors group">
                    <td class="px-6 py-4 font-medium text-gray-900">${f.sort_order}</td>
                    <td class="px-6 py-4 text-gray-600">
                        <span class="px-2 py-1 text-xs font-medium rounded-md ${f.section === 'Blouse Details' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}">${f.section}</span>
                    </td>
                    <td class="px-6 py-4 text-gray-900 font-medium">${f.field_label}</td>
                    <td class="px-6 py-4 text-gray-600 capitalize">${f.field_type}</td>
                    <td class="px-6 py-4 text-center">
                        ${f.is_required ? '<span class="text-green-500">Yes</span>' : '<span class="text-gray-400">No</span>'}
                    </td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick='editField(${JSON.stringify(f).replace(/'/g, "&#39;")})' class="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>
                            <button onclick="deleteField(${f.id})" class="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        function toggleOptions() {
            const type = document.getElementById('fieldType').value;
            const container = document.getElementById('optionsContainer');
            if (['select', 'radio', 'checkbox'].includes(type)) {
                container.classList.remove('hidden');
                document.getElementById('fieldOptions').required = true;
            } else {
                container.classList.add('hidden');
                document.getElementById('fieldOptions').required = false;
            }
        }

        function openModal() {
            document.getElementById('fieldForm').reset();
            document.getElementById('fieldId').value = '';
            document.getElementById('modal-title').innerText = 'Add New Field';
            toggleOptions();
            document.getElementById('fieldModal').classList.remove('hidden');
        }

        function closeModal() {
            document.getElementById('fieldModal').classList.add('hidden');
        }

        function editField(f) {
            document.getElementById('fieldId').value = f.id;
            document.getElementById('fieldSection').value = f.section;
            document.getElementById('fieldLabel').value = f.field_label;
            document.getElementById('fieldType').value = f.field_type;
            document.getElementById('fieldSortOrder').value = f.sort_order;
            document.getElementById('fieldOptions').value = f.options || '';
            document.getElementById('fieldRequired').checked = f.is_required === 1;
            
            document.getElementById('modal-title').innerText = 'Edit Field';
            toggleOptions();
            document.getElementById('fieldModal').classList.remove('hidden');
        }

        document.getElementById('fieldForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                id: document.getElementById('fieldId').value,
                section: document.getElementById('fieldSection').value,
                field_label: document.getElementById('fieldLabel').value,
                field_type: document.getElementById('fieldType').value,
                sort_order: document.getElementById('fieldSortOrder').value,
                options: document.getElementById('fieldOptions').value,
                is_required: document.getElementById('fieldRequired').checked ? 1 : 0
            };

            try {
                const res = await fetch('/api/admin/farma-fields', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (result.success) {
                    closeModal();
                    loadFields();
                } else {
                    alert('Error: ' + result.error);
                }
            } catch (err) {
                alert('Failed to save field');
            }
        });

        async function deleteField(id) {
            if (!confirm('Are you sure you want to delete this field?')) return;
            try {
                const res = await fetch('/api/admin/farma-fields/' + id, { method: 'DELETE' });
                const result = await res.json();
                if (result.success) loadFields();
            } catch (err) {
                alert('Failed to delete field');
            }
        }

        loadFields();
    