import {type Assessment,type Evidence,type Quote,instruments} from './model';
export function confidence(a:Assessment){const v=[a.reliability,a.corroboration,a.quality,a.precision];return v.some(x=>x===null)?null:Math.round(v.reduce<number>((s,x,i)=>s+x!*[.3,.3,.25,.15][i],0));}
export function risk(a:Assessment){const c=confidence(a);return [a.severity,a.plausibility,a.business,a.velocity,c].some(x=>x===null)?null:Math.round(a.severity!*.25+a.plausibility!*.2+a.business!*.25+a.velocity!*.15+c!*.15);}
export function tier(n:number|null){return n===null?'Incomplete':n<=20?'Advisory':n<=40?'Watch':n<=60?'Warning':n<=80?'Severe':'Critical'}
export function confidenceBand(n:number|null){return n===null?'Incomplete':n>=85?'Very High':n>=70?'High':n>=50?'Medium':'Low'}
export function clueGate(evidence:Evidence[],situationId:string,geography:string,asOf=new Date().toISOString()){
 const end=Date.parse(asOf),start=end-48*3600000;
 const eligible=evidence.filter(e=>e.situationId===situationId&&e.verified&&!e.synthetic&&e.stance==='Supports'&&e.domain!=='Social'&&Date.parse(e.observedAt)>=start&&Date.parse(e.observedAt)<=end&&Date.parse(e.publishedAt)<=end&&Date.parse(e.receivedAt)<=end&&(e.geography===geography||(e.domain==='Financial markets'&&e.geography==='Global'&&e.exposureApproved&&e.exposureReason.trim().length>0)));
 // Maximum bipartite matching prevents both reused lineage and reused domain counting.
 const matched=new Map<string,Evidence>();
 function match(domain:string,seen:Set<string>):boolean{for(const e of eligible.filter(x=>x.domain===domain)){if(seen.has(e.lineage.toLowerCase().trim()))continue;const key=e.lineage.toLowerCase().trim();seen.add(key);const previous=matched.get(key);if(!previous||match(previous.domain,seen)){matched.set(key,e);return true;}}return false;}
 for(const domain of new Set(eligible.map(e=>e.domain)))match(domain,new Set());
 const clues=[...matched.values()];return {passed:clues.length>=3,count:clues.length,clues,windowStart:new Date(start).toISOString(),asOf};
}
export function percent(value:number,base:number|null){return base===null||base<=0||value<=0?null:(value/base-1)*100}
export function quoteState(q:Quote,now=Date.now()){
 if(q.synthetic)return 'Synthetic';if(q.origin==='import')return 'Imported snapshot';
 if(q.contract&&q.expiry&&q.expiry<new Date(now).toISOString().slice(0,10))return 'Expired contract';
 if(q.contract&&q.rollOn&&q.rollOn<=new Date(now).toISOString().slice(0,10))return 'Roll due';
 if(q.kind==='Reference')return q.nextExpectedAt&&Date.parse(q.nextExpectedAt)<now?'Overdue':'Reference rate';
 if(q.session==='Closed')return 'Market closed';
 if(now-Date.parse(q.observedAt)>Math.max(180000,q.delayMinutes*60000+120000))return 'Stale';
 return q.kind==='Delayed'||q.delayMinutes>0?'Delayed':'Live';
}
export function movement(q:Quote){const i=instruments.find(x=>x.id===q.instrumentId)!;const contractOk=!i.family.includes('futures')||(!!q.contract&&q.contract===q.comparisonContract);return {one:contractOk?percent(q.value,q.previous):null,five:contractOk?percent(q.value,q.fiveSessions):null,hour:contractOk?percent(q.value,q.hourAgo):null,contractOk};}
export function marketCondition(q:Quote,now=Date.now()){
 const state=quoteState(q,now),i=instruments.find(x=>x.id===q.instrumentId)!;const m=movement(q);
 if(!['Live','Delayed'].includes(state)||q.synthetic||q.session!=='Open'||!m.contractOk||q.value<=0)return {eligible:false,hit:false,clear:false,direction:0};
 const change=(n:number|null)=>n===null?null:i.direction==='up'?n:Math.abs(n);
 const one=change(m.one),five=change(m.five);const hit=(one!==null&&one>=i.threshold)||(i.five!==null&&five!==null&&five>=i.five);
 return {eligible:one!==null,hit,clear:one!==null&&one<i.threshold*.8&&(i.five===null||five!==null&&five<i.five*.8),direction:Math.sign((one!==null&&one>=i.threshold?m.one:m.five)??0)};
}
export function anomaly(values:{value:number;observedAt:string;receivedAt:string}[],current:{value:number;observedAt:string},asOf:string,direction:'up'|'down'|'both'='both'){
 const t=Date.parse(current.observedAt),available=Date.parse(asOf);const rows=values.filter(v=>Date.parse(v.observedAt)<t&&Date.parse(v.observedAt)>=t-90*86400000&&Date.parse(v.receivedAt)<=available);const days=new Map(rows.map(v=>[v.observedAt.slice(0,10),v.value]));const xs=[...days.values()];if(xs.length<60)return {status:'Insufficient history',n:xs.length,z:null};const mean=xs.reduce((s,v)=>s+v,0)/xs.length;const sd=Math.sqrt(xs.reduce((s,v)=>s+(v-mean)**2,0)/(xs.length-1));if(!sd)return {status:'Zero variance',n:xs.length,z:null};const z=(current.value-mean)/sd;return {status:(direction==='up'?z>=2.5:direction==='down'?z<=-2.5:Math.abs(z)>=2.5)?'Anomaly':'Within baseline',n:xs.length,z};
}
export function localDay(iso:string,timezone:string){return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));}
