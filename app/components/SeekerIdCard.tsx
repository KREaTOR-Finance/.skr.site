"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { publicProfileUrl, studioUrl } from "@/app/lib/resolver";
import { formatSkr, shortenWallet, type SkrProfile } from "@/app/lib/skrProfile";

const POLL_MS = 25_000;

function secondsAgo(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 5) return "Updated just now";
  return `Updated ${s}s ago`;
}

function cooldownLabel(endsAt: number | null): string | null {
  if (!endsAt) return null;
  const remain = endsAt * 1000 - Date.now();
  if (remain <= 0) return "Unstake ready";
  const hours = Math.ceil(remain / 3_600_000);
  return `${hours}h cooldown`;
}

function saveCardPng(name: string, total: string, wallet: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, 1200, 630);
  const glow = ctx.createRadialGradient(280, 200, 20, 400, 240, 420);
  glow.addColorStop(0, "rgba(0,201,167,0.35)");
  glow.addColorStop(1, "rgba(10,10,10,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1200, 630);
  ctx.strokeStyle = "rgba(190,190,190,0.28)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(48, 48, 1104, 534, 28);
  ctx.stroke();
  ctx.fillStyle = "#00c9a7";
  ctx.font = "700 28px Inter, system-ui, sans-serif";
  ctx.fillText(`${name}`, 88, 130);
  ctx.fillStyle = "#888888";
  ctx.font = "600 18px Inter, system-ui, sans-serif";
  ctx.fillText("SEEKER ID", 88, 168);
  ctx.fillStyle = "#f0f0f0";
  ctx.font = "700 96px Inter, system-ui, sans-serif";
  ctx.fillText(total, 88, 320);
  ctx.fillStyle = "#888888";
  ctx.font = "500 22px Inter, system-ui, sans-serif";
  ctx.fillText("SKR", 88, 360);
  ctx.fillText(wallet, 88, 520);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}-seeker-id.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

export default function SeekerIdCard({
  domain,
  owner,
  picture,
  initial,
}: {
  domain: string;
  owner: string;
  picture?: string;
  initial: SkrProfile;
}) {
  const [profile, setProfile] = useState(initial);
  const [copied, setCopied] = useState(false);
  const [tick, setTick] = useState(0);
  const live = useRef(true);
  const link = useMemo(() => publicProfileUrl(domain), [domain]);

  useEffect(() => {
    live.current = true;
    const poll = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/skr-profile?wallet=${owner}`, { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as SkrProfile;
        if (live.current) setProfile(next);
      } catch {
        // Keep the last good snapshot.
      }
    }, POLL_MS);
    const clock = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => {
      live.current = false;
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [owner]);

  const cooldown = cooldownLabel(profile.cooldownEndsAt);
  void tick;

  return (
    <section className="panel card-glow resolver-card seeker-id-card">
      <div className="seeker-id-top">
        <span className="chip">{domain}</span>
        {profile.isSeeker ? <span className="chip">SEEKER</span> : null}
      </div>
      {picture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="seeker-id-avatar" src={picture} alt="" />
      ) : (
        <div className="seeker-id-knot" aria-hidden="true" />
      )}
      <h1>{domain}</h1>
      <p className="mono seeker-id-wallet">{shortenWallet(owner)}</p>
      <div className="seeker-id-total">
        <strong>{formatSkr(profile.total)}</strong>
        <span>SKR</span>
      </div>
      <div className="wallet-box seeker-id-tiles">
        <strong>Liquid</strong>
        <span>{formatSkr(profile.liquid)}</span>
        <strong>Staked</strong>
        <span>{formatSkr(profile.staked)}{profile.yieldEarned > 0 ? ` +${formatSkr(profile.yieldEarned)}` : ""}</span>
        {profile.unstaking > 0 ? (
          <>
            <strong>Unstaking</strong>
            <span>{formatSkr(profile.unstaking)}{cooldown ? ` · ${cooldown}` : ""}</span>
          </>
        ) : null}
        {profile.guardian ? (
          <>
            <strong>Guardian</strong>
            <span className="mono">{shortenWallet(profile.guardian)}</span>
          </>
        ) : null}
      </div>
      <small className="seeker-id-updated">{secondsAgo(profile.updatedAt)}</small>
      <div className="row">
        <button
          className="btn btn-ghost"
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          }}
        >
          {copied ? "Copied" : "Copy link"}
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => saveCardPng(domain, formatSkr(profile.total), owner)}
        >
          Save card
        </button>
      </div>
      <div className="row">
        <a className="btn btn-ghost" href="https://stake.solanamobile.com">Stake</a>
        <a className="btn btn-primary" href={studioUrl(domain)}>Build a custom page</a>
      </div>
    </section>
  );
}
