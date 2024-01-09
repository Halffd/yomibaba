/*
 * Copyright (C) 2021-2022  Yomichan Authors
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
 * AnkiNoteBuilder
 * AnkiUtil
 * PopupMenu
 */

class DisplayAnki {
    constructor(display, displayAudio, japaneseUtil) {
        this._display = display;
        this._displayAudio = displayAudio;
        this._ankiFieldTemplates = null;
        this._ankiFieldTemplatesDefault = null;
        this._ankiNoteBuilder = new AnkiNoteBuilder({ japaneseUtil });
        this._errorNotification = null;
        this._errorNotificationEventListeners = null;
        this._tagsNotification = null;
        this._updateAdderButtonsPromise = Promise.resolve();
        this._updateDictionaryEntryDetailsToken = null;
        this._eventListeners = new EventListenerCollection();
        this._dictionaryEntryDetails = null;
        this._noteContext = null;
        this._checkForDuplicates = false;
        this._suspendNewCards = false;
        this._compactTags = false;
        this._resultOutputMode = 'split';
        this._glossaryLayoutMode = 'default';
        this._displayTags = 'never';
        this._duplicateScope = 'collection';
        this._duplicateScopeCheckAllModels = false;
        this._screenshotFormat = 'png';
        this._screenshotQuality = 100;
        this._scanLength = 10;
        this._noteGuiMode = 'browse';
        this._audioDownloadIdleTimeout = null;
        this._noteTags = [];
        this._modeOptions = new Map();
        this._dictionaryEntryTypeModeMap = new Map([
            ['kanji', ['kanji']],
            ['term', ['term-kanji', 'term-kana']]
        ]);
        this._menuContainer = document.querySelector('#popup-menus');
        this._onShowTagsBind = this._onShowTags.bind(this);
        this._onNoteAddBind = this._onNoteAdd.bind(this);
        this._onViewNoteButtonClickBind = this._onViewNoteButtonClick.bind(this);
        this._onViewNoteButtonContextMenuBind = this._onViewNoteButtonContextMenu.bind(this);
        this._onViewNoteButtonMenuCloseBind = this._onViewNoteButtonMenuClose.bind(this);
    }

    prepare() {
        this._noteContext = this._getNoteContext();
        this._display.hotkeyHandler?.registerActions([
            ['addNoteKanji', () => { this._tryAddAnkiNoteForSelectedEntry('kanji'); }],
            ['addNoteTermKanji', () => { this._tryAddAnkiNoteForSelectedEntry('term-kanji'); }],
            ['addNoteTermKana', () => { this._tryAddAnkiNoteForSelectedEntry('term-kana'); }],
            ['viewNote', this._viewNoteForSelectedEntry.bind(this)]
        ]);
        this._display.on('optionsUpdated', this._onOptionsUpdated.bind(this));
        this._display.on('contentClear', this._onContentClear.bind(this));
        this._display.on('contentUpdateStart', this._onContentUpdateStart.bind(this));
        this._display.on('contentUpdateEntry', this._onContentUpdateEntry.bind(this));
        this._display.on('contentUpdateComplete', this._onContentUpdateComplete.bind(this));
        this._display.on('logDictionaryEntryData', this._onLogDictionaryEntryData.bind(this));
    }

    async getLogData(dictionaryEntry) {
        const result = {};

        // Anki note data
        let ankiNoteData;
        let ankiNoteDataException;
        try {
            ankiNoteData = await this._ankiNoteBuilder.getRenderingData({
                dictionaryEntry,
                mode: 'test',
                context: this._noteContext,
                resultOutputMode: this._resultOutputMode,
                glossaryLayoutMode: this._glossaryLayoutMode,
                compactTags: this._compactTags,
                marker: 'test'
            });
        } catch (e) {
            ankiNoteDataException = e;
        }
        result.ankiNoteData = ankiNoteData;
        if (typeof ankiNoteDataException !== 'undefined') {
            result.ankiNoteDataException = ankiNoteDataException;
        }

        // Anki notes
        const ankiNotes = [];
        const modes = this._getModes(dictionaryEntry.type === 'term');
        for (const mode of modes) {
            let note;
            let errors;
            let requirements;
            try {
                ({ note: note, errors, requirements } = await this._createNote(dictionaryEntry, mode, []));
            } catch (e) {
                errors = [e];
            }
            const entry = { mode, note };
            if (Array.isArray(errors) && errors.length > 0) {
                entry.errors = errors;
            }
            if (Array.isArray(requirements) && requirements.length > 0) {
                entry.requirements = requirements;
            }
            ankiNotes.push(entry);
        }
        result.ankiNotes = ankiNotes;

        return result;
    }

