const update = async (q) => {
                    //this._copyText(989);
                    //  console.dir(fy)
                    console.warn(q);
                    if (fy) {
                        fy = false
                        nSizes()
                        //await invoke('createDeck', 6, {deck: 'test1'});
                        decks = await api('deckNames', 6);
                        console.log(`got list of decks: ${decks}`);

                        this.kanji = ''//await this.web('chrome-extension://ihneooeljjglhlfbnkflakdikdlncfao/kanji.html')
                        h.innerHTML += '</br><div class="kjd">' + this.kanji + '</div>'
                        let lu = h.querySelectorAll('.kjd')
                        lu = lu[lu.length - 1]
                        //pw.querySelectorAll('.w')[pw.querySelectorAll('.w').length-1].innerHTML += lu
                        let c = []//lu.querySelectorAll('div>h1>span.kanji_character')
                        this.c = c
                        console.dir(c)
                    }
                    if (run) {
                        this.frst = ft
                        this.lang = localStorage.getItem('lng')
                        this.kan = kan
                        this.pe = pt
                        let loop = false
                        let prog = document.getElementById('progress-indicator')
                        //console.log(prog.getAttribute('data-active'), this.lq, this.w2(), this.w3())
                        //this.frst = false
                        if (document.getElementById('progress-indicator').getAttribute('data-active') == 'true') {
                            this.frst = true
                            loop = true
                            //while()
                            //await new Promise(r => setTimeout(r, 500));
                        }
                        if (this.w2()) {
                            this.frst = true
                            ft = true
                        }
                        //console.log(this.w3(), this.w2(), this.w(),ft)
                        let fq
                        if (this.search) {
                            fq = display.fullQuery
                        } else {
                            fq = this.v
                        }
                        //console.warn(fq.length, this.lq, this.frst, this.w3());
                        if (fq.length > 0 && ((fq != this.lq) || (this.frst && this.w3() == false))) {
                            this.lq = q
                            try {
                                if (o('del')) {
                                    document.querySelector('#modP').remove()
                                    document.querySelector('#mod').remove()
                                    //document.querySelector('def').remove()
                                }
                            } catch { }
                            //run = false
                            this.frst = false
                            ft = false
                            //this.start = false
                            istart = -1
                            spl = display.fullQuery.split('\n')//.filter(item=>item);
                            spl = [spl]
                            let ppp = this.startMod()
                            if (s1) {
                                let aff = display.fullQuery.split('\n')
                                sgroup = this.groupByN(prt, aff, istart)
                                s1 = false
                            }
                            if (mode >= 50 && o('slw')) {
                                //document.querySelector(".content-body-inner").innerHTML += this._display.fullQuery
                                this.read = false
                                //istart = 0
                                if (this.search) {
                                    txt = this._display.fullQuery
                                } else {
                                    txt = this.v
                                }
                                //let mode = 'lyrics'
                                console.error(spl, sgroup, istart);
                                if (o('kand')) {
                                    istart = 0
                                    //spl = sgroup
                                    await yomi(sgroup[istart], istart)
                                } else {
                                    await yomi(spl[istart + 1], istart + 1)
                                }
                            } else {
                                await yomi(spl, 0, false)
                            }
                            //run = true
                            if (loop) {
                                //location.reload()
                            }
                            this.start = true
                        }
                    }
                }