let recognition;
let isRecognizing = false;
let finalTranscript = '';
let participants = [];

// Configuration initiale
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.protocol !== 'https:' && !window.location.hostname.includes('localhost')) {
        window.location.replace(`https:${window.location.href.substring(window.location.protocol.length)}`);
    }
});

function ajouterParticipant() {
    const nomInput = document.getElementById('nom');
    const emailInput = document.getElementById('email');
    const liste = document.getElementById('listeParticipants');

    const nom = nomInput.value.trim();
    const email = emailInput.value.trim();

    if (!nom || !validateEmail(email)) {
        showError('Veuillez remplir les champs correctement');
        return;
    }

    if (participants.some(p => p.email === email)) {
        showError('Cet email est déjà enregistré');
        return;
    }

    participants.push({ nom, email });
    
    const div = document.createElement('div');
    div.className = 'participant-item';
    div.innerHTML = `
        <span>${nom} <em>(${email})</em></span>
        <button onclick="this.parentElement.remove(); participants = participants.filter(p => p.email !== '${email}')">✖</button>
    `;
    
    liste.appendChild(div);
    nomInput.value = '';
    emailInput.value = '';
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}

function startMeeting() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        showError('Navigateur non compatible avec la dictée');
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';

    recognition.onstart = () => {
        isRecognizing = true;
        document.getElementById('btnStart').disabled = true;
        document.getElementById('btnStop').disabled = false;
        document.getElementById('dictation').disabled = false;
    };

    recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interim += transcript;
            }
        }
        document.getElementById('dictation').value = finalTranscript + interim;
    };

    recognition.onerror = (event) => {
        showError(`Erreur de reconnaissance : ${event.error}`);
    };

    recognition.start();
}

async function stopMeeting() {
    if (!isRecognizing) return;

    recognition.stop();
    isRecognizing = false;
    
    try {
        const apiKey = await getApiKey();
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{
                    role: "user",
                    content: `Créez un compte-rendu structuré en français avec sections et points clés : ${finalTranscript}`
                }]
            })
        });

        if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
        
        const data = await response.json();
        document.getElementById('dictation').value = data.choices[0].message.content;
        document.getElementById('exportButtons').classList.remove('hidden');
        
    } catch (error) {
        showError(`Échec de la synthèse : ${error.message}`);
    }
}

async function getApiKey() {
    if (import.meta.env && import.meta.env.VITE_OPENAI_API_KEY) {
        return import.meta.env.VITE_OPENAI_API_KEY;
    }
    return process.env.OPENAI_API_KEY;
}

// Fonctions d'export
function exportTXT() {
    const text = document.getElementById('dictation').value;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CR_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
}

function exportPDF() {
    const doc = new jspdf.jsPDF();
    doc.setFontSize(12);
    doc.text(15, 20, document.getElementById('dictation').value.split('\n'));
    doc.save(`CR_${new Date().toISOString().slice(0,10)}.pdf`);
}

async function exportDOC() {
    const doc = new docx.Document({
        sections: [{
            children: document.getElementById('dictation').value.split('\n').map(line => 
                new docx.Paragraph({
                    children: [new docx.TextRun(line)],
                    spacing: { after: 200 }
                })
            )
        }]
    });
    
    const buffer = await docx.Packer.toBuffer(doc);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CR_${new Date().toISOString().slice(0,10)}.docx`;
    a.click();
}