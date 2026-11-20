"use strict";
(async () => {
  const get=id=>document.getElementById(id), body=document.querySelector("tbody"), head=document.querySelector("thead");
  const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!=null)node.textContent=text;if(cls)node.className=cls;return node;};
  const cell=(r,v,cls)=>{const t=r.insertCell();if(cls)t.className=cls;if(v instanceof Node)t.append(v);else t.textContent=v;return t;};
  const details=label=>{const d=el("details");d.append(el("summary",label));return d;};
  const num=new Intl.NumberFormat("en-HK",{minimumFractionDigits:2,maximumFractionDigits:2});
  const f=n=>num.format(n), pct=n=>n==null?"未披露":f(n)+"%", mm=n=>n==null?"未披露":f(n/1e6);
  const fold=s=>String(s??"").normalize("NFKD").toLowerCase().replace(/[^\p{Letter}\p{Number}]/gu,"");
  const quarter=d=>d.date.slice(0,4)+" Q"+Math.ceil(Number(d.date.slice(5,7))/3);
  const sum=a=>a.reduce((s,n)=>s+n,0);
  const groupNames=["保荐人","OC · 整体协调人","JGC · 全球协调人","JBR · 账簿管理人","JLM · 牵头经办人"];
  try {
    const snap=get("fees-snapshot");
    const dataset=snap?JSON.parse(snap.textContent):await (async()=>{const r=await fetch("fees.json");if(!r.ok)throw Error("fees");return r.json();})();
    const {deals,aliases}=dataset;
    const rateStart=10,pools=["保荐人","保荐人及OC","具名承销团"];
    const names=dataset.ranks.map(x=>x.name).concat(pools.map(x=>"发行规模·"+x),pools.map(x=>"理论平均承销费率·"+x));
    names[4]="保荐人总金额";
    const bankKeys=Object.fromEntries(Object.entries(aliases).map(([k,v])=>[k,v.map(fold)]));
    const searchKeys=new Map(deals.map(d=>[d,[d.code,d.en,...d.names].map(fold).concat(
      [...new Set([...d.roles.flat(),...d.c.flat()])].flatMap(b=>bankKeys[b]||[fold(b)]))]));
    const metric=get("metric"), q=get("quarter"), size=get("size"), search=get("search");
    for(const i of [4,10,0,1,2,3,5,6,7,8,9,11,12]) metric.add(new Option(names[i],i));
    metric.value="4";
    for(const key of [...new Set(deals.map(quarter))].sort().reverse())q.add(new Option(key,key));
    get("date").textContent="资料截至 "+dataset.asof;
    const rowKeys=new WeakMap(),collator=new Intl.Collator("zh-HK",{numeric:true});
    let sorting=null,currentScope="",columns=[],baseline=null,rankColumn=2;
    function tableHead(labels){columns=labels;}
    function orderTable(frag){
      const rows=Array.from(frag.children),first=rows[0],active=sorting||baseline,tr=el("tr");
      columns.forEach((label,i)=>{
        const th=el("th"),button=el("button",label),numeric=currentScope==="deal"?i>0&&i<7:currentScope==="market"?i>0:i!==1;
        const unit=label.match(/^(.+)(（[^（）]+）)$/);
        if(unit){const heading=el("span",null,"heading");heading.append(el("span",unit[1]),el("span",unit[2]));button.replaceChildren(heading);}
        th.scope="col";th.className=numeric?"rate":"";button.type="button";button.setAttribute("aria-label",label);
        if(active.col===i)th.setAttribute("aria-sort",active.dir===1?"ascending":"descending");
        button.title=(currentScope==="deal"&&i===0?"按上市日":currentScope==="deal"&&i===3?"按折合港元的保荐费":currentScope==="deal"&&i===8?"按具名机构家数":label)+"排序";
        button.onclick=()=>{
          const dir=active.col===i?-active.dir:(i===0&&currentScope.startsWith("bank")?1:(numeric||currentScope==="deal"&&i===8?-1:1));
          if(currentScope.startsWith("bank")&&i>=2)rankColumn=i;
          sorting={col:i,dir};render();head.rows[0].cells[i].firstChild.focus({preventScroll:true});
        };th.append(button);tr.append(th);
      });head.replaceChildren(tr);
      if(!first||!sorting)return;
      const {col,dir}=sorting;
      rows.sort((a,b)=>{const x=rowKeys.get(a)[col],y=rowKeys.get(b)[col];
        if(x==null||y==null)return (x==null)-(y==null);
        return dir*(typeof x==="number"?x-y:collator.compare(x,y));});
      frag.append(...rows);
    }
    function summary(items){const target=get("summary");target.replaceChildren();for(const [label,value] of items){const box=el("div");box.append(el("dt",label),el("dd",value));target.append(box);}}
    function dealRow(d){
      const r=el("tr"),na=d.route==="发售"?null:"不适用";
      const name=cell(r,d.zh,"name");name.append(el("small",d.code+" · "+d.date));
      const doc=details(na?"上市资料":"发行资料");doc.append(el("p",d.en));
      if(na&&d.fee!=null)doc.append(el("p","保荐费："+d.ccy+" "+f(d.fee)+(d.s.length?" · "+d.s.join("、"):"")));
      if(!na){doc.append(el("p","鞋前发行规模：HKD "+f(d.baseGross)));
        if(d.finalGross!=null)doc.append(el("p","最终发行规模：HKD "+f(d.finalGross)));
        if(d.expiry&&d.shoeStatus==="open")doc.append(el("p",(d.expiryEstimated?"超额配股权预计截止日：":"超额配股权合约截止日：")+d.expiry));
        if(d.shoeStatus==="unverified")doc.append(el("p","列示配发结果确认的发行额；未取得单独的鞋后总额凭据。"));
        else if(d.shoe)doc.append(el("p",d.shoe));
        if(d.fixedAmount!=null)doc.append(el("p","固定承销佣金：HKD "+f(d.fixedAmount)));
        if(d.incentiveAmount!=null)doc.append(el("p","激励佣金情景：HKD "+f(d.incentiveAmount)));
        if(d.incentive)doc.append(el("p",d.incentive));}
      if(d.offset)doc.append(el("p","全单理论佣金为抵扣前金额；机构分摊扣除可抵扣的保荐费。"));
      [...new Set([...d.sources,...(d.shoeSources||[])])].forEach((s,i)=>{const a=el("a","披露文件 "+(i+1));a.href=s;a.target="_blank";a.rel="noopener noreferrer";doc.append(a);});name.append(doc);
      const gross=cell(r,na?d.route+" · 无发售":mm(d.gross),"rate");if(!na)gross.append(el("small",d.finalGross!=null?"最终发售额":d.shoeStatus==="open"?"已确认 · 绿鞋期内":"配发结果确认"));
      const commission=cell(r,na?"无发售佣金":mm(d.theoretical),"rate");
      if(d.cond&&d.t!=null)commission.append(el("small","按 "+Number(d.t.toFixed(2))+"% 测算"));
      cell(r,d.fee!=null?d.ccy+" "+f(d.fee):na??"未披露","rate");
      cell(r,na??pct(d.fixed??d.cf),"rate");
      cell(r,na??pct(d.i),"rate");cell(r,na??pct(d.t),"rate");
      cell(r,d.s.join("、")||(na?"不适用":"未列名"),"firms");
      const known=d.knownCMI;
      const named=new Set([...d.roles.flat(),...known]);
      const list=details(na?"不涉及发售":"查看分工");for(const [i,bs] of d.roles.entries()){
        const p=el("p");p.append(el("b",groupNames[i]+"："),document.createTextNode(bs.join("、")||"未列名"));list.append(p);}
      for(const [label,bs] of [["银团 CMI",known],["香港包销项下列名",d.c[1]],["非银团 CMI",d.c[2]]])if(bs.length)list.append(el("p",label+"："+bs.join("、")));
      cell(r,list,"cmi");
      const sponsorFees=d.contributions.map(c=>c[1]).filter(v=>v!=null);
      rowKeys.set(r,[d.date,d.gross,d.theoretical,sponsorFees.length?sum(sponsorFees):null,d.fixed??d.cf,d.i,
        d.t,d.s.join("、")||null,na?null:named.size]);return r;
    }
    function periodStats(ds){
      const offers=ds.filter(d=>d.route==="发售"&&d.gross>0);
      const fees=offers.filter(d=>d.theoretical!=null),gross=sum(offers.map(d=>d.gross)),base=sum(fees.map(d=>d.gross)),amt=sum(fees.map(d=>d.theoretical));
      return {offers,gross,amt,applicable:fees.length,weighted:base?100*amt/base:null};
    }
    function participation(ds){
      const byBank=new Map();
      for(const d of ds)for(const b of new Set([...d.roles.flat(),...d.c.flat()])){
        if(!byBank.has(b))byBank.set(b,[]);byBank.get(b).push(d);
      }return byBank;
    }
    function poolNames(d,pool){return new Set(pool===0?d.s:pool===1?[...d.s,...d.roles[1]]:d.syndicate);}
    function exclusion(d,bank,key){
      if(d.route!=="发售"&&key!==0)return "不涉及发售";
      const pool=key>=rateStart?key-rateStart:key>=7?key-7:key>=4?key-4:Math.max(0,key-1);
      if(!poolNames(d,pool).has(bank)){
        if(pool<2)return pool===0?"非本宗保荐人":"非本宗保荐人或 OC";
        return d.c[1].includes(bank)?"仅香港包销":d.c[2].includes(bank)?"非银团 CMI":
          "未列入具名承销团";
      }
      return "本口径未披露可计金额";
    }
    function rankedBy(rows,score){
      rows.sort((a,b)=>{const x=score(a),y=score(b);
        return (x==null)-(y==null)||(y??0)-(x??0)||collator.compare(a.b,b.b);});
      let last,place;rows.forEach((x,i)=>{const n=score(x);if(n!==last)place=i+1;x.place=n==null?null:place;last=n;});
      return rows;
    }
    function rank(ds,k){
      const map=new Map(), sizeKey=[7,7,8,9,7,8,9,7,8,9][k];
      for(const d of ds)for(const [b,...v] of d.contributions){
        if(v[k]==null)continue;
        if(!map.has(b))map.set(b,{b,sum:0,count:0,size:0,sizeCount:0,matched:0,list:[]});
        const x=map.get(b);x.sum+=v[k];x.count++;x.list.push([d,v[k]]);
        if(v[sizeKey]>0){x.size+=v[sizeKey];x.sizeCount++;x.matched+=v[k];}}
      const result=[...map.values()];for(const x of result)x.avg=x.sum/x.count;
      return rankedBy(result,x=>rankColumn===3?x.count:rankColumn===4?x.avg:rankColumn===6?(x.sizeCount?x.size:null):
        rankColumn===7?(x.size?x.matched/x.size:null):x.sum);
    }
    function rateRank(ds,pool){
      const groups=new Map(),sample=[];
      for(const d of ds){
        if(d.route!=="发售"||d.theoretical==null||!(d.gross>0))continue;
        const banks=poolNames(d,pool);
        if(!banks.size)continue;sample.push(d);
        for(const b of banks){if(!groups.has(b))groups.set(b,[]);groups.get(b).push(d);}
      }
      const rows=[...groups].map(([b,list])=>{
        const count=list.length,gross=sum(list.map(d=>d.gross)),avg=sum(list.map(d=>100*d.theoretical/d.gross))/count;
        return {b,list,count,gross,avg,weighted:100*sum(list.map(d=>d.theoretical))/gross};
      });
      // Rank equal displayed rates together; preserve raw precision for aggregation.
      const by=({3:"weighted",4:"count",5:"gross"})[rankColumn]||"avg";
      const points=x=>by==="avg"||by==="weighted"?Number(x[by].toFixed(2)):x[by];
      return {rows:rankedBy(rows,points),sample};
    }
    function render(){
      const mode=location.hash==="#banks"?"bank":location.hash==="#market"?"market":"deal";
      head.closest("table").dataset.view=mode;
      const bank=mode==="bank",market=mode==="market",key=Number(metric.value), term=fold(search.value);
      const rates=bank&&key>=rateStart,scope=bank?"bank:"+key:mode;
      if(currentScope!==scope){sorting=null;rankColumn=2;currentScope=scope;}
      baseline={col:bank?2:0,dir:-1};
      for(const v of ["deal","bank","market"])get("by-"+v).setAttribute("aria-pressed",String(v===mode));
      get("metric-label").hidden=!bank;get("search-label").hidden=market;
      search.placeholder=bank?"投行中文名、英文名或简称":"发行人、代码或投行 · 中 / EN";
      const ds=deals.filter(d=>(!q.value||quarter(d)===q.value)&&(!size.value||(d.gross>0&&
        (size.value==="small"?d.gross<5e8:size.value==="mid"?d.gross>=5e8&&d.gross<2e9:d.gross>=2e9))));
      const visible=bank||market||!term?ds:ds.filter(d=>searchKeys.get(d).some(s=>s.includes(term)));
      const st=periodStats(visible);let count=0;const frag=document.createDocumentFragment();
      if(rates){
        const {rows,sample}=rateRank(ds,key-rateStart),overall=periodStats(sample);
        tableHead(["排名","投行集团","项目等权平均费率","发行规模加权平均费率","计入项目","项目发行规模（百万港元）"]);
        summary([["参与机构",rows.length+" 家"],["去重发售项目",sample.length+" 宗"],["样本整体加权费率",overall.weighted==null?"—":pct(overall.weighted)]]);
        for(const x of rows){if(term&&!(bankKeys[x.b]||[fold(x.b)]).some(s=>s.includes(term)))continue;
          const r=el("tr"),dd=details(x.b);cell(r,x.place,"rate");
          for(const d of x.list)dd.append(el("p",d.code+" · "+d.zh+" · "+pct(100*d.theoretical/d.gross)));
          cell(r,dd,"bankname");cell(r,pct(x.avg),"rate");cell(r,pct(x.weighted),"rate");
          cell(r,x.count,"rate");cell(r,mm(x.gross),"rate");
          rowKeys.set(r,[x.place,x.b,Number(x.avg.toFixed(2)),Number(x.weighted.toFixed(2)),x.count,x.gross]);frag.append(r);count++;}
        get("view-note").textContent="每家机构每宗计一次全单费率。项目等权取算术平均；规模加权用全单理论佣金合计除以对应发行规模。";
      }else if(bank){
        const commissionRank=key>=1&&key<=3;
        tableHead(["排名","投行集团",key>=7?"分摊发行规模（百万港元）":"合计（百万港元）","计入项目","单宗平均（百万港元）","占比",
          ...(key<7?["对应分摊发行规模（百万港元）"]:[]),...(commissionRank?["组合加权佣金率"]:[])]);
        const ranked=rank(ds,key),total=sum(ranked.map(x=>x.sum)),top=sum(ranked.map(x=>x.sum).sort((a,b)=>b-a).slice(0,5));
        summary([["参与机构",ranked.length+" 家"],[names[key]+"（百万港元）",ranked.length?mm(total/100):"—"],["前五家金额占比",total?pct(100*top/total):"—"]]);
        for(const x of ranked){if(term&&!(bankKeys[x.b]||[fold(x.b)]).some(s=>s.includes(term)))continue;
          const r=el("tr");cell(r,x.place??"—","rate");const drill=details(x.b);
          for(const [d,value] of x.list){drill.append(el("p",d.code+" · "+d.zh+" · HKD "+f(value/100)));}
          cell(r,drill,"bankname");cell(r,mm(x.sum/100),"rate");
          cell(r,x.count,"rate");
          cell(r,mm(x.avg/100),"rate");cell(r,total?pct(100*x.sum/total):"—","rate");
          if(key<7)cell(r,x.sizeCount?mm(x.size/100):"—","rate");if(commissionRank)cell(r,x.size?pct(100*x.matched/x.size):"—","rate");
          rowKeys.set(r,[x.place,x.b,x.sum,x.count,x.avg,total?x.sum/total:null,x.sizeCount?x.size:null,x.size?x.matched/x.size:null]);frag.append(r);count++;}
        get("view-note").textContent=(key===4?"保荐人总金额＝保荐费＋仅保荐人均分的承销佣金（按适用抵扣条款处理）。":"")+"同一集团每宗只计一份。单宗平均和对应规模只看本口径有金额的项目；发行规模按集团均分，不是佣金收入。组合加权佣金率＝同批项目分摊佣金 ÷ 分摊规模。占比按当前筛选范围计算；搜索不改变名次。";
      }else{
        summary([["发售项目",st.offers.length+" 宗"],["发行规模（百万港元）",st.offers.length?mm(st.gross):"—"],["全单理论佣金（百万港元）",st.applicable?mm(st.amt):"—"],["加权理论佣金率",st.weighted==null?"—":pct(st.weighted)]]);
        if(market){
          tableHead(["上市季度","发售项目","发行规模（百万港元）","理论佣金（百万港元）","佣金样本","加权理论费率"]);
          for(const key of [...new Set(ds.map(quarter))].sort().reverse()){
            const x=periodStats(ds.filter(d=>quarter(d)===key)),r=el("tr");cell(r,key);for(const v of [x.offers.length,x.offers.length?mm(x.gross):"—",x.applicable?mm(x.amt):"—",x.applicable,x.weighted==null?"—":pct(x.weighted)])cell(r,v,"rate");
            rowKeys.set(r,[key,x.offers.length,x.offers.length?x.gross:null,x.applicable?x.amt:null,x.applicable,x.weighted]);frag.append(r);count++;}
        }else{
          tableHead(["发行人 / 上市日","发行规模（百万港元）","理论承销佣金（百万港元）","保荐费（原币）","固定费率","激励费率","理论综合费率","保荐人","CMI 分工"]);
          for(const d of visible){frag.append(dealRow(d));count++;}
        }
        get("view-note").textContent="理论佣金＝固定佣金＋激励佣金。费率按全单列示，不按保荐人数平分。";
      }
      const extra=get("unranked");extra.replaceChildren();extra.hidden=true;
      if(bank&&term){
        const shown=new Set(Array.from(frag.children,r=>rowKeys.get(r)[1]));
        for(const [b,all] of participation(ds)){
          if(shown.has(b)||!(bankKeys[b]||[fold(b)]).some(n=>n.includes(term)))continue;
          const drill=details(b+" · 本口径无计入项目");
          for(const d of all)drill.append(el("p",d.code+" · "+d.zh+" · "+exclusion(d,b,key)));
          extra.append(drill);extra.hidden=false;
        }
      }
      orderTable(frag);
      if(!count){const r=el("tr");cell(r,extra.hidden?"没有匹配结果":"没有符合本排名口径的项目，列名参与记录见下。").colSpan=head.rows[0].cells.length;frag.append(r);}
      body.replaceChildren(frag);get("count").textContent=bank?names[key]+" · "+count+" 家":market?count+" 个季度":count+" 宗上市";
    }
    for(const [id,hash] of [["deal","deals"],["bank","banks"],["market","market"]]) get("by-"+id).onclick=()=>{search.value="";history.replaceState(null,"","#"+hash);render();};
    for(const control of [metric,q,size]) control.onchange=render;
    window.addEventListener("hashchange",render);search.oninput=render;render();
  }catch(e){console.error("Fee data unavailable",e);get("count").textContent="数据未能载入，请刷新或下载 Excel。";}
})();
