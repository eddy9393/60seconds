"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import "./admin.css";
import { useAuth } from "@/hooks/useAuth";
import {
  checkIsAdmin,
  fetchPendingTracks,
  fetchMetricsSnapshot,
  approveTrack,
  getMetricRows,
  type PendingTrack,
  type MetricsSnapshot,
  type MetricFilter,
} from "@/lib/admin";

export default function AdminPage() {
  const { user, loading } = useAuth();

  const [checked, setChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tracks, setTracks] = useState<PendingTrack[] | null>(null);
  const [snapshot, setSnapshot] = useState<MetricsSnapshot | null>(null);
  const [metricFilter, setMetricFilter] = useState<MetricFilter>("traffic");
  const [status, setStatus] = useState("");
  const [debug, setDebug] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setDebug("Fetching pending tunes...");
    try {
      const [pending, metrics] = await Promise.all([fetchPendingTracks(), fetchMetricsSnapshot()]);
      setTracks(pending);
      setSnapshot(metrics);
      setStatus(pending.length ? `${pending.length} pending tune(s) waiting for approval.` : "No pending tunes waiting for approval.");
      setDebug("");
    } catch (err) {
      console.error(err);
      setStatus((err as Error).message || "Could not load admin data.");
      setDebug(`error: ${(err as Error).message || err}`);
    }
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setChecked(true);
      setIsAdmin(false);
      setDebug("Not logged in.");
      return;
    }

    let cancelled = false;
    (async () => {
      const admin = await checkIsAdmin(user.id);
      if (cancelled) return;
      setIsAdmin(admin);
      setChecked(true);
      if (!admin) {
        setDebug("No admin rights.");
        return;
      }
      await loadData();
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, user, loadData]);

  const handleApprove = async (trackId: string) => {
    if (approvingId) return;
    setApprovingId(trackId);
    try {
      await approveTrack(trackId);
      setStatus("Tune approved.");
      await loadData();
    } catch (err) {
      console.error(err);
      setStatus((err as Error).message || "Approve failed.");
    } finally {
      setApprovingId(null);
    }
  };

  const rows = snapshot ? getMetricRows(snapshot)[metricFilter] : [];

  return (
    <>
      <div className="admin-bg" aria-hidden="true" />

      <aside className="admin-rail" aria-label="Admin navigation">
        <Link className="rail-logo" href="/" aria-label="Back to 60 Seconds radio">
          <Image src="/logo.png" alt="60 Seconds" width={140} height={40} />
        </Link>
        <nav className="rail-links">
          <Link className="rail-link active" href="/admin">
            Admin
          </Link>
          <Link className="rail-link" href="/">
            Radio
          </Link>
          <Link className="rail-link" href="/store">
            Store
          </Link>
        </nav>
      </aside>

      <div className="admin-shell">
        <header className="admin-hero">
          <div className="admin-hero-top">
            <Link className="admin-logo-link" href="/" aria-label="Back to 60 Seconds radio">
              <Image className="admin-logo" src="/logo.png" alt="60 Seconds logo" width={140} height={40} />
            </Link>
            <span className="admin-pill">Admin Console</span>
          </div>
          <div className="admin-hero-content">
            <p className="eyebrow">60 Seconds admin</p>
            <h1>Premium control room for your music platform.</h1>
            <p className="hero-copy">Review pending tunes, monitor platform signals and keep the 60 Seconds experience clean.</p>
          </div>
        </header>

        {checked && !isAdmin && (
          <div id="lockedBox" className="state-card">
            <span className="state-label">Restricted</span>
            <h2>Access denied</h2>
            <p>Please log in with the admin account.</p>
          </div>
        )}

        {!checked && (
          <div id="loadingBox" className="state-card">
            <span className="state-label">Loading</span>
            <h2>Preparing admin data</h2>
            <p id="loadingText">Checking admin access...</p>
          </div>
        )}

        {checked && isAdmin && (
          <main id="adminApp" className="admin-main">
            <section className="dashboard-card priority-card">
              <div className="card-heading">
                <div>
                  <p className="eyebrow">Priority</p>
                  <h2>Approve pending tunes</h2>
                </div>
                <div className="status-stack">
                  <span id="status" className="status-text">
                    {status}
                  </span>
                  <span id="debug" className="debug-text">
                    {debug}
                  </span>
                </div>
              </div>
              <div id="trackList" className="track-list">
                {tracks && tracks.length === 0 && <div className="empty">No pending tracks right now.</div>}
                {tracks?.map((track) => (
                  <article className="track-item" key={track.id}>
                    <div className="track-head">
                      <div>
                        <h3 className="track-title">{track.title || "Untitled"}</h3>
                        <p className="track-meta">Artist: {track.artist || "Unknown"}</p>
                        <p className="track-id">
                          ID: {track.id} · Submitted: {track.created_at ? new Date(track.created_at).toLocaleString() : "Unknown"}
                        </p>
                      </div>
                      <div className="track-status">pending</div>
                    </div>
                    <audio controls preload="none" src={track.file_url || ""} />
                    <button
                      className="approve-btn"
                      type="button"
                      disabled={approvingId === track.id}
                      onClick={() => handleApprove(track.id)}
                    >
                      {approvingId === track.id ? "Approving..." : "Approve tune"}
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section className="dashboard-card metrics-card">
              <div className="card-heading metrics-heading">
                <div>
                  <p className="eyebrow">Overview</p>
                  <h2>Traffic &amp; platform overview</h2>
                </div>
                <div className="metric-tabs" role="tablist" aria-label="Metric categories">
                  {(["traffic", "content", "platform"] as MetricFilter[]).map((filter) => (
                    <button
                      key={filter}
                      className={`metric-tab${metricFilter === filter ? " active" : ""}`}
                      type="button"
                      onClick={() => setMetricFilter(filter)}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <ul id="metricList" className="metric-grid">
                {!snapshot && <li className="empty">Loading metrics...</li>}
                {rows.map((row) => (
                  <li className={`metric-row${row.featured ? " featured" : ""}`} key={row.label}>
                    <span className="metric-label">{row.label}</span>
                    <span className="metric-value">{String(row.value)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </main>
        )}
      </div>
    </>
  );
}
