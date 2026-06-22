import { create } from 'zustand';
import i18n from '../i18n';

export interface CartItem {
  product: {
    id: string;
    nameEn: string;
    nameAr: string;
    price: number;
    imageUrl: string;
  };
  quantity: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  phone?: string;
  address?: string;
}

export type ViewType = 'home' | 'cart' | 'tracker' | 'admin' | 'orders';

interface AppState {
  // Theme & Language
  theme: 'light' | 'dark';
  language: 'en' | 'ar';
  toggleTheme: () => void;
  setLanguage: (lang: 'en' | 'ar') => void;

  // Navigation
  currentView: ViewType;
  setView: (view: ViewType) => void;

  // Authentication
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: any) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;

  // Order Tracking
  trackedOrderId: string | null;
  trackedOrderStatus: string | null;
  setTrackedOrder: (orderId: string | null, status: string | null) => void;
}

export const useStore = create<AppState>((set, get) => {
  // Initialize from LocalStorage if available
  const storedToken = localStorage.getItem('food_token');
  const storedUser = localStorage.getItem('food_user')
    ? JSON.parse(localStorage.getItem('food_user')!)
    : null;
  const storedLanguage = (localStorage.getItem('food_lang') || 'en') as 'en' | 'ar';
  const storedTheme = (localStorage.getItem('food_theme') || 'light') as 'light' | 'dark';

  // Apply initial language and theme settings
  i18n.changeLanguage(storedLanguage);
  document.documentElement.dir = storedLanguage === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('data-theme', storedTheme);

  return {
    theme: storedTheme,
    language: storedLanguage,
    toggleTheme: () => {
      const nextTheme = get().theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('food_theme', nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
      set({ theme: nextTheme });
    },
    setLanguage: (lang) => {
      localStorage.setItem('food_lang', lang);
      i18n.changeLanguage(lang);
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      set({ language: lang });
    },

    currentView: 'home',
    setView: (view) => set({ currentView: view }),

    user: storedUser,
    token: storedToken,
    login: (user, token) => {
      localStorage.setItem('food_token', token);
      localStorage.setItem('food_user', JSON.stringify(user));
      set({ user, token });
    },
    logout: () => {
      localStorage.removeItem('food_token');
      localStorage.removeItem('food_user');
      set({ user: null, token: null, currentView: 'home', trackedOrderId: null, trackedOrderStatus: null });
    },

    cart: [],
    addToCart: (product) => {
      const currentCart = get().cart;
      const existing = currentCart.find((item) => item.product.id === product.id);
      if (existing) {
        set({
          cart: currentCart.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        });
      } else {
        set({ cart: [...currentCart, { product, quantity: 1 }] });
      }
    },
    removeFromCart: (productId) => {
      set({ cart: get().cart.filter((item) => item.product.id !== productId) });
    },
    updateCartQuantity: (productId, quantity) => {
      if (quantity <= 0) {
        get().removeFromCart(productId);
        return;
      }
      set({
        cart: get().cart.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        ),
      });
    },
    clearCart: () => set({ cart: [] }),

    trackedOrderId: null,
    trackedOrderStatus: null,
    setTrackedOrder: (orderId, status) => set({ trackedOrderId: orderId, trackedOrderStatus: status }),
  };
});
