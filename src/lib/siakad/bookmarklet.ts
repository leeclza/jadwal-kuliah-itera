import { SIAKAD_SCHEDULE_URL } from "./client";

export const SIAKAD_ORIGIN = new URL(SIAKAD_SCHEDULE_URL).origin;
export const IMPORT_MESSAGE = "jadwalin-siakad";
export const IMPORT_READY = "jadwalin-ready";

/**
 * Bookmarklet "Kirim ke Jadwalin". Dijalankan user di tab SIAKAD miliknya (sudah login),
 * jadi aplikasi tidak pernah menyentuh password/cookie SIAKAD. Jika user tidak sedang di
 * halaman jadwal, halaman jadwal dimuat di iframe tersembunyi (same-origin) lalu dibaca.
 * Teks dikirim lewat postMessage ke halaman /import-siakad yang memvalidasi origin.
 */
export function buildBookmarklet(appOrigin: string): string {
  const src = `(function(){
var APP=${JSON.stringify(appOrigin)},PATH=${JSON.stringify(new URL(SIAKAD_SCHEDULE_URL).pathname)};
if(location.origin!==${JSON.stringify(SIAKAD_ORIGIN)}){alert("Buka dan login SIAKAD ITERA dulu, lalu klik bookmark ini lagi.");return;}
function read(w){try{var $=w.jQuery;if($&&$.fn.dataTable){$.fn.dataTable.tables().forEach(function(t){$(t).DataTable().page.len(-1).draw();});}}catch(e){}return w.document.body.innerText;}
function send(t){
if(!t||t.length<50){alert("Jadwal tidak terbaca. Pastikan sudah login SIAKAD.");return;}
var w=window.open(APP+"/import-siakad","jadwalin");
if(!w){alert("Popup diblokir. Izinkan popup untuk SIAKAD lalu coba lagi.");return;}
function h(e){if(e.origin===APP&&e.data===${JSON.stringify(IMPORT_READY)}){w.postMessage({type:${JSON.stringify(IMPORT_MESSAGE)},text:t},APP);removeEventListener("message",h);}}
addEventListener("message",h);
}
if(location.pathname.indexOf(PATH)===0){send(read(window));return;}
var f=document.createElement("iframe");
f.style.cssText="position:fixed;left:-10000px;top:0;width:1280px;height:900px;border:0";
f.onload=function(){var t="";try{t=read(f.contentWindow);}catch(e){}f.remove();send(t);};
f.src=PATH;document.body.appendChild(f);
})();`;
  return "javascript:" + encodeURIComponent(src.replace(/\n/g, ""));
}
