
// STABLE FIX v4

let isRefreshing = false;

supabaseClient.auth.onAuthStateChange(() => {
  if (isRefreshing) return;

  isRefreshing = true;

  refreshWholePage()
    .catch((err) => {
      console.error(err);
    })
    .finally(() => {
      isRefreshing = false;
    });
});
