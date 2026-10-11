// Deliberately tiny DOM adapter, not a browser/layout engine. Real browser QA is separate.
export function fixtureDocument() {
  const doc = {
    defaultView:{getComputedStyle:e=>({display:e.style.display || 'block',visibility:e.style.visibility || 'visible',opacity:e.style.opacity ?? '1'})},
    createElement(tag) {
      return {tagName:tag.toUpperCase(),ownerDocument:doc,nodeType:1,dataset:{},style:{},children:[],textContent:'',hidden:false,parentElement:null,
        get isConnected() { return this === doc.body || !!this.parentElement?.isConnected; },
        append(...nodes) { for (const node of nodes) { node.remove(); node.parentElement=this; this.children.push(node); } },
        remove() { if (this.parentElement) this.parentElement.children=this.parentElement.children.filter(n=>n!==this); this.parentElement=null; },
        setAttribute(key,value) { this[key]=value; },
        getClientRects() { return this.isConnected ? [{}] : []; },
        closest() { for (let e=this;e;e=e.parentElement) if(e.hidden || e['aria-hidden']==='true')return e; return null; },
        querySelector(selector) {
          const key=selector.slice(6,-1).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
          for (const child of this.children) { if (key in child.dataset)return child; const found=child.querySelector(selector); if(found)return found; }
          return null;
        },
      };
    },
  };
  doc.body=doc.createElement('body'); return doc;
}
export const sampleAward = ()=>({id:'award-fixture',creativeHash:'a'.repeat(64),priceBaseUnits:'25',expiresAt:Date.now()+60000,
  creative:{approvedText:'Exact fixture developer-tool copy.',destinationURL:'https://developer.example/'},financialMode:'synthetic'});
export function sampleReceipt(award) {
  return {status:'accepted',financialMode:'synthetic',receipt:{awardId:award.id,creativeHash:award.creativeHash,mode:'synthetic'},
    signature:'fixture-not-a-verified-signature',receiptHash:'b'.repeat(64),
    charge:{id:'fixture-charge',amountBaseUnits:award.priceBaseUnits,awardId:award.id,mode:'synthetic'},replayed:false};
}
