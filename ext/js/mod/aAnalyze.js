/* globals aDict lg wn */
const API_URL = 'http://localhost:5000'; // Replace with your API URL

const analyzeText = async (text, mode = 'A', nominalForm = false, printFields = false) => {
    const url = `${API_URL}/analyze`;
    const payload = {
        text,
        mode,
        nominal_form: nominalForm,
        print_fields: printFields,
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error('An error occurred while analyzing the text.');
    }

    const data = await response.json();
    return data;
};

const analyzeFurigana = async (text, mode = 'A') => {
    const url = `${API_URL}/furigana`;
    const payload = {
        text,
        mode,
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error('An error occurred while analyzing the furigana.');
    }

    const data = await response.json();
    return data;
};

const analyzeRomaji = async (text, mode = 'A') => {
    const url = `${API_URL}/romaji`;
    const payload = {
        text,
        mode,
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error('An error occurred while analyzing the romaji.');
    }

    const data = await response.json();
    return data;
};

const analyzeGrammar = async (text, mode = 'A') => {
    const url = `${API_URL}/grammar`;
    const payload = {
        text,
        mode,
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error('An error occurred while analyzing the grammar.');
    }

    const data = await response.json();
    return data;
};

const analyzeFrequency = async (text, mode = 'A') => {
    const url = `${API_URL}/frequency`;
    const payload = {
        text,
        mode,
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error('An error occurred while analyzing the frequency.');
    }

    const data = await response.json();
    return data;
};
class Analyze {
    constructor(dic, t) {
        this.dic = aDict ?? dic
        this.t = t
        this.txt = document.createElement('textarea')
        this.txt.placeholder = 'Text to Analyze'
        this.txt.addEventListener('change', this.run.bind(this), false)
        t.appendChild(this.txt)
        this.tc = this.t.appendChild(document.createElement('div'))
    }
    async run(e = null, ta = null) {
        let txt = this.txt
        let t
        if (e) {
            e.stopPropagation();
            //txt = e.target
            t = e.target.value
        }
        lg(txt, t);
        try {
            //document.querySelector('.content-body-inner').remove()
        } catch { }
        //this.del(this.t)
        // Regular expression pattern to match Japanese katakana, hiragana, or kanji
        const regex = /[^\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/gu;
        try {
            t = t.replace(regex, '')
            let tokens
            if (!ta) {
                tokens = await analyzeGrammar(t);
            } else {
                tokens = ta
            }
            var fq = {}
            console.l(tokens);
            tokens = [...new Set(tokens)]
            for (let i in tokens) {
                let t = tokens[i]
                let f1 = await aDict.frequency(t, aDict.cc) ?? 0
                let f2 = await aDict.frequency(t) ?? 0
                let f
                if (f2 > 0 && f2 > 0) {
                    f = Math.round((f1 + f2) / 2)
                } else {
                    f = f1 > 0 ? f1 : f2
                }
                wn(i, t)
                fq[t] = f;
            }
            let res = this.sort(fq)
            wn(fq, res)
            let ft = ''
            for (let fs of res) {
                let t = fs[0]
                let f = fs[1]
                ft += t + ' '
                this.tc.innerHTML += ` ${t}: ${f} `
            }
            aDict.delete()
            await aDict.update(ft)
            aDict.pos = 0
        } catch (error) {
            console.error(error);
        }
    }
    sort(obj) {
        const entries = Object.entries(obj);

        entries.sort((a, b) => a[1] - b[1]);

        return entries;
    }
    del(txt) {
        try {
            var elementsToDelete = Array.from(txt.parentElement.children);

            // Iterate over the elements and delete them
            elementsToDelete.forEach(function (element) {
                if (element.tagName !== 'SCRIPT' && element !== txt && !element.contains(txt)) {
                    element.parentNode.removeChild(element);
                }
            });
        } catch (error) {
            console.error(error);
        }
    }
    test(text, mode = 'A') {
        analyzeText(text, mode, true, false)
            .then(data => {
                wn('Text analysis:', data);
            })
            .catch(error => {
                console.error(error);
            });

        analyzeFurigana(text, mode)
            .then(data => {
                wn('Furigana analysis:', data);
            })
            .catch(error => {
                console.error(error);
            });

        analyzeRomaji(text, mode)
            .then(data => {
                wn('Romaji analysis:', data);
            })
            .catch(error => {
                console.error(error);
            });

        analyzeGrammar(text, mode)
            .then(data => {
                wn('Grammar analysis:', data);
            })
            .catch(error => {
                console.error(error);
            });

        analyzeFrequency(text, mode)
            .then(data => {
                wn('Frequency analysis:', data);
            })
            .catch(error => {
                console.error(error);
            });
    }
}