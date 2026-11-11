const studentProfiles = {
      'Noah Williams': { initials:'NW', id:'STU-24018', grade:'A', gpa:'3.74', attendance:98, progress:86, standing:'On track', note:'Noah is consistently ahead of pace. Consider inviting him to support the peer study group for the next graphs lab.', scores:[92,88,95,91,94,96], average:[84,82,86,84,85,87], assessments:[['Complexity quiz','Sep 09, 2026','92%','84%'],['Linked lists lab','Sep 18, 2026','88%','82%'],['Midterm assessment','Sep 30, 2026','95%','86%'],['Trees checkpoint','Oct 07, 2026','91%','84%']], attendanceLog:[['Oct 07','Lecture','Present'],['Oct 06','Lab','Present'],['Oct 01','Lecture','Present'],['Sep 29','Lab','Present'],['Sep 24','Lecture','Late']] },
      'Aisha Patel': { initials:'AP', id:'STU-24031', grade:'B', gpa:'3.51', attendance:94, progress:72, standing:'On track', note:'Aisha is progressing well. Recommend one extension exercise on graph traversal to stretch her current momentum.', scores:[85,82,89,87,91,88], average:[84,82,86,84,85,87], assessments:[['Complexity quiz','Sep 09, 2026','85%','84%'],['Linked lists lab','Sep 18, 2026','82%','82%'],['Midterm assessment','Sep 30, 2026','89%','86%'],['Trees checkpoint','Oct 07, 2026','87%','84%']], attendanceLog:[['Oct 07','Lecture','Present'],['Oct 06','Lab','Present'],['Oct 01','Lecture','Present'],['Sep 29','Lab','Late'],['Sep 24','Lecture','Present']] },
      'Mateo Garcia': { initials:'MG', id:'STU-24042', grade:'B', gpa:'3.28', attendance:89, progress:64, standing:'Monitor', note:'Mateo has a steady grade trend but needs a nudge to submit the next graph algorithms practice before Friday.', scores:[78,80,84,81,86,84], average:[84,82,86,84,85,87], assessments:[['Complexity quiz','Sep 09, 2026','78%','84%'],['Linked lists lab','Sep 18, 2026','80%','82%'],['Midterm assessment','Sep 30, 2026','84%','86%'],['Trees checkpoint','Oct 07, 2026','81%','84%']], attendanceLog:[['Oct 07','Lecture','Late'],['Oct 06','Lab','Present'],['Oct 01','Lecture','Present'],['Sep 29','Lab','Present'],['Sep 24','Lecture','Absent']] },
      'Chloe Thompson': { initials:'CT', id:'STU-24057', grade:'C', gpa:'2.84', attendance:76, progress:48, standing:'At risk', note:'Invite Chloe to office hours this week to review the Trees & Traversal checkpoint and discuss a catch-up plan for missed Tuesday sessions.', scores:[76,72,69,65,62,68], average:[84,82,86,84,85,87], assessments:[['Complexity quiz','Sep 09, 2026','76%','84%'],['Linked lists lab','Sep 18, 2026','72%','82%'],['Midterm assessment','Sep 30, 2026','69%','86%'],['Trees checkpoint','Oct 07, 2026','65%','84%']], attendanceLog:[['Oct 07','Lecture','Absent'],['Oct 06','Lab','Present'],['Oct 01','Lecture','Absent'],['Sep 29','Lab','Late'],['Sep 24','Lecture','Absent']] },
      'Ethan Kim': { initials:'EK', id:'STU-24063', grade:'A', gpa:'3.91', attendance:100, progress:93, standing:'On track', note:'Ethan is excelling across every measure. Offer the optional advanced graph optimization challenge to maintain engagement.', scores:[96,94,98,95,97,99], average:[84,82,86,84,85,87], assessments:[['Complexity quiz','Sep 09, 2026','96%','84%'],['Linked lists lab','Sep 18, 2026','94%','82%'],['Midterm assessment','Sep 30, 2026','98%','86%'],['Trees checkpoint','Oct 07, 2026','95%','84%']], attendanceLog:[['Oct 07','Lecture','Present'],['Oct 06','Lab','Present'],['Oct 01','Lecture','Present'],['Sep 29','Lab','Present'],['Sep 24','Lecture','Present']] }
    };
    const workspaceRoots = ['.topbar','.page-heading','.course-strip','.operations-strip','.metric-grid','.content-grid','.operations-grid','.roster-panel','.footnote'];
    const operationPanels = ['#assessment-queue','#week-schedule','#course-materials','#course-details'];
    const detail = document.getElementById('student-detail');
    const qs = (id) => document.getElementById(id);
    function updateTimeAwareWelcome() {
      const now = new Date();
      const hour = now.getHours();
      const greeting = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night';
      const greetingEl = qs('greeting');
      const dateEl = qs('today-label');
      if (greetingEl) greetingEl.textContent = `${greeting}, Dorcas`;
      if (dateEl) dateEl.textContent = new Intl.DateTimeFormat('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' }).format(now).toUpperCase();
    }
    updateTimeAwareWelcome();
    setInterval(updateTimeAwareWelcome, 60000);
    let rows = [];
    let apiStudents = [];
    const viewParts = {
      overview: ['.topbar','.page-heading','.course-strip','.operations-strip','.metric-grid','.content-grid','.footnote'],
      students: ['.topbar','.roster-panel','.footnote'],
      assessments: ['.topbar','#assessment-queue','.footnote'],
      attendance: ['.topbar','.content-grid','#attention-panel','.footnote'],
      insights: ['.topbar','.metric-grid','.content-grid','.footnote'],
      schedule: ['.topbar','#week-schedule','.footnote'],
      materials: ['.topbar','#course-materials','.footnote'],
      settings: ['.topbar','#course-details','.footnote']
    };
    function showWorkspaceView(view='overview') {
      workspaceRoots.forEach(sel => { const el=document.querySelector(sel); if(el) el.style.display='none'; });
      operationPanels.forEach(sel => { const el=document.querySelector(sel); if(el) el.style.display='none'; });
      (viewParts[view] || viewParts.overview).forEach(sel => { const el=document.querySelector(sel); if(!el) return; el.style.display=''; if(operationPanels.includes(sel)) el.closest('.operations-grid').style.display=''; });
      if(view==='attendance') { const grid=document.querySelector('.content-grid'); const progress=document.querySelector('.progress-panel'); const grade=document.querySelector('.grade-panel'); const stack=document.querySelector('.right-stack'); if(grid) grid.style.display=''; if(progress) progress.style.display='none'; if(grade) grade.style.display='none'; if(stack) stack.style.display='block'; }
      detail.classList.remove('active'); const mainPane=document.querySelector('.main'); if(mainPane) mainPane.scrollTo({top:0,behavior:'smooth'}); const crumb=qs('breadcrumb-view'); if(crumb) crumb.textContent=viewLabels[view] || 'Overview'; document.body.dataset.workspaceView=view;
    }
    const navLinks = [...document.querySelectorAll('.nav-link')];
    let activeStatus = 'All students';
    let sortMode = 'GPA';
    function toast(title, message) {
      const region = qs('toast-region'); region.innerHTML = `<div class="toast"><strong>${title}</strong>${message}</div>`;
      setTimeout(() => { const item=region.firstElementChild; if(item){item.classList.add('fade'); setTimeout(()=>item.remove(),220);}}, 2800);
    }
    function showDashboard() { showWorkspaceView('overview'); }
    function showStudent(name, updateHash = true) {
      const student = studentProfiles[name] || studentProfiles['Chloe Thompson'];
      workspaceRoots.forEach(sel => { const el=document.querySelector(sel); if(el) el.style.display='none'; }); operationPanels.forEach(sel => { const el=document.querySelector(sel); if(el) el.style.display='none'; }); detail.classList.add('active');
      qs('detail-avatar').textContent = student.initials; qs('detail-name').textContent = name; qs('detail-id').textContent = `${student.id} · BSc Computer Science · Year 2`;
      qs('detail-grade').textContent = student.grade; qs('detail-gpa').textContent = student.gpa; qs('detail-attendance').textContent = `${student.attendance}%`; qs('detail-progress').textContent = `${student.progress}%`; qs('detail-standing').textContent = student.standing;
      qs('detail-standing').className = `risk-badge ${student.standing === 'On track' ? 'on-track' : ''}`; qs('detail-grade-note').textContent = student.standing === 'At risk' ? '+4 pts since last review' : '+2 pts since last review';
      qs('detail-gpa-note').textContent = `${Number(student.gpa) >= 3.42 ? '+' : ''}${(Number(student.gpa) - 3.42).toFixed(2)} vs. class average`; qs('detail-attendance-note').textContent = student.attendance < 80 ? 'Needs follow-up' : 'Healthy attendance'; qs('detail-progress-note').textContent = `${Math.abs(68 - student.progress)}% ${student.progress < 68 ? 'behind' : 'ahead of'} class pace`;
      qs('attendance-ring').style.background = `conic-gradient(#5aac84 0 ${student.attendance}%, #edf1ee ${student.attendance}% 100%)`; qs('attendance-ring-value').textContent = `${student.attendance}%`; qs('attendance-summary-title').textContent = `${Math.round(student.attendance / 4)} of 25 sessions attended`; qs('attendance-summary-copy').textContent = student.attendance < 80 ? 'Six missed sessions this term. Most absences are on Tuesdays.' : 'Strong attendance this term. Keep the current rhythm through the final modules.'; qs('detail-note-text').textContent = student.note;
      const labels = ['Sep 09','Sep 18','Sep 30','Oct 07','Oct 14','Oct 21']; qs('chart-labels').innerHTML = labels.map(x => `<span>${x}</span>`).join(''); qs('chart-bars').innerHTML = student.scores.map((score, i) => `<div class="chart-column"><div class="chart-bar" style="height:${score}%"><span>${score}</span></div><div class="chart-bar avg" style="height:${student.average[i]}%"></div></div>`).join(''); qs('assessment-list').innerHTML = student.assessments.map(a => `<div class="assessment-row"><div><div class="assessment-name">${a[0]}</div><div class="assessment-date">${a[1]}</div></div><div class="assessment-grade">${a[2]}</div><div class="assessment-avg">Avg ${a[3]}</div></div>`).join(''); qs('attendance-rows').innerHTML = student.attendanceLog.map(row => `<div class="attendance-log-row"><span>${row[0]}</span><span>${row[1]}</span><span class="attendance-status ${row[2].toLowerCase()}">${row[2]}</span></div>`).join('');
      if (updateHash) history.pushState({student:name}, '', `#student/${encodeURIComponent(name)}`); window.scrollTo({top:0, behavior:'smooth'});
    }
    function applyRosterView() {
      const query = qs('student-search').value.toLowerCase().trim(); let visible=0;
      rows.forEach(row => { const name=row.querySelector('.student-name').textContent.trim(); const profile=studentProfiles[name] || apiStudents.find(item=>item.name===name); const matchesText=!query || name.toLowerCase().includes(query) || profile.id.toLowerCase().includes(query); const matchesStatus=activeStatus==='All students' || profile.standing===activeStatus; row.classList.toggle('is-hidden', !(matchesText && matchesStatus)); if(matchesText && matchesStatus) visible++; });
      qs('roster-count').textContent = `${visible} students`; qs('table-summary').innerHTML = visible ? `Showing <strong style="color:#5f6e68;font-weight:650">1–${visible}</strong> of ${visible} students` : 'No students match these filters';
    }
    function openMenu(button, items, onSelect) { document.querySelectorAll('.filter-menu').forEach(x=>x.remove()); const menu=document.createElement('div'); menu.className='filter-menu'; items.forEach(item=>{const b=document.createElement('button'); b.type='button'; b.textContent=item; b.onclick=()=>{onSelect(item); menu.remove();}; menu.appendChild(b);}); button.parentElement.appendChild(menu); }
    function bindRosterRows() {
      rows = [...document.querySelectorAll('#student-table-body tr[data-student-name]')];
      rows.forEach(row => { row.tabIndex=0; const name=row.dataset.studentName; row.setAttribute('aria-label', `Open ${name} profile`); row.addEventListener('click', e => { if(!e.target.closest('.row-more')) showStudent(name); }); row.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' '){e.preventDefault();showStudent(name);} }); row.querySelector('.row-more').addEventListener('click', e=>{e.stopPropagation();showStudent(name);toast('Student actions',`Opened quick actions for ${name}.`);}); });
    }
    function renderStudents(students) {
      const tableBody=qs('student-table-body');
      if(!students.length){ tableBody.innerHTML='<tr><td colspan="7">No students found.</td></tr>'; rows=[]; return; }
      tableBody.innerHTML=students.map(student=>{ const avatarClass=student.standing==='At risk'?'peach':student.standing==='Monitor'?'lilac':'green'; const statusClass=student.standing==='At risk'?'risk':student.standing==='Monitor'?'watch':'good'; const attendanceClass=student.attendance<80?'attendance low':'attendance'; return `<tr data-student-name="${student.name}"><td><div class="student-cell"><div class="avatar student ${avatarClass}">${student.initials}</div><div><div class="student-name">${student.name}</div><div class="student-id">${student.id}</div></div></div></td><td><span class="grade-pill">${student.grade}</span></td><td><strong style="color:#43564f;font-weight:650">${Number(student.gpa).toFixed(2)}</strong></td><td><span class="${attendanceClass}">${student.attendance}%</span></td><td><div class="progress-cell"><div class="bar-track"><div class="bar-fill" style="width:${student.progress}%"></div></div><span class="progress-number">${student.progress}%</span></div></td><td><span class="status ${statusClass}">${student.standing}</span></td><td><button class="row-more" type="button" aria-label="Open ${student.name} profile">···</button></td></tr>`; }).join('');
      bindRosterRows(); applyRosterView();
    }
    async function loadStudentsFromApi() {
      const tableBody=qs('student-table-body');
      try { const response=await fetch('/api/students'); if(!response.ok) throw new Error('Could not load students'); const result=await response.json(); apiStudents=result.data || []; apiStudents.forEach(student=>{ if(studentProfiles[student.name]) Object.assign(studentProfiles[student.name],student); }); renderStudents(apiStudents); }
      catch(error) { console.error(error); tableBody.innerHTML='<tr><td colspan="7">Unable to load students. Start the Express server and try again.</td></tr>'; qs('roster-count').textContent='Students unavailable'; }
    }
    const navViews = { 'Overview':'overview', 'My students':'students', 'Assessments':'assessments', 'Attendance':'attendance', 'Insights':'insights', 'Course materials':'materials', 'Settings':'settings' };
    const viewLabels = { overview:'Overview', students:'My students', assessments:'Assessments', attendance:'Attendance', insights:'Insights', schedule:'Assessments', materials:'Course materials', settings:'Settings' };
    function goToDestination(view, label) { showWorkspaceView(view); navLinks.forEach(x=>x.classList.toggle('active', x.querySelector('.label')?.textContent===viewLabels[view])); toast(label, `${label} section opened.`); }
    navLinks.forEach(link => link.addEventListener('click', () => { navLinks.forEach(x=>x.classList.remove('active')); link.classList.add('active'); const label=link.querySelector('.label')?.textContent || 'Workspace'; goToDestination(navViews[label] || 'overview', label); }));
    qs('back-to-roster').addEventListener('click', () => { history.pushState({}, '', location.pathname); navLinks.forEach(x=>x.classList.remove('active')); navLinks.find(x=>x.querySelector('.label')?.textContent==='My students')?.classList.add('active'); showWorkspaceView('students'); }); window.addEventListener('popstate', () => { const match=location.hash.match(/^#student\/(.+)$/); match ? showStudent(decodeURIComponent(match[1]),false) : showDashboard(); });
    qs('message-student').addEventListener('click',()=>toast('Message composer',`Draft started for ${qs('detail-name').textContent}.`)); qs('export-student').addEventListener('click',()=>toast('Profile export',`Preparing a PDF-ready profile for ${qs('detail-name').textContent}.`)); qs('add-note').addEventListener('click',()=>toast('Private note',`New note field opened for ${qs('detail-name').textContent}.`));
    qs('export-report').addEventListener('click',()=>{ const data='Faculty Desk report\nCourse: CS204 Data Structures & Algorithms\nStudents: 128\nAverage grade: 86.7%\nAttendance: 92.4%'; const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([data],{type:'text/plain'})); a.download='faculty-desk-report.txt'; a.click(); URL.revokeObjectURL(a.href); toast('Report exported','Your course summary has been downloaded.'); });
    qs('term-button').addEventListener('click',()=>openMenu(qs('term-button'),['First Semester 2026','Second Semester 2027'],item=>{qs('term-button').childNodes[0].textContent=item+' ';toast('Term changed',`Viewing ${item}.`);})); qs('status-filter').addEventListener('click',()=>openMenu(qs('status-filter'),['All students','On track','Monitor','At risk'],item=>{activeStatus=item;qs('status-filter').childNodes[0].textContent=item+' ';applyRosterView();})); qs('sort-filter').addEventListener('click',()=>openMenu(qs('sort-filter'),['GPA','Attendance','Course progress'],item=>{sortMode=item;qs('sort-filter').childNodes[0].textContent=`Sort: ${item} `;toast('Roster sorted',`Students are now sorted by ${item.toLowerCase()}.`);})); qs('student-search').addEventListener('input',applyRosterView);
    qs('notifications-button').addEventListener('click',async()=>{
      const existing=document.querySelector('.notification-menu'); if(existing){ existing.remove(); qs('notifications-button').setAttribute('aria-expanded','false'); return; }
      document.querySelectorAll('.filter-menu').forEach(x=>x.remove());
      const menu=document.createElement('div'); menu.className='notification-menu'; menu.setAttribute('role','dialog'); menu.setAttribute('aria-label','Notifications');
      menu.innerHTML='<div class="notification-head"><span>Notifications</span><span>Loading…</span></div>';
      qs('notifications-button').parentElement.appendChild(menu); qs('notifications-button').setAttribute('aria-expanded','true');
      try {
        const response=await fetch('/api/notifications',{credentials:'same-origin'}); if(!response.ok) throw new Error('Unable to load notifications');
        const result=await response.json(); const icon={grade:'fa-clipboard-check',attendance:'fa-user-check',assessment:'fa-file-pen',material:'fa-folder-open'};
        const items=result.data||[]; menu.querySelector('.notification-head').innerHTML=`<span>Notifications</span><span>${result.unread} unread</span>`;
        if(!items.length){menu.insertAdjacentHTML('beforeend','<div class="notification-empty">No new notifications yet.</div>');}
        items.forEach(item=>{const button=document.createElement('button'); button.className='notification-item'; button.type='button'; button.dataset.id=item.id; if(!item.isRead) button.classList.add('unread'); button.innerHTML=`<span class="notification-icon"><i class="fa-solid ${icon[item.type]||'fa-bell'}" aria-hidden="true"></i></span><span class="notification-copy"><strong>${item.title}</strong><span>${item.message}</span></span>`; menu.appendChild(button); button.addEventListener('click',async()=>{if(!item.isRead) await fetch(`/api/notifications/${item.id}/read`,{method:'PATCH',credentials:'same-origin'}); menu.remove(); qs('notifications-button').setAttribute('aria-expanded','false'); toast(item.title,item.message);});});
        const dot=qs('notifications-button').querySelector('.notification-dot'); if(dot) dot.style.display=result.unread?'block':'none';
      } catch(error) { menu.innerHTML='<div class="notification-head"><span>Notifications</span></div><div class="notification-empty">Unable to load notifications.</div>'; }
    });
    qs('profile-button').setAttribute('aria-expanded','false');
    qs('profile-button').addEventListener('click',()=>{const menu=qs('profile-menu');menu.hidden=!menu.hidden;qs('profile-button').setAttribute('aria-expanded',String(!menu.hidden));}); document.querySelectorAll('#profile-menu button').forEach(b=>b.addEventListener('click',async()=>{qs('profile-menu').hidden=true;qs('profile-button').setAttribute('aria-expanded','false'); if(b.dataset.action==='sign-out'){await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'}); window.location.href='/login.html'; return;} toast(b.textContent,'Action saved to your lecturer workspace.');}));
    document.querySelectorAll('.text-link:not([data-operation])').forEach(link=>link.addEventListener('click',e=>{e.preventDefault(); const target=link.getAttribute('href'); if(target==='#attendance') goToDestination('attendance','Attendance'); else goToDestination('students','Student roster'); }));
    let currentPage=1; const totalPages=26;
    document.querySelectorAll('.page').forEach(page=>page.addEventListener('click',()=>{ const value=page.textContent.trim(); if(value==='‹') currentPage=Math.max(1,currentPage-1); else if(value==='›') currentPage=Math.min(totalPages,currentPage+1); else if(/^\d+$/.test(value)) currentPage=Number(value); document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.textContent.trim()===String(currentPage))); toast('Pagination',`Page ${currentPage} selected.`); }));
    document.querySelectorAll('.nav-link').forEach(link=>{link.setAttribute('role','button');link.setAttribute('tabindex','0');link.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();link.click();}});});
    document.querySelectorAll('.material-item').forEach(item=>{item.setAttribute('role','button');item.setAttribute('tabindex','0');item.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();item.click();}});});
    document.addEventListener('click',e=>{if(!e.target.closest('.filter')&&!e.target.closest('.filter-menu')&&!e.target.closest('#term-button')) document.querySelectorAll('.filter-menu').forEach(x=>x.remove()); if(!e.target.closest('#notifications-button')&&!e.target.closest('.notification-menu')) { document.querySelectorAll('.notification-menu').forEach(x=>x.remove()); qs('notifications-button').setAttribute('aria-expanded','false'); } if(!e.target.closest('#profile-button')&&!e.target.closest('#profile-menu')) { qs('profile-menu').hidden=true; qs('profile-button').setAttribute('aria-expanded','false'); }});
    const operationViews = { schedule:'schedule', grading:'assessments', attendance:'attendance', 'office-hours':'schedule', assessment:'assessments', materials:'materials', details:'settings' };
    document.querySelectorAll('[data-operation]').forEach(el=>el.addEventListener('click',()=>{ const labels={schedule:'Teaching schedule',grading:'Grading queue',attendance:'Attendance follow-up', 'office-hours':'Office hours',assessment:'Assessment management',materials:'Course materials',details:'Course details'}; const key=el.dataset.operation; goToDestination(operationViews[key] || 'overview', labels[key] || 'Lecturer workspace'); }));
    const initialMatch=location.hash.match(/^#student\/(.+)$/); if(initialMatch) showStudent(decodeURIComponent(initialMatch[1]),false); else showWorkspaceView('overview');
    loadStudentsFromApi();
