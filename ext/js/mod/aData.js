var totalBytes = 5 * 1024 * 1024
function calculateStorageUsage(usedBytes, totalBytes) {
    const totalMib = totalBytes / (1024 * 1024);
    const usedMib = usedBytes / (1024 * 1024);
    const remainingMib = totalMib - usedMib;

    const totalMb = totalBytes / (1000 * 1000);
    const usedMb = usedBytes / (1000 * 1000);
    const remainingMb = totalMb - usedMb;

    return {
        remainingMib,
        usedMib,
        remainingMb,
        usedMb
    };
}
function sortObjectItemsByValue(obj) {
    const entries = Object.entries(obj);

    entries.sort((a, b) => a[1] - b[1]);

    return entries;
}
function getLocalStorageValueSize(key) {
    const value = localStorage.getItem(key);
    if (value === null) {
        return 0; // Value does not exist
    }

    // Convert the value to a JSON string and calculate its byte length
    const jsonValue = JSON.stringify(value);
    const bytes = new Blob([jsonValue]).size;

    return bytes;
}
function localsize() {
    let o = {}
    let valueBytes = 0
    // Usage
    for (let i = 0; i < localStorage.length; i++) {
        try {
            let key = localStorage.key(i);
            const value = localStorage.getItem(key);
            let c = getLocalStorageValueSize(key);
            o[key] = c
            valueBytes += c
        } catch { }
    }
    console.log(`Size of Local Storage value ${valueBytes} bytes, ${o}`);
    let sortedArray = sortObjectItemsByValue(o);
    console.log(sortedArray);
    calculateStorageUsage(valueBytes, totalBytes)
    return sortedArray
}