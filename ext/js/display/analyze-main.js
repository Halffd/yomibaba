/*
 * Copyright (C) 2019-2022  Yomichan Authors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/* global
 * Display
 * DisplayAnki
 * DisplayAudio
 * DocumentFocusController
 * HotkeyHandler
 * AnkiConnect
 * AnkiController
 * JapaneseUtil
 * SearchActionPopupController
 * SearchDisplayController
 * SearchPersistentStateController
 * wanakana
 */

(async () => {
    try {
        await yomichan.prepare();

        const {tabId, frameId} = await yomichan.api.frameInformationGet();
        
        const japaneseUtil = new JapaneseUtil(wanakana);
        const display = new Display(tabId, frameId, 'search', japaneseUtil);
        
        const displayAudio = new DisplayAudio(display);
        
        const displayAnki = new DisplayAnki(display, displayAudio, japaneseUtil);
        
        
        const aDict = new Dict(display, displayAudio, japaneseUtil, displayAnki);

        document.documentElement.dataset.loaded = 'true';
        document.body.style.color = '#CCCCCC'
        var tx = document.querySelector('textarea')
        tx.style.backgroundColor = 'gray'
        tx.style.color = '#EEEEEE'
        tx.onchange = function(e){
            e.stopPropagation()
            aDict.startMod()
            let v = tx.value.split('\n')
            console.warn(v,e);
            aDict.yomi(v,0,true)
            aDict.analyze()
        }
        yomichan.ready();
    } catch (e) {
        log.error(e);
    }
})();
