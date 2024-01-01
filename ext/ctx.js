function fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        var successful = document.execCommand('copy');
        var msg = successful ? 'successful' : 'unsuccessful';
        console.log('Fallback: Copying text command was ' + msg);
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }

    document.body.removeChild(textArea);
}
function copyTextToClipboard(text) {
    if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(text);
        return;
    }
    navigator.clipboard.writeText(text).then(function () {
        console.log('Async: Copying to clipboard was successful!');
    }, function (err) {
        console.error('Async: Could not copy text: ', err);
    });
}
var cp = function (text) {
    const parent = document.body;
    if (parent === null) { return; }

    let textarea = null;
    if (textarea === null) {
        textarea = document.createElement('textarea');
        this._copyTextarea = textarea;
    }

    textarea.value = text;
    parent.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    parent.removeChild(textarea);
}
let searchUrbanDict = function (word) {
    var query = word;
    cp(word)
    chrome.tabs.create({ url: "http://www.urbandictionary.com/define.php?term=" + query });
};
let search = function (word) {
    var query = word;
    cp(word)
    //copyTextToClipboard(query)
    //document.execCommand('copy')
};
let searchJ = function (word) {
    var query = word;
    cp(word)
    let prp = { url: "http://www.jisho.org/search/" + query }
    chrome.tabs.create(prp)
};
let searchW = function (word) {
    var query = word;
    cp(word)
    //console.log(999999999999999)
    chrome.tabs.create({ url: "https://en.wiktionary.org/w/index.php?go=Go&search=" + query });
    //chrome.tabs.create({ url: "https://en.wiktionary.org/w/index.php?go=Go&search=" + query });
};
let searchKD = function (word) {
    var query = word;
    cp(word)
    chrome.tabs.create({ url: "https://www.kanjidamage.com/kanji/search?q=" + query });
};
let searchJP = function (word) {
    var query = word;
    cp(word)
    chrome.tabs.create({ url: "https://www.kanjipedia.jp/search?kt=1&sk=leftHand&k=" + query });
};
let searchM = function (word) {
    var query = word;
    cp(word)
    chrome.tabs.create({ url: "https://ichi.moe/cl/qr/?r=htr&q=" + query });
};
let searchY = function (word) {
    var query = word;
    cp(word)
    chrome.tabs.create({ url: "https://www.youtube.com/results?search_query=" + query });
};
let searchDL = function (word) {
    var query = word;
    cp(word)
    chrome.tabs.create({ url: "https://www.deepl.com/translator#ja/en/" + query });
};
let searchG = function (word) {
    var query = word;
    cp(word)
    chrome.tabs.create({ url: "https://github.com/search?type=repositories&q=" + query });
};
let searchR = function (word) {
    var query = word;
    cp(word)
    chrome.tabs.create({ url: "https://old.reddit.com/search?q=" + query });
};
let searchT = function (word) {
    var query = word;
    cp(word)
    chrome.tabs.create({ url: "https://twitter.com/search?src=typed_query&q=" + query });
};
let searchWw = function (word) {
    var query = word;
    cp(word)
    chrome.tabs.create({ url: "https://en.wikipedia.org/wiki/Special:Search?go=Go&search=" + query });
};
let searchYu = function (word) {
    var query = word;
    cp(word)
    chrome.tabs.create({ url: "https://gogen-yurai.jp/?s=" + query });
};
console.dir(chrome)
try {
    chrome.contextMenus.removeAll()
} catch { }
chrome.contextMenus.create({
    id: 'yomu001',
    title: "Search",
    contexts: ["selection"]  // ContextType
});
//sr.onClicked.addListener(search);
chrome.contextMenus.create({
    id: 'yomu002',
    title: "Search in Jisho",
    contexts: ["selection"]  // ContextType
});
//sj.onClicked.addListener(searchJ);
chrome.contextMenus.create({
    id: 'yomu003',
    title: "Search in Wiktionary",
    contexts: ["selection"]  // ContextType
});
//chrome.contextMenus.onClicked.addListener(searchW);
chrome.contextMenus.create({
    id: 'yomu004',
    title: "Search in KanjiDamage",
    contexts: ["selection"]  // ContextType
});
//chrome.contextMenus.onClicked.addListener(searchKD);
chrome.contextMenus.create({
    id: 'yomu005',
    title: "Search in Moe",
    contexts: ["selection"]  // ContextType
});
//chrome.contextMenus.onClicked.addListener(searchM);
chrome.contextMenus.create({
    id: 'yomu006',
    title: "Search in Kanjipedia (JP)",
    contexts: ["selection"]  // ContextType
});
//chrome.contextMenus.onClicked.addListener(searchJP);
chrome.contextMenus.create({
    id: 'yomu007',
    title: "Search in UrbanDictionary",
    contexts: ["selection"]  // ContextType
});
chrome.contextMenus.create({
    id: 'yomu008',
    title: "Search in YouTube",
    contexts: ["selection"]  // ContextType
});
chrome.contextMenus.create({
    id: 'yomu009',
    title: "Translate in DeepL",
    contexts: ["selection"]  // ContextType
});
chrome.contextMenus.create({
    id: 'yomu010',
    title: "Search in Github",
    contexts: ["selection"]  // ContextType
});
chrome.contextMenus.create({
    id: 'yomu011',
    title: "Search in Reddit",
    contexts: ["selection"]  // ContextType
});
chrome.contextMenus.create({
    id: 'yomu012',
    title: "Search in Twitter",
    contexts: ["selection"]  // ContextType
});
chrome.contextMenus.create({
    id: 'yomu013',
    title: "Search in Yurei (JP)",
    contexts: ["selection"]  // ContextType
});
chrome.contextMenus.create({
    id: 'yomu000',
    title: "Search in Wikipedia",
    contexts: ["selection"]  // ContextType
});
var tb = true
var tbs = 0
var ctx = function (info, tab) {
    //console.dir(info)
    //event//.preventDefault()
    if (tab) {
        chrome.contextMenus.onClicked.removeListener(ctx)
        let sl = info.selectionText
        let n = parseInt(info.menuItemId.substring(4))
        //tbs += 1
        //let tb = true
        console.log(`Item ${n} ${tbs} ${sl} ${info.menuItemId} clicked in tab ${this}`);
        if (true) {
            //info.stopImmediatePropagation();
            switch (n) {
                case 0:
                    searchWw(sl)
                    break;
                case 1:
                    search(sl)
                    break;
                case 2:
                    searchJ(sl)
                    //console.log(j)
                    break;
                case 3:
                    searchW(sl)
                    break;
                case 4:
                    searchKD(sl)
                    break;
                case 5:
                    searchM(sl)
                    break;
                case 6:
                    searchJP(sl)
                    break;
                case 8:
                    searchY(sl)
                    break;
                case 9:
                    searchDL(sl)
                    break;
                case 10:
                    searchG(sl)
                    break;
                case 11:
                    searchR(sl)
                    break;
                case 12:
                    searchT(sl)
                    break;
                case 13:
                    searchYu(sl)
                    break;
                case 7:
                    searchUrbanDict(sl)
                    break;
                default:
                    searchY(sl)
                    break;
            }
        }
    }
}
chrome.contextMenus.onClicked.addListener(ctx.bind(this));

