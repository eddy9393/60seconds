// Existing app.js content assumed above

// === SLOGAN ADDITION ===
// Ensure this runs after logoElement is defined

(function addSlogan() {
  const logoElement = document.querySelector('[data-logo], .logo, #logo');
  if (!logoElement) return;

  if (document.querySelector('.site-slogan')) return;

  const slogan = document.createElement('div');
  slogan.className = 'site-slogan';
  slogan.textContent = "Let musicians be musicians";

  slogan.style.fontSize = "12px";
  slogan.style.letterSpacing = "0.18em";
  slogan.style.opacity = "0.6";
  slogan.style.marginTop = "6px";
  slogan.style.textTransform = "uppercase";
  slogan.style.fontWeight = "500";

  logoElement.parentNode.appendChild(slogan);
})();
