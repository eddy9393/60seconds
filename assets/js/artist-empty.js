export function showEmptyArtistState() {
  const el = document.getElementById("artist-container");
  if (!el) return;
  el.innerHTML = `
    <div style="text-align:center;padding:80px 20px;">
      <h2>Create your artist profile</h2>
      <p>Start sharing your music with the world.</p>
      <button onclick="window.location.href='/edit-profile.html'">
        Create artist profile
      </button>
    </div>
  `;
}