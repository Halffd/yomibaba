let elem = document.createElement("div")
if (!(o('rd') || o('kan') || o('fq'))) {
    elem.classList.value = clas;
} else {
    elem.classList.value = 'mns vis';
}
elem.style.height = /*'20em'*/ this.limit
elem.style.flex = this.wid
let pl = document.querySelectorAll('.vis').length
elem.setAttribute('pos', `${pl}`)
this.modK.appendChild(elem)
let hs = document.createElement('span')
hs.className = `words ${I}`
hs.setAttribute('i', I)
elem.classList.add(I)
elem.setAttribute('ind', I)
hs.innerHTML = `<ruby class="word">${tt}<rt class="reading">${tts}</rt></ruby>`;
hs.style.border = '0.2px dotted rgba(230,230,230)'
ptxt.appendChild(hs)
var tit = elem.querySelector('entry-header')
let RGEX_CHINESE = new RegExp(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/);
let kji = RGEX_CHINESE.test(tt);
let isKana = o('kan') == true && kji == true ? true : false
let ptc = false
let hh = document.createElement('span')
hh.className = `words ${I}`
hh.setAttribute('i', I)
elem.classList.add(I)
elem.setAttribute('ind', I)
hh.innerHTML = `<ruby class="word">${tt}<rt class="reading">${tts}</rt></ruby>`;
hh.style.border = '0.2px dotted rgba(230,230,230)'
ptxt.appendChild(hs)
try {
    if (!this.var('roma')) {
        document.querySelector(`[i="${I}"] .reading`).innerHTML = bot[2]
    }
    p.push(hs)
} catch (rer) {
    console.error(rer);
}
let pi = 233
for (let p in this.part) {
    ptc = this.part[p] == tt ? true : false
    if (ptc) {
        pi = p
        break
    }
}
let isPart = pt == true ? ptc : false
console.warn(pi, this.part.length, elem, isKana, ii, tt, tts);
if (emph) {
    elem.style.fontWeight = 'bold'
    emph = false
}
if (!isKana && o('kan')) {
    elem.style.display = 'none'
}
elem.classList.value += 'mns';
console.warn(isPart, tt);
if (isPart || (tt.length < this.min)) {
    let ttt = [tt, 8]
    line.push(ttt)
    elem.classList.value = 'mns';
    elem.style.display = 'none'
    let vis = document.querySelectorAll('.vis')
    let sat = (pi <= 4) ? Math.min(pi * 25, 100) : 50;
    pi *= 360 / this.part.length;
    console.warn(pi, this.part.length, elem, isKana, ii, tt, tts);
    vis[vis.length - 1].style.borderColor = `hsl(${pi} ${sat}%,50%)`
    let entryHeader = elem.querySelector('.entry-header');
    try {
        //entryHeader
        vis[vis.length - 1].insertAdjacentHTML('beforeend', `<div id="particle" class="part" style="font-size: 1.375em;padding:0;margin:0;border: 2px solid purple;">${tt}</div>`);
    } catch (error) {
        console.error('Error:', error);
    }
    if (tt == "は") {
        emph = true
    }
    if (tt == "が") {
        emph = false
        elem.style.fontWeight = 'bold'
    }
    let sc = this.most.slice(0, this.known).includes(tt)
    if (sc) {
        c[ii].style.color = 'rgb(170,255,170)'
    }
} else {
    w.push(tt)
    line.push(tt)
    if (o('rd')) {
        hs.className = `words nav ${I}`
    }
    console.warn(il, splL, I)
    if (this.auto || (il < 5 && spl[0].length < 9)) {
    }
    this.modK.appendChild(elem)
    if (o('yc')) {
        let fy = this.dictionary(isKana, elem, tt, results, tt, spl, tts, elem).catch(er => {
            console.log(er)
        })
        console.log(fy)
    }
}