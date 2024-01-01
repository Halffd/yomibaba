let moe = async (spl, ii, splL) => {
                let ttt
                let tt
                let tts
                let elem
                let w = []
                try {
                    if (this.start && ii >= 0) {
                        if (o('rd') || o('kan') || o('fq')) {
                            this.modK = document.createElement('div')
                            this.modK = this.modP.appendChild(document.createElement("td"))
                            console.warn(this.modK, this.modP);
                            this.modK.id = 'modR'
                            this.modK.style.display = 'flex'
                            this.modK.style.flexWrap = 'wrap'
                            this.modK.style.minWidth = '10%'
                        }
                        tts = ''
                        tt = ''
                        //let ciir = c[ii].querySelectorAll('.query-parser-segment-reading')
                        tt = typeof spl[ii] == 'string' ? spl[ii] : spl[ii].join() //.querySelectorAll('.query-parser-segment-text')
                        //let ind = parseInt(c[ii].getAttribute('data-offset'))
                        //let lind = parseInt(c[ii - 1].getAttribute('data-offset'))

                        let ttx = tt.split(/[^ -~]+/);
                        console.warn('ttttt', tt, ttx);
                        let il = tt.length
                        let ix = ii
                        let tp = ''
                        console.log(`${parseInt(ii) + 1}/${spl.length}.  : `, ii, tt, tts, ix)
                        if (spl[ii] >= 0) {
                            this.nl = true
                            this.nll = true
                            console.log(`===-=>${this.nl}`)
                            //if (mode == 'lyrics') { }
                        }
                        /*while(spl[ix].indexOf(tt) == -1){
                            ix -= 1
                            if (ix < 0) {
                                ix = 0
                                break
                            }
                        }*/
                        //}ciit[ii-1].innerText.length
                        ///prnt.style.width = '0.8em'
                        //prnt.style.height = '0.8em'
                        //prnt.style.position= 'relative'
                        //ptxt.style.top= '-100px'
                        console.warn(il);
                        //this.slow = false
                        if (!(il > 200 || spl.length > 4)) {
                            this.slow = true
                        }
                        this.modK = document.createElement('div')
                        this.modK.id = 'modK'
                        this.modK.style.display = 'flex'
                        //this.modP.style.display = 'flex'
                        this.modT.style.display = 'flex'
                        this.modT.style.flexDirection = 'column';
                        //this.Mod.style.display = 'flex'
                        //this.modK.style.flex = '1 1 10%'
                        this.modK.style.flexWrap = 'wrap'
                        this.modK.style.minWidth = '10%'
                        if (false && o('pre')) {
                            this.modP.prepend(this.modK)
                            //this.modP.prepend(ptxt)
                        } else {
                            //this.modK = this.modP.appendChild(document.createElement("div"))
                        }
                        let isKana = japaneseUtil.isStringPartiallyJapanese(tt)
                        let line = []
                        //console.log(isKanji);
                        var ptxt = document.createElement('div')
                        ptxt.className = 'sentence'
                        //ptxt.style.border = '1px solid rgb(120,0,0)'
                        let e = document.createElement('h4')
                        try {
                            var ps = spl[ii].split(' ')
                        } catch { }
                        let ap = 0
                        var p = []
                        /*for (let h in ps) {
                            let hs = document.createElement('span')
                            hs.className = `set tls ${h}`
                            hs.innerHTML = `<ruby><p>${ps[h]}</p><rt></rt></ruby>`
                            hs.style.border = '1px dotted rgba(230,230,230)'
                            //hs.style.paddingRight = '0.2em'
                            ptxt.appendChild(hs)
                            p.push(hs)
                        }*/
                        //ptxt.innerHTML = `<ruby><p>${spl[ii]}</p><rt></rt></ruby></br>`
                        //var ps = spl[ii].spl
                        this.modP.appendChild(ptxt)
                        let ttl = ttx.length
                        let tti = 0
                        let si = 0
                        if (isKana) {
                            this.modP.appendChild(this.modK)
                            console.warn(this.modK, this.modP);
                            tt = tt.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '')
                            let sc = this.most.slice(0, this.known).includes(tt)
                            if (sc) {
                                //c[ii].style.color = 'rgb(170,255,170)'
                            }
                            let moe = await this.web(encodeURI(`https://ichi.moe/cl/qr/?r=htr&q=${tt}`))
                            //let css = moe.querySelectorAll('link[rel="stylesheet"]')
                            //let img = moe[1]
                            //document.getElementsByTagName('head')[0].insertAdjacentHTML('beforeend','<link rel="stylesheet" href="path/to/style.css" />');
                            //this.modC.innerHTML += moe
                            this.modC.innerHTML = `<iframe class="mo" style="display: none;"></iframe>`
                            this.modK.setAttribute('txt', spl[ii])
                            let mo = this.modC.querySelectorAll(".mo")
                            mo = mo[mo.length - 1]
                            console.error(mo)
                            mo.contentWindow.document.head.innerHTML = `<meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width,initial-scale=1">
                            <title>Search Moe</title>
                            <link rel="stylesheet" type="text/css" href="./moe.css">`
                            mo.contentWindow.document.body.innerHTML = '<div class="moe">' + moe + '</div>'
                            let moi = mo.querySelector('.moe')
                            //mo.contentWindow.document.querySelector('.header').remove()
                            //mo.contentWindow.document.querySelector('#div-ichiran-form').remove()
                            //mo.contentWindow.document.querySelector('#div-ichiran-result').remove()
                            //moi.innerHTML = moe
                            let mns = mo.contentWindow.document.querySelectorAll('div.gloss-content.scroll-pane > dl')
                            let rom = mo.contentWindow.document.querySelector('#div-ichiran-result > p > em')
                            console.error(mns, rom.innerHTML.split(' '))
                            let c = mns
                            let emph = false
                            for (let ii in mns) {
                                try {
                                    if (this.stop) {
                                        //this.stop = false
                                        return
                                    }
                                    let ana = true
                                    if (ana && mns[ii].innerHTML) {
                                        try {
                                            let comc = mns[ii].querySelector('.conj-via')
                                            let mn = mns[ii].querySelectorAll('li')
                                            let con = mns[ii].querySelector('.conj-gloss')
                                            let com = mns[ii].querySelector('.compounds')
                                            let comp = mns[ii].querySelector('dl>dt')
                                            let mp = mns[ii].querySelector('.compound-desc-word')
                                            let dd = mns[ii].querySelector('dd')
                                            //reverseChildren(comc.children)
                                            let pm = true
                                            if (comp == null) {
                                                pm = false
                                            } else if (com != null && mp != null) {
                                                pm = com
                                            } else if (comc != null) {
                                                //pm = false
                                                pm = comc.parentElement
                                            } else if (con != null) {
                                                pm = con
                                                //pm = false
                                            } else {
                                                pm = false
                                            }
                                            if (pm != false) {
                                                let m = []
                                                pm = dd
                                                for (let u in mn) {
                                                    if (mn[u].innerHTML !== undefined) {
                                                        m.push(mn[u])
                                                        mn[u].remove()
                                                    }
                                                }
                                                let cc = pm.innerHTML
                                                pm.innerHTML = ''
                                                for (let u in mn) {
                                                    if (mn[u].innerHTML !== undefined) {
                                                        //comc.innerHTML = mn[u].innerHTML
                                                        pm.innerHTML += '<li>' + mn[u].innerHTML + '</li>'
                                                        //cc.replaceAll(mn[u].innerText,'')
                                                        //break
                                                    }
                                                }
                                                pm.innerHTML += cc
                                            }
                                        } catch { }
                                        //this.modK.innerHTML += `<div class="mns vis" style="border: 2px solid gray; height: ${this.limit}; width: ${this.wid};">${mns[ii].innerHTML}</div>`

                                        ttt = mns[ii].querySelector('dt').innerHTML.split(' ')
                                        tt = parseInt(ttt[0].substring(0, 1)) >= 0 && ttt.length > 1 ? ttt[1] : ttt[0]
                                        tts = mns[ii].parentElement.parentElement.children[0].children[0].innerText
                                        elem = document.createElement("div")
                                        si += tt.length
                                        if (!(o('rd'))) {
                                            elem.classList.value = 'mns vis nav';
                                        } else {
                                            elem.classList.value = 'mns vis nav'; //elem.classList.value = 'mns vis';
                                        }
                                        elem.style.border = '1px solid gray'
                                        elem.style.height = this.limit
                                        elem.style.width = this.wid
                                        elem.style.flex = '15%'
                                        let pl = document.querySelectorAll('.vis').length
                                        elem.setAttribute('pos', `${pl}`)
                                        elem.innerHTML = `${mns[ii].innerHTML}`
                                        var tit = elem.querySelector('dt')
                                        tit.className = 'title'
                                        //this.modK.querySelectorAll('.mns')[ii]
                                        //elem.setAttribute('txt', spl[ii])
                                        try {
                                            console.warn(tit);
                                            elem.addEventListener("dblclick", function (ele) {
                                                if (!ele) var ele = window.event;
                                                ele.stopPropagation()
                                                console.dir(ele, ele.target)
                                                let elem = ele.target.closest('.mns')
                                                let ist = ele.target.closest('.title')
                                                if (elem.style.width != '') {
                                                    elem.style.width = ''
                                                    elem.style.height = ''
                                                    elem.style.flex = ''
                                                } else {
                                                    elem.style.height = localStorage.getItem('ht');;
                                                    elem.style.width = localStorage.getItem('wt');;
                                                    elem.style.flex = '15%'
                                                }
                                            }, false)
                                            elem.addEventListener("click", function (ele) {
                                                if (!ele) var ele = window.event;
                                                ele.stopPropagation()
                                                console.dir(ele, ele.target)
                                                let save = localStorage.getItem('save')
                                                let elem = ele.target.closest('.mns')
                                                let ist = ele.target.closest('.title')
                                                let b = document.querySelectorAll('.vis')
                                                pos = parseInt(elem.getAttribute('pos'))
                                                let ps = []
                                                posr = [pos, elem.style.border, ps]
                                                elem.style.border = '1px dotted red'
                                                if (!ist && !ele.button != 2) {
                                                    return //auxclick\
                                                }
                                                if (ele.target.closest('.w')) {
                                                    let x = ele.target.closest('.w')
                                                    if (x.style.display === "none") {
                                                        x.style.display = "block";
                                                    } else {
                                                        x.style.display = "none";
                                                    }
                                                    return
                                                }
                                                try {
                                                    sv(elem)
                                                } catch (err) {
                                                    console.error(err);
                                                }
                                                //elem = elem.parentElement
                                                if (elem.style.width != '') {
                                                    elem.style.width = ''
                                                    elem.style.height = ''
                                                    elem.style.flex = ''
                                                } else {
                                                    elem.style.height = localStorage.getItem('ht');;
                                                    elem.style.width = localStorage.getItem('wt');;
                                                    elem.style.flex = '15%'
                                                }
                                            }, false)
                                            tit.innerHTML = `<div class="tit"><span class="kj">${tt}</span><span class="rd">${tts}</span><span id="particle" class="part" style="font-size: 1.25em;padding:0;margin:0;"></span></div>`
                                        } catch (clrr) {
                                            console.error(clrr);
                                        }
                                        //elem.style.backgroundColor = 'red'
                                        let RGEX_CHINESE = new RegExp(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/);
                                        let kji = RGEX_CHINESE.test(tt);
                                        let isKana = o('kan') == true && kji == true ? true : false
                                        let ptc = false
                                        let hs = document.createElement('span')
                                        hs.className = `words ${I}`
                                        hs.setAttribute('i', I)
                                        elem.classList.add(I)
                                        elem.setAttribute('ind', I)
                                        hs.innerHTML = `<ruby class="word">${tt}<rt class="reading">${tts}</rt></ruby>`;
                                        hs.style.border = '0.2px dotted rgba(230,230,230)'
                                        //hs.style.paddingRight = '0.2em'
                                        ptxt.appendChild(hs)
                                        p.push(hs)
                                        //ptxt.querySelector('rt').innerHTML += tts + ' '
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
                                            elem.style.fontWeight = 'bold' //border = '4px solid green'
                                            emph = false
                                        }
                                        if (!isKana && o('kan')) {
                                            elem.style.display = 'none'
                                        }
                                        if ((isPart && ii > 0) || (tt.length < this.min)) { //(!isKana && !o('rd')) || 
                                            let ttt = [tt, 8]
                                            line.push(ttt)
                                            elem.classList.value = 'mns';
                                            elem.style.display = 'none'
                                            let vis = document.querySelectorAll('.vis')
                                            let sat = 50
                                            if (pi <= 4) {
                                                sat = pi * 25
                                                sat *= 1
                                                while (sat > 100) {
                                                    sat /= 1.125
                                                }
                                            }
                                            pi *= 360 / this.part.length
                                            console.warn(pi, this.part.length, elem, isKana, ii, tt, tts);
                                            vis[vis.length - 1].style.borderColor = `hsl(${pi} ${sat}%,50%)`
                                            vis[vis.length - 1].querySelector('#particle').innerHTML += tt
                                            if (tt == "は") { //emphatizes after
                                                emph = true
                                            }
                                            if (tt == "が") { //emphatizes before
                                                emph = false
                                                elem.style.fontWeight = 'bold' //border = '4px solid green'
                                            }
                                            document.querySelector(`[i="${I}"] .reading`).innerHTML = ''
                                            let sc = this.most.slice(0, this.known).includes(tt)
                                            if (sc) {
                                                c[ii].style.color = 'rgb(170,255,170)'
                                            }
                                            //elem = document.querySelectorAll('.vis')[i]
                                            //ttt = .querySelector('dt').innerHTML.split(' ')
                                            //tts = mns[ii].parentElement.parentElement.children[0].children[0].innerText
                                            //console.warn(...w[ii])
                                        } else {
                                            w.push(tt)
                                            line.push(tt)
                                            if (o('rd')) {
                                                hs.className = `words nav ${I}`
                                            }
                                            //let prnt = document.createElement("div")
                                            //let prnt = null

                                            //let st = await this.wkt(tt)
                                            //this.mod.innerHTML += st
                                        }
                                        console.warn(il, splL, I)
                                        if (this.auto || (il < 5 && splL < 3)) {
                                            sv(elem, 1, tt, spl[ii])
                                        }
                                        this.modK.appendChild(elem)
                                        if (!this.slow || o('fq')) {
                                            let fx = this.dictionary(isKana, elem, tt, 0, tt, spl, tts, elem)
                                        }
                                        //            elem.children[1].children[0].ondblclick = cl
                                    }
                                } catch (ez) {
                                    w.push(false)
                                    console.error(ez)
                                }
                                I += 1
                            }
                            console.error(w)
                            //{
                            let ws = []// segmenter.segment(tt)
                            //ws = ws.filter(function (entry) { return entry.replace(/^[\s,]+|[\s,]+$|\s*(\s|,)[\s,]|[.]*/g, "").trim() != ''; });
                            console.warn(tt, '==>', w)
                            //console.log(f)
                            //return f
                            //}
                            //promiseChain = promiseChain.then(makeNextPromise(''))
                        } else {
                            //let prnt = document.createElement("div")
                            //let prnt = null
                            //let st = await this.wkt(tt)
                            //this.modP.innerHTML += spl[ii]
                        }
                        let hs = document.createElement('span')
                        let tta = ttx.join(' ')//[tti]
                        console.warn(ttx, tti, tta, si);
                        hs.className = `words non ${I}`
                        hs.setAttribute('i', I)
                        elem.classList.add(I)
                        elem.setAttribute('ind', I)
                        hs.innerHTML = `<ruby class="word">${tta}<rt class="reading"></rt></ruby>`;
                        hs.style.border = '0.01px dotted rgb(230,230,230)'
                        //hs.style.paddingRight = '0.2em'
                        ptxt.appendChild(hs)
                        p.push(hs)
                        tti += 1
                        I += 1
                        if (this.lang == 'id') {
                            tt = spl[ii].toLowerCase()
                            var tls = this.modT.appendChild(document.createElement('div'))
                            tls.id = 'mtl'
                            var tll = tls.appendChild(document.createElement('div'))
                            let mk = tll.appendChild(document.createElement('span'))
                            mk.id = 'modK'
                            var tl = tls.appendChild(document.createElement('div'))
                            tls.className = 'tls'
                            tl.style.fontSize = '1.32em'
                            let frm = this.lang.length > 1 ? this.lang : undefined //null
                            let ts = tt.split(' ')
                            let en = await this.g(tt, frm, 'en', 0)
                            console.warn('TlAuto: ', en);
                            let e = document.createElement('h4')
                            //this.modP.appendChild(ptxt)

                            let ens = en.split(' ')
                            let ap = 0
                            let spns = []
                            for (let h in ens) {
                                let hs = document.createElement('span')
                                hs.className = `tls ${h}`
                                hs.innerHTML = `${ens[h]}`
                                hs.style.border = '0.1px dotted white'
                                //hs.style.paddingRight = '0.2em'
                                tl.appendChild(hs)
                                tl.insertAdjacentText('beforeend', ' ')
                                spns.push(hs)
                            }
                            //this.modP.appendChild(e)
                            let ptxt = document.createElement('span')
                            ptxt.style.border = '1px solid rgb(120,120,120)'
                            if (isKana) {
                                ts = line
                            }
                            console.warn(ts);
                            for (let t of ts) {
                                let rub = document.createElement('ruby')
                                if (typeof t == 'object') {//parseInt(t[2]>=1)){
                                    t = t[0]
                                    en = ''
                                } else {
                                    en = await this.g(t, frm, 'en', ap)
                                    console.warn('TlAuto: ', en);
                                    //e = document.createElement('span')                                
                                }

                                rub.innerHTML = `<p>${t}</p><rt>${en}</rt>`
                                rub.style.paddingLeft = '0.32em'
                                rub.style.paddingRight = '0.32em'
                                rub.style.border = '1px dashed gray'
                                ptxt.appendChild(rub)
                                //this.modK.insertAdjacentHTML('beforeend', '<span> </span>')
                            }
                            tll.insertAdjacentElement('afterbegin', ptxt)
                        }
                    }
                } catch (error) {
                    console.log(error)
                }
            }
            var w = []
            let runner = async (sp, t, done, modP = this.modP) => {
                let emph = false
                let line = []
                let splL = t.length
                let p = []
                let c = done ? t : t.split('\n')
                let cc = c
                console.error("RunnerMode: ", sp, t, done, cc, modP);
                var ptxt = document.createElement('div')
                modP.appendChild(ptxt)
                ptxt.className = 'sentence'
                var Y = -1
                var lY = Y
                let iY = Y
                let ix = 0
                let ind = 0
                console.warn(cc.children);
                for (let ii in c) {
                    console.warn(c[ii]);
                    try {
                        if (ii >= 0) {
                            let tts = done ? '' : cc[ii]
                            let tt = done ? '' : cc[ii]
                            let il = tt.length
                            let lil
                            let tp = ''
                            if (done) {
                                try {
                                    Y = document.querySelector('[data-offset="54"]').getClientRects()[0].y
                                } catch (edr) {
                                    console.error(edr);
                                    Y = -2
                                }
                                let ciir = c[ii].querySelectorAll('.query-parser-segment-reading')
                                let ciit = c[ii].querySelectorAll('.query-parser-segment-text')
                                try {
                                    for (let tr in ciir) {
                                        if (ciir[tr].innerHTML) {
                                            tts += ciir[tr].innerHTML
                                        }
                                    }
                                } catch (e) { }
                                for (let tr in ciit) {
                                    if (ciit[tr].innerHTML) {
                                        tt += ciit[tr].innerHTML
                                    }
                                }
                                ind = parseInt(c[ii].getAttribute('data-offset'))
                                //let lind = parseInt(c[ii - 1].getAttribute('data-offset'))
                                console.log(`${parseInt(ii) + 1}/${cc.length}.  : `, ii, tt, tts, ix, ind)
                                //console.log(`${il} ${lil} ${tp} ${ix} ${spl[ix].length}`)
                            }
                            let isKana = japaneseUtil.isStringPartiallyJapanese(tt)
                            console.warn('running ', Y, iY, isKana, tt, tts, ind, tp, ii, cc[ii]);
                            if (Y != lY || !document.querySelector("#modK")) {
                                this.modK = document.createElement('div')
                                this.modK.id = 'modK'
                                this.modK.style.display = 'flex'
                                //this.modP.style.display = 'flex'
                                this.modT.style.display = 'flex'
                                this.modT.style.flexDirection = 'column';
                                //this.Mod.style.display = 'flex'
                                //this.modK.style.flex = '1 1 10%'
                                this.modK.style.flexWrap = 'wrap'
                                this.modK.style.alignItems = 'centet'
                                ptxt = document.createElement('div')
                                ptxt.className = 'sentence'
                                modP.appendChild(ptxt)
                                modP.appendChild(this.modK)
                            }
                            lY = Y
                            if (isKana) {
                                let sc = this.most.slice(0, this.known).includes(tt)
                                if (done && sc) {
                                    //c[ii].style.border = '3px dotted white'
                                    c[ii].style.borderBottom = '4px'
                                    c[ii].style.borderColor = 'rgb(170,255,170)'
                                }
                                let elem = document.createElement("div")
                                if (!(o('rd') || o('kan') || o('fq'))) {
                                    elem.classList.value = 'mns vis nav';
                                } else {
                                    elem.classList.value = 'mns vis';
                                }
                                elem.style.border = '1px solid gray'
                                elem.style.height = /*'20em'*/ this.limit
                                elem.style.width = this.wid
                                elem.style.flex = '15%'
                                let pl = document.querySelectorAll('.vis').length
                                elem.setAttribute('pos', `${pl}`)
                                const options = display.getOptionsContext();
                                let results = await this._display._findDictionaryEntries(false, tt, false, options)
                                console.warn(results, performance.now());
                                let yc = []
                                let bot = document.createElement('div')
                                var fq = -1
                                var fqs = []
                                let pn
                                console.warn(performance.now());
                                yc = await this.yomichan(results)
                                if (!done) {
                                    console.warn(yc, results, tt);
                                    return
                                }
                                bot = this.yomishow(yc, elem, fqs, fq, bot, '', 1)
                                elem.innerHTML = bot[3].innerHTML
                                //elem.appendChild(elem)
                                elem.appendChild(bot[0])

                                let hs = document.createElement('span')
                                hs.className = `words ${I}`
                                hs.setAttribute('i', I)
                                elem.classList.add(I)
                                elem.setAttribute('ind', I)
                                hs.innerHTML = `<ruby class="word">${tt}<rt class="reading">${tts}</rt></ruby>`;
                                hs.style.border = '0.2px dotted rgba(230,230,230)'
                                //hs.style.paddingRight = '0.2em'
                                ptxt.appendChild(hs)

                                var tit = elem.querySelector('entry-header')
                                //tit.className += 'tit'
                                try {
                                    console.warn(tit);
                                    elem.addEventListener("dblclick", function (ele) {
                                        if (!ele) var ele = window.event;
                                        ele.stopPropagation()
                                        console.dir(ele, ele.target)
                                        let elem = ele.target.closest('.mns')
                                        let ist = ele.target.closest('.title')
                                        if (elem.style.width != '') {
                                            elem.style.width = ''
                                            elem.style.height = ''
                                            elem.style.flex = ''
                                        } else {
                                            elem.style.height = localStorage.getItem('ht');;
                                            elem.style.width = localStorage.getItem('wt');;
                                            elem.style.flex = '15%'
                                        }
                                    }, false)
                                    elem.addEventListener("click", function (ele) {
                                        if (!ele) var ele = window.event;
                                        ele.stopPropagation()
                                        console.dir(ele, ele.target)
                                        let save = localStorage.getItem('save')
                                        let elem = ele.target.closest('.mns')
                                        let ist = ele.target.closest('.title')
                                        let b = document.querySelectorAll('.vis')
                                        pos = parseInt(elem.getAttribute('pos'))
                                        let ps = []
                                        posr = [pos, elem.style.border, ps]
                                        elem.style.border = '1px dotted red'
                                        if (!ist && !ele.button != 2) {
                                            return //auxclick\
                                        }
                                        if (ele.target.closest('.w')) {
                                            let x = ele.target.closest('.w')
                                            if (x.style.display === "none") {
                                                x.style.display = "block";
                                            } else {
                                                x.style.display = "none";
                                            }
                                            return
                                        }
                                        try {
                                            sv(elem)
                                        } catch (err) {
                                            console.error(err);
                                        }
                                        //elem = elem.parentElement
                                        if (elem.style.width != '') {
                                            elem.style.width = ''
                                            elem.style.height = ''
                                            elem.style.flex = ''
                                        } else {
                                            elem.style.height = localStorage.getItem('ht');;
                                            elem.style.width = localStorage.getItem('wt');;
                                            elem.style.flex = '15%'
                                        }
                                    }, false)
                                    //tit.innerHTML = `<div class="tit"><span class="kj">${tt}</span><span class="rd">${tts}</span><span id="particle" class="part" style="font-size: 1.25em;padding:0;margin:0;"></span></div>`
                                } catch (clrr) {
                                    console.error(clrr);
                                }
                                //elem.style.backgroundColor = 'red'
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
                                //hs.style.paddingRight = '0.2em'
                                ptxt.appendChild(hs)
                                try {
                                    if (!this.var('roma')) {
                                        document.querySelector(`[i="${I}"] .reading`).innerHTML = bot[2]
                                    }
                                    p.push(hs)
                                } catch (rer) {
                                    console.error(rer);
                                }
                                //ptxt.querySelector('rt').innerHTML += tts + ' '
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
                                    elem.style.fontWeight = 'bold' //border = '4px solid green'
                                    emph = false
                                }
                                if (!isKana && o('kan')) {
                                    elem.style.display = 'none'
                                }
                                elem.classList.value += 'mns';
                                if (isPart || (tt.length < this.min)) { //(!isKana && !o('rd')) || 
                                    let ttt = [tt, 8]
                                    line.push(ttt)
                                    elem.classList.value = 'mns';
                                    elem.style.display = 'none'
                                    let vis = document.querySelectorAll('.vis')
                                    let sat = (pi <= 4) ? Math.min(pi * 25, 100) : 50;
                                    pi *= 360 / this.part.length;
                                    console.warn(pi, this.part.length, elem, isKana, ii, tt, tts);
                                    vis[vis.length - 1].style.borderColor = `hsl(${pi} ${sat}%,50%)`
                                    //elem.querySelector('.entry-header')?.appendChild(elem.querySelector('.part'))?.parentElement.style.border = '2px solid purple'
                                    //vis[vis.length - 1].querySelector(/*above to here*/).insertAdjacentHTML('beforeend', `<div id="particle" class="part" style="font-size: 1.375em;padding:0;margin:0;">${tt}</div>`)
                                    // Select the entry header element
                                    let entryHeader = elem.querySelector('.entry-header');
                                    // Try inserting the HTML content before the end of the entry header
                                    try {
                                        entryHeader.insertAdjacentHTML('beforeend', `<div id="particle" class="part" style="font-size: 1.375em;padding:0;margin:0;border: 2px solid purple;">${tt}</div>`);
                                    } catch (error) {
                                        // Handle any errors that occur during the operation
                                        console.error('Error:', error);
                                    }
                                    //y.querySelector('.entry-header').innerHTML += tt
                                    if (tt == "は") { //emphatizes after
                                        emph = true
                                    }
                                    if (tt == "が") { //emphatizes before
                                        emph = false
                                        elem.style.fontWeight = 'bold' //border = '4px solid green'
                                    }
                                    let sc = this.most.slice(0, this.known).includes(tt)
                                    if (sc) {
                                        c[ii].style.color = 'rgb(170,255,170)'
                                    }
                                    //elem = document.querySelectorAll('.vis')[i]
                                    //ttt = .querySelector('dt').innerHTML.split(' ')
                                    //tts = mns[ii].parentElement.parentElement.children[0].children[0].innerText
                                    //console.warn(...w[ii])
                                } else {
                                    w.push(tt)
                                    line.push(tt)
                                    if (o('rd')) {
                                        hs.className = `words nav ${I}`
                                    }
                                    //let prnt = document.createElement("div")
                                    //let prnt = null

                                    //let st = await this.wkt(tt)
                                    //this.mod.innerHTML += st
                                    console.warn(il, splL, I)
                                    if (this.auto || (il < 5 && spl[0].length < 9)) {
                                        //sv(elem, 1, tt, spl[ii])
                                    }
                                    this.modK.appendChild(elem)
                                    if (o('yc')) {
                                        let fy = this.dictionary(isKana, elem, tt, results, tt, spl, tts, elem).catch(er => {
                                            console.log(er)
                                        })
                                        console.log(fy)
                                    }
                                }

                                //const makeNextPromise = (t) => async () 
                                //{
                                //return f
                                //}
                                //promiseChain = promiseChain.then(makeNextPromise(''))
                            } else {
                                //let prnt = document.createElement("div")
                                //let prnt = null

                                //let st = await this.wkt(tt)
                                //this.mod.innerHTML += st
                            }
                        }
                        //line.push(tt)
                        I += 1
                    } catch (error) {
                        console.log(error)
                    }
                    try {
                        if (this.lang == 'id' && I > 2) {
                            tt = display.fullQuery.toLocaleLowerCase()
                            var tls = this.modT.appendChild(document.createElement('div'))
                            tls.id = 'mtl'
                            var tll = tls.appendChild(document.createElement('div'))
                            let mk = tll.appendChild(document.createElement('span'))
                            mk.id = 'modK'
                            var tl = tls.appendChild(document.createElement('div'))
                            tls.className = 'tls'
                            tl.style.fontSize = '1.32em'
                            let frm = this.lang.length > 1 ? this.lang : undefined //null
                            let ts = tt.split(' ')
                            let en = await this.g(tt, frm, 'en', 0)
                            console.warn('TlAuto: ', en);
                            let e = document.createElement('h4')
                            //this.modP.appendChild(ptxt)

                            let ens = en.split(' ')
                            let ap = 0
                            let spns = []
                            for (let h in ens) {
                                let hs = document.createElement('span')
                                hs.className = `tls ${h}`
                                hs.innerHTML = `${ens[h]}`
                                hs.style.border = '0.1px dotted white'
                                //hs.style.paddingRight = '0.2em'
                                tl.appendChild(hs)
                                tl.insertAdjacentText('beforeend', ' ')
                                spns.push(hs)
                            }
                            //this.modP.appendChild(e)
                            let ptxt = document.createElement('span')
                            ptxt.style.border = '1px solid rgb(120,120,120)'
                            let isKana = japaneseUtil.isStringPartiallyJapanese(tt)
                            if (isKana) {
                                ts = line
                            }
                            console.warn(ts);
                            for (let t of ts) {
                                let rub = document.createElement('ruby')
                                if (typeof t == 'object') {//parseInt(t[2]>=1)){
                                    t = t[0]
                                    en = ''
                                } else {
                                    en = await this.g(t, frm, 'en', ap)
                                    console.warn('TlAuto: ', en);
                                    //e = document.createElement('span')                                
                                }

                                rub.innerHTML = `<p>${t}</p><rt>${en}</rt>`
                                rub.style.paddingLeft = '0.32em'
                                rub.style.paddingRight = '0.32em'
                                rub.style.border = '1px dashed gray'
                                ptxt.appendChild(rub)
                                //this.modK.insertAdjacentHTML('beforeend', '<span> </span>')
                            }
                            tll.insertAdjacentElement('afterbegin', ptxt)
                        }
                    } catch (error) {
                        console.log(error)
                    }
                }
            }
            