    // Private

    _onOptionsUpdated({ options }) {
        const {
            general: { resultOutputMode, glossaryLayoutMode, compactTags },
            anki: {
                tags,
                duplicateScope,
                duplicateScopeCheckAllModels,
                suspendNewCards,
                checkForDuplicates,
                displayTags,
                kanji,
                terms,
                noteGuiMode,
                screenshot: { format, quality },
                downloadTimeout
            },
            scanning: { length: scanLength }
        } = options;

        this._checkForDuplicates = checkForDuplicates;
        this._suspendNewCards = suspendNewCards;
        this._compactTags = compactTags;
        this._resultOutputMode = resultOutputMode;
        this._glossaryLayoutMode = glossaryLayoutMode;
        this._displayTags = displayTags;
        this._duplicateScope = duplicateScope;
        this._duplicateScopeCheckAllModels = duplicateScopeCheckAllModels;
        this._screenshotFormat = format;
        this._screenshotQuality = quality;
        this._scanLength = scanLength;
        this._noteGuiMode = noteGuiMode;
        this._noteTags = [...tags];
        this._audioDownloadIdleTimeout = (Number.isFinite(downloadTimeout) && downloadTimeout > 0 ? downloadTimeout : null);
        this._modeOptions.clear();
        this._modeOptions.set('kanji', kanji);
        this._modeOptions.set('term-kanji', terms);
        this._modeOptions.set('term-kana', terms);

        this._updateAnkiFieldTemplates(options);
    }

    _onContentClear() {
        this._updateDictionaryEntryDetailsToken = null;
        this._dictionaryEntryDetails = null;
        this._hideErrorNotification(false);
    }

    _onContentUpdateStart() {
        this._noteContext = this._getNoteContext();
    }

    _onContentUpdateEntry({ element }) {
        const eventListeners = this._eventListeners;
        for (const node of element.querySelectorAll('.action-button[data-action=view-tags]')) {
            eventListeners.addEventListener(node, 'click', this._onShowTagsBind);
        }
        for (const node of element.querySelectorAll('.action-button[data-action=add-note]')) {
            eventListeners.addEventListener(node, 'click', this._onNoteAddBind);
        }
        for (const node of element.querySelectorAll('.action-button[data-action=view-note]')) {
            eventListeners.addEventListener(node, 'click', this._onViewNoteButtonClickBind);
            eventListeners.addEventListener(node, 'contextmenu', this._onViewNoteButtonContextMenuBind);
            eventListeners.addEventListener(node, 'menuClose', this._onViewNoteButtonMenuCloseBind);
        }
    }

    _onContentUpdateComplete() {
        this._updateDictionaryEntryDetails();
    }

    _onLogDictionaryEntryData({ dictionaryEntry, promises }) {
        promises.push(this.getLogData(dictionaryEntry));
    }

    _onNoteAdd(e) {
        e.preventDefault();
        const node = e.currentTarget;
        const index = this._display.getElementDictionaryEntryIndex(node);
        this._addAnkiNote(index, node.dataset.mode);
    }

    _onShowTags(e) {
        e.preventDefault();
        const tags = e.currentTarget.title;
        this._showTagsNotification(tags);
    }

    _adderButtonFind(index, mode) {
        const entry = this._getEntry(index);
        return entry !== null ? entry.querySelector(`.action-button[data-action=add-note][data-mode="${mode}"]`) : null;
    }