/*function convertSecondsToSrtFormat(seconds) {
    const date = new Date(seconds * 1000);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    seconds = date.getUTCSeconds().toString().padStart(2, '0');
    const milliseconds = date.getUTCMilliseconds().toString().padStart(3, '0');
  
    return `${hours}:${minutes}:${seconds},${milliseconds}`;
  }
function convertToSrt(data) {
    let srtContent = '';

    data.forEach((obj, index) => {
        const startTime = parseInt(obj.video_offset);
        const endTime = index < data.length - 1 ? parseInt(data[index + 1].video_offset) : startTime + 15; 
        console.warn(startTime,endTime);
        const formattedStartTime = convertSecondsToSrtFormat(startTime);
        const formattedEndTime = convertSecondsToSrtFormat(endTime);
        const message = obj.message;

        srtContent += `${index + 1}\n${formattedStartTime} --> ${formattedEndTime}\n${message}\n\n`;
    });

    return srtContent;
}
function downloadSrtFile(srtContent, filename) {
    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
var dt = null
let get = async() => {
    let url = document.URL
    if (url.includes('holodex.net/watch')) {
        var segments = url.split("/");
        var lastSegment = segments[segments.length - 1];
        let dest = ''
        var requestDetails = {
            method: 'GET',
            url: `https://holodex.net/api/v2/videos/${lastSegment}/chats?lang=en&verified=true&moderator=true&vtuber=true&limit=100000`,
        };
        console.log(lastSegment, requestDetails);
        try {
            let response = await fetch(requestDetails.url, {
                method: 'GET'
            })
            let j = await response.json();
            return j
            /*.then(response => {
                if (response.ok) {
                    // The request was successful (status code 200-299)
                    return response.json();
                } else {
                    // The request was not successful
                    throw new Error('Request failed with status code ' + response.status);
                }
            })
                .then(data => {
                    // Handle the response data
                    console.log(data);
                    dt = data
                })
                .catch(error => {
                    // Handle any errors that occurred during the request
                    console.error(error);
                });*/
