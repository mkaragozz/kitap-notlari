/* Tarama ekranını ilk açılışta kurar (telefon ve bilgisayar panosu ortak). Kapsayıcı: #taramaKok, rota: #/tarama */
import { ekranKur } from "./tarama.js";

let kuruldu = null;
async function istatistikAl() {
  try { const r = await fetch(new URL("tarama_istatistik.json", import.meta.url), { cache: "no-cache" }); return r.ok ? r.json() : null; }
  catch { return null; }
}
async function kontrol() {
  if (kuruldu || !location.hash.startsWith("#/tarama")) return;
  const kok = document.getElementById("taramaKok");
  if (!kok) return;
  kuruldu = ekranKur(kok, {});
  const ist = await istatistikAl();
  if (ist) kuruldu.istatistik(ist);
}
window.addEventListener("hashchange", kontrol);
kontrol();
