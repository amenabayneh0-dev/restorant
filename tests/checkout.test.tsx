// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
const placeOrder = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/app/actions/place-order", () => ({ placeOrder: (...a: unknown[]) => placeOrder(...a) }));

import { CartBar } from "../components/CartBar";
import { cartActions } from "../lib/cart-store";
import type { MenuSnapshot } from "../lib/cart";

const menu: MenuSnapshot = { "11111111-1111-4111-8111-111111111111": { price: 90, available: true, options: {} } };
const line = { itemId: "11111111-1111-4111-8111-111111111111", name: "Mango Juice", unitPrice: 90, quantity: 1, optionIds: [], optionNames: [] };
const props = { currency: "ETB", deliveryFee: 50, fulfillment: ["pickup", "dine_in", "delivery"], open: true, menu };

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  localStorage.clear(); push.mockReset(); placeOrder.mockReset();
  localStorage.setItem("menuflow-cart-v1", JSON.stringify([{ ...line, key: "x" }]));
});
afterEach(() => { act(() => cartActions.clear()); cleanup(); });

async function openAndFill() {
  const user = userEvent.setup();
  render(<CartBar {...props} />);
  await user.click(await screen.findByRole("button", { name: /view order/i }));
  await user.type(screen.getByLabelText(/your name/i), "Abebe");
  await user.type(screen.getByLabelText(/phone number/i), "+251911222333");
  return user;
}

describe("checkout", () => {
  it("does not get stuck on 'Placing order...' when the request throws", async () => {
    placeOrder.mockRejectedValueOnce(new Error("network"));
    const user = await openAndFill();
    await user.click(screen.getByRole("button", { name: /place order/i }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/couldn't reach/i));
    expect((screen.getByRole("button", { name: /place order/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("a retry of the SAME order reuses the idempotency key; a changed order gets a new one", async () => {
    placeOrder.mockRejectedValue(new Error("network"));
    const user = await openAndFill();
    const btn = () => screen.getByRole("button", { name: /place order/i });
    await user.click(btn()); await waitFor(() => expect(placeOrder).toHaveBeenCalledTimes(1));
    await waitFor(() => expect((btn() as HTMLButtonElement).disabled).toBe(false));
    await user.click(btn()); await waitFor(() => expect(placeOrder).toHaveBeenCalledTimes(2));
    const [k1, k2] = placeOrder.mock.calls.map((c) => (c[0] as { idempotencyKey: string }).idempotencyKey);
    expect(k1).toBe(k2);
    await waitFor(() => expect((btn() as HTMLButtonElement).disabled).toBe(false));
    await user.type(screen.getByLabelText(/note for the kitchen/i), "no ice");
    await user.click(btn()); await waitFor(() => expect(placeOrder).toHaveBeenCalledTimes(3));
    expect((placeOrder.mock.calls[2][0] as { idempotencyKey: string }).idempotencyKey).not.toBe(k1);
  });

  it("on success clears the cart and goes to the tracking page", async () => {
    placeOrder.mockResolvedValueOnce({ ok: true, reference: "MF-1", trackingPath: "/track/abc" });
    const user = await openAndFill();
    await user.click(screen.getByRole("button", { name: /place order/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/track/abc"));
    expect(localStorage.getItem("menuflow-cart-v1")).toBe("[]");
  });

  it("shows server field errors next to the field", async () => {
    placeOrder.mockResolvedValueOnce({ ok: false, message: "Please check the highlighted fields.", fieldErrors: { customerPhone: ["Enter a valid phone number"] } });
    const user = await openAndFill();
    await user.click(screen.getByRole("button", { name: /place order/i }));
    expect(await screen.findByText("Enter a valid phone number")).toBeTruthy();
  });

  it("sends no prices to the server", async () => {
    placeOrder.mockResolvedValueOnce({ ok: false, message: "x" });
    const user = await openAndFill();
    await user.click(screen.getByRole("button", { name: /place order/i }));
    await waitFor(() => expect(placeOrder).toHaveBeenCalled());
    expect(JSON.stringify(placeOrder.mock.calls[0][0])).not.toMatch(/price/i);
  });

  it("tells the customer when a saved item was sold out or repriced since yesterday", async () => {
    localStorage.setItem("menuflow-cart-v1", JSON.stringify([{ ...line, key: "x", unitPrice: 70 }, { ...line, itemId: "gone", name: "Old Dish", key: "y" }]));
    const user = userEvent.setup();
    render(<CartBar {...props} />);
    await user.click(await screen.findByRole("button", { name: /view order/i }));
    expect(screen.getByText(/Old Dish is no longer available/)).toBeTruthy();
    expect(screen.getByText(/price of Mango Juice changed/)).toBeTruthy();
  });

  it("blocks ordering and says why when the restaurant has paused orders", async () => {
    const user = userEvent.setup();
    render(<CartBar {...props} open={false} />);
    await user.click(await screen.findByRole("button", { name: /view order/i }));
    expect((screen.getByRole("button", { name: /place order/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/not taking orders right now/i)).toBeTruthy();
  });
});
