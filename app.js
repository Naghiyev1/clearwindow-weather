
const APP_VERSION="1.0";
const DEFAULT_LOCATION={name:"Barcelona",admin1:"Catalonia",country:"Spain",latitude:41.3851,longitude:2.1734,timezone:"Europe/Madrid"};
const STORAGE={location:"clearwindow_location_v1",saved:"clearwindow_saved_locations_v1"};
const WEATHER_CODES={0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Dense drizzle",56:"Freezing drizzle",57:"Dense freezing drizzle",61:"Slight rain",63:"Rain",65:"Heavy rain",66:"Freezing rain",67:"Heavy freezing rain",71:"Slight snow",73:"Snow",75:"Heavy snow",77:"Snow grains",80:"Slight showers",81:"Showers",82:"Violent showers",85:"Slight snow showers",86:"Heavy snow showers",95:"Thunderstorm",96:"Thunderstorm with hail",99:"Thunderstorm with heavy hail"};
function safeParse(k,f){try{const r=localStorage.getItem(k);return r?JSON.parse(r):f}catch{return f}}
const state={location:safeParse(STORAGE.location,DEFAULT_LOCATION),saved:safeParse(STORAGE.saved,[DEFAULT_LOCATION]),weather:null,air:null,loading:true,error:"",query:"",searchResults:[],section:"today"};
const $=s=>document.querySelector(s);const $$=s=>Array.from(document.querySelectorAll(s));
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const saveJSON=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
function round(n,d=0){return Number.isFinite(Number(n))?Number(n).toFixed(d).replace(/\.0$/,""):"—"}
function hourLabel(iso){return new Date(iso).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
function dayLabel(iso){return new Date(iso).toLocaleDateString([],{weekday:"short",day:"numeric",month:"short"})}
function locationTitle(loc=state.location){return [loc.name,loc.admin1,loc.country].filter(Boolean).join(", ")}
function weatherText(code){return WEATHER_CODES[Number(code)]||"Weather"}
function buildForecastUrl(loc){const p=new URLSearchParams({latitude:loc.latitude,longitude:loc.longitude,current:["temperature_2m","relative_humidity_2m","apparent_temperature","is_day","precipitation","rain","showers","weather_code","cloud_cover","wind_speed_10m","wind_direction_10m","wind_gusts_10m"].join(","),hourly:["temperature_2m","relative_humidity_2m","apparent_temperature","precipitation_probability","precipitation","rain","showers","weather_code","cloud_cover","wind_speed_10m","wind_direction_10m","wind_gusts_10m","uv_index"].join(","),daily:["weather_code","temperature_2m_max","temperature_2m_min","precipitation_sum","precipitation_probability_max","wind_speed_10m_max","wind_gusts_10m_max","uv_index_max","sunrise","sunset"].join(","),forecast_days:"7",timezone:"auto",wind_speed_unit:"kmh"});return `https://api.open-meteo.com/v1/forecast?${p.toString()}`}
function buildAirUrl(loc){const p=new URLSearchParams({latitude:loc.latitude,longitude:loc.longitude,current:["european_aqi","pm10","pm2_5","carbon_monoxide","nitrogen_dioxide","ozone","uv_index"].join(","),hourly:["european_aqi","pm10","pm2_5","uv_index"].join(","),forecast_days:"3",timezone:"auto"});return `https://air-quality-api.open-meteo.com/v1/air-quality?${p.toString()}`}
async function loadData(){state.loading=true;state.error="";render();try{const [wr,ar]=await Promise.all([fetch(buildForecastUrl(state.location),{cache:"no-store"}),fetch(buildAirUrl(state.location),{cache:"no-store"})]);if(!wr.ok)throw new Error(`Weather API returned ${wr.status}`);if(!ar.ok)throw new Error(`Air quality API returned ${ar.status}`);state.weather=await wr.json();state.air=await ar.json();state.loading=false;render()}catch(e){state.loading=false;state.error=`Could not load weather data. ${e.message||e}`;render()}}
async function searchLocation(q){if(!q||q.trim().length<2){state.searchResults=[];renderLocationSearch();return}const p=new URLSearchParams({name:q.trim(),count:"8",language:"en",format:"json"});try{const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?${p.toString()}`);const d=await r.json();state.searchResults=(d.results||[]).map(x=>({name:x.name,admin1:x.admin1||"",country:x.country||"",latitude:x.latitude,longitude:x.longitude,timezone:x.timezone||"auto"}))}catch{state.searchResults=[]}renderLocationSearch()}
function hourlyRows(){if(!state.weather?.hourly?.time)return[];const h=state.weather.hourly,a=state.air?.hourly||{};return h.time.map((time,i)=>({time,temp:h.temperature_2m?.[i],feels:h.apparent_temperature?.[i],humidity:h.relative_humidity_2m?.[i],pop:h.precipitation_probability?.[i],precip:h.precipitation?.[i],rain:h.rain?.[i],showers:h.showers?.[i],code:h.weather_code?.[i],cloud:h.cloud_cover?.[i],wind:h.wind_speed_10m?.[i],gust:h.wind_gusts_10m?.[i],windDir:h.wind_direction_10m?.[i],uv:h.uv_index?.[i],aqi:a.european_aqi?.[i],pm25:a.pm2_5?.[i],pm10:a.pm10?.[i]}))}
function upcomingHours(n=24){const now=Date.now();return hourlyRows().filter(x=>new Date(x.time).getTime()>=now-30*60*1000).slice(0,n)}
function current(){return state.weather?.current||{}}function airCurrent(){return state.air?.current||{}}
function rainAssessment(){const next3=upcomingHours(4),next1=next3.slice(0,2);const maxPop3=Math.max(0,...next3.map(x=>Number(x.pop||0))),totalRain3=next3.reduce((s,x)=>s+Number(x.precip||0),0),maxPop1=Math.max(0,...next1.map(x=>Number(x.pop||0))),nowRain=Number(current().rain||0)+Number(current().showers||0)+Number(current().precipitation||0);let level="low",title="Low rain risk",detail="Looks mostly safe from rain in the next few hours.";if(nowRain>.1||totalRain3>=2||maxPop3>=75){level="bad";title="Rain risk is real";detail="Take an umbrella or delay going out if you hate surprise rain."}else if(totalRain3>=.3||maxPop3>=45||maxPop1>=35){level="medium";title="Possible rain window";detail="Not guaranteed, but enough risk to check before leaving."}return{level,title,detail,maxPop3,totalRain3,maxPop1,nowRain}}
function windAssessment(row=current()){const wind=Number(row.wind_speed_10m??row.wind??0),gust=Number(row.wind_gusts_10m??row.gust??0),pain=Math.round(Math.min(100,wind*1.45+gust*1.25));let level="good",title="Wind is fine",detail="Wind should not dominate the day.";if(gust>=45||wind>=32){level="bad";title="Wind will be annoying";detail="Gusts are high enough to make walking, scooters or outdoor plans unpleasant."}else if(gust>=32||wind>=22){level="medium";title="Wind could annoy you";detail="Not a disaster, but gusts may make it feel worse than the temperature suggests."}return{level,title,detail,wind,gust,pain}}
function aqiAssessment(){const aq=Number(airCurrent().european_aqi),pm25=Number(airCurrent().pm2_5),pm10=Number(airCurrent().pm10);let level="good",title="Air looks good",detail="Good enough for a normal walk or outdoor session.";if(aq>=75||pm25>=25||pm10>=50){level="bad";title="Air quality is poor";detail="Better to keep hard outdoor training short."}else if(aq>=50||pm25>=15||pm10>=35){level="medium";title="Air is okay, not perfect";detail="Fine for light activity, but not the cleanest air window."}return{level,title,detail,aq,pm25,pm10}}
function outdoorVerdict(){
  const rain = rainAssessment();
  const wind = windAssessment();
  const aqi = aqiAssessment();

  let score = 100;
  if(rain.level === "bad") score -= 35;
  if(rain.level === "medium") score -= 18;
  if(wind.level === "bad") score -= 35;
  if(wind.level === "medium") score -= 18;
  if(aqi.level === "bad") score -= 20;
  if(aqi.level === "medium") score -= 10;

  const temp = Number(current().temperature_2m);
  if(temp < 8 || temp > 32) score -= 10;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let label = "Good to go";
  let tone = "good";
  let line = "Looks fine for most outdoor plans.";
  let advice = "You probably do not need to overthink it.";

  if(rain.level === "bad"){
    label = "Rain window ahead";
    tone = "bad";
    line = "There is enough rain risk to plan around the wet hours.";
    advice = "Check the best window below before leaving.";
  } else if(wind.level === "bad"){
    label = "Wind will be annoying";
    tone = "bad";
    line = "The temperature may look fine, but gusts are the real problem.";
    advice = "Good day to avoid exposed walks, scooters or outdoor training.";
  } else if(aqi.level === "bad"){
    label = "Air is not great";
    tone = "bad";
    line = "Air quality is the weak point today.";
    advice = "Light outdoor time is fine, but hard training is not ideal.";
  } else if(score < 45){
    label = "Bad outdoor window";
    tone = "bad";
    line = "Rain, wind or air quality make this a poor time to go out.";
    advice = "Wait for a better window if you can.";
  } else if(rain.level === "medium"){
    label = "Go between the dry windows";
    tone = "medium";
    line = "The day is usable, but rain timing matters.";
    advice = "Use the best-window cards instead of trusting the whole day.";
  } else if(wind.level === "medium"){
    label = "Go, but watch the wind";
    tone = "medium";
    line = "The day is usable, but gusts may annoy you.";
    advice = "If you hate wind, avoid the gustiest hours.";
  } else if(aqi.level === "medium"){
    label = "Fine, but air is average";
    tone = "medium";
    line = "Outdoor plans are okay, but the air is not especially clean.";
    advice = "Better for walking than intense outdoor training.";
  } else if(score < 70){
    label = "Mostly fine";
    tone = "medium";
    line = "There is no major problem, but conditions are not perfect.";
    advice = "Pick one of the better windows below.";
  }

  return { score, label, tone, line, advice, rain, wind, aqi };
}

function bestWindows(){const rows=upcomingHours(18).filter(x=>{const h=new Date(x.time).getHours();return h>=6&&h<=23});const scored=rows.map(x=>{const rainP=Math.min(40,Number(x.pop||0)*.4+Number(x.precip||0)*12),windP=Math.min(35,Number(x.wind||0)*.8+Number(x.gust||0)*.6),aqiP=Math.min(20,Number(x.aqi||airCurrent().european_aqi||0)*.2),humP=Number(x.humidity||0)>80?5:0;return{...x,score:Math.max(0,Math.min(100,Math.round(100-rainP-windP-aqiP-humP)))}});return{best:[...scored].sort((a,b)=>b.score-a.score).slice(0,3),worst:[...scored].sort((a,b)=>a.score-b.score).slice(0,3)}}
function levelClass(l){return l==="bad"?"bad":l==="medium"?"medium":"good"}
function render(){
  if(!document.querySelector(".app-shell")) renderShell();
  $$(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.nav === state.section));

  if(state.loading){
    $("#app").innerHTML = `<section class="loading-card"><div class="loader"></div><h1>Checking the sky…</h1><p>Loading forecast, rain, wind and air quality for ${esc(locationTitle())}.</p></section>`;
    return;
  }

  if(state.error){
    $("#app").innerHTML = `<section class="error-card"><h1>Weather failed</h1><p>${esc(state.error)}</p><button class="pill-btn active" data-action="reload">Try again</button></section>`;
    return;
  }

  if(state.section === "today") return renderToday();
  if(state.section === "tomorrow") return renderTomorrow();
  if(state.section === "weekly") return renderWeekly();
  if(state.section === "hourly") return renderHourly();
  if(state.section === "wind") return renderWind();
  if(state.section === "air") return renderAir();
  if(state.section === "locations") return renderLocations();

  state.section = "today";
  renderToday();
}

function renderShell(){document.body.innerHTML=`<div class="app-shell"><header class="topbar"><div class="brand" data-nav="today"><div class="logo-mark">☔</div><div><strong>ClearWindow</strong><span>Rain · Wind · Air · v${APP_VERSION}</span></div></div><nav class="nav"><button class="nav-btn active" data-nav="today">Today</button>
          <button class="nav-btn" data-nav="tomorrow">Tomorrow</button>
          <button class="nav-btn" data-nav="weekly">Weekly</button><button class="nav-btn" data-nav="hourly">Hourly</button><button class="nav-btn" data-nav="wind">Wind</button><button class="nav-btn" data-nav="air">Air</button><button class="nav-btn" data-nav="locations">Locations</button></nav></header><main id="app"></main></div>`}

function dateKeyFromOffset(offset){
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0,10);
}

function hourlyForDate(offset){
  const key = dateKeyFromOffset(offset);
  return hourlyRows().filter(x => String(x.time).startsWith(key));
}

function dailyRows(){
  if(!state.weather?.daily?.time) return [];
  const d = state.weather.daily;
  return d.time.map((time,i) => ({
    time,
    code: d.weather_code?.[i],
    tempMax: d.temperature_2m_max?.[i],
    tempMin: d.temperature_2m_min?.[i],
    precip: d.precipitation_sum?.[i],
    pop: d.precipitation_probability_max?.[i],
    wind: d.wind_speed_10m_max?.[i],
    gust: d.wind_gusts_10m_max?.[i],
    uv: d.uv_index_max?.[i],
    sunrise: d.sunrise?.[i],
    sunset: d.sunset?.[i]
  }));
}

function dayAssessment(offset=0){
  const rows = hourlyForDate(offset);
  const daily = dailyRows()[offset] || {};
  const aqRows = rows.map(x => Number(x.aqi || 0)).filter(Boolean);
  const avgAqi = aqRows.length ? Math.round(aqRows.reduce((a,b)=>a+b,0)/aqRows.length) : Number(airCurrent().european_aqi || 0);

  const maxPop = Number(daily.pop ?? Math.max(0, ...rows.map(x => Number(x.pop || 0))));
  const totalRain = Number(daily.precip ?? rows.reduce((s,x)=>s+Number(x.precip||0),0));
  const maxWind = Number(daily.wind ?? Math.max(0, ...rows.map(x => Number(x.wind || 0))));
  const maxGust = Number(daily.gust ?? Math.max(0, ...rows.map(x => Number(x.gust || 0))));
  const uv = Number(daily.uv ?? Math.max(0, ...rows.map(x => Number(x.uv || 0))));

  let score = 100;
  score -= Math.min(35, maxPop * 0.32 + totalRain * 5);
  score -= Math.min(35, maxWind * 0.65 + maxGust * 0.45);
  score -= Math.min(18, avgAqi * 0.18);
  if(uv >= 7) score -= 7;

  score = Math.max(0, Math.min(100, Math.round(score)));

  let tone = "good";
  let label = "Good outdoor day";
  let line = "Looks mostly usable for outdoor plans.";

  if(score < 45){
    tone = "bad";
    label = "Annoying weather risk";
    line = "Rain, gusts or air quality could make it a frustrating day.";
  } else if(score < 70){
    tone = "medium";
    label = "Pick the right window";
    line = "There should be good hours, but do not treat the whole day as safe.";
  }

  const best = bestWindowsForRows(rows).best;
  const worst = bestWindowsForRows(rows).worst;

  return { score, tone, label, line, maxPop, totalRain, maxWind, maxGust, avgAqi, uv, daily, rows, best, worst };
}

function bestWindowsForRows(rows){
  const usable = rows.filter(x => {
    const h = new Date(x.time).getHours();
    return h >= 6 && h <= 23;
  });
  const scored = usable.map(x => {
    const rainPenalty = Math.min(40, Number(x.pop || 0) * 0.4 + Number(x.precip || 0) * 12);
    const windPenalty = Math.min(35, Number(x.wind || 0) * 0.8 + Number(x.gust || 0) * 0.6);
    const aqiPenalty = Math.min(20, Number(x.aqi || airCurrent().european_aqi || 0) * 0.2);
    const humidityPenalty = Number(x.humidity || 0) > 80 ? 5 : 0;
    const score = Math.round(100 - rainPenalty - windPenalty - aqiPenalty - humidityPenalty);
    return { ...x, score: Math.max(0, Math.min(100, score)) };
  });
  return {
    best: [...scored].sort((a,b) => b.score - a.score).slice(0,3),
    worst: [...scored].sort((a,b) => a.score - b.score).slice(0,3)
  };
}

function weatherIcon(code){
  code = Number(code);
  if([0,1].includes(code)) return "☀️";
  if([2].includes(code)) return "⛅";
  if([3,45,48].includes(code)) return "☁️";
  if([51,53,55,61,63,65,80,81,82].includes(code)) return "🌧️";
  if([95,96,99].includes(code)) return "⛈️";
  if([71,73,75,77,85,86].includes(code)) return "❄️";
  return "🌤️";
}

function metricPill(label,value,meta,tone=""){
  return `<div class="metric-pill ${tone}">
    <span>${esc(label)}</span>
    <strong>${esc(value)}</strong>
    <em>${esc(meta)}</em>
  </div>`;
}


function renderToday(){
  const v = outdoorVerdict();
  const c = current();
  const windows = bestWindows();
  const bestOne = windows.best?.[0];
  const worstOne = windows.worst?.[0];

  $("#app").innerHTML = `
    <section class="home-hero verdict-${v.tone}">
      <div class="hero-copy">
        <div class="eyebrow">${esc(locationTitle())} · ClearWindow v${APP_VERSION}</div>
        <h1>${esc(v.label)}</h1>
        <p>${esc(v.line)}</p>
        <div class="hero-advice">${esc(v.advice)}</div>
      </div>

      <div class="today-orb ${v.tone}">
        <span>${weatherIcon(c.weather_code)}</span>
        <strong>${round(c.temperature_2m)}°</strong>
        <em>feels ${round(c.apparent_temperature)}°</em>
      </div>
    </section>

    <section class="decision-strip">
      <div>
        <span>Best window</span>
        <strong>${bestOne ? hourLabel(bestOne.time) : "—"}</strong>
        <em>${bestOne ? `score ${bestOne.score} · rain ${round(bestOne.pop)}%` : "No window data yet"}</em>
      </div>
      <div>
        <span>Watch out</span>
        <strong>${worstOne ? hourLabel(worstOne.time) : "—"}</strong>
        <em>${worstOne ? `gust ${round(worstOne.gust)} km/h · rain ${round(worstOne.pop)}%` : "No risk window yet"}</em>
      </div>
      <div>
        <span>Comfort</span>
        <strong>${v.score}/100</strong>
        <em>rain · wind · air combined</em>
      </div>
    </section>

    <section class="main-risk-grid">
      ${mainRiskCard("Rain", v.rain.level, `${v.rain.maxPop3}%`, "chance next 3h", v.rain.title, v.rain.detail)}
      ${mainRiskCard("Wind", v.wind.level, `${round(v.wind.gust)} km/h`, "strongest gusts now", v.wind.title, v.wind.detail)}
      ${mainRiskCard("Air", v.aqi.level, `${round(v.aqi.aq)}`, "European AQI", v.aqi.title, v.aqi.detail)}
    </section>

    <section class="window-grid refined">
      <article class="window-card premium">
        <div class="eyebrow">Best times today</div>
        ${windows.best.map(windowRow).join("") || "<p>No window data yet.</p>"}
      </article>
      <article class="window-card premium">
        <div class="eyebrow">Avoid if possible</div>
        ${windows.worst.map(windowRow).join("") || "<p>No window data yet.</p>"}
      </article>
    </section>

    <section class="source-card calm">
      <strong>What this page is trying to answer</strong>
      <p>Not “what is the weather?” but “when can I go outside without rain, annoying wind or bad air ruining it?”</p>
    </section>
  `;
}

function mainRiskCard(label, level, big, meta, title, detail){
  return `<article class="main-risk-card ${levelClass(level)}">
    <div class="risk-icon">${label === "Rain" ? "🌧️" : label === "Wind" ? "💨" : "🌫️"}</div>
    <div>
      <div class="eyebrow">${esc(label)}</div>
      <strong>${esc(big)}</strong>
      <span>${esc(meta)}</span>
      <h2>${esc(title)}</h2>
      <p>${esc(detail)}</p>
    </div>
  </article>`;
}

function riskCard(label,title,detail,level,big,meta){return `<article class="risk-card ${levelClass(level)}"><div class="eyebrow">${esc(label)}</div><strong>${esc(big)}</strong><h2>${esc(title)}</h2><p>${esc(detail)}</p><span>${esc(meta)}</span></article>`}
function windowRow(x){const level=x.score<45?'bad':x.score<70?'medium':'good';return `<div class="window-row ${level}"><div><strong>${hourLabel(x.time)}</strong><span>${esc(weatherText(x.code))}</span></div><em>${x.score}</em><small>rain ${round(x.pop)}% · gust ${round(x.gust)} km/h</small></div>`}

function renderTomorrow(){
  const d = dayAssessment(1);
  const day = d.daily || {};
  $("#app").innerHTML = `
    <section class="hero tomorrow-hero verdict-${d.tone}">
      <div>
        <div class="eyebrow">${esc(locationTitle())} · ${dayLabel(day.time || dateKeyFromOffset(1))}</div>
        <h1>${esc(d.label)}</h1>
        <p>${esc(d.line)}</p>
      </div>
      <div class="weather-orb ${d.tone}">
        <span>${weatherIcon(day.code)}</span>
        <strong>${round(day.tempMax)}°</strong>
        <em>${round(day.tempMin)}° min</em>
      </div>
    </section>

    <section class="mood-panel">
      <div>
        <span>Tomorrow score</span>
        <strong>${d.score}</strong>
        <em>outdoor usability</em>
      </div>
      ${metricPill("Rain", `${round(d.maxPop)}%`, `${round(d.totalRain,1)} mm`, d.maxPop >= 65 ? "bad" : d.maxPop >= 35 ? "medium" : "good")}
      ${metricPill("Wind", `${round(d.maxWind)} km/h`, `gust ${round(d.maxGust)} km/h`, d.maxGust >= 45 ? "bad" : d.maxGust >= 32 ? "medium" : "good")}
      ${metricPill("AQI", `${round(d.avgAqi)}`, `European AQI`, d.avgAqi >= 75 ? "bad" : d.avgAqi >= 50 ? "medium" : "good")}
      ${metricPill("UV", `${round(d.uv,1)}`, `max index`, d.uv >= 7 ? "bad" : d.uv >= 4 ? "medium" : "good")}
    </section>

    <section class="window-grid">
      <article class="window-card premium">
        <div class="eyebrow">Best times tomorrow</div>
        ${d.best.map(windowRow).join("") || "<p>No hourly window data yet.</p>"}
      </article>
      <article class="window-card premium">
        <div class="eyebrow">Avoid if possible</div>
        ${d.worst.map(windowRow).join("") || "<p>No hourly window data yet.</p>"}
      </article>
    </section>

    <section class="page-head small">
      <div><h1>Tomorrow by hour</h1><p>A compact view of the hours that matter most.</p></div>
    </section>
    <section class="hourly-list compact">
      ${d.rows.filter(x => {
        const h = new Date(x.time).getHours();
        return h >= 7 && h <= 23;
      }).map(hourCard).join("")}
    </section>
  `;
}

function renderWeekly(){
  const days = dailyRows().map((day,i) => ({ ...day, assessment: dayAssessment(i) }));
  $("#app").innerHTML = `
    <section class="page-head weekly-head">
      <div>
        <div class="eyebrow">${esc(locationTitle())}</div>
        <h1>Weekly outlook</h1>
        <p>Not just temperature. Rain risk, gusts, air and outdoor usability for the next 7 days.</p>
      </div>
      <button class="pill-btn" data-action="reload">Refresh</button>
    </section>

    <section class="weekly-grid">
      ${days.map(weeklyCard).join("")}
    </section>

    <section class="source-card">
      <strong>How to read this:</strong>
      <p>The score is intentionally practical, not meteorological purity. Heavy rain risk, strong gusts and worse air quality reduce the outdoor score more than temperature.</p>
    </section>
  `;
}

function weeklyCard(day){
  const a = day.assessment;
  return `<article class="week-card ${a.tone}">
    <div class="week-top">
      <div>
        <span>${dayLabel(day.time)}</span>
        <strong>${weatherIcon(day.code)} ${round(day.tempMax)}°</strong>
        <em>${round(day.tempMin)}° min · ${esc(weatherText(day.code))}</em>
      </div>
      <div class="week-score">${a.score}</div>
    </div>
    <div class="week-metrics">
      <div><span>Rain</span><strong>${round(a.maxPop)}%</strong><em>${round(a.totalRain,1)} mm</em></div>
      <div><span>Gust</span><strong>${round(a.maxGust)}</strong><em>km/h</em></div>
      <div><span>AQI</span><strong>${round(a.avgAqi)}</strong><em>EU AQI</em></div>
      <div><span>UV</span><strong>${round(a.uv,1)}</strong><em>max</em></div>
    </div>
    <p>${esc(a.label)}</p>
  </article>`;
}


function renderHourly(){const rows=upcomingHours(24);$('#app').innerHTML=`<section class="page-head"><div><h1>Hourly reality check</h1><p>Rain probability, rain amount, gusts and air quality by hour.</p></div><button class="pill-btn" data-action="reload">Refresh</button></section><section class="hourly-list">${rows.map(hourCard).join('')}</section>`}
function hourCard(x){const wind=windAssessment({wind_speed_10m:x.wind,wind_gusts_10m:x.gust}),rainLevel=Number(x.pop||0)>=65||Number(x.precip||0)>=1?'bad':Number(x.pop||0)>=35||Number(x.precip||0)>0?'medium':'good';return `<article class="hour-card"><div class="hour-main"><strong>${hourLabel(x.time)}</strong><span>${esc(weatherText(x.code))}</span></div><div class="hour-metric"><span>Temp</span><strong>${round(x.temp)}°</strong><em>feels ${round(x.feels)}°</em></div><div class="hour-metric ${rainLevel}"><span>Rain</span><strong>${round(x.pop)}%</strong><em>${round(x.precip,1)} mm</em></div><div class="hour-metric ${wind.level}"><span>Wind</span><strong>${round(x.wind)}</strong><em>gust ${round(x.gust)}</em></div><div class="hour-metric"><span>AQI</span><strong>${round(x.aqi)}</strong><em>PM2.5 ${round(x.pm25,1)}</em></div></article>`}
function renderWind(){const rows=upcomingHours(24),worst=[...rows].sort((a,b)=>Number(b.gust||0)-Number(a.gust||0)).slice(0,6),cw=windAssessment();$('#app').innerHTML=`<section class="hero verdict-${cw.level}"><div><div class="eyebrow">Wind focus</div><h1>${esc(cw.title)}</h1><p>${esc(cw.detail)}</p></div><div class="score-ring ${cw.level}"><strong>${cw.pain}</strong><span>wind pain</span></div></section><section class="wind-scale"><div><strong>0–20</strong><span>Fine</span></div><div><strong>20–40</strong><span>Noticeable</span></div><div><strong>40–60</strong><span>Annoying</span></div><div><strong>60+</strong><span>Wind bully mode</span></div></section><section class="page-head small"><div><h1>Gust watch</h1><p>Gusts usually explain why a “not too windy” day still feels annoying.</p></div></section><section class="hourly-list">${worst.map(x=>{const w=windAssessment({wind_speed_10m:x.wind,wind_gusts_10m:x.gust});return `<article class="hour-card"><div class="hour-main"><strong>${hourLabel(x.time)}</strong><span>${dayLabel(x.time)}</span></div><div class="hour-metric ${w.level}"><span>Wind</span><strong>${round(x.wind)}</strong><em>km/h</em></div><div class="hour-metric ${w.level}"><span>Gust</span><strong>${round(x.gust)}</strong><em>km/h</em></div><div class="hour-metric ${w.level}"><span>Pain</span><strong>${w.pain}</strong><em>/100</em></div><div class="hour-metric"><span>Rain</span><strong>${round(x.pop)}%</strong><em>${round(x.precip,1)} mm</em></div></article>`}).join('')}</section>`}
function renderAir(){const a=aqiAssessment();$('#app').innerHTML=`<section class="hero verdict-${a.level}"><div><div class="eyebrow">Air quality</div><h1>${esc(a.title)}</h1><p>${esc(a.detail)}</p></div><div class="score-ring ${a.level}"><strong>${round(a.aq)}</strong><span>European AQI</span></div></section><section class="cards-three">${riskCard('PM2.5','Fine particles','Small particles are the ones I would watch most for outdoor training.',a.pm25>=25?'bad':a.pm25>=15?'medium':'good',`${round(a.pm25,1)}`,'µg/m³')}${riskCard('PM10','Larger particles','Dust and larger particulate matter. Useful in dry, dusty or windy conditions.',a.pm10>=50?'bad':a.pm10>=35?'medium':'good',`${round(a.pm10,1)}`,'µg/m³')}${riskCard('UV','UV index','Useful for midday walks, kids, beach or long outdoor sessions.',Number(airCurrent().uv_index)>=7?'bad':Number(airCurrent().uv_index)>=4?'medium':'good',`${round(airCurrent().uv_index,1)}`,'current')}</section><section class="source-card"><strong>Air quality source</strong><p>ClearWindow uses Open‑Meteo’s air quality endpoint for European AQI, PM2.5, PM10 and UV variables.</p></section>`}
function renderLocations(){$('#app').innerHTML=`<section class="page-head"><div><h1>Locations</h1><p>Default is Barcelona, but you can search and save other places.</p></div><button class="pill-btn active" data-action="useGPS">Use my location</button></section><section class="search-card"><label><span>Search city</span><input id="locationSearch" type="search" placeholder="Barcelona, Tokyo, London..." value="${esc(state.query)}"></label><div id="locationResults" class="location-results"></div></section><section class="saved-card"><div class="eyebrow">Saved locations</div><div class="saved-list">${state.saved.map(savedLocationButton).join('')}</div></section>`;renderLocationSearch()}
function savedLocationButton(loc){const active=Number(loc.latitude).toFixed(3)===Number(state.location.latitude).toFixed(3)&&Number(loc.longitude).toFixed(3)===Number(state.location.longitude).toFixed(3);return `<button class="saved-location ${active?'active':''}" data-action="selectLocation" data-lat="${loc.latitude}" data-lon="${loc.longitude}"><strong>${esc(loc.name)}</strong><span>${esc([loc.admin1,loc.country].filter(Boolean).join(', '))}</span></button>`}
function renderLocationSearch(){const box=$('#locationResults');if(!box)return;box.innerHTML=state.searchResults.length?state.searchResults.map((loc,i)=>`<button class="result-row" data-action="pickSearch" data-index="${i}"><strong>${esc(loc.name)}</strong><span>${esc([loc.admin1,loc.country].filter(Boolean).join(', '))}</span></button>`).join(''):`<p class="muted">Type at least two letters to search.</p>`}
function selectLocation(loc){state.location=loc;saveJSON(STORAGE.location,loc);const exists=state.saved.some(x=>Number(x.latitude).toFixed(4)===Number(loc.latitude).toFixed(4)&&Number(x.longitude).toFixed(4)===Number(loc.longitude).toFixed(4));if(!exists){state.saved.unshift(loc);state.saved=state.saved.slice(0,8);saveJSON(STORAGE.saved,state.saved)}state.section='today';loadData()}
function handleClick(e){const nav=e.target.closest('[data-nav]');if(nav){state.section=nav.dataset.nav;render();return}const action=e.target.closest('[data-action]');if(!action)return;const a=action.dataset.action;if(a==='reload')loadData();if(a==='pickSearch'){const loc=state.searchResults[Number(action.dataset.index)];if(loc)selectLocation(loc)}if(a==='selectLocation'){const lat=Number(action.dataset.lat),lon=Number(action.dataset.lon),loc=state.saved.find(x=>Number(x.latitude)===lat&&Number(x.longitude)===lon);if(loc)selectLocation(loc)}if(a==='useGPS'){if(!navigator.geolocation){state.error='Geolocation is not available in this browser.';render();return}navigator.geolocation.getCurrentPosition(pos=>selectLocation({name:'Current location',admin1:'',country:'',latitude:pos.coords.latitude,longitude:pos.coords.longitude,timezone:'auto'}),()=>{state.error='Could not access your location. Check browser permissions.';render()},{enableHighAccuracy:true,timeout:10000})}}
let searchTimer=null;function handleInput(e){if(e.target.id==='locationSearch'){state.query=e.target.value;clearTimeout(searchTimer);searchTimer=setTimeout(()=>searchLocation(state.query),250)}}
function boot(){renderShell();document.addEventListener('click',handleClick);document.addEventListener('input',handleInput);if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').catch(()=>{});loadData()}
document.addEventListener('DOMContentLoaded',boot);
