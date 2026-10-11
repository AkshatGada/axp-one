import {createSponsoredCard,inspectPlacement} from './sdk-browser.mjs';
const configuration=await fetch('/config').then(r=>r.json()),status=document.querySelector('#status'),grid=document.querySelector('#grid'),button=document.querySelector('#start');
let attempted=0,completed=0,accepted=0,noFill=0,errors=0,running=0,peak=0,stopped=false;
const update=()=>{status.textContent=JSON.stringify({runId:configuration.runId,attempted,completed,accepted,noFill,errors,running,peak,stopped},null,2);window.axpBenchmark={attempted,completed,accepted,noFill,errors,running,peak,stopped,done:!running&&stopped};};
async function post(path,body={}){const response=await fetch(path,{method:'POST',headers:{'content-type':'application/json','x-axp-operator':configuration.token},body:JSON.stringify(body)}),value=await response.json();if(!response.ok)throw Error(value.error);return value;}
async function one(){const next=await post('/next');if(next.done)return false;const task=next.turn;attempted++;running++;peak=Math.max(peak,running);update();
  const article=document.createElement('article'),prompt=document.createElement('p'),answer=document.createElement('p');article.dataset.turnId=task.id;prompt.textContent=task.question;answer.textContent='Waiting for independent answer and auction';article.append(prompt,answer);grid.append(article);
  try{const result=await post(`/turns/${task.id}/run`);if(!result.answer||result.answerError||result.opportunityError){answer.textContent=result.answer?.answer??result.answerError??'Turn failed';errors++;return true;}
    answer.textContent=result.answer.answer;const placement=result.opportunity;
    if(placement.status==='awarded'){const node=createSponsoredCard({document,award:placement.award});article.append(node);
      // Real connected, visible DOM and exact creative/disclosure are observed.
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const observation=inspectPlacement(node,placement.award);if(!observation.domInserted||!observation.sponsoredLabelPresent)throw Error('render_not_observed');
      const receipt=await post(`/turns/${task.id}/render`,observation);if(receipt.status!=='accepted')throw Error('receipt_not_accepted');accepted++;node.dataset.chargeId=receipt.chargeId;
    }else noFill++;completed++;return true;
  }catch(error){errors++;const failure=document.createElement('p');failure.textContent=`Error: ${error.message}`;article.append(failure);stopped=true;return false;}
  finally{running--;update();}
}
button.addEventListener('click',async()=>{button.disabled=true;update();
  try{for(const limit of configuration.concurrencySteps){if(stopped)break;const stageCount=Math.ceil(configuration.turns/configuration.concurrencySteps.length),stageStart=attempted;
    const lanes=Array.from({length:limit},async()=>{while(!stopped&&attempted-stageStart<stageCount&&attempted<configuration.turns){if(!await one())break;}});await Promise.all(lanes);}
  }catch(error){errors++;status.textContent=error.message;}
  stopped=true;update();window.dispatchEvent(new Event('axp-benchmark-completed'));
});
update();
