import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowLeft, ArrowRight, BookOpen, Braces, Check, CheckCircle2,
  ChevronDown, ChevronRight, CircleAlert, CircleCheck, CircleX, ClipboardCheck, Code2, Copy,
  Cpu, Download, ExternalLink, FileCode2, FileJson, FlaskConical, GitBranch, Github, Heart,
  Layers3, LockKeyhole, Menu, MonitorPlay, Play, RotateCcw, Search, Shield, ShieldAlert,
  ShieldCheck, SlidersHorizontal, Sparkles, Sword, TerminalSquare, Timer, Trophy, X, Zap,
} from "lucide-react";
import {
  initializeEngine, runEngine, type MigrationResult, type PerformanceResult, type ReleaseResult, type SaveResult,
} from "./engine";
import { repoBase, testCases, type TestGroup } from "./testCatalog";

type Lab = "save" | "migration" | "performance" | "release";
type Audience = "recruiter" | "engineer";
type Section = "tests" | "files";
type MetricKey = "load_time_ms" | "frame_time_p95_ms" | "memory_mb";

const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin).href;
const githubUrl = "https://github.com/the-victor-marino/gameguard-qa";
const baseline: Record<MetricKey, number> = {load_time_ms:1800,frame_time_p95_ms:16.5,memory_mb:1450};
const budgets: Record<MetricKey,number> = {load_time_ms:10,frame_time_p95_ms:10,memory_mb:15};
const goodPerf: Record<MetricKey,number> = {load_time_ms:1870,frame_time_p95_ms:16.8,memory_mb:1480};
const badPerf: Record<MetricKey,number> = {load_time_ms:2350,frame_time_p95_ms:21,memory_mb:1820};
const metricLabels: Record<MetricKey,string> = {load_time_ms:"Load time",frame_time_p95_ms:"p95 frame time",memory_mb:"Memory usage"};
const metricUnits: Record<MetricKey,string> = {load_time_ms:"ms",frame_time_p95_ms:"ms",memory_mb:"MB"};

const initialSave = {
  save_version:2, player:{level:27,health:63,experience:8400,position:{map_id:"castle_02",x:18,y:44.5}},
  inventory:[{item_id:"moonblade",quantity:1,unique:true,equipped:true},{item_id:"mana_potion",quantity:7,unique:false,equipped:false}],
  currency:4820, quests:{tutorial:"completed",royal_audience:"active"},difficulty:"normal"
};
const initialLegacy = {
  save_version:1,player:{level:27,health:63,position:{map_id:"castle_02",x:18,y:44.5}},
  inventory:[{item_id:"moonblade",quantity:1,unique:true},{item_id:"mana_potion",quantity:7,unique:false}],
  currency:4820,quests:{tutorial:"completed",royal_audience:"active"}
};
const pretty = (value:unknown) => JSON.stringify(value,null,2);
const formatNum = (n:number) => Number.isInteger(n) ? n.toLocaleString("en-US") : n.toFixed(1);

const labs: {id:Lab;number:string;title:string;subtitle:string;theme:string}[]=[
  {id:"save",number:"01",title:"Break a save",subtitle:"Catch corrupted player data",theme:"mint"},
  {id:"migration",number:"02",title:"Update the game",subtitle:"Protect what players earned",theme:"purple"},
  {id:"performance",number:"03",title:"Slow down a build",subtitle:"Spot performance regressions",theme:"amber"},
  {id:"release",number:"04",title:"Ship or block?",subtitle:"Make a release decision",theme:"blue"}
];
const tourSteps=[
  {title:"This is a game save.",caption:"A player has health, gold, items and completed quests. All of it must survive a game update.",lab:"save" as Lab},
  {title:"Let's break it.",caption:"Inject impossible values, then run the actual Python Save Guardian. Notice how it identifies the exact problem.",lab:"save" as Lab},
  {title:"Now update the game.",caption:"Try migrating an old save. Then deliberately delete an item to see the progression check fail.",lab:"migration" as Lab},
  {title:"What if the game gets slower?",caption:"Test measurements against the previous build. The budgets decide what's acceptable.",lab:"performance" as Lab},
  {title:"Would you approve this release?",caption:"Combine corrupted save data and poor performance. The Python quality gate makes the call.",lab:"release" as Lab}
];

