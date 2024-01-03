/* globals Dict, aDict, aNote, merge, aIn, wn */
var nv = (v) => {
    return localStorage.getItem(v) == 'true'
}
// Function to apply the comparison operator to the value and targetValue
function applyComparison(value, comparison, targetValue) {
    // Check if the value can be parsed as a number
    if (!isNaN(parseFloat(value))) {
        value = parseFloat(value); // Convert the value to float if it's a number
    }

    // Apply the comparison operator to the value and targetValue
    switch (comparison) {
        case '>':
            return value > targetValue;
        case '<':
            return value < targetValue;
        case '>=':
            return value >= targetValue;
        case '<=':
            return value <= targetValue;
        case '==':
            return value === targetValue;
        case '!=':
            return value !== targetValue;
        default:
            throw new Error('Invalid comparison operator: ' + comparison);
    }
}
function time(value, conversion) {
    var date;
    var day, month, year, hours, minutes, seconds;

    if (conversion) {
        date = new Date(value * 1000);
        day = date.getDate().toString().padStart(2, '0');
        month = (date.getMonth() + 1).toString().padStart(2, '0');
        year = date.getFullYear();
        hours = date.getHours().toString().padStart(2, '0');
        minutes = date.getMinutes().toString().padStart(2, '0');
        seconds = date.getSeconds().toString().padStart(2, '0');
        var formattedDate = day + '/' + month + '/' + year + ' ' + hours + ':' + minutes + ':' + seconds;

        return formattedDate;
    } else {
        var parts = value.split(' ');
        var dateParts = parts[0]?.split('/') ?? ['1','1','2000'];
        var timeParts = parts[1]?.split(':') ?? ['0','0','0'];
        day = parseInt(dateParts[0], 10);
        month = parseInt(dateParts[1], 10) - 1;
        year = parseInt(dateParts[2], 10);
        hours = parseInt(timeParts[0], 10);
        minutes = parseInt(timeParts[1], 10);
        seconds = parseInt(timeParts[2], 10);
        date = new Date(year, month, day, hours, minutes, seconds);
        var timestamp = Math.floor(date.getTime() / 1000);

        return timestamp;
    }
}
class Note {
    constructor(u = null, dict = null, anki = null) {
        this.dic = u
        this.aDict = dict
        this.anki = anki
    }