    _tagsIndicatorFind(index) {
        const entry = this._getEntry(index);
        return entry !== null ? entry.querySelector('.action-button[data-action=view-tags]') : null;
    }

    _getEntry(index) {
        const entries = this._display.dictionaryEntryNodes;
        return index >= 0 && index < entries.length ? entries[index] : null;
    }

    _getNoteContext() {
        const { state } = this._display.history;
        let { documentTitle, url, sentence } = (isObject(state) ? state : {});
        if (typeof documentTitle !== 'string') {
            documentTitle = document.title;
        }
        if (typeof url !== 'string') {
            url = window.location.href;
        }
        const { query, fullQuery, queryOffset } = this._display;
        sentence = this._getValidSentenceData(sentence, fullQuery, queryOffset);
        return {
            url,
            sentence,
            documentTitle,
            query,
            fullQuery
        };
    }

    async _updateDictionaryEntryDetails() {
        const { dictionaryEntries } = this._display;
        const token = {};
        this._updateDictionaryEntryDetailsToken = token;
        if (this._updateAdderButtonsPromise !== null) {
            await this._updateAdderButtonsPromise;
        }
        if (this._updateDictionaryEntryDetailsToken !== token) { return; }

        const { promise, resolve } = deferPromise();
        try {
            this._updateAdderButtonsPromise = promise;
            const dictionaryEntryDetails = await this._getDictionaryEntryDetails(dictionaryEntries);
            if (this._updateDictionaryEntryDetailsToken !== token) { return; }
            this._dictionaryEntryDetails = dictionaryEntryDetails;
            this._updateAdderButtons();
        } finally {
            resolve();
            if (this._updateAdderButtonsPromise === promise) {
                this._updateAdderButtonsPromise = null;
            }
        }
    }

    _updateAdderButtons() {
        const displayTags = this._displayTags;
        const dictionaryEntryDetails = this._dictionaryEntryDetails;
        for (let i = 0, ii = dictionaryEntryDetails.length; i < ii; ++i) {
            let allNoteIds = null;
            for (const { mode, canAdd, noteIds, noteInfos, ankiError } of dictionaryEntryDetails[i].modeMap.values()) {
                const button = this._adderButtonFind(i, mode);
                if (button !== null) {
                    button.disabled = !canAdd;
                    button.hidden = (ankiError !== null);
                }

                if (Array.isArray(noteIds) && noteIds.length > 0) {
                    if (allNoteIds === null) { allNoteIds = new Set(); }
                    for (const noteId of noteIds) { allNoteIds.add(noteId); }
                }

                if (displayTags !== 'never' && Array.isArray(noteInfos)) {
                    this._setupTagsIndicator(i, noteInfos);
                }
            }
            this._updateViewNoteButton(i, allNoteIds !== null ? [...allNoteIds] : [], false);
        }
    }

    _setupTagsIndicator(i, noteInfos) {
        const tagsIndicator = this._tagsIndicatorFind(i);
        if (tagsIndicator === null) {
            return;
        }

        const displayTags = new Set();
        for (const { tags } of noteInfos) {
            for (const tag of tags) {
                displayTags.add(tag);
            }
        }
        if (this._displayTags === 'non-standard') {
            for (const tag of this._noteTags) {
                displayTags.delete(tag);
            }
        }

        if (displayTags.size > 0) {
            tagsIndicator.disabled = false;
            tagsIndicator.hidden = false;
            tagsIndicator.title = `Card tags: ${[...displayTags].join(', ')}`;
        }
    }

    _showTagsNotification(message) {
        if (this._tagsNotification === null) {
            this._tagsNotification = this._display.createNotification(true);
        }

        this._tagsNotification.setContent(message);
        this._tagsNotification.open();
    }

    _tryAddAnkiNoteForSelectedEntry(mode) {
        const index = this._display.selectedIndex;
        this._addAnkiNote(index, mode);
    }

