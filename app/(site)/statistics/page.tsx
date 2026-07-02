"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import "./statistics.css";
import { useAuth } from "@/hooks/useAuth";
import { getSupabaseClient } from "@/lib/supabase";
import { hasCompletedArtistProfile } from "@/lib/profile";
import { loadTrendData, getDisplayRoles, getDisplayLocation, type ChartDataByMetric } from "@/lib/statistics";
import TrendChart, { type TrendPoint } from "@/components/statistics/TrendChart";

function formatNumber(value: number | null | undefined): string {
  return Number(value || 0).toLocaleString();
}

type Metric = "streams" | "visits" | "likes";

const METRIC_LABELS: Record<Metric, string> = {
  streams: "Radio stream analytics",
  visits: "Profile visit analytics",
  likes: "Like analytics",
};

function formatAxisDate(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00Z`);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
}

export default function StatisticsPage() {
  const { user, profile, track, loading } = useAuth();

  const [estimatedPlays, setEstimatedPlays] = useState(0);
  const [chartData, setChartData] = useState<ChartDataByMetric | null>(null);
  const [firstAvailable, setFirstAvailable] = useState<{ streams: string | null; visits: string | null; likes: string | null }>({
    streams: null,
    visits: null,
    likes: null,
  });
  const [totalLikes, setTotalLikes] = useState(0);
  const [totalVisits, setTotalVisits] = useState(0);
  const [metric, setMetric] = useState<Metric>("streams");
  const [trendLoaded, setTrendLoaded] = useState(false);

  const hasProfile = hasCompletedArtistProfile(profile);
  const p = profile as
    | {
        artist_name?: string;
        photo_url?: string;
        coins?: number;
        lifetime_seconds_earned?: number;
        city?: string;
        nationality?: string;
        music_role?: string;
        music_roles?: string[];
      }
    | null;
  const t = track as { id?: string; title?: string; play_count?: number; created_at?: string } | null;

  useEffect(() => {
    if (loading || !user || !hasProfile) return;

    let cancelled = false;
    (async () => {
      const supabase = getSupabaseClient();
      const [ownApprovedRes, stationApprovedRes, trend] = await Promise.all([
        supabase.from("tracks").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "approved"),
        supabase.from("tracks").select("*", { count: "exact", head: true }).eq("status", "approved"),
        loadTrendData(user.id, t),
      ]);
      if (cancelled) return;

      const ownApprovedCount = ownApprovedRes.count || 0;
      const stationApprovedCount = stationApprovedRes.count || 0;
      setEstimatedPlays(
        ownApprovedCount && stationApprovedCount ? Math.floor(1440 / Math.max(1, stationApprovedCount)) : 0
      );
      setChartData(trend.chartDataByMetric);
      setFirstAvailable(trend.firstAvailableByMetric);
      setTotalLikes(trend.totalLikes);
      setTotalVisits(trend.totalVisits);
      setTrendLoaded(true);
    })().catch((err) => console.error("statistics page error:", err));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, hasProfile]);

  const series: TrendPoint[] = chartData?.[metric] || [];
  const tuneStart = t?.created_at ? t.created_at.slice(0, 10) : null;
  const firstForMetric = firstAvailable[metric];

  let trendNote = `${METRIC_LABELS[metric]} will appear once data starts coming in.`;
  if (firstForMetric) {
    trendNote =
      tuneStart && firstForMetric > tuneStart && metric !== "likes"
        ? `${METRIC_LABELS[metric]} started tracking on ${formatAxisDate(firstForMetric)}.`
        : `${METRIC_LABELS[metric]} shown over time.`;
  }

  const avatarInitial = String(p?.artist_name || user?.email || "A").trim().charAt(0).toUpperCase() || "A";

  return (
    <main className="page-wrap stats-page">
      {!loading && !user && (
        <div className="empty-card">
          <div className="empty-icon">◎</div>
          <div className="empty-title">Log in to view your statistics</div>
          <div className="empty-text">Artist statistics are only available for signed-in accounts.</div>
          <Link href="/login" className="gold-btn">
            Login
          </Link>
        </div>
      )}

      {!loading && user && !hasProfile && (
        <div className="empty-card">
          <div className="empty-icon">✦</div>
          <div className="empty-title">Create your artist profile first</div>
          <div className="empty-text">
            You&rsquo;ll unlock your artist page, tune submission, and your premium statistics overview.
          </div>
          <Link href="/join" className="gold-btn">
            Create artist profile
          </Link>
        </div>
      )}

      {!loading && user && hasProfile && (
        <section className="stats-layout">
          <header className="stats-hero">
            <div className="stats-hero-avatar-wrap">
              {p?.photo_url ? (
                <Image className="stats-hero-avatar" src={p.photo_url} alt="Artist avatar" width={64} height={64} />
              ) : (
                <div className="stats-hero-avatar-fallback">{avatarInitial}</div>
              )}
            </div>
            <div className="stats-hero-copy">
              <div className="stats-hero-name">{p?.artist_name || "—"}</div>
              <div className="stats-hero-meta">
                <span>{getDisplayRoles(p || null)}</span>
                <span className="meta-dot">•</span>
                <span>{getDisplayLocation(p || null)}</span>
              </div>
            </div>
          </header>

          <section className="stats-details" aria-label="Artist statistics">
            <div className="stats-row">
              <span className="stats-label">
                <span className="stats-label-icon">🎵</span>
                <span>Current tune</span>
              </span>
              <span className="stats-value">{t?.title || "No tune submitted yet"}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">
                <span className="stats-label-icon">📻</span>
                <span>Total radio streams</span>
              </span>
              <span className="stats-value">{formatNumber(t?.play_count)}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">
                <span className="stats-label-icon">⏱</span>
                <span>Estimated plays / day</span>
              </span>
              <span className="stats-value">{formatNumber(estimatedPlays)}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">
                <span className="stats-label-icon">❤️</span>
                <span>Total likes</span>
              </span>
              <span className="stats-value">{formatNumber(totalLikes)}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">
                <span className="stats-label-icon">👀</span>
                <span>Profile visits</span>
              </span>
              <span className="stats-value">{formatNumber(totalVisits)}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">
                <Image src="/coin.webp" alt="" width={18} height={18} className="stats-label-coin" />
                <span>Second Balance</span>
              </span>
              <span className="stats-value">{formatNumber(p?.coins)}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">
                <Image src="/coin.webp" alt="" width={18} height={18} className="stats-label-coin stats-label-coin--gold" />
                <span>Earned in total</span>
              </span>
              <span className="stats-value">{formatNumber(p?.lifetime_seconds_earned)}</span>
            </div>
          </section>

          <section className="stats-chart-area" aria-label="Analytics over time">
            <div className="stats-chart-topline">
              <div>
                <div className="stats-chart-kicker">Trend over time</div>
                <h2 className="stats-chart-title">Performance since your tune went live</h2>
              </div>
              <label className="stats-chart-select-wrap" htmlFor="statsMetricSelect">
                <span className="sr-only">Choose analytics metric</span>
                <select
                  id="statsMetricSelect"
                  className="stats-chart-select"
                  value={metric}
                  onChange={(e) => setMetric(e.target.value as Metric)}
                >
                  <option value="streams">Streams on the radio</option>
                  <option value="visits">Clicks on profile visits</option>
                  <option value="likes">Likes</option>
                </select>
              </label>
            </div>
            <p className="stats-chart-note">{trendNote}</p>
            <div className="stats-chart-canvas-wrap">
              <TrendChart series={series} />
            </div>
            {trendLoaded && series.length === 0 && (
              <div className="stats-chart-empty">No trend data available yet for this metric.</div>
            )}
          </section>
        </section>
      )}
    </main>
  );
}
