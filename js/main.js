import { loadAll } from "./data.js";
import { showRead } from "./read.js";
import { showQuiz } from "./quiz.js";

const app = document.getElementById("app");
const modeLinks = document.querySelectorAll(".modes a");
let data = null;

// 網址：#read、#read?unit=1、#quiz
function route() {
  const [mode, query = ""] = location.hash.slice(1).split("?");
  const current = mode === "quiz" ? "quiz" : "read";
  modeLinks.forEach((a) => {
    if (a.dataset.mode === current) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  if (current === "quiz") showQuiz(app, data);
  else showRead(app, data, new URLSearchParams(query));
  window.scrollTo(0, 0);
}

try {
  data = await loadAll();
  window.addEventListener("hashchange", route);
  route();
} catch (err) {
  app.replaceChildren(Object.assign(document.createElement("p"), {
    className: "status",
    textContent: `載入題庫失敗：${err.message}`,
  }));
}
