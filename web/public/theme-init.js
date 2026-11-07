// Apply the saved colour theme before first paint (avoids a light/dark flash).
// Kept as an external file so the Content-Security-Policy can forbid inline scripts.
try {
  var t = localStorage.getItem("ffa.theme") || "system";
  if (t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.documentElement.classList.add("dark");
  }
} catch (e) {
  /* storage unavailable: fall back to light */
}
