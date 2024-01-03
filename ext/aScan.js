
if (!document.URL.includes("-extension")) {
    console.log("aScan")
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
    console.log("Elements with text:", elementsWithText);
}