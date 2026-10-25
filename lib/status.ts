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

// What each staff role may do next. Mirrors change_order_status() in the database, which is the real enforcer;
// this only decides which buttons to show.
export type StaffRole = "admin" | "counter" | "kitchen";
type Action = { to: string; label: string; roles: StaffRole[] };
const ALL: StaffRole[] = ["admin", "counter", "kitchen"];
const FRONT: StaffRole[] = ["admin", "counter"];
const CANCEL: Action = { to: "cancelled", label: "Cancel order", roles: FRONT };
export const ACTIONS: Record<string, Action[]> = {
  pending: [{ to: "accepted", label: "Accept", roles: FRONT }, { to: "rejected", label: "Decline", roles: FRONT }],
  accepted: [{ to: "preparing", label: "Start preparing", roles: ALL }, CANCEL],
  preparing: [{ to: "ready", label: "Mark ready", roles: ALL }, CANCEL],
  ready: [{ to: "completed", label: "Complete", roles: FRONT }, CANCEL],
};
export const actionsFor = (status: string, role: StaffRole) => (ACTIONS[status] ?? []).filter((a) => a.roles.includes(role));
