/* global
 * AnkiNoteBuilder
 * AnkiUtil
 * PopupMenu
 */
function merge(local = null, jpws = null, rev = -1) {
    if (!local) {
        local = localStorage.getItem('local') ?? ''
        local = local.split(' ')
    }
    if (!jpws) {
        jpws = localStorage.getItem('jpmns') ?? ''
        jpws = jpws.split(' ')
    }
    console.log(local, jpws, rev)
    // Merge arrays
    let intersection = jpws.filter(word => local.includes(word));
    // Get the difference between local and jpws
    let localMinusJpws = local.filter(word => !jpws.includes(word));
    let jpwsMinusLocal = jpws.filter(word => !local.includes(word));
    localStorage.setItem('local', localMinusJpws.join(' '))
    localStorage.setItem('jpmn', jpwsMinusLocal.join(' '))
    localStorage.setItem('both', intersection.join(' '))
    // Remove duplicates (remove first occurrence)
    let uni
    if (rev == 1) {
        uni = [...localMinusJpws, ...intersection, ...jpwsMinusLocal]
    } else if (rev == 0) {
        uni = jpws
    } else {
        uni = [...jpwsMinusLocal, ...intersection, ...localMinusJpws]
    }
    var union = Array.from(new Set(uni));
    console.dir([local, jpws, intersection, localMinusJpws, jpwsMinusLocal, union]);
    return union.join(' ')
}
function api(action, version = 6, params = {}) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.addEventListener('error', () => reject('failed to issue request'));
        xhr.addEventListener('load', () => {
            try {
                const response = JSON.parse(xhr.responseText);
                if (Object.getOwnPropertyNames(response).length != 2) {
                    throw 'response has an unexpected number of fields';
                }
                if (!response.hasOwnProperty('error')) {
                    throw 'response is missing required error field';
                }
                if (!response.hasOwnProperty('result')) {
                    throw 'response is missing required result field';
                }
                if (response.error) {
                    throw response.error;
                }
                resolve(response.result);
            } catch (e) {
                reject(e);
            }
        });

        xhr.open('POST', 'http://127.0.0.1:8765');
        xhr.send(JSON.stringify({ action, version, params }));
    });
}
// Example function to get note content by note ID
async function aId(noteId) {
    try {
        const notes = await api('notesInfo', 6, { notes: [noteId] });
        if (notes.length > 0) {
            const note = notes[0];
            const fields = note.fields;
            console.log(fields); // Process or display the note content
        } else {
            console.log('Note not found');
        }
    } catch (error) {
        console.error(error); // Handle any errors that occurred during the API call
    }
}
// Example function to retrieve notes by tag
async function iTag(tag) {
    try {
        const notes = await api('findNotes', 6, { query: `tag:${tag}` });
        notes = aId(notes)
        console.log(notes); // Process or display the retrieved notes
        return notes
    } catch (error) {
        console.error(error); // Handle any errors that occurred during the API call
    }
}

// Example function to retrieve notes by deck
async function iDeck(deckName) {
    try {
        const notes = await api('findNotes', 6, { query: `deck:"${deckName}"` });
        console.log(notes); // Process or display the retrieved notes
    } catch (error) {
        console.error(error); // Handle any errors that occurred during the API call
    }
}
// Example function to retrieve notes by deck and get note ID and information
async function aDeck(deckName, sort = false) {
    let r = true
    while (r) {
        try {
            const deckNotes = await api('findNotes', 6, { query: `deck:"${deckName}"` });
            const notes = await api('notesInfo', 6, { notes: deckNotes });
            const date = await api("cardsModTime", 6, { cards: deckNotes });

            const res = {
                ids: deckNotes,
                mod: date,
                dates: deckNotes.map(timestamp => new Date(timestamp)),
                notes
            };

            if (sort === 'asc') {
                sortArrays(res, 'asc');
            } else if (sort === 'desc') {
                sortArrays(res, 'desc');
            }
            r = false
            return res;
        } catch (error) {
            console.error(error);
        }
    }
}

async function aTag(tag, sort = false) {
    let r = true
    while (r) {
        try {
            const tagNotes = await api('findNotes', 6, { query: `tag:${tag}` });
            const notes = await api('notesInfo', 6, { notes: tagNotes });
            const date = await api("cardsModTime", 6, { cards: tagNotes });

            const res = {
                ids: tagNotes,
                mod: date,
                dates: tagNotes.map(timestamp => new Date(timestamp)),
                notes
            };

            if (sort === 'asc') {
                sortArrays(res, 'asc');
            } else if (sort === 'desc') {
                sortArrays(res, 'desc');
            }

            return res;
        } catch (error) {
            console.error(error);
        }
    }
}

async function aModel(m, sort = false) {
    let r = true
    while (r) {
        try {
            const mNotes = await api('findNotes', 6, { query: `note:"${m}"` });
            const notes = await api('notesInfo', 6, { notes: mNotes });
            const date = await api("cardsModTime", 6, { cards: mNotes });

            const res = {
                ids: mNotes,
                mod: date,
                dates: mNotes.map(timestamp => new Date(timestamp)),
                notes
            };

            if (sort === 'asc') {
                sortArrays(res, 'asc');
            } else if (sort === 'desc') {
                sortArrays(res, 'desc');
            }

            return res;
        } catch (error) {
            console.error(error);
        }
    }
}
function sort_by_property(list, property_name_list) {
    list.sort((a, b) => {
        for (var p = 0; p < property_name_list.length; p++) {
            const prop = property_name_list[p];
            if (a[prop] < b[prop]) {
                return -1;
            } else if (a[prop] > b[prop]) {
                return 1;
            }
        }
        return 0;
    });
}

function sortArrays(res, order) {
    const { ids, mod, dates, notes } = res;
    const properties = ['ids', 'mod', 'dates', 'notes'];

    if (order === 'asc') {
        sort_by_property(properties.map(prop => res[prop]), properties);
    } else if (order === 'desc') {
        sort_by_property(properties.map(prop => res[prop]), properties.reverse());
    }
}

function getWords(notes) {
    const words = [];

    for (const note of notes) {
        const wordField = note.fields.Word;
        if (wordField && wordField.value) {
            words.push(wordField.value);
        }
    }

    return words;
}
function getFields(params, fieldName) {
    const fieldValues = [];

    for (const note of params.notes) {
        const fieldValue = note.fields[fieldName];
        if (fieldValue && fieldValue.value) {
            fieldValues.push(fieldValue.value);
        }
    }

    return fieldValues;
}
class Note {
    constructor(u = null, dict = null, anki = null) {
        this.dic = u
        this.aDict = dict;
        this.anki = anki;
    }
    async addAnki(dic, kanji = '', kana = '', q = 1, i = 0) {
        try {
            const req = [
                {
                    "type": "clipboardImage"
                },
                {
                    "type": "textFurigana",
                    "text": `${kana}${kanji}Words — ${q} found`,
                    "readingMode": null
                },
                {
                    "type": "screenshot"
                },
                {
                    "type": "audio"
                },
                {
                    "type": "clipboardText"
                }
            ];

            const mode = "term-kanji";

            console.log(mode, req, dic, q); // Output: "term-kanji"
            // Call the addAnkiNote function
            await this.dic.anki._addAnkiNote(dic[i], mode, q, req);
        } catch (error) {
            console.error(error);
        }
    }
    async create(
        word,
        sentence,
        definition = '',
        frequencies = [],
        frequencyMedian = 0,
        tags = [],
        audio = [],
        html = '',
        image = [],
        timestamp = Date.now(),
        time = new Date(),
        status = 'new',
        flagNumber = 0,
        id = Math.floor(Math.random() * 1000),
        clip = '',
        definitions = [],
        reading = '',
        sentenceReading = '',
        hint = '',
        pitch = '',
        extra = null,
        pitchPos = [],
        dicts = [],
        otherSentences = [],
        type = '',
        learning = 1,
        known = 0,
        size = 0,
        wordLength = 0,
        occurrences = 1,
        chars = [],
        alternatives = [],
        synonyms = [],
        antonyms = [],
        urlLoc = document.URL,
        day = 0,
        options = [],
        seen = true,
        temp = false,
        isAnki = false,
        hasSAudio = false,
        hasWAudio = false,
        hasImages = false,
        moe = false,
        comment = '',
        prev = '',
        clips = [],
        info = {},
        notes = [],
        anki = {},
        ankiId = -1
    ) {
        try {
            const obj = {
                word: word,
                sentence: sentence,
                definition: definition,
                frequencies: frequencies,
                frequencyMedian: frequencyMedian,
                tags: tags,
                url: document.URL,
                clipboard: clip,
                audio: audio,
                html: html,
                image: image,
                timestamp: timestamp,
                time: time,
                status: status,
                flagNumber: flagNumber,
                id: id,
                definitions: definitions,
                reading: reading,
                sentenceReading: sentenceReading,
                hint: hint,
                pitch: pitch,
                extra: extra,
                pitchPos: pitchPos,
                dicts: dicts,
                otherSentences: otherSentences,
                type: type,
                learning: learning,
                known: known,
                size: size,
                wordLength: wordLength,
                occurrences: occurrences,
                chars: chars,
                alternatives: alternatives,
                synonyms: synonyms,
                antonyms: antonyms,
                urlLoc: urlLoc,
                day: day,
                options: options,
                seen: seen,
                temp: temp,
                isAnki: isAnki,
                hasSAudio: hasSAudio,
                hasWAudio: hasWAudio,
                hasImages: hasImages,
                moe: moe,
                comment: comment,
                prev: prev,
                clips: clips,
                info: info,
                notes: notes,
                anki: anki,
                ankiId: ankiId
            };

            const result = {
                id,
                word,
                sentence,
                definition,
                frequencies,
                frequency_median: frequencyMedian,
                tags,
                url: urlLoc,
                clipboard: clip,
                audio,
                html,
                image,
                timestamp: timestamp.toString(),
                time: time.toISOString(),
                status,
                flag_number: flagNumber,
                definitions,
                reading,
                sentence_reading: sentenceReading,
                hint,
                pitch,
                extra,
                pitch_pos: pitchPos,
                dicts,
                other_sentences: otherSentences,
                type,
                learning,
                known,
                size,
                word_length: wordLength,
                occurrences,
                chars,
                alternatives,
                synonyms,
                antonyms,
                url_loc: urlLoc.substring(0, 19),
                day,
                options,
                seen,
                temp,
                is_anki: isAnki,
                has_s_audio: hasSAudio,
                has_w_audio: hasWAudio,
                has_images: hasImages,
                moe,
                comment,
                prev,
                clips,
                info,
                notes,
                anki,
                anki_id: ankiId
            };
            console.log(result, ' Added values:', obj);
            try {
                // Send a POST request to the API endpoint
                const response = await fetch('http://localhost:3000/api/word', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(result)
                });
                console.warn("PostgresSQL DB ", response)
                if (response.ok) {
                    // Word added successfully
                    const wordObject = await response.json();
                    console.log('Word created:', wordObject);
                } else {
                    // Error adding word
                    console.error('Failed to create word:', response.status);
                }
            } catch (serr) {
                console.error(serr)
            }
            return obj;
        } catch (error) {
            console.error('An error occurred:', error);
            return {};
        }
    }
    async getFileContents() {
        try {
            const response = await fetch('save.json');
            const contents = await response.json();
            return contents;
        } catch (error) {
            console.error('An error occurred:', error);
            return null;
        }
    }

    async setFileContents(jsonData) {
        try {
            const opts = {
                create: true,
                exclusive: false,
                suggestedName: 'save.json',
                types: [
                    {
                        description: 'JSON Files',
                        accept: {
                            'application/json': ['.json'],
                        },
                    },
                ],
            };
            const fileHandle = await window.showSaveFilePicker(opts);
            console.dir(fileHandle);
            console.warn(fileHandle);
            const writable = await fileHandle.createWritable();
            console.warn(writable);
            await writable.write("write", jsonData);
            await writable.close();
        } catch (error) {
            console.error('An error occurred:', error);
        }
    }
    async saveAdd(cx = 0, t, txt, def = '', fq = [], tags = [], html = '', moe = false, audio = [], image = [], clip = '', yc = false, read = '') {
        let sz = ''
        try {
            const log = {
                dict: this.dic,
                t: t,
                txt: txt,
                def: def,
                fq: fq,
                tags: tags,
                html: html,
                moe: moe,
                audio: audio,
                image: image,
                clip: clip,
                yc: yc,
                read: read,
                cx: cx,
                noteEnv: this
            };
            console.dir(log)
        } catch (ler) {
            console.error(ler);
        }
        try {
            const note = new Note(this.dic);
            let bk = localStorage.getItem('wordbk');
            let bks = localStorage.getItem('wordsetbk');
            if (!bk) {
                bk = '';
                bks = '';
            }
            let storedDay = parseInt(localStorage.getItem('day'));
            let day = isNaN(storedDay) ? 0 : storedDay;

            let d = new Date();
            let currentDate = d.getDate();
            let flag = currentDate !== day ? 1 : 0;

            if (flag === 1) {
                let dateString = `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}-${d.getHours()}:${d.getMinutes()}`;
                try {
                    localStorage.setItem('day', currentDate);
                    localStorage.setItem('wordbk', `${bk}\n${dateString}: `);
                    if (bks) {
                        localStorage.setItem('wordsetbk', `${bks}\n${dateString}: `);
                    } else {
                        localStorage.setItem('wordsetbk', `${dateString}: `);
                    }
                } catch (error) {
                    console.error("Error updating localStorage:", error);
                }
            }

            bk = localStorage.getItem('wordbk') || '';
            bks = localStorage.getItem('wordsetbk') || '';
            let bs = bk.split(' ');
            console.log(bs, bk, t);
            let art = bs;
            let uniqueArray = [...new Set(art)];
            let wrd = uniqueArray.join(' ');
            console.log(wrd);
            bks = `${bks}|_|___|_|${t}:${txt}`;

            // Limit bks to 100 characters
            if (bks.length > 100) {
                bks = bks.substring(0, 100);
            }
            bs.push(t);
            try {
                localStorage.setItem('wordbk', bs.join(' ') + ' ');
                localStorage.setItem('wordsetbk', bks);
            } catch (error) {
                console.error("Error updating localStorage:", error);
            }

            sz = wrd
            var iCur = parseInt(localStorage.getItem('cur'));
            iCur += 1
            const existingContents = localStorage.getItem('save')//await note.getFileContents();
            console.warn([t, txt, def, fq, tags, html, moe, audio, image, clip])
            let save
            try {
                var results = existingContents ?? (true || null);
                console.warn(existingContents);
                save = JSON.parse(existingContents)
            } catch {
                save = null
                localStorage.setItem('savebk', existingContents)
                localStorage.setItem('save', '')
            }
            // Nullish Coalescing Operator (??)
            // This operator returns the first operand if it is not null or undefined. 
            // Otherwise, it returns the second operand.
            const s = save ?? { 'data': [] };
            // Optional Chaining Operator (?.)
            // This operator allows you to read the value of a property located deep within a chain of connected objects 
            // without having to check that each reference in the chain is valid.
            //   let result = note?.get();
            // Optional Chaining Operator (?.)
            // Here it is used to access the 'data' property of 's'. If 's' is null or undefined, 'data1' will be undefined.
            let data = s?.data;
            // Ternary Operator (?:)
            // This operator takes three operands: a condition followed by a question mark (?), 
            // then an expression to execute if the condition is truthy followed by a colon (:), 
            // and finally the expression to execute if the condition is falsy.
            //let data2 = s.text ?? ''; //let data2 = s.text ? s.text : '';

            let word = localStorage.getItem('words').replace(/(\d{1,2}-\d{1,2}-\d{4}-\d{1,2}:\d{1,2}: )|(\w{3} \w{3} \d{2} \d{4} \d{2}:\d{2}:\d{2} \w{3}-\d{4} \(\w{3}\))/g, '');;
            //note.setFileContents({ day: date.toString(), lastAccess: d, words: t, sentences: txt, html: html });
            let isDuplicate = false;
            if (save) {
                for (let i = 0; i < save.length; i++) {
                    if (save[i]/*.word*/ === t) {
                        isDuplicate = true;
                        break;
                    }
                }
            }
            let ww = word.split(' ')
            var isStringInSet = ww.includes(t);

            let saveDiv = document.querySelector('.save');
            if (isStringInSet && cx >= 0) {
                var bsWithoutString = ww.filter(function (element) {
                    return element !== t;
                });
                ww = bsWithoutString
                ww.push(t)
                localStorage.setItem('words', ww.join(' '))
                note.svDiv(saveDiv, ww.join(' '), flag)
                return isStringInSet;
            } else if (cx < 0) {
                let b = localStorage.getItem('exp') ?? ''
                b = b.split(' ')
                isStringInSet = b.includes(t)
                if (isStringInSet) {
                    return
                } else {
                    b.push(t)
                    localStorage.setItem('exp', b.join(' '))
                }
            } else if (!isStringInSet) {
                let fm = fq.reduce((a, b) => a + b, 0)
                fm /= fq.length
                let o = await note.create(
                    t,
                    txt,
                    def,
                    fq,
                    fm,
                    tags,
                    audio,
                    html,
                    image,
                    undefined,
                    undefined,
                    undefined,
                    cx,
                    undefined,
                    clip,
                    [def],
                    read,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    cx > 0 ? true : false,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined
                );
                // Rest of your code

                let dat = { data, [t]: o };
                let json = { data: dat, day: currentDate.toString(), lastAccess: d, words: wrd, sentences: bks, html: html, len: iCur }
                console.warn(data, json);
                //await note.setFileContents(json)
                //set(data);
                let ws = word ? word.split(' ') : [];
                ws.push(t);
                const filteredArray = [...new Set(ws)];
                word = filteredArray.join(' ');
                console.log(word);
                localStorage.setItem('words', word);
                sz = `<h3>${word}</h3>`;
                console.warn(o, save);
                //localStorage.setItem('save', JSON.stringify(json));
                if (yc == true) {
                    const options = this.dic.display.getOptionsContext();
                    console.warn(options, yc, read);
                    let ycP = this.dic.display._findDictionaryEntries(false, t, false, options).then(function (entries) {
                        console.warn('toanki---', entries);
                        note.addAnki(entries, t, read, entries.length)
                    }).catch(function (errc) {
                        console.error(errc);
                    })
                }
                note.svDiv(saveDiv, word, flag)
            } else {
                console.warn(`${t} already exists`);
            }
        } catch (e) {
            console.error(e);
        }
    }
    svDiv(saveDiv, sz = null, flag = '', m = false) {
        if (!sz) {
            sz = localStorage.getItem('words') ?? ""
        }
        if (!m) {
            sz = merge(sz.split(' '))
        }
        saveDiv.innerHTML = ` ${localStorage.getItem('wordbk')}`;
        let s3 = saveDiv.appendChild(document.createElement('div'))
        s3.className = 'w'
        if (saveDiv) {
            let wordsOnly = sz.replace(/(\d{1,2}-\d{1,2}-\d{4}-\d{1,2}:\d{1,2}: )|(\w{3} \w{3} \d{2} \d{4} \d{2}:\d{2}:\d{2} \w{3}-\d{4} \(\w{3}\))/g, '');
            s3.innerHTML = wordsOnly.split(' ').join(' ');
        } else {
            console.error("Could not find element with class 'save'.");
        }
    }
    async svClk(elem, cx = 0, tw = '', tx = '', yc = null, clip = '', img = [], snd = []) {
        let fq = []
        let df = ''
        let ht = elem?.innerHTML
        const tag = ['aDict', `v0.1-${new Date().toISOString().slice(0, 7)}`];
        console.log(elem, tag.join(', '));
        if (cx < 0) {
            await new Promise(r => setTimeout(r, 3000));
        }
        try {
            if (img == []) {
                img = this.dic.main.txtImg(true)
            }
            if (clip == '') {
                clip = this.dic.main.getText()
            }
            console.dir([img, clip]);
        } catch (ser) {
            console.error(ser);
        }
        let kj = elem.querySelector('.yomi')// ? document.querySelector("span.kj") : 
        df = kj ? elem.querySelector('.yomi .entry-body ul:nth-child(1) > li') : elem.querySelector('ol > li > span.gloss-desc')
        if (df) {
            df = df.innerText
        }
        let I = parseInt(elem.getAttribute('ind'))
        let rd = document.querySelector(`[i="${I}"] .reading`)
        if (rd) {
            rd = rd.innerText
        }
        let fv = document.querySelector('.fav')
        if (fv) {
            //fv.classList.remove('fav')
            fv.style.flex = 'none'
            fv.style.height = ''
            fv.style.width = ''
            fv.style.setProperty('--cc', 'blue');
        } else {

        }
        elem.classList.add('fav')
        const note = new Note(this.dic); // Create an instance of the Note class
        if (cx <= 0) {
            let k = elem.querySelector(".kj")
            console.warn(k.innerHTML);                                       //console.dir(kj)
            console.warn(kj, I, df, rd);
            let xt = elem.parentElement.getAttribute('txt')
            if (kj) {
                try {
                    //elem.style.fontSize = '1.2em'
                    let fs = elem.querySelectorAll('.frequency-value')
                    for (let f of fs) {
                        fq.push(parseInt(f.innerText))
                    }
                } catch { }
                df = elem.querySelector('li').innerText
                //let cpn = document.createElement('div')
                let en = elem.querySelector('.headword-text-container').cloneNode(true)
                //en = y.cloneNode()
                //en.querySelector('rt').remove()
                //cpn.appendChild(en)
                //cpn.querySelector('rt').remove()
                for (let r of en.querySelectorAll('rt')) {
                    r.remove()
                }

                en.querySelector('.headword-reading').remove()
                let rs = en.querySelectorAll('rt')
                for (let rr of rs) {
                    rr.remove()
                }
                console.warn(en.innerHTML);
                en = en.innerText || en.textContent;
                console.log(en);
                let wn = elem.getAttribute('w') ?? en
                //rd = elem.querySelector('rt')
                //en = cpn.innerText
                //
                //async saveAdd(t, txt, def = '', fq = [], tags = [], html = '', moe = false, audio = [], image = [], clip = '', yc = null) {
                await note.saveAdd(cx, wn, xt, df, fq, tag, ht, false, snd, img, clip, true, rd)//localStorage.setItem('save', `${save} ${en}`)
            } else {
                try {
                    df += elem.querySelector('dt').innerText
                } catch { }
                await note.saveAdd(cx, k.innerText, xt, df, undefined, tag, ht, true, snd, img, clip, true, rd) //localStorage.setItem('save', `${save} ${k.innerHTML}`)
            }
        } else {
            try {
                df += elem.querySelector('dt').innerText
            } catch { }
            await note.saveAdd(cx, tw, tx, df, undefined, tag, ht, true, snd, img, clip, undefined, rd)
        }
    }
    displayObjectInHTML(obj, bo, fc) {
        // Create a container element
        const container = document.createElement('div');
        container.className = 'saved'; // Add the 'savd' class for styling (assuming it's defined in your CSS)
        // Iterate over the object properties
        for (const [key, value] of Object.entries(obj)) {
            // Create an item element for each property
            const item = document.createElement('div');
            item.className = 'item'; // Add a class for styling (assuming it's defined in your CSS)

            // Create a title element for the property key
            const title = document.createElement('h3');
            title.textContent = key;
            item.appendChild(title);


            if (typeof value === 'object' && value !== null) {
                const nestedContainer = document.createElement('div');
                nestedContainer.innerHTML = value[0]
                item.appendChild(nestedContainer);
            } else {
                const content = document.createElement('p');
                content.textContent = value;
                item.appendChild(content);
            }

            // Append the item to the container
            container.appendChild(item);
        }

        // Append the container to the document body
        bo.appendChild(container);
    }
}
class Dict {
    constructor(display = null, audio = null, japaneseUtil = null, anki = null, control = null, mecab = null) {
        this.search = display !== null
        this.anki = anki

        // Set up the AnkiConnect server and enable the connection
        //api.server = 'http://localhost:8765';
        //api.enabled = true;
        this.control = control
        this.conn = control?._ankiConnect
        this.mecab = mecab
        var util = {
            main: this,
            display,
            audio,
            anki,
            control,
            mecab
        }
        mecab?.setEnabled(true);
        async function fMecab(text) {
            // Parse the text using MeCab
            const parseResults = await mecab.parseText(text);

            // Count the frequency of each word
            const wordFrequency = {};
            parseResults.forEach(result => {
                result.lines.forEach(line => {
                    line.forEach(term => {
                        const word = term.term;
                        if (word in wordFrequency) {
                            wordFrequency[word]++;
                        } else {
                            wordFrequency[word] = 1;
                        }
                    });
                });
            });

            return wordFrequency;
        }
        // Usage examples
        //api[1]._testAnkiNoteViewer('term')

        //getNotesByDeck('Anm');
        //getNotesByTag('jp2');

        // Accessing the JSON data
        var jpdb = []
        this.jpdb = []
        fetch("jpdb.json")
            .then(response => response.json())
            .then(jsonData => {
                // Use the jsonData object here
                jpdb = jsonData
                this.jpdb = jpdb
                console.log('jpdb---------', jsonData, jpdb);
            })
            .catch(error => {
                console.error("Error fetching JSON:", error);
            });
        this.util = util
        let tx
        let V
        var main = {}
        this.lmt = performance.memory.jsHeapSizeLimit * 75 / 100;
        var nv = true
        var prev
        this.first = true
        this.save = []
        this.stop = false
        var clas = `mns vis nav`
        this.fval = parseInt(localStorage.getItem('freq'))
        var o = this.var
        var height
        var width
        var nSizes = (w = 1.2, h = 1.4) => {
            this.limit = localStorage.getItem('ht');
            this.wid = localStorage.getItem('wt');
            if (o('yc')) {
                this.limit = `${parseInt(this.limit.substring(0, this.limit.length - 2)) * h}em`
                this.wid = `${parseInt(this.wid.substring(0, this.wid.length - 1)) * w}%`
            }
            height = this.limit
            width = this.wid
            console.warn(width, height);
        }

        this.aut = localStorage.getItem('auto') == 'true';
        let aut = this.aut
        let rr = document.querySelector('.search-option-pre-label')
        if (rr) {
            rr.textContent += ' |Enable|'
            rr.onclick = (e) => {
                e.stopPropagation()
                localStorage.setItem('run', true)
                location.reload()
            }
        }
        if (!o('run')) {
            return
        }
        const note = new Note(util, this, anki); // Create an instance of the Note class
        var sv = note.svClk.bind(note)
        var prt = 8
        this.part = prt

        var decks
        var def = aDeck('Def', 'asc')
        var anm = aDeck('Anm', 'asc')
        var jp2 = aTag('jp2', 'asc')
        var pop = aTag('inPopup', 'asc')
        var jpmn = aModel('JP Mining Note', 'asc')
        var jpws = []
        var anms = []
        var pops = []
        // Open a database connection
        /*
        this.txtImg(true)
  .then((image) => {
    console.log('Image:', image);
  })
  .catch((error) => {
    console.error('Error retrieving image:', error);
  });

this.txtImg(false)
  .then((text) => {
    console.log('Text:', text);
  })
  .catch((error) => {
    console.error('Error retrieving text:', error);
  });*/
        console.log('aDict: ', [display, audio, japaneseUtil, anki])

        //var sv = this.saveAdd
        //navigator.clipboard.writeText(this.search);
        //        this._copyText(989);
        if (this.search) {
            this.search = display._pageType == "search"
            this.page = display._pageType == "search"
            this.hist = [this.get('hist')]
            this.v = display.fullQuery
            V = this.v
            this.hist.push(V)
            localStorage.setItem('hist', this.hist);
            this.g(this.v, 'auto', 'ru', 1).then((lp) => {
                console.warn('lllllll', lp);
                this.langg = lp.substring(lp.length - 4)
                console.warn(this.langg);
            })
        } else {
            this.page = true
            this.hist = [this.get('history')]
            tx = document.getElementById("search-textbox")
            console.log(tx)
            tx.onkeyup = (e) => {
                console.log(e, document.querySelector('#search-textbox').value)
                localStorage.setItem(document.querySelector('#search-textbox').id, document.querySelector('#search-textbox').value);
            }
            tx.onchange = (e) => {
                console.log(e, document.querySelector('#search-textbox').value)
                localStorage.setItem(document.querySelector('#search-textbox').id, document.querySelector('#search-textbox').value);
            }
            tx.value = this.get(tx.id)
            this.v = this.get(tx.id)
            V = this.v
            this.hist.push(V)
            localStorage.setItem('history', this.hist);
        }
        this._display = display;
        this.most = ['の', 'に', 'は', 'て', 'を', 'が', 'だ', 'た', 'する', 'と', 'ます', 'で', 'ない', 'いる', 'も', 'ある', '・', 'です', '「', '」', 'こと', 'e', 'か', 'o', 'a', 't', 'なる', 'れる', 'から', '）', '（', 'i', 'n', 'r', 's', 'ん', 'よう', 'いう', 'う', '人', 'm', 'この', 'という', '思う', 'その', 'l', '的', 'c', '年', '日', '！', 'h', '私', 'もの', 'や', 'ば', 'd', '？', 'p', 'それ', 'u', '者', 'できる', 'これ', '#', '|', '言う', 'b', 'S', 'y', 'くる', '月', 'C', 'として', 'さん', 'T', 'A', '：', 'まで', 'たい', 'g', 'w', 'など', 'k', '中', 'P', 'られる', 'お', 'ね', '，', '…', 'へ', '見る', 'ため', 'てる', 'M', 'そう', '日本', 'おる', '一', 'ので', 'いく', 'だけ', '何', 'よ', 'I', '自分', 'しまう', 'について', 'R', '方', 'E', '時', 'D', 'ぬ', '問題', '考える', 'O', 'せる', 'また', 'N', 'B', 'f', '『', '今', '』', 'みる', 'L', 'でも', 'やる', 'わけ', 'ござる', 'たち', 'ところ', '．', 'さ', 'いい', 'って', '前', '第', 'たり', '性', '行く', 'より', 'そして', 'けど', 'どう', '出る', '時間', '会', '書く', '円', '二', 'し', '場合', '持つ', '必要', '情報', '○', 'しかし', 'F', 'v', 'とき', 'コメント', '化', '上', '事', 'W', '使う', '行う', 'な', 'ご', '話', 'くれる', 'U', 'ながら', 'よい', 'H', '本', 'じゃ', 'ここ', '分', '十', '目', '多い', '知る', '■', 'G', '今日', '良い', '関係', '委員', '後', 'かも', '家', 'そういう', '聞く', '世界', '気', '点', '万', 'べし', '】', '【', 'もう', 'わかる', 'バック', '社会', '読む', '入る', '〜', '来る', 'トラック', 'によって', '仕事', '同じ', '数', '記事', 'いただく', '彼', '大', '国', '等', 'くださる', '_', '回', '三', 'とか', '君', '法', 'K', '意味', '力', '以上', 'J', '会社', 'j', 'よる', 'ほど', 'そんな', '人間', '★', 'V', '現在', '作る', '企業', '氏', 'ちょっと', '間', '可能', '感じる', '出す', '研究', '投稿', '他', 'アメリカ', 'しれる', 'けれども', 'リンク', '今回', 'いたす', '高い', 'す', '次', 'ら', '言葉', 'こういう', 'おく', '僕', '出来る', '受ける', '●', 'x', '経済', 'あなた', '手', 'もらう', 'そこ', 'による', '最近', '結果', '買う', '度', '％', 'しか', '違う', '映画', '／', '先生', '生活', 'にる', '金', '＝', '時代', '政府', '非常', '得る', '御', '＞', '店', 'くらい', 'まだ', 'において', '内容', '^', '一つ', '心', '――', '説明', '写真', 'ただ', 'サイト', '教育', '女性', '子供', '方法', 'に対して', '＊', '大きい', 'あるいは', '名', '利用', 'さらに', '少し', '紹介', '技術', 'いろいろ', 'なんて', '名前', '参加', 'らしい', '分かる', '大きな', '食べる', '感じ', 'やはり', '☆', 'く', 'うち', '入れる', '見える', 'どの', 'にとって', '活動', '東京', '好き', 'どこ', 'かなり', 'こんな', '状況', '五', '新しい', 'に対する', '無い', '強い', '管理', '特に', '環境', 'ページ', 'Y', 'のに', '地域', '始める', '本当に', '悪い', '実際', '中国', '市', '先', '誰', '個人', '意見', '状態', '歳', '大学', '多く', '物', '存在', '最後', '終わる', '笑', 'つく', 'システム', 'すべて', '彼女', '理解', '学校', '部分', 'とても', '電話', '用', '部', 'z', '県', '日記', 'メール', 'いける', '制度', '続ける', '使用', 'スる', '事業', '四', '固定', '調査', '変わる', '続く', '基本', 'もちろん', '関連', '一般', 'あと', '開発', 'あの', '音楽', '一番', '内', '作品', '側', '重要', 'X', 'とる', '最初', '様', '達', '国民', 'サービス', 'もっと', 'に関する', 'こちら', 'かける', '水', '新', 'つける', '事件', '英語', '所', '質問', '形', 'ほとんど', 'ふう', '男', 'はず', 'まず', '約', 'こう', '主義', '下', '場', 'ちゃん', '理由', '書', '社', '──', 'ン', '場所', '機能', '米', 'お願い', '労働', 'いつも', '→', '車', '相手', '国際', '自身', '声', '取る', '計画', 'かかる', 'ほう', '政治', '別', 'ばかり', '系', '感', '億', '頃', '号', 'における', '長', '日本人', '今後', 'つまり', '呼ぶ', 'まま', '下さる', '文化', '体', '与える', 'こ', 'ちゃう', '大変', '彼ら', '評価', '百', 'やすい', '対応', '求める', '権', '頭', 'あまり', '子', '自由', '｜', 'すぎる', '昨日', 'みたい', 'すぐ', 'これから', '戻る', '歴史', '全体', '長い', '少ない', '気持ち', '報告', '程度', '◆', '元', '人々', '＜', '予定', '代表', 'その後', '経験', '型', '員', 'ネット', '以外', 'なぁ', '今年', '価格', '投資', '経営', '早い', 'ニュース', '帰る', 'それぞれ', '自然', '商品', 'なかなか', '発表', '教える', '目的', '影響', '地方', '生きる', 'だから', 'テレビ', '一緒', '面', '顔', '選手', '楽しい', '道', 'けれど', 'みんな', '子ども', '実は', '確か', 'でる', '千', '確認', 'ありがとう', '夜', '例えば', '中心', '市場', '音', '提供', '事実', '地', '簡単', '面白い', '朝', '版', '学', 'なぜ', '当然', '以下', '責任', '六', 'ゲーム', '議論', 'これら', '以前', '位', 'データ', '示す', '判断', '例', '専門', '家族', 'しかも', '初めて', '勉強', '申し上げる', '話す', 'もつ', '期待', '難しい', 'そこで', 'いま', '全く', '韓国', '外', 'たくさん', '効果', '検討', '各', '普通', '組織', '政策', '町', '行動', '年間', 'こそ', '置く', '率', '当時', '学生', '飲む', '海', 'よく', '販売', 'どんな', 'つつ', '購入', '科学', '監督', '意識', '認める', '欲しい', '九', 'わ', '通り', 'とも', '立つ', '生産', '表現', '戦争', 'ねる', '参考', '始まる', 'ひとつ', 'その他', '決定', 'まあ', 'ぐらい', '＆', '曲', '同', 'ク', 'やっぱり', '法律', '機関', '開く', 'ビジネス', 'さて', '対象', 'チーム', '現実', '進む', '対策', '作業', 'すごい', '価値', 'テーマ', '十分', '含む', '一部', '語', '決める', '姿', '新聞', '一方', '風', '八', '際', '考え', 'ラ', '残る', '論', 'のみ', '全て', '及び', '大臣', '神', '国家', '件', '語る', '毎日', '俺', '試合', 'もし', '七', 'ま', '会議', 'いつ', '指摘', '言える', '＾', '歩く', '製品', '変化', '結局', '消費', '保険', 'り', '具体', 'あげる', '人生', '量', '米国', '表示', '変える', '精神', '街', '過去', 'レベル', '我々', 'インターネット', '能力', '選ぶ', '指導', '更新', '公開', '日本語', '皆さん', '働く', '―', '屋', 'ほか', '女', '昔', '担当', '費', 'わたし', '送る', '明日', '旅行', '夢', 'それから', '明らか', '乗る', 'つくる', '＿', '木', '機', '大切', '忘れる', '局', '行政', '安全', '外国', '増える', 'お金', '資料', '部屋', '行為', 'あ', '平成', 'いや', 'なん', '楽しむ', '色', '待つ', '登録', 'ドイツ', 'うまい', '設定', 'どういう', '述べる', '成功', '努力', '戦', '団体', 'につきまして', '支援', '最も', '自己', '全', '年度', '運動', '構造', '特別', 'ド', '解決', '完全', '品', '訳', '向かう', '男性', '結構', '産業', '軍', '主', 'に関して', '人気', 'お話', '駅', '描く', '近く', '最終', 'ドル', '過ぎる', '保護', '上げる', '再', 'グループ', '生', 'ポイント', 'ども', 'センター', '開催', '方向', '改革', '検索', '走る', '生まれる', '□', '起こる', 'Q', '健康', '障害', 'ヶ月', '起きる', '協力', '時期', '料理', '考え方', '医療', '頂く', '金融', '売る', '試験', 'により', '進める', '死ぬ', 'フランス', '近い', '立場', '契約', 'すでに', '条件', '放送', '※', '全国', '違い', '室', 'なあ', '枚', 'ずっと', '作成', '足', '学ぶ', '成長', '施設', 'リ', '登場', '知識', '携帯', '実現', '友人', '海外', '原因', '実施', '昨年', '〇', '探す', '病院', '代', '認識', '夏', 'および', 'イメージ', '段階', '発生', '反対', '会う', '期間', '区', 'トップ', '条', '若い', '見せる', '午後', '税', '主張', '変更', 'サッカー', 'パソコン', '限り', '＋', '高', '番組', '今度', 'ホームページ', '準備', '処理', '口', '式', 'または', 'だって', '絶対', '伝える', '結婚', '社長', '守る', '体験', '基準', '発言', '深い', '住む', '都市', 'ぞ', '親', '機会', '展開', 'ほしい', '授業', 'デザイン', '火', '自体', '興味', '掲載', '含める', '編集', '選択', 'いわゆる', '信じる', 'もん', '週間', '負担', '文字', '最大', '無料', '相談', '注意', 'ホテル', 'まったく', '株', '思える', '全部', 'しっかり', '開始', '上がる', '身', 'イベント', '分析', 'アクセス', '同時に', '詳細', '合う', '動く', 'える', '先ほど', '派', 'アップ', '将来', '予算', '愛', '目標', '台', '通信', '△', '比べる', 'プログラム', 'させる', '分野', 'ちなみに', 'Z', '花', '向ける', '国内', '土', '時刻', 'つ', 'そのまま', '逆', '発見', 'とにかく', 'きる', '最高', '頑張る', '為', '覚える', '利益', 'どちら', '小', '銀行', '終了', '事務', '出版', '連絡', '正しい', 'プロ', '大会', '練習', '様々', '娘', '州', 'こうした', 'ファン', '同様', '小さな', '大阪', '共通', 'つもり', '現代', '被害', '住宅', '選挙', 'とともに', '新た', '大事', 'あたり', 'ろ', '安い', '山', '批判', '報道', '動き', '▼', '心配', '見つける', '本日', '残念', 'なお', 'クリック', '小さい', '業界', '相当', 'どれ', '議員', '業務', 'なか', '章', '調べる', '攻撃', '思い', 'スポーツ', 'メンバー', '世紀', '演奏', '家庭', '直接', 'ところが', '聴く', '構成', '文章', '案', '異なる', '驚く', '希望', 'もと', '記憶', '方々', '取引', '［', '美しい', '加える', '市民', '超', 'とおり', '資金', 'メディア', '友達', '危険', '運営', '導入', '予想', 'ファイル', 'いずれ', 'モデル', '必ず', 'たとえば', '答える', 'レ', '発売', 'はっきり', '寝る', '目指す', '話題', '建築', '印象', '詳しい', '課題', '￣', '事故', 'ライブ', '低い', 'ソフト', '額', 'る', 'バス', '困る', '母', 'チェック', 'ちゃんと', 'われわれ', '］', '学習', '靴', 'むしろ', 'まさに', '権利', '発展', '記録', '割', '光', '個', '計算', '雨', '設計', '種類', '非', '現場', '途中', '気分', '昭和', '地球', '嬉しい', '移動', '絵', 'ごと', '限る', '料', '発行', '宗教', '企画', '改正', '数字', '倍', '線', 'そのもの', '不安', '自ら', '決まる', '広い', '広告', '土地', 'それら', '有名', '基づく', '言語', '共同', '年代', 'タイプ', '観る', 'プロジェクト', '要求', '差', '残す', '教授', 'さえ', '戦略', '営業', '制', '無理', '役割', '▲', '改善', '北朝鮮', 'きっと', '期', 'イギリス', 'ユーザー', '撮影', 'エネルギー', '知れる', '拡大', '色々', 'いただける', '道路', '種', '切る', '憲法', '感謝', 'い', '感覚', '旅', '紙', '高校', 'なり', '付ける', '厳しい', 'Ａ', '×', '仕方', '合わせる', '実行', 'とりあえず', '記者', '通常', '既に', '現状', '建設', '味', 'だが', '−', 'スタッフ', '先日', '最新', '中央', '幸せ', '似る', '犬', '平均', 'カード', 'あれ', '物語', '末', '財政', '◇', '追加', '不思議', 'ネットワーク', '警察', '初', '雑誌', '提案', '編', '思い出す', '大人', '日々', '様子', 'なさる', 'いろんな', '生徒', 'にくい', 'マン', '総合', '↓', '使える', '値', '活用', '決して', '交換', '身体', '整備', 'リスク', '規定', '想像', 'ああ', 'ケース', 'アジア', '左', '満足', '規模', '集', '本当', '以降', '比較', '素晴らしい', '法人', 'クラス', '犯罪', 'おっしゃる', '午前', 'ちる', '会長', 'せい', '通る', 'なんと', '超える', '平和', '基礎', '特定', 'ヨーロッパ', 'ネタ', '流れ', 'どうも', 'ドア', '村', '画像', '少年', 'いえる', '安定', '実験', 'ちゃ', 'つる', 'メーカー', '間違い', '本人', '雰囲気', '国会', '気づく', 'まぁ', '患者', '歌', '会場', '治療', '；', 'ぜひ', 'それでも', '電子', '小説', '箸', '死', '注目', '食事', '維持', 'ほぼ', '文', '範囲', 'コラム', 'まとめる', '常に', '著作', '表', 'ものの', 'いっぱい', '失う', '夫', '理論', '秒', '日常', 'イラク', '業者', '回答', '体制', '調整', '訴訟', '階', '酒', 'やめる', '住民', 'はじめ', '疑問', 'ど', '当たる', '失敗', '落ちる', '繰り返す', '島', '息子', '資本', '事情', '応援', 'コース', '》', '感想', '届く', '解説', '行なう', '妻', 'シリーズ', '客', '公共', '民間', 'イタリア', '弁護士', 'なす', '裁判', '古い', '建物', '集まる', '対', '省', '措置', '組合', 'に対し', '父', '払う', '本来', '元気', '一体', '宇宙', '《', '申す', '図', 'シ', '引く', 'クラブ', 'タイトル', '作', '用いる', '番', 'お客様', '採用', 'しばらく', '二つ', '観光', '提出', '以来', '推進', '首相', '業', '向け', '確保', '動物', '集める', '離れる', 'ただし', '検査', '映像', '信頼', 'q', '要素', '触れる', '笑う', 'どんどん', '世', 'コスト', '人物', '規制', '空間', '記念', '方針', 'もらえる', 'よろしい', 'もっとも', '役', '右', '楽しみ', '審議', '競争', '設置', '位置', 'テスト', '全然', '費用', '株式会社', '席', '観', 'ロ', '大統領', '指定', '事務所', '感情', '付く', 'さまざま', '京都', 'ランキング', 'といった', 'かかわる', '↑', 'さすが', '許す', '空', '関わる', '起こす', '仲間', 'メッセージ', '迎える', '整理', '協会', 'モノ', '官', '至る', 'ロシア', '多数', 'デジタル', '耳', '積極', 'かつ', '願う', '安心', 'ダメ', '独立', 'イン', '読者', '勝つ', 'ぶり', '雇用', 'なに', '傾向', 'そもそも', '打つ', '賞', '誕生', 'ぼく', '遅い', '流れる', '撮る', 'いらっしゃる', 'まいる', 'バー', '都', '全員', 'コンピュータ', '皆', '参照', '少なくとも', '地元', '壁', '是非', '明確', 'つながる', 'つて', '士', '特徴', 'セット', 'たつ', '皆様', 'カメラ', 'どうしても', '別に', '魅力', '人口', '反応', 'きちんと', 'まだまだ', 'そういった', '手段', '有効', 'タイ', '工場', '入力', 'ビデオ', '注文', '集中', 'あまりに', 'さま', '一度', '脳', '北', '現象', 'ビル', '団', '感動', 'ソ', 'Δ', 'おいしい', '禁止', 'サポート', 'ずつ', '実践', 'おそらく', '小泉', '職員', '理事', '会員', '案内', '過ごす', '薬', 'シーン', '従来', '農業', '用意', '運用', '世代', 'そうした', '歌う', '強化', '納得', '周り', '収入', '増加', 'レポート', '年齢', '裏', '未来', '社員', '食', '教会', '舞台', '前回', '年金', 'もう少し', '＠', '交通', '総', '料金', '教師', '重い', 'どうして', '著', '森', '他人', '組', '株式', '上昇', '否定', '機械', '完成', '大好き', 'ねぇ', '扱う', '修正', 'くん', '電車', '一応', '向上', '負ける', '生じる', '週', '野球', '姿勢', 'スペイン', '遊ぶ', '訪問', '引用', 'インド', '並ぶ', '視点', '小学校', '電気', 'ノ', 'パ', '効率', '間違う', '芸術', '挙げる', '会話', 'ドラマ', '再び', '春', '解釈', 'ゆく', '猫', '４月', '資産', '行', '結論', '大丈夫', '止める', '取り組む', 'かつて', '怖い', '半', '界', '製造', '困難', '回復', '◎', '美味しい', '適用', '母親', '取材', 'やっと', '保障', '集団', 'ルール', '卒業', '事態', '立てる', '雪', '画面', 'おかしい', '資格', '時点', '病気', 'なれる', 'スタート', '更に', '活躍', 'ですから', '馬', '冊', '問う', 'ちょうど', '命', '殺す', 'サイズ', 'ころ', '限定', 'ひとり', '医師', '工事', '居る', '無', '６月', '現れる', '正直', '原則', '自動車', 'づくり', 'では', '部門', '女の子', '出演', '民族', '充実', '伴う', '講演', 'したがって', '瞬間', 'がる', '交流', '大量', '回る', '久しぶり', '革命', '成果', 'じ', 'コミュニケーション', '任', '標準', 'ひる', 'まるで', '輸入', 'やつ', '背景', '政権', 'スタイル', '喜ぶ', '星', '協議', 'っていう', '関心', '勝手', '一覧', '副', '取り上げる', '７月', '伝統', '横', '聞こえる', '民主', '制限', '投票', 'どうぞ', '値段', '沖縄', '図る', '川', '軽い', '若者', '心理', '大体', '里', '掲示板', '番号', 'トン', '前提', '館', '船', 'ある程度', '突然', 'なんだか', '半分', '思想', 'オープン', '請求', '正確', '教室', '周辺', 'セミナー', 'リスト', '３月', '応じる', '不足', '実', '寒い', 'デ', '法案', '東', 'ボール', 'すなわち', 'コード', '王', '捨てる', '世の中', 'みなさん', '取得', '項目', 'そんなに', '旧', '性格', '次第', '顧客', '着る', 'いかに', '減る', '避ける', '多分', '地区', 'を通じて', '長期', '遠い', 'がんばる', 'ミ', '達成', '著者', '弱い', 'ソフトウェア', 'におきまして', '展示', '誌', '答え', '訪れる', '忙しい', '後半', '福祉', '到着', 'ナ', '罪', '楽', '操作', '便利', '支配', '南', '何とか', '講座', '現地', '態度', '審査', '公園', '過程', '研修', '長官', 'バランス', '変', 'なー', '連続', '望む', '空気', '翻訳', '冬', '広がる', '単純', '短い', '５月', '飛ぶ', '予約', '構築', '党', '座る', '論文', '地震', '不', 'パン', '記', '継続', '一言', '出会う', '内部', '豊か', '生命', '所得', '制作', '敵', '単位', '自信', '涙', 'まずは', '科', 'ゆっくり', 'あらゆる', 'ベース', '層', '毎年', '距離', '複数', '恋愛', 'め', '英', '運転', '消える', '確実', '支持', 'インタビュー', 'ふる', '日間', '一定', '←', '交渉', '司法', '巻', 'なんとか', '借りる', '押す', '方式', '普段', '出席', '金利', 'アニメ', 'ところで', '窓', '諸', 'なくなる', '１つ', '危機', 'やってくる', '痛い', '低', '次に', '募集', '定める', '史', '自宅', '上記', '人権', '複雑', 'おかげ', 'スーパー', '逮捕', '器', '級', '証明', '概念', 'ツール', '果たす', 'コンテンツ', '泣く', '秋', '単に', '今週', '空港', '適切', '財産', '判決', '作家', 'もたらす', 'マスコミ', '思考', '接続', 'ようやく', '悩む', '形式', '違反', '義務', '再生', '破壊', '疲れる', '仕組み', '研究所', '国務大臣', '両', '受け入れる', 'だす', 'いくら', 'フリー', '公式', '場面', '英国', '年生', '石', '激しい', 'お客', 'それにしても', '就職', '文書', '派遣', 'Ｂ', 'ｗ', '類', 'テロ', '流す', '名無し', '真', '定義', '甘い', '素敵', 'プロセス', '当たり前', '約束', 'こんなに', 'コピー', '出身', 'っぽい', '局長', '事項', '観点', '質', '白', '趣味', '箱', '連れる', '‥', 'ご覧', '出発', '終える', '魚', '会計', 'いくつか', '開ける', '形成', '記述', '資源', 'たぶん', '明るい', '事例', '着く', '金額', 'きれい', 'と共に', '証券', 'ガ', '支える', '成立', 'ひと', '軍事', 'うれしい', '訓練', '来年', '食品', '育てる', '証拠', 'ラジオ', '暑い', 'プレゼント', '不明', 'アルバム', '内閣', '北海道', '隣', '当', '裁判所', '挑戦', 'やり方', 'バンド', '鳥', 'ブラジル', '物質', '胸', '実に', 'いかが', '手法', '保存', '師', '相互', '依頼', '黒', '差別', '特集', '〔', 'おもしろい', '設備', '発', 'ひどい', 'なんか', 'お答え', '抱える', '未', '国連', '季節', '答弁', '下がる', 'わずか', '意思', '初め', '伺う', '保証', '実態', '売れる', '当初', 'もともと', '分ける', '装置', '〕', '怒る', 'キロ', '被告', '図書館', '降る', '所有', '書き込み', '日時', '防止', 'マンション', 'リー', '肉', '越える', 'アプリケーション', '需要', '凄い', '無視', '設立', '愛す', '総理', 'できるだけ', 'ショップ', '自転車', '生物', 'メニュー', '改めて', '優勝', '多様', '特許', '補助', '有る', 'を通して', 'はじめる', '優しい', '不動産', '見つかる', '野菜', 'バカ', '白い', '兆', 'ライン', '承知', '父親', '供給', '秘密', '誰か', '独自', '許可', '獲得', '休み', '急', '嫌', '外交', 'ねー', 'セキュリティ', '論理', '赤', '西', 'メイン', 'かく', 'とっても', '極めて', '本質', '多少', '出来事', '手紙', '策', 'スト', '去年', '及ぶ', '項', 'お互い', '９月', '汗', '強制', '宣言', '出かける', '病', 'エンジン', 'チャンス', '優先', 'オンライン', 'ソース', '人材', '頼む', '職業', 'ついに', '援助', '申請', 'それで', '取れる', '歩', '除く', 'コーナー', '問', 'ブランド', '高速', 'マーク', 'ろう', '特殊', 'こっち', 'ける', '次回', '文学', 'お知らせ', '議会', '介護', '２つ', '唯一', '削除', '田中', '両方', '垢', '高める', '本部', '横浜', '処分', 'きっかけ', '共有', 'ママ', '学者', '夫婦', '買い物', '風景', 'それほど', '中小', '追う', 'レストラン', '高齢', '付', '製', '剤', '１月', '夕方', '少女', '勝利', 'スピード', '職場', 'スター', '材料', '考慮', '付き', '伝わる', '主人公', '実感', '近代', '航空', '一時', '字', '戦後', '分類', 'コーヒー', '減少', '哲学', '運ぶ', '足りる', 'コントロール', 'ガン', '落とす', '核', '遊び', 'ポ', '巨大', '台湾', '訴える', '同士', '表す', '慣れる', '佐藤', '修', '条約', '人類', 'ワイン', 'コン', '燭', '展', '個別', 'パターン', '~', 'だれ', 'ビール', '首', '動かす', '波', '低下', '血', '機器', '死亡', '設ける', '捜査', '分の', '祭', '載る', '受け取る', 'ボランティア', '説', 'ホーム', '某', '抱く', 'ネ', 'ぜ', '理想', '天気', '止まる', '当局', '書籍', '挨拶', 'バイト', 'ガス', '受験', 'オレ', '観察', 'もう一度', '要因', '促進', 'それでは', '税金', '異常', '無事', '合意', '戦う', '統計', '渡る', 'キー', 'たる', '服', '領域', '不可能', '普及', '周囲', 'お前', '見事', '一切', '素材', '新規', '児童', '後ろ', '自民党', '把握', '前後', '又は', 'リリース', '経つ', '権力', '細かい', '趣旨', 'やや', '女子', '’', '予測', '自衛隊', '´', 'オリジナル', 'びっくり', '常識', '辰', 'すっかり', 'いよいよ', '出会い', '緊張', '〉', 'ねえ', '沢山', '職', '博士', '〈', '返す', '教科書', '先週', '近づく', 'がち', '問い合わせ', '２月', '朝鮮', '余裕', '代わり', '品質', '太陽', 'とく', '勤務', 'テキスト', '水準', '作り', '意図', '公務員', '復活', '用語', '進行', '近所', '育つ', '程', '無駄', '入り', '講師', '桜', '占める', '郵便', 'パワー', '候補', '気付く', '指示', '留学', 'いくつ', 'ミス', '返事', '物価', '創造', '直す', '覆る', '統一', 'たび', '々', '辺', '暮らす', '致す', 'テーブル', '苦労', '漫画', '進化', '飛行機', 'マガジン', '手術', 'み', 'リーグ', 'それとも', 'ツアー', '見解', '連合', 'ホント', '貿易', '発想', '静か', '経過', 'いきなり', '専用', '停止', '食う', '隠す', 'クリスマス', '化学', '院', '番目', '事前', 'ラン', '匹', '災害', 'ピアノ', '連携', '信用', '増やす', '優れる', '狭い', '両親', '悲しい', '高度', '熱い', '宣伝', '症', '支払う', '迷惑', '切れる', '砲', '主要', 'オーストラリア', '辛い', '配信', 'ゴール', '確立', '統合', 'コンサート', '謎', '時半', '何故', 'げ', 'ノート', 'それなり', 'ニューヨーク', '物理', '８月', '恋', 'ストーリー', 'ゼロ', '笑顔', '熱', '自動', '圏', 'メモ', 'アドバイス', '知的', '男女', 'よろしく', '緊急', '気に入る', '動作', '輸出', '落ち着く', 'かわいい', '先輩', '通じる', '本格', '合併', 'すら', '反省', '像', '中身', 'すばらしい', '製作', 'サン', '牛', '診断', '要望', 'ストレス', '工業', 'ボタン', 'アン', '試す', 'うる', 'ますます', '崩壊', '真実', '去る', 'プレー', '適当', '国立', '貼る', '珍しい', '計', '喜び', '石油', '大幅', '自治体', 'をもって', 'せっかく', '天', 'ブッシュ', 'だめ', '貢献', '眺める', '配慮', 'ごろ', 'サイド', '若干', 'スペース', 'つい', '主催', '書類', 'きょう', '韓', '調子', 'ミサイル', 'き', '単語', 'パリ', '渡す', '表情', '基地', '速い', '気がつく', 'ホール', '駐車', '比較的', 'ガラス', '景気', '世間', 'え', '植物', 'カー', 'あり方', '単なる', 'セ', '楽しめる', '戦い', '自治', '限界', 'ベスト', 'トイレ', 'ただいま', '抜く', '反映', '転換', '美', 'タイム', '形態', '振る', '状', '嫌い', '奴', '感染', '逃げる', '根拠', 'こうして', '原稿', 'イエス', 'そろそろ', '相場', '抜ける', '合格', '記載', 'お母さん', '狙う', '地図', '人達', 'ダウンロード', '大学院', '$', '拒否', '腕', 'はい', 'あう', '遅れる', '鈴木', '最低', '微妙', '見方', '結ぶ', '最', '下げる', '削減', 'Ｍ', '青年', '我が国', '助ける', '役立つ', 'しかしながら', 'つぶやき', '劇場', '向く', '強調', '要するに', '防衛', 'ロンドン', '世界中', '初期', 'ホ', '機構', 'どうやら', '床', '真剣', 'おすすめ', '講義', '術', '対処', '隊', '読める', '実質', '貴重', 'メートル', 'もしくは', '収集', '▽', '工夫', '大手', 'じゃあ', '諸国', '幅', '蠅', 'そば', '迫る', '監視', 'リーダー', '認定', '必ずしも', '文庫', 'サーバー', '各種', '節', '福岡', '肩', '反', 'すると', '券', '意外', '帰り', '容疑', '命令', '明治', '向こう', '根本', '重視', 'ワン', '時々', '指', '依存', '医学', '手続', 'けっこう', '株主', 'プラス', '行ける', '刺激', '合理', '中間', '鉄道', 'ゆ', '従う', '暗い', '入手', '才', '名古屋', '叫ぶ', 'めぐる', '現', 'こんにちは', '注', '組む', '相', 'ロー', '印刷', '帰国', '発揮', '市町村', '何らかの', '規則', '賃金', '一致', 'バージョン', '奥', 'マーケティング', '主体', 'トラブル', '原告', '経る', '部長', '習慣', '筆者', '以内', 'だり', 'カナダ', '校', 'ロック', '模様', '日曜日', '目立つ', '速度', '焼く', '外部', '抵抗', '各国', '重ねる', 'かねる', 'ワールドカップ', '会見', '定期', '市内', '混乱', '医者', '自殺', '都合', '幸い', '検証', '概要', '温泉', 'ジョン', '参る', '神様', '漢字', 'ごく', '踏まえる', '役に立つ', '杯', 'レース', 'ご飯', 'さっき', '賛成', '緑', '迷う', '民主党', '欧州', '帰宅', '城', 'シーズン', '筋', 'たとえ', '天皇', '前半', 'ともかく', '重大', '流', 'ゴルフ', 'ユーザ', '題', '録音', '運', '必須', '林', '不満', '可愛い', '流通', '我が家', '扱い', '重', '原理', '比', '嘘', '多', '株価', '想定', '手続き', '要請', '楽器', '詩', '村上', '容易', '廃止', '魂', '綺麗', 'イスラエル', '今月', '亡くなる', '興味深い', '滞在', 'いったい', '上手い', '各地', '従業', '伸びる', '読書', '確定', '合計', '浮かぶ', 'ヒット', 'ＨＰ', 'モード', 'しょう', 'タクシー', '発信', '済む', '振り返る', '執行', '連載', '香り', 'フル', '恐怖', '思い出', '日経', '主人', '一瞬', '老人', '頁', '薄い', '当日', '早速', '備える', '関西', '赤い', '神戸', '時計', '割合', '正式', 'はいる', 'カラー', '出場', '残り', 'まくる', '徹底', '穴', '収録', '板', '退職', '寄せる', '張る', '入学', '週末', '殺人', '代理', '演出', 'かる', '掃除', '葉', 'ショー', '公表', 'インストール', '育成', 'Ｋ', '実績', 'だけど', '伺い', '昼', '使い方', '頼る', 'パー', 'もはや', '掛ける', '源', '店舗', '大型', 'キリスト教', 'ハイ', '載せる', '風呂', '生み出す', 'どっち', '申し訳', '安', 'ふと', '回転', 'マイナス', 'チケット', '犠牲', '暴力', '青', '細胞', 'ことば', 'ステージ', 'はる', 'そる', 'ガイド', '稼ぐ', '広げる', 'バイク', '知事', '勧め', '起業', 'ロボット', '戦闘', 'とこ', 'たった', '１０月', '聖書', 'しいる', '一気に', '移行', 'はじめて', '正', '生かす', '成績', '通す', 'お茶', '保つ', '同じく', '勝負', '翌日', '票', '直後', '左右', 'やがて', '決勝', '所属', '演じる', '恥ずかしい', 'キャラ', '面倒', '奪う', '測定', '千葉', 'ブック', 'ダイエット', '提示', '救う', '弾', 'リング', '材', '府', 'あんまり', '帯', 'たまたま', 'ベッド', '基盤', 'ものすごい', '見学', '応募', 'ファ', '枠', '厚生', 'Ｃ', '配置', '道具', 'ＣＤ', '刑事', '勢い', 'Ｓ', '戻す', '対立', '散歩', 'とれる', '症状', '入院', '教員', 'キーワード', '中学', '表面', '情勢', '広島', '列', '腹', '玉', 'レビュー', '学会', 'ニーズ', 'シンプル', '総会', 'それに', 'うえ', '通', '銘柄', '数学', '土曜日', '民', 'やら', '承認', 'なんとなく', '下記', '侵害', '増', '受賞', '痛み', '赤字', '公', '見かける', '腰', 'お世話', 'にかけて', '次々', '加工', '中村', '書店', 'こる', '緩和', 'マイ', '眠る', 'ジャンル', 'プラン', 'お気に入り', '本当は', '個性', '作戦', '指揮', '技', 'たまに', 'たま', '誤解', '偶然', '群', '少々', 'しく', '高まる', 'ショック', 'かう', '確信', '祈る', '意志', 'ほる', '捉える', '知', 'シート', '休む', '高校生', 'きれる', '１２月', 'パス', 'ログ', 'カフェ', '暮らし', '勇気', '｀', 'カテゴリー', '売買', '公演', '画', '制御', '食べ物', '尋ねる', 'にて', 'キリスト', 'レッスン', '法則', '作者', 'メリット', '文句', '馬鹿', '生まれ', '失礼', '博物館', '神社', '予防', '正当', 'データベース', 'レス', 'うん', '実家', '活性', '受信', '山本', '自主', 'アンケート', '確率', '表明', '美術館', '解消', 'オフィス', '座', '苦手', '爆発', '欧米', '肌', '信仰', 'タイミング', '現行', '降りる', '解放', 'カバー', 'ペ', '発電', 'カット', 'デモ', '損害', '小学生', '判る', '取り組み', '満たす', 'トレーニング', 'アフリカ', '踊る', '悪', '妹', '競馬', '運命', '個々', '噂', 'コンピューター', '３つ', '経費', 'アル', '招く', 'ええ', '本書', '週刊', '建てる', '原', '仕様', 'マンガ', '園', '電力', 'オフ', '発達', '来', '矛盾', 'ハウス', '性能', '立派', '役員', '大いに', '影', '象徴', '性質', '送信', '勝', 'わが国', 'あえて', 'あー', '上手', '圧力', '風邪', 'アウト', 'スキル', '得意', '温度', '初心者', '一生懸命', '香港', '急ぐ', '必死', 'ラーメン', 'わざわざ', 'そうすると', 'ゴミ', 'ギター', 'だける', '具合', '橋', '神経', '作用', 'いわば', '庭', '本物', '過ぎ', '意義', '抑える', '新宿', 'ライフ', '延長', '観客', 'ＮＨＫ', '深刻', 'ｍ', 'ファンド', '恐ろしい', '路線', '又', 'マシン', '武器', '取締役', 'ほんの', '方面', '盛り上がる', '自立', '荷物', '録', 'ローン', '直前', '見直し', '既存', '部品', 'アイデア', 'モン', 'かな', '負う', 'ゆう', '幹部', '相変わらず', '殆ど', '本気', '最適', 'きく', '１１月', '地下', '慎重', 'アート', '悩み', 'ずいぶん', 'もしか', '学問', '髪', '見通し', '導く', '伸ばす', 'マニュアル', '進出', '劇', '為替', '久々', 'エリア', '丁寧', '総裁', '視聴', 'あがる', '我が', 'かた', '産', 'かしら', '袋', '歯', '格差', '区別', 'カレー', '支払い', '塩', '休日', '当社', '解析', '課', '投げる', '上司', '耐える', '民営', '法的', '呂', '周年', 'よー', '従って', '医', '吹く', 'しばしば', '兄弟', 'だいたい', '競技', '辺り', '弾く', '当事者', '素直', '決算', 'スクール', 'あたる', 'はるか', 'すむ', 'アーティスト', '大衆', '回す', '人事', '勢力', 'キャンペーン', '不正', '議長', '報酬', 'マーケット', '便', '応用', '振興', 'ソ連', 'だんだん', '変換', '減らす', '連邦', '衝撃', 'レコード', '今朝', '権限', '充分', 'きわめて', '動向', '丸', 'ノウハウ', 'まい', 'あくまで', '怒り', '掲げる', 'さる', '療法', '搭載', '収益', 'それだけ', 'どんなに', '人数', '縁', 'ほんとう', '政党', '違法', 'スケジュール', 'とくに', '寂しい', '来週', 'オランダ', '本体', '塾', '骨', '我慢', '一生', '原作', 'ベトナム', '底', '仮に', '書き込む', 'ワーク', 'たいへん', '強力', 'お尋ね', 'コミュニティ', '箇所', '達す', '族', '陥る', '貰う', '圧倒的', '高橋', '免許', 'ユーロ', '付け', '港', '聖', 'アドレス', '移る', '実力', '裁判官', '云う', 'なぜなら', '恋人', '首都', '質疑', 'なるほど', '住所', '防ぐ', 'へん', '書ける', '歓迎', 'なにか', 'あたし', '子育て', '黒い', '懐かしい', '順', '韻', '作曲', '失業', '太郎', 'ぼる', '客観', '田舎', '任せる', '鍵', '勿論', '指す', 'リン', '￥', '同社', '売上', 'リアル', '倫理', '中古', '卵', '見つめる', '朝日', '高級', '消す', '辞書', '市長', '一種', '入門', 'そういえば', 'キャラクター', '出張', '苦しい', '夕食', '叩く', '存じる', 'ダウン', '深夜', '協定', '癒す', '買える', '半年', '息', '豊富', '身近', 'たく', 'うつ', '物件', 'ハード', '余り', '着', '優秀', '加わる', '弟', '角', '面接', '部隊', 'マレーシア', 'すぎ', 'ハワイ', '給与', '明', '尽くす', '咲く', '発音', '配布', '同意', 'オススメ', '交付', 'ありがたい', 'ワ', '並べる', '保有', '課長', 'こだわる', '体系', 'ユダヤ', '同一', '加藤', '官僚', '列車', '茶', '朝日新聞', '構想', '陣', '口座', '説得', '決議', '地位', '完了', '進歩', '追求', '続き', '欄', '和', 'カ月', '乗せる', '燃料', 'あわせる', 'ご存知', '壊れる', '排除', 'ポスト', '解除', 'Ｑ', '好み', '加入', '側面', '開設', '辞める', '在庫', 'とらえる', '離婚', '回収', 'っけ', '生む', 'ドライブ', 'あちこち', '鏡', '当該', '移転', '全般', 'ウイルス', '全面', '非難', '修理', '集合', '誘う', '音声', '視', '施行', '増す', '共に', '効く', 'カウンター', '文明', '流行', 'ジャパン', '不良', '美術', '三つ', '名誉', '田', '変動', '都道府県', 'ちょっとした', '逆に', 'ケーキ', '受講', '商店', '伝説', '言', '堂', '輝く', 'マイクロソフト', '再開', '休憩', '握る', '松本', '階級', '公的', '江戸', 'キャリア', '転職', 'ライト', '先進', '遺伝子', '農家', '総務', '雲', '税込', '油', 'アプローチ', '濃い', 'ないし', 'あくまでも', '当てる', 'ワールド', 'お父さん', '小林', 'デビュー', '紛争', 'ステップ', '決意', 'オン', '一杯', '移民', 'ロード', 'プロフィール', 'ローマ', '毎週', 'ダンス', '伊藤', '階段', '損', '施策', '被', '男子', '渋谷', '育児', '学部', 'ボク', '懸念', '買収', '不幸', '知恵', '沿う', '冷たい', '快適', '柱', 'ファッション', 'パパ', '苦しむ', '軸', '畑', '行事', '金曜日', 'うーん', 'サイン', '考察', 'リズム', '成り立つ', 'ドメイン', '体調', '手数料', '例外', '兵器', '眼', '解る', '中止', '債権', '主婦', '証', '賠償', '融資', 'カップ', '奥さん', '暖かい', 'しょ', '理念', '発射', '‐', '公正', 'マネジメント', '取り入れる', '給料', 'マイル', '言い方', '繋がる', 'ほんと', '前日', '洗濯', '暇', 'すねる', 'アイテム', '疑う', '商売', 'グローバル', '恐らく', '科目', '連', '短期', '特性', '復帰', '付近', '廃棄', '門', '素人', '犯人', '盤', '北京', '永遠', 'まち', 'ブーム', '念', '尊重', '古代', 'ブルー', '帝国', '冒頭', 'マスター', '郵政', '体重', '随分', '本件', '有', '通貨', '木村', '動画', 'バブル', '龍', 'ルート', '上海', '財', '人工', '気温', '適正', '記す', '─', '新潟', 'エン', 'ばる', '抗議', 'パフォーマンス', '広場', '台風', '徐々に', '受付', '祭り', '苦笑', 'ショッピング', 'ダム', '生涯', 'しま', '妙', '自覚', '寄る', '比率', '拉致', '上映', 'しゃべる', 'ジャズ', '仏', '飾る', '再度', '観測', '誤る', 'ミニ', '兄', '純粋', '拍手', '要件', '赤ちゃん', '札幌', 'どころ', '数値', '基', '鼻', '保守', 'どおり', '欠く', 'ヨ', 'おもう', '覚悟', 'にわたって', '生き方', '務める', 'お腹', '財源', '吉田', 'たまる', 'オーナー', '駄目', 'そ', '経緯', '支出', '后', 'やさしい', '倒れる', '疲れ', 'まさか', '鬼', 'べ', 'Ｄ', 'さえる', '対話', 'ジャ', '入り口', '吸う', 'Ｔ', '長年', '毎回', '返信', '会談', 'ソニー', '信号', '借金', '監査', 'タバコ', '溢れる', '選択肢', '囲む', '広報', 'ティー', 'エントリー', '付き合う', '−−', '過剰', 'おめでとう', '谷', '極端', '商業', 'イラン', '気味', 'たっぷり', '大半', '社内', '旦那', '調達', '辞典', '担う', '正義', 'ペット', '完璧', '世帯', '襲う', 'そうそう', '審判', 'くらう', '大戦', '間違える', '教材', '阪神', '後に', '上る', '外務省', 'スキー', 'ヒト', 'たん', '制定', '才能', '発明', 'そのうち', 'あふれる', 'ノー', '幸福', '通知', '汚染', 'クリア', '体力', '見直す', '邪魔', '冷静', '込む', '血液', 'サラリーマン', '地上', 'まわり', 'Ｆ', '通勤', '反論', 'キャンプ', 'あり', '青い', '味わう', 'コンビニ', '幅広い', 'オリンピック', '正常', '人格', '独特', '意欲', 'パーティ', '開放', 'ＴＶ', '中国人', '面積', '熱心', 'さす', 'だらけ', 'オプション', 'サーバ', '原子力', '分離', '段', '呼吸', '日程', '移す', '最悪', '友', 'さあ', '演技', 'ポール', '好む', '積む', '放置', '我', 'やっぱ', 'イヤ', 'すね', '保健', 'そりゃ', '改良', '執筆', 'っす', '集会', 'なんとも', '店員', '気軽', 'つらい', '毎月', '男の子', '分かれる', '開示', '頂ける', 'アクション', '診療', 'たしかに', '有する', '悪化', '両者', 'フィルム', '見れる', '拡張', 'ピン', 'みな', '在住', '幼稚園', '選', '目次', '済み', '出せる', '看板', '仏教', '引退', 'セックス', '名称', '上位', '姉', '路', '無線', '近年', '山田', '幾つ', '文献', '空く', '引き続き', '不要', '果たして', '就任', 'こむ', '椅子', 'かえる', 'いつか', 'ゆえ', '上回る', 'Ｈ', '有利', '出現', 'おじさん', '感心', '連中', '庁', '心から', 'いたる', '魔法', '網', '出産', '家具', '課税', '関東', 'こなす', 'しよう', '中田', 'Ｗ杯', 'イスラム', '業績', 'スイス', '車両', '不可欠', '関与', '月曜日', '神奈川', '得', 'プレイヤー', '中学生', '筋肉', 'アパート', 'サイ', '踏む', '西洋', '傷', '外す', 'まして', '九州', '霊', '同時', '及ぼす', 'スタジオ', '思わず', '真面目', '諦める', 'じゃん', 'ブロック', '学科', '衛生', '渡辺', '中学校', '大勢', 'ゲスト', 'まとも', '債務', '断る', '同僚', '持てる', 'コム', '包む', 'バラ', '愛情', '洗う', '余計', 'エピソード', '起動', '一見', 'ワタ', '配る', 'つかむ', '電源', 'ひたすら', '覗く', '日銀', '疑い', '少数', 'プレ', '署名', 'アリ', '回避', '知り合い', '金持ち', '弁当', 'センス', 'ペース', '格好', '興奮', '平等', '欠ける', 'パスワード', 'ベンチャー', 'ほんとに', '決断', '対抗', '球', '行使', '抑制', 'インドネシア', '該当', '一連', '認知', '衛星', '要', '登る', '努める', '証人', '今や', '虫', 'チャレンジ', 'テープ', '夏休み', '通過', '他者', '平', '現金', '通う', 'エッセイ', '経由', 'パーティー', 'レイ', '勝ち', '透明', '映る', '支部', '脅威', 'つた', 'にゃ', 'デスク', '自社', '一層', '児', '親子', '期限', '新鮮', '農民', '違和感', '引っ張る', '輪', 'やる気', '警告', '鉄', '宿', 'ぶる', '応える', '地下鉄', '世論', '通訳', '意', '放つ', 'パッケージ', '指数', '野', 'ひく', '机', '了承', 'お待ち', '吸収', '以後', 'はかる', '柄', '数々', '巡る', '収穫', 'プール', '嫌う', '自', '込める', 'ですが', '肉体', '上場', '機種', '奇跡', 'つなぐ', '投入', '一貫', '俳優', '先頭', 'のんびり', 'パート', 'パートナー', '協', '背中', '埋める', '次元', '貸す', '化粧', '皮', 'ルーム', 'あっ', 'ついでに', '商', 'いかなる', '山口', '装備', '物事', '楽天', '異', 'トーク', '毛', 'だいぶ', '故', 'ぽい', 'がら', 'テクノロジー', '同盟', '玄関', '扉', '兵士', 'ドン', '揃う', '委託', '閲覧', '僕ら', '等々', '昼食', '光景', 'カン', '入場', '救済', 'カテゴリ', '記入', '作れる', 'タン', '参拝', '話し合い', '入', '補償', '響く', '国籍', '重なる', '掛かる', '閉じる', '絵本', '共感', '日曜', 'この世', '何人', 'アルバイト', '国境', '思いつく', '申し込み', 'あきらめる', '工学', '探る', '手元', 'がたい', 'ケア', '芸能', 'そちら', 'およそ', '笑い', '典型', 'かわる', '双方', 'マジ', '恵まれる', 'ともに', '後者', '観戦', '在日', '静岡', '養成', '現役', '沖', '再現', '心臓', '尊敬', '恐れる', '女優', 'ホワイト', 'お話し', '武', '宮崎', '権威', 'メールアドレス', '浴びる', 'テクニック', '返る', '保育', '別れる', '拾う', 'センチ', '税制', 'おれ', '本社', 'ラスト', '実用', '強', '制約', 'オブ', '演劇', '人種', '条例', '有料', '審', '判定', '住まい', '占い', '瓦', '順位', '急速', 'インフレ', 'フォーラム', '詐欺', '可', 'ヘッド', '築く', '朝食', '独占', 'シナリオ', '輸送', '高等', '推測', '天然', '下手', '知人', '頻繁', 'まとまる', '姫', '闇', '向き', '勝てる', '言及', '睡眠', '大学生', '解く', '提言', '自慢', '人形', 'つづける', '鍋', '銀', '望ましい', '不当', '訪ねる', '毎', '持ち込む', '間に合う', 'グッズ', '展望', '郡', 'どうせ', '国語', '職人', '試みる', '焦点', 'おまえ', '総額', '食料', '銃', '井上', 'フォーム', 'あんた', '略', '古典', 'この辺', '黙る', 'テニス', '貧しい', 'じっくり', '増大', '闘争', 'タグ', '池田', '相対', '追記', '当選', 'ランチ', '日中', '預金', '特', 'オタク', 'キーボード', 'アピール', '組み合わせ', '金属', '産む', 'はまる', '評判', 'ぶつ', 'レッド', '共産党', '絞る', '前年', '給付', '主演', 'いかにも', '編成', 'まつ', '証言', 'カップル', '提起', '実務', '誇る', '提携', '損失', '太', '早期', 'ポジション', '手当', '埼玉', 'コーチ', 'スコア', '厚い', '栄養', '結びつく', '分割', '判明', '健全', '半ば', 'イラスト', '持続', '結婚式', 'のる', '弁護', '妥当', 'ション', '之', '豆', '臭い', '好', 'ふさわしい', '控える', '宮', '仲', 'えっ', '鑑賞', 'オペラ', 'メキシコ', '教', '評論', 'わが', '後で', '覆う', '剣', '臨時', 'あく', '拠点', '宿泊', 'ディスク', '繊維', 'ふたり', 'ボード', '会合', 'ジャーナリスト', '閉鎖', '話し合う', '論議', '壊す', 'お昼', '座長', '天才', 'サンプル', '深める', 'いざ', 'オー', '犯す', '動機', '妄想', 'せめて', '長野', 'がん', '働き', '堀江', '届け', '試み', '論じる', '加盟', 'とどまる', 'スープ', 'マップ', '呼びかける', '帳', '美容', '晩', '草', 'キング', '保全', '何処', 'パネル', '演説', '衆議院', '中国語', '促す', '買い', 'プレス', '実情', 'チャンネル', '文字数', 'つき', '兵', '取り出す', '東大', '雑感', '元々', 'あぁ', '運転手', 'フィールド', 'タル', '徹底的', '造る', 'あれこれ', '窓口', '打ち合わせ', '勧める', 'かぶる', '愛する', '飽きる', '背', 'にあたって', 'お菓子', '購読', '得点', 'ペン', '立法', '真ん中', '否', '遠く', '成分', '飛ばす', '国債', 'とりわけ', 'つづく', 'コート', '推薦', '手順', '本文', '求人', 'お礼', 'ケーブル', '清', '屋根', '財務', '根', 'サー', '突っ込む', '寺', '反発', 'ヒント', '管', '巻く', '端', '福井', '゜', '放映', '豚', '支給', 'ブル', 'あらかじめ', 'プレーヤー', '遺産', 'に従って', '招待', '第三者', '無くなる', '神話', '視線', '四月', '予選', '解明', '収支', 'スライド', '匂い', '前向き', 'グルメ', 'Ｅ', '今夜', '乾燥', 'だからこそ', '適宜', '活発', '立ち上がる', '釣り', '容量', '告げる', '基金', 'はじまる', '湖', '要る', '修行', '売却', '早め', 'いっしょ', '飛行', '成る', 'サークル', '警備', 'それる', '余地', '膨大', '発送', '旨', '憧れる', '不安定', '送料', '鳴る', 'リード', '民事', 'トップページ', '規格', '潜在', '景色', '弊社', '脇', 'さっそく', '配分', '店長', '長崎', '見守る', '国土', 'ごめんなさい', 'パック', 'おこなう', '古', 'コンサルタント', '擁護', '突破', 'いれる', 'ルー', '自動的', '都会', 'ニュー', '偉い', '承る', 'なので', 'オブジェクト', '仙台', 'まわる', '豪華', 'やたら', '交代', '花火', '下落', 'まずい', '受け止める', '引き起こす', '訂正', '回数', 'ビックリ', 'つながり', 'ブラック', '作り出す', '度目', '確かめる', 'ミーティング', '講習', '墓', 'Ｇ', 'ずる', 'みなす', '寄付', 'マネージャー', '巻き込む', '先行', '表紙', '泉', '冒険', '中継', '保持', 'コンセプト', '視覚', '工作', '地獄', '大陸', 'フレーム', '看護', '売り上げ', '無し', 'もうすぐ', 'ピーター', '角度', '控訴', '勘違い', '端末', '余る', '栽培', '定着', '必然', '触る', 'かん', 'ライセンス', '破る', '後悔', '出力', '想い', '指標', 'オークション', '見た目', '脚本', 'ランド', '順番', '疑惑', '恐れ', '応答', '語学', '拘束', '妊娠', '録画', 'クラシック', 'やれる', '改行', '愛知', 'ベル', 'ポー', 'タウン', '削る', '記号', '再建', '池', '奈良', '代替', '細い', '幼児', '電波', '転載', 'たいてい', 'フィリピン', '生成', '意外と', '接触', '時には', 'トルコ', '大分', '表記', '新人', '情熱', '昨夜', '申込', '私的', '正解', '次第に', '殺害', '何だか', 'カ国', '親切', '冗談', '昼間', 'バン', '絵画', '稽古', '対戦', '来日', '循環', '萌える', '蓄積', '小型', 'クロ', '悪魔', 'オーディオ', 'モー', '海岸', '取り戻す', 'きつい', '視野', '天井', '戸', '与党', '縦', '通販', '中華', 'トレード', 'ウチ', 'ワシントン', '治安', '認証', '論点', '申告', '泊', '三月', '労働省', '出荷', 'ジョージ', '順調', 'エジプト', '官房', '満ちる', 'かい', 'レンタル', 'ジーコ', 'デザイナー', '貴方', 'かえって', '飼う', '付き合い', 'シン', '補足', '小売', '撤退', '並びに', 'グリーン', '関数', '代わる', '当面', '創設', 'やりとり', '塗る', '笋', '貧困', 'なく', '著しい', '到達', '軍隊', '勧告', 'もしも', '死者', 'アイドル', '健', '満載', 'スポット', 'コト', '鬚', '寿司', '討論', '英会話', '弱', '活かす', 'グレード', 'ごめん', '放棄', '歌詞', 'プリント', 'いちばん', '手間', '究極', '人民', 'スーツ', '強烈', 'シングル', '仮', '本番', '数える', '迅速', '体質', '正面', '地帯', 'つまらない', '塔', '新幹線', '南部', '収める', '天使', 'メモリ', 'チョコレート', 'ポルトガル', '創る', '役所', '定価', '本屋', '描写', '橋本', 'ポンド', '休暇', '割る', '行方', '習う', '気が付く', 'ヽ', '土産', 'あら', '奇妙', 'こいつ', 'のむ', '批評', '注ぐ', '減', '絡む', '羽', '論争', '徒歩', '図書', 'あいだ', '披露', 'コレクション', '関', 'シェア', 'ターゲット', '何故か', '別れ', '植民', '何となく', 'Ｐ', 'オレンジ', 'にもかかわらず', '未満', '松', '長男', '好評', '怪しい', 'ライ', 'ボーナス', '参入', 'した', '幻想', '例える', '学年', 'セッション', '侵略', '危ない', '用品', '缶', '砂', 'プライバシー', 'したがう', '李', 'ポスター', '革新', '衝突', '匿名', '全角', 'トー', 'ヤツ', 'フランス語', '偉大', '何より', '出資', '驚き', 'チップ', 'シュート', '居住', '拝見', '著書', '抽象', '孫', '治る', '理', 'スクリーン', 'マッチ', '勤める', '逆転', 'きめる', '諸君', '了解', 'スイッチ', 'ボックス', 'クルマ', '隠れる', '共和', '復興', '喫煙', '乗り越える', '統制', '幹事', '解散', 'ランク', '蔵', '誘導', '願い', '麺', '文法', '秩序', '争い', 'チベット', '書評', '重点', '軒', '悲劇', '怪我', 'マウス', '単独', '報じる', '年末', '即', '炎', 'ごとし', 'ジャンプ', '脂肪', '署', '会える', '縮小', 'フェ', '占領', '研', '枠組み', '規約', '共', 'テイ', '携わる', '陽', '不法', 'ダン', '樹', 'トロ', '探偵', 'しる', '農村', '進展', '倒す', '日付', '創作', '眠い', '武装', 'によりまして', '婦人', '天国', '声明', 'エル', 'ケン', '構う', 'ライター', 'とうとう', '美人', '贈る', 'ロス', '竹', '難い', '皮膚', '初日', 'こども', 'うい', 'マイケル', 'どー', 'とう', '下す', 'Ｒ', 'みせる', 'ちょ', '平日', 'お伝え', '氷', '魔', '整える', 'まことに', '公社', '推定', '振動', 'リエ', '志', '回路', '外れる', '金銭', '由来', '蓮', '東北', '孤独', 'レンズ', 'ステ', 'ピンク', 'トラ', '割引', 'インフルエンザ', '崩れる', '騒ぐ', '暗号', 'チーズ', '共産', 'ソウル', '策定', '最中', 'だし', 'チャン', '公平', '負け', 'アルコール', '尚', '燃える', '謝罪', '分間', '現時点', '助成', '衣装', '磨く', 'うどん', 'エラー', '単', '改造', '照らす', 'インフラ', '國', '加速', 'パーセント', 'あそこ', 'メジャー', 'ポリシー', '介入', '要する', 'クール', '皿', '新作', '途上', 'ふえる', 'むずかしい', '液晶', '直', '欲望', '済ませる', 'というのも', '区域', '破綻', 'スウェーデン', 'だい', '鑑定', 'マイク', '盗む', '保管', 'Ｎ', '若手', 'リサイクル', '鋭い', '何と', '手伝う', 'パレスチナ', '無意識', 'ペーパー', 'いまだに', 'まとめ', '公害', '会館', 'つぶやく', '不十分', '映画館', 'スコットランド', '事柄', 'ローカル', '異議', '法廷', '平気', '‘', '移住', '処置', '悔しい', '留学生', '従事', 'もったいない', 'デバイス', '敷地', '分散', 'ドライバー', 'とかいう', '分科', 'モバイル', '発足', 'しょうが', 'しかる', '棚', '突入', 'すみません', '室内', '走行', '姉妹', '議事', '文部', 'づらい', 'かよう', '観念', '未だに', '調べ', '歌手', '臨床', '上下', 'くせ', '学術', '電池', '履歴', '解雇', '先月', 'コール', '{', '川崎', 'インテリア', '家電', '爆弾', 'マル', '店内', '漂う', '周', 'おお', '言い訳', '同期', '移植', 'ジャック', '施工', '自国', 'セール', '理屈', '収容', '全身', '示唆', '惹く', '率直', '耐震', '駅前', 'Ｊ', 'いったん', '報', '儲かる', '伝', '職務', '商標', 'あつい', '絶望', '食堂', '連休', '何とも', 'マス', 'イイ', '予備', '入社', 'イングランド', '晴れる', '部会', 'グランド', '出勤', '警戒', 'オーバー', 'トヨタ', 'だく', 'イス', '引き出す', '融合', '棒', 'お送り', '返済', '外務', 'どうか', '省庁', '付属', '犯', '助かる', '露', '組み合わせる', 'かれる', '泊まる', '芝居', '節約', 'メイド', '値上げ', 'またまた', '火曜日', '清水', 'ウソ', '手前', 'あい', '司会', '防衛庁', '湯', 'ゼミ', '手作り', 'いい加減', '惑星', '岡田', '合同', '主導', 'ＯＫ', 'わく', '治', '善', 'ソロ', '部下', '公団', 'かまう', '吐く', 'クロス', '習得', '直面', '高知', 'さくら', 'アルゼンチン', 'コミック', '談', '転送', 'ギリシャ', 'セリフ', '校長', 'ボー', '華', '域', '検察', '踊り', '無限', '両国', '助け', '農林', 'スペシャル', '統治', '純', '早朝', '福島', '県内', '良', '史上', '背後', '間接', 'トマト', '粉', '後日', '感性', 'モニター', 'めざす', '省略', '無効', '剛', '騙す', 'オイル', '王国', '}', '速報', 'バイ', '郊外', '代金', 'ネコ', '歩む', 'そこそこ', '能', '似合う', 'やって来る', '彼等', '植える', '使命', '財団', '五月', '戦前', '故障', 'ポケット', '他方', 'メカニズム', 'カッコ', '答申', '直ちに', '境界', '毒', 'どこか', 'ぶつかる', '用途', '真理', '誇り', '要約', '盛り込む', '石川', 'ブラ', '王子', '仮説', '引き上げる', 'アップル', '伸び', '宅', 'キャンパス', 'さっぱり', '用紙', '出来', '講じる', '易い', '味方', '癖', '押さえる', '主役', '布', '国産', '一環', 'ついで', '喋る', 'へる', '英文', '類似', '届ける', '詰まる', '揃える', '軽減', '蹴る', 'あっという間に', '様式', '任務', '跡', 'ベン', '守備', '制裁', '幕', '在', '兵庫', 'サウンド', '教養', '沿い', 'トム', '侵入', 'Ｙ', 'にわたる', 'ちがう', '光る', '予感', 'リア', '的確', '雑貨', 'ユニット', '互いに', '肝心', '狙い', '訳す', '前進', '在り方', '温暖', '予報', 'フェア', '遅れ', 'こころ', '浸透', 'ミュージック', '最高裁', '係', '警察官', '利', '法制', '照明', 'バックアップ', '調', 'キッチン', '通用', 'クス', 'クリ', 'キャッシュ', 'あらためて', '付加', '木曜日', '施す', '答', '推移', '繰り返し', 'こだわり', '京', '本音', '回線', 'スムーズ', 'ばあちゃん', '色んな', '飛び出す', 'まし', '最大限', '温かい', 'おい', '何事', 'タッチ', '合', '解', '調和', '煙', '信託', 'ぴったり', '一月', '担保', '課程', '案件', 'バトン', '信', '地裁', '欠陥', '肯定', 'に当たって', 'キス', '有限', '発注', '業種', '森林', '牛乳', '決定的', '見込み', 'みえる', '法令', 'バイオ', 'シンガポール', '試し', 'その間', 'ジュース', 'ロング', '地点', '糸', 'レシピ', '背負う', '欲', '独', 'インパクト', '少子化', 'くい', 'サブ', '柔らかい', 'ドット', '辿る', 'かなう', 'かたち', '気配', 'うるさい', '枝', '参議院', '外資', '寮', '慌てる', 'チョコ', 'アイルランド', 'インター', '聞ける', 'きり', 'ヘ', '幼い', '適応', '云々', '掘る', '分解', '右手', '避難', '国鉄', '件数', 'かぁ', '兼', '素', '岩', '臨む', '演習', 'すっきり', '水曜日', '儲ける', 'プログラミング', 'うける', 'ごはん', 'アホ', '中東', '支店', '身分', '農地', 'コツ', '信者', 'メンテナンス', '負荷', 'グラフ', '克服', '話せる', 'ジム', '出来上がる', 'なるべく', '冷蔵庫', '銀座', '私立', '継承', '気候', '志向', '佐々木', '結成', '意向', '夫人', 'ビジョン', '不況', '格', '青春', '階層', 'バッグ', '数多い', 'か月', '弁', '都内', '日頃', 'スタジアム', '抜き', '講談社', '食材', '唱える', '問い', '豆腐', '仁', '靖国', '遭遇', 'あける', '利く', '流出', 'に対しまして', '公立', 'サラダ', '強度', 'しかた', '最強', '改定', 'なぜか', 'どれほど', '泳ぐ', 'ハン', '連盟', '詰める', '往復', '思い切る', '有力', '昨今', 'あっさり', '仮定', '膝', '話しかける', 'シフト', 'オーダー', 'ファミリー', '太い', '告白', 'チェーン', 'ベルリン', '指名', '励ます', '或いは', 'づける', '闘う', '辞任', '嵐', 'マッサージ', '寿命', '安倍', '引き受ける', '撃つ', '現に', 'パーク', '一旦', '大国', '誤り', 'やく', '奴隷', '経', '癌', '変革', '故郷', 'おしゃべり', '係る', '急激', 'ラッキー', '地面', 'とんでもない', '残業', '告知', '大使', 'ω', '媒体', '進学', 'やむ', '労', '刊行', 'じっと', '感激', '但し', '見出し', 'プライベート', '雇う', '砂糖', '嬢', '食糧', '崩す', 'っぱなし', 'エロ', '役者', '原油', '祈り', '弟子', 'どうにも', 'ブリ', '全力', '流行る', '外側', '正規', '申', 'ラブ', 'ゲイ', 'バックナンバー', '世話', 'タイヤ', 'エンジニア', '創業', '準', '贅沢', '警官', 'チャート', 'たしか', '脚', 'わり', '入国', 'アナ', '新年', '相続', '坂', 'アイディア', 'おもちゃ', 'フード', '作り上げる', '工程', 'りん', 'さい', '虐待', '丁目', '定員', '消化', '懇談', 'ロン', '極', '激', '国々', 'カタログ', '秘書', '鶏', '合唱', 'マクロ', '鹿児島', 'のち', '有機', 'それと', '顧問', '開幕', '合成', '厚生省', '大使館', '筈', 'サイエンス', '組み込む', '隆', '投手', '貯金', '取り扱う', '書き方', '内側', '倉庫', 'すく', '始まり', '雑記', 'ホスト', '穏やか', '悲しみ', '放題', '死刑', 'さぁ', '前者', '遺跡', 'サル', 'シンポジウム', '阿る', '帽子', 'セクション', '堂々', '毎日新聞', '認可', '富', '手帳', '定', '大蔵省', '調理', 'こもる', '欲求', 'ギャラリー', 'カリフォルニア', '丘', '正月', '大地', 'カレンダー', 'こんばんは', 'につく', 'かっこいい', '選手権', '軌道', '落ち込む', 'シャツ', '戦術', '防災', '梅雨', 'セン', '飲食', '接近', '飯', '疾患', 'コア', '文部省', '小川', '見出す', 'ピーク', '独身', '吉', '巨人', 'はねる', '消滅', '解体', '眠れる', '曲がる', '先端', '配当', '曖昧', '両手', '藤田', '固い', '褒める', '争う', '在宅', 'クロアチア', '一流', 'スパイ', '覚める', '余', '羊', 'ドキドキ', '殴る', '結合', '控除', '生き物', '庶民', '傑作', '実習', '譲る', 'ボス', '後輩', '複製', 'コマンド', '反日', 'えー', '分担', '漁業', '分権', '再会', '画家', '読売新聞', '香', '学期', 'ラップ', 'ショウ', '仲良く', 'チラシ', 'クラ', '財布', '最低限', '教え', '被災', '固める', '裏切る', '待ち', '目撃', '幸運', 'Ｏ', '申し込む', 'テン', '任意', 'イカ', 'グラス', '六月', 'なおす', '獣', '誠', '始め', '師匠', '中川', '早々', 'デート', '生存', '周波数', '履く', '斎藤', '人員', '黒人', '地理', '取り', '計量', '行き', 'ミュージシャン', '就業', '朝刊', 'つかう', 'スポンサー', 'ＳＦ', '遺族', '開業', '海洋', '飛び込む', '普遍', 'ならでは', '禁じる', '家事', '各社', '定年', '姉さん', 'オヤジ', '東京大学', '適す', '書き', 'フロー', 'いつの間にか', '不快', '海軍', '賃貸', '解答', '伝達', '点検', 'シティ', '信念', 'ポート', '知り合う', 'どなた', '未だ', '死体', '採る', '一郎', '宗', 'レート', 'お手伝い', 'ファースト', 'おば', '外出', 'インチ', '太る', '傘', '親父', '排出', '高額', '遂行', 'ナイフ', 'スピーカー', '傷つける', '成人', '牛肉', '印', 'マナー', '学園', '新書', '入札', '実装', '乗り込む', '決済', 'まう', 'マネー', 'サポーター', '班', '特典', '儀式', '建', 'カラオケ', '実証', 'ハート', 'デル', '針', '辻', 'エントリ', '二度と', '曲目', 'キレイ', '自衛', '笑える', '沈む', '挟む', 'ガソリン', '焦る', '掴む', 'こりゃ', '接す', '新刊', '世界一', '固有', '熊本', 'リソース', 'フレーズ', '董', 'アカデミー', '有無', '中野', '沈黙', '大気', 'おばさん', '中略', '予告', 'ビザ', '工房', '石原', '難民', 'チン', '交わす', '属性', '幾ら', '倒産', '渋滞', '地味', '取り扱い', 'ダブル', '揺れる', '先物', '引越し', '図面', '抜粋', '消防', '起訴', '切り替える', '検出', '多々', '４つ', 'ユニーク', '限度', '整う', 'まえる', 'ダメージ', '左手', '欠点', '水道', '陰', '北部', '取り込む', '要は', '検定', '台詞', '柔軟', 'としまして', 'アーカイブ', '何ら', 'ショット', 'ねこ', '明記', '学力', '分子', '計測', '東洋', 'まさしく', 'ヵ月', 'マニア', '親戚', '告発', '宿題', '追及', '郎', '青木', '牧師', 'もしかして', '対照', '振り', '一家', 'あん', 'ＣＭ', '体育', 'ゐる', 'さらす', 'シャワー', '貴族', '疲労', '賢い', 'フロント', '前述', '特例', '精度', '傾ける', '夫妻', 'よほど', '中途半端', '追いかける', 'ロール', '岐阜', 'ライバル', 'あいつ', 'バックトラック', 'ジャー', '福', '反射', '福田', '使い', '原料', '中立', '心地よい', '曰く', '相違', 'ぶん', '大抵', '特有', '山形', 'ドキュメント', '電', '苦痛', '改訂', 'アナログ', 'ついつい', '脱出', 'づく', '防犯', '汚い', 'フジテレビ', '指針', 'ビン', '主流', '友だち', 'たどる', '浮く', '浅い', 'テンポ', 'この間', '上級', '徳', '全米', 'お薦め', 'なし', '刑務所', 'クレジットカード', 'まじめ', '技能', '出口', '次世代', '専攻', '湧く', 'カネ', 'しめる', '誓う', '尻', '覆い', 'オーケストラ', '強める', 'あんなに', 'リラックス', 'デフレ', '貧乏', 'ギャップ', 'すこし', '太平洋', '山崎', '刊', '婦', '進', 'つまる', 'ドイツ語', '舌', '硬い', 'リフォーム', '苦しみ', 'ファー', '賢治', 'ハリウッド', '一斉', '厳密', 'ボディ', 'クマ', '県民', 'ときどき', '費やす', 'パーツ', 'きっちり', 'ファンタジー', '挑む', '区分', 'おっ', 'トレンド', '司令', 'セル', '分裂', '日本国', '旗', '鎌倉', '気楽', 'Ｌ', '白人', 'かむ', 'アンテナ', 'コンサルティング', '経理', '徴収', '岡山', '具', '利害', '東南アジア', '共謀', '尽きる', '所長', 'あいさつ', 'レン', 'スタンド', '重量', '汁', '一つ一つ', '道徳', 'マリア', '混ぜる', '説く', '再編', 'コマ', 'ロケット', '喧嘩', '生地', 'カ所', '中年', '擦る', 'リアルタイム', '派手', '対決', '店頭', '情けない', 'フォト', '大都市', '相次ぐ', '下る', '還元', 'っ子', '入試', '首脳', 'ワークショップ', '洋', '鍛える', 'この頃', '博', '学級', '丸い', '案外', '苦情', '海上', 'アマゾン', 'バグ', 'エイズ', 'あてる', '同志', 'ハー', 'デー', '〓', '成熟', 'エンド', '工', 'フジ', '目覚める', '長時間', '女王', '系統', '独裁', '嫁', '立', '分布', 'プロデューサー', 'フェイス', '動', '騒動', '妨害', '禁煙', 'はじめまして', 'そこら', '安易', 'ブレーキ', '実体', '返還', '日系', '小屋', '営利', '介', 'タレント', 'おまけ', 'マルチ', '藤原', 'モンゴル', 'アラブ', '野党', '言うまでもない', '力強い', '倶楽部', '譲渡', '役人', '回り', '（株）', '他社', 'ＪＲ', '黄色', '属する', '高価', '亜', '改める', '売り場', '親しい', '公益', 'スクリプト', 'どうにか', 'そうして', '全文', 'たてる', '七月', 'ウィンドウ', '達する', 'ウェア', '心がける', '焼酎', '住', 'パンツ', '土曜', '反面', 'イオン', '迫力', '僕たち', '脱', '支払', '札', 'フォント', '理性', '卒', '方策', '有害', '上げ', '菌', 'クリスチャン', '成', '狂う', 'Ｘ', '乗客', '幸', '布団', '片手', 'かぎり', '終る', 'イヤー', 'スタンス', '座席', '盛ん', '松井', '形状', 'ほら', 'ログイン', 'ナンバー', '推奨', '建て', 'サイクル', '立ち寄る', '常', 'ゲート', '主権', 'もどる', '瞳', '遭う', '開拓', '右側', 'メイク', '原点', '胃', '粒', '夜間', '並み', 'ストップ', '速', '年収', '等しい', '偽造', '出品', '写る', '今年度', '散る', '服装', 'いち', '利点', 'アップデート', '繰り広げる', '短縮', '貨幣', '難', '中旬', '納める', '大した', '青山', '膨らむ', '産地', '生える', '民衆', '九月', '年寄り', '仕上げる', 'まっ', '矢', 'ビット', '厚', '偏見', 'ヘン', '教訓', '坂本', '視察', '八月', '主任', 'リゾート', '響き', '悲惨', '強いる', 'ワクワク', '言論', '翼', '来月', '主題', '早急', '対談', 'ベルト', '選定', '中断', 'ムービー', '条項', '添える', 'のぞく', '保育園', '痩せる', '福音', '診察', '縛る', '東アジア', 'マジック', '正体', '原発', '自作', 'キン', '〃', '生き残る', 'テンション', '土日', 'デパート', '偽装', 'ジャケット', '富山', '作り方', '入会', '不能', 'レジ', '保', 'そろう', '刻む', '捧げる', '葬儀', '起源', '攻める', '国防', 'アカウント', '黄', '系列', '礼拝', '夢中', '持ち出す', 'エコ', 'クレーム', 'ミッション', '煮る', '本年', '複合', 'アイコ', 'リサーチ', '気象', '摂取', '火災', '近藤', 'やり取り', 'オール', '被る', '混む', '裸', 'ごみ', '和解', 'トンネル', 'そっち', '二月', '打', 'バッテリー', 'ノン', '名乗る', '恐縮', 'そしたら', 'タダ', '球団', 'おまけに', '合宿', '飛躍', '真相', '黄金', '補正', 'ゾーン', '家賃', '居酒屋', '簡易', '同日', 'ずれる', 'キャスト', '三郎', '規範', '公衆', '脆弱', 'ことし', '打ち出す', 'ビーチ', '主として', '逃れる', '刺す', '阻止', 'ほっと', '持ち主', '町村', '預ける', '令', '真似', 'ゆとり', 'アメリカン', '添付', '花粉', '塗装', '堪能', '晴れ', '子会社', '存続', '気持ちよい', '国庫', 'ボケ', '石井', 'シミュレーション', '中島', '採択', '識別', '無断', '有す', 'ボート', 'スケール', '引き', '恥', '不便', '焼き', '英雄', '拡充', '造', '涼しい', 'ビッグ', '中山', 'ぢ', '歩行', '今まで', 'ガイドライン', 'そっくり', '青少年', '広域', '名簿', '優位', '雄', '命じる', 'スタンダード', '小生', '行列', 'ドレス', '麻薬', '依然として', '青森', '名刺', '五輪', '配達', 'ＮＰＯ', 'がた', 'ディスプレイ', 'バル', 'よね', '独り言', '誠実', 'せいぜい', '和田', '良心', '頻度', '単行本', 'ごらん', '他国', '皮肉', '連動', '奉仕', '公認', '砂漠', '猿', '局面', '安保', '住居', 'スロー', '発す', '追い込む', '月刊', '是正', '後期', 'わし', '梅', '竜', 'イライラ', '土壌', '詩人', '分配', 'バリ', '締結', '持参', 'エリート', '抗', '左翼', '藤', '霧', 'ブルース', 'まく', '腐る', '定番', 'いくらでも', '割り', 'ライヴ', '修復', '敬意', '貫く', '王様', '小野', '左側', 'プレッシャー', 'ショート', 'ふつう', '明白', '己', '支障', '大胆', '除去', '罰', 'エアコン', '展覧', '納税', 'シカゴ', 'ハンドル', '小遣い', '丁度', 'きちっと', 'からだ', '遠慮', '退屈', '大正', '出会える', '助言', '圧縮', '小規模', '義', '曇る', '小沢', 'ハム', '関わり', 'ゆったり', '明示', 'わたる', 'いちいち', '復旧', '下旬', 'はずす', 'レット', '数量', '司', 'ペルー', '野生', '友好', 'およぶ', '諮問', '最小限', '残高', '祖母', 'ハードウェア', '寄与', '素朴', 'クリーム', '上限', '武力', 'ドキュメンタリー', '近隣', 'ジャン', '不信', 'ストレート', '運賃', 'ポーランド', 'ノリ', 'トーナメント', '要領', '発掘', '劣る', 'ソフトバンク', '茨城', '新築', '取り付ける', '仮想', '叱る', 'コンテスト', 'どころか', '円滑', '直感', 'はく', 'カルチャー', '紫', '佑', 'ホット', '過激', '秋田', '引き継ぐ', '斬る', 'ばか', '忠実', 'ナイト', '付け加える', '読売', '彼氏', 'えらい', '娯楽', '相性', 'パチンコ', '変身', 'たまらない', 'うむ', '収まる', '灯', '弘', 'ベテラン', '見上げる', '債', '大蔵', '生態', '盛る', '挿入', '脱ぐ', 'コンクリート', '受注', '阿部', 'トータル', '不利', '協調', '模索', 'サーチ', '遺伝', '仕掛ける', '発する', '仕掛け', '句', '称す', '廊下', '酸', '地方自治体', '内田', '手配', '国王', '議決', 'をめぐって', '強引', '短編', '痛感', '片付ける', 'かけ', '出生', 'スピーチ', '一括', '刀', '爆笑', '石炭', 'お祈り', '刑', '分る', '綴る', 'リクエスト', '天候', '手軽', '選出', 'かわり', '反する', '浮気', 'ニュージーランド', '看護婦', '殿', '駆使', '登山', 'ヒーロー', '計上', 'パンフレット', '協同', '選任', 'Ｉ', '無償', '合法', 'ステーション', 'パッ', '向き合う', '歴', '送付', '中世', '騒音', '隊員', 'モーツァルト', '外来', 'シャープ', '仲裁', '奥様', '参画', 'キム', '紅茶', '棟', '領土', '井', 'チャット', '集約', '神秘', '家計', '四国', 'でかい', '連想', '同行', '減税', 'いささか', '岸', 'アレンジ', '妥協', 'ベンチ', '検察官', '酸素', 'パニック', 'ビタミン', '鳴らす', '兄さん', '祝', 'テクニカル', '奨励', '歯科', 'セント', 'たどり着く', 'ホルモン', '陸上', '液', '肥料', '同級生', '取り除く', '溜まる', '抽選', 'エレベーター', '氏名', '軽', '親友', 'におい', '直接的', '西部', '黒字', '移籍', 'そうですね', '顕著', '預かる', 'ホッ', '丼', '切れ', '絶対に', 'ｃｍ', 'フォーマット', '潰す', '見込む', '航空機', 'らん', '畳', '農薬', 'コチ', '少', 'セールス', '靖国神社', '総括', '当てはまる', '軍人', 'もてる', '折る', '僅か', 'そうなると', '雑談', '見逃す', '酷い', '計る', '国道', '無名', '固まる', '性別', '弔', '好奇', 'まっすぐ', '幻', '気持', 'ストック', 'みなさま', 'みずから', 'ロバート', 'にあたる', '通報', '替える', '攻略', '虐殺', '構える', '受け付ける', '適合', '思いっきり', '滑る', '逃す', '一員', 'まる', '水分', '足す', '核兵器', 'お祭り', '周知', '洋服', 'ほん', '性的', '置き換える', '皇帝', 'ＥＵ', '発覚', '当たり', '足元', '乏しい', '日誌', '太田', '闘い', 'ウェイ', '余談', '数多く', '外見', '読み', '目安', '滝', 'デザート', '知性', '満つ', '薬物', '敏感', 'ミリ', '来年度', '乳', '醤油', 'ぜんぜん', 'ついてる', '品目', 'トライ', '総長', '衝動', '点数', 'フィンランド', '主観', 'スカ', '収納', '岩手', '税率', '西村', '今更', 'ボン', 'ナン', '題名', '部員', '豊', '横断', '担任', '翌年', '文脈', '容器', '基調', '酔う', '無関係', 'お陰', '閣僚', '兼ねる', '内面', '活', 'アイス', '許容', '選考', 'さほど', '宝', '本能', '思い込む', 'レンジ', 'につれて', 'ねらう', '将棋', '混じる', 'キャンセル', 'うた', '医薬品', 'かわいそう', '条文', 'いじる', '開店', '合流', '亭', 'しつこい', '心地', '遂げる', '競合', 'たいした', '浩', '干渉', '車内', '将軍', '卒業生', '謝る', '負傷', '騒ぎ', 'ブース', '部署', '新着', 'テロリスト', '飲み物', '熊', '原価', '商工', '先ず', '喉', 'お祝い', '入り込む', '任命', '路上', '差す', '通産省', '上野', '震災', 'ライフスタイル', 'はぁ', '長女', '彫刻', 'リニューアル', '就く', '大和', '労使', '傷つく', 'どっか', '品物', '職種', '商法', 'ガル', '航海', 'クイズ', '近', '飲める', '山下', '弾圧', 'カンボジア', '芸', '賛同', '南北', '短期間', 'カウンセリング', '津波', '景観', '予言', '原子', '判', '大声', '審理', '実在', 'ウィーン', 'ミルク', '本田', 'リストラ', '議題', 'プラットフォーム', '戦場', '六本木', '下ろす', '破産', '景', '果物', '給食', 'アンド', 'α', 'フェスティバル', '喫茶店', 'セイ', '筆', '開会', 'ミュージカル', '亀', '出願', '単価', 'キャッチ', '防御', '構図', 'ゴム', 'おしゃれ', 'たけ', '連日', '外相', '餌', '微笑む', '身長', '合間', '名作', '恒例', 'トピック', '台所', 'すか', 'メガネ', 'かの', '抽出', '刃', '敗戦', '密接', '涼', '永田', '初回', '水平', 'ロゴ', '流動', '訴え', 'ちまう', 'コンパクト', '好ましい', 'リチャード', '噛む', '満', '法曹', '励む', '敷く', '祝日', '留まる', '現われる', 'よって', '測る', '東西', '無意味', 'に際して', '新設', 'ジン', '土台', 'よし', '着物', '名目', '不在', '引き続く', '制服', '何で', '前田', 'カイ', '体内', 'ケイ', 'いやいや', 'お湯', 'ぶつける', 'パスタ', '国旗', 'モール', '補給', '〒', '始末', '題材', 'デンマーク', 'たばこ', 'おはよう', '祖父', '受け継ぐ', '比例', '機動', '調節', '日本銀行', '造り', '歳出', 'ナウ', 'すっごい', '有難う', '艦', '入荷', '願望', '一行', 'ホームズ', 'モジュール', '理科', 'サミット', 'すいません', 'ソング', '別途', '官庁', 'サム', '武士', '蕎麦', 'やばい', 'フォロー', '同等', 'ストリート', '芝', 'カトリック', '無責任', 'メソッド', '処', '提唱', '募金', 'すすめる', '市販', '日刊', '銭', '他の', '入居', '助手', '成田', 'アド', 'パスポート', 'ギリギリ', 'モスクワ', 'アレルギー', '特権', '聞かす', '管轄', '位置づける', 'ラウンド', 'はて', '汚れ', 'フォン', '政', '尾', '建つ', '真に', 'マラソン', '引っ越す', 'にわたり', '連帯', 'らい', '着実', '人件', 'Ｗ', '技法', 'あまりの', '不具合', 'オフィシャル', '検', '時事', 'プレゼン', 'フライ', '副作用', '関節', '濃度', '戦士', '十月', '中毒', '社会党', 'あたかも', '登校', 'プレゼンテーション', 'バナナ', '味噌', 'プライド', '不定期', 'イチ', '追跡', 'とぶ', '旬', '延期', '松田', '各自', '馴染み', 'お互いに', 'ともあれ', '値する', '繁栄', '暴走', 'ヤフー', '免疫', 'ターン', '老', 'いじめ', '着手', '新型', 'のせる', '教わる', '中盤', '江', '河', 'のぼる', '優', 'チリ', '桁', 'おかしな', '均衡', 'プラスチック', 'ロビー', '到来', '弦', '建造', '精一杯', '用事', '下りる', 'さっさと', '商人', 'タワー', '上田', '馬場', 'つなげる', 'お疲れ様', '指向', '中核', '勘定', '運行', '兄ちゃん', '早', '時に', '十二月', 'ムード', '同情', '学歴', '入口', '止む', '接する', '有用', '農', '更', '恩恵', '強まる', 'いやー', '法務省', '炉', '領', 'うかがう', '開', 'もる', 'ニック', '好調', '言動', 'お笑い', '養う', '弱者', '代行', '経歴', '片方', '気の毒', '害', '食欲', '返答', '不自由', '容認', '自律', '茂', '如何', 'フラッシュ', 'うそ', '隣接', '順序', '前期', 'そっと', 'リビング', 'メモリー', '然', '無知', '秋葉原', '宮城', 'リス', '中部', '坊', '同居', '責める', '遺体', '追いつく', '創', '寺院', 'きのう', '金沢', 'とどめる', '役目', 'ふたつ', '乗り', '澤', 'ご存じ', '即ち', '途端', '住人', '事典', '上陸', 'Tシャツ', '打撃', 'あちら', 'セブン', 'こっそり', 'ハッピー', '最小', 'テレビ局', '保安', 'ボリューム', '模型', 'ミラー', '気力', 'じゃう', '西欧', '鮮やか', '国有', 'メタ', '診る', 'ドラム', '向う', '聴取', '物資', '晋', '知能', 'サロン', 'アフガニスタン', '決着', 'テル', '教徒', '査定', '心身', '唐', '折', 'マック', '交える', '抑圧', '月曜', '念頭', 'ローズ', '出', '環', '見送る', '一昨日', 'アニメーション', '連結', '増税', '債券', '好意', '楽曲', '登', 'ラグビー', 'めん', 'いし', '魔女', '喪失', '前方', 'ハンド', '竹中', '助教授', '日本酒', '立体', '断念', '恐い', '法務', '押し', 'ブロード', '除外', 'バトル', '春の', '汚れる', 'ランプ', '音響', '断熱', 'テント', '急増', '結びつける', '呼び出す', '混雑', '犯行', 'エビ', '当方', '欧', '生理', 'たたく', '算定', '帝', '暫定', 'まわす', '安価', '内蔵', 'ハードディスク', 'はたして', 'さらなる', '越す', '足る', '隙間', 'オーストリア', '中期', '許せる', '交差点', 'のり', '上達', '補う', 'ラリー', '祝う', 'ゞ', 'トリノ', 'タンク', '黄色い', '評議', '友情', 'ましてや', '助', '切ない', 'フィギュア', '通行', '宏', '書物', '大豆', 'アマチュア', '漏れる', '付与', '想う', 'うっかり', 'おなか', '虎', 'もとより', '東海', 'あっち', '万博', 'のど', '都心', 'タオル', 'ドコモ', 'エージェント', '暴露', 'コミュニティー', '青空', '永久', 'ボストン', '内外', '終始', '交際', '続', 'ジョーク', '了', '書記', '動員', '未知', '言い換える', '抜本', 'ステキ', '発動', 'ギフト', 'パイ', '大島', '陸軍', '県立', 'パイプ', 'ベイ', '孤立', 'シンボル', 'お子さん', '矯正', '仮面', '煙草', 'イチロー', 'ドクター', 'レイアウト', '集まり', '次期', '広大', 'よそ', '教科', '多発', 'アメ', 'ヘルプ', 'あいまい', '岡本', '訊く', 'ゴールド', '救急', '原爆', '罰金', 'ぎりぎり', '単一', 'ピッチ', '注射', '受験生', 'リーダーシップ', 'ジェイ', 'しばし', '歩道', 'モラル', '守', '特色', '探検', '閣議', 'あわてる', '竹内', '出入り', 'サンタ', 'シャー', 'ミステリー', 'ペア', '資質', '加', 'アク', '反す', 'シール', 'シルバー', '変る', '大騒ぎ', '並', '劇的', 'はや', '即座', 'とめる', '戦力', '損なう', '選び', '堀', '後退', 'やん', '公明党', '原文', '散策', '画期的', '打ち込む', '火星', 'たか', '閉める', '追悼', 'マイクロ', '余りに', '引き上げ', '文字通り', '起床', '駒', '眼鏡', '練る', '集計', '浜', '新興', 'マスク', '後継', '宮本', '本土', '断言', '露出', '免除', '惜しむ', '器具', '行える', 'ちなむ', '優遇', '帰還', '中でも', '何時', '課す', '率いる', '富む', '痛む', '頭痛', '律', '四半期', '宴会', '鹿', 'うらやましい', '補完', '受け入れ', 'はやる', 'うたう', 'くじ', 'スカート', '不自然', '個体', 'ネーム', 'とまる', '引っかかる', '落札', '割れる', '需給', '三浦', '著名', '唇', '完結', '嘆く', '広まる', '外貨', '作文', '通路', '気合', 'Ｖ', '立案', '全額', '通話', 'リターン', '愛国心', '充電', '意味合い', '色彩', '食物', '在る', '参戦', '共存', '蓋', '症候群', 'ってな', '繋ぐ', '手がける', '木材', '敗北', '化す', 'こす', '浸る', '昨晩', '荒川', '高騰', '退院', '所管', 'ヒロイン', '妨げる', '品種', '遺憾', '見極める', 'ひょっと', 'つぶす', '包括', '臓器', '爪', 'ドラゴン', '指令', '書房', '見受ける', '退場', '突く', 'ベストセラー', '親しむ', '選べる', '宜しい', 'コンタクト', 'マット', '市役所', '竹島', 'なくす', 'リカ', '書面', '盛り上げる', '事象', '留意', '体操', '不審', '治す', '社説', '芽', '乗れる', '痛', '颪', '芸術家', '異動', '完', 'インターナショナル', '陸', '多大', '抜群', '火山', '労務', '野田', 'テンプレート', '冷凍', 'ベルギー', 'いまいち', '年賀状', '七夕', '苦', 'ハッキリ', 'うし', 'パイロット', '出し', '日本一', '徹', 'パーマ', '説教', '一昨年', 'こたえる', 'どん', 'クレジット', '登記', '仲介', 'エイ', '半導体', '何かと', 'ナイ', '炒める', '放射', 'ホンダ', '劇団', '自発', '明ける', 'ロマン', '髪の毛', '如し', 'アリス', '物体', '救助', '見合う', '同年', '一同', '奮闘', '野村', '騎士', '順次', 'ドーム', '装着', '圧倒', 'なう', '間近', '決心', 'フルーツ', '容赦', '均等', '偏る', '切符', 'キット', '乾く', '池袋', 'に関しまして', 'カスタマイズ', 'ディスカッション', '給', '兵隊', 'よくなる', '空中', '別々', '隼', '朝鮮半島', '荒れる', '押し付ける', '差異', 'タスク', '良好', '実効', '敗', '隅', '組み立てる', 'なにしろ', '波動', 'ネイティブ', '狩り', '創立', '連発', '年々', '装飾', '瞑想', '関税', '夕刊', '変数', 'いまだ', 'ハル', '利子', '無数', '後方', 'ちょっぴり', '衣', '外観', 'わざと', '簿', 'ジョー', '契機', '金子', '就労', '紅', '体感', '切り', '購買', '誠に', 'ポップ', '織る', 'てん', '間隔', '運輸', '感触', 'フラット', '一般人', 'バンク', '有益', 'お天気', '放射線', 'トリ', 'てい', '巡回', '坪', '呑む', '旨い', 'トランス', '要旨', '狼', '泥棒', '東証', 'ギャグ', '餅', '上演', '密度', '菜', '相撲', 'ませる', 'ジェット', '出掛ける', '警視庁', 'プラグ', 'ライオン', '稼げる', '解ける', '晴', 'エア', 'カーテン', '市街地', '対外', 'センサー', 'がっかり', '重複', 'ｇ', '簡潔', '甲', '梁', '憂鬱', 'プロデュース', 'お詫び', '三重', '勢', 'ウィルス', '桃', '斜め', 'ばっかり', '裏側', '創出', 'バルセロナ', '外人', 'フロア', '大根', '贈り物', 'アスベスト', '切手', '根底', '営む', 'こい', '半数', '因果', '繊細', 'おける', 'バレる', '国交', 'ＮＴＴ', '傾く', '転じる', 'フォード', '裁量', '最先端', 'モダン', '暗殺', '出店', 'タマ', 'カメラマン', '互換', '秀', '再発', '共済', '道場', '果て', '効用', '名詞', '結末', '済', '離す', '凝る', 'いのち', 'モンスター', 'だます', '水木', 'ツボ', '休業', '今頃', 'おとなしい', '両立', '高原', '怠る', 'テレ', 'キック', '拒絶', '隊長', 'タカ', '貯蓄', '修了', '南米', 'つまむ', '題す', 'グラム', '問合せ', '立ち止まる', 'クッキング', '強盗', '芸能人', '篇', '上部', '由', 'オープニング', '格安', '共生', '放出', 'ゴー', '属す', '次ぐ', '学長', '駆ける', '挫折', '誘拐', 'ハマる', '愚か', '河野', '富士', 'ハイテク', '通称', '母子', 'みつ', '震える', '不可', 'ミックス', 'バレ', '厳格', '美味い', '出題', 'むく', 'まんま', '貴', 'しんどい', 'トニー', '近郊', 'レギュラー', 'ホラー', 'ラム', '半島', '周期', 'くだ', 'つくづく', '到底', '読み返す', 'しん', '待機', 'アブ', 'こめる', '群馬', '専業', '判例', '素早い', 'ふれる', '極力', '高値', '阻害', '地名', '常時', 'ワード', '屋台', '立地', 'よっぽど', '急遽', '食生活', 'ディレクター', '例年', '濡れる', 'おいで', '藩', 'リハビリ', '功', '持ち帰る', '曲げる', 'いまや', '税理士', '次男', '医学部', '舛', '算数', '是', '仕上げ', '皇室', 'おろす', '木造', '経路', '有り難い', '踏み込む', '風味', '液体', '短時間', '四つ', '締め切り', '野郎', '進路', '悪意', '動詞', 'ロケ', '交響曲', '雷', 'めくる', '安田', 'はさむ', '先祖', '昼寝', '洗練', 'ノーベル', 'あらわれる', '折れる', '結晶', 'サンフランシスコ', '麻', '格闘', '加害', '頬', '法科', '配偶', 'ふり', 'メス', '腓', '乙', '欠如', 'フランク', '捜索', '見なす', '間もなく', 'とらわれる', '満員', '嫌悪', '代理人', 'ハーブ', '肝', '有名人', '判事', 'クン', 'ネギ', '文化財', 'ラベル', '東芝', '先般', '四季', '広める', '所要', '転がる', 'マザー', '猛', '目当て', 'リンゴ', '川口', '子孫', '加減', 'ストーン', 'お越し', 'おなじみ', 'オーラ', '下回る', '異様', 'めちゃくちゃ', 'さておく', '弊害', 'ぼんやり', '酢', 'はた', '所詮', '瓶', '陰謀', 'ピックアップ', 'ニュアンス', '増殖', '十一月', '整合', '介す', '通学', '残酷', '啓発', '偽', 'カッ', 'まり', 'あたりまえ', 'カロリー', '絶滅', '寸前', '曲線', '郵送', 'ポーズ', '満点', '指輪', '親族', '口頭', 'マイナー', '初代', '秘める', 'だんな', 'チキン', 'かし', '公判', '右翼', '対比', 'ラボ', '農産物', 'できあがる', '愛用', '水面', '宛', 'ホー', '賭ける', 'ルイス', '圧迫', '虹', 'つぐ', 'ふく', 'フィルター', '稼ぎ', '療養', '眞', '発症', 'バンコク', '風俗', 'アクセサリー', '有意義', '稼働', '飼育', 'Ｔシャツ', '卸売', '一律', 'カズ', '葛藤', '引きずる', '石田', '集落', 'ニッポン放送', '探索', '極東', '活力', '舞', '実例', 'じつは', '羨ましい', 'わたくし', '戦車', '捕まえる', 'くま', '長谷川', '自称', '口調', 'フリ', '端的', '膜', 'カリキュラム', 'もとづく', '修士', '宝石', '警察庁', 'スミス', '根源', '不倫', '低迷', '停滞', 'アイデンティティ', '正に', '落語', '苦悩', '益', '稀', 'フライト', 'メン', 'コイン', 'ホン', 'ノイズ', 'プロモーション', '教団', '正社員', '鮮明', 'すぐれる', '御存じ', '悪質', 'ジャーナリズム', 'イマイチ', '圓', 'ジーンズ', 'プロレス', 'アナウンス', '市川', 'ほめる', 'ストア', 'ゲル', '５つ', 'はなれる', 'ノルウェー', 'ヤン', '同感', 'エリ', '勧誘', 'なのに', '終戦', 'コンビ', 'っぷり', '対す', 'ネオ', 'おやじ', '劣化', '滋賀', '源泉', '負', '真っ赤', 'たて', '勤労', '義務教育', 'にまつわる', '炭', '名義', '敢えて', '取り巻く', '人質', 'はっ', 'まもなく', '巣', '度合い', '増強', '若', '祝福', 'アマ', '斉藤', '莫大', '梅田', '音色', '戦時', 'ちっとも', '創刊', 'ちん', '杉', 'チェコ', '明かす', '危うい', '後藤', 'ドリンク', '売春', '書士', 'ディズニー', '通り過ぎる', '太鼓', 'ヴァイオリン', '旅館', '岡', '併せる', 'パブリック', '革', 'ブリッジ', '境', '討議', '湿度', 'ゆき', '情緒', 'カリスマ', '貯める', '熱意', '必見', '飲料', '屋敷', '飼い主', 'ダンナ', '込み', '明け', '振り回す', '弱点', '問い合わせる', 'ドラッグ', 'さき', '敗れる', '共演', '正日', '一族', '替え', '漢', '手入れ', '異性', '嫉妬', '機材', 'なら', '西側', '平行', 'だからといって', '街道', '摂る', '大震災', '幹', '万全', 'チャンピオン', '毎朝', 'かす', '頭脳', '対等', '根性', 'ハリー', 'エース', 'おこる', '一目', '動ける', '推理', '配給', 'ユーモア', '調停', 'イデオロギー', '早起き', '親指', '活字', '時折', 'なおかつ', '今井', '割り当てる', '県警', '専念', 'きみ', '空き', '河川', 'パンチ', '慰安', '通達', '売り', '捕まる', '所持', '敗訴', 'ヒル', 'すげる', '試写', '並行', 'とたん', '先制', '可決', '差し出す', '北米', 'ユニ', '一口', 'エンディング', '長所', '取扱い', '全集', '母さん', '出番', '負債', '楽譜', 'クリップ', '貨物', '紳士', 'いやぁ', 'それなのに', '久', 'もっぱら', '風土', '庭園', 'バラバラ', 'フィードバック', 'すい', '安藤', '民法', '弓', '遂に', 'いかん', 'フー', '風潮', 'ブラウン', '変形', 'しょっちゅう', '富士山', '小学', '思惑', '日本海', '産経新聞', '参', '花見', '大賞', '麻痺', '教官', '舞う', '暦', '溶ける', 'まつり', 'いっそう', '効力', '学院', 'スリー', 'グラフィック', '藤井', '錯覚', '当分', '潜水艦', 'おおむね', '愚痴', '煽る', '清掃', '字幕', '乗車', '次郎', '募る', '如何に', '混合', '愛媛', '何者', '機内', '試行錯誤', '刑法', '小物', 'ばん', '楽観', 'ヒルズ', '死後', '人体', '試算', '衆院', '満喫', 'ガキ', '秘訣', 'パキスタン', '酸化', 'お寺', '庵', '救い', '苗', '合わせ', '前年度', '溝', 'ギャンブル', '金曜', '小倉', '高裁', '屋上', 'お断り', '実物', '集積', '態勢', '超過', 'タブ', 'おくれる', '久保', '頂点', '白書', '前面', '驚異', '問いかける', '絶えず', '政令', 'シェフ', '外科', '未熟', '文芸', '本店', '新品', '読み方', 'ランダム', '陽気', 'ヨガ', '皆さま', '浮上', '互い', '利便', '換算', '平安', 'おじいちゃん', '常任', '遡る', 'につれ', '死ねる', '魔術', '補佐', 'カウンセラー', '動き出す', 'ズボン', '排水', 'サクラ', '多額', '湾', '続々', '復元', '悪影響', 'ユース', '機体', '市立', 'キレ', '直径', 'マスメディア', '待遇', 'ラス', '喫茶', '直線', '於く', '栄光', '公募', '何でも', '音楽家', '何気ない', '泥', 'さよう', 'シャッター', 'ヨルダン', '内装', 'パブ', '第一歩', '団塊', '付す', '補強', 'おいおい', '常連', '名物', '平野', '多彩', '売', '家畜', '人びと', '罠', 'お部屋', '同氏', '残', '高木', '沿岸', 'いじめる', '＄', '壮大', 'ふた', 'フリーター', 'ポジティブ', '過度', 'コラボレーション', '続編', 'ちと', '代目', '団結', '人柄', '情報処理', '西日本', '熱狂', '立て', '舎', 'ウクライナ', '当る', '祖国', '委ねる', 'キリ', '志望', 'カール', '清潔', '期日', '良質', '貝', '当店', '本棚', '機密', '宮殿', 'カウント', '復讐', '心境', '密か', 'ひとこと', '着用', 'カーブ', 'おいら', '号線', '聞き取る', '下着', '建前', 'マルクス', '好感', 'ため息', '稿', '精密', '配列', '食卓', 'わくわく', '今晩', '三菱', '着目', '夢見る', '語彙', '共同通信', 'スー', 'クリニック', '豪', 'まれ', '餃子', 'ガーデン', 'ガイドブック', '康', '方言', '随時', 'ニッポン', 'ステレオ', '重力', '漠然と', '皆無', 'プロフェッショナル', '承諾', '店主', '最善', '真摯', '戸田', 'グレー', 'フィット', '脅迫', '双子', '脱線', '量的', '緑色', '過言', '彰', '会費', '物語る', '見渡す', '前作', '提訴', '麻生', '方程式', 'フォーク', 'ことに', '反響', '近辺', 'ァ', 'ビニール', '両面', '亮', '過ごせる', '密着', '摩擦', '糖尿', 'ｋｍ', '蛇', 'バッハ', '死去', '遠藤', '甲斐', '達人', 'レーザー', '表れる', '誘惑', '進捗', '脅かす', 'つぎ', '終', '玄', '懸賞', 'ナショナル', '田村', 'オート', '切り離す', 'ハナ', '凍結', '模倣', 'おっさん', '各々', '鳴く', '学べる', 'たす', '延々と', '消極', '駆けつける', '国外', '談合', '客席', '女神', 'に関し', '冷戦', 'キャプテン', '引き取る', '電流', 'ぜひとも', '見地', '衰退', '心情', '新潮', '重み', 'かって', 'つねに', 'セカンド', '深まる', '労力', '浮かべる', '見当たる', '松下', '国歌', '格段', '栗', '定例', '伊', 'コンポーネント', '競う', 'ウラ', '陪審', '懲役', 'ダイレクト', '最良', '味わい', '買', 'ラッシュ', 'ちがい', 'ボトル', 'マリ', '群れ', '育', '日数', '来店', '現物', '慶', '堅い', '末期', 'うつ病', '大げさ', '水産', '手助け', '乱', '遅刻', '家屋', 'カート', '直る', '次長', '非公開', '表彰', '公安', 'やむを得ない', '式典', 'くさい', '一角', '歯医者', '解約', '簑', '長距離', '反復', '本年度', '取扱', 'ダーク', '絶賛', '無罪', '持ち上げる', 'ディレクトリ', '有罪', '国益', '悩ます', '目前', 'くだらない', '投与', '甲子園', '塊', '伝承', '所在', '乗り換える', '栃木', '懇親', '淳', 'われ', '架空', '津', '乗り出す', 'コーン', 'きん', '上空', '美女', '絶妙', '楽章', '陳述', 'ポピュラー', 'スマート', '暖房', '叶う', '細部', '菓子', '生息', 'ともなう', '虚偽', 'ふやす', '継ぐ', '教職員', 'ややこしい', '情', '一歩', 'フィル', '反動', '地道', '巧み', '笛', '神田', '孝', '不調', '算出', '撤去', 'スローガン', '法定', '何やら', 'ガード', 'になう', 'オオカミ', '埋まる', 'ジュニア', '一時期', '栄', '出向く', '事案', '租税', 'タイル', '且つ', '極める', 'いつのまにか', '命名', '高層', '稼動', '無縁', '躊躇', '数少ない', '浄化', 'はやい', '呟く', 'アルミ', 'いか', '十字架', '速やか', '則', '傍聴', '房', '連鎖', 'ピース', 'バター', '屋外', 'コンクール', '鉱山', '野口', '過酷', '適度', '本名', '任期', '請願', '象', 'デフォルト', 'インターフェース', 'はてな', 'ファイナル', 'うわ', '冷える', 'なおさら', '添加', '燃焼', '幽霊', '自力', '分け', '立証', 'ひとつひとつ', '神聖', 'フィクション', 'マルチメディア', '寿', '採点', '操る', '徒然', '峰', '暫く', '案の定', '視界', '芯', '打ち上げ', 'あて', '礼儀', 'コメ', '味わえる', '使い勝手', '監修', '水泳', '握手', 'アカ', 'くっつく', '身内', '沸く', '暴行', '大塚', '紀', 'インク', 'オス', 'ナチス', '牧場', '戸惑う', '移譲', '惜しい', 'バーチャル', '値上がり', '主力', 'パレード', 'きまる', '相関', 'スケート', '補欠', 'プレミアム', '広', 'すすむ', 'スイング', '大物', '方位', '土木', '呆れる', 'ブー', 'イスラム教', 'めでたい', 'アナウンサー', 'パーソナル', '俳句', '恵み', '腸', '北欧', '様相', 'ありま', '農場', 'ルイ', '対面', '工芸', '自我', '鐘', 'おしまい', '追い出す', '流石', '出展', 'ずーっと', '論者', '貰える', '肺', '正統', '捜す', '着ける', '断片', '腐敗', '帯びる', 'ミル', '責務', 'リスニング', 'クシ', '戦線', '年月', '車線', '駐在', '聴衆', '襲撃', 'ささやか', '中傷', '託す', '落下', 'ライダー', '党首', '麦', '主宰', 'ウォーター', '終盤', '日月', '悪口', 'Ｕ', '謙虚', '締める', '神戸大', 'じん', '血管', '幕府', 'たりる', '遵守', '火事', 'からむ', 'メロディ', 'ネス', '今さら', '原田', '復習', 'うさぎ', '快感', 'すき', '欠席', '沢', '位置づけ', '人組', '早く', 'ワクチン', '釣る', 'そろえる', '種々', 'ベランダ', 'アドバイザー', '糖', '漬け', '猶予', '詞', '開花', '洪水', '起用', '一通り', '球場', '内科', 'シニア', '瀬', '潜む', '体育館', 'あれだけ', '物足りない', 'おきる', '仕入れる', '下げ', '先立つ', '交通省', '合致', 'マインド', 'つきあう', 'なにやら', '大人気', '智', 'しみじみ', '燃やす', '止め', '岩波', '切', '三角', 'ウォン', 'あらわす', 'リック', '快楽', '力学', 'ナシ', '朗読', '部落', 'ボブ', 'ヘリ', 'ヲ', '油断', '神学', '乱暴', 'すける', 'ダイヤモンド', '音質', 'ウッド', '慣習', 'ラマ', '連れ', '神殿', '道のり', '法規', '目線', '紅葉', '思い浮かべる', '争点', 'ハッ', '物流', '入浴', '厳選', 'ワイヤレス', '合衆国', '送り出す', '医院', '輝き', '打ち上げる', '漏れ', '立ち向かう', '撤回', '君たち', '何もかも', '積み重ねる', '税収', 'レーニン', 'まかせる', '小島', 'いむ', '処罰', 'グラウンド', '採取', 'と同時に', '義務づける', '手書き', 'フラ', '無理やり', 'ミネラル', 'ピザ', '甘える', '準決勝', '在籍', '帰属', '踏み出す', 'どる', '集う', '経常', '初頭', '頼り', '申込む', 'レール', 'ざっと', '覚え', 'ゆえに', '冷める', '法学部', '東部', '巨額', '切断', '罰則', 'インデックス', '嫌がる', '内心', '成す', '尊厳', '校舎', 'ばれる', '猪瀬', 'ドライ', '敗退', 'さわやか', '地形', '静', '和歌山', '大野', '不祥事', '張', '目玉', '起因', 'ネガティブ', '絆', 'プレート', '南京', 'カエル', '暗示', '女子高', 'レモン', '規律', '見当', '女房', '優雅', '留める', '敵対', 'シドニー', '聴ける', 'ヒアリング', '気持ちいい', 'おわる', '償還', 'ＰＲ', 'スリ', '驚かす', 'ぽん', '全日本', '帰り道', 'つとめる', 'バレエ', '町内', 'ほほ', '写す', '昇る', '税務', '工法', 'デメリット', '肖像', 'もも', '知らす', '外食', 'モーター', 'クリス', 'キープ', '奏者', '所見', '区間', 'ハンガリー', '浮かび上がる', 'うま', '解剖', '威力', '永', '異論', 'ビジネスマン', 'ビートルズ', '翌', '儲け', '市街', '持ち歩く', '飾り', '肥満', '恵', '人事院', '拳', 'キャベツ', 'エキサイト', '深', 'らっしゃる', '余分', '無難', '転', '成し遂げる', '一晩', '断定', '誉める', 'ヶ所', 'たがる', 'ドラえもん', '帰れる', '銀河', '昭', '現す', '満開', '野外', 'こん', '妖精', '薦める', '片', '爽やか', '薄', '追放', '高田', '探求', '加算', '運動会', '便り', '真っ白', '湘南', '農林省', '家内', '博多', 'ぬる', 'プログラマ', '扶助', '取組', '格闘技', '声優', '出回る', '冷やす', '華やか', 'リーディング', 'ナショナリズム', 'プラザ', '墓地', '強行', '絶える', '近づける', '忍耐', '風水', 'けっして', '月額', '無関心', '御礼', 'シアター', '回戦', 'ドリーム', 'スキャン', '作物', '団地', '褒美', '枯れる', '濃厚', '有権者', '積み上げる', '受容', '採決', '無用', '駆る', '上流', '拭く', 'カタカナ', '鳥取', '電圧', '逃げ出す', 'パラメータ', '自民', 'でかける', 'シネマ', '線路', '催す', 'サーフィン', '納豆', 'マネ', '配送', '食器', '最高裁判所', '遠征', '積もる', 'トピックス', 'つぶれる', 'ライス', 'ビラ', '手足', 'ウィリアム', '回想', 'めったに', 'ただただ', '芸人', '愉快', 'やす', 'シャンプー', '越し', '盾', '名曲', 'カレッジ', '図式', '詰め', '接客', '唄', '徳島', '懸命', '薫', 'なんらかの', '喰う', '併用', '平凡', '働きかける', 'わる', '時価', '少い', '刺身', '下降', 'ピラミッド', '仮名', 'インテル', 'タコ', 'ロイヤル', '面す', 'ぞう', 'レーベル', '政治家', '戦犯', '評', 'デッキ', 'リース', '彩', '翌朝', '迄', '詰', '改修', '遠隔', '拠出', '考古学', '危惧', '純正', 'コス', '蛙', '上旬', '大家', '入金', '粒子', 'わがまま', '転ぶ', '閉店', '百貨店', '官邸', '悟る', 'たびたび', '不完全', 'そいつ', '配備', 'パチ', 'やけど', '閉まる', 'クッキー', '善意', '函', '予め', '聡', '日の丸', 'ミラノ', '馬券', '礼', '綿', '万が一', '若年', '命題', '湿る', 'ハッカー', '先程', '広範', '価', '民家', '松山', 'っきり', 'プロセッサ', '精', '焼肉', '法学', '狂気', '洞', 'ゴールデン', '暗闇', '筆頭', '創価学会', 'レコーダー', '撮れる', '水槽', '返品', '採算', '籠', '押しつける', 'フラン', '上院', '焼', '暗記', 'いくらか', '爆破', '出動', 'ソフトウエア', '動揺', '結城', '音源', '銅', 'ピアニスト', '着陸', '捏造', '星野', '耐久', '資材', '講', '無力', '教諭', 'みかん', '小道具', 'ネクタイ', 'お宅', 'もち', '強要', '名人', '言説', '大工', '差し上げる', 'いっそ', 'ナノ', 'はん', '内訳', '室長', 'わん', 'アトピー', '浜松', '投じる', '吉川', '救出', '財務省', '着替える', 'お正月', '超越', '亡命', '足跡', '優良', 'ウォール', '預言', 'マレー', '言い分', '薔薇', '名付ける', '昆虫', '作動', '映し出す', '水素', 'わぁ', '婚約', 'まじ', 'コップ', '岡崎', '撒く', 'フセイン', '活気', '製薬', '思い出せる', 'ループ', '接種', '仕上がる', 'エール', 'オウム', 'カルト', '込', '伝道', '延ばす', '悲鳴', '乾杯', '不適切', '総研', '味付け', '口コミ', 'ぐっと', 'フレンチ', '宜しく', 'アラビア', 'さく', '商社', '本題', '暴動', 'わっ', '艇', '短', '赴任', 'ティッシュ', '地価', 'ダイナミック', '損傷', 'ゲイツ', 'カラス', 'おばあさん', 'つと', '選抜', '大橋', '空白', '片山', 'ピッタリ', 'キムチ', '脱却', '余儀ない', 'カギ', 'オリーブ', '部数', '多摩', 'ムダ', '薬局', '早稲田', '救急車', 'ちょい', '理系', '離れ', '枕', '攻め', 'マクドナルド', 'リッチ', '無言', '蝶', 'いまさら', '試練', '歌声', 'ためらう', '初級', '免れる', 'ざる', '失望', '生き生き', '院長', '直行', '寛', '見舞い', '多用', '却下', '洞窟', 'それどころか', 'アナリスト', '細か', 'ネーミング', '零細', '好く', 'ハーフ', 'みつける', '走り回る', '張り', '類型', '抜け出す', '昼休み', '消耗', '撤廃', '即す', '仰る', 'たら', '畜産', '利権', 'スルー', '啓蒙', '曜日', '弾力', '全開', '厄介', 'ゝ', '熊谷', 'エンターテイメント', 'カ年', 'またもや', 'ロープ', '近畿', '先方', 'ストライキ', '染める', '響', 'フィルタ', 'ミン', '山梨', '柴田', 'イブ', 'ディナー', 'こないだ', '勘弁', '頂上', 'お子様', '思いやり', '海水', 'ウラン', 'いままで', '地盤', '世田谷', 'りんご', '路地', 'ディーラー', 'ならびに', 'なめる', '事後', 'バイオリン', '未定', 'くくる', '盛り上がり', 'リアリティ', 'パッチ', 'キューバ', '紀行', '揚げ', '受けとめる', 'リマ', '享受', '喚起', 'ベット', 'お花', '姉歯', 'スッキリ', '損益', '殻', '年上', '森田', '限', '町長', '潮', '集客', 'カッコイイ', '搭乗', '居心地', '流入', '失点', '洗礼', '東ティモール', '離脱', '晃', '網羅', 'おそれる', '文言', 'したう', '裕', 'クルー', 'ネパール', '着せる', '宮沢', '鶴', '紙面', '山中', '出世', 'プリン', '倍増', '飲酒', 'リハーサル', 'アタック', '上品', 'カス', '尋問', '繁殖', '盗難', '望', '考', '先住民', '手持ち', '前編', 'パンク', '乗り切る', 'はずれる', '愛国', '致命', '蘭', 'カジノ', 'まき', 'ようこそ', 'レーザ', '突如', 'ユニフォーム', '広がり', 'ツリー', 'チー', '暗黙', '奨学', '分かつ', 'プロトコル', 'トーン', '部位', '部活', '反戦', 'オイラ', 'むろん', '据える', '実名', '懐', '徹夜', '検事', '渡', 'かご', '都度', '小山', '夕', '先発', 'ウン', '受給', '本業', 'メーター', '殺し', 'スティック', '変容', '其の', 'カツ', 'チェロ', '飛', 'ヒマ', '泰', 'クルーズ', 'あ〜', '是非とも', 'トラウマ', 'ライブラリ', '副業', 'キャピタル', '舟', '聖堂', '送金', 'リットル', '原案', '拡散', '準拠', '不愉快', '申し出る', '車椅子', 'アシスタント', '校正', 'アルゴリズム', '包装', 'ヘタ', '後援', '泣ける', '育む', 'ちら', 'ベビー', '処方', '醜い', 'はぐ', 'はなし', '毎度', 'ダイオキシン', 'シリコンバレー', '読み込む', '隔離', '陣営', '骨折', '直結', '湾岸', '丸山', '不公平', '掲示', '封筒', '総数', '逝く', '談話', '只今', '或', '転落', 'ヒトラー', '一人ひとり', '委任', '薬品', 'ふだん', '頂戴', '一端', '冷却', '大雨', 'ボロボロ', '台数', '崇拝', '念願', 'ボーイ', '水中', '潰れる', '搾取', '試作', '意地', '定額', '暴力団', 'なじむ', '賞賛', 'あせる', 'コネ', 'ソナタ', '慢性', 'プリンタ', '老後', 'ネズミ', 'ドロップ', '見本', 'とい', '県知事', '侵攻', '品川', '引き下げる', '北側', '読み取る', '愛好', '葬式', '産婆', 'イノベーション', '引き込む', '泡', '麻酔', '修習', 'ターミナル', '三木', '小笠原', '化石', '過ち', 'コメディ', '手渡す', '荘', '転勤', 'ふるさと', '理不尽', '申し出', '三井', '明快', 'むら', '列島', 'ヒデ', '傍', 'オト', '行進', '詰め込む', 'ちの', '省く', '公庫', 'おなじ', '公述', '知覚', '歴代', '北村', '簡素', '寛容', '解読', '淡い', '汎用', '垂直', 'キミ', 'セクシー', 'コーディネーター', '歩ける', 'グッド', '近況', '鳩', '悪夢', '中級', 'ＯＢ', '軍団', 'セキュリティー', 'ノード', '夕飯', 'こんど', '予期', '不気味', '過失', '特異', '木々', 'バスク', '接点', '変遷', '嗜好', 'すう', '不利益', 'いいえ', 'ヨハネ', 'トリック', '定食', '赤ん坊', '大作', 'サンド', '柳', '軽視', '任す', 'マグロ', '要注意', '見舞う', '暴れる', 'バリバリ', '田んぼ', '不備', 'ボクシング', '雑', '目録', '手塚', '勘案', '工藤', 'お出かけ', '巻き', '宅配', 'ラテン', '峠', 'とある', '宝くじ', 'テキサス', 'いと', '解禁', '尿', '隠蔽', '典', 'トス', '啓', 'レター', 'クリーン', 'ヤクザ', 'ゴメン', '猛烈', 'サラ', 'Ｚ', '中枢', '女児', '学位', '一挙', '内定', 'カルロス', '生体', '血圧', '養護', 'アイスランド', 'ヨット', 'ハズ', 'ここら', '出費', '酵素', '厳重', '税関', '混同', 'うんざり', '日差し', 'ヒューマン', '果実', '執着', '反乱', '介助', '対価', '標本', 'モチーフ', '金儲け', '神さま', '入れ', '焼却', '弾ける', '母国', 'カンファレンス', 'とことん', '柔軟性', '税法', '投げかける', '下り', '被疑', '目下', 'なみ', 'ギア', '芝生', '操縦', 'ケガ', '散々', 'テラス', '怒鳴る', '年数', 'つめ', 'ひまわり', 'それだけに', '功績', '特急', '昇格', '拒む', '遅延', '狩猟', '捕らえる', '務', '若しくは', '香川', '手放す', 'コマーシャル', '長期間', '下車', 'さりげ', '一方で', '帰省', '待たす', 'ペットボトル', 'プロバイダー', '届', 'ヨーグルト', 'ちょこっと', '合戦', '郵政省', '杖', '惚れる', '園芸', 'おじいさん', 'ＮＹ', '配線', '呉', 'カビ', '云', '振込', '羽田', 'こわい', '定時', '米ドル', '一品', '根幹', 'シアトル', 'アッ', '松岡', '隙', 'まあまあ', '一周', 'タブー', '無条件', '来場', '艦隊', '安値', 'チェンジ', '前線', '手がかり', 'ひっかかる', '一向に', '奄美', '殺到', '利息', 'チャールズ', 'シャン', '低減', '通産', '傲慢', 'ジェームス', '桂', 'プラント', 'ふざける', 'かんじる', '扶養', 'お家', '残留', 'ハゲ', 'ガンガン', 'ラック', '陽子', '早くから', 'アラン', 'なぞ', '増田', 'アンプ', '染まる', '就寝', 'ディフェンス', 'ピンチ', '琴', '快い', 'たずねる', '終結', '冠', 'かかえる', '本家', 'スターリン', '面白', '留守', '音量', '月間', '無論', 'ハラ', '笑み', 'ゆかり', 'みどり', '天体', '柏崎', 'ジュン', '何しろ', 'カラ', 'しづ', 'フットボール', '帰', '絶つ', '薄れる', '停電', 'アクティブ', 'ナイス', 'イルカ', '逸脱', 'スキ', '糞', 'ホームレス', '申立', 'ひとまず', 'ステーキ', '立候補', '老舗', '発酵', 'こんなふうに', '補', '誘致', '釈放', '温', 'インディアン', '灰', 'ボロい', '処遇', 'セルフ', '半額', '見積もり', '通告', '王朝', '西川', 'ロサンゼルス', '破棄', '探査', '救援', '晒す', '農園', '連ねる', 'ユニバーサル', '横田', '投下', '鋼', '抑止', '待ち合わせ', 'プロレタリアート', 'ウサギ', '自爆', '北九州', 'おにぎり', 'とりあげる', '見物', '打てる', '当地', 'ガール', '一度に', 'うなずく', '過半数', 'メンタル', '上がり', 'サマ', '紐', '標的', '君が代', '改札', '悲しむ', '打ち', 'インサイダー', 'しくむ', 'トレーダー', '麻雀', '年配', 'くら', '浅草', '切り口', '地蔵', '引っ越し', '美味', '無理矢理', '手伝い', '童話', '秘', 'うに', 'ヘル', '洗浄', '失', '洗脳', '接', '一人暮らし', '加熱', '切り替え', 'レコーディング', 'ビジュアル', 'モニタ', '貸付', '清算', '名所', '輩', 'かわす', 'げん', '培う', '純一郎', '所在地', '人道', '気圧', '見失う', 'ディン', '下部', 'ｋｇ', '見習う', '踏み切る', '歪む', '独創', 'ナンパ', '同窓会', '凍る', '戴く', '歌舞伎', '父母', '干す', '要す', 'おかけ', '写', '洗剤', '運送', '高山', '役立てる', '考え直す', '用地', '喜', '通商', '近々', '知見', '多忙', '運輸省', '引き下げ', '単身', '疾病', 'しむ', '軽量', '些細', '利回り', '日光', 'ケンカ', '空想', 'エンタープライズ', '鉛筆', 'クーラー', '勘', '水着', '除', '思い込み', '投機', '瞬時', '船舶', '時差', '精力', 'やわらかい', 'ヘア', 'いいかげん', '玩具', '炊く', '日報', '多岐', '武田', '伊東', '物凄い', '登勢', 'グランプリ', '歳入', '年内', '愛子', '本編', 'けい', '排気', '錠', '献金', '樹木', 'ジャム', '集め', '拘る', '寄り', 'バリエーション', 'お許し', '炭鉱', '市議会', '後記', '病棟', '仰ぐ', '償却', '婚', 'さらう', 'ゆえる', '満州', '映す', '天下', '供', '語源', 'リオ', '日本共産党', '視力', '南アフリカ', '補充', '知名度', '埋め込む', '正反対', 'さら', 'もむ', '部族', '三昧', '藤沢', '怪獣', '過疎', '悪用', 'この先', 'とてつもない', '実況', '伴奏', '永井', 'ジャーナル', 'タイムズ', '国営', 'めっちゃ', '対人', 'アフガン', '父さん', '割く', 'ＧＤＰ', 'リセット', '広範囲', '脅す', 'とっくに', '路面', 'ヾ', '取り寄せる', '三位一体', '皇太子', '誠意', '夜中', '隻', '委', '毀損', 'ボーカル', '眠り', 'ポリ', '名づける', '古本屋', '宿命', '小児', '拷問', '見抜く', '昨年度', '改変', '直ぐに', 'グレる', '熱帯', 'せん', '郷', '芋', 'ばら', 'ダンサー', '推計', '梨', 'クセ', '緩やか', '哲', '公営', 'カイロ', '年中', '前記', '内臓', '党員', 'このごろ', '折角', '鈴', 'なんだかんだ', '覚ます', 'アイスクリーム', '思い入れ', '匹敵', 'ペイ', '中共', 'タンパク質', '爾', 'カニ', '税込み', 'バーツ', '反撃', '興行', '海底', '楼', '人脈', '適格', '爆撃', '安保理', '分別', '聖なる', '神父', 'ごまかす', '日焼け', 'よくよく', '専務', 'さかのぼる', '投', '最期', 'うーむ', 'スキン', '駐留', '合図', '議席', '標識', '燃費', '戦国', 'デカ', '供述', '夜明け', '持ち合わせる', '八木', '髪型', '主席', '生まれ変わる', '国政', '廃', '突き', '天下り', '祐', 'セクター', '報復', '邸', 'お誘い', '空ける', '検診', '持', '農協', '廻る', 'ならば', '僧', 'お盆', 'まさ', 'いただき', '有能', '酔っ払う', '俊', '開通', '吾', '居場所', 'ダイヤ', '面倒くさい', '進め方', 'まくり', '糧', 'すれ違う', '的中', '手のひら', 'アルファベット', '配', '質量', 'つくす', 'そっ', '異例', '神道', 'だらだら', '主治医', '紫外線', 'サックス', '勇', '佐野', '思い起こす', 'メガ', '臭', 'β', '取組む', 'ひょっとしたら', 'ペンギン', 'アクセント', '量子', '錦', '薬剤', 'ガム', '続出', '垣間見る', '腕時計', 'ワイド', 'モーニング', 'ダイビング', '竹下', '盗聴', '望み', '賞金', '原始', 'ミサ', 'メロディー', '郷土', 'ぐるぐる', 'ギリシア', '反抗', '草子', '長編', 'パル', 'ロジック', 'ワークス', '古田', '手袋', 'ありがと', '尾崎', '定数', 'モデム', '菊', '休止', '故意', 'ＴＢＳ', '隣人', '物品', '吟味', '受かる', 'バタバタ', 'あな', 'つくり', '分岐', 'ツーリング', '地主', 'むかし', '平面', '防', '見え', '高性能', 'ココロ', '獲る', '労組', '巧', '出所', '女史', '揺れ', '増進', '横山', '片隅', '手首', '義理', 'ロッテ', '同性愛', '誤差', 'いわく', '一息', 'ダル', '壁紙', '積み重ね', '横たわる', '手口', '納期', '年末年始', '済ます', '非常勤', 'ツン', '注意深い', 'スロット', '揚げる', '吸い込む', 'スプーン', 'エッチ', 'マネジャー', '強み', 'とり', 'スリム', '傷害', 'はな', '川上', '和食', 'アキ', 'どく', 'パケット', 'ちく', '商用', '寝室', 'エホバ', '社交', '工務', '衆', '遊べる', '究明', '附属', '束', '愛着', '奥深い', '願', 'たかが', '自閉症', '出血', '港湾', '貸出', 'スカイ', '難易', '丈夫', '絶好', '早稲田大学', '禅', '議', '遮断', '射撃', 'めく', '最前線', '自給', '増額', 'ｐ', '日本橋', '独り', '読み上げる', '国務', '知識人', 'イチゴ', 'ふん', 'ポチ', '放火', 'ウル', '小銭', 'お気', '会計士', '標', '賛否', '炭素', '着席', '民俗', '夕日', '受診', '楽園', '島根', '相応しい', '蘇る', '水田', '最優秀', '否める', '尺度', '朗', '唐突', '春樹', '寸法', 'ファックス', '恐竜', 'ミシン', '只', 'おかず', 'トーマス', '明細', '凄まじい', 'つかめる', '隠し', '奴ら', 'めぐみ', '一刻', '日経新聞', '古書', '本場', '呼べる', '真っ暗', '東欧', '百科', 'アテネ', 'ケリー', '東方', '焼ける', '暮れる', '照', '賢明', '哀しい', '接待', '痛める', '高松', '遥か', '走れる', 'リレー', '斎', '滅多に', 'セミ', 'じゅう', '斬新', '糾弾', '岩波書店', '零', '宿舎', '原題', 'うわさ', '協奏曲', '処刑', '染色', '明瞭', '日産', 'おくる', 'ランナー', 'いたずら', '日帰り', 'アーキテクチャ', 'ｂ', '侍', '浦和', '建設省', 'オルガン', 'サマー', 'バージョンアップ', 'イエロー', '巷', 'くらべる', 'そん', 'マニアック', '人前', '佐賀', '毎晩', '核心', 'ベリー', '考案', '違憲', '盛', '貸し', '大将', '荒い', 'お迎え', '道徳的', '描ける', '徳川', '飲み込む', '真夏', '望遠鏡', '何かしら', 'タラ', 'さっと', '補修', '縫う', '送れる', 'アメリカ合衆国', '政界', '御座る', 'カスタム', '多種', 'バット', 'チェックイン', '叫び', '汚す', '装う', 'ＦＷ', '中日', 'ウエスト', 'ファイナンス', 'すし', '半日', '年版', '水野', 'ヨウ', 'ねん', '振る舞い', 'カム', 'ヘクタール', 'ワイ', 'コンプレックス', '聞き取れる', '激励', 'チャイナ', '静止', 'やせる', 'もうける', '議定', 'クビ', '電脳', '忘年会', '挑発', 'エステ', '連勝', '発作', 'フェリー', '兎', '失格', '語りかける', '延びる', '庫', '一大', 'バス停', 'むける', '初戦', 'フロリダ', '華麗', '茹でる', 'けが', '公約', '弥生', 'ためる', 'ゲリラ', '値下げ', '茶色', '散らす', '冊子', 'ことごとく', '陛下', '日立', '所定', '機嫌', '゛', '閉ざす', '味噌汁', '初版', '騎手', 'オリ', 'ランニング', '明かり', 'アイヌ', '京都大学', '育ち', 'おさまる', '羅', '警報', '造形', '中曽根', '昇', 'フラワー', '近頃', '塗り', '不透明', '珍', '摘発', 'ベータ', '相手方', '同月', '産物', '交易', '飛行場', '袖', '船長', '端子', '司祭', '言いよう', '後ほど', '本国', '胡', '佐', '心構え', '繋がり', '白黒', '当の', '殿下', '事業主', 'さよなら', '赤外線', '藤本', '薬剤師', '興', '前々', 'カブ', '敬', '憶える', '先行き', '二郎', '右脳', '体温', '控えめ', '乗り物', '全域', 'ボルト', '丈', '区画', 'アダルト', '枚数', '教義', '悲観', '外傷', 'つたの', 'でん', '更生', '両側', '柏', 'リモコン', '左利き', '国内外', 'キャップ', '支え', '逃亡', '暗黒', '各省', 'コーラス', 'ナチュラル', 'ポンプ', '宇宙船', '遺言', '電化', 'ご無沙汰', '三島', '割り切る', '面会', 'エルサレム', '一面', '納入', '正す', '角川', '県庁', 'すべ', 'こえる', '細菌', 'ちょう', '要員', '概ね', '教皇', '賜る', '買取', '累積', '文科', '新田', '歩み', '覆す', 'なかでも', 'チューブ', '台頭', '村長', '生き延びる', '過大', '無職', '消去', '破滅', '見いだす', '選別', '西武', '格納', '肝臓', '途方', '断食', '投影', '苦い', '熱中', '届出', '僧侶', '分業', 'モロッコ', '長文', '買い取る', 'ジョニー', '面談', 'ふたたび', '年次', 'クリントン', '付録', '柔道', '連行', '悪徳', '包丁', 'CAD', '同調', 'ダッシュ', '妙に', '一国', '暴落', 'はう', '担い手', '公司', '諸島', 'よみがえる', '有識者', '改装', '思いつき', 'がい', 'ミュンヘン', '抱きしめる', '気合い', '一夜', '統括', '供与', 'に当たる', '脂', '矢野', '冷房', 'ナポレオン', 'レオ', '憎む', '手当て', '月別', 'サボる', 'ストレッチ', '主査', '蔓延', 'ビート', 'プライア', '開演', '陳情', 'ドール', '批准', '眺め', '玄米', 'ひさし', 'インスタント', '漏らす', '運搬', '予備校', 'イタリアン', 'ぶっ', '遼', '引ける', '母体', '宅地', 'ご馳走', '幸子', '断然', '日ごろ', '富士通', 'リモート', 'お洒落', '本稿', '恐る', '索引', 'われる', '大嫌い', '見据える', '破損', 'ハードル', '見知らぬ', 'さんざん', 'まったり', 'こく', '灰色', '取り消す', '裁く', '過', '構内', 'ベタ', '思い立つ', '貯蔵', '工学部', '王者', '混ざる', '魅了', 'すんなり', '希薄', '気まま', '古川', '後編', '暁', '税源', 'にあたり', '青色', 'マリー', '将', '漱石', '足らず', '相方', 'スクロール', 'ジョーンズ', 'ネジ', 'だんだんと', '斜面', '空軍', '発端', '仕事場', '次官', 'くむ', 'あたたかい', '豚肉', 'あるく', '微生物', '不服', 'たいす', '一段と', '函館', 'オシャレ', 'ムリ', '至上', 'サード', '藍', '優待', '労災', '取り締まり', '信長', '幼少', 'こんなにも', '北東', '一文', 'アンチ', '乙女', 'れん', '速記', '競売', 'かっこよい', '共和党', 'おこす', '属', 'ＦＡＸ', '接着', 'ジェフ', '個室', 'ありとあらゆる', '埋もれる', '黒田', '制覇', '役職', '際立つ', 'ニコニコ', '目先', '攻勢', 'かりに', '許諾', '突撃', 'ディック', '頑固', '切実', '下半身', 'レジャー', 'へぇ', '偏差', '一体化', '転倒', '衣服', '折衝', '英寿', '切り取る', '追', '駆動', '入れ替える', '解像度', 'スティング', '滑走', '注入', 'むかう', 'あきれる', '殺る', '語り合う', '淡路', 'ムシる', '期す', '末端', 'マンハッタン', 'たとえる', 'っと', 'マダム', '気質', '課金', 'ヘリコプター', '弁論', '凶悪', '松永', 'くう', 'たちまち', 'モト', 'ルカ', 'キューブ', '健太郎', '担ぐ', '子宮', '憤る', '重宝', '難解', '捕獲', '雅', 'ご苦労', '彼方', '因みに', 'スタディ', 'みずほ', '宝物', 'ベクトル', 'すわる', '回し', '太陽光', '赴く', '漏洩', '征服', '飛び交う', 'ヘンリー', '山頂', '趣', '貯まる', '地方裁判所', '旋律', 'ワーキング', '万一', '因子', '名言', '裕福', '変貌', '送り込む', '政務次官', '街頭', 'フィード', '賛美', 'ウォーク', 'サンドイッチ', '押し寄せる', '悠', 'すてき', '大小', 'にたいして', '断固', '光学', '武道', 'ちょいと', '講ずる', '辞職', 'ａ', '言い聞かせる', 'ついていける', '履修', '代償', 'ハンター', 'ひな', 'かね', '再検討', 'なぐ', '古来', '高温', 'ヒロ', '驚愕', '乱れる', '靴下', 'トウ', 'マネージメント', 'ストレージ', 'ばらばら', '崖', '千代田', '帖', '妖怪', '文化庁', '盛況', '明言', '宝塚', '叶える', '御覧', '洞察', '温める', '行き着く', 'カリ', 'おう', '充てる', '文体', '手抜き', '美学', '現職', 'つきあい', '参事官', '催眠', 'ふれあう', '見合い', 'それでいて', '京大', 'ネック', '占有', 'パール', '要点', '便宜', 'だに', 'チック', '回帰', '納品', '有事', '真っ先', 'ひっそり', '傾斜', 'ヤング', '卸', '逢う', '海賊', '腫瘍', '列挙', '異質', 'ムラ', '月末', '初対面', 'くり', '使いこなす', '図鑑', 'おおよそ', '根強い', '忍', 'ウインドウ', 'しあわせ', '訳者', '白石', '粋', '作詞', '馴染む', '代物', 'パズル', '蚊', 'バッファ', '聴覚', '即時', '謂', '飯田', '塗料', '新車', '井戸', '赤坂', 'リポート', '鈍い', '納付', '少人数', '俗', '無謀', '花嫁', '選び方', '服用', 'あとがき', 'パッド', '授与', '標高', '代える', '図形', '穀物', '困惑', '分厚い', '文学部', '上京', 'リフレッシュ', 'ミュージアム', 'っちゅう', 'つくば', '蒸気', '電磁波', '強固', '姉ちゃん', '万能', '吉野', '結集', 'メタル', '役場', '忍者', '桜井', '必至', '仕入れ', '侮辱', '寄稿', 'となり', '慮る', 'カラダ', '吉岡', '作法', '良識', 'バレンタイン', '味覚', '新潮社', '番外', '向かい', '受託', '大学院生', 'クリーニング', '歩き回る', '平田', 'メダル', '時給', 'ニセ', '片づける', '小松', '派閥', '傍ら', '米価', '苦しめる', 'テクノ', '着信', '相応', '終焉', 'テール', '樹立', '係数', '堤', '大して', '遣う', '公然', '空手', '歌舞伎町', '鹿島', '西尾', 'ブラインド', '木下', 'ただちに', '模擬', '崎', '始動', '力量', '舐める', 'ハブ', '散会', '歓声', '逃避', 'ワシ', '道路公団', 'ぼう', '併合', '留保', '秋山', '有志', 'カプセル', '処女', '参院', 'カナ', 'バリュー', 'わざ', 'お忙しい', 'ホームステイ', '感銘', 'おん', '増設', '旅立つ', '浪費', '籍', 'おぼえる', '直樹', 'ノック', '派生', '指紋', '小児科', '舞踊', '振り向く', '使い分ける', '益々', 'アンコール', '墜落', '鯨', 'アンサンブル', '鉢', '少量', 'おき', '利潤', '信条', '哲也', 'しき', '反転', '社外', '〆', '応対', '量産', 'アンダー', 'ジェームズ', '延', 'いやあ', '後世', '見慣れる', '移入', '保健所', '情景', '亀井', 'チコ', 'ミクロ', '呼称', '旅人', '迫害', '肩書き', 'インフォメーション', 'ナス', '水曜', '丸ごと', 'はずれ', 'ソファー', 'オーディション', 'オピニオン', 'ジレンマ', '差し込む', 'ハリス', '明後日', '吹奏楽', '下院', 'わら', '石綿', 'サンデー', 'ハリケーン', '消', '共鳴', '主たる', '身の回り', '激減', 'こぼす', 'そら', '壊滅', '換気', 'レバー', '空腹', '来訪', 'ポートフォリオ', '電動', 'ふむ', 'セクハラ', '共著', 'ブルジョア', 'オンリー', '期末', 'ほかなる', '縄文', 'ゴールデンウィーク', '必修', '人文', 'のく', 'シューズ', 'オファー', 'フン', '替わる', 'るる', '定か', 'ヤマ', '読了', '山岳', 'ヤード', '発祥', '浴衣', '亡くす', '交互', '淡々', 'ワープロ', 'すごす', '半減', 'セーブ', '不必要', 'メトロ', '不振', 'ホルダー', '頭部', '盛り', '新入', '降ろす', '点滴', '行き先', '島田', '中原', '感度', 'エコノミスト', '儀礼', '弾道', '背筋', '圭', '時速', '運び', '我ら', '日弁連', '実業', 'マックス', '換える', '昇進', '慣行', 'ダース', '親善', 'やけに', '膨張', 'ダイヤル', 'かかわり', '売上げ', '合気道', 'だるい', '向', '消毒', '代謝', 'すじ', 'レポ', '内緒', '晩年', '保留', 'サバ', '幾何', '書簡', '過ぎ去る', '強姦', 'わが家', '長老', '今季', '宣告', '滞る', '樹脂', 'ひととき', '首長', '食い', 'セレクト', '未成年', 'コーラ', '受益', 'カントリー', 'アラスカ', '見捨てる', 'アインシュタイン', '待望', '思ふ', '歪み', '特区', 'スキャンダル', '苦戦', '君主', '公債', 'キラキラ', '鷹', 'いち早い', '感じ取る', 'につき', '能率', 'にせる', 'バレー', '咳', '渡航', 'くわえる', '星座', 'セットアップ', '勝者', '内藤', 'アポ', '真空', '健在', '一帯', '決戦', '放射能', '原型', '淵', '高揚', '無人', '水戸', '眉', '調味', '湿気', '連立', 'とら', '長々', 'ひも', '町田', 'カバン', '火力', '靖', 'トライアル', '修学旅行', '草原', 'ていう', 'メンテ', 'すばやい', '田口', '目の当たり', 'ピット', '呈す', '甥', '積', '耕', 'コク', '省エネ', 'レック', '出国', 'リボン', 'ロク', '葉っぱ', '年来', 'あいにく', '被爆', 'パウロ', '内戦', '小麦', 'はしゃぐ', 'ちび', '電話機', 'じゃぁ', '大久保', '村人', '各人', '故に', '退席', '含有', '可愛らしい', '依る', '大まか', '親方', 'らく', '通院', '衰える', '細', '値引き', 'ツイン', 'ハリ', '風習', 'まね', '乖離', '食らう', 'リバー', '波及', 'ウー', '凶', 'ＣＧ', '使徒', '見積', 'ニフティ', 'キャスター', '公務', '同然', '元来', '披露宴', '閉じ込める', '為す', '一読', '孤児', '恣意', '実演', '媒介', 'ブーツ', '勝ち取る', 'グリップ', '爽快', '照会', '磁気', '他人事', 'かすか', '一線', 'クラーク', '生ずる', '石鹸', '別名', '堕落', 'カクテル', '淋しい', '節目', 'レイプ', '愛読', '精霊', '資する', '丁', 'ひいては', '五つ', 'セントラル', '高官', '廣', 'プレミア', '荷', 'まとう', '今期', '繁盛', 'はめる', '下位', '婚姻', '五郎', 'ぬいぐるみ', '休める', '兆し', '奏でる', '組み立て', '基く', '半端', 'スカウト', '西田', 'スケッチ', '嘉', 'ドリル', '切り開く', 'アウトドア', '気まぐれ', 'やり直す', 'スクエア', '間際', '歩き', '当てはめる', 'リトル', '色合い', '頷く', '基幹', '異国', '停車', 'ほんま', 'ポテト', '備わる', '谷口', 'でっかい', '繰り出す', '斗', 'シック', '風情', '原材料', 'シリア', 'メシ', '構え', '大いなる', '愛人', 'コンディション', 'シンガー', '炭酸', 'ギャル', '格別', '掛け', 'ベラ', '渋い', '予知', '迷い', '祝い', '潮流', '真意', '大晦日', '荒らす', 'ぬく', '満席', 'ぐるみ', 'ジャガイモ', '分譲', 'プロダクション', '割れ', '特価', '羽目', '占う', 'くつろぐ', '大差', '外壁', '阪急', 'キュー', '交差', '年下', '追い詰める', 'シチュエーション', 'かけ離れる', 'ハガキ', '高め', '土佐', '相反', '私見', 'ゲノム', '前夜', '不可解', '非常識', 'クラッシュ', 'がらみ', '箱根', '段落', '賢', '返却', '筆記', 'クリエイティブ', '学内', '巧妙', '可視', 'わたす', '快晴', '速攻', 'メーカ', 'しみる', 'かっこ', '続行', 'めんどくさい', '一概に', 'グロ', 'つっこむ', '就学', '表題', 'お目にかかる', '通算', '噴火', '義務付ける', '元年', '守れる', '見落とす', '産経', 'クリスタル', 'ウルトラ', '悟', '無くす', 'ルーツ', '掘り下げる', 'あきらか', 'つれづれ', '打ち切る', '団長', '歳児', '個々人', '地雷', '修道', 'おす', 'トレーナー', '既成', '強気', '結束', '練', '党内', '精進', 'ビス', '自負', 'プリンター', '止', '指先', '信徒', '遠ざかる', '可哀想', '定休', '離', '整体', '体型', 'お返し', '段取り', '排他', '賞味', 'コツコツ', '差額', '強硬', 'とんでも', '残虐', '草案', '密', '後押し', 'きびしい', 'めずらしい', '修道院', 'アルファ', '新卒', 'ダイエー', '齢', '妊婦', '始', 'エクアドル', '中長期', 'ＤＦ', '働ける', 'お隣', '間取り', '均一', '陳', 'はし', 'ゴミ箱', 'インタフェース', '同国', '小学館', '卓', '幕末', 'ですけれど', 'ミャンマー', 'なにせ', '禁', 'ヒゲ', '見下ろす', '鎖', '極限', '仕える', '宙', 'コロンビア', 'ラインナップ', '風車', '尊い', 'カンパニー', 'ひざ', 'ラフ', '鉄鋼', '激化', '菅', 'ゆる', '金メダル', '上方', 'マネージャ', '洋楽', '請負', 'だけれども', '車体', 'サムライ', 'コル', 'ミドル', '水上', '封印', '祖先', '入賞', '生前', 'ポット', '這う', '吐き出す', 'ε', 'ストーブ', 'うり', 'Σ', '柳沢', '途切れる', '肇', '聖地', '冷', '潜る', '裏付ける', '定まる', '仲良し', '資料館', '特長', 'ダニエル', '芳', 'ディーゼル', 'サスペンス', '発散', '紅白', '片道', 'どっと', '塀', '断', '囚人', '独断', '呪い', '暮れ', '翔', '館長', 'ロビン', '時空', 'キーパー', '真夜中', 'そうだ', '論調', '奥田', '未遂', 'ダイアリー', 'シグナル', 'くぐる', '吠える', '減量', 'ありのまま', '終身', '生後', 'かに', 'ビーズ', 'オペレーション', 'こする', '表参道', '一部分', '伝授', '主語', '種目', '既', '貴女', '切り捨てる', '界隈', '特質', 'あげく', '戸籍', '事由', '細川', '引き出し', 'ディズニーランド', '大金', '養子', '｝', 'スイカ', '居間', '乗用車', '新生', 'さがす', '長生き', '格言', '近寄る', '紙幣', '秀吉', '中堅', 'どうし', '尽力', '屈辱', '国税', 'Ω', 'コンテナ', '戦死', '一段落', '簿記', 'レーダー', '従軍', '原動力', '先送り', '風船', '志願', '渦', '財界', '魅せる', '老化', '打開', '引き分け', '大雪', '花束', '判別', '那覇', '趣向', '新井', '低音', '伊勢', 'しぼる', '破れる', 'なでる', '組み', '没頭', 'ワゴン', '依然', '胎児', '女子大', 'ひっくり返す', '愛犬', 'タレ', 'ヨシ', 'クライマックス', '戻れる', 'ムーア', '唯', 'エキス', '仕上がり', 'ケチ', 'もろもろ', '見分ける', '辛', '真っ黒', '骨格', '荒木', '軌跡', 'うろうろ', '裁定', '懐疑', '車検', '乗', '二酸化炭素', '表わす', '大笑い', '蛍光', '上着', '使', '目黒', '幾', '鮨', 'ＰＫ', '振替', '占拠', 'ゴジラ', '欠かす', 'エサ', '野中', '道筋', '出社', 'ミシェル', '勲章', '唄う', 'ぱっと', 'しら', '帯広', 'パース', '重たい', '盧', '和平', '番手', '思春期', 'はあ', 'ヨー', '久しい', 'セッティング', 'しっくり', '仕切る', '冥福', '渡部', '弱る', 'ぺん', '美少女', '霊的', '伊豆', '呪文', 'バンクーバー', '逆らう', '帽', 'メロン', '試聴', '開場', '総称', '旺盛', '無茶', '浅野', 'どうこう', '任天堂', '盛りだくさん', '余剰', 'パラダイス', '履行', '操業', '無能', 'ご機嫌', '書斎', '面々', 'インターン', 'まめ', '平穏', 'エッセンス', '野望', '衣類', '献身', 'おり', '明日香', '祥', 'スパイス', '南西', 'バックス', 'ファーム', '食後', '起つ', 'こま', '導', '王道', '検挙', '名門', '強豪', 'ウリ', '諒', '現存', '立ち去る', '有馬', '教委', '民放', '熱気', 'ボイス', 'すさまじい', '窃盗', '謳う', 'インチキ', '改悪', '本位', 'うなる', '朝日新聞社', 'ポリス', '会期', '伸', '稲', '生き', '土屋', '憎しみ', 'タメ', '当人', '拍子', '滅びる', '白紙', '求む', '釜', '走り', '木製', 'かろうじて', '果てる', '浪', 'いちご', 'スラム', 'こぐ', '読解', '全土', '先入観', '挙句', '杉山', '巡り', '増幅', 'ＮＯ', '比重', '水質', 'ゆだねる', '手動', 'プログラマー', 'ウォーキング', 'スワップ', '金庫', '終値', 'トリオ', 'いっさい', '例会', '慰める', 'わるい', '範疇', '植', '恵比寿', '熟成', '例文', '推論', 'ソファ', 'ユーティリティ', '座談', 'よけい', '波長', '思いこむ', '実戦', '分泌', 'ズバリ', '飼料', 'てか', '帯域', '坊主', '服部', '治癒', 'オッサン', '人様', '課する', '語れる', '民生', '剣道', '肘', '振るう', '墨', 'いつしか', '缶詰', 'サーキット', 'スティーブ', '顔面', 'バーベキュー', '生きがい', '愛車', '土井', 'コンセンサス', '三宅', '本命', 'これぞ', '難点', '固執', '宗派', 'ボウ', '見返り', '貸し出し', '熟練', '伝記', '大森', '人的', '理学', 'なつかしい', '聖霊', 'オリックス', '電灯', '立ち読み', 'あれる', '一転', '追伸', '彼女ら', '釘', '松尾', '画質', 'カモ', '長寿', '澄', 'クラフト', '綾', '短大', 'インストラクター', '柵', 'シスコ', '単体', '埋葬', 'マトリックス', '八王子', '定量', '出典', '酒井', '見かけ', 'グッ', 'マルコ', '売店', '下痢', '休', '変態', '別荘', 'ふるう', '序盤', '障壁', 'ステンレス', '国崎', 'つう', 'クエスト', 'ワイルド', 'ワル', '毛布', 'コンセント', '朱', '大田', '真っ', '硬直', '上層', 'フィリップ', '建国', '松浦', 'コリア', '離職', '厚み', '新曲', 'その道', '香水', '伝播', '称する', '正論', '大石', 'バリアフリー', 'ささやく', '不都合', 'フォーカス', '本学', '忠', '祀る', '測量', 'のばす', 'パンダ', '度々', '行き来', 'またがる', 'エゴ', '弔い', '地上波', '覚醒', '淘汰', 'あした', '南側', '退社', 'アール', '史料', '呼び出し', '会報', 'ムーン', 'ヒュー', 'Ｆ１', '差し引く', 'かぐ', '幾度', 'ファクター', 'スプリング', 'ヶ国', 'ホワイトハウス', '深み', '樋口', 'ウェールズ', '北陸', '三者', '暮らせる', 'ベートーヴェン', 'ビーム', '縁起', '混在', 'フランクフルト', '如く', '琉球', 'マイホーム', 'スピン', '粉飾', '位置付ける', '一節', '武部', '音波', 'ちょうだい', 'ｃ', '駐', '儀', '封鎖', '駆除', 'プロテスタント', 'はなはだ', '知らせ', '嫌がらせ', '抱っこ', '社名', '環境省', '書き換える', '夜景', '生計', '｛', '発熱', '村山', '区切る', '朴', 'さも', '量販', 'そそる', 'ファシズム', '封建', '聖人', '永住', '自明', '境内', '鯖', '帰す', '落ち', '伝送', '即興', '症例', '海域', 'うなぎ', '放る', 'ステータス', '空洞', '集英社', '大谷', '馬車', 'ジャングル', 'キノコ', '植木', '充', '陳列', '今ひとつ', 'クーポン', '鞄', '恒久', '大きめ', '仕立てる', '改', '当て', 'すぐさま', '主旨', '不平等', 'がけ', '落書き', '公聴', '快', '盛岡', '助長', 'ハンバーガー', '懲戒', 'ズレ', 'ぶどう', '艶', '下流', '入所', 'かじる', 'ラウンジ', '寄', 'テレビ朝日', 'ときには', '専任', 'わける', '配付', '捕る', '四郎', '日和', '甘味', '必需', 'ｋ', 'エレベータ', '何一つ', '減額', '自前', '旭', '森山', '顎', '東日本', '放浪', 'ババ', '御飯', '月日', 'そうこう', 'ちよ', '雑音', 'スプレー', '分断', '恨み', '罪悪', '長引く', '腰痛', '凹む', '改憲', 'ひらく', '申し立て', '学費', '開講', '仕込む', '打合せ', 'つま', 'パワフル', 'アミ', '知らせる', '構文', '候', '下北沢', '読み書き', 'じゅん', '文系', '震度', 'せっせと', '環境庁', 'グローブ', '導き出す', 'ソーセージ', '女系', '起る', '直撃', '潤', '見積もる', '報う', '憲章', 'そんなふうに', '少子', 'おみやげ', '灸', 'ガバ', '前原', '高野', '漁師', '窒素', 'おっちゃん', '大々的', '東亜', '哀れ', '歯止め', '中高年', 'セラピー', 'ブタ', '戦記', '疑わしい', 'スキーム', 'やう', '堺', '歌劇', '充足', '中途', 'しっとり', '歳月', '買い手', 'ロッカー', '横須賀', 'ＧＷ', '言い渡す', 'ジョンソン', '話し方', '造成', 'とおす', '顕', '横切る', 'レンタカー', '細工', '姓', '取り替える', '緻密', '結', '本誌', 'ブレア', 'ダラダラ', 'アクセル', '取消', '買物', 'メカ', '大方', '技師', '昌', '常務', '声援', '圧勝', '一色', '噺', '鉱物', '噴出', '心中', 'さわる', '刑罰', '実写', '卓球', 'あき', 'この上ない', 'ジェン', '棄却', 'しぬ', 'キャロル', '産学', 'ケネディ', '疑念', 'プロダクト', '拳銃', '忠告', '兆候', '咲かせる', '流用', '運河', '敦', '鉛', '夕暮れ', '築地', 'レントゲン', '夜空', '釣れる', '親会社', '小池', '北方', '繁華', '大宮', '各位', '転用', '返金', '書き手', 'やりがい', 'ピート', '失踪', 'カーン', '模範', '口実', '怪物', '安打', '符号', '狂', '装', '買い換える', 'カジュアル', 'ＤＮＡ', '必読', '動的', 'ケンブリッジ', '踏み入れる', 'ゆでる', '橘', 'ホイール', '海老', '虜', '浮き彫り', '国民党', '町民', '隣国', '織り込む', '絶大', 'はつ', 'しようが', 'なんせ', '締切', '街並み', 'ＧＫ', 'ホセ', '極度', '濃縮', '生殖', '英和', 'のべる', 'ボウル', '嫁さん', 'ってか', 'くれぐれも', 'ナンセンス', '並列', '荒廃', '予習', 'マキ', '入植', '取り囲む', '地検', '重症', '添削', '従属', 'りっぱ', '吉祥寺', '英単語', '天ぷら', 'ブライアン', '地中海', '仕る', '器用', '倍率', '寝不足', '出くわす', '賞品', '商取引', '先駆', '入れ替わる', '台本', 'ひとりひとり', 'はがき', '対峙', 'ノベル', '増資', 'チョット', '果', 'ゴロ', '信州', '比喩', 'みち', '風力', 'ホームラン', '仮称', '舞踏', 'ゲン', '開戦', '元旦', '傘下', '木曜', '太平洋戦争', '山間', '砂浜', '古本', 'サングラス', '都立', 'からかう', 'コック', 'スズキ', '眠気', '心強い', 'おや', '払拭', 'ｖ', '希', '多重', 'コーディネート', '用具', 'ＩＣ', '痴呆', '農政', '病人', '舗装', '山村', '執拗', '全長', '誹謗', '総じて', '沼', '自在', 'チャネル', '文面', '久保田', 'アダム', 'フィート', 'あわせて', '感受性', 'フェーズ', '人情', '第一人者', '宿る', '婆', '初夏', '分量', '根付く', '塩素', '南極', '兄貴', '天文', 'ドリブル', 'ゆり', '気持ち良い', '最多', '愉しい', '既婚', 'ポルノ', '税務署', 'ひそか', '振り込む', '運航', '澄む', '実る', '想い出', 'インプット', '広東', '上述', '小僧', '通りすがり', '造船', 'なんら', '回生', '伝導', '憎悪', '遊園', '取り残す', 'いす', '賑やか', '休養', 'しのぐ', '魅', '無垢', '消失', '捕虜', '言い回し', '滅ぼす', '故人', 'すませる', 'マルクス主義', '小鳥', '出頭', 'チャイルド', 'ラスベガス', 'くに', '開き直る', 'バーガー', '備蓄', '正午', '紛失', '無題', '免責', '満月', 'シベリア', '種族', 'フック', '利上げ', '伐採', '閉会', '割り当て', '宮内', '伴', '海峡', '洋子', '急性', 'つけ', '検閲', '前置き', 'ひろ', '重点的', '小冊子', '雑草', '東側', '新婚', '調書', '麓', '区切り', '鉄骨', '凝縮', 'ヘルス', '尊', '主題歌', '坂口', 'おさめる', '質的', 'アトリエ', '至福', '商談', '毅', 'マフラー', '岩田', 'たくましい', 'たこ', '顔色', '電球', '近鉄', '銭湯', '激怒', '知らず', 'タフ', '足立', '経済学部', 'おおい', '不条理', 'ジャンク', '珈琲', '渓', '猟', '上半身', '健闘', '趙', '病室', '経済企画庁', '平壌', '発砲', '昔ながら', 'おとな', 'カウントダウン', '在学', '今時', 'キリスト教徒', '昼飯', '醸造', 'コントローラ', 'クッション', '新株', 'チャーター', '氾濫', '好き嫌い', 'バグダッド', '洲', '戦艦', '醍醐味', '蟹', '本紙', '奇', '宣', '制す', 'エリック', 'リクルート', '椿', '整形', 'まかなう', 'にたいする', '詩集', '着工', '乱用', '供養', 'ＯＬ', 'セーター', '雛', '大山', '赤十字', '減速', '心底', 'のびる', 'ダンボール', '動力', '申しわけ', '恩', '武蔵', 'がかり', '見張る', '真っ直ぐ', 'グアム', '漕ぐ', 'エアー', 'ほのぼの', 'スーパーマーケット', '喜劇', '辞退', 'お参り', 'マメ', 'テック', '蒸し暑い', '身元', '本数', '皇族', '強風', '設問', '未明', '書き上げる', '白鳥', '上り', '素子', '断絶', '常々', 'シルク', '存分', '硬化', '吊る', 'レディ', '増員', '帳簿', '堅持', '防げる', '金色', '叔母', '自治省', '法務大臣', 'よぶ', '温室', '逐次', 'モチ', '倉', '酒造', '紀元前', '誘い', 'イレブン', 'ｓ', 'あや', '緊密', '見回す', 'クロック', 'カセット', '起す', 'アルク', 'よぎる', '盛大', '締め', '鶏肉', 'サンパウロ', 'ビリー', '思いやる', '平山', '手掛ける', '推し進める', '見つけ出す', 'ひねる', 'はおる', '会計検査院', '同点', '懲りる', 'ヘッジファンド', '王家', 'カメ', '賑わう', 'イザ', '推察', '好物', 'まんが', '一級', '試食', '古今', '山内', 'アンナ', '学芸', 'ずらす', 'とかす', '痕跡', '新入生', 'めど', 'ヘルパー', '粗', 'ダイニング', 'おそらくは', '椎名', '譜', '巨匠', '一変', '派兵', '特撮', '有数', '社団', 'ライブラリー', '金魚', '付随', 'ぜん', '生育', '余韻', '腎臓', '村田', '放り込む', '７つ', '守護', '再三', 'チャージ', '急行', '軽蔑', 'リベラル', '将校', '読み解く', '富裕', '跡地', 'Ｗｅｂ', '先着', 'れい', '親密', '初歩', 'エレクトロニクス', '忠誠', 'たれ', '貴い', '粘土', 'ゴロゴロ', '予告編', '織田', '略称', '酔い', 'エンターテインメント', '有給', '取締', '同市', '重度', '先々', '物色', 'ソロモン', '街角', 'Ｊリーグ', 'ガレージ', '久し振り', 'おかあさん', '退く', 'こんばんわ', '前もって', '売り出す', '樽', 'エリザベス', '果たせる', 'ｘ', '男優', '暴く', '不特定', '数式', '待ち時間', '露呈', 'ハイビジョン', 'シリアル', 'インテリ', '蜂', 'ブレンド', '町並み', '一途', '雑学', 'にらむ', '血糖', '突きつける', 'クジラ', '隣る', '阻む', '総体', '叔父', '支社', '押し込む', '伏せる', 'ミスター', '近日', 'キッ', '多め', '編著', '安部', '苦難', 'オールド', '体格', '不全', '侵す', '護衛', 'モノクロ', '略す', '野心', 'お好み焼き', 'サク', '否決', '愛想', '意気込み', '損ねる', 'おっぱい', 'オペレーティングシステム', '栄える', '贈与', '諸々', '出馬', '借入金', 'プラズマ', '光栄', '兵衛', 'ソビエト', 'シャトル', 'こぼれる', '矢印', 'つれる', '生々しい', '停る', '取り締まる', '孔', '探し出す', '売り物', 'エコノミー', 'シーク', '貸与', '転移', '悪循環', '打者', '少額', '大西', 'スリップ', 'モットー', '食える', 'ウエア', '前例', 'エンジニアリング', '小平', 'モモ', 'ケニア', '最長', '司馬', '受理', '混沌', 'きたる', 'ぶらぶら', 'お方', 'もって', '結核', '短歌', '発光', '彩る', '綱', '微', 'くし', 'スパイク', '音程', '助け合う', 'ずれ', '陶器', 'AU', '賄う', '多量', 'ＰＰ', 'ニックネーム', '抗生', '露骨', '欠落', '濫用', '配属', '精子', '柿', 'イコール', 'しつける', '緊迫', '元祖', 'ブルジョアジー', '形容詞', '天文学', '誘発', '一元化', 'フラメンコ', 'バケツ', '在留', '置き場', '号機', '同席', '王妃', '秦', 'すます', 'ツキ', '容姿', '音符', '問屋', 'アミノ酸', '下町', 'あおる', '累計', 'タケ', '輝', 'すかさず', '碑', '望める', 'かわいらしい', 'ディスカウント', '中庭', 'おぉ', 'ｍｍ', 'バッチリ', 'フレッシュ', 'ノンフィクション', '思い知らす', '領収', '昼過ぎ', '昆布', 'ラケット', '立川', '希少', 'ヒップ', 'フジモリ', '大前提', 'レクチャー', '小売り', '勝る', '飴', 'かさ', '放課後', '修繕', '合える', '庁舎', '受け', 'お過ごし', 'おじ', 'びん', 'シル', '杉浦', 'たべる', '卿', '盆', '似顔絵', '証書', 'シミ', 'おでん', '穂', '再婚', 'ハングル', 'はり', '病む', '不意', '谷川', '花びら', '乗っ取る', '左足', '首位', '東急', '割安', '落とし穴', '憶測', '小坂', 'ノーマン', '敬遠', 'うかがえる', 'あてはまる', '管弦楽', 'グレン', '空調', '追いやる', '晴天', '受動', '障る', '画素', 'あからさま', '怠慢', 'Ｑ＆Ａ', '積立', '通れる', 'サンダル', '否認', '召す', 'ヘルメット', '平方メートル', '衣料', 'バスケット', '飲み屋', '言明', '共用', '自伝', '勝訴', '翻弄', '荒', 'ギタリスト', '取り付け', 'デッド', '神宮', '尻尾', 'タイガー', 'にし', '流域', 'ホース', '大綱', '部類', '解任', 'カルシウム', '虚構', '権益', '反則', 'フタ', 'お宝', 'おりる', '黙々と', '同胞', '行き届く', '寒', '短所', 'リアクション', '卒論', '養殖', '戯言', '医薬', '石垣', '言わば', 'ポップス', '占', '府県', 'でく', '個展', '神経質', 'レジュメ', '筒', '照射', '給油', 'まだしも', 'コウ', '買い上げ', '変質', 'すみやか', '同和', '配合', '時として', '社民党', '厨房', '適性', '注釈', '山々', '吐き気', '明治維新', '右足', 'ピエール', '大木', '省令', '動脈', 'にぎやか', 'トレーディング', '垂れる', 'とうてい', '輪郭', 'ハワード', '両替', 'しかるべき', '蓄える', '陵', '撲滅', 'マオリ', 'なつ', '偵察', '完売', '伯', 'ブロー', 'のら', '譲歩', '有り得る', '健二', 'アントニオ', 'かけがえ', '稔', 'こんにちわ', '崇高', '手形', '大王', '思い通り', '地質', '日本食', 'ぐる', 'ボディー', 'ルビー', 'アタマ', '深層', '定理', 'ファクト', '押収', '境地', '仏壇', '材質', 'あっという間', '越', '先人', '不合理', '凝らす', '紗子', '定款', '一発', '射程', 'ピル', '再販', '緒', 'ショパン', '所沢', '不問', 'クローズアップ', '特許庁', 'ワザ', '溶かす', '多角', '事物', '軍国', 'シェル', 'スタンプ', '異変', '安堵', 'バリー', '静寂', '閉塞', '随所', 'オーロラ', '集い', 'ヘッドホン', 'かま', 'かならず', '払える', '無駄遣い', 'ばり', '巡礼', '真偽', 'いちおう', '下方', '救世主', 'サラ金', '実話', '取り消し', 'みごと', 'デリー', '特産', 'おろか', '無邪気', '学説', '細分', '脳裏', '非行', '感知', '頑張れる', '人当たり', '増収', '和風', '休息', '学び', 'やれやれ', '海苔', '別個', 'メアリー', '聴こえる', '射殺', '後部', '文春', '点灯', '貧弱', 'ヘビー', '脱力', 'いも', '中南米', 'さようなら', '浜田', '獣医', 'オーブン', 'ムッ', '年明け', 'マーチ', '生態学', '岡野', '恐慌', '昔話', 'ドック', '南方', '切り出す', '辛口', 'ロット', '魔法使い', '勤勉', 'σ', 'きた', '獅子', '最短', '圧巻', '一様', 'アース', '睡る', '宮廷', '括る', '波紋', '浸かる', '化合', '刃物', 'あたえる', '慰謝', '人妻', '観劇', '戯曲', '攻防', '放す', '公民館', 'パロディ', '改築', 'んじゃ', '編曲', '矢先', '重んじる', '勃発', '創り出す', '拓', '緩い', '至', '連敗', '急落', '催し', '予見', '偏', '葬る', 'プライス', '浴', 'ナース', '栓', '柔らか', '晶', '道中', '支度', '乳幼児', '茎', '冬季', '世俗', '完備', '帰路', '営み', '村井', '仮設', '往々', '母校', '工具', 'ろくに', '俊輔', 'ニンニク', '悔やむ', 'ならぶ', 'カルテ', 'マリン', '生誕', '働きかけ', 'ブラシ', '苛立つ', '帆', 'アリア', '告訴', '遥かに', '使い道', '護', 'サウジアラビア', '早川', '振る舞う', 'わい', 'シロ', 'フェミニズム', '守り', '緩む', '激動', 'レッズ', 'やらす', '沙', 'フレンドリー', '病状', 'アルプス', '粘る', 'なじみ', '宇都宮', 'プーケット', '諭', 'ありえる', 'バタ', 'ところどころ', 'やっかい', '道理', '喜ばしい', '出逢う', '土俵', '謙', '杜', '滑稽', 'ニュートン', '敬語', '沈没', '絞り込む', '演算', '見所', '秀逸', 'シンクロ', 'ユナイテッド', '旧約', 'シカ', '石毛', '薄暗い', '概観', '蒸留', 'ラッセル', 'ブルガリア', '起立', '買い求める', '伺える', '無念', '汽車', '末尾', '牙', '平井', '子犬', '家康', '多田', '見識', 'おもし', '馳せる', '新郎', '目印', 'キッド', '絶版', 'くちる', '一段', '旧来', '海辺', 'えん', '着替え', '有望', '評す', '部局', 'アダプタ', 'まずまず', '槍', '偽る', '追随', '下請け', 'なんで', '運勢', '郵貯', '私鉄', '相棒', '囲碁', '番地', '在来', '男児', '歌える', '妃', '飢える', '平然と', 'ゴマ', '祭典', 'さきほど', '離島', '概略', 'デブ', 'かんがみる', '発病', '竣工', '両論', '司教', 'アレン', '坂道', '勝敗', '縮める', 'ｅ', '野原', '感慨', '無制限', '此処', '田植え', '係員', '再考', 'スコット', '拍車', 'いきさつ', 'インサイド', '償う', 'パートナーシップ', '留', '概算', 'かお', '奥行き', 'キュート', '大輔', 'ダライ', '中西', '四方', '人命', '振舞う', '集結', '人身', 'ロイター', '別物', '遠距離', 'のっとる', '腹筋', '林業', '耕作', '北上', '起', 'テラ', '位置付け', '現像', 'シイ', '用法', '論評', 'クアラルンプール', '銃撃', '切に', '引き返す', '汚職', '台無し', '異端', 'クイーン', '脳死', 'うんちく', '自白', 'くわしい', '退治', '引き寄せる', 'ラジ', '大口', '名声', 'コトバ', '仮面ライダー', '宴', '求職', '一安心', '親近', '右上', '都知事', '永続', 'ミック', '弾む', '軽快', 'くだり', '開館', '和子', 'えび', '新薬', '内政', '代名詞', '復刻', '若林', 'といふ', '小切手', '後進', '神戸大学', '上原', '分化', 'ほっとく', '特派', 'テッド', 'ストリーム', '薪', 'ぼん', 'ぶす', '疎通', '挙がる', '防水', '成就', '売り手', '浦', 'アスキー', '一元', '融通', 'ジェリー', '怯える', '愛称', '定め', 'インターンシップ', '議案', '察知', '音読', '山道', '卑怯', '本案', '内陸', '金髪', 'お嬢さん', '夏場', '諜報', '束縛', '後々', '漁船', '付着', '田原', '皇', '人為', '賭け', 'デイリー', '図表', '原宿', '田園', '便乗', '双方向', '先取り', '逃げ', '不運', '下請', 'レフ', '対岸', '本心', '件名', '口語', '伊丹', '吹き込む', '借家', 'えい', '絶品', 'タイムリー', '胴', 'わな', 'プロレタリア', '楽屋', '能動', 'つかまる', '佳', '包囲', '可笑しい', 'センタ', '一人前', 'コントラスト', '怪しげ', '挙式', '援護', '落選', '華人', '空襲', '公言', 'いとう', '次いで', '前衛', '惑わす', '扱える', '一因', '用心', '生き抜く', '利率', 'これだけ', '赤色', '器官', 'お粗末', 'ＶＳ', '長岡', '兵力', '天地', '有価', 'マフィア', '応急', '武藤', '性欲', '姪', 'たのしい', '元素', '表象', '延べ', 'ねずみ', '非公式', 'ドンドン', '動き回る', '寅', '武蔵野', 'イヌ', '愛しい', '召集', '最古', '管内', '王室', 'トウモロコシ', '販促', 'お便り', '直ぐ', '賀', '片付け', '揃い', '取り合う', 'アフター', 'バード', '画一', '挙動', '艦長', '直し', 'ハイブリッド', '渡し', '大通り', '豪州', '没収', '日本テレビ', '双', 'マーティン', 'ハチ', '加味', '横行', '誇張', '頒布', '初演', '系譜', '問答', 'マイペース', '円形', '書き直す', 'ことわざ', 'しがみつく', '優勢', '古く', 'レーン', '竹田', 'ユネスコ', 'あそぶ', 'ハンセン病', '菊池', 'ふらふら', '伯爵', '内職', '要塞', '所蔵', '立ち会う', '年頃', '足首', '上告', '農林水産省', 'ハンカチ', '亀田', '通り抜ける', 'を以て', '講和', '反米', '屋内', '生理学', '英訳', '文庫本', 'イラ', 'くるむ', 'バラード', '探究', 'か国', '滑らか', '察', '五十嵐', '監禁', '下品', 'ＭＦ', '釧路', '使い捨て', 'ワンピース', '次女', 'ディス', '布告', '持ち', '車種', 'カトリック教', 'エド', '吉本', '換金', 'マリオ', 'あやしい', '点字', 'かぼちゃ', '日テレ', 'トホホ', 'ふるまう', '大自然', '創始', '近付く', '誤認', '不合格', 'ジャクソン', '参列', '生年月日', '呼び名', 'このほど', 'アサ', '直子', 'とかく', '恥じる', '浅田', 'マドリード', '既得', '乗務', 'ざま', '沸騰', 'ウイスキー', 'タバ', 'エキスパート', '富豪', 'パット', '新婦', '根気', 'サウナ', '日本経済新聞', '仮処分', 'ソル', '虫歯', '大連', '煮込む', '力士', '代弁', '欠', '弥', '代用', 'ふんだんに', '真似る', '大雑把', 'キリン', 'かなえる', '留守番', '不動', '川端', '想', '秀雄', '境遇', '北海', 'さぼる', '混入', '独学', '狐', '意匠', 'ウルトラマン', '歪曲', '水害', '撫でる', '逃走', '採集', 'まっとう', 'せしめる', '阪', 'かれこれ', 'カラフル', '繁', '流布', 'ワイヤー', '磁石', '緩める', '祈願', '不器用', 'ラオス', 'ハローワーク', '溜める', 'ファイア', '調教', '大津', '着々と', 'ひきこもる', 'ナレーション', '塚本', 'スチール', '邪悪', '陰陽', '台場', 'ビビる', '健常', '未経験', 'ジュネーブ', '皇位', 'いふ', '綱領', '豆乳', '仲良い', 'リフト', '汲む', '河合', '劉', '押える', '場内', '愕然', '星空', '達也', '篤', '押し出す', '乗り換え', '招集', '投げ出す', '壁画', 'ハロ', '思いがけない', '思い返す', '新橋', 'めちゃめちゃ', '下地', '免', '新装', '規程', '返し', '割高', 'リーズナブル', '書式', '監理', '中絶', '軍備', '備考', '吉村', 'パーフェクト', '癒着', '石橋', '落胆', '払い', '関す', '牽引', '決め手', '水族館', '一日中', '水晶', 'シャイ', 'エッジ', '沿線', 'すがる', '監獄', 'レスポンス', '三角形', 'ヤマト', '取りまとめる', '張り切る', '版元', '大人しい', '溶け込む', '切り上げる', '幾分', '離せる', 'ベーシック', '協業', '八田', 'アレックス', '日本円', '行程', 'シュー', '松子', '数時間', '質感', '邦人', 'ショートカット', '院生', '断層', 'ヒール', 'そういや', '丸の内', 'ルネサンス', 'ジル', '別館', 'お疲れさま', 'モス', '採掘', '一遍', 'トラベル', 'ぼちぼち', '振込む', '母語', '射る', 'よむ', '軍部', 'かいな', 'お守り', '投棄', '黒板', 'からい', '時効', '尼崎', '旭川', '一掃', 'ハザード', 'フェラーリ', '史観', '称号', '手頃', 'ワット', '進入', '和菓子', '必勝', '反感', 'あす', '日野', 'チカ', '極秘', '養老', '豊田', '古墳', 'アトラクション', 'ヤマハ', 'ヴァイ', '合体', '不機嫌', '品切れ', '潜入', '一眼', '西ドイツ', '後任', '姑', '考え出す', '出没', '足場', '見せつける', '下宿', 'その頃', '骨董', 'ドーナツ', '不景気', '塁', '緑地', 'かりる', 'こまかい', '祖', '實', 'バイアス', '大平', '月給', '併設', 'ハワイアン', 'はれる', 'レジスト', '転生', 'テクスト', 'ナベ', 'レベルアップ', '伝言', 'しきりに', '所存', '配管', '雀', '赤松', '聖職', '和む', '危惧す', '円盤', 'わらしべ', '毒性', '絶好調', '立花', '道端', '堪える', 'スペル', '春日', '浴びせる', '隔てる', '敏', '専門医', '窮屈', '種子', '頻発', '金星', '生死', '略奪', '鴨', '中心地', '同種', '刺繍', '別人', '綿密', 'クーデター', '行儀', '月収', '機関車', '悟り', 'コンペ', 'みそ', '鉄人', 'ヌード', '憂慮', '抹茶', '強迫', '重厚', '増減', 'たいして', '彫る', '不起訴', '印鑑', 'ウマ', 'スナック', 'ボールペン', '突き進む', '受け取れる', '伊達', '悪役', '雅子', 'セルビア', 'うんと', 'ノーマル', '単調', 'トロイ', 'トリー', '鳥居', 'へー', '図解', 'こまめ', '源氏', '未然', '養育', '善い', '率先', 'つぎ込む', '要綱', '疾走', '自粛', '全滅', '電機', '見聞', '有難い', '豪雨', 'カミさん', '縄', '心得', '待ち受ける', '緑茶', '松原', 'トランプ', 'μ', 'そのうえ', '大佐', '梱包', '幹線', '恵子', '蜜', 'ラテン語', '県議会', 'フルート', '笑わせる', '読み物', '木星', '宋', '衛', 'かくして', '顔つき', 'プッシュ', '頭上', '成り行き', '手記', 'エフェクト', '連覇', '私学', '三田', '埃', 'グレイ', 'エドワード', '対称', '資', '疎い', '痒い', 'ヤンキー', 'スマ', 'パイオニア', 'きち', 'ピュア', 'オートバイ', '編む', 'パワーアップ', '当座', '凌', '鳴き声', '訳注', '軽井沢', '出来高', '風刺', 'しだい', '回顧', '炎症', '等級', 'おと', 'りょう', '小樽', 'カウンタ', '築', 'マンゴー', '岩崎', '精通', '幼稚', '善悪', '盗作', '係わる', 'かぶせる', '同上', '解す', '流れ込む', '遅らせる', '絹', 'カーソル', '恨む', '根元', '一泊', 'ＩＤ', '芽生える', 'しゅう', '頼もしい', '敷居', 'おさえる', 'バネ', '専属', '書名', '新約', '終り', 'タック', '散乱', '野蛮', '断面', 'しない', 'あっせん', 'ベール', '館内', 'つくり出す', 'ＢＧＭ', 'つかまえる', '請け負う', '潔い', 'ダブる', 'プロパガンダ', 'おねがい', '修得', 'この方', '萬', '貞', '壮絶', 'リスナー', '体裁', '痴漢', 'レンガ', '陶芸', '因縁', '急上昇', '病理', 'スティーブン', '安楽', '満腹', '号泣', '別紙', '和声', '唖然', 'ちぎる', 'ダウ', 'りえ', '悪人', '花屋', '読み取れる', 'シリアス', '河原', '壁面', 'コリン', '唸る', '仙', '弁理', '辞', '当番', '停める', '岬', '偽善', '交響楽', 'ミナ', 'エンジェル', '特約', '竿', 'ティム', 'ブドウ', '慰霊', '櫻井', 'モニタリング', '爺', '優越', 'ベーコン', 'ファイト', '数理', 'ヤミ', '慈善', '羽根', '会派', '絡み合う', '山岡', '博覧', 'モル', '落合', '共催', 'でき', 'ゆるい', '憲', 'ダイジェスト', '思い当たる', '炸裂', 'ながめる', 'そらす', '範', '内需', '蒸す', '水路', '鎧', '焼き鳥', 'トレイ', '生き残り', '遊戯', '既定', '申し述べる', '台北', '由紀夫', 'ルーマニア', 'フランチャイズ', '協賛', '自分勝手', 'うさ', '与る', 'ジーニョ', '思案', '南東', 'ユニオン', 'もめる', '廃墟', 'チーフ', '不毛', '米兵', '先導', '砦', 'ひで', '順に', '処方箋', '査察', '自決', '年月日', '飢餓', '睨む', 'どきどき', '出雲', '経団連', 'きのこ', '錬金術', 'さまよう', 'いとこ', '復刊', '威嚇', '握り', '滅亡', '外野', '６つ', '歓喜', '手話', '全編', '控え', 'サントラ', '海面', '不変', 'ペイント', '製図', 'ノミネート', 'ペダル', '上質', '連なる', '本館', '雌', 'バク', '東京タワー', '人参', '小中学校', 'ニコラ', 'けんか', 'ハーモニー', '育毛', '論説', '色気', '笑い声', '意地悪', '素顔', '目覚まし', '明石', '想起', '菅野', '前項', '南国', '火葬', 'ポルシェ', '加筆', '鉱業', '後遺症', 'フロイト', '投球', '寄贈', '西暦', '砕く', 'たたかう', 'グローバリゼーション', '錬る', '私生活', 'レタス', '車輪', '岩国', '立ち直る', 'まちがい', '静香', 'フェンス', 'ノブ', '匠', '積雪', '電電', '特製', 'たどりつく', '一撃', '体現', '獲物', '慶應義塾', '定住', 'リーチ', 'ミソ', 'ＢＢＣ', '手直し', '平常', '学童', '養', '化け', 'ジャッジ', 'モスク', '寝かせる', 'カオス', 'ピアス', 'リュック', '中国共産党', '塚', 'アジ', '杉本', '恐るべき', 'デュアル', '精神病', '嗅ぐ', '初恋', '試料', '一昔', '繋げる', 'おまかせ', '長調', '飛び降りる', '主審', '西海岸', 'ニュースレター', '稲葉', 'さめる', 'あいかわらず', '二日酔い', 'ドロ', '乱す', '÷', 'タイガース', 'サーカス', '公示', '客室', '決めつける', '救命', '結び付ける', '退去', '人名', '思索', '税別', '中央アジア', '漁', '則る', '逆行', '貸', '低温', 'やり直し', '溶接', '特段', 'ふじ', '浴室', '山積み', '上乗せ', 'ＳＳ', 'サイレン', '品格', '頼み', '小麦粉', '不可避', '打破', 'メッセンジャー', '待てる', '斡旋', '行財政', '直視', '終点', '尋常', '賞与', '校内', '信憑', '鳩山', '祖父母', '免税', 'エディタ', 'レオン', 'おちる', '仕草', '抵触', '出稼ぎ', 'キモ', '力不足', '効能', 'あの世', '脳みそ', '白色', '外界', '毛沢東', '蔵書', '服従', '極意', '打ち明ける', 'エッセー', '発進', 'カンヌ', 'スポンジ', '近江', '身柄', '徹す', '皇后', 'もどき', '揶揄', '徴兵', '会食', '耐性', '川柳', 'パンドラ', '初旬', '売り込む', 'こらえる', 'ポータブル', 'じゃー', '飛びつく', '真珠', 'ピカ', '半角', 'たたえる', 'トロント', 'スライス', 'きもの', 'イースター', 'ホークス', '武術', 'くどい', '呪う', '後述', '揺らぐ', '電線', 'ノア', 'ガザ', '脱退', '右下', '義父', '鍵盤', '自営業', '光線', '成田空港', '腑', '続報', '宣教師', '必殺', '内的', 'ゼリー', '横目', 'ツケ', '同性', '一目瞭然', '人手', '文藝春秋', 'キツ', '絡める', '明け方', '聞き手', '拙い', '酸味', 'レッテル', '漢方', '祭壇', '十字', '製剤', '主食', '剃る', '男系', '火曜', 'イスラーム', '災い', 'くっきり', '民謡', '日の出', '杉並', '直人', '特筆', '駆け引き', 'バスケットボール', 'かぎる', '西宮', 'くらし', 'ペニス', '発刊', '主将', 'ギャラ', 'さながら', '個所', 'つかえる', '申し入れ', '住友', 'いぬ', '投信', '鯛', 'バーゲン', 'メンバ', 'エディション', '人間らしい', 'レバノン', '厳正', 'つぶる', 'しっぽ', 'もの凄い', '起点', '灯油', '観覧', 'ぼやく', 'バッシング', '棚田', 'あんま', '柴', 'プレーオフ', '空母', 'マウント', 'カゴ', 'まこと', '生意気', 'けす', '有線', 'ハンバーグ', '右肩', 'カキ', '出先', '巻末', '走り出す', '揺さぶる', '義母', '學', '団子', 'よろこぶ', '段々', '何せ', 'スマイル', '差し支える', '収縮', '締めくくる', 'キチン', '検知', 'ゾウ', '裏腹', '小柄', '密輸', 'ＰＭ', 'ロフト', '倒壊', '中越', '在外', 'すくう', '団員', 'セメント', '負け犬', '便秘', '思い描く', '電報', 'ＦＩＦＡ', '適', '奪', '顕微鏡', 'ドラフト', 'アーサー', 'プレビュー', '官民', '最下位', 'セーフ', '入れ替え', '醸成', '丞', '関心事', '顕在', '直近', '豪快', 'シーツ', '討つ', 'きたす', '健一', '嘆き', '冤罪', '重心', '一味', '無差別', '仏像', '売れ行き', 'ミレニアム', '乱れ', 'マーカー', '蛋白', '乞う', '和夫', '現況', 'ガーナ', 'アングル', '切り替わる', '検察庁', '実地', 'こら', 'さびしい', '心得る', '晩餐', 'とっさ', '利己', '顧みる', 'ふまえる', '慕う', '講堂', 'プランニング', 'ズーム', '彗星', 'サンプリング', '西口', '山脈', '年長', '果てしない', '男らしい', '称える', '投融資', '後回し', '旅費', '航路', '結社', 'ナマ', 'バスケ', '川島', 'てっきり', '食用', '間抜け', 'ブレーク', 'ほどほど', 'ジーン', '気象庁', '鵬', '醸し出す', '勉', '粉砕', '読み手', '一々', '葵', '引数', 'リタイア', '近道', '本拠地', '人魚', '床屋', '志す', '隠れ', '転売', '断ち切る', '前身', '八幡', 'つなぎ', 'ブラッド', '齋藤', '探知', 'フッ', 'ティーン', '断じて', '試乗', '築き上げる', '五感', '語句', '環状', 'ぶろ', 'フライパン', 'あご', 'コーディング', '血統', '模', '気取る', '大袈裟', '建材', 'シャフト', 'ステッカー', '直に', '代議士', '駅伝', 'スリランカ', '総て', '附帯', '絵柄', '忘れ', '濱', 'ルネッサンス', '平ら', 'シーア', '農作物', '総勢', '出向', '佐伯', '飛び立つ', '普', '自虐', 'つつく', '被験者', '陳腐', '重傷', '小雨', '偽物', '精製', '引き合い', '割愛', '長らく', '水銀', 'まなざし', '言い出す', '覇権', 'ナナ', '森下', '公用', '観音', '手腕', 'ライム', 'ひらめく', '定型', '懸案', '中谷', '駆け込む', '和音', '来客', '教え子', '模試', '等価', '近世', '宣教', 'ロケーション', 'アパレル', 'ふしぎ', '調印', 'あえる', '専売', '敬称', '送迎', 'どっぷり', 'ケット', 'インテリジェンス', '編入', '逸品', 'ブス', 'きゅう', '長続き', '答案', 'じい', '電磁', 'みゆき', 'ハト', '練馬', '牧', 'ガリ', '微分', 'パラパラ', '中等', '格付け', '洋画', '絶叫', '終末', '帰結', '有様', 'タール', 'ハイライト', '威', '筋力', '業態', 'じわじわ', '占星術', 'あったかい', '躍進', '葉書', 'アンティーク', 'トースト', 'キズ', 'ただす', '旅客', '左上', '折り紙', 'ギルド', '訓', '本性', '果樹', '鮎', 'さいたま', '河口', '学識', '魔力', 'ベンツ', '争議', '萎縮', '溺れる', '水谷', '格子', '堤防', 'トンボ', '片岡', '劣等', '邦訳', '易', 'なぁー', '足音', 'カンタン', '静脈', 'サーブ', '欺瞞', '廉価', '実技', '呆然と', '確固たる', '丹羽', '弁明', '摘む', '夕べ', '売場', 'たたき台', 'かしこ', 'バックグラウンド']
        this.part = ["は", "か", "が", "に", "の", "だ", "に", "へ", "を", "と", "や", "など", "も", "も", "に", "に", "で", "と", "の", "から", "より", "まで", "くらい", "ほど", "ばかり", "で", "か", "を", "を", "に", "に", "に", "と", "という", "とか", "で", "と", "より", "より", "くらい", "ほど", "か", "も", "に", "をする", "でも", "でも", "で", "から", "に", "は", "が", "を", "で", "で", "だけ", "だけ", "で", "でも", "も", "でも", "ばかり", "ばかり", "ところ", "が", "から", "ながら", "が", "の", "から", "ので", "の", "の", "なら", "なら", "と", "ば", "ばいい", "ば", "たら", "たら", "ところ", "ても", "ても", "ても", "ては", "のみ", "まで", "さえ", "さえ", "のに", "ながら", "とか", "たり", "たり", "のに", "のです", "きり", "きり", "とも", "ながら", "しか", "しかない", "し", "し", "とも", "に", "か", "か", "だの", "だの", "など", "やら", "やら", "ても", "とも", "は", "と", "など", "くらい", "ほど", "ほど", "だけ", "だけ", "と", "と", "なり", "なり", "こそ", "こそ", "ては", "に", "に", "にしては", "にとって", "について", "とも…とも", "が", "は", "として", "として", "ばかりでなく", "だけ", "のみ", "なり", "がはやいか", "やいなや", "かないうちに", "ばかり", "ばかりに", "すら", "など", "とも", "ともあろうひと", "どころか", "だけに", "までもない", "ものの", "ところで", "けれども", "けれども", "が", "けれども", "ね", "ね", "ね", "ねえ", "よ", "よ", "かしら", "かな", "な", "な", "なあ", "なあ", "の", "わ", "さ", "こと", "こと", "もの", "とも", "ものか", "や", "たら", "やら", "ぜ", "ぞ", "", "は", "か", "が", "に", "の", "は", "に", "へ", "を", "と", "や", "など", "も", "も", "に", "に", "で", "と", "の", "から", "より", "まで", "くらい", "ほど", "ばかり", "で", "か", "を", "を", "に", "に", "に", "と", "という", "とか", "で", "と", "より", "より", "くらい", "ほど", "か", "も", "に", "をする", "でも", "でも", "で", "から", "に", "は", "が", "を", "で", "で", "だけ", "だけ", "で", "でも", "も", "でも", "ばかり", "ばかり", "ところ", "が", "から", "ながら", "が", "の", "から", "ので", "の", "の", "なら", "なら", "と", "ば", "ばいい", "ば", "たら", "たら", "ところ", "ても", "ても", "ても", "ては", "のみ", "まで", "さえ", "さえ", "のに", "ながら", "とか", "たり", "たり", "のに", "のです", "きり", "きり", "とも", "ながら", "しか", "しかない", "し", "し", "とも", "に", "か", "か", "だの", "だの", "など", "やら", "やら", "ても", "とも", "は", "と", "など", "くらい", "ほど", "ほど", "だけ", "だけ", "と", "と", "なり", "なり", "こそ", "こそ", "ては", "に", "に", "にしては", "にとって", "について", "とも…とも", "が", "は", "として", "として", "ばかりでなく", "だけ", "のみ", "なり", "がはやいか", "やいなや", "かないうちに", "ばかり", "ばかりに", "すら", "など", "とも", "ともあろうひと", "どころか", "だけに", "までもない", "ものの", "ところで", "けれども", "けれども", "が", "けれども", "ね", "ね", "ね", "ねえ", "よ", "よ", "かしら", "かな", "な", "です", "なあ", "なあ", "の", "わ", "さ", "こと", "こと", "もの", "とも", "ものか", "や", "たら", "やら", "ぜ", "ぞ",
            "぀", "ぁ", "あ", "ぃ", "い", "ぅ", "う", "ぇ", "え", "ぉ",
            "お", "か", "が", "き", "ぎ", "く", "ぐ", "け", "げ", "こ",
            "ご", "さ", "ざ", "し", "じ", "す", "ず", "せ", "ぜ", "そ",
            "ぞ", "た", "だ", "ち", "ぢ", "っ", "つ", "づ", "て", "で",
            "と", "ど", "な", "に", "ぬ", "ね", "の", "は", "ば", "ぱ",
            "ひ", "び", "ぴ", "ふ", "ぶ", "ぷ", "へ", "べ", "ぺ", "ほ",
            "ぼ", "ぽ", "ま", "み", "む", "め", "も", "ゃ", "や", "ゅ",
            "ゆ", "ょ", "よ", "ら", "り", "る", "れ", "ろ", "ゎ", "わ",
            "ゐ", "ゑ", "を", "ん", "ゔ", "ゕ", "ゖ", "゙", "゚", "゛",
            "゜", "ゝ", "ゞ", "゠", "ァ", "ア", "ィ", "イ", "ゥ", "ウ",
            "ェ", "エ", "ォ", "オ", "カ", "ガ", "キ", "ギ", "ク", "グ",
            "ケ", "ゲ", "コ", "ゴ", "サ", "ザ", "シ", "ジ", "ス", "ズ",
            "セ", "ゼ", "ソ", "ゾ", "タ", "ダ", "チ", "ヂ", "ッ", "ツ",
            "ヅ", "テ", "デ", "ト", "ド", "ナ", "ニ", "ヌ", "ネ", "ノ",
            "ハ", "バ", "パ", "ヒ", "ビ", "ピ", "フ", "ブ", "プ", "ヘ",
            "ベ", "ペ", "ホ", "ボ", "ポ", "マ", "ミ", "ム", "メ", "モ",
            "ャ", "ヤ", "ュ", "ユ", "ョ", "ヨ", "ラ", "リ", "ル", "レ",
            "ロ", "ヮ", "ワ", "ヰ", "ヱ", "ヲ", "ン", "ヴ", "ヵ", "ヶ",
            "ヷ", "ヸ", "ヹ", "ヺ", "・", "ー", "ヽ", "ヾ", //adv
            /*"あまり", "いつも", "おそらく", "かなり", "きっと",
            "さっそく", "しばしば", "すでに", "そう", "たくさん",
            "だいたい", "ちょっと", "とても", "なかなか", "なお",
            "なかなか", "ほとんど", "まだ", "ゆっくり", "よく"*/
        ]
        let art = this.part
        let uniqueArray = art.filter(function (item, pos) {
            return art.indexOf(item) == pos;
        })
        var I = 0
        this.part = uniqueArray
        //console.error(uniqueArray);
        this.known = 3200
        this.knownM = 190
        this.auto = false
        this.tb = true
        this.tbs = 0
        this.wiki = localStorage.getItem('wk') === 'true'; //localStorage.getItem('wkt') === 'true' ? true : false;
        this._previousText = null
        //document.addEventListener('contextmenu', event => event.preventDefault());
        let q = document.querySelector('.query-parse-segment')
        //chrome.contextMenus.onClicked.addListener (searchUrbanDict);
        //window.onbeforeunload = function (e) {
        //localStorage.setItem('scrollpos', window.scrollY);
        //}
        this.eP = document.createElement('div')
        let z
        if (this.search) {
            z = this._display.fullQuery == '' ? document.URL.substring(document.URL.indexOf('=') + 1) : z
        } else {
            z = this.v
        }
        var v = localStorage.getItem('lang');
        if (v == null) {
            v = 'ja';
            localStorage.setItem('lang', 'ja');
        }
        this.lang = v
        let zs = z.toLowerCase().split('+')
        console.dir(zs)
        let lg = zs[0]
        let l = -1
        var mode = 50
        if (lg == 'id') {
            l = 2
        }
        if (lg == 'zh') {
            l = 0
        }
        if (lg == 'ja') {
            l = 1
        }
        if (lg == 'en') {
            l = 99
        }
        var fft = true
        let ff = async () => {
            console.warn(zs, l);
            let lngs
            if (this.search) {
                lngs = document.querySelector(".content-body-inner").appendChild(document.createElement("div"))
            } else {
                lngs = document.body.appendChild(document.createElement("div"))
            }
            for (let i in zs) {
                if (fft) {
                    if (i == 0 && l >= 0) {
                        l = 2
                        i += 1
                    }
                    z = zs[i]
                    if (zs[i]) {
                        let st = await this.wkt(zs[i], l)
                        lngs.style.display = 'flex'
                        lngs.className = 'langs'
                        let lng = lngs.appendChild(document.createElement('div'))
                        lng.style.width = '13em'
                        let ue = (str) => {
                            return str.replace(/\\u([a-fA-F0-9]{4})/g, function (g, m1) {
                                return String.fromCharCode(parseInt(m1, 16));
                            });
                        }
                        st = st.replaceAll(/\\n/g, '');
                        st = st.replaceAll('>Indonesian<', '>Bahasa Indonesia(ID)<');
                        if (l >= 0) {
                            st = st
                        }
                        let x = document.createElement('div')
                        x.innerHTML += ue(st)
                        x.className = 'wikty'
                        //x.appendChild(x)
                        document.querySelector('.save').insertAdjacentElement('afterend', x)
                        let y = []
                        st = st.replaceAll(/\\n/g, '');
                        //h.innerHTML += '</br><div class="wkt">' + ue(st) + '</div>'
                        let lu = x//h.querySelectorAll('.wkt')
                        //lu = lu[lu.length - 1]
                        let lc
                        try {
                            //lc = lu.querySelector('.mw-parser-output').childNodes//lu.children
                            console.warn(lu, lc);
                            let lt = false
                            let ad = false
                            let or = false
                            let lz = ''
                            let iz = 0
                            let ip = ''
                            let jl = []
                            let b = []
                            let org = []
                            let o = ''
                            let al = []
                            let a = []
                            //org = [lu.innerHTML]
                            lng.className = 'wk'
                            lu.innerHTML = lu.innerHTML.replaceAll('href="/wiki/', 'href="https://en.wiktionary.org/wiki/')
                            lng.innerHTML += lu.innerHTML
                            lng.querySelector('.catlinks').remove()
                            let no = lng.querySelector('#bodyContent')
                            for (let u = 0; u < 6; u++) {
                                try {
                                    no.children[0].remove()
                                } catch { }
                            }
                            lng.querySelector('#mw-navigation').remove()
                            lc = lng.querySelector('.mw-parser-output').children
                            let m = 0
                            while (m < lc.length) {
                                if (lc.length > 100000) {
                                    //break
                                }
                                if (m >= 0) {
                                    try {
                                        if (lc[m].innerHTML.length > 0) {
                                            console.log(lc[m].tagName)
                                            if (lc[m].tagName == 'H2') {
                                                console.log(lc[m].innerText)
                                                if (lc[m].innerText.includes('Indones')) {
                                                    //let sel = 
                                                    //ad = false
                                                    ad = true
                                                    or = true
                                                    lt = false
                                                } else if (lc[m].innerText.includes('Malay')) {
                                                    //
                                                    or = false
                                                    lt = true
                                                    ad = false
                                                    //iz = 0
                                                    //lz = lc[m].innerHTML
                                                } else {
                                                    iz = al.length - 1
                                                    lz = lc[m].innerHTML
                                                    lt = false
                                                    ad = false
                                                    or = false
                                                }
                                            }
                                            //lz = lc[m].innerHTML
                                            try {
                                                //if (lc[m].innerText.includes('Definitions')) {
                                                //or = false
                                                //lt = false
                                                //}
                                            } catch { }
                                            try {
                                                a.push(lc[m].innerHTML + ' ')
                                                if (lt) {
                                                    jl.push(lc[m].innerHTML + ' ')
                                                } else if (or) {
                                                    org.push(lc[m].innerHTML + ' ')
                                                } else if (ad) {
                                                    al.push(lc[m].innerHTML + ' ')
                                                } else {
                                                    lc[m].remove()
                                                    m -= 1
                                                    //b.push(lc[m].innerHTML)
                                                }
                                            } catch { }
                                            //console.log(m, lc[m].innerHTML, iz, lz, lt, ad)
                                        }
                                    } catch (esx) {
                                        console.log(esx)
                                    }
                                    m += 1
                                }
                                for (let ll of org) {
                                    //lng.innerHTML += ll
                                }
                            }
                        } catch (le) {
                            console.error(le);
                        }
                    }
                }
                let lis
                if (l == 330) {
                    lis = document.querySelector(".content-body-inner").querySelectorAll('li')
                    let tll
                    for (let ijk in lis) {
                        if (ijk >= 0) {
                            tll = await this.tl(lis[ijk].innerHTML, 'id', 'en', 0)
                            //console.dir(lis[i])
                            console.dir(tll)
                            for (let i in tll) {
                                if (tll[i] !== null && tll[i].length > 0 && typeof tll[i] == 'object') {
                                    for (let j in tll[i]) {
                                        if (tll[i][j] !== null && tll[i][j].length > 0 && typeof tll[i][j] == 'object') {
                                            console.log(tll[i][j]);
                                            lis[ijk].innerHTML += '<p style="margin:0px; border: 1px solid rgb(120,0,0);">' + tll[i][j][0] + '</p>';
                                            //break
                                            //[k]
                                            //this.t.innerHTML += '</br>'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            fft = false
        }
        try {
            chrome.storage.sync.set({ "save": "myBody" }, function () {
                //  A data saved callback omg so fancy
            });
            chrome.storage.sync.get(/* String or Array */["yourBody"], function (items) {
                //  items = [ { "yourBody": "myBody" } ]
            });
            this.save = localStorage.getItem('save')
            art = this.save.split(',')
            let uniqueArr = art.filter(function (item, pos) {
                return art.indexOf(item) == pos;
            })
            uniqueArr.join(',')
            this.save = uniqueArr
            //localStorage.setItem('save', uniqueArr)
        } catch (sno) {
            console.error(sno);
        }
        var run = localStorage.getItem('run') === 'true' ? true : false;
        this.lang = localStorage.getItem('lng');
        var lng = this.lang
        this.kan = localStorage.getItem('kan') === 'true' ? true : false;;
        var kan = this.kan
        this.pe = localStorage.getItem('pt') === 'true' ? true : false;;
        var pt = this.pe
        this.min = parseInt(localStorage.getItem('min'))
        var min = this.min
        var istart = 0
        this.istart = istart
        if (this.search || this.page) {
            this.frst = true
            var ft = true
            this.read = true
            var txt = ''
            if (this.search) {
                txt = this._display.fullQuery
            } else {
                txt = this.v
            }
            //let mode = 'lyrics'
            var spl = txt.split('\n')//.filter(item=>item);
            this.frst = ft
            this.jpu = japaneseUtil
            let fr = true
            this.start = true
            var splitter = function (str, l) {
                var strs = [];
                while (str.length > l) {
                    var pos = str.substring(0, l).lastIndexOf(' ');
                    pos = pos <= 0 ? l : pos;
                    strs.push(str.substring(0, pos));
                    var i = str.indexOf(' ', pos) + 1;
                    if (i < pos || i > pos + l)
                        i = pos;
                    str = str.substring(i);
                }
                strs.push(str);
                return strs;
            }
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
                        tt = typeof spl[ii] == 'string' ? spl[ii] : spl[ii].join()
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
                        }
                        console.warn(il);
                        if (!(il > 200 || spl.length > 4)) {
                            this.slow = true
                        }
                        this.modK = document.createElement('div')
                        this.modK.id = 'modK'
                        this.modK.style.display = 'flex'
                        //this.modT.style.display = 'flex'
                        //this.modT.style.flexDirection = 'column';
                        this.modK.style.flexWrap = 'wrap'
                        this.modK.style.minWidth = '10%'
                        if (false && o('pre')) {
                            this.modP.prepend(this.modK)
                        } else {
                        }

                        let isKana = japaneseUtil.isStringPartiallyJapanese(tt)
                        let line = []
                        //var ptxt = document.createElement('div')
                        let e = document.createElement('h4')
                        let ltp
                        try {
                            //var ps = spl[ii].split(' ')
                            ltp = document.querySelectorAll('.full');
                            ltp = ltp[ltp.length - 1];
                        } catch { }
                        let ptxt = ltp

                        ptxt.className = 'sentence'
                        let ap = 0
                        var p = []
                        //this.modP.appendChild(ptxt)
                        let ttl = ttx.length
                        let tti = 0
                        let si = 0
                        if (isKana) {
                            this.modP.appendChild(this.modK)
                            console.warn(this.modK, this.modP);
                            tt = tt.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '')
                            let sc = this.most.slice(0, this.known).includes(tt)
                            let rmj = o('roma') ? 'hb' : 'kana'
                            let moe = await this.web(encodeURI(`https://ichi.moe/cl/qr/?r=${rmj}&q=${tt}`))
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
                            let mns = mo.contentWindow.document.querySelectorAll('div.gloss-content.scroll-pane > dl')
                            let rom = mo.contentWindow.document.querySelector('#div-ichiran-result > p > em')
                            console.warn(mns)
                            let c = mns
                            let emph = false
                            for (let ii in mns) {
                                try {
                                    if (this.stop) {
                                        return
                                    }
                                    let ana = true
                                    if (ana && mns[ii].innerHTML) {
                                        try {
                                            try {
                                                mns[ii].querySelector('.sense-info-note.has-tip').remove()
                                            } catch { }
                                            let comc = mns[ii].querySelector('.conj-via')
                                            let mn = mns[ii].querySelectorAll('li')
                                            let con = mns[ii].querySelector('.conj-gloss')
                                            let com = mns[ii].querySelector('.compounds')
                                            let comp = mns[ii].querySelector('dl>dt')
                                            let mp = mns[ii].querySelector('.compound-desc-word')
                                            let dd = mns[ii].querySelector('dd')
                                            let pm = true
                                            if (comp == null) {
                                                pm = false
                                            } else if (com != null && mp != null) {
                                                pm = com
                                            } else if (comc != null) {
                                                pm = comc.parentElement
                                            } else if (con != null) {
                                                pm = con
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
                                                        pm.innerHTML += '<li>' + mn[u].innerHTML + '</li>'
                                                    }
                                                }
                                                pm.innerHTML += cc
                                            }
                                        } catch { }
                                        ttt = mns[ii].querySelector('dt').innerHTML.split(' ')
                                        tt = parseInt(ttt[0].substring(0, 1)) >= 0 && ttt.length > 1 ? ttt[1] : ttt[0]
                                        tts = mns[ii].parentElement.parentElement.children[0].children[0].innerText
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
                                                let elem = ele.target.closest('.mns')
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
                                                elem.classList.add('fav')
                                                elem.style.setProperty('--cc', 'gray');
                                                elem.style.setProperty('--sz', '0.8em');
                                                if (elem.style.height != '') {

                                                    elem.style.height = ''
                                                    elem.style.flex = 'none'
                                                } else {
                                                    elem.style.height = height

                                                    elem.style.flex = width
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
                                                posr = [pos, ele, ps]
                                                try {
                                                    document.querySelector('#cur').id = 'prev'
                                                } catch { }
                                                elem.id = 'cur'
                                                //elem.style.border = '1px dotted red'
                                                if (!ist && !ele.button != 2) {
                                                    return
                                                }
                                                if (ele.target.closest('.w') && e.ctrlKey == true) {
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
                                                if (elem.style.height != '') {

                                                    elem.style.height = ''
                                                    elem.style.flex = 'none'
                                                } else {
                                                    elem.style.height = height

                                                    elem.style.flex = width
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
                                        let hs = document.createElement('span')
                                        hs.className = `words ${I}`
                                        hs.setAttribute('i', I)
                                        elem.classList.add(I)
                                        elem.setAttribute('ind', I)
                                        hs.innerHTML = `<ruby class="word">${tt}<rt class="reading">${tts}</rt></ruby>`;
                                        hs.style.border = ''
                                        ptxt.appendChild(hs)
                                        p.push(hs)
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
                                        const replacement = `<span class="words" i="${I}"><ruby class="word">${tt}<rt class="reading">${tts}</rt></ruby></span>`;
                                        const textContent = ltp.textContent;
                                        /*                                        let currentIndex = textContent.indexOf(searchString);
                                                                                console.warn(elem,tt,textContent, currentIndex);
                                                                                while (currentIndex !== -1) {
                                                                                    const before = ltp.innerHTML.substring(0, currentIndex);
                                                                                    const after = ltp.innerHTML.substring(currentIndex + searchString.length);
                                                                                    ltp.innerHTML = before + replacement + after;
                                                                                    currentIndex = ltp.textContent.indexOf(searchString, currentIndex + replacement.length);
                                                                                    console.warn(currentIndex, before, after);
                                                                                }
                                          */
                                        /*try {

                                            const searchString = 'tt'; // Replace 'substring' with your desired substring
                                            const replacement = `<span class="words" i="${I}"><ruby class="word">${tt}<rt class="reading">${tts}</rt></ruby></span>`;
console.warn(ltp,ltp.children);
                                            if (ltp.children.length === 0) {
                                                // If the 'ltp' element has no child elements (only text content)
                                                let currentIndex = ltp.textContent.indexOf(searchString);
                                                let nodeOffset = 0;
console.warn(currentIndex);
                                                while (currentIndex !== -1) {
                                                    const before = ltp.textContent.substring(0, currentIndex);
                                                    const after = ltp.textContent.substring(currentIndex + searchString.length);

                                                    const spanElement = document.createElement('span');
                                                    spanElement.innerHTML = replacement;

                                                    const beforeNode = document.createTextNode(before);
                                                    const afterNode = document.createTextNode(after);

                                                    console.log('Before:', before);
                                                    console.log('After:', after);

                                                    ltp.innerHTML = '';
                                                    ltp.appendChild(beforeNode);
                                                    ltp.appendChild(spanElement);
                                                    ltp.appendChild(afterNode);

                                                    currentIndex = after.indexOf(searchString);
                                                    nodeOffset += currentIndex + searchString.length;

                                                    console.log('Current Index:', currentIndex);
                                                    console.log('Node Offset:', nodeOffset);
                                                }
                                            } else {
                                                // If the 'ltp' element has child elements
                                                const textNodes = Array.from(ltp.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);

                                                textNodes.forEach(textNode => {
                                                    let currentIndex = textNode.textContent.indexOf(searchString);
                                                    let nodeOffset = 0;

                                                    while (currentIndex !== -1) {
                                                        const before = textNode.textContent.substring(0, currentIndex);
                                                        const after = textNode.textContent.substring(currentIndex + searchString.length);

                                                        const spanElement = document.createElement('span');
                                                        spanElement.innerHTML = replacement;

                                                        const beforeNode = document.createTextNode(before);
                                                        const afterNode = document.createTextNode(after);

                                                        console.log('Before:', before);
                                                        console.log('After:', after);

                                                        textNode.parentNode.insertBefore(beforeNode, textNode);
                                                        textNode.parentNode.insertBefore(spanElement, textNode);
                                                        textNode.parentNode.insertBefore(afterNode, textNode);

                                                        textNode.parentNode.removeChild(textNode);

                                                        currentIndex = after.indexOf(searchString);
                                                        nodeOffset += currentIndex + searchString.length;
                                                        textNode = textNode.nextSibling;
                                                        currentIndex = textNode ? textNode.textContent.indexOf(searchString, currentIndex) : -1;

                                                        console.log('Current Index:', currentIndex);
                                                        console.log('Node Offset:', nodeOffset);
                                                    }
                                                });
                                            }
                                        } catch (error) {
                                            console.error('An error occurred:', error);
                                        }*/
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
                                    }
                                } catch (ez) {
                                    w.push(false)
                                    console.error(ez)
                                }
                                I += 1
                            }
                            console.error(w)
                            let ws = []// segmenter.segment(tt)
                            console.warn(tt, '==>', w)
                        } else {
                        }
                        let hs = document.createElement('span')
                        let tta = ttx.join(' ')//[tti]
                        /*console.warn(ttx, tti, tta, si);
                        hs.className = `words non ${I}`
                        hs.setAttribute('i', I)
                        elem.classList.add(I)
                        elem.setAttribute('ind', I)
                        hs.innerHTML = `<ruby class="word">${tta}<rt class="reading"></rt></ruby>`;
                        hs.style.border = '0.01px dotted rgb(230,230,230)'
                        ptxt.appendChild(hs)*/
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
                            let frm = this.lang.length > 1 ? this.lang : undefined
                            let ts = tt.split(' ')
                            let en = await this.g(tt, frm, 'en', 0)
                            console.warn('TlAuto: ', en);
                            let e = document.createElement('h4')
                            let ens = en.split(' ')
                            let ap = 0
                            let spns = []
                            for (let h in ens) {
                                let hs = document.createElement('span')
                                hs.className = `tls ${h}`
                                hs.innerHTML = `${ens[h]}`
                                hs.style.border = '0.1px dotted white'
                                tl.appendChild(hs)
                                tl.insertAdjacentText('beforeend', ' ')
                                spns.push(hs)
                            }
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
                                }
                                rub.innerHTML = `<p>${t}</p><rt>${en}</rt>`
                                rub.style.paddingLeft = '0.32em'
                                rub.style.paddingRight = '0.32em'
                                rub.style.border = '1px dashed gray'
                                ptxt.appendChild(rub)
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
                                console.log(`${parseInt(ii) + 1}/${cc.length}.  : `, ii, tt, tts, ix, ind)
                            }
                            let isKana = japaneseUtil.isStringPartiallyJapanese(tt)
                            console.warn('running ', Y, iY, isKana, tt, tts, ind, tp, ii, cc[ii]);
                            if (Y != lY || !document.querySelector("#modK")) {
                                this.modK = document.createElement('div')
                                this.modK.id = 'modK'
                                this.modK.style.display = 'flex'
                                this.modT.style.display = 'flex'
                                this.modT.style.flexDirection = 'column';
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
                                    c[ii].style.borderBottom = '4px'
                                    c[ii].style.borderColor = 'rgb(170,255,170)'
                                }
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
                                if (!this.var('yc')) {
                                    localStorage.setItem('yc', true)
                                }
                                bot = this.yomishow(yc, elem, fqs, fq, bot, tt, 1)
                                console.warn(bot[0].innerHTML, bot[3].innerHTML, yc);
                                tt = tt ?? ''
                                //elem.setAttribute('w', tt)
                                elem.innerHTML = bot[3].innerHTML
                                elem.appendChild(bot[0])
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
                            } else {
                            }
                        }
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
                            let frm = this.lang.length > 1 ? this.lang : undefined
                            let ts = tt.split(' ')
                            let en = await this.g(tt, frm, 'en', 0)
                            console.warn('TlAuto: ', en);
                            let e = document.createElement('h4')
                            let ens = en.split(' ')
                            let ap = 0
                            let spns = []
                            for (let h in ens) {
                                let hs = document.createElement('span')
                                hs.className = `tls ${h}`
                                hs.innerHTML = `${ens[h]}`
                                hs.style.border = '0.1px dotted white'
                                tl.appendChild(hs)
                                tl.insertAdjacentText('beforeend', ' ')
                                spns.push(hs)
                            }
                            let ptxt = document.createElement('span')
                            ptxt.style.border = '1px solid rgb(120,120,120)'
                            let isKana = japaneseUtil.isStringPartiallyJapanese(tt)
                            if (isKana) {
                                ts = line
                            }
                            console.warn(ts);
                            for (let t of ts) {
                                let rub = document.createElement('ruby')
                                if (typeof t == 'object') {
                                    t = t[0]
                                    en = ''
                                } else {
                                    en = await this.g(t, frm, 'en', ap)
                                    console.warn('TlAuto: ', en);
                                }
                                rub.innerHTML = `<p>${t}</p><rt>${en}</rt>`
                                rub.style.paddingLeft = '0.32em'
                                rub.style.paddingRight = '0.32em'
                                rub.style.border = '1px dashed gray'
                                ptxt.appendChild(rub)
                            }
                            tll.insertAdjacentElement('afterbegin', ptxt)
                        }
                    } catch (error) {
                        console.log(error)
                    }
                }
            }
            const parse = (cc) => {
                console.error('Parser ', cc);
                let tt
                let tts
                for (let v of cc) {
                    try {
                        let vt = ''
                        try {
                            if (v.querySelector('.query-parser-segment-text')) {
                                vt = v.querySelector('.query-parser-segment-text').innerText
                                v.style.border = '1px solid rgb(123,123,123)'
                            }
                        } catch (ve) {
                            console.error(ve);
                        }
                        let elem = v
                        let RGEX_CHINESE = new RegExp(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/);
                        let kji = RGEX_CHINESE.test(tt);
                        let ptc = false
                        let pi = 233
                        for (let p in this.part) {
                            ptc = this.part[p] == vt ? true : false
                            if (ptc) {
                                pi = p
                                break
                            }
                        }
                        let isPart = ptc //pt == true ? ptc : false
                        if (kji) {
                            elem.style.fontSize = '1.75em'
                            elem.style.fontWeight = 'bold' //border = '4px solid green'
                        }
                        if (isPart) {
                            elem.style.fontSize = '0.95em'
                            elem.style.fontWeight = 'bold' //border = '4px solid green'
                            elem.style.border = '1px solid white'
                            elem.classList.value = 'query-parser-term';
                            //elem.style.display = 'none'
                            let sat = 50
                            pi *= 360 / this.part.length
                            //console.warn(pi, this.part.length, elem, isKana, ii, tt, tts);
                            elem.style.color = `hsl(${pi} ${sat}%,50%)`
                            //vis[vis.length - 1].querySelector('#particle').innerHTML += tt
                            if (tt == "は") { //emphatizes after
                                //emph = true
                            }
                            if (tt == "が") { //emphatizes before
                                //emph = false
                                elem.style.fontWeight = 'bolder' //border = '4px solid green'
                            }
                            //console.warn(...w[ii])
                        } else {
                            v.classList.add('nav')
                        }
                    } catch (ce) {
                        console.error(ce);
                    }
                }
            }
            const yomi = async (split, ind, fast = true) => {
                console.warn(split,ind,fast);
                if (this.first && document.querySelector('.query-parser-segment-reading')) {
                    let pd = document.querySelector('#query-parser-content').children
                    prev = document.createElement('div')
                    for (let p of pd) {
                        prev.appendChild(p.cloneNode(true))
                    }
                }
                spl = split
                var i = ind
                console.log(spl, i);
                if (this.search) {
                    this.lq = this._display.fullQuery
                } else {
                    this.lq = this.v
                }
                this.frst = false
                ft = false
                //let TXT = spl[0] ?? spl
                let ttt
                let tt
                let tts
                let elem
                this.yomu = true
                try {
                    let tlx
                    if (this.search) {
                        tlx = this._display.fullQuery.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '')
                    } else {
                        tlx = this.v.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '')
                    }
                    try {
                        txt = txt.join(' ')
                    } catch { }
                    let tlr = ''
                    console.warn(tlx, txt, this.lang);
                    let lto = this.lang == 'ja' ? 'en' : 'pt-BR'
                    this.f(tlx, this.lang, lto).then((rtl) => {
                        document.querySelector('.save').insertAdjacentHTML('beforebegin', `<p>${rtl}</p>`)
                    })
                    console.dir(document.querySelectorAll('div>span.query-parser-term.newline'))
                    //console.log(`Search mode ${document.querySelector(".content-body-inner")}`)
                    //let mode = 'lyrics'
                    //let spl = txt
                    //.filter(item=>item);
                    console.dir(spl)
                    let k = false
                    const optionsContext = this._display.getOptionsContext();
                    const delay = s => new Promise();

                    let promiseChain = Promise.resolve();
                    let rm = document.querySelectorAll('.entry')
                    for (let e in rm) {
                        try {
                            //rm[e].parentElement.removeChild(rm[e]);
                        } catch { }
                    }
                    document.body.appendChild(this.eP)
                    this.modP.id = 'modP'
                    //this.modK = this.modP.appendChild(document.createElement("td"))
                    //console.dir(this.modK)
                    //this.modK.innerHTML = '99999999999999'
                    this.mod.id = 'mod'
                    this.modC.id = 'def'
                    //this.modK.prntElement.style.display = 'flex'
                    this.t.id = 'tl'

                    //this.modK.prntElement.style.display = 'flex'
                    //document.querySelector('.content-body-inner').style.removeProperty('width')
                    this.mod.style.display = 'flex'
                    this.mod.style.flexWrap = 'wrap'
                    this.mod.style.flex = '10%'
                    let ii
                    let c = document.querySelector('#query-parser-content').children
                    for (let v of c) {
                        v.classList.add('navigate')
                        v.style.border = '1px solid rgb(53,53,53)'
                    }
                    //let nl = document.querySelectorAll(``)
                    console.dir(c)
                    let ix = 0
                    let tx = 0
                    this.nl = true
                    this.nll = true
                    let pix = 0
                    let reverseChildren = (parent) => {
                        for (var i = 1; i < parent.childNodes.length; i++) {
                            parent.insertBefore(parent.childNodes[i], parent.firstChild);
                        }
                    }
                    this.slow = false
                    if (spl.length > 80) {
                        this.slow = spl.length
                    }
                    //run = false
                    console.warn(fast, window.navigator.onLine);
                    if (jpdb instanceof Promise && this.fval > 0) {
                        console.warn('awaiting ', jpdb);
                        await jpdb
                    }
                    this.lines = []
                    let filters = ['無題Name']
                    if (fast && window.navigator.onLine) {
                        for (ii in spl) {
                            console.warn('slw---', spl[ii])
                            this.lines.push(spl[ii])
                            var ptxt = document.createElement('div')
                            ptxt.innerHTML = `<p>${spl[ii]}</p>`
                            this.modP.appendChild(ptxt)
                            ptxt.className = 'full sentence'
                            if (filters.some(filter => spl[ii].includes(filter))) {
                                continue; // Skip the current iteration if the item is in filters
                            }
                            this.modp
                            if (this.stop || this.prevent(80)) {
                                this.stop = false
                                console.error(this.lmt);
                                break
                            }
                            if (spl[ii].length > 300) {
                                var spm = splitter(spl[ii], 300)
                                console.warn(spm);
                                for (let mm in spm) {
                                    if (mm > 0) {
                                        ptxt = document.createElement('div')
                                        ptxt.innerHTML = `<p>${spl[ii]}</p>`
                                        this.modP.appendChild(ptxt)
                                        ptxt.className = 'full sentence'
                                    }
                                    await moe(spm, mm, spm.length)
                                }
                            } else {
                                await moe(spl, ii, spl.length)
                            }
                        }
                        ii = 0
                        //let prev
                        console.warn(o('rd'), ' slowww', this.slow);
                        if (o('yc') || o('rd') || this.slow) {
                            await this.wait() //.then(async () => {
                            while (document.getElementById('progress-indicator').getAttribute('data-active') == 'true') {
                                //this.frst = true
                                //loop = true
                                //while()
                                await new Promise(r => setTimeout(r, 500));
                            }
                        }
                        this.modY = this.modP.insertAdjacentElement('beforebegin', document.createElement('div'))
                        this.modY.id = 'modY'
                        if (!this.first) {
                            document.querySelector('#query-parser-content').prepend(prev)
                        }
                        if (o('rd') && (!o('kan') || !o('fq'))) {
                            for (let d of document.querySelectorAll('.mns')) {
                                d.style.display = 'none'
                                if (d.children) {
                                    for (let e of d.children) {
                                        //e.style.display = 'none'
                                    }
                                } else {
                                }
                            }
                        }
                        this.yomu = false
                        this.modK.style.display = 'flex'
                        let cc = document.querySelector('#query-parser-content').children
                        let ccc = document.querySelector('#query-parser-content').children
                        console.warn(cc);


                        parse(cc)
                        if (o('rd') || o('kan') || o('fq')) {
                        }
                        let mdy = this.modY
                        if (o('yc') && o('kand')) {
                            let i = '.search-header'
                            let q = '#query-parser-content';
                            let x = document.querySelector(i)
                            let y = document.querySelector(q)
                            //x.style.display = "block";
                            //y.style.display = "block";
                            runner(spl, ccc, true, mdy)
                        }
                        let ijo = 0
                        let gd = 0
                        let RGEX_CHINESE = new RegExp(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/);
                        let iji = 0
                        let ct
                        let cr
                        let cl = 0
                        for (let elem of document.querySelectorAll('.vis')) {
                            if (o('rd')) {
                                if (c[ii].innerHTML.length <= 1) {
                                    ii += 1
                                }
                                if (ii > c.length - 1) {
                                    ii = c.length - 1
                                }
                                let tts = ''
                                let tt = ''
                                console.warn(c[ii], ii);
                                //                                elem = document.querySelectorAll('.vis')
                                //let ew = elem.querySelector('.tit .kj')
                                //ttt = .querySelector('dt').innerHTML.split(' ')
                                //tts = mns[ii].parentElement.parentElement.children[0].children[0].innerText
                                try {
                                    cr = c[ii].querySelectorAll('.query-parser-segment-reading')
                                    ct = c[ii].querySelectorAll('.query-parser-segment-text')
                                    try {
                                        for (let tr in cr) {
                                            if (cr[tr].innerHTML) {
                                                tts += cr[tr].innerHTML
                                            }
                                        }
                                    } catch (e) { }
                                    for (let tr in ct) {
                                        if (ct[tr].innerHTML) {
                                            tt += ct[tr].innerHTML
                                        }
                                    }
                                    cl = tt.length > tts.length ? tt.length : tts.length
                                    iji = 0
                                    gd = elem.querySelector('.gloss-definitions').innerText.length
                                    for (let t of elem.querySelector('.kj').innerText) {
                                        if (RGEX_CHINESE.test(t)) {
                                            iji += 1
                                        }
                                    }
                                } catch (ge) {
                                    //gd = 0
                                    console.error(ge);
                                }
                                if (this.prevent(70)) {
                                    console.error(this.lmt);
                                    break
                                }
                            }
                            if (!elem.querySelector('.gloss-content') && !(o('fq') || !this.slow) && (this.var('yc') || this.wiki || gd <= 1 || iji >= 0)) {
                                try {
                                    elem.querySelector('li').classList.add('gloss-content')
                                } catch {
                                    elem.children[0].classList.add('gloss-content')
                                }
                                let fo = await this.dictionary(k, elem, optionsContext, cl, tt, spl, tts, elem)
                                //console.warn(fo, '-=[[[==> ', k, optionsContext, ijo, tt, spl, tts, elem, cl)
                            }
                            ijo += 1
                            ii += 1
                        }
                        //const makeNextPromise = (t) => async () 
                    } else {
                        console.error('SlowMode ', c);
                        runner(spl, display.fullQuery, false)
                        await this.wait() //.then(async () => {
                        while (document.getElementById('progress-indicator').getAttribute('data-active') == 'true') {
                            //this.frst = true
                            //loop = true
                            //while()
                            await new Promise(r => setTimeout(r, 500));
                        }
                        let cc = document.querySelector('#query-parser-content').children
                        parse(cc)
                        await runner(spl, cc, true)
                        this.first = false
                    }
                    //console.log(isKana)
                } catch (e) {
                    console.log(e)
                }
                this.frst = false
            }
            var isVisible = async function (domElement) {
                return new Promise(resolve => {
                    const o = new IntersectionObserver(([entry]) => {
                        resolve(entry.intersectionRatio === 1);
                        o.disconnect();
                    });
                    o.observe(domElement);
                });
            }
            var sgroup = []
            const loadMore = (istart) => {
                if (this.search) {
                    txt = this._display.fullQuery
                } else {
                    txt = this.v
                }
                //let mode = 'lyrics'
                //spl = txt.split('\n')//.filter(item=>item);
                this.stop = true
                //spl = sgroup
                let aff = display.fullQuery.split('\n')
                sgroup = this.groupByN(prt, aff, istart)

                if (istart < 0 || istart >= sgroup.length) {
                    return
                }
                this.istart = istart
                try {
                    document.getElementById('modP').remove()
                    //document.getElementById('tl').remove()
                    document.getElementById('tl').remove()
                    //document.getElementById('mod').remove()
                } catch { }
                this.modP = document.createElement("div")
                let ps = o('pre') ? ['afterend', document.querySelector('#dictionary-entries')] : ['beforebegin', document.querySelector('#dictionary-entries')]
                ps[1].insertAdjacentElement(ps[0], this.modP)
                let ss = sgroup[istart]
                console.warn(spl, sgroup, ss, istart, o('slw'));
                //this.modP.parentNode.removeChild()
                yomi(ss, istart, o('slw'))
            }
            if (o('hk')) {
                // Create an Intersection Observer instance
                const observer = new IntersectionObserver((entries) => {
                    // Check if the target element is intersecting with the viewport
                    if (entries[0].isIntersecting) {
                        // Load more data
                        istart += 1;
                        loadMore(istart);
                    }
                });
                // Select the target element to observe (e.g., the bottom of the page)
                const targetElement = document.querySelector('.content');
                // Start observing the target element
                observer.observe(targetElement);
            }
            const keys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', //0-9
                'arrowup', 'arrowdown', 'arrowleft', 'arrowright', //10-13
                'b', 's', 'd', 'z', 'x', 'c', 'q', 'enter', //14-21
                'f', 'g', 'h', 'j', 'k', 'l', 'space', ' ', ''] //22-30
            const comb = []
            const nk = false
            var txts = document.querySelector('textarea')

            //document.removeEventListener('keydown')
            var pos = 0
            var posr = [0, '']
            document.addEventListener('keydown', e => {
                let activeElement = document.activeElement;
                let ret = activeElement == txts || (nk && (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey))
                console.log(activeElement.tagName, ret, e.key);
                if (ret && e.key != "Alt") { return }
                ret = true
                let ki = -1
                for (ki in keys) {
                    //console.log(keys[ki], e.key);
                    if (e.key.toLocaleLowerCase() == keys[ki]) {
                        ret = false
                        break
                    }
                }
                if (ret) { return }
                let b
                let t = document.querySelectorAll('.mns')
                if (!o("rd")) {
                    b = document.querySelectorAll('.mns.nav')
                } else {
                    b = document.querySelectorAll('.sentence .nav')
                }
                let ps = []
                //txt.value = `${keys[ki]} ${ki}: ${e.key}`
                console.log(`${keys[ki]} ${ki}: ${e.key}`);
                if (ki <= 9 && e.ctrlKey) {
                    let n = ki;
                    b = document.querySelectorAll('.vis')
                    console.log(n, b);
                    if (n > 0) {
                        //n -= 1
                    }
                    n = (parseFloat(n) + 1) * 10
                    console.log(`${n}%`)
                    try {
                        b[Math.round(n * b.length / 100)].scrollIntoView({
                            behavior: 'auto',
                            block: 'center'
                        });
                    } catch { }
                } else if (ki <= 13) {
                    nv = false
                    let dir = ki - 10;
                    console.warn(dir);
                    let vis
                    let mv = (d, pos, t, b) => {
                        let l = pos
                        l += 1 * d
                        let vis = b[pos].parentNode.contains(b[l]) //await isVisible(b[pos])
                        while (vis) {
                            l += 1 * d
                            vis = b[pos].parentNode.contains(b[l])
                        }
                        if (d == -1) {
                            console.warn(pos, l, b[l].parentElement.children.length, b[l].parentElement.children[0]);
                            let m = 0
                            let lm = l
                            while (m < b.length) {
                                m += 1;
                                lm = l - m;
                                console.warn(`Iteration: ${m}, lm: ${lm}, l: ${l}, b[lm]: ${b[lm]}`); // Log iteration details
                                try {
                                    if (!b[l]?.parentNode?.contains(b[lm])) {
                                        console.warn('Element not contained in parent'); // Log when element is not contained in parent
                                        if (b[lm]?.parentElement?.firstElementChild === b[lm]) {
                                            break; // Break the loop if element is the first child of its parent
                                        }
                                    }
                                } catch (error) {
                                    console.error('An error occurred:', error);
                                    break;
                                }
                            }
                            l -= m
                        }
                        return l
                    }
                    if (dir < 0) {
                        let n = dir + 10;
                        console.log(n, b);
                        if (n > 0) {
                            //n -= 1
                        }
                        n = (parseFloat(n) + 1) * 10
                        console.log(`${n}%`)
                        try {
                            pos = Math.round(n * b[pos].parentElement.length / 100)
                        } catch { }
                    } else if (dir == 0) {
                        pos = mv(-1, pos, t, b)
                    } else if (dir == 1) {
                        pos = mv(1, pos, t, b)
                    } else if (dir == 2) {
                        pos -= 1
                    } else {
                        pos += 1
                    }
                    console.warn(vis);
                    if (vis) {
                        vis = document.querySelectorAll('.vis')
                    }
                    if (pos < 0) {
                        pos = 0
                    }
                    if (pos >= b.length) {
                        pos = b.length - 1
                    }
                    console.warn(b[pos]);
                    if (b[pos]?.innerText == '' || b[pos]?.innerText == ' ') {
                        pos += 1
                    }
                    b[pos].scrollIntoView({
                        behavior: 'auto',
                        block: 'center',
                        inline: 'center'
                    });//.scrollIntoView()
                    //b[posr].style.borderStyle = 'solid'
                    console.warn(pos, posr);
                    let ys = document.querySelectorAll('.vis')
                    /*if (posr[1]) {
                        b[posr[0]].style.border = posr[1]
                        try {
                            if (posr[2]) {
                                for (let i of posr[0]) {
                                    ys[i].style.display = 'none'
                                }
                            } else {
                                ys[posr[0]].style.display = 'none'
                            }
                        } catch { }
                    }
                    */
                    //b[posr].style.children[0].borderColor = '#511a84'
                    //b[pos].style.borderStyle = 'groove'
                    let c = document.querySelector('cur')
                    console.log(`${dir}`)
                    console.warn(dir, pos, b[pos], posr, ps);
                    if (o('rd')) {
                        if (b[pos].querySelector('.query-parser-segment-text')) {
                            try {
                                let t = b[pos].querySelector('.query-parser-segment-text') ? b[pos].querySelector('.query-parser-segment-text').innerText : b[pos].innerText
                                console.warn(t);
                                let x = -1
                                console.warn(t, posr);
                                for (let y of ys) {
                                    let z
                                    if (b[pos].querySelector('.query-parser-segment-text')) {
                                        z = y.querySelector('.kj').innerText
                                    } else {
                                        z = y.querySelector('.tit .kj').innerText
                                    }
                                    console.warn(z);
                                    if (z.indexOf(t) != -1 || t.indexOf(z) != -1) {
                                        for (let z of y.parentElement.children) {
                                            z.style.display = 'none'
                                        }
                                        console.warn(y, y.style.display, t);
                                        y.style.display = 'flex'
                                        if (b[pos].querySelector('.query-parser-segment-text')) {
                                            document.querySelector('#modR').innerHTML = y.innerHTML
                                            if (x > pos) {
                                                let ri = posr[0]
                                                for (let i = ri; i <= x; i++) {
                                                    ps.push(i)
                                                    document.querySelector('#modR').innerHTML += ys[i].innerHTML
                                                    ys[i].style.display = 'flex'
                                                }
                                            }
                                        }
                                        break
                                    }
                                    x += 1
                                }
                            } catch (le) {
                                console.error(le);
                            }
                        } else {
                            let P = parseInt(b[pos].getAttribute('i'))
                            console.warn(P);
                            for (let z of document.querySelector(`[ind="${P}"]`).parentElement.children) {
                                z.style.display = 'none'
                            }
                            document.querySelector(`[ind="${P}"]`).style.display = 'flex'
                        }
                    }

                    try {
                        document.querySelector('#cur').id = 'prev'
                    } catch { }
                    b[pos].id = 'cur'
                    posr = [pos, b[pos], ps]
                    //b[pos].style.border = '1px dotted red'
                    //alert(t,x)
                } else {
                    if (ki == 14) {
                        txts.focus()
                    }
                    if (ki >= 17 && ki <= 18) {
                        let id = 0
                        if (ki == 17) {
                            id = -1
                        } else {
                            id = 1
                        }
                        istart += 1 * id
                        loadMore(istart)
                    }
                    if (ki == 22) {
                        let t = this.getText()
                        let a = document.querySelectorAll('#modP > span > ruby')
                        for (let e of a) {
                            if (e.innerHTML.indexOf(t) != -1) {
                                //e = e.parentElement.parentElement.children[e.parentElement]
                                e.scrollIntoView({
                                    behavior: 'auto',
                                    block: 'center'
                                });
                            }
                        }
                    }
                    if (ki == 23) {
                        document.querySelectorAll('.vis')[0].scrollIntoView({
                            behavior: 'auto',
                            block: 'center'
                        });//.scrollIntoView()
                        //b[posr].style.borderStyle = 'solid'
                    }
                    if (ki == 21) {
                        let save = localStorage.getItem('save')
                        let elem = b[pos]
                        if (false) {//ele.target.closest('.w')) {
                            let ist = ele.target.closest('.title')
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
                        if (e.ctrlKey == true) {
                            //elem = elem.parentElement
                            if (elem) {
                                if (elem.style.height != '') {

                                    elem.style.height = ''
                                    elem.style.flex = 'none'
                                } else {
                                    elem.style.height = height

                                    elem.style.flex = width
                                }
                            }
                        }
                        //b[pos].click()
                    }
                }
            })
            if (this.wiki && l >= 0) {
                ff()
            }
            //let bi = document.createElement('div')
            //bi.innerHTML += `<button id="btn">Toggle</button><input id='sl'/><button id="wk">Wiki</button><input id="min"/>-min<button id="kan">Kanji</button><button id="pt">Particle</button><button id="exe">O</button><input id="ht"/><input id="wt"/>`
            //document.body.prepend(bi)
            lng = document.querySelector(".content-body-inner").appendChild(document.createElement("div"))
            if (this.search) {
                this.b = document.querySelector(".content-body-inner").appendChild(document.createElement("div"))
            } else {
                this.b = document.body.appendChild(document.createElement("div"))
            }
            //if(run){}
            let bs = this.btn(this)
            let bmc = document.querySelector('.content')
            let bnv = document.querySelector(".content-body")
            let bnct = document.createElement('div')
            bnct.className = 'config'
            let bns = bnct.appendChild(document.createElement('div'))
            bns.className = 'conf'
            bns.appendChild(bs[0])
            let bns2 = bnct.appendChild(document.createElement('div'))
            bns2.className = 'conf'
            for (let i in bs[1]) {
                bns2.appendChild(bs[1][i])
            }
            bnv.prepend(bnct)

            const ids = [
                'rd', 'yc', 'fq', 'kand', 'sav', 'hk', 'pre', 'del', 'slw', 'roma', 'run', 'wk', 'kan', 'pt', 'aut'
            ];

            console.dir(localStorage);
            const buttons = ids.map(id => document.getElementById(id));

            const toggleButton = (button, key) => {
                console.log(button, key);
                let value = false
                try {
                    value = localStorage.getItem(key) === 'true';
                } catch (vr) {
                    value = false
                    console.warn(key)
                    localStorage.setItem(key, 'false')
                }
                button.style.backgroundColor = value ? 'green' : 'red';

                button.onclick = e => {
                    e.stopPropagation();
                    let newValue = !value;
                    localStorage.setItem(key, newValue);
                    value = newValue;
                    button.style.backgroundColor = value ? 'green' : 'red';
                };
            };
            buttons.forEach((button, index) => {
                const key = ids[index];
                toggleButton(button, key);
            });
            console.warn(ids)//vs, vbs, stt);
            let g = this.g.bind(this)
            var f2 = async function (w, from, to) {
                let a = w.split('\n')
                let r = ''
                for (let i of a) {
                    if (i.length > 0 && i.indexOf(' --> ') == -1 && !(i.length < 10 && parseInt(i) >= 0)) {
                        console.warn(i);
                        r += await g(i, from, to, 0) + '\n'
                    } else {
                        console.warn(i.length);
                        r += i + '\n'
                    }
                }
                return r
            }
            document.getElementById('export').oncontextmenu = async () => {
                let v = document.querySelectorAll('.vis')
                localStorage.setItem('exp', '')
                for (let el in v) {
                    console.warn(`${el}: Exporting`, v[el]);
                    await sv(v[el], -1)
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
            document.getElementById('export').onclick = async () => {
                const filename = 'file.srt';
                var jsonStr = this._display.fullQuery;
                let element = document.createElement('a');
                let s = jsonStr
                let r = await f2(s, 'en', 'ja')
                jsonStr = r
                /*element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(jsonStr));
                element.setAttribute('download', filename);
                element.style.display = 'none';
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);*/
                console.log(r);
                this._copyText(r)
            }
            document.getElementById('export').ondblclick = () => {
                const filename = 'save.json';
                const jsonStr = JSON.stringify(localStorage);
                let element = document.createElement('a');
                element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(jsonStr));
                element.setAttribute('download', filename);
                element.style.display = 'none';
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
            }
            const inputIds = ['lang', 'wt', 'ht', 'freq'];

            const inputs = inputIds.map(id => document.getElementById(id));

            inputs.forEach(input => {
                input.onchange = (e) => {
                    e.stopPropagation()
                    let id = input.id
                    let lg = input.value;
                    console.log(e, lg);
                    let v = lg;
                    if (lg === null) {
                        localStorage.setItem(id, '');
                        return;
                    }
                    localStorage.setItem(id, v);
                    console.dir(v);
                };
            });
            this.frst = true
            var ex = document.getElementById('exe')
            ex.oncontextmenu = ex.ondblclick = () => {
                window.open('chrome-extension://oocpecoaklhhaihpbkncpblbjncgdjmm/search.html', '_self')
            }

            if (true || run) {
                //this.wait().then(() => {
                this.lq = ''
                if (window.navigator.onLine) {
                    mode = 50
                }
                ex.onclick = yomi
                this.kr()
                console.log(this.search, this.page, spl, txt)
                //setTimeout(runner, 2000)
                //slow()
                //this.wait().then(() => {
                console.warn(!(o('slw') || o('rd') || o('kan') || o('fq')), o('slw'), o('rd'), o('kan'), o('fq'));
                document.querySelector('.scan-disable.scrollbar').style.display = 'block'
                if (!(!o('slw') || o('rd') || o('kan') || o('fq'))) {
                    this.hide(0)
                }
                //this.hide(100)
                //this.hide()
                var fy = true

                var ue = (str) => {
                    return str.replace(/\\u([a-fA-F0-9]{4})/g, function (g, m1) {
                        return String.fromCharCode(parseInt(m1, 16));
                    });
                }
                let h = document.createElement('div')

                if (o('kand')) {
                    //spl = this.groupByN(prt, spl, istart)
                } else {
                    spl = [spl]
                }
                console.log(spl[istart], istart);
                //slow(spl[istart], istart)
                this.frst = false
                this.t = document.querySelector('.content-body').appendChild(document.createElement("div"))


                if (!document.querySelector('.save')) {
                    let sav = '';

                    // Example processing function
                    let processItem = (item) => {
                        // Process each value of the item array here
                        // For example, converting the timestamp to a human-readable date
                        const processedItem = [...item];
                        const timestamp = processedItem[2];
                        const date = new Date(timestamp).toLocaleString();
                        processedItem[2] = date;
                        return processedItem;
                    }
                    if (!o('run')) {
                        return
                    }
                    const saveDiv = document.createElement('div');
                    note.svDiv(saveDiv)
                    saveDiv.classList.add('save'); // Apply Material Design card style
                    saveDiv.classList.add('mdc-card'); // Apply Material Design card style
                    saveDiv.style.fontFamily = 'Arial';
                    let cpy = this._copyText
                    let svs = (si, ws, ln = 72, cp = false) => {
                        document.querySelector('.save').style.color = 'gray'
                        console.warn(si, ws, ln, cp);
                        try { //if(typeof si == 'string'){
                            si = si.split(' ')
                        } catch { }
                        if (ws.length > 0) {
                            si = merge(si, ws)
                        }
                        try {
                            si = si.slice(si.length - ln)
                            si = si.join(' ')
                        } catch {

                        }
                        if (cp) {
                            cpy(si)
                        }
                        document.querySelector('textarea').value = si
                        document.querySelector('#search-button').click()
                    }
                    saveDiv.onselect = function (e) {
                        e.stopPropagation()
                        let si = localStorage.getItem('words') //+ ` ${localStorage.getItem('wordbk')}`*/ document.querySelector('.save .w').innerText
                        si = si.split(' ')
                        svs(si, jpws)
                    }
                    saveDiv.ondblclick = function (e) {
                        e.stopPropagation()
                        let si = localStorage.getItem('words') //+ ` ${localStorage.getItem('wordbk')}`*/ document.querySelector('.save .w').innerText
                        si = si.split(' ')
                        svs(si, [])
                    }
                    saveDiv.onclick = function (e) {
                        e.stopPropagation()
                        let si = localStorage.getItem('words') //+ ` ${localStorage.getItem('wordbk')}`*/ document.querySelector('.save .w').innerText
                        si = si.split(' ')
                        svs(si, pops)
                    }
                    saveDiv.oncontextmenu = function (e) {
                        e.stopPropagation()
                        let si = localStorage.getItem('jpmns') //merge(null,null, 0)
                        svs(so, [], 90)
                    }
                    this.t.appendChild(saveDiv);

                    Promise.all([def, anm, jp2, jpmn, pop])
                        .then(results => {
                            const [def, anm, jp2, jpmn, pop] = results;
                            // Process the results
                            console.log(def);
                            console.log(anm);
                            console.log(jp2);
                            console.log(pop);
                            let local = localStorage.getItem('words')
                            localStorage.setItem('wordsBackup', local)
                            local = local.split(' ')
                            jpws = getWords(jpmn.notes)
                            anms = getWords(anm.notes)
                            pops = getWords(pop.notes)
                            console.log(pops);
                            let all = jpws //getWords(jp2.notes)
                            localStorage.setItem('jpmns', jpws.join(' '))
                            localStorage.setItem('anms', anms.join(' '))
                            let un = merge(local, jpws)
                            note.svDiv(saveDiv, un, undefined, true)
                            console.log(jpmn, un);
                            // Assuming 'all' is the array containing your data

                            // Calculate frequencies of elements
                            document.querySelector('.save').style.borderColor = 'red'
                            return
                            const frequencyMap = new Map();

                            for (let a of all) {
                                let b = this.frequency(a) ?? 0
                                if (b >= 1) {
                                    frequencyMap.set(a, b);
                                }
                            }
                            console.warn(frequencyMap);
                            // Sort frequencies in ascending order
                            const sortedFrequencies = Array.from(frequencyMap).sort((a, b) => a[1] - b[1]);

                            // Get the 100 most minimum and maximum values
                            const mostMinimum = sortedFrequencies.slice(0, 100);
                            const mostMaximum = sortedFrequencies.slice(-100);

                            // Calculate average frequency
                            const sum = Array.from(frequencyMap.values()).reduce((accumulator, currentValue) => accumulator + currentValue, 0);
                            const average = sum / frequencyMap.size;
                            // Create a list of frequencies
                            const frequencyList = Array.from(frequencyMap.entries());

                            // Output the results
                            console.log('100 Most Minimum:', mostMinimum);
                            console.log('100 Most Maximum:', mostMaximum);
                            console.log('Average Frequency:', average);
                            //console.log('Median Frequency:', median);
                            console.log('Frequency List:', frequencyList);
                        })
                        .catch(error => {
                            console.error(error);
                        });
                    try {
                        let sy = localStorage.getItem('jpmns')
                        //sy = JSON.parse(sy);
                        //sav += s[0] + ' ';
                        //for (let s of sy) {
                        //}
                        let s2 = saveDiv.appendChild(document.createElement('div'))
                        note.displayObjectInHTML(sy, s2, note)
                        // Copy all words button
                        /*const copyAllWordsButton = document.createElement('button');
                        copyAllWordsButton.textContent = 'Copy All Words';
                        copyAllWordsButton.classList.add('mdc-button', 'mdc-button--outlined'); // Apply Material Design button style
                        copyAllWordsButton.addEventListener('click', () => {
                            const words = sy.map((item) => item[0]).join(' ');
                            // Copy words to clipboard (implementation of _copyText method is assumed)
                            _copyText(words);
                        });
                        saveDiv.appendChild(copyAllWordsButton);
    
                        saveDiv.addEventListener('click', function (ele) {
                            if (!ele) var ele = window.event;
                            ele.stopPropagation();
                            console.dir(ele, ele.target);
                            _copyText(this.save);
                        }, false);
                        */
                    } catch (sre) {
                        let svbk = localStorage.getItem('save') ?? ''
                        localStorage.setItem('savebk', svbk)
                        localStorage.setItem('save', '')
                        console.error(sre);
                    }


                    /*this.t.children[0].addEventListener("click", function (ele) {
                        if (!ele) var ele = window.event;
                        ele.stopPropagation()
                        console.dir(ele, ele.target)
                        this._copyText(this.save)
                    }, false)
                    this.t.children[0].ondblclick = () => {
                        const filename = 'save.json';
                        const jsonStr = JSON.stringify(localStorage);
                        let element = document.createElement('a');
                        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(jsonStr));
                        element.setAttribute('download', filename);
                        element.style.display = 'none';
                        document.body.appendChild(element);
                        element.click();
                        document.body.removeChild(element);
                    }*/
                }

                console.warn(this.lmt)
                console.warn(performance.memory.usedJSHeapSize); // how much you're currently usin
                //performance.memory.usedJSHeapSize; // likely a larger number now
                if (this.search) {
                    //this.modP = document.querySelector(".content-body-inner").appendChild(document.createElement("div"))
                    this.mod = document.querySelector(".content-body-inner").appendChild(document.createElement("div"))
                    this.modC = document.querySelector(".content-body-inner").appendChild(document.createElement("footer"))
                    //this.t = this.modP.appendChild(document.createElement("div"))
                } else {
                    //this.modP = document.body.appendChild(document.createElement("div"))
                    this.mod = document.body.appendChild(document.createElement("div"))
                    this.modC = document.body.appendChild(document.createElement("footer"))
                    //this.t = this.modK.appendChild(document.createElement("div"))
                }
                this.yomi = yomi
                this.moe = moe
                this.runner = runner
                this.parse = parse
                nSizes()
    if(run){
    //this.update(true)
    }
            }
            //})
            //this.txt = TextSourceRange.create()
        }
    }
    async update(q, first = false) {
        console.warn(q,first);
        this.start = true
        if (first) {
            //decks = await api('deckNames', 6);
            this.kanji = ''//await this.web('chrome-extension://ihneooeljjglhlfbnkflakdikdlncfao/kanji.html')
            //h.innerHTML += '</br><div class="kjd">' + this.kanji + '</div>'
            //let lu = h.querySelectorAll('.kjd')
            //lu = lu[lu.length - 1]
            //pw.querySelectorAll('.w')[pw.querySelectorAll('.w').length-1].innerHTML += lu
            let c = []//lu.querySelectorAll('div>h1>span.kanji_character')
            this.c = c
        }
        this.lang = localStorage.getItem('lng')
        try {
            if (this.var('del')) {
                document.querySelector('#modP').remove()
                document.querySelector('#mod').remove()
            }
        } catch { }
        var istart = this.istart ?? 0
        var spl = q.split('\n')//.filter(item=>item);
        let aff = spl
        spl = [spl]
        let ppp = this.startMod()
        var sgroup = this.groupByN(this.prt, aff, istart)
        if (this.var('hk')) {
        }
        var txt = ''
        console.warn(spl, sgroup, istart);
        var y
        if (this.var('slw')) {
            this.read = false
            if (this.search) {
                txt = q //this._display.fullQuery
            } else {
                txt = this.v
            }
            console.warn(spl[istart + 1], istart + 1);
            if (this.var('kand')) {
                istart = 0
                y = this.yomi.bind(sgroup[istart], istart)
                await y()
            } else {
                y = this.yomi.bind(spl,0)//istart + 1], istart + 1)
                await y()
            }
        } else {
            y = this.yomi.bind(spl, 0, false)
            await y()
        }
        this.start = false
    }
    waitFor(conditionFunction) {

        const poll = resolve => {
            if (conditionFunction())
                resolve();
            else
                setTimeout(_ => poll(resolve), 400);
        }

        return new Promise(poll);
    }
    w() {
        try {
            if (document.querySelector('.query-parser-segment') !== null) {
                //lj
                return true
            }
        } catch (ew) {
            return false
        }
    }
    w2() {
        try {
            if (document.querySelector('.entry') !== null) {
                //lj
                return true
            } else {
                return false
            }
        } catch (ew) {
            return false
        }
    }
    ac() {
        try {
            if (document.querySelector('#dictionary-entries > div.entry.entry-current > div.entry-header > div.actions > button:nth-child(4) > span') !== null) {
                //lj
                if (this.search) {
                    const dictionaryEntries = this._display.dictionaryEntries;
                    const dictionaryEntryDetails = this._dictionaryEntryDetails;
                    if (dictionaryEntryDetails !== null) {
                        return true
                    }
                }
            } else {
                return false
            }
        } catch (ew) {
            return false
        }
    }
    w3() {
        try {
            if (document.querySelector('#modK') !== null) {
                //lj
                return true
            } else {
                return false
            }
        } catch (ew) {
            return false
        }
    }
    w4() {
        try {
            if (document.querySelector('#modP') !== null) {
                //lj
                return true
            } else {
                return false
            }
        } catch (ew) {
            return false
        }
    }
    async wait() {
        await this.waitFor(_ => document !== null);
        await this.waitFor(_ => this.w() == true);
        console.log('the wait is over!');
    }
    async autoClick() {
        await this.waitFor(_ => document !== null);
        await this.waitFor(_ => this.ac() == true);
        //console.log('0!');
        await new Promise(r => setTimeout(r, 400));
        //console.log(document.querySelector('#dictionary-entries > div.entry.entry-current > div.entry-header > div.actions > button:nth-child(4) > span') !== null);
        if (this.ac()) {
            this.anki._addAnkiNote(0, "term-kanji")
        }
    }
    async find(k, txt, optionsContext, i, full) {
        let pr = Promise.resolve()
        let p = []

        for (let j = i + 4; j >= i; j--) {
            let done = false
            let t = full.substring(i, j);
            //const makeNextPromis = () => async() => {
            let d = await this.dict(k, optionsContext, i, t)
            console.log(d)
            if (!d || d) {
                return d
            }
            //return d
            //}
            //pr = await makeNextPromis()
            //p.push(pr)
            //console.log(i,j,pr);
        }
        console.log(p)
        return true
    }
    btn(wt) {
        function createSettingsInputTemplate(id, label, description, border) {
            const storedValue = localStorage.getItem(id) || '';

            const template = `
              <div class="settings-item" style="border: ${border};">
                    <div class="settings-item-label">${label}
                    <input type="text" id="${id}" value="${storedValue}">
                    </div>
<!--                    <div class="settings-item-description">${description}</div>-->
              </div>
            `;
            var el = document.createElement('div')
            el.innerHTML = template
            return el;
        }

        // Create inputs with borders, labels, IDs, and data from localStorage

        const input = [
            createSettingsInputTemplate('lang', 'Select Language', '', '2px solid yellow'),
            createSettingsInputTemplate('freq', 'Minimum Frequency', '', '2px solid orange'),
            createSettingsInputTemplate('ht', 'Height', '', '2px solid yellow'),
            createSettingsInputTemplate('wt', 'Width', '', '2px solid orange')
        ];
        let inputs = document.createElement('div')
        for (let p of input) {
            inputs.appendChild(p)
        }

        console.log(inputs);
        function setupToggleSwitch(container, localStorageKey, fallbackValue) {
            const toggleCheckbox = container.querySelector('input[type="checkbox"]');

            // Retrieve the stored value from local storage using the provided key
            const storedValue = localStorage.getItem(localStorageKey) == 'true';

            // Set the initial state of the toggle switch based on the stored value or fallback value
            toggleCheckbox.checked = storedValue ?? false;

            // Function to update the local storage value and toggle switch state
            function updateToggleState() {
                // Update the local storage value
                localStorage.setItem(localStorageKey, toggleCheckbox.checked);
            }

            // Add event listener to handle toggle switch changes
            toggleCheckbox.addEventListener('change', function (eee) {
                eee.stopPropagation()
                updateToggleState();
            }, false);

            // Call the updateToggleState function initially
            updateToggleState();
        }

        function generateTemplate(value, bgColor, size, border, label, def = 1) {
            let idOrName = '';

            try {
                if (Array.isArray(value) && value.length === 2) {
                    const [idOrNameValue, labelValue] = value;

                    if (typeof idOrNameValue === 'string') {
                        idOrName = `id="${idOrNameValue}"`;
                    } else if (typeof idOrNameValue === 'number') {
                        idOrName = `id="e${idOrNameValue}"`;
                    }

                    if (typeof labelValue === 'string') {
                        label = labelValue;
                    }
                } else {
                    if (typeof value === 'string') {
                        idOrName = `id="${value}"`;
                    } else if (typeof value === 'number') {
                        idOrName = `id="n${value}"`;
                    }
                    if (typeof value === 'string') {
                        //label = value;
                    }
                }
                const [width, height] = size;
                console.warn(idOrName, def);
                let b = ''
                if (def != 1) {
                    b = `<button ${idOrName} class="low-emphasis">${label}</button>`
                } else {
                    b = `<div class="settings-item-label">${label}</div>
                                    <label class="toggle">
                                        <input type="checkbox" ${idOrName} data-setting="${label}">
                                        <span class="toggle-body">
                                            <span class="toggle-track" style="background-color: ${bgColor};"></span>
                                            <span class="toggle-knob"></span>
                                        </span>
                                    </label>`

                }
                const template = `
                  <div class="settings-item" style="border: ${border}; width: ${width}; height: ${height};">
                        ${b}
                    </div>
                `;
                return template;
            } catch (error) {
                console.error('Error in generateTemplate:', error);
                return '';
            }
        }
        let btn = [];
        let label = '';

        // Define variables for bgcolor, borders, sizes, id, and labels
        const defaultSize = ['fit-content', 'auto'];
        const defaultBorder = '1px solid purple';
        const defaultBgColor = '';

        // Define the array of button IDs and labels
        const buttonData = [
            { id: 'run', label: 'Toggle' },
            { id: 'wk', label: 'Wiki' },
            { id: 'kan', label: 'Kanji' },
            { id: 'pt', label: 'Particle' },
            { id: 'aut', label: 'AutoSave' },
            { id: 'rd', label: 'Reading' },
            { id: 'yc', label: 'Yomu' },
            { id: 'fq', label: 'Frequency' },
            { id: 'kand', label: 'PreciseKnd' },
            { id: 'sav', label: 'Save' },
            { id: 'hk', label: 'NavHotkey' },
            { id: 'pre', label: 'Prepend' },
            { id: 'del', label: 'Delete' },
            { id: 'slw', label: 'Fast' },
            { id: 'roma', label: 'Romaji' },
            { id: 'export', label: 'Export', def: 0 },
            { id: 'exe', label: 'Restart', def: 0 },
        ];

        // Loop through the button data and create buttons using the generateTemplate function
        buttonData.forEach(data => {
            try {
                const buttonTemplate = generateTemplate(data.id, defaultBgColor, defaultSize, defaultBorder, data.label, data.def);
                const buttonElement = document.createElement('div');
                buttonElement.innerHTML = buttonTemplate;
                //const button = buttonElement.firstChild;
                if (data.def != 0) {
                    setupToggleSwitch(buttonElement, data.id, '')
                    btn.push(buttonElement);
                } else {
                    inputs.appendChild(buttonElement)
                }
                // Add the button to the btn array
            } catch (error) {
                console.error('Error creating button:', error);
            }
        });
        document.querySelector('#query-parser-mode-container').style.display = 'none'
        btn.push(...document.querySelector('.search-options').childNodes)
        for (var i = 0; i < 8; i++) {
            try {
                // Determine the label based on the index
                switch (i) {
                    case 0:
                        label = 'Query';
                        break;
                    case 1:
                        label = 'TL';
                        break;
                    case 2:
                        label = 'Results';
                        break;
                    case 3:
                        label = 'Save';
                        break;
                    case 4:
                        label = 'Yomi';
                        break;
                    case 5:
                        label = 'Copy';
                        break;
                    case 0:
                        label = 'Kana';
                        break;
                    default:
                        label = 'Config';
                        break;
                }
                if (i == 6) {
                    label = 'Kana'
                }
                // Create the button using the generateTemplate function
                const buttonTemplate = generateTemplate(i, defaultBgColor, defaultSize, defaultBorder, label, 0);
                const buttonElement = document.createElement('div');
                console.warn(i, buttonElement, label);
                buttonElement.innerHTML = buttonTemplate;
                //const button = buttonElement //.firstChild;
                // Add the button to the btn array
                inputs.appendChild(buttonElement);
                buttonElement.addEventListener('click', this.hide.bind(this, i));
            } catch (error) {
                console.error('Error creating button:', error);
            }
        }


        // Add the buttons to the document
        /*const buttonsContainer = document.getElementById('buttons-container');
        btn.forEach(button => {
            buttonsContainer.appendChild(button);
        });
        //btn[3].innerHTML = 'term'
        let c = `<button id="btn">Toggle</button>_<button id="export">Export</button>_</button>_<button id="wk">Wiki</button>_<input style="border: 2px solid yellow;" id='sl'/>_<input style="border: 2px solid orange;" id="min"/>_<button id="kan">Kanji</button>_<button id="pt">Particle</button>_<button id="exe">O</button>_<input id="ht"/>_<input id="wt"/>_<button id="aut">AutoSave</button>_<button id="rd">Read</button>_<button id="yc">Yomu</button>_<button id="fq">Freq</button>_<button id="kand">KanjD</button>_<button id="sav">Sav</button>_<button id="hk">Hk</button>_<button id="pre">Pre</button>_<button id="del">Del</button>_<button id="slw">Fast</button>_<button id="roma">Romaji</button>`.split('_')
        for (let i in c) {
            let t = document.createElement('span')
            t.name = i + 100
            t.innerHTML = c[i]
            btn.push(t)
        }*/
        console.dir([inputs, btn])
        return [inputs, btn]
    }
    hide(i) {
        console.log(i)
        let q
        let qi = '.search-header'
        let y = document.querySelector(qi)
        if (i === 0) {
            q = '#query-parser-content';
        } else if (i === 1) {
            q = '#tl';
        } else if (i === 2) {
            q = '#modP';
        } else if (i === 3) {
            q = '.save';
        } else if (i === 4) {
            q = '.yomi';
        } else if (i == 5) {
            document.querySelector('#wanakana-enable').click()
            document.querySelector('.config').style.borderColor = ''
            return
        } else if (i == 6) {
            document.querySelector('#clipboard-monitor-enable').click()
            return
        } else if (i == 7) {
            q = '.config';
        } else {
            y.style.display = "none";
        }
        let z = document.querySelectorAll(q)
        if (i == 0 || i == 4) {
            y.style.display = "block";
        }
        console.warn(z, y, q);
        for (let x of z) {
            if (x.style.display === "none") {
                x.style.display = "block";
            } else {
                x.style.display = "none";
            }
        }
    }
    tr(text, search, replace) {
        // Make the search string a regex.
        var regex = RegExp('[' + search + ']', 'g');
        var t = text.replace(regex, function (chr) {
            // Get the position of the found character in the search string.
            var ind = search.indexOf(chr);
            // Get the corresponding character from the replace string.
            var r = replace.charAt(ind);
            return r;
        });
        return t;
    }
    async dictionary(k = false, optionsContext, i, t = 0, r = null, ln = null, nl = null, elem) {
        console.dir(elem)
        try {
            const innerText = elem.querySelector('.kj').innerText;
            optionsContext = innerText ? innerText.replace(/[&\/\\#,+()$~%.'":*?<>{}【】]/g, '') : optionsContext;
        } catch (error) {
            // Handle the error if needed
            console.error(error);
        }
        console.log(optionsContext);
        let num = false
        /*if (parseInt(this.tr(optionsContext, "０１２３４５６７８９　", "0123456789 ")) >= -9999999999) {
            console.log(parseInt(this.tr(optionsContext, "０１２３４５６７８９　", "0123456789 ")))
            num = true
        }*/
        if (optionsContext == ' ' || (this.var('kand') && (!this.yomu || this.stop))) {
            //this.stop = false
            return false
        }
        let py = false
        if (this.part.includes(optionsContext)) {
            py = true
            //return false
        }
        if (this.slow > 0) {
            await new Promise(r => setTimeout(r, Math.min(Math.max(this.slow * 1.5, 50), 4000)));
        }
        let trns = false
        let REGEX = new RegExp('[\u4E00-\u9FCC\u3400-\u4DB5\uFA0E\uFA0F\uFA11\uFA13\uFA14\uFA1F\uFA21\uFA23\uFA24\uFA27-\uFA29]|[\ud840-\ud868][\udc00-\udfff]|\ud869[\udc00-\uded6\udf00-\udfff]|[\ud86a-\ud86c][\udc00-\udfff]|\ud86d[\udc00-\udf34\udf40-\udfff]|\ud86e[\udc00-\udc1d]/')
        //[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
        let ook = REGEX.test(optionsContext);
        k = ook && optionsContext.length === 1;
        if (this.lang != 'ja') {
            k = false
        }
        console.log(elem, i)
        k = false
        try {
            console.warn('Y:', optionsContext, elem, k, i)
            let sc = this.most.slice(0, this.known).includes(optionsContext)
            //console.log(k, optionsContext, i, t, r, ln, this.nl) //(optionsContext,ln,nl)//k, optionsContext, i, t, r, japaneseUtil, sc)
            //console.dir(results)
            let h = document.createElement("p")
            //`h.inn`erHTML = optionsContext + "(" + r + "):"
            let ct = elem//document.createElement("tr")
            //let ct2 = document.createElement("tr")
            //let pp
            //ct.style.display = 'grid'
            let prnt = document.createElement("div")
            //let prnt = null
            console.log('==>' + this.nl, this.var('yc'), this.var('fq'))
            let ok
            let gg
            let gr
            var os = []
            if (sc) {
                elem.children[0].style.color = 'rgb(170,255,170)'
            }
            if (py) {
                elem.children[0].style.color = 'rgb(150,150,255)'
            }
            try {
                //elem.querySelector('dd').innerHTML += `<li>`
            } catch {

            }
            let SE = new RegExp(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/);
            let O = []
            let F = ''
            let tt
            console.warn(k, optionsContext, true, optionsContext, performance.now());
            const options = this._display?.getOptionsContext(); //undefined - nullish
            let bot = document.createElement('div')
            if (t >= -1000) {
                let results = await this._display._findDictionaryEntries(k, optionsContext, false, options)
                console.warn(results, performance.now());
                let yc = []
                var fq = -1
                var fqs = []
                console.warn(performance.now());
                if (this.var('fq') || this.var('yc')) {
                    yc = await this.yomichan(results)
                    F = this.yomishow(yc, elem, fqs, fq, bot, optionsContext, 0)
                    tt = tt ?? ''
                    //elem.setAttribute('`w',` tt)
                    bot = F[0]
                    fq = F[1]
                    fqs = F
                }
            }

            //O.push(...yc)
            console.error(yc, O, fqs)
            if (this.search) {
                try {
                    //elem.querySelector('dd').innerHTML += `</li>`
                    let o = ''
                    if (k) {
                        try {
                            o = `Onyomi: ${results[0].kunyomi.join(' ')}</br>Kunyomi: ${results[0].onyomi.join(' ')}</br>${results[0].definitions.join(', ')}</br>`
                        } catch (error) {
                            console.log(error)
                        }
                    }
                    if (k) {
                        for (let io in results) {
                            if (io > 0) {
                                o += `${results[io]?.definitions?.join(', ')}`
                                let ok = REGEX.test(o);
                                //let REGEXJP = /[\u3040-\u309f\u30a0-\u30ff]/
                                //[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
                                //let isKanji = REGEX_CHINESE.test(ws[i]);
                            } else {
                                if (results[io]?.frequencies?.length > 0) {
                                    //o += `Freq:`
                                    for (let oi in results[io].frequencies) {
                                        console.log(`${results[io].frequencies[oi].frequency}/`)
                                    }
                                }
                            }
                        }
                        //o.replaceAll('undefined','')
                        //h.innerHTML += o
                        if (o.length > 0) {
                            O.push(o)
                        }
                    }
                    var ue = (str) => {
                        return str.replace(/\\u([a-fA-F0-9]{4})/g, function (g, m1) {
                            return String.fromCharCode(parseInt(m1, 16));
                        });
                    }
                    let y = F[2] ? F[2] : optionsContext;
                    /*try {
                        let en = elem.querySelector('.headword-text-container').cloneNode(true)
                        //en = y.cloneNode()
                        //en.querySelector('rt').remove()
                        //cpn.appendChild(en)
                        //cpn.querySelector('rt').remove()
                        for (let r of en.querySelectorAll('rt')) {
                            r.remove()
                        }
                        en.querySelector('.headword-reading').remove()
                        console.warn(en.innerHTML);
                        en = en.innerText
                        y = en
                    } catch { }*/
                    let [iji, kx] = [new RegExp(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/).test(y), 1];
                    elem.appendChild(document.createElement('dd'))
                    let de = document.createElement('div')
                    let dd = ''
                    let df = ''
                    let othhh = '';
                    let RGEX_CHINESE = new RegExp(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/);

                    de.insertAdjacentHTML("afterbegin", '<div class="dd" style="border: 2px solid rgb(20,100,10)"></div><div class="df" style="border: 1px solid rgb(60,45,45)"></div>')
                    if (iji && y.length >= 1) {
                        for (let i in y) {
                            let ijii = RGEX_CHINESE.test(y[i]);
                            if (ijii) {
                                dd += `<span style="font-size: 1.75em">${y[i]}</span>`
                                df += `<span style="font-size: 1.75em">${y[i]}</span>`
                                let result = await this._display._findDictionaryEntries(true, y[i], true, y[i])
                                console.dir(result)
                                let kym = ``
                                let oym = ''
                                for (let d in result) {
                                    if (result[d].dictionary.includes('KANJIDIC')) {
                                        kx = d
                                        try {
                                            dd += `<div>Onyomi: ${result[kx].kunyomi.join(' ')}</br>Kunyomi: ${result[kx].onyomi.join(' ')}</br>${result[kx].definitions.join(', ')}</div>`
                                        } catch (error) {
                                            console.log(error)
                                        }
                                    } else {
                                        try {
                                            kym = result[d].kunyomi.length > 0 ? `Onyomi: ${result[d].kunyomi.join(' ')}</br>` : ``
                                            oym = result[d].onyomi.length > 0 ? `Kunyomi: ${result[d].onyomi.join(' ')}</br>` : ''
                                            df += `<div>${kym}${oym}${result[d].definitions.join(', ')}</div>`
                                        } catch (error) {
                                            console.log(error)
                                        }
                                    }
                                }
                                //elem.querySelector('dd').innerHTML += `<li>${o}</li>`
                            }
                        }
                    }
                    de.querySelector('.dd').innerHTML = dd ?? '';
                    de.querySelector('.df').innerHTML = df ?? '';
                    df = de.innerHTML
                    elem.appendChild(de)
                } catch (jkj) {
                    console.log(jkj);
                }
            }
            elem.innerHTML += '<footer class="pw"></footer>'
            let pw = elem.querySelectorAll('.pw')
            console.dir(this.wiki)
            pw = pw[pw.length - 1]
            if (this.wiki) {
                let z = optionsContext
                if (z.length > 0) {
                    for (let ik in z) {
                        let sk = SE.test(z[ik]);
                        if (sk) {
                            await this.make(z, ik, h, optionsContext, pw)
                        }
                    }
                }
                if (z.length > 1) {
                    //let ll = await this.originate(z, h, optionsContext)
                    //console.dir(all)
                    //console.log(z, st)
                    //pw = elem.querySelectorAll('.pw')
                    //pw = pw[pw.length - 1]
                    //pw.innerHTML += `</br><footer class="w wkt"><p class="ppw" style="background-color: brown; margin: 2px; color: white; font-sdize: 2em;">-- ${z} --</p></br></div>`
                    await this.make([z], 0, h, optionsContext, pw)
                }
            }
            console.log(this.pe);
            if (!this.pe || !this.kan) {
                let x = optionsContext
                let fs = []
                for (let i in x) {
                    let isk = SE.test(x[i]);
                    //if(i >= 0){

                    let c = this.c
                    let cx = -1
                    for (let n in c) {
                        if (c[n].innerHTML == x[i]) {
                            cx = n
                            break
                        }
                    }
                    //_ ==== _
                    //                    console.warn(c, cx, x[i]);
                    if (cx >= 0) {
                        //let ct = this.c[cx].parentElement.parentElement.parentElement.parentElement
                        //pw.querySelectorAll('.w')[pw.querySelectorAll('.w').length-1].innerHTML += `<li class="kjd kjid">${ct.innerHTML}</li>`
                    } else if (isk && this.wiki) {
                        let d = await this.web("https://www.kanjidamage.com/kanji/search?q=" + x[i], 1)
                        //console.dir(d)
                        h.innerHTML += '</br><div class="kjd">' + ue(d) + '</div>'
                        let lu = h.querySelectorAll('.kjd')
                        lu = lu[lu.length - 1]
                        //pw.querySelectorAll('.w')[pw.querySelectorAll('.w').length-1].innerHTML += lu
                        let c = lu.querySelectorAll('div.row')
                        pw.innerHTML += '<footer class="w"></div>'
                        for (let ik in c) {
                            if (typeof c[ik] == 'object') {
                                pw.querySelectorAll('.w')[pw.querySelectorAll('.w').length - 1].innerHTML += `<li class="kjd kjid">${c[ik].innerHTML}</li>`
                            }
                        }
                        let kd = pw.querySelector('.kjid')
                        let kdis = elem.querySelectorAll('img')
                        console.log(kd, kdis);
                        for (let j in kdis) {
                            try {
                                if (false && kdis[j].src) {
                                    let kdi = kdis[j]
                                    let kpn = kdi.src.split('/')
                                    kpn = kpn[kpn.length - 1].split('-')[0]
                                    let fl = this.v
                                    let fm = ''
                                    for (let k in fs) {
                                        fm = fs[k] + '-'
                                        if (kpn.indexOf(fm) != -1) {
                                            fl = fs[k]
                                        }
                                    }
                                    console.log(kd, kdis, kdi, kpn, fl);
                                    kdi.src = 'assets/' + fl
                                }
                            } catch (iuy) {
                                console.error(iuy);
                            }

                        }
                    }
                }
            }
            let W

            W = elem.querySelectorAll('.w')
            elem.appendChild(bot)
            let di = 0
            for (let d of W) {
                if (!d.querySelector('.kjid')) {
                    //d.style.height = this.limit
                }
                if ((di + 2) >= W.length && ((W.length - 3) % 2 == 0 || W.length % 2 == 0)) {
                    d.style.width = '28em'
                }
                if (d.innerText.length < 2) {
                    d.remove()
                }
                di += 1
            }
            let W2 = elem.querySelectorAll('.w')
            if (W2.length == 1) {
                for (let d of W2) {
                    d.style.width = 'auto'
                }
            }
            //O = [] //yc
            for (let u in O) {
                if (u != 0) {
                    elem.innerHTML += `<span style="font-size: 0.98em;">${O[u].innerHTML}</span>`
                }
            }
            let REGEX_CHINESE = new RegExp(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/);
            let done = true
            return true
        } catch (error) {
            console.log(error)
            return false
        }
    }
    async f(w, from, to) {
        let a = w.split('\n')
        let r = ''
        for (let i of a) {
            //console.warn(i);
            r += await this.g(i, from, to, 0) + '</br>'
        }
        return r
    }
    async g(w, from = 'auto', to, api, maxLength = 5000) {
        var chunks = [];
        // Split the string into arrays of characters
        if (!w) {
            w = ''
        }
        chunks = Array.from({ length: Math.ceil(w.length / maxLength) }, (_, index) =>
            w.slice(index * maxLength, (index + 1) * maxLength)
        );
        var translatedChunks = [];
        // Translate each chunk
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const translated = await this.tl(chunk, from, to, api);
            let t = ''
            let tll = translated
            //console.warn(translated);
            if (api == 0) {
                for (let i in translated) {
                    if (tll[i] !== null && tll[i].length > 0 && typeof tll[i] == 'object') {
                        for (let j in tll[i]) {
                            if (tll[i][j] !== null && tll[i][j].length > 0 && typeof tll[i][j] == 'object') {
                                //console.log(tll[i][j]);
                                t += tll[i][j][0]
                                //break
                                //[k]
                                //this.t.innerHTML += '</br>'
                            }
                        }
                    }
                }
            } else {
                t += JSON.stringify(translated)
            }
            translatedChunks.push(t);
        }
        const r = translatedChunks.join('');
        //console.warn(chunks, translatedChunks, r, maxLength);
        return r
    }
    tl(w, from = 'auto', to, api) {
        let url
        if (api == 0) {
            url = encodeURI(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${w}`)
        } else {
            url = encodeURI(`https://clients5.google.com/translate_a/single?dj=1&dt=t&dt=sp&dt=ld&dt=bd&client=dict-chrome-ex&sl=${from}&tl=${to}&q=${w}`)
        }
        //console.warn(api, url);
        if (this.stop) {
            return
        }
        return new Promise(function (resolve, reject) {
            let xhr = new XMLHttpRequest();
            xhr.responseType = 'json'
            xhr.open('GET', url);
            xhr.onload = function () {
                if (this.status >= 200 && this.status < 700) {
                    resolve(xhr.response);
                } else {
                    reject({
                        status: this.status,
                        statusText: xhr.statusText
                    });
                }
            }
                ;
            xhr.onerror = function () {
                reject({
                    status: this.status,
                    statusText: xhr.statusText
                });
            }
            xhr.send();
        }
        );
    }

    async web(url, o, kj) {
        //hs.append('Content-Type', 'text/plain; charset=UTF-8');
        console.log(`WebUrl: ${url}`)
        if (kj === false) {
            //if (kj.length > 1) {
            return
            //}
        }
        const promise = await fetch(url,
            {
                headers: { "Content-Type": "text/html; charset=UTF-8" }
            })
        //if (signal) signal.addEventListener("abort", () => controller.abort());
        console.dir(url)
        console.dir(promise)
        //const timeout = setTimeout(() => controller.abort(), 5000);
        let html = await promise.text();
        if (o == 0) {
            //console.dir(kj)
            let h = document.createElement('p')
            h.innerHTML += '</br><div class="kjpSearch">' + html + '</div>'
            //let ku = h.querySelector('.kjpSearch')
            try {
                let kurl = h.querySelector('#resultKanjiList li a').getAttribute('href')
                return this.web(`https://www.kanjipedia.jp${kurl}`, 1)
            } catch (ek) {
                console.log(ek)

            }
        }
        /*let img = await promise.blob();
        const imageBase64 = URL.createObjectURL(img)
  console.log({imageBase64})
  const a = document.createElement('a')
  a.style.setProperty('display', 'none')
  this.mod.appendChild(a)
  a.download = url.replace(/^.*[\\\/]/, '')
  a.href = imageBase64*/
        return html //,img]
    }
    async wkt(w, l) {
        let a = '' //&action=query&prop=extracts&format=json
        let b = 'wiki/' //w/api.php?titles=
        let c = 'en'
        if (l == 0) {
            c = `zh`
        } if (l == 1) {
            c = `ja`
        } if (l == 2) {
            c = `id`
        }
        if (l > 50) {
            c = 'en'
        }
        c = 'en'
        let url = `https://${c}.wiktionary.org/${b}${w}${a}`
        //return new Promise(function (resolve, reject) {
        //const controller = new AbortController();
        var hs = new Headers();
        hs.append('Content-Type', 'text/plain; charset=UTF-8');
        const promise = await fetch(decodeURI(url),
            {
                headers: { "Content-Type": "text/html; charset=UTF-8" }
            })
        //if (signal) signal.addEventListener("abort", () => controller.abort());
        console.dir(url)
        console.dir(promise)
        //const timeout = setTimeout(() => controller.abort(), 5000);
        return await promise.text();
    }
    async make(z, ik, h, optionsContext, pw) {
        let all = await this.originate(z[ik], h, optionsContext)
        let jl = all[0]
        let org = all[1]
        let al = all[2]
        let pd = all[3]
        console.dir(all)
        let sr
        pw.innerHTML += `<footer class="w wkt"><p class="ppw" style="background-color: brown; margin: 2px; color: white; font-sdize: 2em;">-- ${z[ik]} --</p></div>`
        /*pw.addEventListener('click', function (ele) {
            if (!ele) var ele = window.event;
            ele.stopPropagation()
            console.dir(ele, ele.target)
            let pwm = ele.target.closest('.ppw')
            //let ist = ele.target.closest('.title')
            if (pwm.sdictionatyle.display == "none") {
                pwm.style.display = "block";
            } else {
                pwm.style.display = "none";
            }
        })*/
        if (pd.length > 0) {
            for (let it3 of pd) {
                if (it3) {
                    pw.querySelectorAll('.w')[pw.querySelectorAll('.w').length - 1].innerHTML += it3
                }//
            }
        }
        pw.querySelectorAll('.w')[pw.querySelectorAll('.w').length - 1].innerHTML += '</br>'
        for (let it in org) {
            if (org[it]) {
                if (!(org[it].includes('Chinese') || org[it].includes('Glyph origin'))) {
                    pw.querySelectorAll('.w')[pw.querySelectorAll('.w').length - 1].innerHTML += org[it]
                }
            }
        }
        //elem.querySelector('dd').innerHTML = elem.querySelector('dd').innerHTML.replace('Phono-semantic compound', 'PhonoS')
        for (let it in jl) {
            if (jl[it]) {
                pw.querySelectorAll('.w')[pw.querySelectorAll('.w').length - 1].innerHTML += jl[it]
            }
        }
        for (let it in al) {
            if (al[it]) {
                pw.querySelectorAll('.w')[pw.querySelectorAll('.w').length - 1].innerHTML += al[it]
            }
        }
    }
    async analyze() {

    }
    startMod() {
        this.Mod = document.createElement("div")
        this.modT = this.Mod.appendChild(document.createElement("div"))
        this.modP = document.createElement("div")
        console.warn(this.modP);
        let ps = this.var('pre') ? ['afterend', document.querySelector('#dictionary-entries')] : ['beforebegin', document.querySelector('#dictionary-entries')]
        ps[1].insertAdjacentElement(ps[0], this.modP)
        if (this.lang != 'ja') {
            ps[1].insertAdjacentElement(ps[0], this.Mod)
        } else {
            this.t.appendChild(this.Mod)
        }
        console.warn(ps);
        return ps
    }
    async originate(z, h, optionsContext) {
        let RGEX_CHINESE = new RegExp(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/);
        let iji = RGEX_CHINESE.test(z);
        let ip = ''
        let jl = []
        let b = []
        let org = []
        let o = ''
        let al = []
        let a = []
        if (!(z.length == 1)) {
            iji = false
        }
        //console.log(z, st)
        let ue = (str) => {
            return str.replace(/\\u([a-fA-F0-9]{4})/g, function (g, m1) {
                return String.fromCharCode(parseInt(m1, 16));
            });
        }
        await Promise.all([
            this.wkt(z),
            this.web(`https://www.kanjipedia.jp/search?kt=1&sk=leftHand&k=${z}`, 0, z, iji),
        ]).then(([st, kj]) => {
            st = st.replaceAll(/\\n/g, '');
            h.innerHTML += '</br><div class="wkt">' + ue(st) + '</div>'
            let lu = h.querySelectorAll('.wkt')
            lu = lu[lu.length - 1]
            let lc
            try {
                lc = lu.querySelector('.mw-parser-output').children//lu.children
                console.warn(lu, h, lc);
                let lt = false
                let ad = false
                let or = false
                let lz = ''
                let o = ''
                let iz = 0
                for (let m in lc) {
                    if (m >= 0) {
                        try {
                            if (lc[m].innerHTML.length > 0) {
                                console.log(lc[m].tagName)
                                if (lc[m].tagName == 'H2') {
                                    if (lc[m].innerText.includes('Chin')) {
                                        //let sel = 
                                        //ad = false
                                        ad = true
                                        or = true
                                        lt = false
                                    } else if (lc[m].innerText.includes('Japan')) {
                                        //
                                        or = false
                                        lt = true
                                        ad = false
                                        //iz = 0
                                        //lz = lc[m].innerHTML
                                    } else {
                                        iz = al.length - 1
                                        lz = lc[m].innerHTML
                                        lt = false
                                        ad = false
                                        or = false
                                    }
                                }
                                //lz = lc[m].innerHTML
                                try {
                                    if (lc[m].innerText.includes('Definitions')) {
                                        or = false
                                        //lt = false
                                    }
                                } catch { }
                                try {
                                    a.push(lc[m].innerHTML + ' ')
                                    if (lt) {
                                        jl.push(lc[m].innerHTML + ' ')
                                    } else if (or) {
                                        org.push(lc[m].innerHTML + ' ')
                                    } else if (ad) {
                                        al.push(lc[m].innerHTML + ' ')
                                    } else {
                                        b.push(lc[m].innerHTML)
                                    }
                                } catch { }
                                //console.log(m, lc[m].innerHTML, iz, lz, lt, ad)
                            }
                        } catch (esx) {
                            console.log(esx)
                        }
                    }
                }
            } catch (le) {
                console.error(le);
            }
            try {
                if (iji) {
                    h.innerHTML += '</br><div class="kjp">' + ue(kj) + '</div>'
                    let ku = h.querySelectorAll('.kjp')
                    ku = ku[ku.length - 1]
                    let os = []
                    os.push('Origin: ' + ku.querySelector('#kanjiRightSection > ul > li.naritachi > div:nth-child(2) > p').innerHTML)
                    os.push('</br>Meaning: ' + ku.querySelector('#kanjiRightSection > ul > li:nth-child(1) > div > p').innerHTML)
                    os.push('</br>Usage: ' + ku.querySelector('#kanjiRightSection > ul > li:nth-child(2) > div > p').innerHTML)
                    o = os
                }
            } catch (lle) {
                console.error(lle);
            }
        }).catch((err) => {
            console.log(err);
        });
        let sr
        let res = [jl, org, al, o, a, b]
        return res
    }
    def(t, r, m, c, o) {
        if (o == 0) {
            let df = document.createElement("div")
            df.innerHTML = `<td><div class="entry2" data-type="term" data-format="term" style="display: flex; font-size: 0.8em">
            <div class="entry-header" style="display: grid;">               <div class="actions" style="display: grid;">
                    <button class="action-button action-button-collapsible" data-action="view-tags" hidden="" disabled=""><span
                            class="action-icon icon" data-icon="tag"></span></button><button class="action-button"
                        data-action="view-note" hidden="" disabled="" title="View added note (V)"
                        data-hotkey="[&quot;viewNote&quot;,&quot;title&quot;,&quot;View added note ({0})&quot;,[&quot;View added note&quot;]]"
                        data-menu-position="left below h-cover v-cover" data-note-ids=""><span
                            class="action-icon icon color-icon" data-icon="view-note"></span><span
                            class="action-button-badge icon" hidden="" data-hidden="true"></span></button><button
                        class="action-button" data-action="add-note" data-mode="term-kanji" title="Add expression (E)"
                        data-hotkey="[&quot;addNoteTermKanji&quot;,&quot;title&quot;,&quot;Add expression ({0})&quot;,[&quot;Add expression&quot;]]"></button><button
                        class="action-button" data-action="add-note" data-mode="term-kana" title="Add reading (R)"
                        data-hotkey="[&quot;addNoteTermKana&quot;,&quot;title&quot;,&quot;Add reading ({0})&quot;,[&quot;Add reading&quot;]]"><span
                            class="action-icon icon color-icon" data-icon="add-term-kana"></span></button><button
                        class="action-button" data-action="play-audio" title="Play audio (P)"
                        data-title-default="Play audio (P)"
                        data-hotkey="[&quot;playAudio&quot;,[&quot;title&quot;,&quot;data-title-default&quot;],&quot;Play audio ({0})&quot;,[&quot;Play audio&quot;,&quot;Play audio&quot;]]"
                        data-menu-position="left below h-cover v-cover"><span class="action-icon icon color-icon"
                            data-icon="play-audio"></span><span class="action-button-badge icon" hidden=""></span></button><span
                        class="entry-current-indicator-icon" title="Current entry"><span class="icon color-icon"
                            data-icon="entry-current"></span></span><button class="action-button action-button-collapsible"
                        data-action="menu" data-menu-position="left below h-cover v-cover"><span class="action-icon icon"
                            data-icon="kebab-menu"></span></button></div>
                <div class="headword-list" data-count="1">
                    <div class="headword" data-is-primary="true" data-reading-is-same="false" data-frequency="normal"
                        data-match-types="exact" data-match-sources="reading" data-index="0" style="font-size: 1em;vertical-align: middle;">
                        <div class="headword-text-container"><span class="headword-term-outer source-text"><span
                                    class="headword-current-indicator"></span><span class="headword-term" lang="ja"><ruby><a
                                            class="headword-kanji-link" lang="ja">${t}</a>
                                        <rt style="font-size: 0.5em">${r}</rt>
                                    </ruby></span></span><span class="headword-reading-outer"><span class="headword-reading"
                                    lang="ja" style="font-size: 0.5em">${r}</span></span></div>
                        <div class="headword-details"><button class="action-button" data-action="play-audio"
                                title="Play audio (P)" data-title-default="Play audio (P)"
                                data-hotkey="[&quot;playAudio&quot;,[&quot;title&quot;,&quot;data-title-default&quot;],&quot;Play audio ({0})&quot;,[&quot;Play audio&quot;,&quot;Play audio&quot;]]"
                                data-menu-position="right below h-cover v-cover"><span class="action-icon icon color-icon"
                                    data-icon="play-audio"></span><span class="action-button-badge icon"
                                    hidden=""></span></button></div>
                    </div>
                </div>
                <div class="headword-list-details">
                    <div class="headword-list-tag-list tag-list" data-count="0"><span class="tag" title="" data-details="${t}"
                            data-category="search"><span class="tag-label"><span class="tag-label-content"
                                    lang="ja">${t}</span></span></span><span class="tag" title="" data-details="${r}"
                            data-category="search"><span class="tag-label"><span class="tag-label-content"
                                    lang="ja" style="font-size: 0.4em">${r}</span></span></span></div>
                    <div class="inflection-list" data-count="0"></div>
                </div>
            </div>
            <div class="entry-body" style="overflow: hidden;text-overflow: ellipsis; height: ${this.limit}; width: ${this.wid};">
                <div class="entry-body-section" data-section-type="definitions">
                    <ol id="means" class="entry-body-section-content definition-list"></ol>
                </div>
            </div>
        </div></td>`
            c.appendChild(df)
            return df
        } else {
            let mn = c.querySelector("#means")
            console.dir(m)
            mn.innerHTML += `<li class="definition-item" data-dictionary="">
            <div class="definition-item-inner">
                    <ul class="gloss-list" style="">
                        <li class="gloss-item click-scannable"><span class="gloss-separator"> </span><span
                                class="gloss-content">${m}</span></li>
                    </ul>
                </div>
            </div>
        </li>`
        }
    }
    frequency(word) {
        const entry = this.jpdb.find(entry => entry[0] === word || entry[2].reading === word);
        return entry ? entry[2]?.frequency?.value : -1;
    }
    reading(word) {
        const entry = this.jpdb.find(entry => entry[0] === word);
        return entry ? entry[2].reading : null;
    }
    async main(txt) {
        //import { getClient, AvailableLanguages } from 'iframe-translator';
        //const tl = require('iframe-translator')
        let r
        try {
            /*let tl = import('./index.js').then(tl => {
                console.dir(tl)
                tl.translate('你好', null, 'en').then(res => {
                    console.log(res.translation);
                }).catch(err => {
                    console.error(err);
                });
                // your code
                //const client = tl.getClient(document.URL).then((client)=>{
                //       console.log(AvailableLanguages); // { 'af': 'Afrikaans', ... }
                tl.translate('こんにちは', null, 'en').then(r => {
                    return r.translation;
                }); // hello
                //console.log(client.translate('こんにちは', 'ko')); // 안녕하세요
                //             client.destroy();
                //})//
                //r = c //Microsoft.Translator.Widget.Translate('en', txt, onComplete);
            });*/
            return 1
        } catch (e) {
            return e
        }
    }
    kr() {
        let initialjamo = new Object();
        initialjamo.b = 7
        initialjamo.bb = 8
        initialjamo.b̥ = 7
        initialjamo.c = 12
        initialjamo.cc = 13
        initialjamo.ch = 14
        initialjamo.cʰ = 14
        initialjamo.cː = 13
        initialjamo.c̥ = 12
        initialjamo.d = 3
        initialjamo.dd = 4
        initialjamo.d̥ = 3
        initialjamo.g = 0
        initialjamo.gg = 1
        initialjamo.g̊ = 0
        initialjamo.h = 18
        initialjamo.j = 12
        initialjamo.jh = 14
        initialjamo.jj = 13
        initialjamo.k = 0
        initialjamo.kh = 15
        initialjamo.kk = 1
        initialjamo.kʰ = 15
        initialjamo.kː = 1
        initialjamo.l = 5
        initialjamo.m = 6
        initialjamo.n = 2
        initialjamo.n̟ = 2
        initialjamo.p = 7
        initialjamo.ph = 17
        initialjamo.pp = 8
        initialjamo.pʰ = 17
        initialjamo.pː = 8
        initialjamo.r = 5
        initialjamo.s = 9
        initialjamo.ss = 10
        initialjamo.sʰ = 10
        initialjamo.sː = 10
        initialjamo.t = 3
        initialjamo.tch = 13
        initialjamo.th = 16
        initialjamo.ts = 12
        initialjamo.tsh = 14
        initialjamo.tss = 13
        initialjamo.tt = 4
        initialjamo.tʰ = 16
        initialjamo.ɕ = 9
        initialjamo.ɾ = 5
        initialjamo["ch'"] = 14
        initialjamo["ch’"] = 14
        initialjamo["k'"] = 15
        initialjamo["k’"] = 15
        initialjamo["p'"] = 17
        initialjamo["p’"] = 17
        initialjamo["t'"] = 16
        initialjamo["t’"] = 16
        console.warn(initialjamo, this.lang)
        let medialjamo = new Object();

        medialjamo.a = 0;
        medialjamo.ae = 1;
        medialjamo.ai = 1;
        medialjamo.ay = 1;
        medialjamo.e = 5;
        medialjamo.eo = 4;
        medialjamo.eu = 18;
        medialjamo.eui = 19;
        medialjamo.ey = 5;
        medialjamo.i = 20;
        medialjamo.ja = 2;
        medialjamo.je = 3;
        medialjamo.jo = 12;
        medialjamo.ju = 17;
        medialjamo.jɔ = 6;
        medialjamo.jɛ = 7;
        medialjamo.o = 8;
        medialjamo.oe = 11;
        medialjamo.oi = 11;
        medialjamo.oy = 11;
        medialjamo.u = 13;
        medialjamo.ue = 10;
        medialjamo.ui = 19;
        medialjamo.uy = 19;
        medialjamo.uɑ = 9;
        medialjamo.uɔ = 14;
        medialjamo.uɛ = 15;
        medialjamo.wa = 9;
        medialjamo.wae = 10;
        medialjamo.wai = 10;
        medialjamo.way = 10;
        medialjamo.we = 15;
        medialjamo.weo = 14;
        medialjamo.wey = 15;
        medialjamo.wi = 16;
        medialjamo.wo = 14;
        medialjamo.wu = 13;
        medialjamo.wä = 10;
        medialjamo.wø = 14;
        medialjamo.wŏ = 14;
        medialjamo.y = 16;
        medialjamo.ya = 2;
        medialjamo.yae = 3;
        medialjamo.yai = 3;
        medialjamo.yay = 3;
        medialjamo.ye = 7;
        medialjamo.yeo = 6;
        medialjamo.yey = 7;
        medialjamo.yo = 12;
        medialjamo.yu = 17;
        medialjamo.yä = 3;
        medialjamo.yø = 6;
        medialjamo.yŏ = 6;
        medialjamo.ä = 1;
        medialjamo.ö = 11;
        medialjamo.ø = 4;
        medialjamo.ŏ = 4;
        medialjamo.ŭ = 18;
        medialjamo.ŭi = 19;
        medialjamo.ɑ = 0;
        medialjamo.ɔ = 4;
        medialjamo.ɛ = 5;
        medialjamo.ɨ = 18;
        medialjamo.ɨi = 19;
        medialjamo.ɯ = 18;
        medialjamo.ʉ = 18;
        medialjamo.ʉi = 19;

        let finaljamo = new Object();

        finaljamo.b = 17;
        finaljamo.bs = 18;
        finaljamo.b̥ = 17;
        finaljamo.c = 22;
        finaljamo.ch = 23;
        finaljamo.cʰ = 23;
        finaljamo.c̥ = 22;
        finaljamo.d = 7;
        finaljamo.d̥ = 7;
        finaljamo.g = 1;
        finaljamo.gg = 2;
        finaljamo.gs = 3;
        finaljamo.g̊ = 1;
        finaljamo.h = 27;
        finaljamo.j = 22;
        finaljamo.jh = 23;
        finaljamo.k = 1;
        finaljamo.kh = 24;
        finaljamo.kk = 2;
        finaljamo.ks = 3;
        finaljamo.kʰ = 24;
        finaljamo.kː = 2;
        finaljamo.l = 8;
        finaljamo.lb = 11;
        finaljamo.lg = 9;
        finaljamo.lh = 15;
        finaljamo.lk = 9;
        finaljamo.lm = 10;
        finaljamo.lp = 11;
        finaljamo.lph = 14;
        finaljamo.lpʰ = 14;
        finaljamo.ls = 12;
        finaljamo.lt = 13;
        finaljamo.lth = 13;
        finaljamo.ltʰ = 13;
        finaljamo.m = 16;
        finaljamo.n = 4;
        finaljamo.nc = 5;
        finaljamo.nch = 6;
        finaljamo.ncʰ = 6;
        finaljamo.ng = 21;
        finaljamo.nh = 6;
        finaljamo.nj = 5;
        finaljamo.nɟ = 5;
        finaljamo.n̟ = 4;
        finaljamo.p = 17;
        finaljamo.ph = 26;
        finaljamo.ps = 18;
        finaljamo.pʰ = 26;
        finaljamo.r = 8;
        finaljamo.s = 19;
        finaljamo.ss = 20;
        finaljamo.sʰ = 20;
        finaljamo.sː = 20;
        finaljamo.t = 7;
        finaljamo.th = 25;
        finaljamo.ts = 22;
        finaljamo.tsh = 23;
        finaljamo.tʰ = 25;
        finaljamo.ŋ = 21;
        finaljamo.ɕ = 19;
        finaljamo.ɾ = 8;
        finaljamo["ch'"] = 23;
        finaljamo["ch’"] = 23;
        finaljamo["k'"] = 24;
        finaljamo["k’"] = 24;
        finaljamo["p'"] = 26;
        finaljamo["p’"] = 26;
        finaljamo["t'"] = 25;
        finaljamo["t’"] = 25;

        let otherspecial = new Object();

        otherspecial["-"] = "";
        otherspecial["\\-"] = "-";
        otherspecial["."] = "";
        otherspecial["\\."] = ".";

        let maxlen = 3;
        console.warn(this.lang);
        console.warn(document.querySelector('#search-textbox').value)
        if (this.lang == 'ko') {
            document.querySelector('#search-textbox').onchange = () => {
                let romanized = document.querySelector("#search-textbox").value.toLowerCase() + " ";
                var hangul = "";
                let initialjamovalue = -1;
                let medialjamovalue = -1;
                let finaljamovalue = -1;
                let pos = 0;
                let len
                let found
                while (pos < romanized.length) {
                    if (initialjamovalue == -1) {
                        len = maxlen;
                        if (romanized.length - pos < len) {
                            len = romanized.length - pos;
                        }
                        while (len > 0 && initialjamovalue == -1) {
                            if (initialjamo[romanized.substring(pos, pos + len)] != null) {
                                initialjamovalue = initialjamo[romanized.substring(pos, pos + len)];
                                pos += len;
                            }
                            len--;
                        }
                        if (initialjamovalue == -1) {
                            // no initial consonant; see if sequence starts a valid medial jamo
                            // and use the placeholder initial jamo (#11)
                            len = maxlen;
                            if (romanized.length - pos < len) {
                                len = romanized.length - pos;
                            }
                            while (len > 0 && medialjamovalue == -1) {
                                if (medialjamo[romanized.substring(pos, pos + len)] != null) {
                                    medialjamovalue = medialjamo[romanized.substring(pos, pos + len)];
                                    pos += len;
                                }
                                len--;
                            }
                            if (medialjamovalue != -1) {
                                initialjamovalue = 11;
                            }
                        }
                        if (initialjamovalue == -1) {
                            // didn't find an initial jamo, so see if there's one of the special
                            // replacement strings.
                            found = false;
                            len = maxlen;
                            if (romanized.length - pos < len) {
                                len = romanized.length - pos;
                            }
                            while (len > 0 && !found) {
                                if (otherspecial[romanized.substring(pos, pos + len)] != null) {
                                    hangul += otherspecial[romanized.substring(pos, pos + len)];
                                    pos += len;
                                    found = true;
                                }
                                len--;
                            }
                            if (!found) {
                                hangul += romanized.charAt(pos);
                                pos++;
                            }
                        }
                    } else if (medialjamovalue == -1) {
                        // initial jamo found, so see if there's a medial jamo
                        len = maxlen;
                        if (romanized.length - pos < len) {
                            len = romanized.length - pos;
                        }
                        while (len > 0 && medialjamovalue == -1) {
                            if (medialjamo[romanized.substring(pos, pos + len)] != null) {
                                medialjamovalue = medialjamo[romanized.substring(pos, pos + len)];
                                pos += len;
                            }
                            len--;
                        }
                        if (medialjamovalue == -1) {
                            // no valid medial jamo found, so consider the previous initial jamo
                            // invalid and look for another, but output the romanized text
                            hangul += romanized.charAt(pos - 1);
                            initialjamovalue = -1;
                        }
                    } else {
                        // initial and medial jamo found, so see if there's a final jamo
                        len = maxlen;
                        if (romanized.length - pos < len) {
                            len = romanized.length - pos;
                        }
                        while (len > 0 && finaljamovalue == -1) {
                            if (finaljamo[romanized.substring(pos, pos + len)] != null) {
                                finaljamovalue = finaljamo[romanized.substring(pos, pos + len)];
                                pos += len;
                            }
                            len--;
                        }
                        // Add a hangul syllabic block either way
                        if (finaljamovalue != -1) {
                            hangul += String.fromCharCode(initialjamovalue * 588 + medialjamovalue * 28 + finaljamovalue + 44032);
                        } else {
                            hangul += String.fromCharCode(initialjamovalue * 588 + medialjamovalue * 28 + 44032);
                        }
                        // Now that the syllabic block is complete, reset all values to -1 to search for the next one.
                        initialjamovalue = -1;
                        medialjamovalue = -1;
                        finaljamovalue = -1;
                    }
                }
                document.querySelector('#search-textbox').value = hangul.substring(0, hangul.length - 1);
            }
        }
    }
    sets(e) {
        console.log(e, document.querySelector('#search-textbox').value)
        localStorage.setItem(document.querySelector('#search-textbox').id, document.querySelector('#search-textbox').value);
    }
    set(e, r) {
        localStorage.setItem(e, r);
    }
    get(v) {
        if (!localStorage.getItem(v)) {
            return "";
        }
        return localStorage.getItem(v);
    }
    _copyHostSelection() {
        if (this._contentOriginFrameId === null || window.getSelection().toString()) { return false; }
        this._copyHostSelectionSafe();
        return true;
    }
    async _copyHostSelectionSafe() {
        try {
            await this._copyHostSelectionInner();
        } catch (e) {
            // NOP
        }
    }
    async _copyHostSelectionInner() {
        switch (this._browser) {
            case 'firefox':
            case 'firefox-mobile':
                {
                    let text;
                    try {
                        text = await this.invokeContentOrigin('Frontend.getSelectionText');
                    } catch (e) {
                        break;
                    }
                    this._copyText(text);
                }
                break;
            default:
                await this.invokeContentOrigin('Frontend.copySelection');
                break;
        }
    }
    _copyText(text) {
        const parent = document.body;
        if (parent === null) { return; }

        let textarea = null;
        if (textarea === null) {
            textarea = document.createElement('textarea');
            let _copyTextarea = textarea;
        }

        textarea.value = text;
        parent.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        parent.removeChild(textarea);
    }
    async yomichan(dictionaryEntries) {
        let r = []
        for (let i = 0, ii = dictionaryEntries.length; i < ii; ++i) {
            if (i > 0) {
                //await promiseTimeout(1);
                //   if (this._setContentToken !== token) { return; }
            }
            const dictionaryEntry = dictionaryEntries[i];
            const entry = (
                dictionaryEntry.type === 'term' ?
                    this._display._displayGenerator.createTermEntry(dictionaryEntry) :
                    this._display._displayGenerator.createKanjiEntry(dictionaryEntry)
            );
            entry.dataset.index = `${i}`;
            this._display._dictionaryEntryNodes.push(entry);
            this._display._addEntryEventListeners(entry);
            this._display._triggerContentUpdateEntry(dictionaryEntry, entry, i);
            let e = document.createElement('div')
            e.className = 'yomi'
            e.appendChild(entry);
            r.push(e)
            this.eP.appendChild(e)
            //if (focusEntry === i) {
            //this._focusEntry(i, 0, false);
            //}
            this._display._elementOverflowController.addElements(entry);
        }
        console.warn(r, dictionaryEntries);
        return r
    }
    yomishow(yc, elem, fqs, fq, bot, tt = '', q = 0) {
        try {
            if (this.var('fq') || this.var('yc')) {
                console.warn(yc.length, yc);
                try {
                    for (let y of yc) {
                        //console.warn(performance.now(), y.innerHTML);
                        if (this.var('fq')) {
                            let fqe = y.querySelectorAll('span.frequency-value')
                            for (let f of fqe) {
                                console.warn(f.parentElement.parentElement);
                                fqs.push(parseInt(f.getAttribute('data-frequency')))
                            }
                            fq = fqs.reduce((partialSum, a) => partialSum + a, 0) / fqs.length;
                            let RGEX = new RegExp(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/);
                            let ji = RGEX.test(optionsContext);
                            if (!ji) {
                                //fq /= 4
                            } else {
                                fq *= 175 / 100
                            }
                            console.warn(fqs, ji, fq, fq < parseInt(localStorage.getItem('freq')));
                            if (fq < parseInt(localStorage.getItem('freq'))) {
                                elem.style.display = 'none'
                            } else {
                                elem.style.display = 'flex'
                            }
                            yc = []
                        }
                        if (this.var('yc')) {//en.indexOf(elem.querySelector('.kj').innerText) != -2) {llz
                            for (let t of y.querySelectorAll('.frequency-group-tag')) {
                                //y.querySelector('.entry-header').innerHTML += t.innerHTML
                                bot.appendChild(t)
                            }
                            //y.querySelector('.entry-header').innerHTML += y.querySelector('.frequency-group-item').innerHTML
                            //y.querySelector('.entry-body-section').remove()
                            let li = elem.querySelectorAll('li.gloss-content')
                            y.querySelector('[data-section-type="definitions"]').parentElement.prepend(y.querySelector('[data-section-type="definitions"]'))
                            if (q === 0) {
                                const entryHeader = elem.querySelector('.entry-header');
                                const partElement = elem.querySelector('.part');

                                if (entryHeader && partElement) {
                                    try {
                                        entryHeader.appendChild(partElement);
                                        partElement.style.border = '2px solid purple';
                                    } catch (error) {
                                        console.error('Error:', error);
                                    }
                                } else {
                                    console.error('Entry header or part element not found.');
                                }
                            }
                            y.querySelector('.entry-header').classList.add('title'); y.querySelector('.headword-term').className += ' kj'
                            let o = this.var
                            if (!(o('rd') || o('fq') || o('kan'))) {
                                //y.querySelector('.headword-term').className += ' nav'
                            }
                            if (q == 0 && this.var('yc')) {
                                elem.querySelector('.tit').style.display = 'none'
                                elem.prepend(y)
                            }
                            let pn = tt
                            try {
                                pn = y.querySelector('.pronunciation-representation-list').children[0].innerHTML
                            } catch {
                                try {
                                    pn = y.querySelector('.headword-reading').innerHTML
                                } catch {
                                    pn = tt
                                }
                            }
                            elem = y
                            let ind = elem.getAttribute('ind')
                            console.error(pn, ind);
                            try {
                                if (!this.var('roma')) {
                                    const readingElement = document.querySelector(`[i="${ind}"] .reading`);
                                    if (readingElement) {
                                        try {
                                            readingElement.innerHTML = pn || '';
                                        } catch (error) {
                                            console.error('Error:', error);
                                        }
                                    } else {
                                        console.error('Reading element not found.');
                                    }
                                }
                            } catch (error) {
                                console.error(error);
                            }
                            tt = pn
                            for (let l of li) {
                                //elem.querySelector('ol.entry-body-section-content').prepend(l)
                            }
                            //yc = yc.slice(0, 1)
                        }
                        break
                    }
                } catch (yye) {
                    console.warn((yye));
                }
            }
        } catch (ye) {
            console.error(ye);
        }
        return [bot, fq, tt, elem, ...fqs]
    }
    prevent(l) {
        this.lmt = performance.memory.jsHeapSizeLimit * l / 100
        //console.warn(l, this.lmt, performance.memory.usedJSHeapSize);
        return performance.memory.usedJSHeapSize > this.lmt;
    }
    var(v) {
        return localStorage.getItem(v) == 'true' ? true : false
    }
    async txtImg(img = false) {
        if (img) {
            try {
                const clipboardItems = await navigator.clipboard.read();
                for (const item of clipboardItems) {
                    for (const type of item.types) {
                        if (type === 'image/png' || type === 'image/jpeg') {
                            const blob = await item.getType(type);
                            return blob;
                        }
                    }
                }
            } catch (error) {
                console.error('Error accessing image from clipboard:', error);
            }
        } else {
            try {
                const text = await navigator.clipboard.readText();
                return text;
            } catch (error) {
                console.error('Error accessing text from clipboard:', error);
            }
        }

        return null; // Return null if no text or image found
    }
    getText() {
        const parent = document.body;
        if (parent === null) { return; }

        let textarea = null;
        if (textarea === null) {
            textarea = document.createElement('textarea');
        }
        parent.prepend(textarea);
        textarea.select();
        document.execCommand('paste');
        let v = textarea.value
        parent.removeChild(textarea);
        console.dir(v)
        return v
    }
    groupByN(n, arr, ist = 0) {
        let result = [];
        //arr = arr.length < 2 ? arr[0] : arr
        arr = arr.filter(item => item.trim() !== '');

        for (let i = 0; i < arr.length; i += n) {
            result.push(arr.slice(i, i + n));
        }

        console.warn('GroupN:: ', result, n, arr, ist);
        this.stop = false
        return result;
    }
}  