"use client";
import { useSyncExternalStore } from "react";
import { addLine, reconcileCart, sanitizeCart, setQuantity, type CartLine, type MenuSnapshot } from "./cart";

const KEY = "menuflow-cart-v1";
const EMPTY: CartLine[] = [];
let cart: CartLine[] = EMPTY;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch {} };
const emit = () => { save(); notify(); };

export const cartActions = {
  /** Load the saved cart, then check it against the live menu. Returns messages about anything that changed. */
  hydrate(menu?: MenuSnapshot): string[] {
    let notes: string[] = [];
    try {
      cart = sanitizeCart(JSON.parse(localStorage.getItem(KEY) || "[]"));
      if (menu) { const r = reconcileCart(cart, menu); cart = r.cart; notes = r.notes; }
      save();
    } catch { cart = EMPTY; }
    notify();
    return notes;
  },
  add(line: Omit<CartLine, "key">) { cart = addLine(cart, line); emit(); },
  setQty(key: string, q: number) { cart = setQuantity(cart, key, q); emit(); },
  clear() { cart = EMPTY; emit(); },
};
export const useCart = () =>
  useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => cart, () => EMPTY);