    async _addAnkiNote(dictionaryEntryIndex, mode, dict = -1, req = null, o = null) {
        let dictionaryEntries;
        let dictionaryEntryDetails;
        let dictionaryEntry;
        let details;
        let requirements;
        let button;
        var allErrors = [];
        let progressIndicatorVisible;
        let overrideToken;

        try {
            if (dict >= 0) {
                // Handle the case when dict is greater than or equal to 0

                dictionaryEntry = dictionaryEntryIndex;
                requirements = req
            } else {
                dictionaryEntries = this._display.dictionaryEntries;
                dictionaryEntryDetails = this._dictionaryEntryDetails;

                if (
                    dictionaryEntryDetails !== null &&
                    dictionaryEntryIndex >= 0 &&
                    dictionaryEntryIndex < dictionaryEntries.length &&
                    dictionaryEntryIndex < dictionaryEntryDetails.length
                ) {
                    dictionaryEntry = dictionaryEntries[dictionaryEntryIndex];
                    details = dictionaryEntryDetails[dictionaryEntryIndex].modeMap.get(mode);

                    // this._display.invokeContentOrigin('Frontend.closePopup');
                    // this._display.invokeContentOrigin('Frontend.closePopup');

                    if (typeof details === 'undefined') {
                        return;
                    }

                    ({ requirements } = details);

                    button = this._adderButtonFind(dictionaryEntryIndex, mode);

                    if (button === null || button.disabled) {
                        return;
                    }

                    this._hideErrorNotification(true);

                    progressIndicatorVisible = this._display.progressIndicatorVisible;
                    overrideToken = progressIndicatorVisible.setOverride(true);

                    // Rest of the code...
                } else {
                    return
                }
            }
        } catch (error) {
            console.error(error);
        }
        try {
              const { note, errors, requirements: outputRequirements } = await this._createNote(dictionaryEntry, mode, requirements, dict);
            allErrors.push(...errors);

            const error = this._getAddNoteRequirementsError(requirements, outputRequirements);
            if (error !== null) { allErrors.push(error); }

            let noteId = null;
            let addNoteOkay = false;
            try {
                try {
                    let typ = dict >= 0 ? 'Search' : 'Popup'
                    let [t1, t2, t3, t4] = ['aDict', `v0.1-${new Date().toISOString().slice(0, 7)}`, `in${typ}`, mode == 'term-kana' ? 'kanaMode' : 'termMode'];
                    note.tags.push(t1, t2, t3, t4)
                    console.dir(note)
                    let vrs = [note, [this, dict, dictionaryEntry, dictionaryEntries, dictionaryEntryDetails, dictionaryEntryIndex, details, requirements, mode, button, progressIndicatorVisible, overrideToken]]
                    //vrs.push(JSON.stringify(vrs))
                    console.dir(vrs)
                    let x = this._display._container
                    //x.style.display = "none";
                    //console.log(note.fields['Key']);
                    let run = true
                    if (document.URL.includes('search.html') && document.URL.includes('chrome-extension')) {
                        run = localStorage.getItem('run') == 'true' ? true : false ?? true;
                    }
                    //console.log(run, document.URL); 
                    
                        note.fields['ExtraDefinitions'] += this.getText();
                        this._display._copyText(note.fields['Key']);
                    
                    if(o){
                        note.fields["Sentence"] = o.st
                    }
                    let y = note.fields['Key']
                    let RGEX_CHINESE = new RegExp(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/);
                    let iji = RGEX_CHINESE.test(y);
                    let kx = 0
                    let de = document.createElement('div')
                    de.insertAdjacentHTML("afterbegin", '<div class="dd" style="border: 2px solid rgb(20,100,10)"></div><div class="df" style="border: 1px solid rgb(60,45,45)"></div>')
                    let dd = ''
                    let df = ''
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
                    de.querySelector('.dd').innerHTML = dd
                    de.querySelector('.df').innerHTML = df
                    df = de.innerHTML
                    note.fields['ExtraDefinitions'] += df
                    //this._display._copyHostSelection()
                } catch (noe) {
                    console.warn(noe);
                }
                try{
                noteId = await yomichan.api.addAnkiNote(note);
                console.warn(noteId);
                }catch(rr){
                    console.error(rr,note);
                }
                if(noteId == undefined){
                    this._addAnkiNote(dictionaryEntryIndex,'term-kana',dict,req)
                    return
                }
                //var audio = new Audio('sfx.mp3');
                //console.log(audio);
                //audio.volume = 0.5
                //audio.play();
            const base64AudioData = `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VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQnLNIWGQhA0SmeixqSyZy6GXT4FpgDQGNyZpjEbOPk1qaWEGmIpjKMDEMQG5CgGCnZlQcNpAaFUyxgIOCExhYSjElQMEIAWIMrVagFgIKBrCNbaJC0TgQSDF//70sQtA/EyCmwt5xGIAAA0gAAABAQMNDpWxhQYLAp2DgIwWXoWeiiosmGZgYBGMZcxqxFMaJ4RYCzjWTQROyZpRo6GiyA0TNaARZsEhUgqHhigOCIyIlRSB3V3NWGCmNxc9Egu0wlNA3mBkx1JFAv0glVQVjQGoZKHq1gIKhyHVOhLppKPoFADWEqRBIDbFugJSIK6UgTZMG+DJoTEJaSCk0kWdQYyst6XmXepbMLKGnHXgp8zIErizUHmtP0sYKgXmMmJlFyVkAoSyVkMsZOYAodEf0STGRMtJgtqKkRLLarYS6R5T0IjGdQWyPYTXUIRye1AEDAiBIgIHLBVQSRGdGAHCAgQQkQ2DFjggaUIoeTABowZEhM8xBQ+R7SARqLOqKNWfrH+ZVbl3dzPncct8/L//Krre8P5+v13LePMsa12oJVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//vSxAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+9LEAAPAAAGkAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/70MQAA8AAAaQAAAAgAAA0gAAABExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+9LEAAPAAAGkAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/70sQAA8AAAaQAAAAgAAA0gAAABExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//vSxAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+9LEAAPAAAGkAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/70sQAA8AAAaQAAAAgAAA0gAAABExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//vSxAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+9LEAAPAAAGkAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/70sQAA8AAAaQAAAAgAAA0gAAABExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//vSxAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+9LEAAPAAAGkAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/70sQAA8AAAaQAAAAgAAA0gAAABExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//vQxAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/70sQAA8AAAaQAAAAgAAA0gAAABExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//vSxAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+9LEAAPAAAGkAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/70sQAA8AAAaQAAAAgAAA0gAAABExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//vSxAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+9LEAAPAAAGkAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/70sQAA8AAAaQAAAAgAAA0gAAABExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//vSxAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+9LEAAPAAAGkAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/70sQAA8AAAaQAAAAgAAA0gAAABExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//vSxAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+9DEAAPAAAGkAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//vSxAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+9LEAAPAAAGkAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==`
                // Convert the Base64 data to ArrayBuffer
                const binaryAudioData = window.atob(base64AudioData);
                const arrayBuffer = new ArrayBuffer(binaryAudioData.length);
                const view = new Uint8Array(arrayBuffer);
                for (let i = 0; i < binaryAudioData.length; i++) {
                    view[i] = binaryAudioData.charCodeAt(i);
                }
                // Create an audio context
                const audioContext = new AudioContext();
                // Decode the audio data
                audioContext.decodeAudioData(arrayBuffer)
                    .then(function (decodedData) {
                        // Create an audio buffer source
                        const audioSource = audioContext.createBufferSource();

                        // Set the audio buffer
                        audioSource.buffer = decodedData;

                        // Connect the audio source to the audio context destination
                        audioSource.connect(audioContext.destination);

                        // Start playing the audio
                        audioSource.start();
                    })
                    .catch(function (error) {
                        console.error('Error decoding audio data:', error);
                    })
                addNoteOkay = true;
            } catch (e) {
                //allErrors.length = 0;
                allErrors.push(e);
            }

            if (addNoteOkay) {
                if (noteId === null) {
                    allErrors.push(new Error('Note could not be added'));
                } else {
                    if (this._suspendNewCards) {
                        try {
                            await yomichan.api.suspendAnkiCardsForNote(noteId);
                            //x.style.display = "block";
                        } catch (e) {
                            allErrors.push(e);
                        }
                    }
                    if (dict < 0) {
                        button.disabled = true;
                    }
                    this._updateViewNoteButton(dictionaryEntryIndex, [noteId], true);
                }
            }
        } catch (e) {
            allErrors.push(e);
        } finally {
            if (dict < 0) {
                progressIndicatorVisible.clearOverride(overrideToken);
            }
        }

        if (allErrors.length > 0) {
            console.error(allErrors);
            this._showErrorNotification(allErrors);
        } else {
            this._hideErrorNotification(true);
        }
    }