    async addAnki(dic, kanji = '', kana = '', o = {}, q = 1, i = 0) {
        try {
            const req = [
                {
                    type: 'clipboardImage'
                },
                {
                    type: 'textFurigana',
                    text: `${kana}${kanji}Words — ${q} found`,
                    readingMode: null
                },
                {
                    type: 'screenshot'
                },
                {
                    type: 'audio'
                },
                {
                    type: 'clipboardText'
                }
            ]

            const mode = 'term-kanji'

            if (nv('log')) console.log(mode, req, dic, q) // Output: "term-kanji"
            // Call the addAnkiNote function
            await aDict.anki._addAnkiNote(dic[i], mode, q, req, o)
        } catch (error) {
            console.error(error)
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
                word,
                sentence,
                definition,
                frequencies,
                frequencyMedian,
                tags,
                url: document.URL,
                clipboard: clip,
                audio,
                html,
                image,
                timestamp,
                time,
                status,
                flagNumber,
                id,
                definitions,
                reading,
                sentenceReading,
                hint,
                pitch,
                extra,
                pitchPos,
                dicts,
                otherSentences,
                type,
                learning,
                known,
                size,
                wordLength,
                occurrences,
                chars,
                alternatives,
                synonyms,
                antonyms,
                urlLoc,
                day,
                options,
                seen,
                temp,
                isAnki,
                hasSAudio,
                hasWAudio,
                hasImages,
                moe,
                comment,
                prev,
                clips,
                info,
                notes,
                anki,
                ankiId
            }

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
            }
            if (nv('log')) console.log(result, ' Added values:', obj)
            try {
                // Send a POST request to the API endpoint
                const response = await fetch('http://localhost:3000/api/word', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(result)
                })
                if (nv('warn')) console.warn('PostgresSQL DB ', response)
                if (response.ok) {
                    // Word added successfully
                    const wordObject = await response.json()
                    if (nv('log')) console.log('Word created:', wordObject)
                } else {
                    // Error adding word
                    console.error('Failed to create word:', response.status)
                }
            } catch (serr) {
                console.error(serr)
            }
            return obj
        } catch (error) {
            console.error('An error occurred:', error)
            return {}
        }
    }

    async getFileContents() {
        try {
            const response = await fetch('save.json')
            const contents = await response.json()
            return contents
        } catch (error) {
            console.error('An error occurred:', error)
            return null
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
                            'application/json': ['.json']
                        }
                    }
                ]
            }
            const fileHandle = await window.showSaveFilePicker(opts)
            console.dir(fileHandle)
            if (nv('warn')) console.warn(fileHandle)
            const writable = await fileHandle.createWritable()
            if (nv('warn')) console.warn(writable)
            await writable.write('write', jsonData)
            await writable.close()
        } catch (error) {
            console.error('An error occurred:', error)
        }
    }

    async saveAdd(cx = 0, t, txt, def = '', fq = [], tags = [], html = '', moe = false, audio = [], image = [], clip = '', yc = false, read = '') {
        try {
            const log = {
                dict: this.dic,
                t,
                txt,
                def,
                fq,
                tags,
                html,
                moe,
                audio,
                image,
                clip,
                yc,
                read,
                cx,
                noteEnv: this
            }
            console.dir(log)
        } catch (ler) {
            console.error(ler)
        }
        try {
            const note = aNote
            const noteMod = Object.create(Note.prototype, { dict: this })
            const storedDay = parseInt(localStorage.getItem('day'))
            const day = Dict.prototype.int('day') ?? -1 //isNaN(storedDay) ? 0 : storedDay
            const unixSeconds = Math.floor(Date.now() / 1000); // Current Unix timestamp
            //const date = new Date(unixSeconds * 1000).getDate();
            localStorage.setItem('unix', unixSeconds)
            const d = new Date()
            const currentDate = d.getDate()
            const flag = currentDate !== day ? 1 : 0
            localStorage.setItem('day', currentDate)
            let iCur = parseInt(localStorage.getItem('cur'))
            iCur += 1
            const existingContents = localStorage.getItem('save')// await note.getFileContents();
            if (nv('warn')) console.warn([t, txt, def, fq, tags, html, moe, audio, image, clip])
            let save
            try {
                if (nv('warn')) console.warn(existingContents)
                save = JSON.parse(existingContents)
            } catch {
                save = null
                localStorage.setItem('savebk', existingContents)
                localStorage.setItem('save', '')
            }
            // Nullish Coalescing Operator (??)
            // This operator returns the first operand if it is not null or undefined.
            // Otherwise, it returns the second operand.
            const s = save ?? { data: [] }
            // Optional Chaining Operator (?.)
            // This operator allows you to read the value of a property located deep within a chain of connected objects
            // without having to check that each reference in the chain is valid.
            //   let result = note?.get();
            // Optional Chaining Operator (?.)
            // Here it is used to access the 'data' property of 's'. If 's' is null or undefined, 'data1' will be undefined.
            const data = s?.data
            // Ternary Operator (?:)
            // This operator takes three operands: a condition followed by a question mark (?),
            // then an expression to execute if the condition is truthy followed by a colon (:),
            // and finally the expression to execute if the condition is falsy.
            // let data2 = s.text ?? ''; //let data2 = s.text ? s.text : '';

            let word = localStorage.getItem('words').replace(/(\d{1,2}-\d{1,2}-\d{4}-\d{1,2}:\d{1,2}: )|(\w{3} \w{3} \d{2} \d{4} \d{2}:\d{2}:\d{2} \w{3}-\d{4} \(\w{3}\))/g, '')
            // note.setFileContents({ day: date.toString(), lastAccess: d, words: t, sentences: txt, html: html });
            if (save) {
                for (let i = 0; i < save.length; i++) {
                    if (save[i]/* .word */ === t) {
                        break
                    }
                }
            }
            let ww
            let w2
            if (cx == 0) {
                ww = word.split(' ')
            }
            let isStringInSet = ww.includes(t)

            const saveDiv = document.querySelector('.save')
            if (nv('warn')) console.warn(cx, isStringInSet, ww, w2, t)
            if (cx == -1) return
            if ((isStringInSet && cx >= 0)) {
                const bsWithoutString = ww.filter(function (element) {
                    return element !== t
                })
                ww = bsWithoutString
                ww.push(t)
                if (cx == 0) {
                    localStorage.setItem('words', ww.join(' '))
                }
                note.svDiv(saveDiv, ww.join(' '), flag)
                return isStringInSet
            } else if (cx < -1) {
                let b = localStorage.getItem('exp') ?? ''
                b = b.split(' ')
                isStringInSet = b.includes(t)
                if (isStringInSet) {
                    if (nv('log')) console.log('In');
                } else {
                    b.push(t)
                    localStorage.setItem('exp', b.join(' '))
                }
            } else if (!isStringInSet) {
                let fm = fq.reduce((a, b) => a + b, 0)
                fm /= fq.length
                const ws = word ? word.split(' ') : []
                ws.push(t)
                const filteredArray = [...new Set(ws)]
                word = filteredArray
                //if(flag == 1){
                //word[word.length-1] = `\n ${word[word.length-1]}`
                //}
                word = word.join(' ')
                localStorage.setItem('words', word)
                let so = {
                    st: txt
                }
                const options = aDict._display.getOptionsContext()
                const results = await aDict._display._findDictionaryEntries(false, t, false, options)
                if (nv('warn')) console.warn(options, yc, read, results, fq, fq.length)
            let ain
                try{
            ain = await aIn(t, this.aDict.jpws)
                wn(ain,t)
            } catch(zx){
                console.error(zx);
            }
                if(!ain){
                    note.addAnki(results, t, read, so, results.length)
                }
                if (fq.length == 0) {
                    let sum = 0;
                    const frequencies = results[0].frequencies;
                    frequencies.forEach((item) => {
                        //sum += item.frequencyValue;
                        if (nv('log')) console.log(item);
                        fq.push(item.frequency)
                    });
                }
                fq = fq.join(' ')
                let oc = {
                    word: t,
                    reading: read,
                    sentence: txt,
                    definition: def,
                    frequency: fq,
                    clipboard: clip?.substring(0, 5) === txt.substring(0, 5) ? '' : clip?.substring(0, 80),
                    status: 1,
                    time: d.toLocaleString('pt-BR').replace(',', ''),
                    params: `Yc:${yc} Cx:${cx} Flag:${flag}`
                }
                try {
                    let sv = localStorage.getItem('save') ?? ''
                    let sj = JSON.parse(sv)
                    let o = {
                        ...sj,
                        [unixSeconds]: oc
                    }
                    if (nv('warn')) console.warn(word, o)
                    localStorage.setItem('save', JSON.stringify(o));
                } catch (se) {
                    console.error(se);
                }
            } else {
                if (nv('warn')) console.warn(`${t} already exists`)
            }
            note.svDiv(saveDiv, word, flag)
        } catch (e) {
            console.error(e)
        }
    }

    svDiv(saveDiv, sz = null, _flag = '', m = false) {
        if (!sz) {
            sz = localStorage.getItem('words') ?? ''
        }
        if (!m) {
            sz = merge(sz.split(' '))
        }
        saveDiv.innerHTML = `${localStorage.getItem('navsave')}: ${localStorage.getItem('navsentence')}`
        const s3 = saveDiv.appendChild(document.createElement('div'))
        s3.className = 'w'
        if (saveDiv) {
            let wordsOnly = sz // .replace(/(\d{1,2}-\d{1,2}-\d{4}-\d{1,2}:\d{1,2}: )|(\w{3} \w{3} \d{2} \d{4} \d{2}:\d{2}:\d{2} \w{3}-\d{4} \(\w{3}\))/g, '');
            wordsOnly = wordsOnly.split(' ')
            wordsOnly = wordsOnly.slice(wordsOnly.length - 32).join(' ')
            s3.innerHTML = wordsOnly
        } else {
            console.error("Could not find element with class 'save'.")
        }
    }


    async svClk(elem, cx = 0, tw = '', tx = '', _yc = null, clip = '', img = [], snd = []) {
        const fq = []
        let df = ''
        const ht = elem?.innerHTML
        const tag = ['aDict', `v0.1-${new Date().toISOString().slice(0, 7)}`]
        if (nv('log')) console.log(elem, tag.join(', '))
        if (cx < 0) {
            img = this.dic.main.txtImg(true)
            await new Promise((r) => setTimeout(r, 3000))
        }
        try {
            Dict.prototype.cache(elem, cx)
            //if (img == []) {            }
            if (clip == '') {
                clip = this.dic.main.getText()
            }
            console.dir([img, clip])
        } catch (ser) {
            console.error(ser)
        }
        let kj = elem.querySelector('.yomi')// ? document.querySelector("span.kj") :
        df = kj ? elem.querySelector('.yomi .entry-body ul:nth-child(1) > li') : elem.querySelector('.gloss-desc')
        if (df) {
            df = df.innerText
        }
        const I = parseInt(elem.getAttribute('ind'))
        let rd = document.querySelector(`[i="${I}"] .reading`)
        if (rd) {
            rd = rd.innerText
        }
        if (!kj) {
            rd = elem.querySelector('.rd').innerText
            rd = this.aDict.japaneseUtil.convertToKana(rd)
        }
        let fv = document.querySelectorAll('.fav')
        if (nv('warn')) console.warn(fv, rd)
        if (fv.length > 0) {
            for (let f of fv) {
                f.style.height = aDict.width
                f.style.flex = aDict.height
                f.style.setProperty('--cc', 'blue')
            }
        }
        elem.classList.add('fav')
        const note = aNote //new Note(this.dic) // Create an instance of the Note class
        if (isNaN(cx)) {
            cx = 0
        }
        const xt = elem.parentElement.getAttribute('txt')
        let st = xt?.substring(0, 80)
        if (cx <= 0) {
            const k = elem.querySelector('.kj')
            if (nv('warn')) console.warn(k.innerHTML) // console.dir(kj)
            if (nv('warn')) console.warn(kj, I, df, rd)
            if (kj == null) {
                kj = !!elem.querySelector('.entry-body')
            }
            if (kj) {
                try {
                    // elem.style.fontSize = '1.2em'
                    const fs = elem.querySelectorAll('.frequency-value')
                    for (const f of fs) {
                        fq.push(parseInt(f.innerText))
                    }
                } catch { }
                df = elem.querySelector('li').innerText
                rd = elem.querySelector('rt').innerText
                // let cpn = document.createElement('div')
                let en = elem.querySelector('.headword-text-container').cloneNode(true)
                // en = y.cloneNode()
                // en.querySelector('rt').remove()
                // cpn.appendChild(en)
                // cpn.querySelector('rt').remove()
                for (const r of en.querySelectorAll('rt')) {
                    r.remove()
                }

                en.querySelector('.headword-reading').remove()
                const rs = en.querySelectorAll('rt')
                for (const rr of rs) {
                    rr.remove()
                }
                try {
                    en.querySelector('rt').remove(); en.querySelector('rt').remove(); en.querySelector('rt').remove(); en.querySelector('rt').remove(); en.querySelector('rt').remove(); en.querySelector('rt').remove(); en.querySelector('rt').remove()
                } catch { }
                if (nv('warn')) console.warn(en.innerHTML)
                en = en.innerText || en.textContent
                if (nv('log')) console.log(en)
                const wn = en // ?? elem.getAttribute('w')
                // rd = elem.querySelector('rt')
                // en = cpn.innerText
                //
                // async saveAdd(t, txt, def = '', fq = [], tags = [], html = '', moe = false, audio = [], image = [], clip = '', yc = null) {
                await note.saveAdd(cx, wn, st, df, fq, tag, ht, false, snd, img, clip, true, rd)// localStorage.setItem('save', `${save} ${en}`)
            } else {
                //try { //df += elem.querySelector('dt').innerText } finally {
                await note.saveAdd(cx, k.innerText, st, df, undefined, tag, ht, true, snd, img, clip, true, rd) // localStorage.setItem('save', `${save} ${k.innerHTML}`)
            }
        } else {
            try {
                df += elem.querySelector('dt').innerText
            } catch { }
            await note.saveAdd(cx, tw, st, df, undefined, tag, ht, true, snd, img, clip, undefined, rd)
        }
    }

    displayObjectInHTML(obj, bo) {
        // Create a container element
        const container = document.createElement('div')
        container.className = 'saved' // Add the 'savd' class for styling (assuming it's defined in your CSS)
        // Iterate over the object properties
        for (const [key, value] of Object.entries(obj)) {
            // Create an item element for each property
            const item = document.createElement('div')
            item.className = 'item' // Add a class for styling (assuming it's defined in your CSS)

            // Create a title element for the property key
            const title = document.createElement('h3')
            title.textContent = key
            item.appendChild(title)

            if (typeof value === 'object' && value !== null) {
                const nestedContainer = document.createElement('div')
                nestedContainer.innerHTML = value[0]
                item.appendChild(nestedContainer)
            } else {
                const content = document.createElement('p')
                content.textContent = value
                item.appendChild(content)
            }

            // Append the item to the container
            container.appendChild(item)
        }

        // Append the container to the document body
        bo.appendChild(container)
    }
    delete(type, value, comparison) {
        try {
            var a = localStorage.getItem("save");
            var oc
            try {
                oc = JSON.parse(a)
            } catch {
                return null
            }
            // Validate input
            if (!type || !value) {
                throw new Error('Missing required parameters: type and value');
            }
            for (const key in oc) {
                if (Object.prototype.hasOwnProperty.call(oc, key)) {
                    const item = oc[key];
                    let shouldDelete = false;
                    switch (type) {
                        case 'timestamp':
                            shouldDelete = (item.time === value);
                            break;
                        case 'word':
                            shouldDelete = (item.word === value);
                            break;
                        case 'reading':
                            shouldDelete = (item.reading === value);
                            break;
                        case 'definition':
                            shouldDelete = (item.definition.includes(value));
                            break;
                        case 'frequency':
                            shouldDelete = applyComparison(item.frequency, comparison, value);
                            break;
                        case 'status':
                            shouldDelete = applyComparison(item.status, comparison, value);
                            break;
                        case 'param':
                            shouldDelete = (item.params.includes(value));
                            break;
                        case 'key':
                            shouldDelete = applyComparison(key, comparison, value);
                            break;
                        default:
                            throw new Error('Invalid criteria type: ' + type);
                    }
                    if (shouldDelete) {
                        delete oc[key];
                    }
                }
            }
            localStorage.setItem('save', JSON.stringify(oc));
        } catch (error) {
            console.error(error);
        }
    }
    get(a = true){
        if(a){
            return this.find('','word','')
        } else {
            return this.find()
        }
    }
    find(query = '', prop = 'word', comparison = '=', oc = null) {
        try {
          if (!oc) {
            try {
              var a = localStorage.getItem("save");
              oc = JSON.parse(a);
            } catch {
              return null;
            }
          }
          var result = [];
      
          for (var index in oc) {
            if (Object.prototype.hasOwnProperty.call(oc, index)) {
              var item = oc[index];
              var match = false;
      
              if (comparison === '') {
                // Return array of item[prop]
                if (prop in item) {
                  result.push(item[prop]);
                }
              } else if (query === '') {
                // Return all objects
                result.push(item);
              } else if (prop === 'key') {
                // Query by index (key) comparison
                if (applyComparison(index, comparison, query)) {
                  match = true;
                }
              } else if (prop in item) {
                var value = item[prop];
      
                if (typeof value === 'number' && typeof query === 'number') {
                  // Number comparison
                  if (applyComparison(value, comparison, query)) {
                    match = true;
                  }
                } else if (comparison === 'search' && typeof value === 'string' && typeof query === 'string') {
                  // String search
                  if (value.includes(query)) {
                    match = true;
                  }
                } else if (value === query) {
                  // Exact match
                  match = true;
                }
              }
      
              if (match) {
                result.push(item);
              }
            }
          }
          if (result.length === 0) {
            return null; // No matching objects found
          } else if (result.length === 1) {
            return result[0]; // Return single matching object
          } else {
            return result; // Return array of matching objects
          }
        } catch (error) {
          console.error('An error occurred:', error.message);
          return null;
        }
      }
      getKey(w) {
        try {
            var a = localStorage.getItem("save");
            var oc = JSON.parse(a);
            for (var prop in oc) {
                if (Object.prototype.hasOwnProperty.call(oc, prop) && oc[prop].word === w) {
                    return oc[prop];
                }
            }
            return null; // Word not found
        } catch (error) {
            console.error('An error occurred:', error.message);
            return null;
        }
    }
    move(k, pos = -1) {
        try {
            var a = localStorage.getItem("save");
            var oc
            try {
                oc = JSON.parse(a)
            } catch {
                return null
            }
            if (pos == -1) {
                this.moveEnd(oc, k)
            } else {
                this.movePos(oc, k, pos)
            }
            localStorage.setItem('save', JSON.stringify(oc));
        } catch (error) {
            console.error(error);
        }
    }
    moveEnd(obj, key) {
        try {
            if (typeof obj !== 'object' || obj === null) {
                throw new Error('Invalid object. Expected an object.');
            }

            if (!Object.prototype.hasOwnProperty.call(obj, key)) {
                throw new Error('The provided key does not exist in the object.');
            }

            const keys = Object.keys(obj);
            const currentIndex = keys.indexOf(key);

            if (currentIndex === -1) {
                throw new Error('The provided key does not exist in the object.');
            }

            if (currentIndex === keys.length - 1) {
                // Key is already in the last position
                return obj;
            }

            const newKeys = [
                ...keys.slice(0, currentIndex),
                ...keys.slice(currentIndex + 1),
                key
            ];

            const result = {};

            newKeys.forEach((k) => {
                result[k] = obj[k];
            });

            return result;
        } catch (error) {
            // Handle the error here
            console.error('An error occurred:', error.message);
            // You can choose to re-throw the error or return a default value, if desired
            throw error;
        }
    }
    movePos(obj, key, newPosition) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) {
            throw new Error('The provided key does not exist in the object.');
        }

        const keys = Object.keys(obj);

        if (newPosition < 0 || newPosition >= keys.length) {
            throw new Error('Invalid new position.');
        }

        const currentIndex = keys.indexOf(key);

        if (currentIndex === newPosition) {
            // Key is already at the desired position
            return obj;
        }

        const newKeys = [
            ...keys.slice(0, currentIndex),
            ...keys.slice(currentIndex + 1, newPosition + 1),
            key,
            ...keys.slice(newPosition + 1)
        ];

        const result = {};

        newKeys.forEach((k) => {
            result[k] = obj[k];
        });

        return result;
    }
}