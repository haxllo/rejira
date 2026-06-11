import 'server-only';

import type OpenAI from 'openai';

export async function generateEmbedding(
  text: string,
  client: OpenAI
): Promise<number[]> {
  if (!text.trim()) {
    return new Array(1536).fill(0);
  }

  try {
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch {
    return new Array(1536).fill(0);
  }
}