//return f
/*    } catch (err) {
        console.error(err);
    }
}
}
get().then(o => {
console.warn(o);
let sub = convertToSrt(o)
console.log(sub);
let tit = document.title
downloadSrtFile(sub,`${tit}.srt`)
//copy(sub)
})
chrome.tabs.onActivated.addListener((activeInfo) => {
try {
    chrome.tabs.query({ 'active': true, 'lastFocusedWindow': true, 'currentWindow': true }, function (tabs) {
        // since only one tab should be active and in the current window at once
        // the return variable should only have one entry
        //var activeTabId = activeTab.id; // or do whatever you need
        var currentTab = tabs[0];
        console.dir(currentTab)
        if (currentTab) {
            var siteUrl = currentTab.url;
            console.log(siteUrl);
            url = siteUrl
            if (url.includes('holodex.net/watch')) {
                var segments = url.split("/");
                var lastSegment = segments[segments.length - 1];
                let dest = ''
                var requestDetails = {
                    method: 'GET',
                    url: `https://holodex.net/api/v2/videos/${lastSegment}/chats?lang=en&verified=true&moderator=true&vtuber=true&limit=100000`,
                };
                console.log(lastSegment, requestDetails);
                fetch(`https://holodex.net/api/v2/videos/${lastSegment}/chats?lang=en&verified=true&moderator=true&vtuber=true&limit=20`, {
                    "headers": {
                        "accept": "application/json, text/plain, *
/*                        "accept-language": "ja,en;q=0.9,en-US;q=0.8",
                        "if-none-match": "W/\"1073-AD4NjCFOaKm1/OSnkiuygFXNRuc\"",
                        "sec-ch-ua": "\"Chromium\";v=\"118\", \"Google Chrome\";v=\"118\", \"Not=A?Brand\";v=\"99\"",
                        "sec-ch-ua-mobile": "?0",
                        "sec-ch-ua-platform": "\"Windows\"",
                        "sec-fetch-dest": "empty",
                        "sec-fetch-mode": "cors",
                        "sec-fetch-site": "same-origin"
                    },
                    "referrer": url,
                    "referrerPolicy": "strict-origin-when-cross-origin",
                    "body": null,
                    "method": "GET",
                    "mode": "cors",
                    "credentials": "omit"
                }).then(response => {
                    if (response.ok) {
                        // The request was successful (status code 200-299)
                        return response.json();
                    } else {
                        // The request was not successful
                        throw new Error('Request failed with status code ' + response.status);
                    }
                })
                    .then(data => {
                        // Handle the response data
                        console.log(data);
                    })
                    .catch(error => {
                        // Handle any errors that occurred during the request
                        console.error(error);
                    });
            }
        }
    })
} catch (err) {
    console.error(err);
}
})*/
var jpdb;
chrome.commands.onCommand.addListener(function (command) {
  if (command === "scan_elements") {
    const filePath = chrome.extension.getURL("jpdb.json");
    console.warn(filePath)
    fetch(filePath)
      .then(response => response.json())
      .then(jsonData => {
        jpdb = jsonData;
        console.log('Jpdb ---', jsonData, jpdb);
        chrome.tabs.executeScript({
          code: `
          console.log("aScan")
          var jpdb = JSON.parse('" + encodeToPassToContentScript(${jpdb}) + "');
          console.log(jpdb)
function frequency(word) {
    const entry = jpdb.find(entry => entry[0] === word || entry[2].reading === word);
    return entry ? entry[2]?.frequency?.value : -1;
}

function reading(word) {
    const entry = jpdb.find(entry => entry[0] === word);
    return entry ? entry[2].reading : null;
}

var elementsWithText = [];
var elements = document.querySelectorAll("*");
for (var i = 0; i < elements.length; i++) {
    try {
        var element = elements[i];
        if (element.innerText.trim().length > 0) {
            var text = element.innerText;
            var words = text.split(" ");
            var newContent = "";
            for (var j = 0; j < words.length; j++) {
                try {
                    var word = words[j];
                    var furigana = reading(word);
                    if (furigana) {
                        newContent += "<ruby>" + word + "<rt>" + furigana + "</rt></ruby> ";
                    } else {
                        continue //newContent += word + " ";
                    }
                } catch (err) {
                    console.error(err)
                }
            }
            element.innerHTML = newContent.trim();
            elementsWithText.push(element);
        }
    } catch (error) {
        console.error(error)
    }
}
console.log("Elements with text:", elementsWithText);`
        }   );
      })
      .catch(error => {
        console.error("Error fetching JSON:", error);
      });
  }
});
function encodeToPassToContentScript(obj) {
    //Encodes into JSON and quotes \ characters so they will not break
    //  when re-interpreted as a string literal. Failing to do so could
    //  result in the injection of arbitrary code and/or JSON.parse() failing.
    return JSON.stringify(obj).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}
