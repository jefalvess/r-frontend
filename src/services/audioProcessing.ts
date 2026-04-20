import type { OrderItem, OrderType } from '../types';

interface ParsedOrder {
  items: (Omit<OrderItem, '_id'> & { key: string })[];
  type?: OrderType;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  transcript?: string;
}

interface ImportMeta {
  env: {
    PROD: boolean;
  };
}

const API_BASE_URL = import.meta.env.PROD
  ? 'https://restaurante-frontend-back.vercel.app'
  : 'http://localhost:3000';

const AUTH_TOKEN_COOKIE_NAME = 'auth_token';

const getAuthTokenFromCookie = (): string | null => {
  if (typeof document === 'undefined') return null;

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${AUTH_TOKEN_COOKIE_NAME}=`));

  if (!cookie) return null;

  return decodeURIComponent(cookie.split('=').slice(1).join('='));
};

export const audioProcessingApi = {
  /**
   * Envia o áudio para o backend processar com IA
   * Retorna JSON estruturado com itens e dados do formulário do pedido
   */
  processAudio: async (audioBlob: Blob): Promise<ParsedOrder> => {
    const formData = new FormData();
    const mimeType = audioBlob.type || 'audio/webm';
    const extension = mimeType.split('/')[1]?.split(';')[0] || 'webm';
    formData.append('file', audioBlob, `pedido.${extension}`);

    const token = getAuthTokenFromCookie();

    const response = await fetch(`${API_BASE_URL}/orders/voice-parse`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(
        error?.message || error?.error?.message || 'Erro ao processar pedido por audio'
      );
    }

    const parsedData = (await response.json()) as {
      items?: Array<Partial<OrderItem>>;
      type?: OrderType;
      customerName?: string;
      customerPhone?: string;
      customerAddress?: string;
      transcript?: string;
    };

    const formattedItems = (parsedData.items || []).map(
      (item: any, index: number) => ({
        key: `audio-${Date.now()}-${index}`,
        productId: item.productId || '',
        productName: item.productName || 'Produto desconhecido',
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
        total: Number(item.total || 0),
        notes: item.notes || undefined,
      })
    );

    return {
      items: formattedItems,
      type: parsedData.type || undefined,
      customerName: parsedData.customerName || undefined,
      customerPhone: parsedData.customerPhone || undefined,
      customerAddress: parsedData.customerAddress || undefined,
      transcript: parsedData.transcript || undefined,
    };
  },
};
