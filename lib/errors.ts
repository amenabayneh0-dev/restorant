const MESSAGES: Record<string, string> = {
  RESTAURANT_NOT_ACCEPTING: "We're not taking orders right now. Please try again later.",
  FULFILLMENT_DISABLED: "That way of receiving your order isn't available. Choose another.",
  ADDRESS_REQUIRED: "Enter a delivery address.",
  ITEM_UNAVAILABLE: "One of the items in your cart is no longer available. Remove it and try again.",
  INVALID_OPTION: "One of your extras is no longer available. Review your cart and try again.",
  INVALID_QUANTITY: "One of the quantities is not valid.",
  INVALID_ITEMS: "Your cart is empty or too large.",
  TOO_MANY_ORDERS: "You've placed several orders in a short time. Please wait a few minutes or call the restaurant.",
};

export function friendlyOrderError(message?: string): string {
  const code = Object.keys(MESSAGES).find((c) => message?.includes(c));
  return code ? MESSAGES[code] : "We couldn't place your order. Please try again.";
}
