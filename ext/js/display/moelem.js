elem = document.createElement("div")
                                        si += tt.length
                                        elem.classList.value = clas;
                                        if (!(o('rd'))) {
                                        } else {
                                            //    elem.classList.value = 'mns vis nav';
                                        }
                                        elem.style.height = this.limit
                                        elem.style.flex = this.wid
                                        let pl = document.querySelectorAll('.vis').length
                                        elem.setAttribute('pos', `${pl}`)
                                        elem.setAttribute('w', tt)
                                        elem.innerHTML = `${mns[ii].innerHTML}`
                                        var tit = elem.querySelector('dt')
                                        tit.className = 'title'
                                        elem.insertAdjacentHTML('beforeend', `<span id="particle" class="part" style="font-size: 1.25em;padding:0;margin:0;"></span>`)
                                        let f = this.frequency(tt) ?? 0
                                        console.warn(f);
                                        try {
                                            console.warn(tit);
                                            elem.addEventListener("dblclick", function (ele) {
                                                if (!ele) var ele = window.event;
                                                ele.stopPropagation()
                                                console.dir(ele, ele.target)
                                                let elemc = ele.target.closest('.mns')
                                                let ist = ele.target.closest('.title')
                                                let fv = document.querySelector('.fav')
                                                if (fv) {
                                                    //fv.classList.remove('fav')
                                                    fv.style.flex = 'none'
                                                    fv.style.height = ''
                                                    fv.style.width = ''
                                                    fv.style.setProperty('--cc', 'orange');
                                                } else {

                                                }
                                                elemc.classList.add('fav')
                                                elemc.style.setProperty('--cc', 'gray');
                                                elemc.style.setProperty('--sz', '0.8em');

                                                if (elemc.style.height.length > 1) {
                                                    elemc.style.height = ''
                                                    elemc.style.flex = 'none'
                                                } else {
                                                    elemc.style.height = height
                                                    elemc.style.flex = width
                                                }
                                                console.warn(elemc, ist, fv, elem.style.height)
                                            }, false)
                                            elem.addEventListener("click", function (ele) {
                                                if (!ele) var ele = window.event;
                                                ele.stopPropagation()
                                                console.dir(ele, ele.target)
                                                let save = localStorage.getItem('save')
                                                let elemc = ele.target.closest('.mns')
                                                let ist = ele.target.closest('.title')
                                                let b = document.querySelectorAll('.vis')
                                                pos = parseInt(elemc.getAttribute('pos'))
                                                let ps = []
                                                posr = [pos, elemc, ps]
                                                console.warn(elemc, ist, pos, b)
                                                try {
                                                    document.querySelector('#cur').id = 'prev'
                                                } catch { }
                                                elemc.id = 'cur'
                                                //elem.style.border = '1px dotted red'
                                                if (!ist && !ele.button != 2) {
                                                    return
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
                                                    sv(elemc)
                                                } catch (err) {
                                                    console.error(err);
                                                }
                                                if (e.ctrlKey != true) {
                                                    return
                                                }
                                                if (elemc.style.height.length > 1) {
                                                    elemc.style.height = ''
                                                    elemc.style.flex = 'none'
                                                } else {
                                                    elemc.style.height = height
                                                    elemc.style.flex = width
                                                }
                                            }, false)
                                            //let r = this.reading(tt)
                                            tit.innerHTML = `<div class="tit"><span class="kj">${tt}</span><span class="rd">${tts}</span><span class="fq">${f}</span></div>`
                                        } catch (clrr) {
                                            console.error(clrr);
                                        }
                                        let RGEX_CHINESE = new RegExp(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/);
                                        let kji = RGEX_CHINESE.test(tt);
                                        let isKana = o('kan') == true && kji == true ? true : false
                                        let ptc = false
                                        /*let hs = document.createElement('span')
                                        hs.className = `words ${I}`
                                        hs.setAttribute('i', I)
                                        elem.classList.add(I)
                                        elem.setAttribute('ind', I)
                                        hs.innerHTML = `<ruby class="word">${tt}<rt class="reading">${tts}</rt></ruby>`;
                                        hs.style.border = ''
                                        ptxt.appendChild(hs)
                                        p.push(hs)
                                        */
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
                                        tt = elem.getAttribute('w')
                                        const searchString = tt; // Replace 'substring' with your desired substring
                                        let replacement = `<span class="words" i="${I}"><ruby class="word">${searchString}<rt class="reading">${tts}</rt></ruby></span>`;

                                        try {
                                            let ltpChildren = Array.from(ltp.childNodes);

                                            if (ltpChildren.length === 0) {
                                                // If the 'ltp' element has no child elements (only text content)
                                                ltp.innerHTML = replacement;
                                            } else {
                                                // If the 'ltp' element has child elements
                                                let firstChild = ltpChildren[0];
                                                let firstChildText = firstChild.innerHTML;

                                                // Create a regular expression pattern to match text outside HTML tags
                                                let pattern = new RegExp(`[^<>]*(${searchString})[^<>]*`, 'g');

                                                // Use the replace() method with the regular expression pattern
                                                let replacedText = firstChildText.replace(pattern, (match) => {
                                                    // Replace the matched text with the replacement string wrapped in a span element
                                                    return match.replace(searchString, `<span>${replacement}</span>`);
                                                });

                                                firstChild.innerHTML = replacedText;
                                            }
                                        } catch (error) {
                                            console.error('An error occurred:', error);
                                        }
                                        if (emph) {
                                            elem.style.fontWeight = 'bold'
                                            emph = false
                                        }
                                        if ((f != -1 && f < this.fval) || !isKana && o('kan')) {
                                            elem.style.display = 'none'
                                            elem.classList.value = 'mns';
                                        }
                                        if ((f < this.fval && false) || (isPart && ii > 0) || (tt.length < this.min)) {
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
                                            if (tt == "は") {
                                                emph = true
                                            }
                                            if (tt == "が") {
                                                emph = false
                                                elem.style.fontWeight = 'bold'
                                            }
                                            document.querySelector(`[i="${I}"] .reading`).innerHTML = ''
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
                                        }
                                        console.warn(il, splL, I, o('yc'), o('aut'))
                                        if ((o('auto') && !o('yc') && !o('kand')) || (il < 5 && splL < 3)) {
                                            sv(elem, 1, tt, spl[ii])
                                        }
                                        this.modK.appendChild(elem)
                                        if (!this.slow || o('fq') || (o('yc') && !o('kand'))) {
                                            let fx = this.dictionary(isKana, elem, tt, 0, tt, spl, tts, elem).then(async () => {
                                                if (o('auto')) {
                                                    await sv(elem, -1)
                                                }
                                            })
                                        }   