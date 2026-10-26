// UI mirror of the database rules in change_order_status(). The database is the real gatekeeper.
export type Role = "admin" | "counter" | "kitchen";
export type Action = { to: string; label: string; tone: "primary" | "danger"; roles: Role[] };
const FRONT: Role[] = ["admin", "counter"];
const ALL: Role[] = ["admin", "counter", "kitchen"];

const MAP: Record<string, Action[]> = {
  pending: [{ to: "accepted", label: "Accept", tone: "primary", roles: FRONT }, { to: "rejected", label: "Reject", tone: "danger", roles: FRONT }],
  accepted: [{ to: "preparing", label: "Start preparing", tone: "primary", roles: ALL }, { to: "cancelled", label: "Cancel", tone: "danger", roles: FRONT }],
  preparing: [{ to: "ready", label: "Mark ready", tone: "primary", roles: ALL }, { to: "cancelled", label: "Cancel", tone: "danger", roles: FRONT }],
  ready: [{ to: "completed", label: "Complete", tone: "primary", roles: FRONT }, { to: "cancelled", label: "Cancel", tone: "danger", roles: FRONT }],
};
export const actionsFor = (status: string, role: Role) => (MAP[status] ?? []).filter((a) => a.roles.includes(role));
export const visibleStatuses = (role: Role) => (role === "kitchen" ? ["accepted", "preparing", "ready"] : ["pending", "accepted", "preparing", "ready"]);
export const isStatus = (s: string) => ["accepted", "rejected", "preparing", "ready", "completed", "cancelled"].includes(s);

const ERRORS: Record<string, string> = {
  FORBIDDEN_TRANSITION: "That change isn't allowed. Someone may have just updated this order.",
  NOT_STAFF: "Your account doesn't have staff access.", ORDER_NOT_FOUND: "That order no longer exists.",
};
export const friendlyStatusError = (m?: string) => ERRORS[Object.keys(ERRORS).find((c) => m?.includes(c)) ?? ""] ?? "Couldn't update the order. Try again.";
