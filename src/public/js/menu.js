


const menu = document.querySelector(".menu-container");
const options = menu.querySelectorAll(".menu-option");
const contentGroups = menu.querySelectorAll(".menu-content")
let prevOptionIndex = 0;
let optionContent = {};



for (let i = 0; i < options.length; i++) {
  const option = options[i]
  option.addEventListener("click", (e) => {

    if (i != prevOptionIndex) {
      option.classList.add("menu-option-selected");
      options[prevOptionIndex].classList.remove("menu-option-selected");

      contentGroups[prevOptionIndex].classList.remove("menu-content-shown");
      contentGroups[prevOptionIndex].classList.add("menu-content-hidden");
      contentGroups[i].classList.remove("menu-content-hidden");
      contentGroups[i].classList.add("menu-content-shown");

      prevOptionIndex = i;
    }
  });
}

