const API_KEY = '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
'; // À remplacer

let recognition;

document.getElementById('btnStart').addEventListener('click', () => {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';

    recognition.onresult = (event) => {
        let transcript = '';
        for (const result of event.results) {
            transcript += result[0].transcript;
        }
        document.getElementById('dictation').value = transcript;
    };

    recognition.start();
    document.getElementById('btnStop').disabled = false;
});

document.getElementById('btnStop').addEventListener('click', async () => {
    recognition.stop();
    const texte = document.getElementById('dictation').value;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{
                    role: "user",
                    content: "Résumez ce texte en français : " + texte
                }]
            })
        });

        const data = await response.json();
        document.getElementById('dictation').value = data.choices[0].message.content;
        
    } catch (error) {
        alert("Erreur : " + error.message);
    }
});