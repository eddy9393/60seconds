"use client";

import Link from "next/link";
import Image from "next/image";
import "./store.css";
import { useAuth } from "@/hooks/useAuth";

function formatNumber(value: number | null | undefined): string {
  return Math.max(0, Number(value || 0)).toLocaleString();
}

const BOOSTS = [
  { chip: "Featured", price: 120, icon: "boost.png", title: "Radio Boost", text: "Boost your tune for more radio plays" },
  {
    chip: "Audience",
    price: 220,
    icon: "spotlight.png",
    title: "Profile Spotlight",
    text: "Get your Artist profile mentioned in the featured artist section on the front page",
  },
  { chip: "Surprise!", price: 350, icon: "present.png", title: "Gift", text: "Buy a gift for yourself or someone else" },
];

const PACKS = [
  { amount: 250, price: "€4.99", text: "Starter top-up for lightweight promotion use.", highlight: false },
  { amount: 700, price: "€11.99", text: "Mid-tier pack placeholder for regular promotion use.", highlight: true },
  { amount: 1500, price: "€22.99", text: "Large pack placeholder for future heavier campaigns.", highlight: false },
];

export default function StorePage() {
  const { user, coins, loading } = useAuth();

  return (
    <main className="page-wrap store-page">
      {!loading && !user && (
        <div className="empty-card">
          <div className="empty-icon">◎</div>
          <div className="empty-title">Log in to access the store</div>
          <div className="empty-text">Your balance, boosts, and future top-up options are tied to your signed-in account.</div>
          <Link href="/login" className="gold-btn">
            Login
          </Link>
        </div>
      )}

      {!loading && user && (
        <section className="store-layout">
          <header className="store-hero">
            <div className="store-hero-card">
              <div className="store-kicker">Seconds Store</div>
              <h1 className="store-title">Customize your promotion plan</h1>
              <p className="store-subtitle">On this page you can decide how you want to spend your well deserved Seconds </p>

              <div className="store-balance-card">
                <div className="store-balance-label">Current balance</div>
                <div className="store-balance-value-wrap">
                  <Image src="/coin.webp" alt="" width={28} height={28} className="store-balance-coin" />
                  <span id="storeBalanceValue" className="store-balance-value">
                    {formatNumber(coins)}
                  </span>
                </div>
              </div>
            </div>
          </header>

          <section className="store-section" aria-labelledby="boostsHeading">
            <div className="store-section-head store-section-head--centered">
              <div>
                <div className="store-section-kicker">Spend coins</div>
                <h2 id="boostsHeading" className="store-section-title">
                  Boosts
                </h2>
              </div>
            </div>

            <div className="store-grid">
              {BOOSTS.map((boost) => (
                <article className="store-card store-card--boost" key={boost.title}>
                  <div className="store-card-top">
                    <span className="store-chip">{boost.chip}</span>
                    <span className="store-price">
                      <Image src="/coin.webp" alt="" width={16} height={16} className="store-inline-coin" />
                      {boost.price}
                    </span>
                  </div>
                  <div className="store-card-visual-wrap">
                    <Image src={`/icons/${boost.icon}`} alt={boost.title} width={72} height={72} className="store-card-visual" />
                  </div>
                  <h3 className="store-card-title">{boost.title}</h3>
                  <p className="store-card-text">{boost.text}</p>
                  <button className="store-card-btn" type="button" disabled>
                    Coming soon
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="store-section" aria-labelledby="topupsHeading">
            <div className="store-section-head store-section-head--centered">
              <div>
                <div className="store-section-kicker">Buy Coins and/or features</div>
                <h2 id="topupsHeading" className="store-section-title">
                  Coin packs
                </h2>
              </div>
            </div>

            <div className="store-grid store-grid--packs">
              {PACKS.map((pack) => (
                <article className={`store-card store-card--pack${pack.highlight ? " store-card--highlight" : ""}`} key={pack.amount}>
                  <div className="store-pack-amount">
                    <Image src="/coin.webp" alt="" width={24} height={24} className="store-inline-coin store-inline-coin--large" />
                    <span>{pack.amount}</span>
                  </div>
                  <div className="store-pack-price">{pack.price}</div>
                  <p className="store-card-text">{pack.text}</p>
                  <button className="store-card-btn" type="button" disabled>
                    Checkout later
                  </button>
                </article>
              ))}
            </div>
          </section>
        </section>
      )}
    </main>
  );
}
