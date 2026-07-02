"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchTopSupporters, type TopSupporter } from "@/lib/community";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function TopSupporters() {
  const [supporters, setSupporters] = useState<TopSupporter[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchTopSupporters()
      .then((data) => {
        setSupporters(data);
        setLoaded(true);
      })
      .catch((err) => console.error("loadTopSupporters error:", err));
  }, []);

  if (!loaded || !supporters.length) return null;

  return (
    <section id="topSupportersSection" className="news-feed-section top-supporters-section">
      <div className="news-feed-kicker">Top Supporters</div>
      <div className="news-feed-viewport">
        <div id="topSupportersList" className="news-feed-list">
          {supporters.map((p, i) => {
            const name = String(p.artist_name || "").trim();
            const href = p.user_id ? `/artist?user_id=${encodeURIComponent(p.user_id)}` : "#";
            return (
              <div className="news-feed-item top-supporter-item" key={p.user_id}>
                <Link className="news-feed-item-avatar" href={href}>
                  {p.photo_url ? (
                    <Image className="news-feed-avatar" src={p.photo_url} alt={name} width={36} height={36} />
                  ) : (
                    <span className="news-feed-avatar-fallback">{(name || "A").charAt(0).toUpperCase()}</span>
                  )}
                </Link>
                <div className="news-feed-item-body">
                  <span className="top-supporter-rank">{MEDALS[i] || `  ${i + 1}`}</span>
                  <Link className="news-feed-name" href={href}>
                    {name}
                  </Link>
                  <span className="top-supporter-coins">{Number(p.coins || 0).toLocaleString()} sec</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
