import { checkConnection } from "./supabase.js";

const status = document.getElementById("status");

try {
  await checkConnection();
  status.textContent = "已連線到 Supabase";
  status.dataset.state = "ok";
} catch (err) {
  status.textContent = `連線失敗：${err.message}`;
  status.dataset.state = "error";
}
