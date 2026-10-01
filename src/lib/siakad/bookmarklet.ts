import { SIAKAD_SCHEDULE_URL } from "./client";

export const SIAKAD_ORIGIN = new URL(SIAKAD_SCHEDULE_URL).origin;
export const IMPORT_MESSAGE = "jadwalin-siakad";
export const IMPORT_READY = "jadwalin-ready";

/** Pesan READY dari /import-siakad: membawa tingkat semester aktif user di Jadwalin. */
export interface ImportReady { type: typeof IMPORT_READY; semester: number | null }
/** Pesan data dari bookmarklet: teks halaman + tingkat semester yang benar-benar dibaca. */
export interface ImportData { type: typeof IMPORT_MESSAGE; text: string; semester: string | null }

/**
 * Bookmarklet "Kirim ke Jadwalin". Dijalankan user di tab SIAKAD miliknya (sudah login),
 * jadi aplikasi tidak pernah menyentuh password/cookie SIAKAD.
 *
 * Alur: buka /import-siakad dulu (masih dalam klik user, aman dari popup blocker) → halaman itu
 * membalas READY + semester aktif → halaman jadwal SIAKAD dimuat di iframe tersembunyi
 * (same-origin), dropdown "Tingkat Semester" disetel ke semester aktif lalu "Tampilkan" diklik
 * → tabel dibaca dan dikirim lewat postMessage (origin divalidasi di kedua sisi).
 */
export function buildBookmarklet(appOrigin: string): string {
  const src = `(function(){
var APP=${JSON.stringify(appOrigin)},PATH=${JSON.stringify(new URL(SIAKAD_SCHEDULE_URL).pathname)};
if(location.origin!==${JSON.stringify(SIAKAD_ORIGIN)}){alert("Buka dan login SIAKAD ITERA dulu, lalu klik bookmark ini lagi.");return;}
var w=window.open(APP+"/import-siakad","jadwalin");
if(!w){alert("Popup diblokir. Izinkan popup untuk SIAKAD lalu coba lagi.");return;}
var done=false;
function h(e){if(e.origin!==APP||!e.data||e.data.type!==${JSON.stringify(IMPORT_READY)}||done)return;done=true;removeEventListener("message",h);run(e.data.semester);}
addEventListener("message",h);
function findSel(d,n){var s=d.querySelectorAll("select");for(var i=0;i<s.length;i++){if(s[i].closest(".dataTables_length"))continue;for(var j=0;j<s[i].options.length;j++){var o=s[i].options[j];if(o.value.trim()===n||o.text.trim()===n)return s[i];}}return null;}
function selVal(sel){var o=sel.options[sel.selectedIndex];return o?o.text.trim():null;}
function read(win){try{var $=win.jQuery;if($&&$.fn.dataTable){$.fn.dataTable.tables().forEach(function(t){$(t).DataTable().page.len(-1).draw();});}}catch(e){}return win.document.body.innerText;}
function send(t,sem){
if(!t||t.length<50){alert("Jadwal tidak terbaca. Pastikan sudah login SIAKAD.");return;}
w.postMessage({type:${JSON.stringify(IMPORT_MESSAGE)},text:t,semester:sem},APP);
}
function run(sem){
var n=sem==null?null:String(sem),submitted=false;
var f=document.createElement("iframe");
f.style.cssText="position:fixed;left:-10000px;top:0;width:1280px;height:900px;border:0";
function finish(){var d=f.contentDocument,sel=n&&findSel(d,n),t=read(f.contentWindow),v=sel?selVal(sel):null;f.remove();send(t,v);}
f.onload=function(){
var d;try{d=f.contentDocument;}catch(e){f.remove();send("",null);return;}
if(!n||submitted){finish();return;}
var sel=findSel(d,n);
if(!sel){f.remove();alert("Tingkat Semester "+n+" tidak ada di SIAKAD. Cek semester aktif di Jadwalin.");return;}
var o=null;for(var j=0;j<sel.options.length;j++){if(sel.options[j].value.trim()===n||sel.options[j].text.trim()===n)o=sel.options[j];}
sel.value=o.value;sel.dispatchEvent(new Event("change",{bubbles:true}));
submitted=true;
var form=sel.form,btn=[].slice.call(d.querySelectorAll("button,input[type=submit],a")).filter(function(b){return /tampilkan/i.test(b.innerText||b.value||"");})[0]||(form&&form.querySelector("button[type=submit],input[type=submit],button:not([type])"));
if(btn)btn.click();else if(form)form.submit();
setTimeout(function(){if(f.isConnected)finish();},6000);
};
f.src=PATH;document.body.appendChild(f);
}
})();`;
  return "javascript:" + encodeURIComponent(src.replace(/\n/g, ""));
}
