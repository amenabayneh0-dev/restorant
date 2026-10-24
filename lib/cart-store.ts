"use client";
import { useSyncExternalStore } from "react";
import { addLine, setQuantity, type CartLine } from "./cart";

const KEY = "menuflow-cart-v1";
const EMPTY: CartLine[] = [];
let cart: CartLine[] = EMPTY;
const listeners = new Set<() => void>();
const emit = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch {} listeners.forEach((l) => l()); };

export const cartActions = {
  hydrate() { try { const raw = JSON.parse(localStorage.getItem(KEY) || "[]"); if (Array.isArray(raw)) { cart = raw; listeners.forEach((l) => l()); } } catch {} },
  add(line: Omit<CartLine, "key">) { cart = addLine(cart, line); emit(); },
  setQty(key: string, q: number) { cart = setQuantity(cart, key, q); emit(); },
  clear() { cart = EMPTY; emit(); },
};
export const useCart = () =>
  useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => cart, () => EMPTY);
