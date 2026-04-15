
// V4.1 TRUE STABLE FIX

let isRefreshing = false;

async function refreshWholePage() {
  try {
    setArtistStatus("Loading artist...");

    if (typeof loadArtist === "function") {
      await loadArtist();
    }

    if (typeof loadTracks === "function") {
      await loadTracks();
    }

  } catch (err) {
    console.error("REFRESH ERROR:", err);

    document.getElementById("artist-container").innerHTML = `
      <div class="empty-state">
        <h2>Artist not available</h2>
        <p>Something went wrong loading this page.</p>
      </div>
    `;
  } finally {
    setArtistStatus("", false);
  }
}

supabaseClient.auth.onAuthStateChange(() => {
  if (isRefreshing) return;

  isRefreshing = true;

  refreshWholePage()
    .catch((err) => console.error(err))
    .finally(() => {
      isRefreshing = false;
    });
});
