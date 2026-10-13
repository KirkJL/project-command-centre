"use strict";
(() => {
  const pretty = s => String(s || "").replaceAll("_", " ");
  function node(tag, text, className) {
    const e=document.createElement(tag); if(text!==undefined)e.textContent=text;
    if(className)e.className=className; return e;
  }
  function button(text, action) {
    const e=node("button",text);e.type="button";e.addEventListener("click",action);return e;
  }
  function date(value) {
    if(!value)return "No due date";
    return new Date(value.includes("T")?value:value.replace(" ","T")+"Z").toLocaleString();
  }
  window.renderWorkspace = async (page, projects, activeProjectId, initialTab="tasks") => {
    page.replaceChildren(document.getElementById("workspaceTemplate").content.cloneNode(true));
    const root=page.querySelector(".workbench");
    const results=root.querySelector("#workspaceResults"),notice=root.querySelector("#workspaceNotice");
    let tab=initialTab, generation=0;
    const api=(path,method="GET",body)=>API.request(path,{method,...(body===undefined?{}:{body})});
    const projectQuery=activeProjectId?`?projectId=${activeProjectId}`:"";
    function message(text,error=false){notice.textContent=text;notice.classList.toggle("error-message",error);}
    async function act(action) {try{await action();}catch(e){message(pretty(e.message),true);}}
    function card(title,detail){const e=node("article",undefined,"workspace-card");e.append(node("h3",title));if(detail)e.append(node("p",detail));results.append(e);return e;}
    function empty(){if(!results.childElementCount)card("Nothing here yet","Items will appear as you add them.");}
    function select(values,value){const e=document.createElement("select");for(const v of values){const o=node("option",pretty(v));o.value=v;e.append(o);}e.value=value;return e;}
    for(const e of root.querySelectorAll('select[name="projectId"],#contextProject')) {
      for(const p of projects.filter(p=>p.status!=="archived")){const o=node("option",p.name);o.value=p.id;e.append(o);}
      if(activeProjectId)e.value=String(activeProjectId);
    }
    function wireForm(id,path,transform=body=>body) {
      const form=root.querySelector(id);
      form.addEventListener("submit",event=>{
        event.preventDefault();const submit=form.querySelector('[type="submit"]');submit.disabled=true;
        act(async()=>{
          const data=transform(Object.fromEntries(new FormData(form)));
          await api(path,"POST",data);form.reset();message("Saved.");await load();
        }).finally(()=>{submit.disabled=false;});
      });
    }
    wireForm("#taskForm","/api/tasks",b=>({...b,dueAt:b.dueAt?new Date(b.dueAt).toISOString():null}));
    wireForm("#recurringForm","/api/recurring-tasks",b=>({...b,nextDueAt:new Date(b.nextDueAt).toISOString()}));
    wireForm("#brandForm","/api/brands");wireForm("#githubForm","/api/github/repos");
    wireForm("#passwordForm","/api/settings/password");
    const search=root.querySelector("#librarySearch");let searchTimer;
    search.addEventListener("input",()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>act(load),250);});
    root.querySelector("#contextProject").addEventListener("change",()=>act(load));
    for(const b of root.querySelectorAll("[data-tab]"))b.addEventListener("click",()=>{tab=b.dataset.tab;message("");act(load);});

    async function load() {
      const version=++generation;
      for(const b of root.querySelectorAll("[data-tab]"))b.setAttribute("aria-current",b.dataset.tab===tab?"page":"false");
      const panels={taskFormPanel:"tasks",libraryTools:"library",recurringFormPanel:"recurring",brandFormPanel:"brands",githubPanel:"github",contextPanel:"context",settingsPanel:"settings"};
      for(const [id,t] of Object.entries(panels))root.querySelector("#"+id).hidden=t!==tab;
      results.replaceChildren(node("p","Loading?"));
      const paths={tasks:"/api/tasks"+projectQuery,library:"/api/library"+`?q=${encodeURIComponent(search.value)}${activeProjectId?`&projectId=${activeProjectId}`:""}`,
        planner:"/api/planner",recurring:"/api/recurring-tasks",brands:"/api/brands",github:"/api/github/repos",analytics:"/api/analytics",
        notifications:"/api/notifications",integrations:"/api/integrations",settings:"/api/settings/audit",
        context:"/api/assistant/context?projectId="+root.querySelector("#contextProject").value};
      if(tab==="context"&&!projects.length){results.replaceChildren(node("p","Create a project first."));return;}
      let data;
      try{data=await api(paths[tab]);}catch(e){if(version===generation){results.replaceChildren();message(pretty(e.message),true);}return;}
      if(version!==generation||!root.isConnected)return;
      results.replaceChildren();
      if(tab==="tasks") {
        if(!projects.length)card("Create your first project","Open Projects and choose New project, then return here to add tasks.");
        for(const task of data.tasks) {
          const c=card(task.title,`${task.project_name} ? ${pretty(task.priority)} ? ${date(task.due_at)}`);
          const status=select(["backlog","todo","in_progress","done","cancelled"],task.status);
          status.setAttribute("aria-label",`Status for ${task.title}`);
          status.addEventListener("change",()=>act(async()=>{status.disabled=true;try{await api(`/api/tasks/${task.id}`,"PATCH",{status:status.value});message("Task updated.");await load();}finally{status.disabled=false;}}));
          c.append(status,button("Edit",()=>editTask(task,c)));
        }
      } else if(tab==="recurring") {
        for(const t of data.templates){const c=card(t.title,`${t.project_name} ? Every ${t.interval_days} days ? ${date(t.next_due_at)}`);
          c.append(button(t.is_active?"Pause":"Resume",()=>act(async()=>{await api(`/api/recurring-tasks/${t.id}`,"PATCH",{isActive:!t.is_active});await load();})));}
      } else if(tab==="planner") {
        for(const t of data.tasks.filter(t=>!activeProjectId||Number(t.project_id)===Number(activeProjectId)))card(t.title,`Task ? ${pretty(t.priority)} ? ${date(t.due_at)}`);
        for(const p of data.publications.filter(p=>!activeProjectId||Number(p.project_id)===Number(activeProjectId)))card(p.title,`${p.platform} ? ${date(p.scheduled_at)}`);
      } else if(tab==="library") {
        for(const item of data.items){const c=card(item.title,`${item.project_name} ? ${pretty(item.status)} ? ${item.publication_count} publications`);
          c.append(button("Details and tags",()=>act(()=>detail(item.id,c))));}
      } else if(tab==="brands") {
        for(const g of data.groups)card(g.name,g.project_name);
        for(const [type,items] of [["content",data.content],["accounts",data.accounts]])for(const item of items){
          const c=card(item.title||item.account_name,type);const s=document.createElement("select");s.setAttribute("aria-label","Brand for "+(item.title||item.account_name));
          const blank=node("option","No brand group");blank.value="";s.append(blank);
          for(const g of data.groups.filter(g=>g.project_id===item.project_id)){const o=node("option",g.name);o.value=g.id;s.append(o);}
          s.value=item.brand_group_id||"";s.addEventListener("change",()=>act(async()=>{await api(`/api/${type}/${item.id}/brand`,"PATCH",{groupId:s.value?Number(s.value):null});message("Brand updated.");}));c.append(s);
        }
      } else if(tab==="github") {
        for(const r of data.repositories){const c=card(`${r.owner}/${r.repo}`,r.project_name);c.append(button("Load issues",()=>act(async()=>{
          const data=await api(`/api/github/repos/${r.id}/issues`);let list=c.querySelector("ul");if(!list){list=node("ul");c.append(list);}list.replaceChildren();
          for(const i of data.issues){const li=node("li",`#${i.number} ${i.title}`);list.append(li);}if(!data.issues.length)list.append(node("li","No open issues."));
        })));}
      } else if(tab==="analytics") {
        card("Publishing performance",data.note);
        for(const [title,rows] of [["Publications",data.publicationStates],["Published by platform",data.publishedByPlatform],["Tasks",data.taskStates]]){
          const c=card(title);for(const r of rows)c.append(node("p",`${pretty(r.label)}: ${r.total}`));if(!rows.length)c.append(node("p","No data yet."));}
        for(const v of data.topVideos)card(v.title,`${v.views} views ? ${v.likes} likes ? ${v.comments} comments`);
      } else if(tab==="notifications") {for(const i of data.items)card(i.title,`${pretty(i.type)} ? ${i.detail}`);
      } else if(tab==="integrations") {for(const [name,i] of Object.entries(data.integrations))card(pretty(name),`${i.connected} connected ? ${i.configured?"Configured":"Not configured"}. ${i.note}`);
      } else if(tab==="settings") {for(const e of data.events)card(pretty(e.action),date(e.created_at));
      } else if(tab==="context") {card(data.project.name,data.note);for(const t of data.tasks)card(t.title,pretty(t.status));for(const c of data.content)card(c.title,c.description);}
      empty();
    }
    function editTask(task,card) {
      if(card.querySelector("form"))return;
      const form=node("form");const title=node("input");title.value=task.title;title.required=true;title.maxLength=200;title.setAttribute("aria-label","Task title");
      const priority=document.createElement("select");priority.setAttribute("aria-label","Task priority");
      for(const p of ["low","normal","high","critical"]){const o=node("option",p);o.value=p;priority.append(o);}priority.value=task.priority;
      const due=node("input");due.type="datetime-local";due.setAttribute("aria-label","Task due date");
      if(task.due_at){const d=new Date(task.due_at);due.value=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
      const save=node("button","Save changes");save.type="submit";form.append(title,priority,due,save,button("Cancel",()=>form.remove()));card.append(form);title.focus();
      form.addEventListener("submit",event=>{event.preventDefault();save.disabled=true;act(async()=>{await api(`/api/tasks/${task.id}`,"PATCH",{title:title.value,priority:priority.value,dueAt:due.value?new Date(due.value).toISOString():null});await load();}).finally(()=>save.disabled=false);});
    }
    async function detail(id,card) {
      const data=await api(`/api/library/${id}`);let box=card.querySelector(".library-detail");if(!box){box=node("div",undefined,"library-detail");card.append(box);}box.replaceChildren(node("p",data.content.description||"No description."));
      for(const t of data.tags)box.append(button(`Remove tag: ${t.tag}`,()=>act(async()=>{await api(`/api/library/${id}`,"POST",{action:"removeTag",tag:t.tag});await detail(id,card);}))); 
      const form=node("form"),input=node("input");input.required=true;input.maxLength=40;input.setAttribute("aria-label","New tag");const add=node("button","Add tag");add.type="submit";form.append(input,add);box.append(form);
      form.addEventListener("submit",event=>{event.preventDefault();act(async()=>{await api(`/api/library/${id}`,"POST",{action:"addTag",tag:input.value});await detail(id,card);});});
      for(const v of data.variants)box.append(node("p",`${v.platform}: ${v.title} ? ${v.caption}`));
    }
    await load();
  };
})();
