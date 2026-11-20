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
    const names=dataset.ranks.map(x=>x.name).concat(["发行规模·保荐人","发行规模·保荐人及OC","发行规模·列名CMI"]);
    const bankKeys=Object.fromEntries(Object.entries(aliases).map(([k,v])=>[k,v.map(fold)]));
    const searchKeys=new Map(deals.map(d=>[d,[d.code,d.en,...d.names].map(fold).concat(
      [...new Set([...d.roles.flat(),...d.c.flat()])].flatMap(b=>bankKeys[b]||[fold(b)]))]));
    const metric=get("metric"), q=get("quarter"), size=get("size"), order=get("order"), search=get("search");
    for(const [i,n] of names.entries()) metric.add(new Option(n,i));
    for(const key of [...new Set(deals.map(quarter))].sort().reverse())q.add(new Option(key,key));
    get("date").textContent="资料截至 "+dataset.asof;
    function tableHead(labels){const tr=el("tr");for(const [i,v] of labels.entries()){const th=el("th",v);th.scope="col";if(i>0)th.className="col";tr.append(th);}head.replaceChildren(tr);}
    function summary(items){const target=get("summary");target.replaceChildren();for(const [label,value] of items){const box=el("div");box.append(el("dt",label),el("dd",value));target.append(box);}}
    function dealRow(d){
      const r=el("tr"),na=d.route==="发售"?null:"不适用";
      const conditional=d.cond&&d.cf!=null&&d.gross>0&&d.incentiveAmount!=null?d.gross*d.cf/100+d.incentiveAmount:null;
      const title=d.zh.includes("未见已核实")?d.en:d.zh;
      const name=cell(r,title,"name");name.append(el("small",d.code+" · "+d.date));
      const doc=details("发行资料");doc.append(el("p",d.en));
      if(!na){doc.append(el("p","鞋前发行规模：HKD "+f(d.baseGross)));
        if(d.finalGross!=null)doc.append(el("p","最终发行规模：HKD "+f(d.finalGross)));
        if(d.expiry&&d.shoeStatus==="open")doc.append(el("p",(d.expiryEstimated?"超额配股权预计截止日：":"超额配股权合约截止日：")+d.expiry));
        if(d.shoeStatus==="unverified")doc.append(el("p","列示配发结果确认的发行额；未取得单独的鞋后总额凭据。"));
        else if(d.shoe)doc.append(el("p",d.shoe));
        if(d.fixedAmount!=null)doc.append(el("p","固定承销佣金：HKD "+f(d.fixedAmount)));
        if(d.incentiveAmount!=null)doc.append(el("p","激励佣金情景：HKD "+f(d.incentiveAmount)));
        if(conditional!=null)doc.append(el("p","仅在固定费率条件成就且按列示激励情景时，理论佣金为 HKD "+f(conditional)+"；不纳入佣金排名或市场汇总。"));
        if(d.incentive)doc.append(el("p",d.incentive));}
      if(d.offset)doc.append(el("p","全单理论佣金为抵扣前金额；机构分摊扣除可抵扣的保荐费。"));
      [...new Set([...d.sources,...(d.shoeSources||[])])].forEach((s,i)=>{const a=el("a","披露文件 "+(i+1));a.href=s;a.target="_blank";a.rel="noopener noreferrer";doc.append(a);});name.append(doc);
      const gross=cell(r,na??mm(d.gross),"rate");if(!na)gross.append(el("small",d.finalGross!=null?"最终发售额":d.shoeStatus==="open"?"已确认 · 绿鞋期内":"配发结果确认"));
      const commission=cell(r,na??mm(d.theoretical??conditional),"rate");
      if(conditional!=null)commission.append(el("small","条件情景"));
      cell(r,d.fee!=null?d.ccy+" "+f(d.fee):"未披露","rate");
      cell(r,na??(d.cond?pct(d.cf)+"（有条件）":pct(d.fixed)),"rate");
      cell(r,na??pct(d.i),"rate");cell(r,na??(conditional!=null?pct(100*conditional/d.gross)+"（有条件）":pct(d.t)),"rate");
      cell(r,d.s.join("、")||"未列名","firms");
      const list=details("查看分工 · "+d.c[0].length+" 家列名");for(const [i,bs] of d.roles.entries()){
        const p=el("p");p.append(el("b",groupNames[i]+"："),document.createTextNode(bs.join("、")||"未列名"));list.append(p);}
      for(const [label,bs] of [["全单具名 CMI",d.c[0]],["仅香港包销",d.c[1]],["非银团 CMI",d.c[2]]])if(bs.length)list.append(el("p",label+"："+bs.join("、")));
      if(!d.complete)list.append(el("small","未披露完整 CMI 名册"));cell(r,list,"cmi");return r;
    }
    function periodStats(ds){
      const offers=ds.filter(d=>d.route==="发售"&&d.gross>0);
      const fees=offers.filter(d=>d.theoretical!=null),gross=sum(offers.map(d=>d.gross)),base=sum(fees.map(d=>d.gross)),amt=sum(fees.map(d=>d.theoretical));
      return {offers,gross,amt,applicable:fees.length,weighted:base?100*amt/base:null};
    }
    function rank(ds,k){
      const map=new Map(), sizeKey=[7,7,8,9,7,8,9,7,8,9][k];
      for(const d of ds)for(const [b,...v] of d.contributions){
        if(v[k]==null)continue;
        if(!map.has(b))map.set(b,{b,sum:0,count:0,size:0,sizeCount:0,matched:0,list:[]});
        const x=map.get(b);x.sum+=v[k];x.count++;x.list.push([d,v[k]]);
        if(v[sizeKey]>0){x.size+=v[sizeKey];x.sizeCount++;x.matched+=v[k];}}
      const result=[...map.values()];for(const x of result)x.avg=x.sum/x.count;
      const by=order.value;
      result.sort((a,b)=>b[by]-a[by]||b.sum-a.sum||a.b.localeCompare(b.b,"zh-HK"));
      let last,place;result.forEach((x,i)=>{if(x[by]!==last)place=i+1;x.place=place;last=x[by];});
      return result;
    }
    function render(){
      const mode=location.hash==="#banks"?"bank":location.hash==="#market"?"market":"deal";
      const bank=mode==="bank",market=mode==="market",key=Number(metric.value), term=fold(search.value);
      for(const v of ["deal","bank","market"])get("by-"+v).setAttribute("aria-pressed",String(v===mode));
      get("metric-label").hidden=get("order-label").hidden=!bank;get("search-label").hidden=market;
      search.placeholder=bank?"投行中文名、英文名或简称":"发行人、代码或投行 · 中 / EN";
      const ds=deals.filter(d=>(!q.value||quarter(d)===q.value)&&(!size.value||(d.gross>0&&
        (size.value==="small"?d.gross<5e8:size.value==="mid"?d.gross>=5e8&&d.gross<2e9:d.gross>=2e9))));
      const visible=bank||market||!term?ds:ds.filter(d=>searchKeys.get(d).some(s=>s.includes(term)));
      const st=periodStats(visible);let count=0;const frag=document.createDocumentFragment();
      if(bank){
        const commissionRank=key>=1&&key<=3;
        tableHead(["排名","投行集团",key>=7?"分摊发行规模（百万港元）":"合计（百万港元）","计入项目","单宗平均（百万港元）","占比",
          ...(key<7?["对应分摊发行规模（百万港元）"]:[]),...(commissionRank?["组合加权佣金率"]:[])]);
        const ranked=rank(ds,key),total=sum(ranked.map(x=>x.sum)),top=sum(ranked.map(x=>x.sum).sort((a,b)=>b-a).slice(0,5));
        summary([["参与机构",ranked.length+" 家"],[names[key]+"（百万港元）",ranked.length?mm(total/100):"—"],["前五家金额占比",total?pct(100*top/total):"—"]]);
        for(const x of ranked){if(term&&!(bankKeys[x.b]||[fold(x.b)]).some(s=>s.includes(term)))continue;
          const r=el("tr");cell(r,x.place);const drill=details(x.b);
          for(const [d,value] of x.list){drill.append(el("p",d.code+" · "+d.zh+" · HKD "+f(value/100)));}
          cell(r,drill,"bankname");cell(r,mm(x.sum/100),"rate");cell(r,x.count,"rate");cell(r,mm(x.avg/100),"rate");cell(r,total?pct(100*x.sum/total):"—","rate");
          if(key<7)cell(r,x.sizeCount?mm(x.size/100):"—","rate");if(commissionRank)cell(r,x.size?pct(100*x.matched/x.size):"—","rate");frag.append(r);count++;}
        get("view-note").textContent="同一集团每宗只计一份。单宗平均和对应规模只看本口径有金额的项目；发行规模按集团均分，不是佣金收入。组合加权佣金率＝同批项目分摊佣金 ÷ 分摊规模。占比按当前筛选范围计算；搜索不改变名次。";
      }else{
        summary([["发售项目",st.offers.length+" 宗"],["发行规模（百万港元）",st.offers.length?mm(st.gross):"—"],["全单理论佣金（百万港元）",st.applicable?mm(st.amt):"—"],["加权理论佣金率",st.weighted==null?"—":pct(st.weighted)]]);
        if(market){
          tableHead(["上市季度","发售项目","发行规模（百万港元）","理论佣金（百万港元）","佣金样本","加权理论费率"]);
          for(const key of [...new Set(ds.map(quarter))].sort().reverse()){
            const x=periodStats(ds.filter(d=>quarter(d)===key)),r=el("tr");cell(r,key);for(const v of [x.offers.length,x.offers.length?mm(x.gross):"—",x.applicable?mm(x.amt):"—",x.applicable,x.weighted==null?"—":pct(x.weighted)])cell(r,v,"rate");frag.append(r);count++;}
        }else{
          tableHead(["发行人 / 上市日","发行规模¹","理论承销佣金¹","保荐费（原币）","固定费率","激励费率","理论综合费率","保荐人","CMI 分工"]);
          for(const d of visible){frag.append(dealRow(d));count++;}
        }
        get("view-note").textContent="¹ 发行规模与理论承销佣金以百万港元计。全单理论佣金＝固定佣金＋披露的激励情景，不代表实付。费率不按保荐人数平分。加权费率只用佣金和发行规模均已知的发售项目。";
      }
      if(!count){const r=el("tr");cell(r,"没有匹配结果").colSpan=head.rows[0].cells.length;frag.append(r);}
      body.replaceChildren(frag);get("count").textContent=bank?names[key]+" · "+count+" 家":market?count+" 个季度":count+" 宗发行";
    }
    for(const [id,hash] of [["deal","deals"],["bank","banks"],["market","market"]]) get("by-"+id).onclick=()=>{search.value="";history.replaceState(null,"","#"+hash);render();};
    for(const control of [metric,q,size,order]) control.onchange=render;
    window.addEventListener("hashchange",render);search.oninput=render;render();
  }catch(e){console.error("Fee data unavailable",e);get("count").textContent="数据未能载入，请刷新或下载 Excel。";}
})();
