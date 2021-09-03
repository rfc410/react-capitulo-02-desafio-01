import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: productToAdd } = await api.get(`/products/${productId}`);
      const { data: productToAddStock } = await api.get(`/stock/${productId}`);

      if (cart.every((product) => product.id !== productId)) {
        const updatedCart = [...cart, { ...productToAdd, amount: 1 }];
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        setCart(updatedCart);
        return;
      } else {
        // Checar
        const productInTheCart =
          cart.find((product) => product.id === productId) ?? { amount: 0 }
        if (productInTheCart.amount + 1 > productToAddStock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const updatedCart = cart.map((product) => {
          if (product.id === productId) {
            const amount = product.amount + 1;
            return { ...product, amount };
          }
          return product;
        })
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        setCart(updatedCart);
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      // Checar
      if (!cart.some((product) => product.id === productId)) {
        throw new Error('Isso aqui não faz sentido.');
      }

      const updatedCart = cart.filter((product) => product.id !== productId);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      setCart(updatedCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        return;
      }
      const { data: productToAddStock } = await api.get(`/stock/${productId}`);

      if (amount > productToAddStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = cart.map((product) => {
        if (product.id === productId) {
          return { ...product, amount };
        }
        return product;
      });
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      setCart(updatedCart);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
