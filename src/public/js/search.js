// Lives in its own file rather than inline: the Content-Security-Policy sets
// script-src 'self', so an inline <script> block is refused by the browser and
// the search box silently stops responding.

const form = document.querySelector("#search");
const input = form.querySelector("input");
const searchIcon = form.querySelector("#search-icon");

function submitSearch() {
  const query = input.value.trim();
  if (query === "") {
    return;
  }
  // encoded so queries containing / ? or # reach the route intact
  document.location.pathname = `/search/${encodeURIComponent(query)}`;
}

searchIcon.addEventListener("click", submitSearch);

form.addEventListener("submit", event => {
  event.preventDefault();
  submitSearch();
});
