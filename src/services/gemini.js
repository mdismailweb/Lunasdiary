const GEMINI_MODEL = 'gemini-1.5-flash';

export async function getAiReflection(apiKey, thoughts) {
    if (!apiKey) throw new Error('Gemini API Key missing');
    if (!thoughts || thoughts.length === 0) throw new Error('No thoughts to reflect on');

    const prompt = `
        You are a supportive personal AI assistant. Below are a series of "Thought Dumps" from a user's private journal.
        Analyze these thoughts and provide a concise (3-4 bullet points) reflection on recurring patterns, 
        mental states, or interesting connections you notice. Keep it supportive, brief, and insightful.

        Thoughts:
        ${thoughts.map(t => `- [${t.created_at}] ${t.content}`).join('\n')}

        REFLECTION:
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Gemini API Error');
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}
