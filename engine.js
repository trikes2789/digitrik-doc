export const DocumentEngine = {
    calculate(items, forcedTotal = null) {
        let subtotal = 0;
        let totalTax = 0;

        // 1. Calcolo Standard delle righe
        items.forEach(item => {
            const lineTotal = item.qty * item.price;
            subtotal += lineTotal;
            totalTax += (lineTotal * (item.taxRate / 100));
        });

        let finalSubtotal = subtotal;
        let finalTax = totalTax;
        let total = subtotal + totalTax;
        let adjustment = { value: 0, label: '' };

        // 2. Logica del Calcolo Inverso "Penny-Perfect"
        if (forcedTotal !== null && forcedTotal > 0) {
            // Calcola l'incidenza media dell'IVA su questo documento
            // Se non c'è imponibile, usiamo 22% come fallback standard
            const averageTaxRate = subtotal > 0 ? (totalTax / subtotal) : 0.22;
            
            // Calcola il nuovo imponibile matematico
            // Formula: Totale / (1 + AliquotaMedia)
            let targetSubtotal = forcedTotal / (1 + averageTaxRate);
            
            // Arrotondiamo l'imponibile a 2 decimali ORA
            // Questo è il passaggio cruciale: fissare l'imponibile
            targetSubtotal = Math.round(targetSubtotal * 100) / 100;

            // Calcoliamo la differenza (Sconto o Ricarico) sull'imponibile
            const diff = targetSubtotal - subtotal;

            if (Math.abs(diff) > 0.001) { // Tolleranza millesimale
                adjustment.value = diff;
                adjustment.label = diff < 0 ? 'Sconto arrotondamento' : 'Aggiustamento tariffario';
                
                // Assegnamo il nuovo imponibile calcolato
                finalSubtotal = targetSubtotal;
                
                // MAGIC TRICK: L'IVA non viene calcolata, ma derivata per differenza.
                // Questo garantisce che Imponibile + IVA = Totale Desiderato (al centesimo)
                finalTax = forcedTotal - finalSubtotal;
                
                // Il totale è forzato esattamente all'input dell'utente
                total = forcedTotal;
            }
        }

        return {
            subtotal: subtotal.toFixed(2),
            finalSubtotal: finalSubtotal.toFixed(2),
            tax: finalTax.toFixed(2),
            adjustment: adjustment,
            total: total.toFixed(2) // Sarà identico al forcedTotal
        };
    }
};