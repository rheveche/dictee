export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Méthode non autorisée', { status: 405 });
  }

  const { transcript, participants = [] } = await req.json();
  if (!transcript) {
    return new Response('Transcript manquant', { status: 400 });
  }

  const openaiApiKey = process.env.OPENAI_API_KEY;
  const endpoint = 'https://api.openai.com/v1/chat/completions';

  // Construire la requête pour OpenAI
  const requestBody = {
    model: 'gpt-4o-mini', // Vous pouvez changer cela selon le modèle que vous utilisez
    temperature: 0.3,
    messages: [
      { role: 'system', content: 'Vous êtes un assistant qui synthétise des réunions de façon claire, structurée et actionable.' },
      {
        role: 'user',
        content: `Participants : ${participants.map(p => p.name).join(', ') || 'non spécifiés'}
        
Transcription brute :
${transcript}
        
Merci de rédiger une synthèse :
- Résumé général
- Points clés décidés
- Actions à mener et responsables
- Prochaines étapes avec échéances.`
      }
    ]
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    if (response.ok) {
      const summary = data.choices[0].message.content.trim();
      return new Response(JSON.stringify({ summary }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ error: data.error }), { status: response.status });
    }
  } catch (error) {
    return new Response('Erreur lors de l\'appel à l\'API OpenAI', { status: 500 });
  }
}
