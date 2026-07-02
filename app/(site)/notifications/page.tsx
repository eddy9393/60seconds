"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./notifications.css";
import { useAuth } from "@/hooks/useAuth";
import { getSupabaseClient } from "@/lib/supabase";
import {
  acknowledgeNotifications,
  deleteNotificationGroup,
  fetchNotifications,
  getNotificationGroupIds,
  type EnrichedNotification,
} from "@/lib/notifications";
import NotificationCard from "@/components/notifications/NotificationCard";

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [notifications, setNotifications] = useState<EnrichedNotification[] | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseClient>["channel"]> | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  const refresh = useCallback(async (userId: string, acknowledge: boolean) => {
    const items = await fetchNotifications(userId);
    setNotifications(items);
    if (acknowledge) {
      await acknowledgeNotifications(items, userId).catch((err) => console.error("acknowledgeNotifications error:", err));
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    refresh(user.id, true).catch((err) => console.error("notifications load error:", err));

    const supabase = getSupabaseClient();
    channelRef.current = supabase
      .channel(`notifications-page:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` },
        () => {
          if (!cancelled) refresh(user.id, false).catch((err) => console.error("notifications realtime refresh error:", err));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, refresh]);

  const handleDelete = async (groupIdsCsv: string) => {
    if (!user || !groupIdsCsv || deletingKey === groupIdsCsv) return;
    setDeletingKey(groupIdsCsv);
    try {
      await deleteNotificationGroup(groupIdsCsv, user.id);
      const ids = groupIdsCsv.split(",");
      setNotifications((current) =>
        (current || []).filter((item) => !getNotificationGroupIds(item).some((id) => ids.includes(id)))
      );
    } catch (err) {
      console.error("deleteNotification error:", err);
    } finally {
      setDeletingKey(null);
    }
  };

  const showEmpty = notifications !== null && notifications.length === 0;
  const showList = notifications !== null && notifications.length > 0;

  return (
    <main className="page-wrap">
      <h1 className="page-title">Notifications</h1>
      <p className="page-subtitle">Stay updated with your activity</p>

      {showList && (
        <section id="notificationsList" className="notifications-list">
          {notifications!.map((item) => (
            <NotificationCard
              key={item.id}
              item={item}
              onDelete={handleDelete}
              deleting={deletingKey === getNotificationGroupIds(item).join(",")}
            />
          ))}
        </section>
      )}

      {(showEmpty || notifications === null) && (
        <div className="empty-card">
          <div className="empty-icon">🔔</div>
          <div className="empty-title">No notifications yet</div>
          <div className="empty-text">When something happens, you&rsquo;ll see it here.</div>
          <Link href="/" className="back-link">
            ← Back to Radio
          </Link>
        </div>
      )}
    </main>
  );
}
