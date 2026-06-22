import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from './store/useStore';
import { io, Socket } from 'socket.io-client';
import {
  ShoppingBag,
  Globe,
  Sun,
  Moon,
  LogIn,
  LogOut,
  Plus,
  Minus,
  Trash2,
  MapPin,
  Phone,
  CreditCard,
  CheckCircle,
  Clock,
  Utensils,
  Search,
  X,
  PlusCircle,
  Edit2,
  Truck,
  DollarSign,
  Package
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';
const SOCKET_BASE = import.meta.env.VITE_SOCKET_BASE || 'http://localhost:3000';

export default function App() {
  const { t } = useTranslation();
  const {
    theme,
    language,
    toggleTheme,
    setLanguage,
    currentView,
    setView,
    user,
    token,
    login,
    logout,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    trackedOrderId,
    trackedOrderStatus,
    setTrackedOrder
  } = useStore();

  // Dialog & Modal states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteProductConfirm, setShowDeleteProductConfirm] = useState(false);
  const [productToDeleteId, setProductToDeleteId] = useState<string | null>(null);

  // Form states
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authAddress, setAuthAddress] = useState('');
  const [authError, setAuthError] = useState('');

  // Cart / Checkout form state
  const [checkoutAddress, setCheckoutAddress] = useState('');
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('COD');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Catalog products
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);

  // Admin states
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const [adminProducts, setAdminProducts] = useState<any[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [prodNameEn, setProdNameEn] = useState('');
  const [prodNameAr, setProdNameAr] = useState('');
  const [prodDescEn, setProdDescEn] = useState('');
  const [prodDescAr, setProdDescAr] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState('');
  const [prodIsAvailable, setProdIsAvailable] = useState(true);

  // Tracked order details for User Tracker page
  const [trackedOrderDetails, setTrackedOrderDetails] = useState<any>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);

  // Socket state
  const [socket, setSocket] = useState<Socket | null>(null);

  // Load Menu / Products on startup
  const fetchMenu = async () => {
    setIsLoadingMenu(true);
    try {
      const res = await fetch(`${API_BASE}/products/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setIsLoadingMenu(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  // Pre-fill user details in checkout form
  useEffect(() => {
    if (user) {
      setCheckoutAddress(user.address || '');
      setCheckoutPhone(user.phone || '');
    }
  }, [user]);

  // Connect WebSockets when trackedOrderId changes
  useEffect(() => {
    if (!trackedOrderId) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io(SOCKET_BASE);
    newSocket.on('connect', () => {
      console.log('Connected to socket server');
      newSocket.emit('track_order', { orderId: trackedOrderId });
    });

    newSocket.on('status_update', (data: { orderId: string; status: string }) => {
      console.log('Received WebSocket status update:', data);
      if (data.orderId === trackedOrderId) {
        setTrackedOrder(data.orderId, data.status);
        // Refresh details
        fetchOrderDetails(data.orderId);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [trackedOrderId]);

  // Fetch individual order details for tracking page
  const fetchOrderDetails = async (orderId: string) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTrackedOrderDetails(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (trackedOrderId && token) {
      fetchOrderDetails(trackedOrderId);
    }
  }, [trackedOrderId, token]);

  // Fetch active order for tracking state restoration on refresh / login
  const fetchActiveOrder = async () => {
    if (!token || !user || user.role === 'ADMIN') return;
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const orders = await res.json();
        setUserOrders(orders);
        // Find latest active order (i.e. status is not DELIVERED and not CANCELLED)
        const activeOrder = orders.find(
          (o: any) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
        );
        if (activeOrder && !trackedOrderId) {
          setTrackedOrder(activeOrder.id, activeOrder.status);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user active orders:', err);
    }
  };

  useEffect(() => {
    if (token && user) {
      fetchActiveOrder();
    }
  }, [token, user]);

  useEffect(() => {
    if (currentView === 'tracker' && token && user) {
      fetchActiveOrder();
    }
  }, [currentView, token, user]);

  // Fetch admin dashboard details
  const fetchAdminDashboard = async () => {
    if (user?.role !== 'ADMIN' || !token) return;
    try {
      // Fetch orders
      const ordersRes = await fetch(`${API_BASE}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (ordersRes.ok) {
        setAdminOrders(await ordersRes.json());
      }
      // Fetch products list directly
      const productsRes = await fetch(`${API_BASE}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (productsRes.ok) {
        setAdminProducts(await productsRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (currentView === 'admin') {
      fetchAdminDashboard();
    }
  }, [currentView, user, token]);

  // Handle Authentication submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const url = authMode === 'login' ? `${API_BASE}/auth/login` : `${API_BASE}/auth/signup`;
    const payload = authMode === 'login'
      ? { email: authEmail, password: authPassword }
      : { email: authEmail, password: authPassword, name: authName, phone: authPhone, address: authAddress };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.message || 'Authentication failed');
        return;
      }
      login(data.user, data.token);
      setShowAuthModal(false);
      // Reset forms
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
      setAuthPhone('');
      setAuthAddress('');
    } catch (err) {
      setAuthError('Connection error. Is NestJS backend running?');
    }
  };

  // Place Order Checkout
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError('');
    if (!token) {
      setShowAuthModal(true);
      return;
    }
    if (!checkoutAddress || !checkoutPhone) {
      setCheckoutError('Please enter address and phone number');
      return;
    }
    if (paymentMethod === 'ONLINE') {
      if (!cardNumber || !cardExpiry || !cardCvv) {
        setCheckoutError('Please enter card details');
        return;
      }
    }

    setIsSubmittingOrder(true);
    try {
      const payload = {
        paymentMethod,
        address: checkoutAddress,
        phone: checkoutPhone,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity
        }))
      };

      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data.message || 'Checkout failed');
        setIsSubmittingOrder(false);
        return;
      }

      // Success
      clearCart();
      setTrackedOrder(data.id, data.status);
      setView('tracker');
      // Reset checkout forms
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
    } catch (err) {
      setCheckoutError('Network error while placing order');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Add/Edit Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingProduct ? `${API_BASE}/products/${editingProduct.id}` : `${API_BASE}/products`;
    const method = editingProduct ? 'PUT' : 'POST';

    const payload = {
      nameEn: prodNameEn,
      nameAr: prodNameAr,
      descriptionEn: prodDescEn,
      descriptionAr: prodDescAr,
      price: parseFloat(prodPrice),
      imageUrl: prodImageUrl,
      categoryId: prodCategoryId,
      isAvailable: prodIsAvailable
    };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowProductModal(false);
        setEditingProduct(null);
        // Reset inputs
        setProdNameEn('');
        setProdNameAr('');
        setProdDescEn('');
        setProdDescAr('');
        setProdPrice('');
        setProdImageUrl('');
        setProdCategoryId('');
        setProdIsAvailable(true);
        // Refresh
        fetchAdminDashboard();
        fetchMenu();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Edit Button Action in Admin Dashboard
  const startEditProduct = (prod: any) => {
    setEditingProduct(prod);
    setProdNameEn(prod.nameEn);
    setProdNameAr(prod.nameAr);
    setProdDescEn(prod.descriptionEn);
    setProdDescAr(prod.descriptionAr);
    setProdPrice(prod.price.toString());
    setProdImageUrl(prod.imageUrl);
    setProdCategoryId(prod.categoryId);
    setProdIsAvailable(prod.isAvailable);
    setShowProductModal(true);
  };

  // Delete product action (triggers confirmation modal)
  const handleDeleteProduct = (id: string) => {
    setProductToDeleteId(id);
    setShowDeleteProductConfirm(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDeleteId) return;
    try {
      const res = await fetch(`${API_BASE}/products/${productToDeleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchAdminDashboard();
        fetchMenu();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setShowDeleteProductConfirm(false);
      setProductToDeleteId(null);
    }
  };

  // Update order status in Admin view
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchAdminDashboard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Memoized catalog computation
  const filteredProducts = useMemo(() => {
    let list: any[] = [];
    if (selectedCategory === 'all') {
      categories.forEach(cat => {
        list = [...list, ...cat.products];
      });
    } else {
      const found = categories.find(cat => cat.id === selectedCategory);
      if (found) list = found.products;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.nameEn.toLowerCase().includes(q) ||
        p.nameAr.includes(q) ||
        p.descriptionEn.toLowerCase().includes(q) ||
        p.descriptionAr.includes(q)
      );
    }
    return list;
  }, [categories, selectedCategory, searchQuery]);

  // General counts and sums
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  const cartItemsCount = useMemo(() => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  }, [cart]);

  // Admin metrics
  const adminMetrics = useMemo(() => {
    const totalSales = adminOrders
      .filter(o => o.paymentStatus === 'PAID' || o.status === 'DELIVERED')
      .reduce((sum, o) => sum + o.total, 0);
    const activeOrders = adminOrders.filter(
      o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
    ).length;
    return { totalSales, activeOrders, totalOrders: adminOrders.length };
  }, [adminOrders]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Navigation Header */}
      <header className="glass" style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setView('home')}>
          <Utensils style={{ color: 'var(--primary)', width: '28px', height: '28px' }} />
          <span style={{ fontSize: '22px', fontWeight: 800, background: 'linear-gradient(45deg, var(--primary), var(--primary-hover))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t('appName')}
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Dashboard link for admin */}
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => setView(currentView === 'admin' ? 'home' : 'admin')}
              className="btn-animate"
              style={{
                background: 'var(--primary-light)',
                border: 'none',
                color: 'var(--primary)',
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {currentView === 'admin' ? t('home') : t('adminPanel')}
            </button>
          )}

          {/* User Tracking button when logged in */}
          {user && user.role !== 'ADMIN' && (
            <button
              onClick={() => setView('tracker')}
              className="btn-animate"
              style={{
                border: '1px solid var(--primary)',
                background: 'transparent',
                color: 'var(--primary)',
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {t('trackOrderBtn')}
            </button>
          )}

          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="flex-center btn-animate"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              color: 'var(--text-main)'
            }}
            title={t('switchLanguage')}
          >
            <Globe style={{ width: '20px', height: '20px' }} />
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="flex-center btn-animate"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              color: 'var(--text-main)'
            }}
          >
            {theme === 'light' ? <Moon style={{ width: '20px', height: '20px' }} /> : <Sun style={{ width: '20px', height: '20px' }} />}
          </button>

          {/* Cart Icon Drawer Trigger */}
          <button
            onClick={() => setShowCartDrawer(true)}
            className="flex-center btn-animate"
            style={{
              background: 'var(--primary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 16px',
              cursor: 'pointer',
              color: '#fff',
              display: 'flex',
              gap: '8px',
              fontWeight: 600
            }}
          >
            <ShoppingBag style={{ width: '20px', height: '20px' }} />
            <span>{cartItemsCount}</span>
          </button>

          {/* Auth Session Button */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>{user.name}</span>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="flex-center btn-animate"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  cursor: 'pointer',
                  color: 'var(--danger)'
                }}
              >
                <LogOut style={{ width: '20px', height: '20px' }} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
              className="flex-center btn-animate"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                color: 'var(--text-main)'
              }}
            >
              <LogIn style={{ width: '20px', height: '20px' }} />
            </button>
          )}
        </div>
      </header>

      {/* Main Core Container */}
      <main style={{ flex: 1, padding: '24px' }}>

        {/* VIEW: HOME MENU CATALOG */}
        {currentView === 'home' && (
          <div>
            {/* Promo Banner */}
            <div style={{
              background: 'linear-gradient(135deg, hsl(24, 100%, 60%), hsl(15, 95%, 45%))',
              borderRadius: 'var(--radius-lg)',
              padding: '48px 32px',
              color: '#fff',
              marginBottom: '32px',
              boxShadow: 'var(--shadow-md)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ maxWidth: '600px', zIndex: 10, position: 'relative' }}>
                <h1 style={{ fontSize: '38px', fontWeight: 800, marginBottom: '16px' }}>
                  {language === 'en' ? 'Freshly Prepared Food, Delivered Instantly.' : 'طعام طازج، يصلك في أسرع وقت.'}
                </h1>
                <p style={{ fontSize: '16px', opacity: 0.9 }}>
                  {language === 'en' ? 'Choose from our premium menu selection. Order now and enjoy hot meals at your doorstep!' : 'اختر من قائمتنا المميزة. اطلب الآن واستمتع بالوجبات الساخنة عند باب بيتك!'}
                </p>
              </div>
            </div>

            {/* Catalog Toolbar */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px'
            }}>
              {/* Category Filter Pills */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                <button
                  onClick={() => setSelectedCategory('all')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid',
                    borderColor: selectedCategory === 'all' ? 'var(--primary)' : 'var(--border-color)',
                    background: selectedCategory === 'all' ? 'var(--primary)' : 'var(--bg-card)',
                    color: selectedCategory === 'all' ? '#fff' : 'var(--text-main)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {t('all')}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid',
                      borderColor: selectedCategory === cat.id ? 'var(--primary)' : 'var(--border-color)',
                      background: selectedCategory === cat.id ? 'var(--primary)' : 'var(--bg-card)',
                      color: selectedCategory === cat.id ? '#fff' : 'var(--text-main)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {language === 'en' ? cat.nameEn : cat.nameAr}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative', width: '300px' }}>
                <Search style={{
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  left: language === 'en' ? '12px' : 'auto',
                  right: language === 'ar' ? '12px' : 'auto',
                  width: '18px',
                  height: '18px',
                  color: 'var(--text-muted)'
                }} />
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    paddingLeft: language === 'en' ? '38px' : '16px',
                    paddingRight: language === 'ar' ? '38px' : '16px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
            </div>

            {/* Menu Grid */}
            {isLoadingMenu ? (
              <div className="flex-center" style={{ minHeight: '200px' }}>
                <span>{t('loading')}</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex-center" style={{ minHeight: '200px', flexDirection: 'column', gap: '8px' }}>
                <span>{t('noProducts')}</span>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '24px'
              }}>
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="card-hover"
                    style={{
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      opacity: product.isAvailable ? 1 : 0.6
                    }}
                  >
                    {/* Product Image */}
                    <div style={{ width: '100%', height: '180px', position: 'relative', overflow: 'hidden' }}>
                      <img
                        src={product.imageUrl}
                        alt={product.nameEn}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {!product.isAvailable && (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700
                        }}>
                          {language === 'en' ? 'Unavailable' : 'غير متوفر'}
                        </div>
                      )}
                    </div>

                    {/* Product Body */}
                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                          {language === 'en' ? product.nameEn : product.nameAr}
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.4 }}>
                          {language === 'en' ? product.descriptionEn : product.descriptionAr}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                        <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>
                          {product.price} {t('currency')}
                        </span>

                        <button
                          disabled={!product.isAvailable}
                          onClick={() => addToCart(product)}
                          className="btn-animate"
                          style={{
                            background: 'var(--primary)',
                            border: 'none',
                            color: '#fff',
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {t('addToCart')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW: CART CHECKOUT VIEW */}
        {currentView === 'cart' && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '24px' }}>{t('checkout')}</h2>

            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <ShoppingBag style={{ width: '48px', height: '48px', color: 'var(--text-muted)', marginBottom: '16px' }} />
                <p>{t('emptyCart')}</p>
                <button
                  onClick={() => setView('home')}
                  style={{
                    marginTop: '16px',
                    background: 'var(--primary)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  {t('home')}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Cart list summary */}
                <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>{t('orderSummary')}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {cart.map((item) => (
                      <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontWeight: 600 }}>{language === 'en' ? item.product.nameEn : item.product.nameAr}</p>
                          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                            {item.quantity} x {item.product.price} {t('currency')}
                          </p>
                        </div>
                        <span style={{ fontWeight: 700 }}>
                          {(item.product.price * item.quantity).toFixed(2)} {t('currency')}
                        </span>
                      </div>
                    ))}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '18px' }}>
                      <span>{t('total')}</span>
                      <span>{cartTotal.toFixed(2)} {t('currency')}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Form & Payment Options */}
                <form onSubmit={handlePlaceOrder} style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{language === 'en' ? 'Delivery Details' : 'تفاصيل التوصيل'}</h3>

                  {/* Address input */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>{t('address')} *</label>
                    <div style={{ position: 'relative' }}>
                      <MapPin style={{ position: 'absolute', top: '12px', left: '12px', width: '18px', height: '18px', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        required
                        value={checkoutAddress}
                        onChange={(e) => setCheckoutAddress(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 16px 10px 38px',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-app)',
                          color: 'var(--text-main)'
                        }}
                      />
                    </div>
                  </div>

                  {/* Phone input */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>{t('phone')} *</label>
                    <div style={{ position: 'relative' }}>
                      <Phone style={{ position: 'absolute', top: '12px', left: '12px', width: '18px', height: '18px', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        required
                        value={checkoutPhone}
                        onChange={(e) => setCheckoutPhone(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 16px 10px 38px',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-app)',
                          color: 'var(--text-main)'
                        }}
                      />
                    </div>
                  </div>

                  {/* Payment selector */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>{t('paymentMethod')}</label>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <label style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid',
                        borderColor: paymentMethod === 'COD' ? 'var(--primary)' : 'var(--border-color)',
                        background: paymentMethod === 'COD' ? 'var(--primary-light)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="radio"
                          name="payment"
                          checked={paymentMethod === 'COD'}
                          onChange={() => setPaymentMethod('COD')}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <span>{t('cod')}</span>
                      </label>

                      <label style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid',
                        borderColor: paymentMethod === 'ONLINE' ? 'var(--primary)' : 'var(--border-color)',
                        background: paymentMethod === 'ONLINE' ? 'var(--primary-light)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="radio"
                          name="payment"
                          checked={paymentMethod === 'ONLINE'}
                          onChange={() => setPaymentMethod('ONLINE')}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <span>{t('onlineCard')}</span>
                      </label>
                    </div>
                  </div>

                  {/* CARD PAYMENT MOCK VIEW */}
                  {paymentMethod === 'ONLINE' && (
                    <div style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CreditCard style={{ color: 'var(--primary)' }} />
                        <span style={{ fontWeight: 600 }}>{t('paymentDetails')}</span>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{t('cardNumber')}</label>
                        <input
                          type="text"
                          placeholder="4000 1234 5678 9010"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-card)',
                            color: 'var(--text-main)'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{t('expiryDate')}</label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-card)',
                              color: 'var(--text-main)'
                            }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{t('cvv')}</label>
                          <input
                            type="text"
                            placeholder="123"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-card)',
                              color: 'var(--text-main)'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {checkoutError && (
                    <span style={{ color: 'var(--danger)', fontSize: '14px', fontWeight: 600 }}>{checkoutError}</span>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmittingOrder}
                    className="btn-animate"
                    style={{
                      background: 'var(--primary)',
                      border: 'none',
                      color: '#fff',
                      padding: '12px',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '16px',
                      marginTop: '12px'
                    }}
                  >
                    {isSubmittingOrder ? t('updating') : paymentMethod === 'ONLINE' ? t('payAndOrder') : t('placeOrder')}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* VIEW: ORDER STATUS TRACKER / MY ORDERS */}
        {currentView === 'tracker' && (
          <div style={{ maxWidth: '750px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {!trackedOrderId ? (
              // Case A: Show All User Orders
              <div style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
                <h2 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '24px', textAlign: 'center' }}>
                  {language === 'en' ? 'My Orders & Tracking' : 'طلباتي وتتبعها'}
                </h2>

                {userOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                    <p>{language === 'en' ? "You haven't placed any orders yet." : "لم تقم بتقديم أي طلبات حتى الآن."}</p>
                    <button
                      onClick={() => setView('home')}
                      style={{
                        marginTop: '16px',
                        background: 'var(--primary)',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      {t('home')}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {userOrders.map((order) => {
                      // Status color mapping
                      let badgeBg = 'var(--bg-app)';
                      let badgeColor = 'var(--text-muted)';
                      let statusText = order.status;

                      if (order.status === 'PENDING') {
                        badgeBg = 'rgba(249, 115, 22, 0.1)';
                        badgeColor = 'rgb(249, 115, 22)';
                        statusText = t('statusPending');
                      } else if (order.status === 'PREPARING') {
                        badgeBg = 'rgba(59, 130, 246, 0.1)';
                        badgeColor = 'rgb(59, 130, 246)';
                        statusText = t('statusPreparing');
                      } else if (order.status === 'SHIPPED') {
                        badgeBg = 'rgba(168, 85, 247, 0.1)';
                        badgeColor = 'rgb(168, 85, 247)';
                        statusText = t('statusShipped');
                      } else if (order.status === 'DELIVERED') {
                        badgeBg = 'var(--success-light)';
                        badgeColor = 'var(--success)';
                        statusText = t('statusDelivered');
                      } else if (order.status === 'CANCELLED') {
                        badgeBg = 'rgba(239, 68, 68, 0.1)';
                        badgeColor = 'var(--danger)';
                        statusText = t('statusCancelled');
                      }

                      const date = new Date(order.createdAt).toLocaleDateString(
                        language === 'ar' ? 'ar-EG' : 'en-US',
                        { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                      );

                      return (
                        <div
                          key={order.id}
                          style={{
                            background: 'var(--bg-app)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                              <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block' }}>{date}</span>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '14px' }}>#{order.id.slice(0, 8)}...</span>
                            </div>
                            <span
                              style={{
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 700,
                                background: badgeBg,
                                color: badgeColor
                              }}
                            >
                              {statusText}
                            </span>
                          </div>

                          <div style={{ borderTop: '1px dashed var(--border-color)', borderBottom: '1px dashed var(--border-color)', padding: '10px 0', fontSize: '14px' }}>
                            {order.items?.map((item: any) => (
                              <div key={item.id} style={{ color: 'var(--text-main)', margin: '4px 0' }}>
                                • {language === 'en' ? item.product?.nameEn : item.product?.nameAr} (x{item.quantity})
                              </div>
                            ))}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, fontSize: '16px' }}>
                              {t('total')}: {order.total.toFixed(2)} {t('currency')}
                            </span>
                            <button
                              onClick={() => setTrackedOrder(order.id, order.status)}
                              className="btn-animate"
                              style={{
                                background: 'var(--primary)',
                                color: '#fff',
                                border: 'none',
                                padding: '6px 14px',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '13px'
                              }}
                            >
                              {language === 'en' ? 'Track Live' : 'تتبع مباشر'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              // Case B: Show Visual Stepper for Tracked Order
              <div style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <button
                    onClick={() => setTrackedOrder(null, null)}
                    style={{
                      background: 'transparent',
                      color: 'var(--primary)',
                      border: '1px solid var(--primary)',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '13px'
                    }}
                  >
                    {language === 'en' ? '← Back to Orders' : '← العودة للطلبات'}
                  </button>
                  <h2 style={{ fontSize: '22px', fontWeight: 800 }}>
                    {t('orderTracking')}
                  </h2>
                </div>

                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px' }}>
                  {t('orderId')}: <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '15px' }}>{trackedOrderId}</span>
                </p>

                {/* Real-time Visual Stepper */}
                {trackedOrderStatus && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Step 1: Pending */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                      <div className="flex-center" style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: ['PENDING', 'PREPARING', 'SHIPPED', 'DELIVERED'].includes(trackedOrderStatus) ? 'var(--success)' : 'var(--border-color)',
                        background: ['PENDING', 'PREPARING', 'SHIPPED', 'DELIVERED'].includes(trackedOrderStatus) ? 'var(--success-light)' : 'transparent',
                        color: ['PENDING', 'PREPARING', 'SHIPPED', 'DELIVERED'].includes(trackedOrderStatus) ? 'var(--success)' : 'var(--text-muted)',
                        fontWeight: 700
                      }}>
                        <Clock style={{ width: '18px', height: '18px' }} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: 700 }}>{t('statusPending')}</h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                          {language === 'en' ? 'We have received your order request.' : 'لقد استلمنا طلبك وبانتظار التأكيد.'}
                        </p>
                      </div>
                    </div>

                    {/* Step 2: Preparing */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                      <div className="flex-center" style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: ['PREPARING', 'SHIPPED', 'DELIVERED'].includes(trackedOrderStatus) ? 'var(--success)' : 'var(--border-color)',
                        background: ['PREPARING', 'SHIPPED', 'DELIVERED'].includes(trackedOrderStatus) ? 'var(--success-light)' : 'transparent',
                        color: ['PREPARING', 'SHIPPED', 'DELIVERED'].includes(trackedOrderStatus) ? 'var(--success)' : 'var(--text-muted)',
                        fontWeight: 700
                      }}>
                        <Utensils style={{ width: '18px', height: '18px' }} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: 700 }}>{t('statusPreparing')}</h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                          {language === 'en' ? 'Our kitchen crew is currently prepping your dish.' : 'طاقم المطبخ لدينا يقوم الآن بتحضير وجبتك.'}
                        </p>
                      </div>
                    </div>

                    {/* Step 3: Shipped / Out for Delivery */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                      <div className="flex-center" style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: ['SHIPPED', 'DELIVERED'].includes(trackedOrderStatus) ? 'var(--success)' : 'var(--border-color)',
                        background: ['SHIPPED', 'DELIVERED'].includes(trackedOrderStatus) ? 'var(--success-light)' : 'transparent',
                        color: ['SHIPPED', 'DELIVERED'].includes(trackedOrderStatus) ? 'var(--success)' : 'var(--text-muted)',
                        fontWeight: 700
                      }}>
                        <Truck style={{ width: '18px', height: '18px' }} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: 700 }}>{t('statusShipped')}</h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                          {language === 'en' ? 'Your food is hot and with our courier.' : 'طعامك ساخن ومع مندوب التوصيل في طريقه إليك.'}
                        </p>
                      </div>
                    </div>

                    {/* Step 4: Delivered */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                      <div className="flex-center" style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: trackedOrderStatus === 'DELIVERED' ? 'var(--success)' : 'var(--border-color)',
                        background: trackedOrderStatus === 'DELIVERED' ? 'var(--success-light)' : 'transparent',
                        color: trackedOrderStatus === 'DELIVERED' ? 'var(--success)' : 'var(--text-muted)',
                        fontWeight: 700
                      }}>
                        <CheckCircle style={{ width: '18px', height: '18px' }} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: 700 }}>{t('statusDelivered')}</h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                          {language === 'en' ? 'Enjoy your meal! Thank you for ordering.' : 'بالهناء والشفاء! شكراً لطلبك.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cancelled state */}
                {trackedOrderStatus === 'CANCELLED' && (
                  <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', textAlign: 'center', fontWeight: 600 }}>
                    {language === 'en' ? 'This order was cancelled by the administration.' : 'تم إلغاء هذا الطلب بواسطة الإدارة.'}
                  </div>
                )}

                {/* Order details sub-summary */}
                {trackedOrderDetails && (
                  <div style={{ marginTop: '32px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>{t('orderSummary')}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                      {trackedOrderDetails.items?.map((item: any) => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{language === 'en' ? item.product?.nameEn : item.product?.nameAr} (x{item.quantity})</span>
                          <span>{(item.price * item.quantity).toFixed(2)} {t('currency')}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '16px', borderTop: '1px dashed var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
                        <span>{t('total')}</span>
                        <span>{trackedOrderDetails.total.toFixed(2)} {t('currency')}</span>
                      </div>

                      <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        <p><strong>{t('address')}:</strong> {trackedOrderDetails.address}</p>
                        <p><strong>{t('phone')}:</strong> {trackedOrderDetails.phone}</p>
                        <p><strong>{t('paymentMethod')}:</strong> {trackedOrderDetails.paymentMethod === 'ONLINE' ? t('onlineCard') : t('cod')}</p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setTrackedOrder(null, null)}
                  style={{
                    marginTop: '32px',
                    width: '100%',
                    background: 'var(--bg-app)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  {language === 'en' ? 'Back to My Orders' : 'العودة لطلباتي'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW: ADMIN DASHBOARD */}
        {currentView === 'admin' && user?.role === 'ADMIN' && (
          <div>
            <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '24px' }}>{t('adminPanel')}</h2>

            {/* Analytics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '32px'
            }}>
              <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '12px', borderRadius: '50%' }}>
                  <DollarSign />
                </div>
                <div>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t('totalSales')}</p>
                  <p style={{ fontSize: '22px', fontWeight: 800 }}>{adminMetrics.totalSales.toFixed(2)} {t('currency')}</p>
                </div>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '12px', borderRadius: '50%' }}>
                  <Clock />
                </div>
                <div>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t('activeOrders')}</p>
                  <p style={{ fontSize: '22px', fontWeight: 800 }}>{adminMetrics.activeOrders}</p>
                </div>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'var(--border-color)', color: 'var(--text-main)', padding: '12px', borderRadius: '50%' }}>
                  <Package />
                </div>
                <div>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{language === 'en' ? 'Total Orders' : 'مجموع الطلبات'}</p>
                  <p style={{ fontSize: '22px', fontWeight: 800 }}>{adminMetrics.totalOrders}</p>
                </div>
              </div>
            </div>

            {/* Dashboard Sections Tab */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

              {/* SECTION: ORDERS MONITORING */}
              <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>{t('orders')}</h3>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: language === 'en' ? 'left' : 'right' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '12px' }}>{t('orderId')}</th>
                        <th style={{ padding: '12px' }}>{t('name')}</th>
                        <th style={{ padding: '12px' }}>{t('total')}</th>
                        <th style={{ padding: '12px' }}>{t('paymentMethod')}</th>
                        <th style={{ padding: '12px' }}>{t('orderStatus')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminOrders.map((order) => (
                        <tr key={order.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px' }}>{order.id.slice(0, 8)}...</td>
                          <td style={{ padding: '12px' }}>{order.user?.name}</td>
                          <td style={{ padding: '12px', fontWeight: 700 }}>{order.total.toFixed(2)} $</td>
                          <td style={{ padding: '12px', fontSize: '13px' }}>
                            {order.paymentMethod === 'ONLINE' ? t('onlineCard') : t('cod')}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <select
                              value={order.status}
                              onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                              style={{
                                padding: '6px 12px',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-app)',
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                            >
                              <option value="PENDING">{t('statusPending')}</option>
                              <option value="PREPARING">{t('statusPreparing')}</option>
                              <option value="SHIPPED">{t('statusShipped')}</option>
                              <option value="DELIVERED">{t('statusDelivered')}</option>
                              <option value="CANCELLED">{t('statusCancelled')}</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION: PRODUCT CATALOG MANAGEMENT */}
              <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 700 }}>{t('products')}</h3>
                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setProdNameEn('');
                      setProdNameAr('');
                      setProdDescEn('');
                      setProdDescAr('');
                      setProdPrice('');
                      setProdImageUrl('');
                      setProdCategoryId(categories[0]?.id || '');
                      setProdIsAvailable(true);
                      setShowProductModal(true);
                    }}
                    className="btn-animate"
                    style={{
                      background: 'var(--primary)',
                      border: 'none',
                      color: '#fff',
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <PlusCircle style={{ width: '18px', height: '18px' }} />
                    <span>{t('addMenuItem')}</span>
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '16px' }}>
                  {adminProducts.map((prod) => (
                    <div key={prod.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)' }}>
                      <img src={prod.imageUrl} alt={prod.nameEn} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600 }}>{language === 'en' ? prod.nameEn : prod.nameAr}</p>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{prod.price} $</p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => startEditProduct(prod)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            padding: '6px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: 'var(--text-main)'
                          }}
                        >
                          <Edit2 style={{ width: '16px', height: '16px' }} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod.id)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            padding: '6px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: 'var(--danger)'
                          }}
                        >
                          <Trash2 style={{ width: '16px', height: '16px' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="glass" style={{ borderTop: '1px solid var(--border-color)', padding: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)', marginTop: 'auto' }}>
        <p>&copy; 2026 {t('appName')}. {language === 'en' ? 'All rights reserved.' : 'جميع الحقوق محفوظة.'}</p>
      </footer>

      {/* MODAL: AUTHENTICATION (LOGIN / SIGNUP) */}
      {showAuthModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} className="flex-center">
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '32px', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
            <button
              onClick={() => setShowAuthModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X style={{ width: '20px', height: '20px' }} />
            </button>

            <h2 style={{ fontSize: '24px', fontWeight: 800 }}>{authMode === 'login' ? t('login') : t('signup')}</h2>

            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {authMode === 'signup' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{t('name')}</label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'var(--text-main)' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{t('email')}</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{t('password')}</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'var(--text-main)' }}
                />
              </div>

              {authMode === 'signup' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{t('phone')}</label>
                    <input
                      type="text"
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'var(--text-main)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{t('address')}</label>
                    <input
                      type="text"
                      value={authAddress}
                      onChange={(e) => setAuthAddress(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'var(--text-main)' }}
                    />
                  </div>
                </>
              )}

              {authError && (
                <span style={{ color: 'var(--danger)', fontSize: '13px', fontWeight: 600 }}>{authError}</span>
              )}

              <button
                type="submit"
                className="btn-animate"
                style={{ background: 'var(--primary)', border: 'none', color: '#fff', padding: '10px', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}
              >
                {authMode === 'login' ? t('login') : t('signup')}
              </button>
            </form>

            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
            >
              {authMode === 'login' ? t('dontHaveAccount') : t('alreadyHaveAccount')}
            </button>
          </div>
        </div>
      )}

      {/* DRAWER: SHOPPING CART */}
      {showCartDrawer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div style={{
            position: 'fixed',
            top: 0,
            bottom: 0,
            right: language === 'en' ? 0 : 'auto',
            left: language === 'ar' ? 0 : 'auto',
            width: '100%',
            maxWidth: '400px',
            background: 'var(--bg-card)',
            borderLeft: language === 'en' ? '1px solid var(--border-color)' : 'none',
            borderRight: language === 'ar' ? '1px solid var(--border-color)' : 'none',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800 }}>{t('cart')}</h3>
              <button
                onClick={() => setShowCartDrawer(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X style={{ width: '24px', height: '24px' }} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cart.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '32px' }}>{t('emptyCart')}</p>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                    <img src={item.product.imageUrl} alt={item.product.nameEn} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: '14px' }}>
                        {language === 'en' ? item.product.nameEn : item.product.nameAr}
                      </p>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {item.product.price} {t('currency')}
                      </p>
                    </div>
                    {/* Quantity controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 4px' }}>
                      <button
                        onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <Minus style={{ width: '14px', height: '14px' }} />
                      </button>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <Plus style={{ width: '14px', height: '14px' }} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                    >
                      <Trash2 style={{ width: '18px', height: '18px' }} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '18px' }}>
                  <span>{t('total')}</span>
                  <span>{cartTotal.toFixed(2)} {t('currency')}</span>
                </div>
                <button
                  onClick={() => { setShowCartDrawer(false); setView('cart'); }}
                  style={{
                    width: '100%',
                    background: 'var(--primary)',
                    color: '#fff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '16px',
                    textAlign: 'center'
                  }}
                >
                  {t('checkout')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADMIN ADD/EDIT PRODUCT */}
      {showProductModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} className="flex-center">
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '32px', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button
              onClick={() => { setShowProductModal(false); setEditingProduct(null); }}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X style={{ width: '20px', height: '20px' }} />
            </button>

            <h2 style={{ fontSize: '22px', fontWeight: 800 }}>
              {editingProduct ? t('edit') : t('addMenuItem')}
            </h2>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{t('productNameEn')} *</label>
                <input
                  type="text"
                  required
                  value={prodNameEn}
                  onChange={(e) => setProdNameEn(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{t('productNameAr')} *</label>
                <input
                  type="text"
                  required
                  value={prodNameAr}
                  onChange={(e) => setProdNameAr(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{t('descriptionEn')} *</label>
                <textarea
                  required
                  value={prodDescEn}
                  onChange={(e) => setProdDescEn(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'var(--text-main)', minHeight: '60px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{t('descriptionAr')} *</label>
                <textarea
                  required
                  value={prodDescAr}
                  onChange={(e) => setProdDescAr(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'var(--text-main)', minHeight: '60px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{t('price')} *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{t('imageUrl')} *</label>
                <input
                  type="text"
                  required
                  value={prodImageUrl}
                  onChange={(e) => setProdImageUrl(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{t('category')} *</label>
                <select
                  required
                  value={prodCategoryId}
                  onChange={(e) => setProdCategoryId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', color: 'var(--text-main)' }}
                >
                  <option value="" disabled>Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {language === 'en' ? cat.nameEn : cat.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="prodIsAvailable"
                  checked={prodIsAvailable}
                  onChange={(e) => setProdIsAvailable(e.target.checked)}
                  style={{ accentColor: 'var(--primary)' }}
                />
                <label htmlFor="prodIsAvailable" style={{ fontSize: '14px', fontWeight: 600 }}>
                  {language === 'en' ? 'Product is Available' : 'المنتج متوفر'}
                </label>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => { setShowProductModal(false); setEditingProduct(null); }}
                  style={{ flex: 1, padding: '10px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOGOUT CONFIRMATION */}
      {showLogoutConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} className="flex-center">
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '32px', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', textAlign: 'center' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800 }}>
              {language === 'en' ? 'Confirm Logout' : 'تأكيد تسجيل الخروج'}
            </h3>
            <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
              {language === 'en' ? 'Are you sure you want to log out of your account?' : 'هل أنت متأكد أنك تريد تسجيل الخروج من حسابك؟'}
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1,
                  background: 'var(--bg-app)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {language === 'en' ? 'Cancel' : 'إلغاء'}
              </button>
              <button
                onClick={() => {
                  logout();
                  setShowLogoutConfirm(false);
                }}
                style={{
                  flex: 1,
                  background: 'var(--danger)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {language === 'en' ? 'Logout' : 'تسجيل الخروج'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeleteProductConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} className="flex-center">
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '32px', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', textAlign: 'center' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800 }}>
              {language === 'en' ? 'Delete Product' : 'حذف المنتج'}
            </h3>
            <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
              {language === 'en' ? 'Are you sure you want to delete this product?' : 'هل أنت متأكد أنك تريد حذف هذا المنتج؟'}
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={() => {
                  setShowDeleteProductConfirm(false);
                  setProductToDeleteId(null);
                }}
                style={{
                  flex: 1,
                  background: 'var(--bg-app)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {language === 'en' ? 'Cancel' : 'إلغاء'}
              </button>
              <button
                onClick={confirmDeleteProduct}
                style={{
                  flex: 1,
                  background: 'var(--danger)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {language === 'en' ? 'Delete' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
