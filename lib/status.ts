export const STEPS = ["pending", "accepted", "preparing", "ready", "completed"] as const;
export const LABEL: Record<string, string> = {
  pending: "Order received", accepted: "Accepted", preparing: "Being prepared",
  ready: "Ready", completed: "Completed", rejected: "Declined", cancelled: "Cancelled",
};
export const HINT: Record<string, string> = {
  pending: "The restaurant will confirm your order shortly.",
  accepted: "Your order is confirmed.", preparing: "The kitchen is cooking your food.",
  ready: "Your order is ready.", completed: "Thank you for ordering.",
  rejected: "The restaurant couldn't accept this order. Please call them.",
  cancelled: "This order was cancelled. Please call the restaurant if you have questions.",
};
export const stepIndex = (status: string) => STEPS.indexOf(status as (typeof STEPS)[number]);
export const isFinal = (status: string) => ["completed", "rejected", "cancelled"].includes(status);