    _getAddNoteRequirementsError(requirements, outputRequirements) {
        if (outputRequirements.length === 0) { return null; }

        let count = 0;
        for (const requirement of outputRequirements) {
            const { type } = requirement;
            switch (type) {
                case 'audio':
                case 'clipboardImage':
                    break;
                default:
                    ++count;
                    break;
            }
        }
        if (count === 0) { return null; }

        const error = new Error('The created card may not have some content');
        error.requirements = requirements;
        error.outputRequirements = outputRequirements;
        return error;
    }

    _showErrorNotification(errors, displayErrors) {
        if (typeof displayErrors === 'undefined') { displayErrors = errors; }

        if (this._errorNotificationEventListeners !== null) {
            this._errorNotificationEventListeners.removeAllEventListeners();
        }

        if (this._errorNotification === null) {
            this._errorNotification = this._display.createNotification(false);
            this._errorNotificationEventListeners = new EventListenerCollection();
        }

        const content = this._display.displayGenerator.createAnkiNoteErrorsNotificationContent(displayErrors);
        for (const node of content.querySelectorAll('.anki-note-error-log-link')) {
            this._errorNotificationEventListeners.addEventListener(node, 'click', () => {
                console.log({ ankiNoteErrors: errors });
            }, false);
        }

        this._errorNotification.setContent(content);
        this._errorNotification.open();
    }

