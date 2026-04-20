# 🎤 Recurso de Captura de Áudio para Pedidos

Este projeto inclui um recurso inteligente de captura de áudio que permite aos usuários criar pedidos falando em português, em vez de digitando manualmente.

## 🚀 Como Funciona

1. **Gravação**: Clique no botão "🎤 Gravar Pedido" para iniciar a gravação
2. **Transcrição**: O áudio é enviado para a API do Whisper (OpenAI)
3. **Processamento**: O texto é enviado para o ChatGPT para extrair produtos e observações
4. **Preenchimento Automático**: Os produtos são adicionados automaticamente ao pedido

### Exemplo de Uso

Você diz: *"Quero duas parmegiana, uma sem queijo e outra com muito queijo, um hambúrguer artesanal, e um refrigerante"*

Sistema retorna:
```json
{
  "items": [
    {
      "productName": "Parmegiana",
      "quantity": 2,
      "notes": "sem queijo"
    },
    {
      "productName": "Parmegiana",
      "quantity": 1,
      "notes": "com muito queijo"
    },
    {
      "productName": "Hambúrguer Artesanal",
      "quantity": 1
    },
    {
      "productName": "Refrigerante",
      "quantity": 1
    }
  ]
}
```

## ⚙️ Configuração

### 1. Obter Chave da OpenAI

1. Acesse [platform.openai.com](https://platform.openai.com)
2. Faça login ou crie uma conta
3. Vá para "API Keys" no menu lateral
4. Clique em "Create new secret key"
5. Copie a chave (ela começa com `sk-`)

**IMPORTANTE**: Nunca compartilhe sua chave ou faça commit no repositório!

### 2. Configurar Variáveis de Ambiente

#### Desenvolvimento Local

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_OPENAI_API_KEY=sk-seu-chave-aqui
```

#### Em Produção (GitHub Pages / Vercel)

Se estiver deployando, adicione a variável de ambiente nas configurações do seu servidor:

**GitHub Pages + GitHub Actions:**
```yaml
# .github/workflows/deploy.yml
env:
  VITE_OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

**Vercel:**
- Vá para o projeto no Vercel
- Settings → Environment Variables
- Nome: `VITE_OPENAI_API_KEY`
- Valor: sua chave

## 💰 Custos

A API da OpenAI é paga:
- **Whisper**: ~$0.02 por minuto de áudio
- **GPT-4-Turbo**: ~$0.03 por 1K tokens de entrada

Para pedidos simples (~30 segundos de áudio):
- ~$0.01 por transcrição
- ~$0.01 por processamento
- **Total**: ~$0.02 por pedido

## 🔒 Segurança

- **Nunca** commit a chave no repositório
- Use variáveis de ambiente
- Considere usar uma chave com permissões limitadas (apenas Whisper + GPT)
- Monitore o uso na dashboard da OpenAI

## 📱 Compatibilidade

- ✅ Chrome/Edge (Desktop e Mobile)
- ✅ Firefox
- ✅ Safari (macOS e iOS)
- ⚠️ Requer HTTPS em produção (HTTP local é OK)

## 🐛 Troubleshooting

### "Não foi possível acessar o microfone"

- Verifique as permissões do navegador
- Certifique-se de estar em HTTPS (exceto localhost)
- Tente em outro navegador

### "Chave da OpenAI não configurada"

- Verifique se `.env` está na raiz do projeto
- Confirme que o nome da variável é exatamente `VITE_OPENAI_API_KEY`
- Reinicie o servidor de desenvolvimento

### "Resposta do ChatGPT não é JSON válido"

- Tente gravar novamente
- Fale mais devagar e claro
- Certifique-se de mencionar os nomes dos produtos corretamente

## 🎯 Dicas de Uso

1. **Fale Claramente**: O Whisper funciona melhor com áudio claro
2. **Nomes de Produtos**: Use os nomes exatos dos produtos (ex: "Parmegiana" em vez de "Parmigiana")
3. **Quantidades**: Diga os números por extenso (ex: "duas parmegiana" em vez de "2 parmegiana")
4. **Observações**: Inclua observações naturalmente (ex: "sem queijo", "bem passado")
5. **Nome do Cliente**: Você pode mencionar o nome do cliente no áudio

## 🔄 Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                   Clica em "Gravar Pedido"                      │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              Fala o pedido (até 25 minutos)                      │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│        Clica em "Parar" ou para de falar automaticamente         │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │  Enviando áudio... │
        └────────────┬───────┘
                     │
                     ▼
        ┌─────────────────────────┐
        │  Whisper transcrevendo  │
        └────────────┬────────────┘
                     │
                     ▼
        ┌───────────────────────────┐
        │  ChatGPT processando JSON │
        └────────────┬──────────────┘
                     │
                     ▼
      ┌─────────────────────────────────┐
      │  Produtos adicionados ao pedido │
      └─────────────────────────────────┘
```
