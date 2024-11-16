export function goToStartPageListener(id = "back-button") {
  document.getElementById(id).addEventListener("click", () => {
    window.location.href = "/index.html"; // Navigate back to index.html
  });

}
