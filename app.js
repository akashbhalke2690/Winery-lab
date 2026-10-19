/*
 * CONFIGURATION
 * 1. Publish the Google Sheet tab(s) as CSV, then paste each CSV URL below.
 * 2. Use a single combined sheet if possible. Headers are matched case-insensitively.
 * 3. Public CSV means anyone with the link may be able to read that published data.
 */
const CONFIG = {
  // https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4f1T_ZfQHiLmDklP5CZG9qOLMLwtu6GvSZqsw-5egn9m-7fmyEkvrgzz-pMcBA/pub?gid=1050578648&single=true&output=csv
  brandCsvUrl: "",
  labCsvUrl: "",
  // Optional refresh interval is intentionally manual to reduce requests.
  cacheKey: "winery-lab-pwa-cache-v1"
};

const SAMPLE_BRANDS = [
  {"Record Type":"Brand","Brand":"J'NOON INDIA RED WINE","Alcohol %":"13.50%"},
  {"Record Type":"Brand","Brand":"Sette","Alcohol %":"13.50%"},
  {"Record Type":"Brand","Brand":"MS Red","Alcohol %":"12.50%"},
  {"Record Type":"Brand","Brand":"MS Rose","Alcohol %":"12.50%"},
  {"Record Type":"Brand","Brand":"J'NOON INDIA WHITE WINE","Alcohol %":"13.50%"},
  {"Record Type":"Brand","Brand":"GCB Sparkling","Alcohol %":"12.00%"},
  {"Record Type":"Brand","Brand":"Sauvignon Blanc","Alcohol %":"12.50%"},
  {"Record Type":"Brand","Brand":"SHOTGUN STRONG","Alcohol %":"15.00%"}
];
const LAB_COLUMNS = ["Date","Brand","Batch","Tank","pH","TA","Free SO2","Total SO2","VA","RS","Alcohol %","Notes"];
let allRecords = [];
let dataSource = "sample data";

const $ = id => document.getElementById(id);
const norm = value => String(value ?? "").trim();
const keyNorm = value => norm(value).toLowerCase().replace(/[^a-z0-9]/g,"");

function parseCSV(text) {
  const rows=[]; let row=[], cell="", quoted=false;
  text=text.replace(/^\uFEFF/,"");
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(c === '"' && quoted && n === '"'){cell+='"';i++;}
    else if(c === '"'){quoted=!quoted;}
    else if(c === "," && !quoted){row.push(cell);cell="";}
    else if((c === "\n" || c === "\r") && !quoted){
      if(c === "\r" && n === "\n") i++;
      row.push(cell); if(row.some(v=>v.trim()!=="")) rows.push(row);
      row=[];cell="";
    } else cell+=c;
  }
  if(cell.length || row.length){row.push(cell);if(row.some(v=>v.trim()!==""))rows.push(row);}
  if(!rows.length) return [];
  const headers=rows.shift().map(h=>h.trim());
  return rows.map(values=>Object.fromEntries(headers.map((h,i)=>[h,(values[i]??"").trim()])));
}

