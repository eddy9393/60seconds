"use client";

import Link from "next/link";
import Image from "next/image";
import { useRadio } from "@/hooks/useRadioEngine";
import { formatNumber } from "@/lib/radio";
import Waveform from "./Waveform";
import FeaturedArtists from "./FeaturedArtists";
import NewsFeed from "./NewsFeed";
import TopSupporters from "./TopSupporters";

export default function RadioPlayer() {
  const {
    audioRef,
    analyserRef,
    progressFillRef,
    elapsedRef,
    durationRef,
    earnCopyRef,
    tracksLoaded,
    isPreLive,
    isPlaying,
    liked,
    listenersCount,
    volume,
    muted,
    volumeOpen,
    title,
    artistName,
    artistPhoto,
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
  } = useRadio();

  return (
    <div className="content-layout">
      <div className="radio-col">
        <div className="radio-stage">
          {isPreLive && (
            <div id="startOverlay" className="start-overlay">
              <div className="overlay-content">
                <h1 className="overlay-title">Ready to tune in?</h1>
                <p className="overlay-subcopy">
                  You&rsquo;re just a minute away from discovering your next favorite artist
                </p>
                <div className="start-btn-wrap">
                  <button
                    id="start"
                    className="start-btn"
                    type="button"
                    onClick={handleStartRadio}
                    disabled={!tracksLoaded}
                  >
                    Start Radio
                  </button>
                </div>
              </div>
            </div>
          )}

          <div id="radioShell" className={`radio-shell${isPreLive ? " pre-live" : ""}`}>
            <div id="player" className="radio-shell-content">
              <div className="now-playing">Now Playing</div>

              <div className="tune-title-row">
                <h2 id="title" className="tune-title">
                  {title}
                </h2>
                {genre && (
                  <span id="trackGenre" className="tune-genre">
                    {genre}
                  </span>
                )}
                {nationalityFlag && (
                  <span id="nationalityBadge" className="tune-genre tune-nationality">
                    {nationalityFlag}
                  </span>
                )}
              </div>

              <p id="artistWrap" className="artist-wrap">
                {emptyRadio ? (
                  <span id="artist">{artistName}</span>
                ) : profileHref ? (
                  <Link id="artist" className="artist-link" href={profileHref}>
                    {artistPhoto ? (
                      <Image
                        className="artist-player-photo"
                        src={artistPhoto}
                        alt=""
                        width={32}
                        height={32}
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="artist-player-photo artist-player-photo--fallback">
                        {(artistName || "A").charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="artist-name-text">{artistName}</span>
                  </Link>
                ) : (
                  <span id="artist" className="artist-inline">
                    {artistPhoto ? (
                      <Image
                        className="artist-player-photo"
                        src={artistPhoto}
                        alt=""
                        width={32}
                        height={32}
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="artist-player-photo artist-player-photo--fallback">
                        {(artistName || "A").charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="artist-name-text">{artistName}</span>
                  </span>
                )}
              </p>

              <Waveform audioRef={audioRef} analyserRef={analyserRef} isPaused={!isPlaying} />

              {isLoggedIn && (
                <div id="earnSecondsWrap" className="earn-seconds-wrap">
                  <span id="earnSecondsCopy" ref={earnCopyRef} className="earn-seconds-copy-inline" />
                </div>
              )}

              <div className="time-row">
                <span id="elapsedTime" ref={elapsedRef}>
                  0:00
                </span>
                <span id="durationTime" ref={durationRef}>
                  1:00
                </span>
              </div>

              <div className="progress">
                <div className="fill" id="progress" ref={progressFillRef} />
              </div>

              <div className="player-actions">
                <div className="pcb">
                  <button
                    id="likeBtn"
                    className={`pcb-btn${liked ? " liked is-liked" : ""}${isOwnTrack ? " like-own-disabled" : ""}`}
                    type="button"
                    aria-label={isOwnTrack ? "You cannot like your own track" : liked ? "Unlike track" : "Like track"}
                    aria-pressed={liked}
                    disabled={likeDisabled}
                    onClick={handleLike}
                  >
                    <Image
                      src="/icons/like.png"
                      alt=""
                      width={20}
                      height={20}
                      className="btn-icon-img like-icon"
                      aria-hidden="true"
                    />
                  </button>
                  <div className="pcb-divider" />
                  <button
                    id="pauseBtn"
                    className={`pcb-btn pcb-play${isPlaying ? " is-playing" : ""}`}
                    type="button"
                    aria-label={isPlaying ? "Pause" : "Play"}
                    onClick={handlePauseToggle}
                  >
                    <Image
                      id="playPauseIcon"
                      src={isPlaying ? "/icons/pause.png" : "/icons/play.png"}
                      alt=""
                      width={22}
                      height={22}
                      className="player-icon-img"
                    />
                  </button>
                  <div className="pcb-divider" />
                  <button
                    id="skip"
                    className="pcb-btn"
                    type="button"
                    aria-label="Skip"
                    disabled={skipDisabled}
                    onClick={handleSkip}
                  >
                    <Image src="/icons/skip.png" alt="" width={22} height={22} className="player-icon-img" />
                  </button>
                  <div className="pcb-divider" />
                  <div id="volumeControl" className={`volume-control pcb-vol${volumeOpen ? " open" : ""}`}>
                    <button
                      id="volumeBtn"
                      className="pcb-btn"
                      type="button"
                      aria-label="Volume"
                      onClick={toggleVolumeControl}
                    >
                      <Image
                        id="volumeIcon"
                        src={muted ? "/icons/mute.png" : "/icons/vol-high.png"}
                        alt=""
                        width={22}
                        height={22}
                        className="player-icon-img"
                      />
                    </button>
                    <div className="volume-slider-inline">
                      <input
                        id="volume"
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        style={{ ["--volume-fill" as string]: `${volumePct}%` }}
                        onChange={(e) => handleVolumeChange(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {!isLoggedIn && (
                <div id="featureNote" className="feature-note">
                  These features are only available with an account.
                </div>
              )}

              <div className="listeners-pill">
                <span className="listeners-dot" />
                <svg className="listeners-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="7.5" cy="6.5" r="2.5" fill="currentColor" />
                  <path d="M2 16c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="14" cy="6" r="2" fill="currentColor" opacity="0.6" />
                  <path
                    d="M16 16c0-2.5 1.5-4 3-4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    opacity="0.6"
                  />
                </svg>
                <span id="listenersCount">{formatNumber(listenersCount)} Listeners</span>
              </div>
            </div>
          </div>
        </div>

        <FeaturedArtists />
      </div>

      <aside className="community-col">
        <NewsFeed />
        <TopSupporters />
      </aside>

      {!isLoggedIn && (
        <section id="conceptSection" className="concept-section">
          <div className="concept-card">
            <div className="concept-kicker">✨ Discover More</div>
            <h2 className="concept-title">What is 60 Seconds?</h2>
            <p className="concept-copy">
              60 Seconds is an online radio specifically designed to help you discover your new favorite song or
              artist in seconds! We live in a fast-paced world nowadays, so that requires peak moments only. This is
              the place where artists showcase exactly that.
            </p>
            <p className="concept-copy">In other words: only the moments that hit right away.</p>
            <div className="join-prompt">Are you an artist yourself?</div>
            <p className="concept-copy">
              Well… welcome aboard! You deserve a platform to showcase your most iconic minute of music without
              feeling the need to create the next viral TikTok around your music. Let musicians be musicians is what
              60 Seconds stands for.
            </p>
            <p className="concept-copy">And you know what?! It is free and it will always be free.</p>
            <p className="concept-copy">
              There is one condition though… Give your fellow musicians the support you would want them to give you.
              Let&rsquo;s make this a platform where we can grow as one. We all have the same passion after all.
            </p>
            <p className="concept-copy">
              So, the more support you give by listening, sharing, or promoting, the more support you get in return.
              This will all be earned in Seconds{" "}
              <Image src="/coin.webp" alt="Seconds coin" width={18} height={18} className="concept-inline-coin" />.
              With Seconds, you can personalize your promotion plan the way you want.
            </p>
            <p className="concept-copy concept-copy--final">So what are you waiting for? 🎵</p>
            <div className="join-cta-wrap">
              <Link id="joinBtn" className="start-btn" href="/login">
                Join 60 Seconds now
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
