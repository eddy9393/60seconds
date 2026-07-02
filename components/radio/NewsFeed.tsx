"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchNewsFeed, type NewsFeedItem } from "@/lib/community";

const REFRESH_MS = 60000;

function getInitial(name: string) {
  return String(name || "A").trim().charAt(0).toUpperCase() || "A";
}

function NewsFeedRow({ item }: { item: NewsFeedItem }) {
  const href = item.user_id ? `/artist?user_id=${encodeURIComponent(item.user_id)}` : "#";
  const name = item.name || "Artist";

  const avatar = item.photo_url ? (
    <Image className="news-feed-avatar" src={item.photo_url} alt={name} width={36} height={36} />
  ) : (
    <span className="news-feed-avatar-fallback">{getInitial(name)}</span>
  );

  let copy: React.ReactNode;
  if (item.type === "join") {
    copy = (
      <span className="news-feed-copy">
        <Link className="news-feed-actor" href={href}>
          <span className="news-feed-name">{name}</span>
        </Link>{" "}
        just joined 60 Seconds
      </span>
    );
  } else if (item.type === "approved_track") {
    copy = (
      <span className="news-feed-copy">
        <span className="news-feed-track">{item.track_title || "Untitled"}</span> by{" "}
        <Link className="news-feed-actor" href={href}>
          <span className="news-feed-name">{name}</span>
        </Link>{" "}
        is live!
      </span>
    );
  } else {
    copy = (
      <span className="news-feed-copy">
        <Link className="news-feed-actor" href={href}>
          <span className="news-feed-name">{name}</span>
        </Link>{" "}
        supported 10 artists today
      </span>
    );
  }

  return (
    <div className="news-feed-item">
      <Link className="news-feed-item-avatar" href={href}>
        {avatar}
      </Link>
      <div className="news-feed-item-body">{copy}</div>
    </div>
  );
}

export default function NewsFeed() {
  const [items, setItems] = useState<NewsFeedItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchNewsFeed()
        .then((data) => {
          if (!cancelled) {
            setItems(data);
            setLoaded(true);
          }
        })
        .catch((err) => console.error("loadNewsFeed error:", err));
    };
    load();
    const refreshTimer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(refreshTimer);
    };
  }, []);

  // Ported from advanceNewsFeed() in index.js — a continuous marquee scroll
  useEffect(() => {
    const el = listRef.current;
    if (!el || items.length < 4) return;

    indexRef.current = 0;
    const timer = setInterval(() => {
      const firstItem = el.querySelector<HTMLElement>(".news-feed-item");
      if (!firstItem) return;
      const itemHeight = firstItem.offsetHeight || 56;
      const totalSourceItems = Math.min(items.length, 12);
      const totalCycleHeight = itemHeight * totalSourceItems;

      indexRef.current += 0.2;
      const translateY = -(indexRef.current % totalCycleHeight);
      el.style.transform = `translateY(${translateY}px)`;
    }, 40);

    return () => clearInterval(timer);
  }, [items]);

  if (!loaded) return null;

  const source = items.slice(0, Math.min(items.length, 12));
  const shouldLoop = source.length >= 4;
  const copies = shouldLoop ? Math.max(3, Math.ceil(9 / source.length)) : 1;
  const repeated = shouldLoop
    ? Array.from({ length: copies }).flatMap((_, copyIndex) =>
        source.map((item, i) => (
          <NewsFeedRow key={`${copyIndex}-${i}-${item.user_id}${item.track_title || ""}`} item={item} />
        ))
      )
    : source.map((item, i) => <NewsFeedRow key={`${i}-${item.user_id}${item.track_title || ""}`} item={item} />);

  return (
    <section id="newsFeedSection" className="news-feed-section">
      <div className="news-feed-kicker">Community updates</div>
      <div className="news-feed-viewport">
        <div id="newsFeedList" ref={listRef} className="news-feed-list">
          {source.length ? repeated : <div className="news-feed-item news-feed-empty">No community updates yet.</div>}
        </div>
      </div>
    </section>
  );
}