function getField(record, aliases) {
  const keys=Object.keys(record);
  for(const alias of aliases){
    const found=keys.find(k=>keyNorm(k)===keyNorm(alias));
    if(found && norm(record[found])!=="") return record[found];
  }
  return "";
}
function standardizeBrand(r){
  return {
    "Record Type":"Brand",
    "Brand":getField(r,["Brand","Brands","Wine","Product","Product Name","Name"]),
    "Alcohol %":getField(r,["Alcohol %","Alcohol","Alcohol Percentage","ABV"]),
    "Batch":getField(r,["Batch","Batch ID","Lot","Lot Number"]),
    "Tank":getField(r,["Tank","Tank ID","Vessel"]),
    "Date":getField(r,["Date","Sample Date"]),
    "pH":getField(r,["pH"]),
    "TA":getField(r,["TA","Total Acidity"]),
    "Free SO2":getField(r,["Free SO2","Free SO₂","FSO2","Free Sulphur Dioxide"]),
    "Total SO2":getField(r,["Total SO2","Total SO₂","TSO2","Total Sulphur Dioxide"]),
    "VA":getField(r,["VA","Volatile Acidity"]),
    "RS":getField(r,["RS","Residual Sugar"]),
    "Notes":getField(r,["Notes","Comments","Remarks"])
  };
}
function standardizeLab(r){
  const out=standardizeBrand(r);
  out["Record Type"]="Lab";
  return out;
}
function isLabRow(r){
  return ["Date","pH","TA","Free SO2","Total SO2","VA","RS","Batch","Tank"].some(k=>norm(r[k])!=="");
}
async function fetchCsv(url){
  const response=await fetch(url,{cache:"no-store"});
  if(!response.ok) throw new Error(`Could not load CSV (HTTP ${response.status})`);
  return parseCSV(await response.text());
}
async function loadData(){
  setStatus("Loading spreadsheet data…");
  let records=[];
  try{
    const jobs=[];
    if(CONFIG.brandCsvUrl.trim()) jobs.push(fetchCsv(CONFIG.brandCsvUrl.trim()).then(rows=>rows.map(standardizeBrand)));
    if(CONFIG.labCsvUrl.trim()) jobs.push(fetchCsv(CONFIG.labCsvUrl.trim()).then(rows=>rows.map(standardizeLab)));
    if(jobs.length){
      const groups=await Promise.all(jobs);
      records=groups.flat().filter(r=>r.Brand || r.Batch || r.Tank || isLabRow(r));
      dataSource="Google Sheets";
      localStorage.setItem(CONFIG.cacheKey,JSON.stringify({savedAt:new Date().toISOString(),records}));
      setStatus(`Connected to ${dataSource}. Last refreshed ${new Date().toLocaleString()}.`,"ok");
    } else {
      throw new Error("Add your published CSV URL(s) in app.js to connect Google Sheets.");
    }
  } catch(error){
    const cached=localStorage.getItem(CONFIG.cacheKey);
    if(cached){
      try{
        const parsed=JSON.parse(cached); records=parsed.records||[]; dataSource="saved offline data";
        setStatus(`Using ${dataSource}${parsed.savedAt ? " from "+new Date(parsed.savedAt).toLocaleString() : ""}. ${error.message}`,"");
      }catch(_){ records=[]; }
    }
    if(!records.length){
      records=SAMPLE_BRANDS.map(standardizeBrand); dataSource="sample data";
      setStatus(`Showing sample data. ${error.message}`,"");
    }
  }
  allRecords=records;
  render();
}
function setStatus(message,type=""){
  const el=$("status");el.textContent=message;el.className="status"+(type?" "+type:"");
}
function uniqueCount(field){
  return new Set(allRecords.map(r=>norm(r[field])).filter(Boolean)).size;
}
function render(){
  $("brandCount").textContent=uniqueCount("Brand");
  $("labCount").textContent=allRecords.filter(r=>r["Record Type"]==="Lab"||isLabRow(r)).length;
  $("batchCount").textContent=uniqueCount("Batch");
  $("tankCount").textContent=uniqueCount("Tank");
  const analysisFields=["pH","TA","Free SO2","Total SO2","VA","RS","Alcohol %"];
  const current=$("analysisFilter").value;
  $("analysisFilter").innerHTML='<option value="all">All analyses</option>'+analysisFields.map(k=>`<option value="${k}">${k}</option>`).join("");
  $("analysisFilter").value=analysisFields.includes(current)?current:"all";
  renderTable();
}
function renderTable(){
  const query=$("searchInput").value.trim().toLowerCase();
  const type=$("typeFilter").value, analysis=$("analysisFilter").value;
  let rows=allRecords.filter(r=>{
    const rowType=(r["Record Type"]==="Lab"||isLabRow(r))?"lab":"brand";
    if(type!=="all"&&type!==rowType)return false;
    if(analysis!=="all"&&!norm(r[analysis]))return false;
    const haystack=Object.values(r).join(" ").toLowerCase();
    return !query||haystack.includes(query);
  });
  const columns=["Record Type","Date","Brand","Alcohol %","Batch","Tank","pH","TA","Free SO2","Total SO2","VA","RS","Notes"];
  $("tableHead").innerHTML=columns.map(c=>`<th>${escapeHtml(c)}</th>`).join("");
  $("tableBody").innerHTML=rows.slice(0,1000).map(r=>`<tr>${columns.map(c=>`<td>${escapeHtml(norm(r[c]))}</td>`).join("")}</tr>`).join("");
  $("resultSummary").textContent=`${rows.length} matching record${rows.length===1?"":"s"}${rows.length>1000?" (first 1,000 shown)":""}`;
  $("emptyState").hidden=rows.length!==0;
}
function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
$("searchInput").addEventListener("input",renderTable);
$("typeFilter").addEventListener("change",renderTable);
$("analysisFilter").addEventListener("change",renderTable);
$("refreshBtn").addEventListener("click",loadData);
$("clearBtn").addEventListener("click",()=>{
  $("searchInput").value="";$("typeFilter").value="all";$("analysisFilter").value="all";renderTable();
});
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(err=>console.warn("Service worker registration failed",err)));
}
loadData();
