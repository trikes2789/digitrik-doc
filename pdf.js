import { Storage } from './storage.js';

export const PDFGenerator = {
    generate(docType, items, calculations, filename, validityText) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const profile = Storage.loadProfile() || {};
        
        // Configurazione Colori
        const blue = [37, 99, 235];
        const gray = [100, 100, 100];
        const red = [220, 38, 38];
        const green = [16, 185, 129]; 

        // --- GESTIONE LOGO NEL PDF ---
        if (profile.logo) {
            try {
                // 1. Rileva automaticamente il formato (PNG, JPEG, etc.) dalla stringa Base64
                let format = 'PNG'; // Fallback predefinito
                const match = profile.logo.match(/^data:image\/(\w+);base64,/);
                if (match && match[1]) {
                    format = match[1].toUpperCase();
                    if (format === 'JPG') format = 'JPEG'; // jsPDF richiede JPEG invece di JPG
                }

                // 2. Calcolo proporzioni (Aspect Ratio)
                let w = 50; // Larghezza fissa in mm
                let h = 25; // Altezza massima
                
                const domImg = document.querySelector('#logo-zone img');
                if (domImg && domImg.naturalWidth > 0) {
                    const ratio = domImg.naturalWidth / domImg.naturalHeight;
                    h = w / ratio;
                    // Se l'immagine è troppo alta, limitiamo l'altezza e ricalcoliamo la larghezza
                    if (h > 25) {
                        h = 25;
                        w = h * ratio;
                    }
                }

                // 3. Inserimento immagine nel PDF
                doc.addImage(profile.logo, format, 15, 15, w, h);
            } catch(e) {
                console.error("Errore durante l'inserimento del logo nel PDF:", e);
            }
        }

        // --- RESTO DEL DOCUMENTO ---
        // Intestazione a destra
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(...blue);
        doc.text("PREVENTIVO", 195, 25, { align: 'right' });

        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.setFont("helvetica", "normal");
        let y = 35;
        [profile.name, profile.address, profile.city, profile.contact, profile.vat ? `P.IVA: ${profile.vat}` : ""]
        .filter(Boolean).forEach(l => { 
            doc.text(String(l), 195, y, { align: 'right' }); 
            y += 5; 
        });

        // Dati Cliente
        let cy = 60;
        doc.setFontSize(10); doc.setTextColor(0);
        doc.text("Spett.le:", 15, cy); cy+=6;
        doc.setFont("helvetica", "bold");
        doc.text(document.getElementById('client-name').value || "Cliente", 15, cy); cy+=5;
        doc.setFont("helvetica", "normal");
        [document.getElementById('client-address').value, document.getElementById('client-city').value, document.getElementById('client-vat').value]
        .filter(Boolean).forEach(l => { doc.text(String(l), 15, cy); cy+=5; });

        // Tabella Articoli
        doc.autoTable({
            startY: Math.max(y, cy) + 15,
            head: [['Descrizione', 'Q.tà', 'Prezzo', 'IVA', 'Totale']],
            body: items.map(i => [i.desc, i.qty, i.price.toFixed(2), i.taxRate+'%', (i.qty*i.price).toFixed(2)]),
            theme: 'grid', 
            headStyles: { fillColor: blue },
            columnStyles: { 0: { cellWidth: 'auto' }, 4: { halign: 'right' } }
        });

        // Sezione Totali
        let ty = doc.lastAutoTable.finalY + 12;
        const xL = 140, xV = 195;
        doc.setFontSize(10); doc.setTextColor(...gray);

        doc.text("Imponibile Lordo:", xL, ty);
        doc.text(calculations.subtotal + " €", xV, ty, { align: 'right' }); ty+=6;

        if (Math.abs(calculations.adjustment.value) > 0.009) {
            const isDiscount = calculations.adjustment.value < 0;
            const absValue = Math.abs(calculations.adjustment.value);

            doc.setTextColor(...(isDiscount ? green : red)); // Verde per sconto, rosso per ricarico
            doc.text(calculations.adjustment.label + ":", xL, ty);
            doc.text(`${isDiscount ? '-' : '+'} ${absValue.toFixed(2)} €`, xV, ty, { align: 'right' }); 
            ty+=6;
            
            doc.setTextColor(...gray);
            doc.text("Imponibile Netto:", xL, ty);
            doc.text(calculations.finalSubtotal + " €", xV, ty, { align: 'right' }); ty+=6;
        }

        doc.setTextColor(...gray);
        doc.text("Totale IVA:", xL, ty);
        doc.text(calculations.tax + " €", xV, ty, { align: 'right' }); ty+=10;

        doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(...blue);
        doc.text("TOTALE:", xL, ty);
        doc.text(calculations.total + " €", xV, ty, { align: 'right' });
        
        // Footer Note
        doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(...gray);
        ty += 10;
        doc.text(`Offerta valida per: ${validityText}`, 15, ty);

        doc.save(`${filename || 'preventivo'}.pdf`);
    }
};