function Tag({children,kind="neutral"}:{children:React.ReactNode;kind?:string}) {
  return <span className={"tag tag-"+kind}>{children}</span>;
}
function Status({pass,label}:{pass:boolean;label?:string}) {
  return <span className={"result-pill "+(pass?"pass":"fail")}>{pass?<CheckCircle2 size={13}/>:<CircleX size={13}/>} {label||(pass?"PASS":"FAIL")}</span>;
}
function SectionHeader({eyebrow,title,body}:{eyebrow:string;title:string;body:string}) {
  return <div className="section-heading"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{body}</p></div>;
}
function SourceLink({path,children}:{path:string;children?:React.ReactNode}) {
  return <a className="source-link" href={repoBase+path} target="_blank" rel="noreferrer">{children||path}<ExternalLink size={13}/></a>;
}
function MetricBar({name,metric}:{name:MetricKey;metric:{baseline:number;current:number;budget:number;regression_percent:number;passed:boolean}}) {
  const regression=metric.regression_percent;
  const p=Math.max(0,Math.min(100,((regression+5)/45)*100));
  const limit=Math.max(0,Math.min(100,((metric.budget+5)/45)*100));
  return <div className="metric-result">
    <div className="metric-top"><strong>{metricLabels[name]}</strong><Status pass={metric.passed}/></div>
    <div className="metric-stats"><span>{formatNum(metric.baseline)} → <b>{formatNum(metric.current)} {metricUnits[name]}</b></span><span className={metric.passed?"safe-text":"danger-text"}>{regression>=0?"+":""}{regression.toFixed(1)}%</span></div>
    <div className="progress-track"><span className="progress-limit" style={{left:limit+"%"}}/><span className={"progress-fill "+(metric.passed?"mint":"red")} style={{width:p+"%"}}/></div>
    <span className="metric-caption">Allowed regression: +{metric.budget}% · vertical mark = limit</span>
  </div>;
}
function MiniStats({label,value,icon}:{label:string;value:string;icon:React.ReactNode}) {
  return <div className="mini-stat"><span className="mini-icon">{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>;
}
function JsonPreview({value,title}:{value:unknown;title:string}) {
  return <div className="json-preview"><div className="json-preview-title"><FileJson size={15}/>{title}</div><pre>{pretty(value)}</pre></div>;
}
function highlightLines(source:string,func:string){
  const lines=source.split("\n"),start=lines.findIndex((line)=>line.includes("def "+func+"("));
  if(start<0)return source;
  let end=lines.findIndex((line,i)=>i>start&&(/^def |^@pytest\.|^class /).test(line));
  if(end<0)end=lines.length;
  return lines.slice(Math.max(0,start-1),end).join("\n").trim();
}

export default function App(){
  const [audience,setAudience]=useState<Audience>("recruiter");
  const [activeLab,setActiveLab]=useState<Lab>("save");
  const [engineState,setEngineState]=useState<"loading"|"ready"|"error">("loading");
  const [engineDetail,setEngineDetail]=useState("Starting browser Python runtime…");
  const [engineError,setEngineError]=useState("");
  const [tourStep,setTourStep]=useState<number|null>(null);
  const [mobileMenu,setMobileMenu]=useState(false);
  const [saveText,setSaveText]=useState(pretty(initialSave));
  const [savePreset,setSavePreset]=useState("Healthy v2");
  const [saveResult,setSaveResult]=useState<SaveResult|null>(null);
  const [migrationMode,setMigrationMode]=useState("safe");
  const [legacy,setLegacy]=useState<Record<string,unknown>>(initialLegacy);
  const [migrationResult,setMigrationResult]=useState<MigrationResult|null>(null);
  const [perf,setPerf]=useState<Record<MetricKey,number>>(goodPerf);
  const [perfResult,setPerfResult]=useState<PerformanceResult|null>(null);
  const [releaseResult,setReleaseResult]=useState<ReleaseResult|null>(null);
  const [working,setWorking]=useState<string|null>(null);
  const [actionError,setActionError]=useState<string|null>(null);
  const [detailSection,setDetailSection]=useState<Section>("tests");
  const [testFilter,setTestFilter]=useState("All");
  const [testQuery,setTestQuery]=useState("");
  const [selectedTest,setSelectedTest]=useState(testCases[0].id);
  const [manifest,setManifest]=useState<string[]>([]);
  const [fileQuery,setFileQuery]=useState("");
  const [selectedFile,setSelectedFile]=useState("gameguard/save_guard/validator.py");
  const [sourceText,setSourceText]=useState("");
  const [testSource,setTestSource]=useState("");
  const labRef=useRef<HTMLDivElement>(null);
  const underRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    initializeEngine(setEngineDetail).then(()=>setEngineState("ready")).catch((err:Error)=>{setEngineState("error");setEngineError(err.message);});
    fetch(new URL("engine/manifest.json",baseUrl)).then(r=>r.json()).then(d=>setManifest(d.files||[])).catch(()=>{});
    Promise.all([
      fetch(new URL("engine/test_data/saves/valid_save_v2.json",baseUrl)).then(r=>r.json()),
      fetch(new URL("engine/test_data/saves/legacy_save_v1.json",baseUrl)).then(r=>r.json())
    ]).then(([save,old])=>{setSaveText(pretty(save));setLegacy(old);}).catch(()=>{});
  },[]);

  useEffect(()=>{
    if(!selectedFile)return;
    let cancelled=false;
    fetch(new URL("engine/"+selectedFile,baseUrl)).then(r=>r.ok?r.text():Promise.reject(Error("File unavailable"))).then(t=>{if(!cancelled)setSourceText(t);}).catch(()=>{if(!cancelled)setSourceText("Source preview unavailable. Use GitHub to inspect the file.");});
    return()=>{cancelled=true;};
  },[selectedFile]);

  const currentTest=useMemo(()=>testCases.find(t=>t.id===selectedTest)||testCases[0],[selectedTest]);
  useEffect(()=>{
    let cancelled=false;
    fetch(new URL("engine/"+currentTest.file,baseUrl)).then(r=>r.text()).then(text=>{if(!cancelled)setTestSource(highlightLines(text,currentTest.functionName));}).catch(()=>setTestSource("Open GitHub to view the source."));
    return()=>{cancelled=true;};
  },[currentTest]);

  const visibleTests=useMemo(()=>testCases.filter(t=>
    (testFilter==="All"||t.group===testFilter) &&
    (t.functionName+" "+t.why+" "+t.example+" "+t.skill).toLowerCase().includes(testQuery.toLowerCase())
  ),[testFilter,testQuery]);
  const visibleFiles=useMemo(()=>manifest.filter(p=>p.toLowerCase().includes(fileQuery.toLowerCase())),[manifest,fileQuery]);

  const run = async <T,>(label:string,fn:()=>Promise<T>,update:(result:T)=>void)=>{
    setWorking(label);setActionError(null);
    try{update(await fn());}catch(err){setActionError(err instanceof Error?err.message:String(err));}
    finally{setWorking(null);}
  };
  const validate=()=>run("Validating",()=>runEngine<SaveResult>("save",{saveText}),setSaveResult);
  const migrate=()=>{
    const input={...legacy,...(migrationMode==="future"?{save_version:999}:{})};
    return run("Migrating",()=>runEngine<MigrationResult>("migration",{save:input,fault:migrationMode==="future"?"safe":migrationMode}),setMigrationResult);
  };
  const performance=()=>run("Comparing",()=>runEngine<PerformanceResult>("performance",{baseline,current:perf,budgets}),setPerfResult);
  const release=()=>run("Evaluating",()=>runEngine<ReleaseResult>("release",{saveText,baseline,current:perf}),setReleaseResult);

  const preset = (type:string)=>{
    const copy=structuredClone(initialSave);
    let content=pretty(copy);
    if(type==="Negative HP"){copy.player.health=-500;content=pretty(copy);}
    if(type==="Duplicate item"){copy.inventory.push({...copy.inventory[0]});content=pretty(copy);}
    if(type==="Broken quest"){copy.quests.royal_audience="almost_completed";content=pretty(copy);}
    if(type==="All defects"){const bad=structuredClone(copy);bad.player.health=-500;bad.player.level=0;bad.player.position.map_id="";bad.currency=-999;bad.inventory.push({...bad.inventory[0]});bad.quests.royal_audience="almost_completed";content=pretty(bad);}
    if(type==="Malformed JSON")content='{"player": {"level": 10, "health": ';
    setSaveText(content);setSavePreset(type);setSaveResult(null);setReleaseResult(null);
  };
  const perfPreset=(type:"good"|"bad")=>{setPerf(type==="good"?{...goodPerf}:{...badPerf});setPerfResult(null);setReleaseResult(null);};
  const route=(lab:Lab)=>{setActiveLab(lab);setMobileMenu(false);labRef.current?.scrollIntoView({behavior:"smooth",block:"start"});};
  const tour=(index:number)=>{
    if(index>=tourSteps.length){setTourStep(null);return;}
    setTourStep(index);
    const step=tourSteps[index];setActiveLab(step.lab);
    if(index===0)preset("Healthy v2");
    if(index===1)preset("All defects");
    if(index===2){setMigrationMode("lose-item");setMigrationResult(null);}
    if(index===3)perfPreset("bad");
    if(index===4){preset("All defects");perfPreset("bad");}
    labRef.current?.scrollIntoView({behavior:"smooth",block:"start"});
  };
  const openTest=(keyword:string)=>{
    const test=testCases.find(t=>t.functionName.includes(keyword)||t.why.toLowerCase().includes(keyword.toLowerCase()))||testCases[0];
    setSelectedTest(test.id);setTestFilter("All");setTestQuery("");setAudience("engineer");setDetailSection("tests");
    underRef.current?.scrollIntoView({behavior:"smooth",block:"start"});
  };
  const copyToClipboard=(text:string)=>{void navigator.clipboard?.writeText(text);};
  const downloadReport=()=>{
    if(!releaseResult)return;
    const url=URL.createObjectURL(new Blob([releaseResult.report],{type:"text/markdown;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download="gameguard-quality-report.md";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const engineReady=engineState==="ready";
  const groupCounts: Record<string,number> = testCases.reduce((acc,t)=>({...acc,[t.group]:(acc[t.group]||0)+1}),{} as Record<string,number>);

  return <div className="site">
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
    <header className="site-header">
      <a className="brand" href="#top"><span className="brand-icon"><ShieldCheck size={23}/></span><span>GAMEGUARD<span className="brand-muted"> / QA LAB</span></span></a>
      <nav className={mobileMenu?"main-nav open":"main-nav"}>
        <a href="#about" onClick={()=>setMobileMenu(false)}>Why it matters</a>
        <a href="#lab" onClick={()=>setMobileMenu(false)}>Interactive lab</a>
        <a href="#inside" onClick={()=>setMobileMenu(false)}>Under the hood</a>
        <a href={githubUrl} target="_blank" rel="noreferrer"><Github size={16}/> Source</a>
      </nav>
      <div className="header-right">
        <span className={"engine-indicator "+engineState}><span className="status-dot"/><span className="engine-label">{engineState==="ready"?"Python online":engineState==="loading"?"Loading Python":"Engine offline"}</span></span>
        <button className="mobile-toggle" aria-label="Toggle menu" onClick={()=>setMobileMenu(!mobileMenu)}>{mobileMenu?<X/>:<Menu/>}</button>
      </div>
    </header>

    <main id="top">
      <section className="hero outer">
        <div className="hero-copy">
          <div className="eyebrow hero-eyebrow"><span className="pulse-dot"/> BUILD QUALITY, MADE PLAYABLE <span className="tiny-chevron">/ 01</span></div>
          <h1>A passing build<br/>can still <span className="gradient-text">break<br className="desktop-break"/> a player's world.</span></h1>
          <p className="hero-lede">What if the next update deletes a legendary sword, corrupts a save, or slows gameplay to a crawl?</p>
          <p className="hero-sub">Break a simulated game build. Run <b>real Python QA checks</b> in your browser. See why automated release decisions matter.</p>
          <div className="hero-actions">
            <button className="button primary large" onClick={()=>route("save")}><Play size={17} fill="currentColor"/> Enter the QA lab <ArrowRight size={17}/></button>
            <button className="button ghost large" onClick={()=>tour(0)}><MonitorPlay size={17}/> Take the 2-min tour</button>
          </div>
          <div className="hero-proof"><span><Check size={14}/> 30 automated cases</span><i/><span><Check size={14}/> Actual Python source</span><i/><span><Check size={14}/> Free to explore</span></div>
        </div>
        <div className="hero-visual" aria-label="GameGuard conceptual QA dashboard">
          <div className="floating-label float-left"><span className="little-red-dot"/> RELEASE BLOCKER DETECTED</div>
          <div className="window-preview">
            <div className="window-top"><div className="window-dots"><i/><i/><i/></div><span>GAMEGUARD / build-042</span><span className="window-live"><span/> LIVE PREVIEW</span></div>
            <div className="window-body">
              <div className="preview-section"><span className="preview-eyebrow">PLAYER SAVE DATA</span><Tag kind="mint">v2.0</Tag></div>
              <div className="player-card">
                <div className="pixel-avatar">✦</div>
                <div className="player-identity"><strong>The Wanderer</strong><span>LEVEL 27 <span className="muted-arrow">/</span> CASTLE 02</span></div>
                <span className="heart-chip"><Heart size={14} fill="currentColor"/> 63 HP</span>
              </div>
              <div className="preview-stats"><MiniStats icon={<Sword size={16}/>} label="RARE ITEM" value="Moonblade"/><MiniStats icon={<Trophy size={16}/>} label="CURRENCY" value="4,820"/></div>
              <div className="preview-divider"/>
              <div className="preview-section"><span className="preview-eyebrow">QA DIAGNOSTICS</span><span className="monospace small-muted">01 / 03</span></div>
              <div className="preview-issue"><span className="issue-symbol"><ShieldAlert size={17}/></span><div><strong>Duplicate unique item</strong><small>SAVE-011 <span className="soft-divider">·</span> inventory[1]</small></div><Tag kind="red">HIGH</Tag></div>
              <div className="preview-issue dimmed"><span className="issue-symbol amber"><Timer size={17}/></span><div><strong>Load time regression</strong><small>PERF-load_time_ms <span className="soft-divider">·</span> +30.6%</small></div><Tag kind="amber">HIGH</Tag></div>
              <div className="preview-verdict"><div><small>RELEASE DECISION</small><strong><CircleX size={19}/> BUILD BLOCKED</strong></div><LockKeyhole size={22}/></div>
            </div>
          </div>
          <div className="floating-label float-right"><span className="little-mint-dot"/> PLAYER PROGRESS PROTECTED</div>
          <span className="grid-decoration top-right">+</span><span className="grid-decoration bottom-left">+</span>
        </div>
      </section>

      <div className="proof-strip outer"><div><strong>30</strong><span>executed pytest cases</span></div><div><strong>05</strong><span>testing categories</span></div><div><strong>03</strong><span>critical risk areas</span></div><div className="proof-repo"><Github size={23}/><span>Open source<br/><a href={githubUrl} target="_blank" rel="noreferrer">Explore on GitHub <ArrowRight size={13}/></a></span></div></div>

      <section id="about" className="why-section outer">
        <SectionHeader eyebrow="01 / THE PROBLEM" title="It loaded. But is it safe?" body="A game can start normally while still containing defects that cost players hours of progress. Here are three ways that happens."/>
        <div className="risk-grid">
          <div className="risk-card"><span className="risk-icon pink"><Sword/></span><span className="risk-number">RISK 01</span><h3>The missing sword</h3><p>An update loads an old save but quietly deletes a rare item. Nobody notices until a player reports it.</p><span className="risk-solution"><CheckCircle2 size={16}/> Check progression after migration</span></div>
          <div className="risk-card"><span className="risk-icon violet"><FileJson/></span><span className="risk-number">RISK 02</span><h3>The impossible save</h3><p>Negative gold. Duplicate unique items. Quest states that should never exist. Data can break gameplay without crashing.</p><span className="risk-solution"><CheckCircle2 size={16}/> Validate every saved invariant</span></div>
          <div className="risk-card"><span className="risk-icon gold"><Activity/></span><span className="risk-number">RISK 03</span><h3>The invisible slowdown</h3><p>A new build runs, but the loading screen now takes 30% longer. One update is all it takes.</p><span className="risk-solution"><CheckCircle2 size={16}/> Compare builds against budgets</span></div>
        </div>
      </section>

      <section id="lab" ref={labRef} className="lab-section outer">
        <SectionHeader eyebrow="02 / HANDS-ON QA" title="Don't just read it. Break it." body="Every Run button uses the GameGuard Python modules from the same repository as the automated test suite."/>
        <div className="lab-frame">
          <div className="lab-topbar"><div className="lab-brandline"><FlaskConical size={18}/> INTERACTIVE TEST BENCH <span className="lab-beta">V1.0</span></div><div className="audience-switch"><button className={audience==="recruiter"?"selected":""} onClick={()=>setAudience("recruiter")}>Recruiter tour</button><button className={audience==="engineer"?"selected":""} onClick={()=>setAudience("engineer")}>QA engineer</button></div></div>
          {tourStep!==null&&<div className="guided-tour">
            <span className="tour-icon"><Sparkles size={17}/></span>
            <div className="tour-description"><span className="tour-counter">GUIDED TOUR · STEP {tourStep+1} OF {tourSteps.length}</span><strong>{tourSteps[tourStep].title}</strong><p>{tourSteps[tourStep].caption}</p></div>
            <div className="tour-actions"><button className="tiny-button" onClick={()=>setTourStep(null)} aria-label="Close guided tour"><X size={17}/></button><button className="button primary small" onClick={()=>tour(tourStep+1)}>{tourStep===tourSteps.length-1?"Finish tour":"Next"} <ArrowRight size={15}/></button></div>
          </div>}
          <div className="lab-tabs">{labs.map(l=><button key={l.id} className={"lab-tab "+(activeLab===l.id?"active":"")} onClick={()=>setActiveLab(l.id)}><small>{l.number}</small><strong>{l.title}</strong><span>{l.subtitle}</span></button>)}</div>
          {engineState==="loading"&&<div className="engine-alert"><span className="spinner"/><div><strong>Booting Python in your browser</strong><p>{engineDetail}</p></div></div>}
          {engineState==="error"&&<div className="engine-alert error"><CircleAlert size={20}/><div><strong>The Python runtime couldn't load.</strong><p>{engineError}. The site remains browsable; executing tests requires access to the Pyodide CDN. Try refreshing with an internet connection.</p></div></div>}
          {actionError&&<div className="engine-alert error"><CircleAlert size={18}/><p>{actionError}</p><button onClick={()=>setActionError(null)} aria-label="Dismiss error"><X size={16}/></button></div>}
          <div className="lab-content">
            {activeLab==="save"&&<div className="lab-grid">
              <div className="input-panel">
                <div className="panel-top"><div><span className="panel-eyebrow">INPUT / 01</span><h3>Player save editor</h3></div><Tag kind="mint"><FileJson size={13}/> JSON</Tag></div>
                <p className="panel-help">Choose a defect preset or edit the JSON yourself. Then run the real Save Guardian.</p>
                <div className="preset-group"><span className="input-caption">INJECT A SCENARIO</span><div className="preset-list">{["Healthy v2","Negative HP","Duplicate item","Broken quest","All defects","Malformed JSON"].map(name=><button key={name} className={"preset "+(savePreset===name?"active":"")} onClick={()=>preset(name)}>{name}</button>)}</div></div>
                <div className="editor-top"><span><span className="little-mint-dot"/> player.save.json</span><button className="text-button" onClick={()=>{preset("Healthy v2")}}><RotateCcw size={13}/> Reset</button></div>
                <textarea aria-label="Editable player save JSON" className="json-editor" spellCheck={false} value={saveText} onChange={e=>{setSaveText(e.target.value);setSavePreset("Custom");setSaveResult(null);setReleaseResult(null);}}/>
                <div className="panel-bottom"><span><LockKeyhole size={13}/> Runs locally in your browser</span><button className="button primary" disabled={!engineReady||!!working} onClick={validate}>{working==="Validating"?<span className="spinner small"/>:<Play size={15} fill="currentColor"/>} Run validation <ArrowRight size={15}/></button></div>
              </div>
              <div className="output-panel">
                <div className="panel-top"><div><span className="panel-eyebrow">OUTPUT / 01</span><h3>Save Guardian</h3></div>{saveResult&&<Status pass={saveResult.safe}/>}</div>
                {!saveResult?<div className="empty-output"><Shield size={48}/><h4>Waiting for inspection</h4><p>Select a scenario and click Run validation to see the actual Python diagnostic report.</p></div>:
                <><div className={"verdict "+(saveResult.safe?"positive":"negative")}><span>{saveResult.safe?<CheckCircle2 size={25}/>:<ShieldAlert size={25}/>}</span><div><small>VALIDATION RESULT</small><strong>{saveResult.safe?"SAVE INTEGRITY CONFIRMED":"UNSAFE SAVE DETECTED"}</strong><p>{saveResult.issues.length} issues · {saveResult.critical} critical</p></div></div>
                {saveResult.issues.length===0?<div className="no-issues"><Check size={18}/> Current-version save satisfies the validation rules.</div>:
                <div className="issue-list">{saveResult.issues.map((issue,i)=><div className="issue-row" key={issue.code+"-"+i}><div className="issue-row-top"><Tag kind={issue.severity==="CRITICAL"?"red":"amber"}>{issue.severity}</Tag><code>{issue.code}</code></div><strong>{issue.message}</strong><span className="issue-path">{issue.path}</span><button className="underlined-action" onClick={()=>openTest(issue.code==="SAVE-011"?"duplicate_unique":issue.code==="SAVE-017"?"truncated_json":issue.code==="SAVE-013"?"invalid_quest":"health_outside")}>See related test <ArrowRight size={13}/></button></div>)}</div>}
                <div className="panel-tip"><BookOpen size={17}/><span>The validator doesn't just throw an exception. It identifies <b>what failed, where, and how severely</b>.</span></div></>}
              </div>
            </div>}
            {activeLab==="migration"&&<div className="lab-grid">
              <div className="input-panel"><div className="panel-top"><div><span className="panel-eyebrow">INPUT / 02</span><h3>Legacy save migration</h3></div><Tag kind="purple">v1 → v2</Tag></div>
                <p className="panel-help">The player earned these items before an update. Will their progress survive the migration?</p>
                <div className="legacy-character"><span className="legacy-avatar">✦</span><div><strong>Level 27 adventurer</strong><small>Castle 02 · Save version 1</small></div></div>
                <div className="inventory-rows"><div><Sword size={17}/><strong>Moonblade</strong><Tag kind="purple">UNIQUE</Tag><span>×1</span></div><div><Trophy size={17}/><strong>Gold</strong><span>4,820</span></div><div><ClipboardCheck size={17}/><strong>Royal Audience</strong><span>Active</span></div></div>
                <div className="preset-group"><span className="input-caption">MIGRATION SCENARIO</span><div className="option-stack">
                  {[["safe","Safe migration","Add new fields without touching progression"],["lose-item","Lose the Moonblade","Simulate a faulty migration that drops an item"],["lose-currency","Lose the gold","Simulate currency reset during migration"],["future","Unsupported save","Try loading version 999"]].map(([id,title,desc])=><button key={id} className={"choice "+(migrationMode===id?"checked":"")} onClick={()=>{setMigrationMode(id);setMigrationResult(null);}}><span className="radio-symbol"/><span><strong>{title}</strong><small>{desc}</small></span></button>)}
                </div></div>
                <div className="panel-bottom"><SourceLink path="gameguard/save_guard/compatibility.py">View compatibility.py</SourceLink><button className="button primary" disabled={!engineReady||!!working} onClick={migrate}>{working==="Migrating"?<span className="spinner small"/>:<GitBranch size={16}/>} Run migration <ArrowRight size={15}/></button></div>
              </div>
              <div className="output-panel"><div className="panel-top"><div><span className="panel-eyebrow">OUTPUT / 02</span><h3>Progression preservation</h3></div>{migrationResult&&<Status pass={migrationResult.passed}/>}</div>
                {!migrationResult?<div className="empty-output"><GitBranch size={48}/><h4>Waiting for the update</h4><p>Run the migration to compare the old save with the new one.</p></div>:
                <><div className={"verdict "+(migrationResult.passed?"positive":"negative")}><span>{migrationResult.passed?<CheckCircle2 size={25}/>:<CircleX size={25}/>}</span><div><small>MIGRATION RESULT</small><strong>{migrationResult.passed?"PROGRESSION PRESERVED":"MIGRATION REGRESSION"}</strong><p>{migrationResult.passed?"All protected player data remains unchanged.":migrationResult.error}</p></div></div>
                <div className="compare-cards"><div><span className="panel-eyebrow">BEFORE · V1</span><div className="compare-row"><span>Gold</span><b>{String(migrationResult.before.currency??"—")}</b></div><div className="compare-row"><span>Inventory items</span><b>{Array.isArray(migrationResult.before.inventory)?migrationResult.before.inventory.length:"—"}</b></div><div className="compare-row"><span>Version</span><b>{String(migrationResult.before.save_version)}</b></div></div><div><span className="panel-eyebrow">AFTER · V2</span><div className="compare-row"><span>Gold</span><b>{String(migrationResult.after?.currency??"—")}</b></div><div className="compare-row"><span>Inventory items</span><b>{Array.isArray(migrationResult.after?.inventory)?migrationResult.after.inventory.length:"—"}</b></div><div className="compare-row"><span>Version</span><b>{String(migrationResult.after?.save_version??"—")}</b></div></div></div>
                {audience==="engineer"&&migrationResult.after&&<details className="extra-details"><summary>Inspect migrated JSON <ChevronDown size={15}/></summary><JsonPreview value={migrationResult.after} title="Migrated payload"/></details>}
                <div className="panel-tip"><BookOpen size={17}/><span><b>A successful load isn't sufficient.</b> Regression tests must verify the player's items, currency, quests, level and position survived.</span></div></>}
              </div>
            </div>}
            {activeLab==="performance"&&<div className="lab-grid">
              <div className="input-panel"><div className="panel-top"><div><span className="panel-eyebrow">INPUT / 03</span><h3>Build telemetry</h3></div><Tag kind="amber">SIMULATED METRICS</Tag></div>
                <p className="panel-help">Adjust the new build's measurements. GameGuard compares them to a known baseline, applying a budget to each metric.</p>
                <div className="preset-group"><span className="input-caption">QUICK SCENARIOS</span><div className="preset-list"><button className="preset" onClick={()=>perfPreset("good")}>Healthy build</button><button className="preset" onClick={()=>perfPreset("bad")}>Regressed build</button></div></div>
                <div className="slider-list">{(Object.keys(baseline) as MetricKey[]).map(key=><div className="metric-control" key={key}>
                    <div className="slider-head"><label htmlFor={"slider-"+key}>{metricLabels[key]}</label><strong>{formatNum(perf[key])} {metricUnits[key]}</strong></div>
                    <input id={"slider-"+key} type="range" min={key==="load_time_ms"?1200:key==="frame_time_p95_ms"?10:900} max={key==="load_time_ms"?3100:key==="frame_time_p95_ms"?30:2400} step={key==="frame_time_p95_ms"?.1:10} value={perf[key]} onChange={e=>{setPerf({...perf,[key]:Number(e.target.value)});setPerfResult(null);setReleaseResult(null);}}/>
                    <div className="slider-foot"><span>Baseline: {formatNum(baseline[key])}</span><span>Budget: +{budgets[key]}%</span></div>
                  </div>)}</div>
                <div className="panel-bottom"><SourceLink path="gameguard/performance/regression.py">View regression.py</SourceLink><button className="button primary" disabled={!engineReady||!!working} onClick={performance}>{working==="Comparing"?<span className="spinner small"/>:<Activity size={16}/>} Check performance <ArrowRight size={15}/></button></div>
              </div>
              <div className="output-panel"><div className="panel-top"><div><span className="panel-eyebrow">OUTPUT / 03</span><h3>Regression analysis</h3></div>{perfResult&&<Status pass={perfResult.passed}/>}</div>
                {!perfResult?<div className="empty-output"><Activity size={48}/><h4>Awaiting comparison</h4><p>Adjust the three sliders, then run the Python regression comparator.</p></div>:
                <><div className={"verdict "+(perfResult.passed?"positive":"negative")}><span>{perfResult.passed?<CheckCircle2 size={25}/>:<CircleX size={25}/>}</span><div><small>PERFORMANCE GATE</small><strong>{perfResult.passed?"WITHIN BUDGET":"PERFORMANCE REGRESSION"}</strong><p>{perfResult.metrics.filter(m=>!m.passed).length} metrics exceed the agreed limits</p></div></div>
                <div className="metric-results">{perfResult.metrics.map(metric=><MetricBar key={metric.name} name={metric.name as MetricKey} metric={metric}/>)}</div>
                <div className="panel-tip"><BookOpen size={17}/><span>These are <b>fixture-based measurements</b>, not live game-engine profiling. The comparator and threshold calculations are real Python.</span></div></>}
              </div>
            </div>}
            {activeLab==="release"&&<div className="lab-grid">
              <div className="input-panel"><div className="panel-top"><div><span className="panel-eyebrow">INPUT / 04</span><h3>Release candidate</h3></div><Tag kind="blue">QUALITY GATE</Tag></div>
                <p className="panel-help">The gate takes the save and telemetry you configured in the previous labs and decides whether to approve the release.</p>
                <div className="release-inputs"><div className="release-signal"><FileJson size={20}/><div><strong>Save integrity input</strong><span>{savePreset} · {saveText.length} characters</span></div><button onClick={()=>route("save")}>Edit <ArrowRight size={13}/></button></div><div className="release-signal"><Activity size={20}/><div><strong>Performance input</strong><span>{formatNum(perf.load_time_ms)} ms load · {formatNum(perf.frame_time_p95_ms)} ms p95</span></div><button onClick={()=>route("performance")}>Edit <ArrowRight size={13}/></button></div></div>
                <div className="preset-group"><span className="input-caption">TRY BOTH OUTCOMES</span><div className="preset-list"><button className="preset" onClick={()=>{preset("Healthy v2");perfPreset("good");}}>Good candidate</button><button className="preset" onClick={()=>{preset("All defects");perfPreset("bad");}}>Bad candidate</button></div></div>
                <div className="release-note"><CircleAlert size={17}/><span>The CLI quality gate combines save integrity and performance. Save migration is verified separately by the regression suite.</span></div>
                <div className="panel-bottom"><SourceLink path="gameguard/quality_gate/gate.py">View gate.py</SourceLink><button className="button primary" disabled={!engineReady||!!working} onClick={release}>{working==="Evaluating"?<span className="spinner small"/>:<ShieldCheck size={16}/>} Evaluate release <ArrowRight size={15}/></button></div>
              </div>
              <div className="output-panel"><div className="panel-top"><div><span className="panel-eyebrow">OUTPUT / 04</span><h3>Release verdict</h3></div>{releaseResult&&<Status pass={releaseResult.passed}/>}</div>
                {!releaseResult?<div className="empty-output"><ClipboardCheck size={48}/><h4>Release pending</h4><p>Run the gate to see the combined QA decision and generate a genuine Markdown report.</p></div>:
                <><div className={"verdict verdict-hero "+(releaseResult.passed?"positive":"negative")}><span>{releaseResult.passed?<CheckCircle2 size={29}/>:<LockKeyhole size={29}/>}</span><div><small>FINAL AUTOMATED VERDICT</small><strong>{releaseResult.passed?"BUILD APPROVED":"BUILD BLOCKED"}</strong><p>{releaseResult.blockers.length} blocking findings</p></div></div>
                <div className="gate-rows"><div><span><FileJson size={18}/> Save Guardian</span><Status pass={releaseResult.save_safe}/></div><div><span><Activity size={18}/> Performance budget</span><Status pass={releaseResult.performance_passed}/></div></div>
                {releaseResult.blockers.length>0&&<div className="blocker-list"><span className="input-caption">RELEASE BLOCKERS</span>{releaseResult.blockers.map((x,i)=><p key={i}><CircleX size={13}/>{x}</p>)}</div>}
                <div className="report-actions"><button className="button secondary" onClick={downloadReport}><Download size={16}/> Download QA report</button><button className="button outline" onClick={()=>copyToClipboard(releaseResult.report)}><Copy size={15}/> Copy</button></div>
                {audience==="engineer"&&<details className="extra-details"><summary>Show generated Markdown report <ChevronDown size={15}/></summary><pre className="report-preview">{releaseResult.report}</pre></details>}
                <div className="panel-tip"><BookOpen size={17}/><span>The gate checks the candidate against explicit release criteria. <b>Passing automation is evidence—not proof of a defect-free game.</b></span></div></>}
              </div>
            </div>}
          </div>
          <div className="lab-footer"><span><Cpu size={15}/> {engineState==="ready"?"Browser-side CPython via Pyodide":"Requires Python runtime"} <span className="soft-divider">/</span> no player saves uploaded</span><span>Actual gameguard modules <Check size={14}/></span></div>
        </div>
      </section>

      <section className="how-section outer">
        <SectionHeader eyebrow="03 / ONE BUILD, FOUR QUESTIONS" title="How the release decision works." body="A simple chain: test the game state, compare it, capture evidence, and decide whether to ship."/>
        <div className="pipeline">
          <div className="pipe-card"><span>01</span><FileJson/><strong>Is the save safe?</strong><p>Check the rules protecting gameplay and progression.</p></div>
          <ArrowRight className="pipe-arrow"/>
          <div className="pipe-card"><span>02</span><GitBranch/><strong>Will old saves survive?</strong><p>Run migrations and compare protected data.</p></div>
          <ArrowRight className="pipe-arrow"/>
          <div className="pipe-card"><span>03</span><Timer/><strong>Did the build get slower?</strong><p>Compare telemetry to agreed budgets.</p></div>
          <ArrowRight className="pipe-arrow"/>
          <div className="pipe-card final"><span>04</span><ShieldCheck/><strong>Can we release?</strong><p>Turn validation and performance signals into a gate.</p></div>
        </div>
      </section>

      <section id="inside" ref={underRef} className="inside-section outer">
        <SectionHeader eyebrow="04 / THE EVIDENCE" title="Go beyond the demo." body="For QA specialists: inspect the actual automated test cases, understand the assertions, and open every repository file."/>
        <div className="inside-layout">
          <div className="inside-sidebar">
            <div className="inside-sidebar-heading"><Code2 size={17}/> UNDER THE HOOD</div>
            <button className={detailSection==="tests"?"selected":""} onClick={()=>setDetailSection("tests")}><FlaskConical size={17}/> Test case explorer <span>{testCases.length}</span></button>
            <button className={detailSection==="files"?"selected":""} onClick={()=>setDetailSection("files")}><FileCode2 size={17}/> Repository files <span>{manifest.length}</span></button>
            <div className="inside-note"><TerminalSquare size={21}/><strong>This is the real repository.</strong><p>Source previews mirror the latest build-time code. Live CI runs the actual pytest suite.</p><a href={githubUrl+"/actions"} target="_blank" rel="noreferrer">View GitHub Actions <ExternalLink size={13}/></a></div>
          </div>
          <div className="inside-main">
            {detailSection==="tests"?<>
              <div className="inside-title"><div><small>AUTOMATED QA COVERAGE</small><h3>30 executed test cases</h3><p>26 test functions; parametrized boundaries expand into 30 pytest cases.</p></div><Tag kind="mint">5 categories</Tag></div>
              <div className="filter-row"><div className="search-box"><Search size={16}/><input aria-label="Search tests" placeholder="Search assertions, cases, risks…" value={testQuery} onChange={e=>setTestQuery(e.target.value)}/></div><div className="category-select"><SlidersHorizontal size={15}/><select aria-label="Filter test group" value={testFilter} onChange={e=>setTestFilter(e.target.value)}><option>All</option>{(Object.keys(groupCounts) as TestGroup[]).map(g=><option key={g} value={g}>{g} ({groupCounts[g]})</option>)}</select></div></div>
              <div className="test-browser">
                <div className="test-list">{visibleTests.length===0?<p className="empty-filter">No tests match your search.</p>:visibleTests.map(t=><button key={t.id} className={"test-list-item "+(selectedTest===t.id?"selected":"")} onClick={()=>setSelectedTest(t.id)}><span className={"test-dot "+t.group.toLowerCase()}/><span><small>{t.group} · {t.skill}</small><strong>{t.functionName.replaceAll("_"," ").replace(/^test /,"")}</strong><em>{t.example}</em></span><ChevronRight size={15}/></button>)}</div>
                <div className="test-detail"><span className="input-caption">SELECTED TEST CASE</span><Tag kind="purple">{currentTest.group.toUpperCase()}</Tag><h4>{currentTest.functionName.replaceAll("_"," ")}</h4><div className="detail-question"><strong>Why does this test exist?</strong><p>{currentTest.why}</p></div><div className="detail-question"><strong>What should happen?</strong><p>{currentTest.expected}</p></div><div className="detail-question"><strong>Example input</strong><p>{currentTest.example}</p></div><div className="snippet-top"><span><Braces size={14}/> Actual test code</span><SourceLink path={currentTest.file}>GitHub</SourceLink></div><pre className="code-snippet">{testSource}</pre><div className="skill-footer"><Tag kind="neutral">QA technique: {currentTest.skill}</Tag></div></div>
              </div>
            </>:<>
              <div className="inside-title"><div><small>FILE-BY-FILE TOUR</small><h3>Explore the source</h3><p>Every module, test, fixture and document—not an imitation.</p></div><Tag kind="blue">BUILD SNAPSHOT</Tag></div>
              <div className="filter-row"><div className="search-box"><Search size={16}/><input aria-label="Search repository files" placeholder="Search files and folders…" value={fileQuery} onChange={e=>setFileQuery(e.target.value)}/></div></div>
              <div className="test-browser file-browser"><div className="test-list file-list">{visibleFiles.map(path=><button className={"file-list-item "+(selectedFile===path?"selected":"")} key={path} onClick={()=>setSelectedFile(path)}>{path.endsWith(".json")?<FileJson size={14}/>:<FileCode2 size={14}/>}<span>{path}</span><ChevronRight size={13}/></button>)}</div><div className="test-detail"><span className="input-caption">SOURCE PREVIEW</span><h4 className="file-title">{selectedFile}</h4><p className="file-explainer">{selectedFile.startsWith("tests/")?"Automated test coverage and assertions.":selectedFile.startsWith("test_data/")?"Deterministic test fixtures used to prove pass and fail behavior.":selectedFile.startsWith("gameguard/")?"GameGuard QA engine implementation.":selectedFile.startsWith("game/")?"Minimal RPG domain and persistence model.":"Project setup, documentation or workflow configuration."}</p><div className="snippet-top"><span>REPOSITORY SOURCE</span><SourceLink path={selectedFile}>Open on GitHub</SourceLink></div><pre className="code-snippet full-source">{sourceText||"Select a file to inspect it."}</pre></div></div>
            </>}
          </div>
        </div>
      </section>

      <section className="closing-section outer">
        <div className="closing-ornament"><ShieldCheck size={37}/></div><span className="eyebrow">THE TAKEAWAY</span><h2>Good QA doesn't just find bugs.<br/><span>It protects the player's experience.</span></h2><p>GameGuard is a self-directed Game QA engineering project: a minimal simulated RPG, real Python quality checks, transparent limitations, and an automated release pipeline.</p>
        <div className="closing-actions"><a className="button primary large" href={githubUrl} target="_blank" rel="noreferrer"><Github size={18}/> Explore the full project <ArrowRight size={17}/></a><button className="button ghost large" onClick={()=>tour(0)}><Play size={16}/> Replay guided tour</button></div>
      </section>
    </main>
    <footer className="site-footer outer"><div className="brand"><span className="brand-icon"><ShieldCheck size={19}/></span><span>GAMEGUARD <span className="brand-muted">QA LAB</span></span></div><span>Built to demonstrate risk-based Game QA Engineering. Demo data only.</span><a href={githubUrl} target="_blank" rel="noreferrer">GitHub <ExternalLink size={13}/></a></footer>
  </div>;
}