    _hideErrorNotification(animate) {
        if (this._errorNotification === null) { return; }
        this._errorNotification.close(animate);
        this._errorNotificationEventListeners.removeAllEventListeners();
    }

    async _updateAnkiFieldTemplates(options) {
        this._ankiFieldTemplates = await this._getAnkiFieldTemplates(options);
    }

    async _getAnkiFieldTemplates(options) {
        let templates = options.anki.fieldTemplates;
        if (typeof templates === 'string') { return templates; }

        templates = this._ankiFieldTemplatesDefault;
        if (typeof templates === 'string') { return templates; }

        templates = await yomichan.api.getDefaultAnkiFieldTemplates();
        this._ankiFieldTemplatesDefault = templates;
        return templates;
    }

    async _getDictionaryEntryDetails(dictionaryEntries) {
        const forceCanAddValue = (this._checkForDuplicates ? null : true);
        const fetchAdditionalInfo = (this._displayTags !== 'never');

        const notePromises = [];
        const noteTargets = [];
        for (let i = 0, ii = dictionaryEntries.length; i < ii; ++i) {
            const dictionaryEntry = dictionaryEntries[i];
            const { type } = dictionaryEntry;
            const modes = this._dictionaryEntryTypeModeMap.get(type);
            if (typeof modes === 'undefined') { continue; }
            for (const mode of modes) {
                const notePromise = this._createNote(dictionaryEntry, mode, []);
                notePromises.push(notePromise);
                noteTargets.push({ index: i, mode });
            }
        }

        const noteInfoList = await Promise.all(notePromises);
        const notes = noteInfoList.map(({ note }) => note);

        let infos;
        let ankiError = null;
        try {
            if (forceCanAddValue !== null) {
                if (!await yomichan.api.isAnkiConnected()) {
                    throw new Error('Anki not connected');
                }
                infos = this._getAnkiNoteInfoForceValue(notes, forceCanAddValue);
            } else {
                infos = await yomichan.api.getAnkiNoteInfo(notes, fetchAdditionalInfo);
            }
        } catch (e) {
            infos = this._getAnkiNoteInfoForceValue(notes, false);
            ankiError = e;
        }

        const results = [];
        for (let i = 0, ii = dictionaryEntries.length; i < ii; ++i) {
            results.push({
                modeMap: new Map()
            });
        }

        for (let i = 0, ii = noteInfoList.length; i < ii; ++i) {
            const { note, errors, requirements } = noteInfoList[i];
            const { canAdd, valid, noteIds, noteInfos } = infos[i];
            const { mode, index } = noteTargets[i];
            results[index].modeMap.set(mode, { mode, note, errors, requirements, canAdd, valid, noteIds, noteInfos, ankiError });
        }
        return results;
    }

