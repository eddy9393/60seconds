const { getSupabaseClient } = window.SSFMApp;
const supabaseClient = getSupabaseClient();
const feedbackEl = document.getElementById('feedback');
const subtitleEl = document.getElementById('confirmSubtitle');

function setFeedback(message = '', type = '') {
  if (!feedbackEl) return;
  feedbackEl.textContent = message;
  feedbackEl.className = 'auth-feedback';
  if (type) feedbackEl.classList.add(type);
}

async function initConfirmPage() {
  const url = new URL(window.location.href);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') || 'signup';
  const next = url.searchParams.get('next') || 'join.html';

  if (tokenHash) {
    const { error } = await supabaseClient.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) {
      console.error('verifyOtp error:', error);
      subtitleEl.textContent = 'This activation link is invalid or expired.';
      setFeedback(error.message || 'This activation link is invalid or expired.', 'error');
      return;
    }

    subtitleEl.textContent = 'Your account is confirmed. Redirecting...';
    setFeedback('Account confirmed successfully. Redirecting...', 'success');
    window.history.replaceState({}, document.title, 'confirm.html');
    setTimeout(() => {
      window.location.href = next;
    }, 800);
    return;
  }

  // Fallback for legacy ConfirmationURL flows that return tokens in the URL hash.
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  const hashParams = new URLSearchParams(hash);
  if (hashParams.get('error')) {
    subtitleEl.textContent = 'This activation link is invalid or expired.';
    setFeedback(hashParams.get('error_description') || 'This activation link is invalid or expired.', 'error');
    window.history.replaceState({}, document.title, 'confirm.html');
    return;
  }

  subtitleEl.textContent = 'No activation token was found.';
  setFeedback('No activation token was found in this link.', 'error');
}

initConfirmPage().catch((err) => {
  console.error('confirm init error:', err);
  setFeedback('Something went wrong while confirming your account.', 'error');
});
