

const menu = document.querySelector(".menu-container");
const options = menu.querySelectorAll(".menu-option");
const contentGroups = menu.querySelectorAll(".menu-content")
let prevOptionIndex = 0;
let optionContent = {};


function selectOption(i) {
  if (i === prevOptionIndex || !options[i] || !contentGroups[i]) {
    return;
  }

  options[i].classList.add("menu-option-selected");
  options[prevOptionIndex].classList.remove("menu-option-selected");

  contentGroups[prevOptionIndex].classList.remove("menu-content-shown");
  contentGroups[prevOptionIndex].classList.add("menu-content-hidden");
  contentGroups[i].classList.remove("menu-content-hidden");
  contentGroups[i].classList.add("menu-content-shown");

  prevOptionIndex = i;
}


for (let i = 0; i < options.length; i++) {
  options[i].addEventListener("click", () => {
    selectOption(i);
    // so a reload, a shared link, or the season picker comes back to this tab
    // instead of dropping the reader on the first one
    history.replaceState(null, "", `#${contentGroups[i].id}`);
  });
}


// The tabs are rendered server-side and switched here, so a link to #schedule
// would otherwise land on the default tab with the anchor doing nothing.
const openTab = [...contentGroups].findIndex(group => `#${group.id}` === location.hash);
if (openTab > 0) {
  selectOption(openTab);
}
