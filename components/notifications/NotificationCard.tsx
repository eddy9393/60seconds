"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  formatNotificationDate,
  getNotificationEmoji,
  getNotificationGroupIds,
  getNotificationTitle,
  type EnrichedNotification,
} from "@/lib/notifications";

type Props = {
  item: EnrichedNotification;
  onDelete: (groupIdsCsv: string) => void;
  deleting: boolean;
};

function getNotificationBody(item: EnrichedNotification): React.ReactNode {
  if (String(item.type || "").trim() === "tune_liked") {
    const trackTitle = String(item.relatedTrack?.title || "Your tune").trim() || "Your tune";
    const profile = item.relatedProfile;
    const displayName = String(profile?.artist_name || item.related_user_id || "Someone").trim() || "Someone";
    const profileHref = profile?.user_id ? `/artist?user_id=${encodeURIComponent(profile.user_id)}` : "#";
    return (
      <>
        <span className="notification-track-name">{trackTitle}</span> just got some love from{" "}
        <Link className="notification-user-link" href={profileHref}>
          {displayName}
        </Link>
      </>
    );
  }
  return item.body || "";
}

export default function NotificationCard({ item, onDelete, deleting }: Props) {
  const cardRef = useRef<HTMLElement>(null);
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startXRef = useRef(0);
  const draggingRef = useRef(false);

  const isMobile = () => typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
  const groupIds = getNotificationGroupIds(item);
  const deleteValue = groupIds.join(",");

  const onTouchStart = (e: React.TouchEvent) => {
    if (!isMobile() || e.touches.length !== 1) return;
    startXRef.current = e.touches[0].clientX;
    draggingRef.current = true;
    setSwiping(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!draggingRef.current || e.touches.length !== 1) return;
    const delta = e.touches[0].clientX - startXRef.current;
    setSwipeX(Math.max(-120, Math.min(0, delta)));
  };
  const onTouchEnd = () => {
    if (!draggingRef.current) return;
    const shouldDelete = swipeX <= -72;
    draggingRef.current = false;
    setSwiping(false);
    setSwipeX(0);
    if (shouldDelete) onDelete(deleteValue);
  };

  const reward = Number(item.reward_seconds || 0);

  return (
    <article
      ref={cardRef}
      className={`notification-card${item.is_read ? "" : " unread"}${deleting ? " is-deleting" : ""}${
        swiping ? " is-swiping" : ""
      }${swipeX <= -72 ? " swipe-delete-ready" : ""}`}
      style={{ ["--swipe-x" as string]: `${swipeX}px` }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => {
        draggingRef.current = false;
        setSwiping(false);
        setSwipeX(0);
      }}
    >
      <button
        className="notification-delete-btn"
        type="button"
        aria-label="Delete notification"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(deleteValue);
        }}
      >
        ×
      </button>
      <div className="notification-swipe-hint" aria-hidden="true">
        Delete
      </div>

      {String(item.type || "").trim() === "tune_liked" ? (
        <Link
          className="notification-avatar-link"
          href={item.relatedProfile?.user_id ? `/artist?user_id=${encodeURIComponent(item.relatedProfile.user_id)}` : "#"}
          aria-label={`Open artist profile of ${item.relatedProfile?.artist_name || "artist"}`}
        >
          {item.relatedProfile?.photo_url ? (
            <Image
              className="notification-avatar"
              src={item.relatedProfile.photo_url}
              alt={item.relatedProfile.artist_name || "Artist"}
              width={40}
              height={40}
            />
          ) : (
            <span className="notification-avatar-fallback">
              {String(item.relatedProfile?.artist_name || item.related_user_id || "A").charAt(0).toUpperCase()}
            </span>
          )}
        </Link>
      ) : (
        <div className="notification-icon" aria-hidden="true">
          {getNotificationEmoji(item.type)}
        </div>
      )}

      <div className="notification-content">
        <div className="notification-topline">
          <h2 className="notification-title">{getNotificationTitle(item)}</h2>
          <time className="notification-time" dateTime={item.created_at || ""}>
            {formatNotificationDate(item.created_at)}
          </time>
        </div>
        <p className="notification-body">{getNotificationBody(item)}</p>
        {reward > 0 && <div className="notification-reward">+{reward} Seconds</div>}
      </div>
    </article>
  );
}
