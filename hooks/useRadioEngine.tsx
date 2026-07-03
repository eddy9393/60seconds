"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { getSupabaseClient } from "@/lib/supabase";
import { APP_CONFIG } from "@/lib/config";
import { getFlagEmoji } from "@/lib/countries";
import { toggleTrackLikeInSupabase } from "@/lib/profile";
import {
  type Track,
  formatTime,
  getTrackGenreLabel,
  getTrackPreviewStart,
  getTrackPreviewDuration,
  getTodayDateKey,
  isCurrentSupabaseDailyDate,
  normalizeSupabaseDate,
  getSafeVolume,
  getSavedRadioSession,
  saveRadioSession,
  getDesiredSessionPlayback,
  readLikedTrackIds,
  writeLikedTrackIds,
  broadcastCurrencyUpdate,
} from "@/lib/radio";

const REFRESH_INTERVALS = {
  listenerHeartbeat: 15000,
  listenerCount: 5000,
  tracksReload: 30000,
};

const SKIP_COST = APP_CONFIG.skipCost;
const DAILY_SECONDS_LIMIT = APP_CONFIG.dailySecondsLimit;
const VOLUME_AUTO_CLOSE_MS = 3000;

type RadioContextValue = {
  audioRef: React.RefObject<HTMLAudioElement>;
  analyserRef: React.RefObject<AnalyserNode | null>;
  progressFillRef: React.RefObject<HTMLDivElement>;
  elapsedRef: React.RefObject<HTMLSpanElement>;
  durationRef: React.RefObject<HTMLSpanElement>;
  earnFillRef: React.RefObject<HTMLDivElement>;
  earnCopyRef: React.RefObject<HTMLSpanElement>;
  miniTimeRef: React.RefObject<HTMLDivElement>;

  tracksLoaded: boolean;
  isLive: boolean;
  isPreLive: boolean;
  isPlaying: boolean;
  liked: boolean;
  likeBusy: boolean;
  skipBusy: boolean;
  listenersCount: number;
  dailySecondsEarned: number;
  volume: number;
  muted: boolean;
  volumeOpen: boolean;
  title: string;
  artistName: string;
  artistPhoto: string | null;
  artistUserId: string | null;
  genre: string;
  nationalityFlag: string;
  emptyRadio: boolean;
  isOwnTrack: boolean;
  isLoggedIn: boolean;
  skipDisabled: boolean;
  likeDisabled: boolean;
  volumePct: number;
  profileHref: string | null;

  handleStartRadio: () => Promise<void>;
  handlePauseToggle: () => void;
  handleSkip: () => Promise<void>;
  handleLike: () => Promise<void>;
  handleVolumeChange: (value: number) => void;
  toggleVolumeControl: () => void;
};

const RadioContext = createContext<RadioContextValue | null>(null);

