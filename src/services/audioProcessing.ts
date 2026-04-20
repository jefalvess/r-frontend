import type { OrderItem, OrderType } from '../types';

interface ParsedOrder {
  items: (Omit<OrderItem, '_id'> & { key: string })[];
  type?: OrderType;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
}

const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

const blobToBase64 = async (blob: Blob): Promise<string> => {
  const arrayBuffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
};

export const audioProcessingApi = {
  /**
  * Processa áudio diretamente via Gemini
  * Retorna JSON estruturado com itens e dados do formulário do pedido
   */
  processAudio: async (audioBlob: Blob): Promise<ParsedOrder> => {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

    if (!apiKey) {
      throw new Error(
        'Chave do Google Gemini não configurada. Configure VITE_GOOGLE_API_KEY nas variáveis de ambiente.'
      );
    }

    const base64Audio = await blobToBase64(audioBlob);
    const mimeType = audioBlob.type || 'audio/webm';

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          generationConfig: {
            responseMimeType: 'application/json',
          },
          contents: [
            {
              parts: [
                {
                  text: `Você é um assistente de pedidos de restaurante. 
Você vai receber um áudio em português do Brasil com um pedido falado.
Transcreva mentalmente o áudio, interprete o pedido e retorne um JSON válido com a seguinte estrutura:
{
  "type": "delivery | retirada | balcao | mesa",
  "customerName": "nome do cliente",
  "customerPhone": "telefone do cliente",
  "customerAddress": "endereço de entrega",
  "items": [
    {
      "productName": "nome do produto",
      "quantity": 1,
      "unitPrice": 0,
      "total": 0,
      "notes": "observações opcionais"
    }
  ]
}

IMPORTANTE:
- Coloque unitPrice e total como 0 (serão preenchidos pelo sistema com os preços reais)
- Preencha "type" somente se o áudio deixar claro se é delivery, retirada, balcão ou mesa
- Se não houver observações, omita o campo "notes"
- Se não houver nome do cliente, omita o campo "customerName"
- Se não houver telefone, omita o campo "customerPhone"
- Se não houver endereço, omita o campo "customerAddress"
- Retorne APENAS o JSON, sem explicações adicionais
- Detecte corretamente quantidade e produtos mesmo com variações de fala
- Interprete "uma parmegiana" como quantidade 1, "duas parmegiana" como 2, etc.
- Se houver o mesmo produto com observações diferentes, crie itens separados
- Não invente itens que não estejam presentes no áudio
- Se o usuário falar nome, telefone, endereço e produtos, capture tudo
- Se o usuário não informar algum campo, simplesmente omita esse campo do JSON`,
                },
                {
                  inlineData: {
                    mimeType,
                    data: base64Audio,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const error = await geminiResponse.json();
      throw new Error(
        `Erro ao processar pedido com ${GEMINI_MODEL}: ${error.error?.message || 'Desconhecido'}`
      );
    }

    const geminiData = (await geminiResponse.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const geminiContent = geminiData.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text ?? '')
      .join('')
      .trim();

    if (!geminiContent) {
      throw new Error('Nenhuma resposta do Gemini');
    }

    // Parse JSON da resposta
    let parsedData;
    try {
      // Remove markdown code blocks se existirem
      const jsonStr = geminiContent
        .replace(/```json\n?|\n?```/g, '')
        .trim();
      parsedData = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Resposta do Gemini:', geminiContent);
      throw new Error('Erro ao processar resposta do Gemini. Tente novamente.');
    }

    // Formatar para o estado do componente
    const formattedItems = (parsedData.items || []).map(
      (item: any, index: number) => ({
        key: `audio-${Date.now()}-${index}`,
        productName: item.productName || 'Produto desconhecido',
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
        total: Number(item.total || 0),
        notes: item.notes || undefined,
        productId: '', // Será preenchido depois ao confirmar
      })
    );

    return {
      items: formattedItems,
      type: parsedData.type || undefined,
      customerName: parsedData.customerName || undefined,
      customerPhone: parsedData.customerPhone || undefined,
      customerAddress: parsedData.customerAddress || undefined,
    };
  },
};
