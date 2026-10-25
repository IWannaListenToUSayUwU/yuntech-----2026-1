import { loadAll } from "./data.js";
import { showRead } from "./read.js";
import { showQuiz } from "./quiz.js";
import { showUpload } from "./upload.js";

const app = document.getElementById("app");
const modeLinks = document.querySelectorAll(".modes a");
let data = null;

// 信箱拆開組，原始碼裡不會出現完整地址，比較不會被收集垃圾信的程式抓到
const contact = document.getElementById("contact");
const email = ["A11523021", "yuntech.edu.tw"].join("@");
contact.href = `mailto:${email}`;
contact.title = email;

// 網址：#read、#read?unit=1、#quiz、#upload
function route() {
  const [mode, query = ""] = location.hash.slice(1).split("?");
  const current = ["quiz", "upload"].includes(mode) ? mode : "read";
  modeLinks.forEach((a) => {
    if (a.dataset.mode === current) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  if (current === "quiz") showQuiz(app, data);
  else if (current === "upload") showUpload(app);
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
