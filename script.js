// Toggle dropdown menu
const menuBtn = document.querySelector(".menu-btn");
const dropdown = document.querySelector(".dropdown");

menuBtn.addEventListener("click", () => {
  dropdown.style.display = dropdown.style.display === "flex" ? "none" : "flex";
  dropdown.style.flexDirection = "column";
});
