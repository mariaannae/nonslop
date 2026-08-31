import OpenAI from 'openai';

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Respond to preflight request
    if (request.method === 'OPTIONS') {
      console.log('options request');
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === 'POST') {
      console.log('post request');
      try {
        const openai = new OpenAI({
          apiKey: env.OPENAI_API_KEY,
          baseURL:
            'https://gateway.ai.cloudflare.com/v1/4c6978cc2955d7ac74d9de5b674f23c3/openai-proxy/openai',
        });

        const requestData = await request.json();
        const prompt = requestData.prompt;

        if (!prompt) {
          return new Response(JSON.stringify({ error: 'Prompt is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        const chatCompletion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: prompt,
          max_tokens: 500,
        });

        const response = chatCompletion.choices[0].message;

        return new Response(JSON.stringify(response), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      } catch (error) {
        console.error('Worker error:', error);
        // Always return cors headers, even on error
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      }
    }

    return new Response('Method Not Allowed', {
      status: 405,
      headers: corsHeaders,
    });
  },
};
