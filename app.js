"use strict";
(async () => {
  const get=id=>document.getElementById(id), body=document.querySelector("tbody"), head=document.querySelector("thead");
  const el=(tag,value,cls)=>{const node=document.createElement(tag);if(value!=null)node.textContent=value;if(cls)node.className=cls;return node;};
  const pct=v=>v==null?"未披露":v.toLocaleString("zh-HK",{maximumFractionDigits:4})+"%";
  const money=v=>v.toLocaleString("en-HK",{maximumFractionDigits:2});
  const details=(label)=>{const d=el("details");d.append(el("summary",label));return d;};
  const cell=(r,content,cls)=>{const td=r.insertCell();if(cls)td.className=cls;if(content instanceof Node)td.append(content);else td.textContent=content;return td;};
  try {
    const response=await fetch("fees.json");if(!response.ok)throw Error("data");
    const dataset=await response.json();let mode=location.hash==="#banks"?"bank":"deal";
    const pick=get("metric"),search=get("search");
    dataset.ranks.forEach((f,i)=>pick.add(new Option(f.name,String(i))));
    get("date").textContent="资料截至 "+dataset.asof;
    function dealRow(frag,d) {
      const row=el("tr");
      const name=cell(row,d.zh,"name");name.append(el("small",d.code+" · "+d.date));
      const doc=details("发行资料");doc.append(el("p",d.en));
      doc.append(el("p","保荐费合计："+(d.fee==null?"未披露":d.ccy+" "+money(d.fee))));
      doc.append(el("p","全单固定佣金率："+(d.route!=="发售"?"不适用":d.cond?"有条件，见招股书":pct(d.fixed))));
      if(d.gross)doc.append(el("p",d.basis+"：HKD "+money(d.gross)));
      if(d.offset)doc.append(el("p","合计扣除可抵扣的保荐费；拆分项为扣除前口径。"));
      d.sources.forEach((s,i)=>{const a=el("a","披露文件 "+(i+1));a.href=s;a.target="_blank";a.rel="noopener noreferrer";doc.append(a);});name.append(doc);
      cell(row,d.s.join("、")||"未列名","firms");
      const [global,local,other]=d.c;const cmi=cell(row,"","cmi");
      if(global.length){const list=details(global.length+" 家 · "+global.slice(0,2).join("、")+(global.length>2?"等":""));list.append(el("p",global.join("、")));cmi.append(list);}
      else cmi.append(el("span","未披露完整名册"));
      if(global.length&&!d.complete)cmi.append(el("small","名册不完整"));
      for(const [label,names] of [["仅香港包销",local],["非银团 CMI",other]])if(names.length){const l=details(label+" · "+names.length+" 家");l.append(el("p",names.join("、")));cmi.append(l);}
      const na=d.route!=="发售"?"不适用":null;
      cell(row,na??(d.cond?pct(d.cf)+"（有条件）":pct(d.f)),"rate");
      cell(row,na??pct(d.i),"rate");
      cell(row,na??(d.cond?"条件未确认":pct(d.t)+(d.offset?"（净）":"")),"rate");
      frag.append(row);
    }
    function render(){
      const bank=mode==="bank"; get("by-bank").setAttribute("aria-pressed",String(bank));get("by-deal").setAttribute("aria-pressed",String(!bank));
      get("metric-label").hidden=!bank;search.placeholder=bank?"投行集团":"发行人、代码或投行";
      const term=search.value.trim().toLowerCase(),matches=s=>s.toLowerCase().includes(term);
      const cols=bank?["名次","投行集团","金额（港元）"]:["发行人 / 上市日","保荐人","具名 CMI","每家平均固定费率","每家平均激励费率¹","每家平均合计费率"];
      head.replaceChildren();const tr=head.insertRow();cols.forEach((s,i)=>{const th=el("th",s,i>=(bank?2:3)?"rate":"");th.scope="col";tr.append(th);});
      const frag=document.createDocumentFragment();let count=0;
      if(bank){const list=dataset.ranks[Number(pick.value)].rows;
        for(const [n,b,a] of list){if(!matches(b))continue;count++;const r=el("tr");cell(r,n);cell(r,b,"bankname");
          const td=cell(r,money(a),"rate");const bar=el("i",null,"bar");bar.style.width=(list[0][2]?100*a/list[0][2]:0)+"%";bar.style.marginLeft="auto";td.append(bar);frag.append(r);}
      }else{for(const d of dataset.deals){if(!matches([d.zh,d.en,d.code,...d.s,...d.c.flat()].join(" ")))continue;count++;dealRow(frag,d);}}
      if(!count){const row=el("tr");cell(row,"没有匹配结果").colSpan=cols.length;frag.append(row);}
      body.replaceChildren(frag);get("count").textContent=bank?dataset.ranks[Number(pick.value)].name+" · "+count+" 家":count+" 宗发行";
      get("rate-note").hidden=bank;
    }
    const switchMode=v=>{mode=v;search.value="";history.replaceState(null,"",v==="bank"?"#banks":"#deals");render();};
    get("by-deal").onclick=()=>switchMode("deal");get("by-bank").onclick=()=>switchMode("bank");
    search.oninput=render;pick.onchange=render;render();
  }catch(e){get("count").textContent="数据未能载入，请刷新或下载 Excel。";}
})();
