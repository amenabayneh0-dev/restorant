"use server";
import { orderInputSchema } from "@/lib/validation";
import { hashToken, trackingTokenFor } from "@/lib/token";
import { friendlyOrderError } from "@/lib/errors";
import { adminClient } from "@/lib/supabase-admin";
import { trackingSecret } from "@/lib/env";

export type PlaceOrderResult =
  | { ok: true; reference: string; trackingPath: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[] | undefined> };

const SETUP_MESSAGE = "Online ordering isn't available right now. Please call the restaurant.";

export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const parsed = orderInputSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: "Please check the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;

  // Server misconfiguration must produce a readable message for the customer and a clear log line for the owner,
  // not an unhandled exception.
  let token: string;
  let db: ReturnType<typeof adminClient>;
  try {
    token = trackingTokenFor(v.idempotencyKey, trackingSecret() ?? "");
    db = adminClient();
  } catch (e) {
    console.error("[placeOrder] server configuration problem:", e instanceof Error ? e.message : e);
    return { ok: false, message: SETUP_MESSAGE };
  }

  const { data, error } = await db.rpc("create_order", {
    p_idempotency_key: v.idempotencyKey,
    p_token_hash: hashToken(token),
    p_customer_name: v.customerName,
    p_customer_phone: v.customerPhone,
    p_customer_email: v.customerEmail || null,
    p_fulfillment: v.fulfillment,
    p_table_number: v.tableNumber || null,
    p_delivery_address: v.deliveryAddress || null,
    p_note: v.note || null,
    // Prices are deliberately NOT sent: the database looks them up.
    p_items: v.items.map((i) => ({
      menu_item_id: i.menuItemId, quantity: i.quantity,
      option_ids: i.optionIds, instructions: i.instructions ?? null,
    })),
  });
  if (error) {
    console.error("[placeOrder] create_order failed:", error.message);
    return { ok: false, message: friendlyOrderError(error.message) };
  }
  return { ok: true, reference: data as string, trackingPath: `/track/${token}` };
}
