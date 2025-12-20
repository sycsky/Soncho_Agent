import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateAIResponse = async (
  conversationHistory: { role: string; content: string }[],
  userContext: string,
  knowledgeBaseContext: string // New parameter for dynamic knowledge
): Promise<string> => {
  try {
    const model = 'gemini-2.0-flash-exp';

    const systemInstruction = `
      You are an advanced customer support AI for "NexusHub", a fictional tech ecosystem company.
      Your goal is to assist users politely, efficiently, and professionally.
      
      === USER CONTEXT ===
      ${userContext}

      === KNOWLEDGE BASE (Primary Source of Truth) ===
      ${knowledgeBaseContext ? knowledgeBaseContext : "No specific knowledge base provided. Use general knowledge carefully."}

      === GUIDELINES ===
      1. PRIORITIZE the "KNOWLEDGE BASE" above for factual answers about NexusHub.
      2. Be concise but helpful.
      3. If the answer is not in the Knowledge Base and requires specific company data, politely suggest waiting for a human agent.
      4. Maintain a friendly and empathetic tone.
      5. Format your response in clean Markdown if needed (lists, bold text).
    `;

    // Map conversation history to Gemini format if needed, but simple generateContent works for stateless turns usually. 
    // For better context, we build a prompt chain.
    
    // We will use a chat session for history awareness
    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    // We replay the history to the chat object to establish context (simplified for this demo)
    // In a real production app, we would manage the history array directly with the SDK's history prop.
    // Here we just send the last message for simplicity plus context in system instruction, 
    // or we could reconstruct history. Let's send the last user message.
    
    const lastUserMessage = conversationHistory[conversationHistory.length - 1].content;

    const result = await chat.sendMessage({
      message: lastUserMessage
    });

    return result.text || "I'm having trouble connecting to the knowledge base right now.";

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I apologize, but I'm currently experiencing high traffic. A human agent will be with you shortly.";
  }
};

export const generateChatSummary = async (
  conversationHistory: { role: string; content: string }[]
): Promise<string> => {
  try {
    const model = 'gemini-2.0-flash-exp';
    
    // Filter out internal system prompts, keep user/agent/model exchange
    const historyText = conversationHistory
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');

    const prompt = `
      Analyze the following customer support conversation history and provide a concise summary.
      
      Structure the summary as follows:
      1. **Issue Identified**: One sentence describing the problem.
      2. **Status**: Current state of the issue (Resolved/Pending/Needs Action).
      3. **Key Details**: Bullet points of important info provided or steps taken.
      4. **Sentiment**: The customer's emotional state (Positive/Neutral/Frustrated).

      === CONVERSATION HISTORY ===
      ${historyText}
    `;

    const result = await ai.models.generateContent({
      model: model,
      contents: prompt
    });

    return result.text || "Could not generate summary.";

  } catch (error) {
    console.error("Gemini Summary Error:", error);
    return "Error generating summary. Please try again later.";
  }
};

export const rewriteMessage = async (draft: string): Promise<string> => {
  try {
    const model = 'gemini-2.0-flash-exp';
    const prompt = `
      Rewrite the following draft customer support message to be professional, empathetic, and clear.
      Keep the core meaning but improve the tone significantly.
      
      Draft: "${draft}"
      
      Return ONLY the rewritten text, no quotes or explanations.
    `;

    const result = await ai.models.generateContent({
      model: model,
      contents: prompt
    });

    return result.text?.trim() || draft;
  } catch (error) {
    console.error("Gemini Rewrite Error:", error);
    return draft;
  }
};

export const analyzeSentiment = async (lastUserMessage: string): Promise<{ score: number; label: string }> => {
  try {
    // Determine sentiment score from 0 (Angry) to 100 (Happy)
    const model = 'gemini-2.0-flash-exp';
    const prompt = `
      Analyze the sentiment of this customer message: "${lastUserMessage}"
      
      Return a JSON object with:
      - score: number between 0 (Very Angry) and 100 (Very Happy)
      - label: string (Frustrated, Neutral, Happy, Urgent, etc.)
      
      Example: {"score": 20, "label": "Frustrated"}
    `;

    const result = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const json = JSON.parse(result.text || '{"score": 50, "label": "Neutral"}');
    return json;
  } catch (error) {
    return { score: 50, label: 'Neutral' };
  }
};

export const suggestUserTags = async (
  conversationHistory: { role: string; content: string }[],
  userContext: string
): Promise<string[]> => {
  try {
    const model = 'gemini-2.0-flash-exp';
    const prompt = `
      Analyze the following customer conversation history and user profile details.
      Identify 3-5 key characteristics, needs, or statuses that should be tagged.
      Tags should be short (1-2 words).
      
      User Profile: ${userContext}
      
      Conversation History:
      ${conversationHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}
      
      Return a JSON array of strings. 
      Example: ["High Value", "Frustrated", "Technical Issue", "Churn Risk"]
    `;

    const result = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const tags = JSON.parse(result.text || '[]');
    return Array.isArray(tags) ? tags : [];
  } catch (error) {
    console.error("Gemini Tag Suggestion Error:", error);
    return [];
  }
};
