// 重新產生上傳頁的示範 GIF（img/upload-demo.gif）。需要 playwright 和 ffmpeg：
//   node scripts/demo/render.mjs
//   ffmpeg -framerate 15 -i scripts/demo/frames/f%04d.png -vf "split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" -loop 0 img/upload-demo.gif
import { chromium } from "playwright";
import { mkdirSync, rmSync } from "node:fs";
const here = new URL(".", import.meta.url).pathname;
const dir = here + "frames"; rmSync(dir, { recursive: true, force: true }); mkdirSync(dir);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 720, height: 470 }, deviceScaleFactor: 1 });
p.on("pageerror", e => console.log("pageerror", e.message));
await p.goto("file://" + here + "anim.html");
const FPS = 15, END = 15.5; let n = 0;
for (let t = 0; t <= END; t += 1 / FPS) {
  await p.evaluate((t) => render(t), t);
  await p.screenshot({ path: `${dir}/f${String(n++).padStart(4, "0")}.png` });
}
await b.close(); console.log("frames", n);
