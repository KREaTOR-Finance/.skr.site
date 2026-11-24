import { formatSkr, type SkrProfile } from "./skrProfile";

export const SKR_PROFILE_API = "https://www.skr.site/api/skr-profile";

export type Stamp = {
  id: string;
  title: string;
  detail: string;
};

export type StampSource = Pick<SkrProfile, "isSeeker" | "liquid" | "staked" | "yieldEarned" | "total">;

export function deriveStamps(profile: StampSource): Stamp[] {
  const stamps: Stamp[] = [];
  if (profile.isSeeker) {
    stamps.push({ id: "seeker", title: "Seeker Genesis", detail: "Hardware verified" });
  }
  if (profile.total > 0 || profile.liquid > 0) {
    stamps.push({ id: "holds-skr", title: "Holds SKR", detail: `${formatSkr(profile.total)} SKR` });
  }
  if (profile.staked >= 100) {
    stamps.push({ id: "staked-100", title: "Staked 100+ SKR", detail: `${formatSkr(profile.staked)} staked` });
  } else if (profile.staked > 0) {
    stamps.push({ id: "staked", title: "Staked SKR", detail: `${formatSkr(profile.staked)} staked` });
  }
  if (profile.yieldEarned > 0) {
    stamps.push({ id: "yield", title: "Earned SKR yield", detail: `${formatSkr(profile.yieldEarned)} yield` });
  }
  return stamps;
}

export function stampsLiveScript(): string {
  return `<script>
(function(){
  var root=document.querySelector("[data-stamps-live]");
  if(!root) return;
  var wallet=root.getAttribute("data-stamps-live");
  var api=root.getAttribute("data-stamps-api")||"${SKR_PROFILE_API}";
  function hide(){ root.setAttribute("hidden","hidden"); root.classList.remove("is-ready"); }
  function show(){ root.removeAttribute("hidden"); root.classList.add("is-ready"); }
  if(!wallet){ hide(); return; }
  function fmt(n){ if(!isFinite(n)||n===0) return "0"; return n>=1000?n.toLocaleString("en-US",{maximumFractionDigits:1}):n.toLocaleString("en-US",{maximumFractionDigits:2}); }
  fetch(api+"?wallet="+encodeURIComponent(wallet),{cache:"no-store"}).then(function(r){
    if(!r.ok) throw new Error("profile");
    return r.json();
  }).then(function(d){
    if(!d||typeof d.total!=="number") throw new Error("profile");
    var stamps=[];
    if(d.isSeeker) stamps.push({title:"Seeker Genesis",detail:"Hardware verified"});
    if(d.total>0||d.liquid>0) stamps.push({title:"Holds SKR",detail:fmt(d.total)+" SKR"});
    if(d.staked>=100) stamps.push({title:"Staked 100+ SKR",detail:fmt(d.staked)+" staked"});
    else if(d.staked>0) stamps.push({title:"Staked SKR",detail:fmt(d.staked)+" staked"});
    if(d.yieldEarned>0) stamps.push({title:"Earned SKR yield",detail:fmt(d.yieldEarned)+" yield"});
    if(!stamps.length){ hide(); return; }
    var grid=root.querySelector("[data-stamps-grid]");
    if(!grid){ hide(); return; }
    grid.innerHTML=stamps.map(function(s){
      var mark=s.title.charAt(0);
      return '<div class="stamp"><i>'+mark+'</i><b>'+s.title+'</b><span>'+s.detail+'</span></div>';
    }).join("");
    show();
  }).catch(hide);
})();
</script>`;
}
