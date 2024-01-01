s            let iel = false
            let hasReplaced = false;
let replacedText = firstChildText.replaceAll(pattern, (match, _capturedGroup1, i, input) => {
  console.warn(match, i, _capturedGroup1, input);
  
  // Check if the match has already been replaced
  if(this.is.length > 0){
    let ig = this.is[this.is.length-1]
  if (i > lg) {
    console.warn("Skipping duplicate match at index", i);
    return match; // Return the original match
  }
}
  iel = isIndexInsideElement(firstChild, i);
  console.warn(iel, _capturedGroup1, input, i);
  
  if (!iel && !hasReplaced) {
    console.warn(1);
    this.is.push(i); // Save the index of the replaced match
    hasReplaced = true
    return `<span>${replacement}</span>`; // Replace the match
  }
  
  console.warn(2);
  return match; // Return the original match
});

            firstChild.innerHTML = replacedText
