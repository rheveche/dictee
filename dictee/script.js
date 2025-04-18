// Gère l'ajout de participants
const participantBtn = document.getElementById('participant-btn');
const participantDialog = document.getElementById('participant-dialog');
const participantForm = document.getElementById('participant-form');
let participants = [];
participantBtn.addEventListener('click', () => participantDialog.showModal());
participantForm.addEventListener('submit', e => {
  e.preventDefault();
  participants.push({ name: document.getElementById('participant-name').value, email: document.getElementById('participant-email').value });
  participantForm.reset();
  participantDialog.close();
});

// Gère la dictée
const transcriptArea = document.getElementById('transcript');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const exportBar = document.getElementById('export-bar');
let recognition, transcript = '';
function initRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Votre navigateur ne prend pas en charge la reconnaissance vocale. Essayez Chrome ou Edge.");
    return null;
  }
  const recog = new SpeechRecognition();
  recog.lang = 'fr-FR';
  recog.continuous = true;
  recog.interimResults = true;
  recog.onresult = e => {
    let interim = '';
    for (const res of e.results) {
      const txt = res[0].transcript;
      if (res.isFinal) { transcript += txt + ' '; }
      else { interim += txt; }
    }
    transcriptArea.value = transcript + interim;
  };
  recog.onerror = err => console.error(err);
  return recog;
}

startBtn.addEventListener('click', () => {
  if (!recognition) recognition = initRecognition();
  if (!recognition) return;
  transcript = '';
  transcriptArea.value = '';
  transcriptArea.disabled = false;
  recognition.start();
  startBtn.disabled = true;
  stopBtn.disabled = false;
});

stopBtn.addEventListener('click', async () => {
  recognition.stop();
  startBtn.disabled = false;
  stopBtn.disabled = true;
  transcriptArea.value = transcript;
  transcriptArea.disabled = true;
  transcriptArea.classList.add('loading');
  const res = await fetch('/api/summarize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcript, participants }) });
  const data = await res.json();
  transcriptArea.value = data.summary;
  transcriptArea.classList.remove('loading');
  exportBar.classList.remove('hidden');
});

// Gestion de l'exportation
function downloadBlob(filename, blob) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function downloadFile(filename, text, mime) {
  downloadBlob(filename, new Blob([text], { type: mime }));
}

document.getElementById('export-txt').addEventListener('click', () => downloadFile('synthese.txt', transcriptArea.value, 'text/plain'));
document.getElementById('export-doc').addEventListener('click', async () => {
  const { docx } = window;
  const doc = new docx.Document({ sections: [{ children: [new docx.Paragraph(transcriptArea.value)] }] });
  const blob = await docx.Packer.toBlob(doc);
  downloadBlob('synthese.docx', blob);
});

document.getElementById('export-pdf').addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  const lines = pdf.splitTextToSize(transcriptArea.value, 180);
  pdf.text(lines, 10, 10);
  pdf.save('synthese.pdf');
});
