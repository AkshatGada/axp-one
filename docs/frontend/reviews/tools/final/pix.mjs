// Sample pixels from a PNG (via a headless canvas) and report contrast against white: node pix.mjs file.png x,y x,y ...
import fs from "node:fs";
import { launch } from "./lib.mjs";
const [file, ...pts] = process.argv.slice(2);
const b = await launch(); const p = await (await b.newContext()).newPage();
const res = await p.evaluate(async ({ data, pts }) => {
  const img = new Image(); img.src = "data:image/png;base64," + data; await img.decode();
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const x = c.getContext("2d"); x.drawImage(img, 0, 0);
  const L = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = ([r, g, bb]) => 0.2126 * L(r) + 0.7152 * L(g) + 0.0722 * L(bb);
  return pts.map((s) => { const [px, py] = s.split(",").map(Number); const d = [...x.getImageData(px, py, 1, 1).data].slice(0, 3); return `${s} rgb(${d}) vs white ${((1.05) / (lum(d) + 0.05)).toFixed(2)} vs ink ${((lum(d) + 0.05) / (lum([14, 17, 32]) + 0.05)).toFixed(2)}`; });
}, { data: fs.readFileSync(file).toString("base64"), pts });
console.log(res.join("\n")); await b.close();
