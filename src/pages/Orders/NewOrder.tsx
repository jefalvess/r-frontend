import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Trash2, Search, X, Mic, Square } from 'lucide-react';
import { ordersApi, productsApi, categoriesApi } from '../../services/api';
import { audioProcessingApi } from '../../services/audioProcessing';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import type { OrderType, Product, Category, OrderItem } from '../../types';

export function NewOrder() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<(Omit<OrderItem, '_id'> & { key: string })[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productNotes, setProductNotes] = useState('');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const { isRecording, recordingTimeSeconds, startRecording, stopRecording } = useAudioRecorder();
  const [formData, setFormData] = useState({
    type: 'delivery' as OrderType,
    customerName: '',
    customerPhone: '',
    customerAddress: '',
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        productsApi.getAll(),
        categoriesApi.getAll(),
      ]);
      setProducts(productsData.filter((p) => p.active));
      setCategories(categoriesData);
    } catch (error) {
      alert('Erro ao carregar produtos');
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleAudioCapture = async () => {
    try {
      setAudioError(null);

      if (!isRecording) {
        // Iniciar gravação
        await startRecording();
      } else {
        // Parar gravação e processar
        setIsProcessingAudio(true);
        const audioBlob = await stopRecording();

        if (!audioBlob) {
          throw new Error('Falha ao capturar áudio');
        }

        // Enviar para OpenAI
        const result = await audioProcessingApi.processAudio(audioBlob);

        // Fazer match dos produtos e atualizar items
        const matchedItems = result.items.map((item) => {
          // Buscar produto por nome (case-insensitive, com busca fuzzy)
          const matchedProduct = products.find(
            (p) =>
              p.name.toLowerCase().includes(item.productName.toLowerCase()) ||
              item.productName.toLowerCase().includes(p.name.toLowerCase())
          );

          if (matchedProduct) {
            return {
              ...item,
              productId: matchedProduct._id,
              unitPrice: matchedProduct.price,
              total: item.quantity * matchedProduct.price,
            };
          }

          // Se não encontrar, mantém com productId vazio (usuário terá que confirmar manualmente)
          return item;
        });

        // Atualizar estado
        setItems((prevItems) => [...prevItems, ...matchedItems]);

        setFormData((prev) => ({
          ...prev,
          type: result.type || prev.type,
          customerName: result.customerName || prev.customerName,
          customerPhone: result.customerPhone || prev.customerPhone,
          customerAddress: result.customerAddress || prev.customerAddress,
        }));

        const filledFields = [
          result.type ? `tipo: ${result.type}` : null,
          result.customerName ? `nome: ${result.customerName}` : null,
          result.customerPhone ? `telefone: ${result.customerPhone}` : null,
          result.customerAddress ? 'endereco preenchido' : null,
        ].filter(Boolean);

        // Feedback visual
        alert(
          `✅ ${matchedItems.length} produto(s) adicionado(s)!${filledFields.length ? `\n\nCampos preenchidos: ${filledFields.join(', ')}` : ''}\n\n${matchedItems.map((i) => `${i.quantity}x ${i.productName}`).join('\n')}`
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      setAudioError(errorMsg);
      alert(`❌ ${errorMsg}`);
    } finally {
      setIsProcessingAudio(false);
    }
  };

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductNotes('');
  };

  const confirmProduct = (product: Product) => {
    setItems([
      ...items,
      {
        key: Date.now().toString(),
        productId: product._id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        total: product.price,
        notes: productNotes || undefined,
      },
    ]);
    setSelectedProduct(null);
    setProductNotes('');
  };

  const removeItem = (key: string) => {
    setItems(items.filter((i) => i.key !== key));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Adicione pelo menos um produto');
      return;
    }
    if (!formData.customerName) {
      alert('Digite o nome do cliente');
      return;
    }
    if (formData.type === 'delivery' && !formData.customerPhone) {
      alert('Digite o telefone para delivery');
      return;
    }
    if (formData.type === 'delivery' && !formData.customerAddress) {
      alert('Digite o endereço de entrega');
      return;
    }

    setLoading(true);
    try {
      const subtotal = items.reduce((sum, i) => sum + i.total, 0);
      const order = await ordersApi.create({
        ...formData,
        items: items.map(({ key: _key, ...item }) => ({ ...item, _id: _key })),
        subtotal,
        discount: 0,
        deliveryFee: formData.type === 'delivery' ? 8 : 0,
        total: subtotal + (formData.type === 'delivery' ? 8 : 0),
        status: 'aberto',
        paid: false,
      });

      navigate(`/pedidos/${order._id}`);
    } catch (error) {
      alert('Erro ao criar pedido');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    if (selectedCategory !== 'todos' && product.categoryId !== selectedCategory) return false;
    if (searchTerm) {
      return product.name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const formatRecordingTime = (value: number) => {
    const minutes = Math.floor(value / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (value % 60).toString().padStart(2, '0');

    return `${minutes}:${seconds}`;
  };

  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const deliveryFee = formData.type === 'delivery' ? 8 : 0;
  const total = subtotal + deliveryFee;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/pedidos')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          <span>Voltar para pedidos</span>
        </button>
        <h1 className="text-2xl lg:text-3xl font-semibold mb-2">Novo Pedido</h1>
        <p className="text-gray-600">Selecione os produtos para o cliente</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2">
          {/* Form Header */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="font-semibold text-lg mb-4">Dados do Cliente</h2>

            {/* Type Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Pedido *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'retirada', label: 'Retirada' },
                  { value: 'delivery', label: 'Delivery' },
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: type.value as OrderType })}
                    className={`p-3 rounded-lg border-2 transition ${
                      formData.type === type.value
                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer Name */}
            <div className="mb-4">
              <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Cliente *
              </label>
              <input
                id="customerName"
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Digite o nome do cliente"
              />
            </div>

            {/* Phone */}
            <div className="mb-4">
              <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-2">
                Telefone {formData.type === 'delivery' ? '*' : ''}
              </label>
              <input
                id="customerPhone"
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="(11) 99999-9999"
              />
            </div>

            {/* Address - Delivery Only */}
            {formData.type === 'delivery' && (
              <div>
                <label
                  htmlFor="customerAddress"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Endereço de Entrega *
                </label>
                <textarea
                  id="customerAddress"
                  value={formData.customerAddress}
                  onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Rua, número, complemento, bairro"
                  rows={2}
                />
              </div>
            )}
          </div>

          {/* Products */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Selecione os Produtos</h2>
            </div>

            <div
              className={`mb-5 rounded-2xl border transition-all ${
                isRecording
                  ? 'border-red-200 bg-gradient-to-r from-red-50 to-orange-50 shadow-sm'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${
                      isRecording ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'bg-blue-600 text-white'
                    }`}
                  >
                    {isRecording ? <Square size={18} /> : <Mic size={20} />}
                  </div>

                  <div>
                    <p className={`text-sm font-semibold ${isRecording ? 'text-red-700' : 'text-slate-800'}`}>
                      {isRecording ? 'Gravando pedido...' : 'Ditado inteligente do pedido'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {isRecording
                        ? 'Fale nome, telefone, endereco, tipo e itens do pedido.'
                        : 'Toque para gravar e preencher os campos automaticamente.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 md:min-w-[220px] md:justify-end">
                  <div
                    className={`flex min-w-[104px] items-center justify-center rounded-full px-4 py-2 font-mono text-lg font-semibold tracking-wide ${
                      isRecording ? 'bg-white text-red-700' : 'bg-white text-slate-600'
                    }`}
                  >
                    {isRecording && <span className="mr-2 h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />}
                    {formatRecordingTime(recordingTimeSeconds)}
                  </div>

                  <button
                    onClick={handleAudioCapture}
                    disabled={isProcessingAudio || loadingProducts}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                      isRecording
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {isRecording ? (
                      <>
                        <Square size={16} />
                        Finalizar
                      </>
                    ) : isProcessingAudio ? (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Mic size={16} />
                        Gravar audio
                      </>
                    )}
                  </button>
                </div>
              </div>

              {isRecording && (
                <div className="border-t border-red-100 px-4 py-3 text-sm text-red-700">
                  O contador esta ativo. Quando terminar de falar, toque em finalizar para montar o pedido.
                </div>
              )}
            </div>

            {audioError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {audioError}
              </div>
            )}

            {/* Search */}
            {!loadingProducts && (
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            )}

            {/* Categories */}
            {!loadingProducts && (
              <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
                <button
                  onClick={() => setSelectedCategory('todos')}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm transition ${
                    selectedCategory === 'todos'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat._id}
                    onClick={() => setSelectedCategory(cat._id)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm transition ${
                      selectedCategory === cat._id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* Products Grid */}
            {loadingProducts ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-4">Carregando produtos...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredProducts.map((product) => (
                  <button
                    key={product._id}
                    onClick={() => selectProduct(product)}
                    className="bg-white border-2 border-gray-200 rounded-lg p-3 hover:border-blue-600 hover:bg-blue-50 transition text-left"
                  >
                    <h3 className="font-semibold text-sm mb-2 line-clamp-2">{product.name}</h3>
                    <p className="text-sm font-semibold text-blue-600">
                      R$ {product.price.toFixed(2)}
                    </p>
                  </button>
                ))}
              </div>
            )}
            {!loadingProducts && filteredProducts.length === 0 && (
              <div className="text-center py-12 text-gray-500">Nenhum produto encontrado</div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
            <h2 className="font-semibold text-lg mb-4">Itens do Pedido</h2>

            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">Nenhum item adicionado</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.key} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{item.productName}</p>
                        {item.notes && <p className="text-xs text-orange-600 italic mt-0.5">{item.notes}</p>}
                        <p className="text-xs text-gray-500 mt-0.5">R$ {item.unitPrice.toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => removeItem(item.key)}
                        className="text-red-600 hover:bg-red-50 p-1 rounded flex-shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>R$ {subtotal.toFixed(2)}</span>
                  </div>
                  {deliveryFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Taxa de Entrega</span>
                      <span>R$ {deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span>R$ {total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="mt-6 space-y-2">
                  <button
                    onClick={(e) => handleSubmit(e)}
                    disabled={loading || items.length === 0}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                  >
                    {loading ? 'Criando...' : 'Criar Pedido'}
                  </button>
                  <button
                    onClick={() => navigate('/pedidos')}
                    className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Product Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-semibold">{selectedProduct.name}</h2>
                <button
                  onClick={() => { setSelectedProduct(null); setProductNotes(''); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
              <p className="text-lg font-semibold text-blue-600 mt-2">
                R$ {selectedProduct.price.toFixed(2)}
              </p>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações (opcional)
              </label>
              <textarea
                value={productNotes}
                onChange={(e) => setProductNotes(e.target.value)}
                placeholder="Ex: sem cebola, bem passado, molho à parte..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                rows={3}
                autoFocus
              />
            </div>

            <div className="border-t border-gray-200 p-6 space-y-2">
              <button
                onClick={() => confirmProduct(selectedProduct)}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Adicionar ao Pedido
              </button>
              <button
                onClick={() => { setSelectedProduct(null); setProductNotes(''); }}
                className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
