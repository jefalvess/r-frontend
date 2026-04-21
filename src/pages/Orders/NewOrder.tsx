import { useState, FormEvent, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Trash2, Search, X, Mic } from 'lucide-react';
import { toast } from 'sonner';
import { ordersApi, productsApi, categoriesApi } from '../../services/api';
import { audioProcessingApi } from '../../services/audioProcessing';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { PrintTicket } from '../../components/PrintTicket';
import type { OrderType, Product, Category, OrderItem, Order } from '../../types';

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
  const [productUnitPriceInput, setProductUnitPriceInput] = useState('');
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const isRecordingRef = useRef(false);
  const [createdOrderToPrint, setCreatedOrderToPrint] = useState<Order | null>(null);
  const [printCreatedOrder, setPrintCreatedOrder] = useState(false);
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
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoadingProducts(false);
    }
  };

  const playBeep = () => {
    try {
      type AudioCtxCtor = typeof AudioContext;
      const Ctor: AudioCtxCtor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: AudioCtxCtor }).webkitAudioContext!;
      const ctx = new Ctor();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // sem suporte — silencioso
    }
  };

  const processAudioBlob = async (audioBlob: Blob) => {
    const result = await audioProcessingApi.processAudio(audioBlob);

    const matchedItems = result.items.map((item) => {
      const matchedById = item.productId
        ? products.find((product) => product._id === item.productId)
        : null;

      if (matchedById) {
        return {
          ...item,
          productId: matchedById._id,
          productName: matchedById.name,
          unitPrice: matchedById.price,
          total: item.quantity * matchedById.price,
        };
      }

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

      return item;
    });

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

    toast.success(`${matchedItems.length} produto(s) adicionado(s)!`, {
      description: `${
        filledFields.length ? `Campos preenchidos: ${filledFields.join(', ')}\n\n` : ''
      }${matchedItems.map((i) => `${i.quantity}x ${i.productName}`).join('\n')}`,
    });
  };

  const handlePressStart = async (e: React.PointerEvent) => {
    e.preventDefault();
    if (isRecordingRef.current || isProcessingAudio || loadingProducts) return;

    // Registra o listener ANTES de iniciar a gravação para não perder o pointerup
    // caso a inicialização do microfone demore (ex: caixa de permissão).
    let recordingStarted = false;

    const onRelease = async () => {
      document.removeEventListener('pointerup', onRelease);
      document.removeEventListener('pointercancel', onRelease);
      if (!recordingStarted && !isRecordingRef.current) return;
      isRecordingRef.current = false;
      setIsProcessingAudio(true);
      try {
        const audioBlob = await stopRecording();
        if (!audioBlob) throw new Error('Falha ao capturar áudio');
        await processAudioBlob(audioBlob);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        toast.error('Erro ao processar áudio', { description: errorMsg });
      } finally {
        setIsProcessingAudio(false);
      }
    };

    document.addEventListener('pointerup', onRelease);
    document.addEventListener('pointercancel', onRelease);

    playBeep();
    try {
      await startRecording();
      recordingStarted = true;
      isRecordingRef.current = true;
    } catch (error) {
      document.removeEventListener('pointerup', onRelease);
      document.removeEventListener('pointercancel', onRelease);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao acessar microfone', { description: errorMsg });
    }
  };

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductNotes('');
    setProductUnitPriceInput(product.price.toFixed(2));
  };

  const confirmProduct = (product: Product) => {
    const parsedPrice = Number.parseFloat(productUnitPriceInput.replace(',', '.'));
    const unitPrice = Number.isNaN(parsedPrice) || parsedPrice < 0 ? product.price : parsedPrice;

    setItems([
      ...items,
      {
        key: Date.now().toString(),
        productId: product._id,
        productName: product.name,
        quantity: 1,
        unitPrice,
        total: unitPrice,
        notes: productNotes || undefined,
      },
    ]);
    setSelectedProduct(null);
    setProductNotes('');
    setProductUnitPriceInput('');
  };

  const removeItem = (key: string) => {
    setItems(items.filter((i) => i.key !== key));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error('Adicione pelo menos um produto');
      return;
    }
    if (!formData.customerName) {
      toast.error('Digite o nome do cliente');
      return;
    }
    if (formData.type === 'delivery' && !formData.customerPhone) {
      toast.error('Digite o telefone para delivery');
      return;
    }
    if (formData.type === 'delivery' && !formData.customerAddress) {
      toast.error('Digite o endereço de entrega');
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
        deliveryFee: 0,
        total: subtotal,
        status: 'aberto',
        paid: false,
      });

      setCreatedOrderToPrint(order);
      setPrintCreatedOrder(true);

      // Aguarda renderizar o ticket antes de acionar impressão e navegar.
      setTimeout(() => {
        window.print();
        setTimeout(() => {
          setPrintCreatedOrder(false);
          navigate(`/pedidos/${order._id}`);
        }, 500);
      }, 200);
    } catch (error) {
      toast.error('Erro ao criar pedido');
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
  const deliveryFee = 0;
  const total = subtotal + deliveryFee;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-28">
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
                  onClick={() => { setSelectedProduct(null); setProductNotes(''); setProductUnitPriceInput(''); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preço unitário (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={productUnitPriceInput}
                onChange={(e) => setProductUnitPriceInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-4"
              />

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
                onClick={() => { setSelectedProduct(null); setProductNotes(''); setProductUnitPriceInput(''); }}
                className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {createdOrderToPrint && printCreatedOrder && (
        <div>
          <PrintTicket order={createdOrderToPrint} type="kitchen" />
        </div>
      )}

      {/* Botão flutuante de gravação por voz */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 select-none">
        {/* Indicador de estado acima do botão */}
        {(isRecording || isProcessingAudio) && (
          <div className="flex items-center gap-2 bg-white rounded-2xl shadow-lg px-4 py-2 border border-gray-100">
            {isProcessingAudio ? (
              <>
                <div className="h-3.5 w-3.5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                <span className="text-sm font-medium text-gray-700">Processando...</span>
              </>
            ) : (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="font-mono text-sm font-semibold text-red-700">
                  {formatRecordingTime(recordingTimeSeconds)}
                </span>
                <span className="text-xs text-gray-400">Solte para enviar</span>
              </>
            )}
          </div>
        )}

        {/* Botão principal */}
        <button
          onPointerDown={handlePressStart}
          disabled={isProcessingAudio || loadingProducts}
          aria-label="Pressione e segure para gravar pedido por voz"
          className={`flex h-16 w-16 items-center justify-center rounded-full shadow-2xl transition-all duration-150 ${
            isRecording
              ? 'bg-red-500 scale-110 ring-4 ring-red-300'
              : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isProcessingAudio ? (
            <div className="h-6 w-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <Mic size={28} className="text-white" />
          )}
        </button>

        {/* Dica inicial */}
        {!isRecording && !isProcessingAudio && (
          <span className="text-xs text-gray-400 text-center w-16">Segure p/ gravar</span>
        )}
      </div>
    </div>
  );
}