    _getAnkiNoteInfoForceValue(notes, canAdd) {
        const results = [];
        for (const note of notes) {
            const valid = AnkiUtil.isNoteDataValid(note);
            results.push({ canAdd, valid, noteIds: null });
        }
        return results;
    }

    async _createNote(dictionaryEntry, mode, requirements, anki=-2) {
        const context = this._noteContext;
        const modeOptions = this._modeOptions.get(mode);
        if (typeof modeOptions === 'undefined') { throw new Error(`Unsupported note type: ${mode}`); }
        const template = this._ankiFieldTemplates;
        const { deck: deckName, model: modelName } = modeOptions;
        const fields = Object.entries(modeOptions.fields);
        if (anki == -100) { //-1
            this._display.invokeContentOrigin('Frontend.closePopup');
        }
        const contentOrigin = this._display.getContentOrigin();
        const details = this._ankiNoteBuilder.getDictionaryEntryDetailsForNote(dictionaryEntry);
        const audioDetails = this._getAnkiNoteMediaAudioDetails(details);
        const optionsContext = this._display.getOptionsContext();
        const { note, errors, requirements: outputRequirements } = await this._ankiNoteBuilder.createNote({
            dictionaryEntry,
            mode,
            context,
            template,
            deckName,
            modelName,
            fields,
            tags: this._noteTags,
            checkForDuplicates: this._checkForDuplicates,
            duplicateScope: this._duplicateScope,
            duplicateScopeCheckAllModels: this._duplicateScopeCheckAllModels,
            resultOutputMode: this._resultOutputMode,
            glossaryLayoutMode: this._glossaryLayoutMode,
            compactTags: this._compactTags,
            mediaOptions: {
                audio: audioDetails,
                screenshot: {
                    format: this._screenshotFormat,
                    quality: this._screenshotQuality,
                    contentOrigin
                },
                textParsing: {
                    optionsContext,
                    scanLength: this._scanLength
                }
            },
            requirements
        });
        return { note, errors, requirements: outputRequirements };
    }

    _getModes(isTerms) {
        return isTerms ? ['term-kanji', 'term-kana'] : ['kanji'];
    }

    _getValidSentenceData(sentence, fallback, fallbackOffset) {
        let { text, offset } = (isObject(sentence) ? sentence : {});
        if (typeof text !== 'string') {
            text = fallback;
            offset = fallbackOffset;
        } else {
            if (typeof offset !== 'number') { offset = 0; }
        }
        return { text, offset };
    }

    _getAnkiNoteMediaAudioDetails(details) {
        if (details.type !== 'term') { return null; }
        const { sources, preferredAudioIndex } = this._displayAudio.getAnkiNoteMediaAudioDetails(details.term, details.reading);
        return { sources, preferredAudioIndex, idleTimeout: this._audioDownloadIdleTimeout };
    }

    // View note functions

