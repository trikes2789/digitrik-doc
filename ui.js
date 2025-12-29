import { DocumentEngine } from './engine.js';
import { Storage } from './storage.js';
import { PDFGenerator } from './pdf.js';

export const UI = {
    // Stato dell'applicazione
    state: {
        items: [],
        calculations: null,
        forcedTotal: null
    },

    // Inizializzazione dell'applicazione
    init() {
        this.setupInitialRow();
        this.loadSavedData();
        this.setupEventListeners();
        this.attachCurrentDate(); // Data forzata all'avvio
        console.log("Digitrikdoc Suite Professionale - Inizializzata ✅");
    },

    // Imposta la data corrente (FORZATA)
    attachCurrentDate() {
        const dateInput = document.getElementById('doc-date');
        if (dateInput) {
            const today = new Date();
            // Formatta in YYYY-MM-DD per l'input type="date"
            const formattedDate = today.toISOString().split('T')[0];
            dateInput.value = formattedDate;
        }
    },

    // Crea la riga iniziale
    setupInitialRow() {
        this.addRow();
    },

    // Aggiunge una nuova riga alla tabella
    addRow() {
        const tbody = document.getElementById('items-body');
        if (!tbody) return;

        const rowId = Date.now();
        const tr = document.createElement('tr');
        tr.dataset.rowId = rowId;
        tr.innerHTML = `
            <td>
                <input type="text" class="field-desc" placeholder="Descrizione prodotto/servizio">
            </td>
            <td>
                <input type="number" class="field-qty" value="1" min="0" step="0.01">
            </td>
            <td>
                <input type="number" class="field-price" value="0.00" min="0" step="0.01">
            </td>
            <td>
                <select class="field-tax">
                    <option value="22" selected>22%</option>
                    <option value="10">10%</option>
                    <option value="5">5%</option>
                    <option value="4">4%</option>
                    <option value="0">0%</option>
                </select>
            </td>
            <td class="row-total text-right">0.00€</td>
            <td style="text-align: center;">
                <button class="btn-delete" title="Elimina riga">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </td>
        `;

        tbody.appendChild(tr);
        this.attachRowEvents(tr);
        
        // Focus sul campo descrizione della nuova riga
        setTimeout(() => {
            const descInput = tr.querySelector('.field-desc');
            if (descInput) descInput.focus();
        }, 10);
        
        // Aggiorna i calcoli
        this.updateAll();
    },

    // Collega gli eventi a una riga
    attachRowEvents(tr) {
        const inputs = tr.querySelectorAll('input, select');
        const deleteBtn = tr.querySelector('.btn-delete');
        
        // Gestione eliminazione riga
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const totalRows = document.querySelectorAll('#items-body tr').length;
            
            if (totalRows > 1) {
                tr.remove();
            } else {
                // Se è l'ultima riga, resetta i valori invece di eliminare
                inputs.forEach(input => {
                    if (input.classList.contains('field-desc')) {
                        input.value = '';
                    } else if (input.classList.contains('field-qty')) {
                        input.value = '1';
                    } else if (input.classList.contains('field-price')) {
                        input.value = '0.00';
                    } else if (input.classList.contains('field-tax')) {
                        input.value = '22';
                    }
                });
                tr.querySelector('.row-total').textContent = '0.00€';
            }
            
            this.updateAll();
        });

        // Gestione input e navigazione
        inputs.forEach((input, index) => {
            // Aggiorna calcoli su input
            input.addEventListener('input', () => {
                if (input.classList.contains('field-qty') || 
                    input.classList.contains('field-price') || 
                    input.classList.contains('field-tax')) {
                    this.updateRowTotal(tr);
                }
                this.updateAll();
            });

            // Navigazione con Tab e Enter
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const nextInput = this.getNextInput(input, inputs, index);
                    if (nextInput) {
                        nextInput.focus();
                    } else {
                        // Se è l'ultimo campo, aggiungi nuova riga
                        this.addRow();
                    }
                }
                
                // Salvataggio rapido con Ctrl+S
                if (e.ctrlKey && e.key === 's') {
                    e.preventDefault();
                    this.saveProfile();
                }
            });
        });
    },

    // Trova il prossimo input
    getNextInput(currentInput, inputs, currentIndex) {
        if (currentIndex < inputs.length - 1) {
            return inputs[currentIndex + 1];
        }
        
        // Cerca nella prossima riga
        const nextRow = currentInput.closest('tr').nextElementSibling;
        if (nextRow) {
            return nextRow.querySelector('.field-desc');
        }
        
        return null;
    },

    // Calcola il totale di una singola riga
    updateRowTotal(tr) {
        const qty = parseFloat(tr.querySelector('.field-qty').value) || 0;
        const price = parseFloat(tr.querySelector('.field-price').value) || 0;
        const rowTotal = qty * price;
        const rowTotalEl = tr.querySelector('.row-total');
        
        if (rowTotalEl) {
            rowTotalEl.textContent = rowTotal.toLocaleString('it-IT', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }) + '€';
        }
    },

    // Aggiorna tutti i calcoli
    updateAll() {
        const rows = document.querySelectorAll('#items-body tr');
        this.state.items = [];

        rows.forEach(row => {
            const desc = row.querySelector('.field-desc').value.trim();
            const qty = parseFloat(row.querySelector('.field-qty').value) || 0;
            const price = parseFloat(row.querySelector('.field-price').value) || 0;
            const taxRate = parseFloat(row.querySelector('.field-tax').value) || 0;

            if (desc || qty > 0 || price > 0) {
                this.state.items.push({
                    desc: desc || 'Articolo senza descrizione',
                    qty,
                    price,
                    taxRate
                });
            }

            // Aggiorna totale riga
            this.updateRowTotal(row);
        });

        // Calcola totali con il motore
        const forcedTotalEl = document.getElementById('forced-total');
        this.state.forcedTotal = forcedTotalEl ? parseFloat(forcedTotalEl.value) || null : null;
        
        this.state.calculations = DocumentEngine.calculate(this.state.items, this.state.forcedTotal);
        
        // Aggiorna UI con i risultati
        this.updateResultsDisplay();
        return this.state;
    },

    // Aggiorna la visualizzazione dei risultati
    updateResultsDisplay() {
        const { calculations } = this.state;
        if (!calculations) return;

        // Formatta i numeri in italiano
        const formatCurrency = (value) => {
            return parseFloat(value).toLocaleString('it-IT', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }) + '€';
        };

        // Aggiorna gli elementi UI
        const subtotalEl = document.getElementById('res-subtotal');
        const taxEl = document.getElementById('res-tax');
        const totalEl = document.getElementById('res-total');
        const adjDisplay = document.getElementById('adj-display');

        if (subtotalEl) subtotalEl.textContent = formatCurrency(calculations.subtotal);
        if (taxEl) taxEl.textContent = formatCurrency(calculations.tax);
        if (totalEl) totalEl.textContent = formatCurrency(calculations.total);

        // Gestione aggiustamento (sconto/ricarico)
        this.renderAdjustment(calculations.adjustment, adjDisplay);
    },

    // Mostra l'aggiustamento nel footer
    renderAdjustment(adjustment, container) {
        if (!container) return;

        container.innerHTML = '';
        
        if (adjustment && Math.abs(adjustment.value) > 0.009) {
            const isDiscount = adjustment.value < 0; // NOTA: nel nuovo engine, sconto è negativo
            const absoluteValue = Math.abs(parseFloat(adjustment.value));
            
            const adjDiv = document.createElement('div');
            adjDiv.className = 'math-row';
            adjDiv.style.color = isDiscount ? 'var(--danger)' : 'var(--success)';
            adjDiv.style.fontWeight = '600';
            
            adjDiv.innerHTML = `
                <span>${adjustment.label}</span>
                <span>${isDiscount ? '-' : '+'}${absoluteValue.toLocaleString('it-IT', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}€</span>
            `;
            
            container.appendChild(adjDiv);
        }
    },

    // Apre il modal di esportazione
    openExportModal() {
        const modal = document.getElementById('export-modal');
        const { calculations } = this.updateAll();
        const warnBox = document.getElementById('modal-warning');
        
        // Gestione avviso per aggiustamento
        if (calculations.adjustment && Math.abs(calculations.adjustment.value) > 0.009) {
            warnBox.classList.remove('hidden');
            
            const isDiscount = calculations.adjustment.value < 0;
            const adjustmentValue = parseFloat(calculations.adjustment.value);
            const total = parseFloat(calculations.total);
            
            // Calcola percentuale
            const percentage = total > 0 ? Math.abs(adjustmentValue) / total * 100 : 0;
            
            document.getElementById('warn-type').textContent = isDiscount ? 'sconto' : 'ricarico';
            document.getElementById('warn-value').textContent = 
                `${Math.abs(adjustmentValue).toLocaleString('it-IT', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}€ (${percentage.toFixed(1)}%)`;
        } else {
            warnBox.classList.add('hidden');
        }

        // Imposta nome file predefinito
        const clientName = document.getElementById('client-name').value.trim() || "Cliente";
        const sanitizedClientName = clientName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        const filenameInput = document.getElementById('filename-input');
        
        if (filenameInput) {
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0];
            filenameInput.value = `Preventivo_${sanitizedClientName}_${dateStr}`;
        }

        modal.classList.remove('hidden');
    },

    // Chiude il modal di esportazione
    closeExportModal() {
        document.getElementById('export-modal').classList.add('hidden');
    },

    // Salva il profilo aziendale
    saveProfile() {
        const profile = {
            name: document.getElementById('comp-name').value,
            address: document.getElementById('comp-address').value,
            city: document.getElementById('comp-city').value,
            contact: document.getElementById('comp-contact').value,
            vat: document.getElementById('comp-vat').value,
            // Logo viene salvato separatamente
        };

        Storage.saveProfile(profile);
        
        // Feedback visivo
        this.showNotification('Profilo salvato con successo!', 'success');
    },

    // Carica i dati salvati
    loadSavedData() {
        const saved = Storage.loadProfile();
        if (saved) {
            // Carica dati azienda
            const fields = {
                'comp-name': 'name',
                'comp-address': 'address',
                'comp-city': 'city',
                'comp-contact': 'contact',
                'comp-vat': 'vat'
            };

            Object.entries(fields).forEach(([fieldId, savedKey]) => {
                const element = document.getElementById(fieldId);
                if (element && saved[savedKey]) {
                    element.value = saved[savedKey];
                }
            });

            // Carica logo
            if (saved.logo) {
                this.displayLogo(saved.logo);
            }
        }
    },

    // Mostra il logo caricato
    displayLogo(base64) {
        const logoZone = document.getElementById('logo-zone');
        if (!logoZone) return;

        // Rimuovi il placeholder
        logoZone.innerHTML = '';
        
        // Crea immagine
        const img = document.createElement('img');
        img.src = base64;
        img.alt = 'Logo Azienda';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        
        // Aggiungi overlay per sostituire logo
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.right = '0';
        overlay.style.bottom = '0';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.style.cursor = 'pointer';
        overlay.innerHTML = '<i class="ri-refresh-line" style="color: white; font-size: 20px;"></i>';
        
        overlay.addEventListener('mouseenter', () => {
            overlay.style.opacity = '1';
        });
        
        overlay.addEventListener('mouseleave', () => {
            overlay.style.opacity = '0';
        });
        
        overlay.addEventListener('click', () => {
            document.getElementById('logo-input').click();
        });
        
        logoZone.appendChild(img);
        logoZone.appendChild(overlay);
    },

    // Mostra una notifica temporanea
    showNotification(message, type = 'info') {
        // Rimuovi notifiche precedenti
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: ${type === 'success' ? 'var(--success)' : 'var(--accent)'};
            color: white;
            border-radius: var(--radius-sm);
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            font-weight: 500;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);

        // Rimuovi dopo 3 secondi
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    // Configura tutti gli event listener
    setupEventListeners() {
        // Aggiungi riga
        document.getElementById('add-row')?.addEventListener('click', () => {
            this.addRow();
            this.showNotification('Nuova riga aggiunta', 'info');
        });

        // Calcolo automatico totale desiderato
        document.getElementById('forced-total')?.addEventListener('input', () => {
            this.updateAll();
        });

        // Salvataggio automatico dati azienda
        ['comp-name', 'comp-address', 'comp-city', 'comp-contact', 'comp-vat'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('blur', () => this.saveProfile());
            }
        });

        // Gestione logo
        const logoZone = document.getElementById('logo-zone');
        const logoInput = document.getElementById('logo-input');
        
        if (logoZone && logoInput) {
            logoZone.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-delete')) {
                    logoInput.click();
                }
            });

            logoInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                if (!file.type.startsWith('image/')) {
                    this.showNotification('Seleziona un file immagine valido', 'error');
                    return;
                }

                if (file.size > 5 * 1024 * 1024) { // 5MB max
                    this.showNotification('L\'immagine è troppo grande (max 5MB)', 'error');
                    return;
                }

                try {
                    const base64 = await Storage.convertToBase64(file);
                    this.displayLogo(base64);
                    
                    // Salva nel profilo
                    const profile = Storage.loadProfile() || {};
                    profile.logo = base64;
                    Storage.saveProfile(profile);
                    
                    this.showNotification('Logo caricato con successo!', 'success');
                } catch (error) {
                    console.error('Errore caricamento logo:', error);
                    this.showNotification('Errore nel caricamento del logo', 'error');
                }
            });
        }

        // Gestione modal esportazione
        const btnPdf = document.getElementById('btn-pdf-prev');
        const btnCloseModal = document.getElementById('close-modal');
        const btnCancel = document.getElementById('btn-cancel');
        const btnConfirmExport = document.getElementById('btn-confirm-export');

        if (btnPdf) btnPdf.addEventListener('click', () => this.openExportModal());
        if (btnCloseModal) btnCloseModal.addEventListener('click', () => this.closeExportModal());
        if (btnCancel) btnCancel.addEventListener('click', () => this.closeExportModal());

        if (btnConfirmExport) {
            btnConfirmExport.addEventListener('click', () => {
                const { items, calculations } = this.updateAll();
                const filename = document.getElementById('filename-input').value.trim() || 'Preventivo';
                const validityText = document.getElementById('validity-text').value || '30 Giorni';
                
                // Validazione minima
                if (items.length === 0) {
                    this.showNotification('Aggiungi almeno un articolo al preventivo', 'error');
                    return;
                }

                if (parseFloat(calculations.total) <= 0) {
                    this.showNotification('Il totale deve essere maggiore di zero', 'error');
                    return;
                }

                // Genera PDF
                PDFGenerator.generate("Preventivo", items, calculations, filename, validityText);
                this.closeExportModal();
                this.showNotification('PDF generato con successo!', 'success');
            });
        }

        // Chiudi modal cliccando fuori
        document.getElementById('export-modal')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeExportModal();
            }
        });

        // Shortcut da tastiera
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+N: Nuova riga
            if (e.ctrlKey && e.shiftKey && e.key === 'N') {
                e.preventDefault();
                this.addRow();
            }
            
            // Ctrl+P: Apri modal PDF
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                this.openExportModal();
            }
        });
    }
};

// Aggiungi stili per le animazioni delle notifiche
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}