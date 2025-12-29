export const Storage = {
    // Salva i dati aziendali e il logo
    saveProfile(data) {
        localStorage.setItem('digitrik_profile', JSON.stringify(data));
    },

    // Carica i dati salvati
    loadProfile() {
        const profile = localStorage.getItem('digitrik_profile');
        return profile ? JSON.parse(profile) : null;
    },

    // Converte l'immagine del logo in stringa per salvarla
    convertToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
};