    _onViewNoteButtonClick(e) {
        e.preventDefault();
        if (e.shiftKey) {
            this._showViewNoteMenu(e.currentTarget);
        } else {
            this._viewNote(e.currentTarget);
        }
    }

    _onViewNoteButtonContextMenu(e) {
        e.preventDefault();
        this._showViewNoteMenu(e.currentTarget);
    }

    _onViewNoteButtonMenuClose(e) {
        const { detail: { action, item } } = e;
        switch (action) {
            case 'viewNote':
                this._viewNote(item);
                break;
        }
    }

    _updateViewNoteButton(index, noteIds, prepend) {
        const button = this._getViewNoteButton(index);
        if (button === null) { return; }
        if (prepend) {
            const currentNoteIds = button.dataset.noteIds;
            if (typeof currentNoteIds === 'string' && currentNoteIds.length > 0) {
                noteIds = [...noteIds, currentNoteIds.split(' ')];
            }
        }
        const disabled = (noteIds.length === 0);
        button.disabled = disabled;
        button.hidden = disabled;
        button.dataset.noteIds = noteIds.join(' ');

        const badge = button.querySelector('.action-button-badge');
        if (badge !== null) {
            const badgeData = badge.dataset;
            if (noteIds.length > 1) {
                badgeData.icon = 'plus-thick';
                badgeData.hidden = false;
            } else {
                delete badgeData.icon;
                badgeData.hidden = true;
            }
        }
    }

    async _viewNote(node) {
        const noteIds = this._getNodeNoteIds(node);
        if (noteIds.length === 0) { return; }
        try {
            await yomichan.api.noteView(noteIds[0], this._noteGuiMode, false);
        } catch (e) {
            const displayErrors = (
                e.message === 'Mode not supported' ?
                    [this._display.displayGenerator.instantiateTemplateFragment('footer-notification-anki-view-note-error')] :
                    void 0
            );
            this._showErrorNotification([e], displayErrors);
            return;
        }
    }

    _showViewNoteMenu(node) {
        const noteIds = this._getNodeNoteIds(node);
        if (noteIds.length === 0) { return; }

        const menuContainerNode = this._display.displayGenerator.instantiateTemplate('view-note-button-popup-menu');
        const menuBodyNode = menuContainerNode.querySelector('.popup-menu-body');

        for (let i = 0, ii = noteIds.length; i < ii; ++i) {
            const noteId = noteIds[i];
            const item = this._display.displayGenerator.instantiateTemplate('view-note-button-popup-menu-item');
            item.querySelector('.popup-menu-item-label').textContent = `Note ${i + 1}: ${noteId}`;
            item.dataset.menuAction = 'viewNote';
            item.dataset.noteIds = `${noteId}`;
            menuBodyNode.appendChild(item);
        }

        this._menuContainer.appendChild(menuContainerNode);
        const popupMenu = new PopupMenu(node, menuContainerNode);
        popupMenu.prepare();
    }

    _getNodeNoteIds(node) {
        const { noteIds } = node.dataset;
        const results = [];
        if (typeof noteIds === 'string' && noteIds.length > 0) {
            for (const noteId of noteIds.split(' ')) {
                const noteIdInt = Number.parseInt(noteId, 10);
                if (Number.isFinite(noteIdInt)) {
                    results.push(noteIdInt);
                }
            }
        }
        return results;
    }

    _getViewNoteButton(index) {
        const entry = this._getEntry(index);
        return entry !== null ? entry.querySelector('.action-button[data-action=view-note]') : null;
    }

    _viewNoteForSelectedEntry() {
        const index = this._display.selectedIndex;
        const button = this._getViewNoteButton(index);
        if (button !== null) {
            this._viewNote(button);
        }
    }
    getText() {
        const parent = document.body;
        if (parent === null) { return; }

        let textarea = null;
        if (textarea === null) {
            textarea = document.createElement('textarea');
        }
        parent.appendChild(textarea);
        textarea.select();
        document.execCommand('paste');
        let v = textarea.value
        parent.removeChild(textarea);
        return v
    }
}
