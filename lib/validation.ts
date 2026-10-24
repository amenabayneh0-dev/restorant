import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional();

export const orderInputSchema = z
  .object({
    customerName: z.string().trim().min(1, "Enter your name").max(100),
    customerPhone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number"),
    customerEmail: z.string().trim().email("Enter a valid email").max(254).optional().or(z.literal("")),
    fulfillment: z.enum(["pickup", "dine_in", "delivery"]),
    tableNumber: optionalText(20),
    deliveryAddress: optionalText(300),
    note: optionalText(500),
    idempotencyKey: z.string().uuid(),
    items: z
      .array(
        z.object({
          menuItemId: z.string().uuid(),
          quantity: z.number().int().min(1).max(99),
          optionIds: z.array(z.string().uuid()).max(20).default([]),
          instructions: optionalText(300),
        }),
      )
      .min(1, "Your cart is empty")
      .max(50),
  })
  .superRefine((v, ctx) => {
    if (v.fulfillment === "delivery" && !v.deliveryAddress)
      ctx.addIssue({ code: "custom", path: ["deliveryAddress"], message: "Enter a delivery address" });
    if (v.fulfillment === "dine_in" && !v.tableNumber)
      ctx.addIssue({ code: "custom", path: ["tableNumber"], message: "Enter your table number" });
  });

export type OrderInput = z.infer<typeof orderInputSchema>;
