import { createContext, useContext, useState, useCallback, useMemo } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)

  const add = useCallback((dish) => {
    setItems((prev) => {
      const found = prev.find((i) => i.id === dish.id)
      if (found) return prev.map((i) => (i.id === dish.id ? { ...i, qty: i.qty + 1 } : i))
      return [...prev, { id: dish.id, name: dish.name, price: dish.price, img: dish.img, qty: 1 }]
    })
    setOpen(true)
  }, [])

  const inc = useCallback((id) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)))
  }, [])

  const dec = useCallback((id) => {
    setItems((prev) =>
      prev.flatMap((i) => (i.id === id ? (i.qty > 1 ? [{ ...i, qty: i.qty - 1 }] : []) : [i]))
    )
  }, [])

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items])
  const total = useMemo(() => items.reduce((s, i) => s + i.qty * i.price, 0), [items])

  const value = { items, open, setOpen, add, inc, dec, remove, clear, count, total }
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