// Function to perform actions when <td> elements are present
function performActions(tabId, frameId) {
    // Display the elements in a fixed popup at the bottom right corner
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.top = '10px';
    popup.style.right = '10px';

    // Get the absolute URL of the local HTML file
    const filePath = chrome.extension.getURL('searchPopup.html');

    // Load the local HTML file into the popup
    fetch(filePath)
        .then(response => response.text())
        .then(html => {
            // Set the HTML content of the popup
            // Add the popup to the document body
            chrome.tabs.executeScript(tabId, {
                code: `
                const popup = document.createElement('div');
                popup.style.position = 'fixed';
                popup.style.top = '10px';
                popup.style.right = '10px';
                document.body.innerHTML = '0000
                popup.innerHTML = ${html};
                console.warn(popup);
                document.body.appendChild(${popup})
            `
            });
        })
        .catch(error => {
            console.error('Failed to load search.html:', error);
        });
        try {
    // Load the code
    const japaneseUtil = new JapaneseUtil(wanakana);
    const display = new Display(tabId, frameId, 'search', japaneseUtil);
    const displayAudio = new DisplayAudio(display);
    displayAudio.prepare();

    const displayAnki = new DisplayAnki(display, displayAudio, japaneseUtil);
    displayAnki.prepare();
    const aDict = new Dict(display, displayAudio, japaneseUtil, displayAnki, null, null, false);
        } catch (e){
            console.error(e)
        }
}
// Function to observe for the presence of <td> elements
function observeForElements(tabId, frameId) {
    // Create a mutation observer to listen for changes in the DOM
    const observer = new MutationObserver(function (mutationsList) {
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                const tdElements = document.querySelectorAll('table > tbody > tr > td');
                console.warn(tdElements.length);
                if (tdElements.length > 0) {
                    // Send a message to the background script indicating the presence of <td> elements
                    chrome.runtime.sendMessage({ action: 'tdElementsExist', tabId: tabId, frameId: frameId });
                    // Disconnect the observer once the elements are found
                    observer.disconnect();
                }
            }
        }
    });

    // Start observing changes in the <body> element
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}
// Create a listener for the webNavigation.onDOMContentLoaded event
chrome.webNavigation.onDOMContentLoaded.addListener(function (details) {
    // Check if the URL matches the desired pattern
    console.warn(details.url, details);
    if (details.url.includes('https://killergerbah.github.io/asbplayer/')) {
        // Inject a content script to check for <td> elements
        performActions(details.tabId, details.frameId)
        chrome.tabs.executeScript(details.tabId, {
            code: `
        // Function to send a message to the background script
        function sendTdElementsMessage() {
          const tdElements = document.querySelectorAll('table > tbody > tr > td');
          console.log(tdElements.length,tdElements)
          if (tdElements.length > 1) {
            // Send a message to the background script indicating the presence of <td> elements
            chrome.runtime.sendMessage({ action: 'tdElementsExist', tabId: ${details.tabId}, frameId: ${details.frameId} });
          } else {
            // If the elements are not found, schedule the function for the next animation frame
            requestAnimationFrame(sendTdElementsMessage);
          }
        }
        
        // Call the function to start observing for <td> elements
        sendTdElementsMessage();
        `
        });
    }
});

// Listen for messages from the content script
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'tdElementsExist') {
        // Perform actions when <td> elements are present
        performActions(message.tabId, message.frameId);
    }
});