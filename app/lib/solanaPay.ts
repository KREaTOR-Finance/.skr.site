import { PublicKey } from "@solana/web3.js";
import QRCode from "qrcode";
import { SKR_MINT } from "./sharedSpec";

export type ShopCurrency = "SKR" | "SOL";

export type ShopItem = {
  title: string;
  price: number;
  currency: ShopCurrency;
  image: string;
  description: string;
  delivery: string;
};

export function formatPayAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "";
  const text = amount.toFixed(amount >= 1 ? 6 : 9).replace(/\.?0+$/, "");
  return text || "";
}

export function solanaPayTransferUrl(input: {
  recipient: string;
  amount: number;
  currency: ShopCurrency;
  label?: string;
  message?: string;
  memo?: string;
}): string {
  let recipient: string;
  try {
    recipient = new PublicKey(input.recipient).toBase58();
  } catch {
    return "";
  }
  const amount = formatPayAmount(input.amount);
  if (!amount) return "";
  const params = new URLSearchParams();
  params.set("amount", amount);
  if (input.currency === "SKR") params.set("spl-token", SKR_MINT);
  if (input.label) params.set("label", input.label.slice(0, 80));
  if (input.message) params.set("message", input.message.slice(0, 80));
  if (input.memo) params.set("memo", input.memo.slice(0, 32));
  return `solana:${recipient}?${params.toString()}`;
}

export function solanaPayQrSvg(url: string): string {
  if (!url.startsWith("solana:")) return "";
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const parts: string[] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (qr.modules.get(x, y)) parts.push(`M${x},${y}h1v1h-1z`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" aria-hidden="true"><rect width="${size}" height="${size}" fill="#F0F0F0"/><path fill="#04110e" d="${parts.join("")}"/></svg>`;
}

export function htmlUnlockReady(profile: { total?: number; liquid?: number } | null | undefined): boolean {
  const total = Number(profile?.total ?? 0);
  const liquid = Number(profile?.liquid ?? 0);
  return total >= 1000 || liquid >= 1000;
}
