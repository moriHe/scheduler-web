import getText from "../localization";
import { displayError } from "../utils/render";
import {formatDayOfWeek} from "./generateShiftplanPdf";
import {formatDate} from "date-fns";

// Aktualisierte assignUsersCalendar-Funktion: Jeder Nutzer nur eine Schicht pro Tag
export function assignUsersCalendar(month, year, localUsers, options = {}, cols) {
    const {
        weekdays = ["Monday","Tuesday","Wednesday","Thursday","Friday"],
        holidays = [],
        kitaOpenNoEd = [],
        teamdays = [],
        shiftTypes = {} // {shift1:{onePerson:[],twoPersons:[],threePersons:[]},...}
    } = options;

    // Hilfsfunktionen
    function isValidDay(y,m,d) {
        const key = `${y}-${m}-${d}`;
        if (holidays.includes(key)) return false;
        const wd = new Date(y,m-1,d).toLocaleDateString('en-US',{weekday:'long'});
        return weekdays.includes(wd);
    }

    function requiredCount(shiftKey,day) {
        const key = `${year}-${month}-${day}`;
        const cfg = shiftTypes[shiftKey]||{};
        if (cfg.threePersons?.includes(key)) return 3;
        if (cfg.twoPersons?.includes(key)) return 2;
        return 1;
    }

    function calcServiceDays() {
        let cnt=0;
        for(let d=1;d<=daysInMonth;d++) if(isValidDay(year,month,d)) cnt++;
        return cnt;
    }

    function getEligible(shiftCount,shiftKey,day) {
        const key=`${year}-${month}-${day}`;
        return _users.filter(u=>{
            if (u.not_available[shiftKey]?.includes(key)) return false;
            if (!isValidDay(year,month,day)) return false;
            if (shiftCount===1) return u.onePersonShift;
            if (shiftCount===2) return u.twoPersonShift;
            return u.threePersonShift;
        });
    }

    function updateUserPrio(users,avg,hasEnough,sel) {
        if(!hasEnough) return;
        users.forEach(u=>{
            if(u.name===sel.name){
                u.serviceCount++;
                if(u.serviceCount>=avg) u.prio=1000;
                else if(u.prioOffsetFactor===0) u.prio=-1000;
                else u.prio=10*u.prioOffsetFactor;
            } else if(u.prio!==1000 && u.prio!==-1000) {
                u.prio-=10;
            }
        });
    }

    function pickPool(sorted,count){
        const sel=sorted.slice(0,count);
        while(sel.length<count) sel.push({name:getText("create.notSet")});
        return sel;
    }

    // Setup
    const daysInMonth=new Date(year,month,0).getDate();
    const totalDays=calcServiceDays();
    const avgService=Math.floor(totalDays*cols/localUsers.length);
    // Kopie und initial Prio
    const _users=localUsers.map(u=>({
        ...u,
        serviceCount:0,
        prioOffsetFactor:0,
        prio:0
    }));
    _users.forEach(u=>{
        const na=new Set(Object.values(u.not_available).flat());
        const avail=totalDays - na.size;
        const factor= avail<=totalDays/4 ?0: avail<=totalDays/2?2:1;
        u.prioOffsetFactor=factor;
        u.prio= avail<=totalDays/4? -1000 : -10*factor;
    });

    const calendar={};
    for(let day=1;day<=daysInMonth;day++){
        const keyDay=`${year}-${month}-${day}`;
        const valid=isValidDay(year,month,day);
        const openNoEd=kitaOpenNoEd.includes(keyDay);
        calendar[day]={isValidDay:valid,isKitaOpenNoEd:openNoEd,isAssigned:false,shifts:{}};
        if(!valid||openNoEd){
            ['shift1','shift2','shift3'].slice(0,cols).forEach(k=>calendar[day].shifts[k]=[]);
            continue;
        }
        const assigned=[];
        ['shift1','shift2','shift3'].slice(0,cols).forEach(shiftKey=>{
            const req=requiredCount(shiftKey,day);
            let pool=getEligible(req,shiftKey,day).filter(u=>!assigned.includes(u.name));
            pool.sort((a,b)=>{
                if(a.prio!==b.prio) return a.prio-b.prio;
                if(a.serviceCount!==b.serviceCount) return a.serviceCount-b.serviceCount;
                return Math.random()<0.5?-1:1;
            });
            const sel=pickPool(pool,req);
            calendar[day].shifts[shiftKey]=sel.map(u=>u.name);
            calendar[day].isAssigned=calendar[day].isAssigned||pool.length>=req;
            pool.slice(0,req).forEach(u=> updateUserPrio(_users,avgService,true,u));
            sel.forEach(u=>{ if(u.name!==getText("create.notSet")) assigned.push(u.name); });
        });
    }
    return calendar;
}

// PDF-Generierung mit Mehrfach-Eltern pro Zelle
export function generateShiftplanPdf(calendar, month, year, usersData = [], isKita, cols) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Titel und Legende (unverändert)
    const title = isKita ? getText("create.kitashiftplan") : getText("create.shiftplan");
    doc.setFontSize(16);
    doc.text(title, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    const monthYear = window.dateFns.format(new Date(year, month - 1), 'MMMM yyyy', { locale: window.dateFns.locale.de });
    doc.text(monthYear, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

    const legendY = 28;
    const pageWidth = doc.internal.pageSize.getWidth();
    const legendX = (pageWidth - 150) / 2;
    const box = 6;
    doc.setFillColor(255, 230, 153);
    doc.rect(legendX, legendY, box, box, 'F');
    doc.setFontSize(10);
    doc.text(isKita ? getText("create.kitashiftplanOpenInfo") : getText("create.shiftplanOpenInfo"), legendX + box + 5, legendY + box - 1);
    const redX = legendX + 90;
    doc.setFillColor(255, 204, 204);
    doc.rect(redX, legendY, box, box, 'F');
    doc.text(getText("create.closedInfo"), redX + box + 5, legendY + box - 1);

    // Tabellendaten vorbereiten
    const rows = [];
    Object.entries(calendar).forEach(([day, data]) => {
        const { shifts, isValidDay, isKitaOpenNoEd, invalidText } = data;
        const dow = formatDayOfWeek(day, month, year);
        const date = formatDate(day, month, year);
        if (!isValidDay || isKitaOpenNoEd) {
            rows.push({
                data: [dow, date, { content: invalidText || '', colSpan: cols, styles: { halign: 'center', fillColor: isKitaOpenNoEd ? [255,230,153] : [255,204,204], textColor:[50,50,50] } }]
            });
        } else {
            const shiftCells = [];
            for (let i = 1; i <= cols; i++) {
                shiftCells.push(shifts[`shift${i}`].join('\n'));
            }
            rows.push({ data: [dow, date, ...shiftCells] });
        }
    });

    // Header
    const headers = [getText("create.day"), getText("create.date"), ...Array.from({length: cols}, (_, i) => `Schicht ${i+1}`)];
    const margin = (pageWidth - (cols === 2 ? 150 : 190)) / 2;

    doc.autoTable({
        head: [headers],
        body: rows.map(r => r.data),
        startY: legendY + 10,
        theme: 'grid',
        headStyles: { fillColor: [100,100,255] },
        alternateRowStyles: { fillColor: [245,245,245] },
        bodyStyles: { halign: 'center' },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 20 },
            ...(cols === 3
                ? { 2:{cellWidth:60},3:{cellWidth:50},4:{cellWidth:50} }
                : { 2:{cellWidth:50},3:{cellWidth:50} })
        },
        margin: { left: margin, right: margin }
    });

    return doc.output('blob');
}