export function RadioProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, coins, refreshProfile } = useAuth();

  const audioRef = useRef<HTMLAudioElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxConnectedRef = useRef(false);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef<HTMLSpanElement>(null);
  const durationRef = useRef<HTMLSpanElement>(null);
  const earnFillRef = useRef<HTMLDivElement>(null);
  const earnCopyRef = useRef<HTMLSpanElement>(null);
  const miniTimeRef = useRef<HTMLDivElement>(null);
  const volumeAutoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const s = useRef({
    tracks: [] as Track[],
    current: -1,
    profileCache: {} as Record<string, { photo_url: string | null; nationality: string | null }>,
    currentPreviewStart: 0,
    currentPreviewDuration: 60,
    desiredPlayback: false,
    trackAdvanceLock: false,
    rewardedTrackId: null as string | null,
    liveBooted: false,
    listenerIdentity: null as string | null,
    unexpectedPauseTimer: null as ReturnType<typeof setTimeout> | null,
    user,
    coins,
    dailySecondsEarned: 0,
  });
  s.current.user = user;
  s.current.coins = coins;

  const [tracksLoaded, setTracksLoaded] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isPreLive, setIsPreLive] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [skipBusy, setSkipBusy] = useState(false);
  const [listenersCount, setListenersCount] = useState(0);
  const [dailySecondsEarned, setDailySecondsEarned] = useState(0);
  const [volume, setVolume] = useState<number>(APP_CONFIG.defaultVolume);
  const [muted, setMuted] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [title, setTitle] = useState("Loading...");
  const [artistName, setArtistName] = useState("—");
  const [artistPhoto, setArtistPhoto] = useState<string | null>(null);
  const [artistUserId, setArtistUserId] = useState<string | null>(null);
  const [genre, setGenre] = useState("");
  const [nationalityFlag, setNationalityFlag] = useState("");
  const [emptyRadio, setEmptyRadio] = useState(false);

  const isLoggedIn = Boolean(user);
  const currentTrack = s.current.tracks[s.current.current] || null;
  const isOwnTrack = Boolean(user?.id && currentTrack?.user_id && String(user.id) === String(currentTrack.user_id));

  useEffect(() => {
    s.current.dailySecondsEarned = dailySecondsEarned;
  }, [dailySecondsEarned]);

  useEffect(() => {
    const profileDate = normalizeSupabaseDate(profile?.daily_seconds_earned_date as string | undefined);
    const profileCount = Number(profile?.daily_seconds_earned);
    if (isCurrentSupabaseDailyDate(profileDate)) {
      setDailySecondsEarned(Number.isFinite(profileCount) && profileCount >= 0 ? profileCount : 0);
    } else if (profile) {
      setDailySecondsEarned(0);
    }
  }, [profile]);

  const updateEarnSecondsProgress = useCallback((seconds: number) => {
    const safeCurrent = Math.max(0, Number(seconds) || 0);
    const safeLimit = Math.max(1, DAILY_SECONDS_LIMIT);
    const percentage = Math.min((safeCurrent / safeLimit) * 100, 100);
    if (earnFillRef.current) earnFillRef.current.style.width = `${percentage}%`;
    if (earnCopyRef.current) {
      earnCopyRef.current.innerHTML = `Earn Seconds by listening the entire tune <strong class="earn-seconds-amount">${safeCurrent}/${safeLimit}</strong> today.`;
    }
  }, []);

  useEffect(() => {
    updateEarnSecondsProgress(dailySecondsEarned);
  }, [dailySecondsEarned, updateEarnSecondsProgress]);

  const setTimeDisplays = useCallback((elapsedSeconds: number, durationSeconds: number) => {
    if (elapsedRef.current) elapsedRef.current.textContent = formatTime(elapsedSeconds);
    if (durationRef.current) durationRef.current.textContent = formatTime(durationSeconds);
    if (miniTimeRef.current) miniTimeRef.current.textContent = `${formatTime(elapsedSeconds)} / ${formatTime(durationSeconds)}`;
  }, []);

  const renderTrackUI = useCallback(
    (track: Track) => {
      const enriched = s.current.tracks.find((t) => String(t.id) === String(track.id)) || track;
      const cached = s.current.profileCache[String(enriched.user_id || "")] || {};
      const photoUrl = enriched.photo_url || cached.photo_url || null;
      const nationality = enriched.nationality || cached.nationality || null;

      setTitle(enriched.title || "Untitled");
      setArtistName(enriched.artist || "Unknown");
      setArtistPhoto(photoUrl);
      setArtistUserId(enriched.user_id || null);
      setGenre(getTrackGenreLabel(enriched));
      setNationalityFlag(getFlagEmoji(nationality));

      s.current.currentPreviewStart = getTrackPreviewStart(track);
      s.current.currentPreviewDuration = getTrackPreviewDuration(track);
      setTimeDisplays(0, s.current.currentPreviewDuration);
      if (progressFillRef.current) progressFillRef.current.style.width = "0%";

      const likeKey = String(track.id);
      const likedIds = readLikedTrackIds();
      setLiked(likedIds.includes(likeKey));
    },
    [setTimeDisplays]
  );

  const setEmptyRadioState = useCallback(() => {
    setEmptyRadio(true);
    setTitle("No live tunes yet");
    setArtistName("Check back soon");
    setArtistUserId(null);
    setGenre("");
    setNationalityFlag("");
    if (progressFillRef.current) progressFillRef.current.style.width = "0%";
    setTimeDisplays(0, 60);
  }, [setTimeDisplays]);

  const persistSession = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const track = s.current.tracks[s.current.current] || null;
    const previewOffset = Math.max(0, (audio.currentTime || 0) - s.current.currentPreviewStart);
    saveRadioSession({
      startedDate: getTodayDateKey(),
      isStarted: isLive,
      isPlaying: isLive && !audio.paused,
      desiredPlaying: isLive && s.current.desiredPlayback,
      currentTrackId: track?.id || null,
      currentIndex: s.current.current,
      previewOffset,
      volume: getSafeVolume(audio.volume),
      muted: audio.muted,
    });
    try {
      localStorage.setItem(APP_CONFIG.radioVolumeKey, String(getSafeVolume(audio.volume)));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive]);

  const updatePauseButtonState = useCallback(() => {
    const audio = audioRef.current;
    setIsPlaying(Boolean(isLive && audio && !audio.paused));
  }, [isLive]);

  const clearUnexpectedPauseTimer = useCallback(() => {
    if (s.current.unexpectedPauseTimer) {
      clearTimeout(s.current.unexpectedPauseTimer);
      s.current.unexpectedPauseTimer = null;
    }
  }, []);

  const scheduleUnexpectedResume = useCallback(
    (delay = 180) => {
      clearUnexpectedPauseTimer();
      const audio = audioRef.current;
      if (!isLive || !s.current.desiredPlayback || !audio?.src) return;
      s.current.unexpectedPauseTimer = setTimeout(() => {
        const a = audioRef.current;
        if (!isLive || !s.current.desiredPlayback || !a?.src || !a.paused) return;
        a.play()
          .then(() => updatePauseButtonState())
          .catch(() => {});
      }, delay);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [isLive]
  );

  const chooseNextTrackIndex = useCallback(() => {
    const tracks = s.current.tracks;
    if (!tracks.length) return -1;
    let next;
    do {
      next = Math.floor(Math.random() * tracks.length);
    } while (tracks.length > 1 && next === s.current.current);
    return next;
  }, []);

  const incrementPlayCount = useCallback((track: Track) => {
    if (!track?.id) return;
    const supabase = getSupabaseClient();
    supabase
      .from("tracks")
      .update({ play_count: (track.play_count || 0) + 1 })
      .eq("id", track.id)
      .then(async () => {
        track.play_count = (track.play_count || 0) + 1;
        const { error } = await supabase.rpc("increment_track_daily_streams", {
          p_track_id: track.id,
          p_amount: 1,
        });
        if (error) console.error("increment_track_daily_streams error:", error);
      })
      .then(undefined, (err) => console.error("incrementPlayCount error:", err));
  }, []);

  const playTrackAt = useCallback(
    (index: number, previewOffset = 0, countPlay = true, autoplay = s.current.desiredPlayback) => {
      const track = s.current.tracks[index];
      const audio = audioRef.current;
      if (index < 0 || !track || !audio) return;

      s.current.current = index;
      s.current.desiredPlayback = Boolean(autoplay);
      setEmptyRadio(false);

      const previewStart = getTrackPreviewStart(track);
      const previewDuration = getTrackPreviewDuration(track);
      const safeOffset = Math.max(0, Math.min(previewOffset, Math.max(previewDuration - 0.25, 0)));
      const targetStartTime = previewStart + safeOffset;

      renderTrackUI(track);
      audio.src = track.file_url;
      audio.autoplay = Boolean(autoplay);
      setTimeDisplays(safeOffset, previewDuration);
      if (progressFillRef.current) {
        progressFillRef.current.style.width = `${previewDuration > 0 ? (safeOffset / previewDuration) * 100 : 0}%`;
      }

      audio.onloadedmetadata = () => {
        const maxStart = Math.max(0, (audio.duration || targetStartTime) - 0.25);
        const clampedStart = Math.min(targetStartTime, maxStart);
        try {
          audio.currentTime = clampedStart;
        } catch (e) {
          console.error("set currentTime error:", e);
        }

        if (autoplay) {
          audio.play().catch((err) => {
            console.log("audio play blocked:", err);
            scheduleUnexpectedResume(260);
          });
        } else {
          clearUnexpectedPauseTimer();
          audio.pause();
          updatePauseButtonState();
        }
      };

      persistSession();
      if (countPlay) incrementPlayCount(track);
    },
    [renderTrackUI, persistSession, incrementPlayCount, scheduleUnexpectedResume, clearUnexpectedPauseTimer, updatePauseButtonState, setTimeDisplays]
  );

  const nextTrack = useCallback(
    (previewOffset = 0, countPlay = true, autoplay = s.current.desiredPlayback) => {
      if (!s.current.tracks.length) {
        setEmptyRadioState();
        return;
      }
      const nextIndex = chooseNextTrackIndex();
      playTrackAt(nextIndex, previewOffset, countPlay, autoplay);
    },
    [chooseNextTrackIndex, playTrackAt, setEmptyRadioState]
  );

  const awardListeningSecond = useCallback(async (): Promise<boolean> => {
    if (!s.current.user) return false;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc("award_listening_second_v2", {});
    if (error || !data) {
      console.error("awardListeningSecond error:", error);
      return false;
    }
    if (!data.success) {
      if (typeof data.daily_seconds_earned !== "undefined") {
        setDailySecondsEarned(Number(data.daily_seconds_earned) || 0);
      }
      return false;
    }
    const newCoins = Number(data.coins) || 0;
    const newDaily = Number(data.daily_seconds_earned) || 0;
    setDailySecondsEarned(newDaily);
    broadcastCurrencyUpdate(newCoins, newDaily);

    if (newDaily >= DAILY_SECONDS_LIMIT) {
      refreshProfile().catch((err) => console.error("seconds threshold refresh error:", err));
    }
    return true;
  }, [refreshProfile]);

  const advanceAfterTrackCompletion = useCallback(async () => {
    if (s.current.trackAdvanceLock) return;
    const track = s.current.tracks[s.current.current] || null;
    const trackId = track?.id || null;
    if (trackId && s.current.rewardedTrackId === trackId) return;

    s.current.trackAdvanceLock = true;
    if (trackId) s.current.rewardedTrackId = trackId;
    try {
      await awardListeningSecond();
      nextTrack(0, true, true);
    } finally {
      s.current.trackAdvanceLock = false;
    }
  }, [awardListeningSecond, nextTrack]);

  const getListenerIdentity = useCallback(async (): Promise<string> => {
    if (s.current.user?.id) return s.current.user.id;
    let anonId = localStorage.getItem("listener_id");
    if (!anonId) {
      anonId = crypto.randomUUID();
      localStorage.setItem("listener_id", anonId);
    }
    return anonId;
  }, []);

  const registerListener = useCallback(async () => {
    try {
      if (!isLive) return;
      if (!s.current.listenerIdentity) {
        s.current.listenerIdentity = await getListenerIdentity();
      }
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("listeners")
        .upsert([{ user_id: s.current.listenerIdentity, last_seen: new Date().toISOString() }], {
          onConflict: "user_id",
        });
      if (error) console.error("registerListener error:", error);
    } catch (err) {
      console.error("registerListener crash:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive]);

  const updateListeners = useCallback(async () => {
    try {
      if (isLive) await registerListener();
      const supabase = getSupabaseClient();
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from("listeners")
        .select("id", { count: "exact", head: true })
        .gt("last_seen", fiveMinutesAgo);
      if (error) {
        console.error("updateListeners error:", error);
        return;
      }
      if (count !== null) setListenersCount(count);
    } catch (err) {
      console.error("updateListeners crash:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, registerListener]);

  const loadTracksFromSupabase = useCallback(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("tracks")
      .select(
        "id, title, artist, file_url, user_id, play_count, status, created_at, preview_start_seconds, preview_duration_seconds, genre_primary, genre_secondary"
      )
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("loadTracksFromSupabase error:", error);
      s.current.tracks = [];
      return;
    }

    s.current.tracks = (data || []).map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      file_url: track.file_url,
      user_id: track.user_id || null,
      play_count: track.play_count || 0,
      preview_start_seconds: track.preview_start_seconds,
      preview_duration_seconds: track.preview_duration_seconds,
      genre_primary: track.genre_primary || null,
      genre_secondary: track.genre_secondary || null,
      nationality: null,
    }));
  }, []);

  const loadTrackNationalities = useCallback(async () => {
    try {
      const userIds = Array.from(new Set(s.current.tracks.map((t) => t.user_id).filter(Boolean)));
      if (!userIds.length) return;
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("public_artist_profiles")
        .select("user_id, nationality, photo_url")
        .in("user_id", userIds as string[]);
      if (error || !data) return;

      const byUserId = new Map(data.map((row) => [String(row.user_id), row]));
      data.forEach((row) => {
        if (row.user_id) {
          s.current.profileCache[String(row.user_id)] = {
            photo_url: row.photo_url || null,
            nationality: row.nationality || null,
          };
        }
      });
      s.current.tracks = s.current.tracks.map((track) => {
        const p = byUserId.get(String(track.user_id || ""));
        return {
          ...track,
          nationality: track.nationality || p?.nationality || null,
          photo_url: track.photo_url || p?.photo_url || null,
        };
      });

      const current = s.current.tracks[s.current.current];
      if (current) renderTrackUI(current);
    } catch (err) {
      console.error("loadTrackNationalities error:", err);
    }
  }, [renderTrackUI]);

  const bootstrapLiveRadio = useCallback(async () => {
    await loadTracksFromSupabase();
    await loadTrackNationalities();
    setTracksLoaded(true);

    if (!s.current.tracks.length) {
      setEmptyRadioState();
      await updateListeners();
      return;
    }

    const audio = audioRef.current;
    const storedVolume = typeof window !== "undefined" ? localStorage.getItem(APP_CONFIG.radioVolumeKey) : null;
    const safeVolume = getSafeVolume(storedVolume ?? APP_CONFIG.defaultVolume);
    setVolume(safeVolume);
    if (audio) {
      audio.volume = safeVolume;
      audio.muted = safeVolume === 0;
    }
    setMuted(safeVolume === 0);

    const session = getSavedRadioSession();
    if (session?.isStarted && session?.startedDate === getTodayDateKey()) {
      setIsLive(true);
      s.current.desiredPlayback = getDesiredSessionPlayback(session);
      setIsPreLive(false);

      let index = s.current.tracks.findIndex((t) => String(t.id) === String(session.currentTrackId || ""));
      if (index < 0) index = Number.isInteger(session.currentIndex) ? (session.currentIndex as number) : chooseNextTrackIndex();
      if (index < 0) index = chooseNextTrackIndex();
      playTrackAt(index, Number(session.previewOffset) || 0, false, s.current.desiredPlayback);
    } else {
      setIsLive(false);
      s.current.desiredPlayback = false;
      setIsPreLive(true);
      const previewIndex = chooseNextTrackIndex();
      if (previewIndex >= 0) playTrackAt(previewIndex, 0, false, false);
    }

    s.current.liveBooted = true;
    await updateListeners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartRadio = useCallback(async () => {
    setIsLive(true);
    s.current.desiredPlayback = true;
    s.current.listenerIdentity = null;
    setIsPreLive(false);

    saveRadioSession({ startedDate: getTodayDateKey(), isStarted: true, isPlaying: true, desiredPlaying: true });

    const audio = audioRef.current;
    if (audio && !audio.src && s.current.tracks.length) {
      const nextIndex = chooseNextTrackIndex();
      const previewDuration = nextIndex >= 0 ? getTrackPreviewDuration(s.current.tracks[nextIndex]) : 60;
      const randomOffset = Math.floor(Math.random() * Math.max(previewDuration, 1));
      playTrackAt(nextIndex, randomOffset, false, true);
    }

    if (audio) {
      const startVolume = getSafeVolume(volume);
      audio.volume = startVolume;
      audio.muted = startVolume === 0;
      audio.play().catch((err) => console.error("Start Radio play error:", err));
    }

    updatePauseButtonState();
    persistSession();

    try {
      await registerListener();
    } catch {
      // ignore
    }
    try {
      await updateListeners();
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume]);

  const handlePauseToggle = useCallback(() => {
    const audio = audioRef.current;
    if (!isLive || !audio) return;
    if (audio.paused) {
      s.current.desiredPlayback = true;
      clearUnexpectedPauseTimer();
      audio.play().catch((err) => {
        console.error("resume error:", err);
        scheduleUnexpectedResume(260);
      });
    } else {
      s.current.desiredPlayback = false;
      clearUnexpectedPauseTimer();
      audio.pause();
    }
    updatePauseButtonState();
    persistSession();
  }, [isLive, clearUnexpectedPauseTimer, scheduleUnexpectedResume, updatePauseButtonState, persistSession]);

  const handleSkip = useCallback(async () => {
    if (!s.current.user || s.current.coins < SKIP_COST) return;
    setSkipBusy(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc("skip_track_cost");
      if (error || !data) {
        console.error("handleSkip rpc error:", error);
        return;
      }
      if (!data.success) return;
      broadcastCurrencyUpdate(Number(data.coins) || 0, s.current.dailySecondsEarned);
      nextTrack(0, true, s.current.desiredPlayback);
    } finally {
      setSkipBusy(false);
    }
  }, [nextTrack]);

  const handleLike = useCallback(async () => {
    if (!s.current.user || isOwnTrack) return;
    const track = s.current.tracks[s.current.current] || null;
    const likeKey = track?.id ? String(track.id) : "";
    if (!track || !likeKey) return;

    setLikeBusy(true);
    try {
      const result = await toggleTrackLikeInSupabase({
        trackId: likeKey,
        artistUserId: track.user_id,
        likerUserId: s.current.user.id,
      });
      if (result.error && !result.ownTrack) throw result.error;

      const likedIds = new Set(readLikedTrackIds());
      if (result.liked) likedIds.add(likeKey);
      else likedIds.delete(likeKey);
      writeLikedTrackIds([...likedIds]);
      setLiked(result.liked);
    } catch (err) {
      console.error("handleLike error:", err);
    } finally {
      setLikeBusy(false);
    }
  }, [isOwnTrack]);

  const handleVolumeChange = useCallback(
    (value: number) => {
      const audio = audioRef.current;
      const v = getSafeVolume(value);
      setVolume(v);
      if (audio) {
        audio.volume = v;
        audio.muted = v === 0;
      }
      setMuted(v === 0);
      try {
        localStorage.setItem(APP_CONFIG.radioVolumeKey, String(v));
      } catch {
        // ignore
      }
      persistSession();

      if (volumeAutoCloseTimer.current) clearTimeout(volumeAutoCloseTimer.current);
      volumeAutoCloseTimer.current = setTimeout(() => setVolumeOpen(false), VOLUME_AUTO_CLOSE_MS);
    },
    [persistSession]
  );

  const toggleVolumeControl = useCallback(() => {
    setVolumeOpen((open) => {
      const next = !open;
      if (next) {
        if (volumeAutoCloseTimer.current) clearTimeout(volumeAutoCloseTimer.current);
        volumeAutoCloseTimer.current = setTimeout(() => setVolumeOpen(false), VOLUME_AUTO_CLOSE_MS);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    bootstrapLiveRadio().catch((err) => console.error("bootstrapLiveRadio error:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const heartbeat = setInterval(() => {
      if (isLive && !document.hidden) registerListener();
    }, REFRESH_INTERVALS.listenerHeartbeat);
    const countTimer = setInterval(() => {
      updateListeners();
    }, REFRESH_INTERVALS.listenerCount);
    const reloadTimer = setInterval(() => {
      loadTracksFromSupabase().catch((err) => console.error(err));
    }, REFRESH_INTERVALS.tracksReload);

    return () => {
      clearInterval(heartbeat);
      clearInterval(countTimer);
      clearInterval(reloadTimer);
    };
  }, [isLive, registerListener, updateListeners, loadTracksFromSupabase]);

  // Connects the Web Audio analyser exactly once for the lifetime of the
  // <audio> element (which itself lives here in the provider and is never
  // remounted). A MediaElementSourceNode can only ever be created once per
  // media element, so this must NOT live in the Waveform component, which
  // mounts/unmounts as the user navigates to and from the homepage.
  const connectAnalyser = useCallback(() => {
    if (audioCtxConnectedRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;
    try {
      const AudioContextCtor =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioContextCtor();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      const source = audioCtx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      analyserRef.current = analyser;
      audioCtxConnectedRef.current = true;
    } catch (e) {
      console.warn("[radio engine] Web Audio connect error:", (e as Error).message);
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      const previewElapsed = Math.max(0, (audio.currentTime || 0) - s.current.currentPreviewStart);
      const clampedElapsed = Math.min(previewElapsed, s.current.currentPreviewDuration);
      if (progressFillRef.current) {
        progressFillRef.current.style.width = `${
          s.current.currentPreviewDuration > 0 ? (clampedElapsed / s.current.currentPreviewDuration) * 100 : 0
        }%`;
      }
      setTimeDisplays(clampedElapsed, s.current.currentPreviewDuration);
      persistSession();

      if (previewElapsed >= s.current.currentPreviewDuration) {
        advanceAfterTrackCompletion().catch((err) => console.error("advanceAfterTrackCompletion error:", err));
      }
    };
    const onPlay = () => {
      connectAnalyser();
      clearUnexpectedPauseTimer();
      updatePauseButtonState();
      persistSession();
    };
    const onPause = () => {
      updatePauseButtonState();
      persistSession();
      if (!document.hidden && s.current.desiredPlayback) scheduleUnexpectedResume(220);
    };
    const onEnded = () => {
      advanceAfterTrackCompletion().catch((err) => console.error("advanceAfterTrackCompletion error:", err));
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [advanceAfterTrackCompletion, persistSession, clearUnexpectedPauseTimer, updatePauseButtonState, scheduleUnexpectedResume, setTimeDisplays, connectAnalyser]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        persistSession();
        return;
      }
      if (isLive) registerListener().catch(() => {});
      updateListeners().catch(() => {});
    };
    const onFocus = () => {
      if (isLive) registerListener().catch(() => {});
      updateListeners().catch(() => {});
    };
    const onBeforeUnload = () => {
      clearUnexpectedPauseTimer();
      persistSession();
    };
    const resumeIfNeeded = () => {
      const audio = audioRef.current;
      if (!isLive || !s.current.desiredPlayback || !audio?.src || !audio.paused) return;
      audio
        .play()
        .then(() => updatePauseButtonState())
        .catch(() => {});
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onBeforeUnload);
    ["touchstart", "pointerdown", "click"].forEach((name) =>
      document.addEventListener(name, resumeIfNeeded, { passive: true })
    );

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onBeforeUnload);
      ["touchstart", "pointerdown", "click"].forEach((name) => document.removeEventListener(name, resumeIfNeeded));
    };
  }, [isLive, registerListener, updateListeners, persistSession, clearUnexpectedPauseTimer, updatePauseButtonState]);

  const skipDisabled = !isLoggedIn || coins < SKIP_COST || skipBusy;
  const likeDisabled = !isLoggedIn || isOwnTrack || likeBusy;
  const volumePct = useMemo(() => Math.round((volume / 1) * 100), [volume]);
  const profileHref = artistUserId ? `/artist?user_id=${encodeURIComponent(artistUserId)}` : null;

  const value: RadioContextValue = {
    audioRef,
    analyserRef,
    progressFillRef,
    elapsedRef,
    durationRef,
    earnFillRef,
    earnCopyRef,
    miniTimeRef,
    tracksLoaded,
    isLive,
    isPreLive,
    isPlaying,
    liked,
    likeBusy,
    skipBusy,
    listenersCount,
    dailySecondsEarned,
    volume,
    muted,
    volumeOpen,
    title,
    artistName,
    artistPhoto,
    artistUserId,
    genre,
    nationalityFlag,
    emptyRadio,
    isOwnTrack,
    isLoggedIn,
    skipDisabled,
    likeDisabled,
    volumePct,
    profileHref,
    handleStartRadio,
    handlePauseToggle,
    handleSkip,
    handleLike,
    handleVolumeChange,
    toggleVolumeControl,
  };

  return (
    <RadioContext.Provider value={value}>
      {children}
      <audio ref={audioRef} id="audio" playsInline crossOrigin="anonymous" />
    </RadioContext.Provider>
  );
}

export function useRadio(): RadioContextValue {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error("useRadio must be used within a RadioProvider");
  return ctx;
}
