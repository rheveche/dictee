import OpenAI from "openai";

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Méthode non autorisée', { status: 405 });
  const { transcript, participants = [] } = await req.json();
  if (!transcript) return new Response('Transcript manquant', { status: 400 });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    messages: [
      { role: 'system', content: 'Vous êtes un assistant qui synthétise des réunions de façon claire, structurée et actionable.' },
      { role: 'user', content: `Participants : ${participants.map(p => p.name).join(', ') || 'non spécifiés'}\n\nTranscription brute :\n${transcript}\n\nMerci de rédiger une synthèse :\n- Résumé général\n- Points clés décidés\n- Actions à mener et responsables\n- Prochaines étapes avec échéances.` }
    ]
  });

  const summary = completion.choices[0].message.content.trim();
  return new Response(JSON.stringify({ summary }), { headers: { 'Content-Type': 'application/json' } });
}
