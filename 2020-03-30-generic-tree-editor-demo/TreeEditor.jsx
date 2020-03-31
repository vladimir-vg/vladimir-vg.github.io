
/*
  This editor works with only one level of tree.

  It takes 'tree' prop, renders first level of the tree.
  Takes onChange callback, passes there updated tree, if something gets edited.

  If value of the key is not string, then it is displayed as nested tree and left untouched.

  Tree editor can be in three states:

    * new-node. By default we assume that new node is a blob.
      In this mode content of the blob is only single line,
      without a newline characters. If user inserts ': ' or ':\t' characters,
      then editor takes everything on the left side of the ': ' and turns it into a key.
      In this case node is transformed into a tree, switch to a tree-mode.
      If user press 'ESC' right after this switch, then editor turns node back to a blob,
      switching to blob-mode.
    * blob-mode. Editing content as a file, pretty simple.
    * tree-node. Every Enter key press creates a new key-value pair.
      key is separated from value by ': ' or ':\t' characters.
      Two Enter's in the row navigates to entry value.
*/



function uniqueId() {
  return Math.random().toString(36).substring(5);
}



class TreeEditor extends React.Component {
  render() {
    const path = this.props.match.params.path; //.split('/');
    return <StorageContext.Consumer>
      {({ projectRepo, userRepo }) =>
          <TreeEditor0 path={path} projectRepo={projectRepo} userRepo={userRepo} history={this.props.history} />}
    </StorageContext.Consumer>;
  }
}


const FETCH_DEPTH = 15;



function alignEntries(storageEntries, editorEntries) {
  const newEditorEntries = [];
  // copy lists, so we could remove elements from these lists
  // without breaking anything outside this function
  storageEntries = storageEntries.slice();

  const activeKeys = new Set();
  for (const i in editorEntries) {
    const { key, value, ref, id } = editorEntries[i];

    if (activeKeys.has(key)) {
      // if this key was already matched with value from storage
      // then all following entries with same key are not present in storage
      // simply keep them
      newEditorEntries.push({ key, id, value, ref });
      continue;
    }

    let saved = false;
    for (let j=0; j<storageEntries.length; j++) {
      if (storageEntries[j].key == key) {
        newEditorEntries.push({ key, id, value: storageEntries[j].value, ref: storageEntries[j].ref });
        storageEntries.splice(j, 1);
        j--; // to correctly interate over next entry
        activeKeys.add(key);
        saved = true;
        break;
      }
    }

    // no entry with such key was found in storage.
    // This happens when we rename the key.
    //
    // Try to find entry in storage with exactly same value
    // if it is found, then we had a renaming -- attach old id to new key.
    if (!saved) {
      for (let j=0; j<storageEntries.length; j++) {
        if (storageEntries[j].ref == ref) {
          newEditorEntries.push({ key: storageEntries[j].key, id, value, ref });
          activeKeys.add(storageEntries[j].key);
          storageEntries.splice(j, 1);
          j--; // to correctly interate over next entry
          saved = true;
          break;
        }
      }
    }

    if (!key && !saved) {
      // if we have entry with empty key, just keep it
      newEditorEntries.push({ key, id, value, ref });
      saved = true;
    }

    if (!saved) {
      // we have extra non-empty entries in editor, and no corresponding entries in storage.
      // we assume that editor removes entries inside before sending request of deletion to storage
      // this is not supposed to happen
      console.error("Inconsistent data in editor and storage", editorEntries[i]); throw "Error";
    }
  }

  // if we still have entries from storage that are not present in editor,
  // then just add them as new entries
  for (const j in storageEntries) {
    newEditorEntries.push({ key: storageEntries[j].key, value: storageEntries[j].value, id: uniqueId() , ref: storageEntries[j].ref });
  }

  return newEditorEntries;
}



// TODO: unique ids for entries should be generated here, in TreeEditor0 component.
//
// It should be okay to have several entries with same key.
// Even though it is not a correct tree, it should be possible for user experience.
// If there are several entries with same key, only first one is actually stored.
// Entries that are not stored should look turned off (grey text, no outline?).
//
// TreeEditor receives only key-value pairs from storage.
// It is responsibility of editor to match these key-value pairs
// with list of previously rendered entries.
//
// Tree entries: {id,key,value}
// We receive {key,value} elements from storage.
//
// 1. Filter out all key-value pairs that present in entries.
// 2. If there elements from storage that have same key as entry, yet different value -- replace value in entry.
// 3. If there one entry from storage that have same value, but key is different -- replace key in entry.
//
// Copy-pasting of entries would require to remember where was cursor when paste command was executed.
class TreeEditor0 extends React.Component {
  constructor() {
    super();
    this.state = {
      value: null,              // either a string or a list of entries
      syncedPath: null,
      cursor: null,     // [i, 0], [i, 1], 'parent' -- row and column
      prevCursor: null, // might be useful to return from parent key item
      selectionStart: null, // [r, c] first point of selection rectangle. Second point is cursor
    }

    this.transformToTree = this.transformToTree.bind(this);
    this.transformToBlob = this.transformToBlob.bind(this);
    this.onBlobChange = this.onBlobChange.bind(this);
    this.setCursor = this.setCursor.bind(this);
    this.onParentClick = this.onParentClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.navigateToChild = this.navigateToChild.bind(this);
    this.onEntriesChange = this.onEntriesChange.bind(this);
    this.isInSelection = this.isInSelection.bind(this);
    this.onResetClick = this.onResetClick.bind(this);
    this.createNewEntryAndFocus = this.createNewEntryAndFocus.bind(this);

    this._shiftPressed = false;
    this._ctrlPressed = false;
    // this._altPressed = false;
  }

  componentWillMount() {
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);

    const segments = this.props.path.split("/");
    this.props.projectRepo.fetch(null, segments, {depth: FETCH_DEPTH}).then((storageEntries) => {
      this.applyStorageEntries(storageEntries, this.state.entries, this.props.path);
    });
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
  }

  componentWillReceiveProps(props) {
    if (this.props.path != props.path) {
      const segments = props.path.split("/");
      this.props.projectRepo.fetch(null, segments, { depth: FETCH_DEPTH }).then((storageEntries) => {
        this.applyStorageEntries(storageEntries, this.state.entries, props.path);
      });
    }
  }

  applyStorageEntries(storageEntries, editorEntries, currentPath) {
    if (storageEntries == NO_DATA) {
      this.applyStorageEntries('', editorEntries, currentPath);
      return;
    }

    if (typeof storageEntries == 'string') {
      this.setState({blob: storageEntries, entries: null});
      return;
    }
    this.setState({blob: null});

    // if path is changed, then we do not need to align storage data with editor data
    const pathChanged = (currentPath != this.state.syncedPath);

    if (pathChanged) {
      // debugger
      window.readUserEditorInfo(this.props.userRepo, currentPath).then((editorInfo) => {
        console.log("editor info", currentPath, editorInfo);
        const editorEntries = window.alignEntriesWithEditorInfo(storageEntries, editorInfo);
        // debugger
        this.setState({ entries: editorEntries, syncedPath: currentPath, prevCursor : null});
      });
      // const editorEntries = alignEntries(storageEntries, []);
      // this.setState({ entries: editorEntries, syncedPath: currentPath, prevCursor : null});
    } else {
      // const oldEntries = pathChanged ? [] : this.state.value;
      // const prevCursor = pathChanged ? null : this.state.prevCursor;
      const editorEntries1 = alignEntries(storageEntries, editorEntries);
// debugger
      const { userRepo, projectRepo } = this.props;
      // debugger
      window.storeUserEditorInfo({ userRepo, projectRepo, path: currentPath, entries: editorEntries1 }).then(() => {
        this.setState({ entries: editorEntries1, syncedPath: currentPath });
      });
    }
  }

  onKeyDown(e) {
    // console.log("keydown", e.key, {shift: this._shiftPressed, alt: this._altPressed, ctrl: this._ctrlPressed});

    // if (e.key == 'Shift') { this._shiftPressed = true; return; }
    if (e.key == 'Shift') { this.setState({shiftPressed: true}); return; }
    // if (e.key == 'Control') { this._ctrlPressed = true; return; }
    if (e.key == 'Control') { this.setState({ctrlPressed: true}); return; }
    if (e.key == 'Alt') { this.setState({altPressed: true}); return; }

    if (e.key == 'ArrowUp') { this.setState({upPressed: true}); }
    if (e.key == 'ArrowDown') { this.setState({downPressed: true}); }
    if (e.key == 'ArrowLeft') { this.setState({leftPressed: true}); }
    if (e.key == 'ArrowRight') { this.setState({rightPressed: true}); }
    if (e.key == 'Enter') { this.setState({enterPressed: true}); }
    if (e.key == 'Backspace') { this.setState({backspacePressed: true}); }
    if (e.key == 'Delete') { this.setState({deletePressed: true}); }

    const isTreeEditing = (this.state.entries != null);
    if (!isTreeEditing) return;
    console.log("handle tree key", e.key);

    // move cursor only when no modifiers applied
    // use of modifiers is reserved for future
    if (!this.state.shiftPressed && !this.state.ctrlPressed && this.state.cursor) { // && !this._altPressed

      if (e.key == 'Enter') {
        if (this.state.cursor == 'parent') {
          this.navigateToParent();
          return;
        } else {
          const [r, c] = this.state.cursor;
          if (c == 1) {
              // if key is focused
              this.createNewEntryAndFocus();
              return;
          } else if (c == 0) {
              // move focus from key to entry
              this.setCursor([r, 1]);
              return;
          }
        }
      }

      const activeElement = document.activeElement;
      const isInput = (activeElement.tagName == "INPUT");
      const leftmostCaretPosition = (activeElement.selectionStart == 0)
                                 && (activeElement.selectionEnd == 0);
      const rightmostCaretPosition = !activeElement.value
                                  || ((activeElement.selectionStart == activeElement.value.length)
                                      && (activeElement.selectionEnd == activeElement.value.length));

      // debugger
      // for now any non-Shifted key except D would reset selection
      // in future combinations like Ctrl + C should keep selection
      if (this.state.selectionStart && (['d', 'Delete', 'Backspace'].indexOf(e.key) == -1)) {
        this.setState({selectionStart: null});
      }

      switch (e.key) {
        case 'd':
          // if we have selection and hit D key,
          // selection gets duplicated
          // I would prefer to use Ctrl + Shift + D or Ctrl + D
          // (as it is in Atom and InteliJ IDEA)
          // to do duplication not only in selection mode, but these combinations
          // are already reserved by browsers for bookmarks.
          if (!this.state.selectionStart) { break; }
          this.duplicateSelection();
          return;

        case 'Backspace':
        case 'Delete':

          if (this.state.selectionStart) {
            this.removeSelection();
            return;
          } else {
            this.removeFocusedTreeValue();
            return;
          }

        case 'ArrowDown': this.moveCursorDown(); return;
        case 'ArrowUp': this.moveCursorUp(); return;

        case 'ArrowRight':
          if (!isInput || (isInput && rightmostCaretPosition)) {
            this.moveCursorRight();
          }
          return;
        case 'ArrowLeft':
          if (!isInput || (isInput && leftmostCaretPosition)) {
            this.moveCursorLeft();
          }
          return;
      }
    }

    // shift pressed but ctrl is not
    if (!!this.state.shiftPressed && !this.state.ctrlPressed && this.state.cursor) {
      const activeElement = document.activeElement;
      const isInput = (activeElement.tagName == "INPUT");
      const leftmostCaretPosition = (activeElement.selectionStart == 0);
      const rightmostCaretPosition = !activeElement.value
                                  || ((activeElement.selectionStart == activeElement.value.length)
                                      && (activeElement.selectionEnd == activeElement.value.length));
      // start selection rectangle
      switch (e.key) {
        case 'ArrowDown': this.moveSelectionDown(); return;
        case 'ArrowUp': this.moveSelectionUp(); return;

        // if there is no selection rectange yet
        // and cursor is in the middle of text input
        // then do nothing, allow user to select text as usual
        case 'ArrowRight':
          if (this.state.selectionStart) {
            this.moveSelectionRight();
          } else if (!isInput || (isInput && rightmostCaretPosition)) {
            this.moveSelectionRight();
          }
          return;
        case 'ArrowLeft':
          if (this.state.selectionStart) {
            this.moveSelectionLeft();
          } else if (!isInput || (isInput && leftmostCaretPosition)) {
            this.moveSelectionLeft();
          }
          return;
      }
    }

    // only when Ctrl is pressed
    if (!this.state.shiftPressed && !!this.state.ctrlPressed) {
      switch (e.key) {
        case 'ArrowUp': this.moveEntriesUp(); return;
        case 'ArrowDown': this.moveEntriesDown(); return;
        case 'Enter': this.navigateToCurrentValue(); return;
      }
    }
  }

  navigateToCurrentValue() {
    if (!this.state.cursor) return;

    if (this.state.cursor == 'parent') {
      this.navigateToParent();
      return;
    }

    const [r, c] = this.state.cursor;
    const { key } = this.state.entries[r];
    this.navigateToChild([key]);
  }

  onKeyUp(e) {
    // console.log("keyup", e.key, {shift: this._shiftPressed, alt: this._altPressed, ctrl: this._ctrlPressed});
    // if (e.key == 'Shift') { this._shiftPressed = false; return; }
    if (e.key == 'Shift') { this.setState({shiftPressed: false}); return; }
    // if (e.key == 'Alt') { this._altPressed = false; return; }
    // if (e.key == 'Control') { this._ctrlPressed = false; return; }
    if (e.key == 'Control') { this.setState({ctrlPressed: false}); return; }

    if (e.key == 'ArrowUp') { this.setState({upPressed: false}); return; }
    if (e.key == 'ArrowDown') { this.setState({downPressed: false}); return; }
    if (e.key == 'ArrowLeft') { this.setState({leftPressed: false}); return; }
    if (e.key == 'ArrowRight') { this.setState({rightPressed: false}); return; }
    if (e.key == 'Enter') { this.setState({enterPressed: false}); return; }
    if (e.key == 'Alt') { this.setState({altPressed: false}); return; }
    if (e.key == 'Backspace') { this.setState({backspacePressed: false}); }
    if (e.key == 'Delete') { this.setState({deletePressed: false}); }
  }



  moveCursorDown() {
    if (this.state.cursor == "parent") { return; }
    const [r, c] = this.state.cursor;

    const r1 = Math.min(r+1, this.state.entries.length-1);
    this.setCursor([r1, c]);
  }

  moveCursorUp() {
    if (this.state.cursor == "parent") { return; }

    const [r, c] = this.state.cursor;

    const r1 = Math.max(r-1, 0);
    this.setCursor([r1, c]);
  }

  moveCursorRight() {
    if (this.state.cursor == "parent") {
      if (this.state.prevCursor) {
        this.setCursor(this.state.prevCursor);
      } else {
        this.setCursor([0, 0]);
      }
      return;
    }

    const [r, c] = this.state.cursor;
    if (c == 0) { this.setCursor([r, 1]); }
  }

  moveCursorLeft() {
    if (this.state.cursor == "parent") { return; }

    const [r, c] = this.state.cursor;
    if (c == 0) {
      this.setCursor('parent');
    } else if (c == 1) {
      this.setCursor([r, 0]);
    }
  }



  moveSelectionDown() {
    if (!this.state.cursor) return;
    if (this.state.cursor == 'parent') {
      this.moveCursorDown();
      return;
    }

    const [r, c] = this.state.cursor

    if (!this.state.selectionStart) {
      this.setState({selectionStart: [r, c]});
      this.moveCursorDown();
      return;
    }

    const [rSel, cSel] = this.state.selectionStart;
    if (r+1 == rSel && c == cSel) {
      // if we return back to the starting position of selection
      // then just remove selection rectangle
      // cursor is enough
      this.setState({selectionStart: null});
    }
    this.moveCursorDown();
  }

  moveSelectionUp() {
    if (!this.state.cursor) return;
    if (this.state.cursor == 'parent') {
      this.moveCursorUp();
      return;
    }

    const [r, c] = this.state.cursor

    if (!this.state.selectionStart) {
      this.setState({selectionStart: [r, c]});
      this.moveCursorUp();
      return;
    }

    const [rSel, cSel] = this.state.selectionStart;
    if (r-1 == rSel && c == cSel) {
      // if we return back to the starting position of selection
      // then just remove selection rectangle
      // cursor is enough
      this.setState({selectionStart: null});
    }
    this.moveCursorUp();
  }

  moveSelectionLeft() {
    if (!this.state.cursor) return;
    if (this.state.cursor == 'parent') {
      this.moveCursorLeft();
      return;
    }

    const [r, c] = this.state.cursor

    if (!this.state.selectionStart) {
      this.setState({selectionStart: [r, c]});
      this.moveCursorLeft();
      return;
    }

    const [rSel, cSel] = this.state.selectionStart;
    if (c-1 == cSel && r == rSel) {
      // if we return back to the starting position of selection
      // then just remove selection rectangle
      // cursor is enough
      this.setState({selectionStart: null});
    }
    this.moveCursorLeft();
  }

  moveSelectionRight() {
    if (!this.state.cursor) return;
    if (this.state.cursor == 'parent') {
      this.moveCursorRight();
      return;
    }

    const [r, c] = this.state.cursor

    if (!this.state.selectionStart) {
      this.setState({selectionStart: [r, c]});
      this.moveCursorRight();
      return;
    }

    const [rSel, cSel] = this.state.selectionStart;
    if (c+1 == cSel && r == rSel) {
      // if we return back to the starting position of selection
      // then just remove selection rectangle
      // cursor is enough
      this.setState({selectionStart: null});
    }
    this.moveCursorRight();
  }



  navigateToParent() {
    // TODO: if parent was out previous route, then just go back.
    // This is necessary to no pollute the history
    //
    // if previous route was something else,
    // then push new path to history

    const segments = this.props.path.split("/");
    if (segments.length == 1) { return; }

    const segments1 = segments.slice(0, segments.length-1);
    this.props.history.push("/node/" + segments1.join("/") + "/");
  }

  moveEntriesUp() {
    if (!this.state.cursor) return;
    const [r, c] = this.state.cursor;
    let rMax = r, rMin = r;
    if (this.state.selectionStart) {
      const [rSel, cSel] = this.state.selectionStart;
      rMax = Math.max(r, rSel);
      rMin = Math.min(r, rSel);
    }

    if (rMin == 0) return;

    const entries = this.state.entries.slice();
    const entryToMove = entries[rMin-1];
    entries.splice(rMin-1, 1);
    entries.splice(rMax, 0, entryToMove);

    this.onEntriesChange(entries);
    if (this.state.selectionStart) {
      const [rSel, cSel] = this.state.selectionStart;
      this.setState({selectionStart: [rSel-1, cSel]});
      this.setCursor([r-1, c]);
    }
  }

  moveEntriesDown() {
    if (!this.state.cursor) return;
    const [r, c] = this.state.cursor;
    let rMax = r, rMin = r;
    if (this.state.selectionStart) {
      const [rSel, cSel] = this.state.selectionStart;
      rMax = Math.max(r, rSel);
      rMin = Math.min(r, rSel);
    }
    if (rMax == (this.state.entries.length-1)) return;

    const entries = this.state.entries.slice();
    const entryToMove = entries[rMax+1];
    entries.splice(rMax+1, 1);
    entries.splice(rMin, 0, entryToMove);
    this.onEntriesChange(entries);
    if (this.state.selectionStart) {
      const [rSel, cSel] = this.state.selectionStart;
      this.setState({selectionStart: [rSel+1, cSel]});
      this.setCursor([r+1, c])
    }
  }

  removeSelection() {
    if (!this.state.cursor) return;
    if (this.state.cursor == 'parent') return;

    const [r, c] = this.state.cursor;
    const [rSel, cSel] = this.state.selectionStart;
    const rMax = Math.max(r, rSel);
    const rMin = Math.min(r, rSel);
    const cMax = Math.max(c, cSel);
    const cMin = Math.min(c, cSel);

    const entries = this.state.entries.slice();
    if (cMin != cMax) {
      // debugger
      // both columns are selected
      // so we need to remove all rows in selection
      entries.splice(rMin, rMax-rMin+1);
      this.setCursor([Math.min(rMin, entries.length-1), 1]);
    } else if (cMin == 0) {
      // delete only keys
      for (let i=rMin; i<=rMax; i++) {
        const { id, key, value, ref } = entries[i];
        entries[i] = { id, key: '', value, ref };
      }
    } else {
      // debugger
      // delete only values
      for (let i=rMin; i<=rMax; i++) {
        const { id, key, value, ref } = entries[i];
        entries[i] = { id, key, value: '', ref: null };
      }
    }

    this.onEntriesChange(entries);
    this.setState({selectionStart: null});
  }

  removeFocusedTreeValue() {
    if (!this.state.cursor) return;
    if (this.state.cursor == 'parent') return;

    const [r, c] = this.state.cursor;
    if (c != 1) return;

    const { id, key, value, ref } = this.state.entries[r];
    if (typeof value != 'string' && ref) {
      // if we focused a tree
      const events = this.state.entries.slice();
      events[r] = { id, key, value: '', ref };
      this.onEntriesChange(events);
    }
  }

  duplicateSelection() {
    const [r, c] = this.state.cursor;
    const [rSel, cSel] = this.state.selectionStart;
    const rMax = Math.max(r, rSel);
    const rMin = Math.min(r, rSel);

    // insert duplicated entries right after current,
    // shift selection to freshly inserted entries
    const toDup = this.state.entries.slice(rMin, rMax+1);
    const entries = this.state.entries.slice();
    // toDup.reverse();
    for (const i in toDup) {
      // intentionally do not copy entry id
      // new ids should be generated
      const { key, value, ref } = toDup[i];
      entries.splice(rMax, 0, { key, value, ref, id: uniqueId() });
    }

    this.onEntriesChange(entries);
    this.setCursor([r+toDup.length, c]);
    this.setState({selectionStart: [rSel+toDup.length, cSel]});
  }

  createNewEntryAndFocus() {
    const [r, c] = this.state.cursor;

    const entryId = uniqueId();
    const entries = this.state.entries.slice();
    entries.splice(r+1, 0, { id: entryId, key: "", value: "" });

    // this._refs[`key_${entryId}`] = React.createRef();
    // this._refs[`value_${entryId}`] = React.createRef();

    this.setCursor([r+1, 0]);
    this.onEntriesChange(entries);
  }

  onBlobChange(value) {
    console.assert(typeof value == 'string', value);

    this.setState({blob: value});
    const segments = this.props.path.split("/");
    this.props.projectRepo.update(segments, value);
  }

  transformToTree(key, value) {
    this.setState({
      entries: [{key, value, ref: null, id: uniqueId()}],
      blob: null,
      selectionStart: null,
      cursor: [0, 1],
    });
  }

  transformToBlob(value) {
    console.assert(typeof value == 'string', value);
    this.setState({blob: value, entries: null, selectionStart: null, cursor: null});
  }

  onParentClick(e) {
    this.navigateToParent();
  }

  setCursor(value) {
    this.setState({cursor: value, prevCursor: this.state.cursor});
  }

  navigateToChild(path) {
    const segments = this.props.path.split("/");
    const newPath = "/node/" + segments.join("/") + "/" + path.join("/") + "/";
    this.props.history.push(newPath);
  }

  onEntriesChange(entries) {
    console.log("updateEntries")
    // this.setState({ value: entries });

    // overwrite values in storage
    const segments = this.props.path.split("/");
    const segments1 = segments.slice();

    const { active, inactive } = window.partitionEditorEntries(entries);
    const toStore = [];
    // return entries in similar way that we received them: [{key, ref, value}, ...].
    // if ref is missing, then it should be calculated from value
    // if value if missing, then it didn't change and should rely on ref
    for (const i in active) {
      const { key, ref, value } = active[i];
      if (value == null) {
        toStore.push({ key, value: '', ref: null });
      } else if (typeof value == 'string') {
        // likely value was changed and doesn't correspond to ref anymore
        // send ref=null
        toStore.push({ key, value, ref: null });
      } else {
        // value is a tree, which cannot be edited
        // remove value, since keeping ref would be enough
        toStore.push({ key, value: null, ref });
      }
    }

    // debugger

    this.props.projectRepo.update(segments, toStore).then(() => {
      this.props.projectRepo.fetch(null, segments, { depth: FETCH_DEPTH })
        .then((storageEntries) => {
          this.applyStorageEntries(storageEntries, entries, this.props.path);
        });
    });
  }

  isInSelection(r, c) {
    if (!this.state.selectionStart) return false;
    const [r1, c1] = this.state.selectionStart;
    const [r2, c2] = this.state.cursor;

    const rMin = Math.min(r1, r2);
    const rMax = Math.max(r1, r2);
    const cMin = Math.min(c1, c2);
    const cMax = Math.max(c1, c2);

    return (rMin <= r) && (r <= rMax)
        && (cMin <= c) && (c <= cMax);
  }

  onResetClick(e) {
    window.localStorage.clear();
    this.props.projectRepo.storeJSONObject(EXAMPLE_TREE_DATA);
    window.location.reload();
  }

  renderKeyboard() {
    const normalClassName = "key-indicator";
    const activeClassName = "key-indicator active";
    const className = {
      ctrl: this.state.ctrlPressed ? activeClassName : normalClassName,
      shift: this.state.shiftPressed ? activeClassName : normalClassName,
      backspace: this.state.backspacePressed ? activeClassName : normalClassName,
      delete: this.state.deletePressed ? activeClassName : normalClassName,
      // alt: this.state.altPressed ? activeClassName : normalClassName,
      alt: normalClassName,

      up: this.state.upPressed ? activeClassName : normalClassName,
      down: this.state.downPressed ? activeClassName : normalClassName,
      left: this.state.leftPressed ? activeClassName : normalClassName,
      right: this.state.rightPressed ? activeClassName : normalClassName,
      enter: this.state.enterPressed ? activeClassName : normalClassName,
    }
    return <div style={{display: 'flex', alignItems: 'flex-end', marginTop: 30, marginLeft: 30}}>
        <div className={className.ctrl}>Ctrl</div>
        <div className={className.shift}>Shift</div>
        <div className={className.alt} style={{marginRight: 30}}>Alt</div>
        <div className={className.left}>←</div>
        <div>
          <div className={className.up}>↑</div>
          <div className={className.down}>↓</div>
        </div>
        <div className={className.right}  style={{marginRight: 30}}>→</div>
        <div>
          <div style={{display: 'flex', flexDirection: 'row'}}>
            <div className={className.backspace}>Backspace</div>
            <div className={className.delete}>Del</div>
          </div>
          <div className={className.enter}>Enter</div>
        </div>
    </div>;
  }

  render() {
    if (this.state.entries == null && this.state.blob == null) {
      return <div className="tree-editor">
        Loading...
      </div>;
    }

    const segments = this.props.path.split("/");
    const parentKey = segments[segments.length-1];

    const isValueAString = (typeof this.state.blob == 'string');

    const parentHasCursor = (this.state.cursor == 'parent');
    let parentClassName = "parent-key";
    if (parentHasCursor) {
      parentClassName += " cursor";
    }

    return <div>
      <button onClick={this.onResetClick}>Reset storage!</button>
      <div className="tree-editor">
        <div className="parent-key-container" onClick={this.onParentClick}><div className={parentClassName}>{parentKey}</div></div>

        {isValueAString &&
          <BlobEditor value={this.state.blob} transformToTree={this.transformToTree} onChange={this.onBlobChange} />}
        {!isValueAString &&
          <TreeNodeEditor entries={this.state.entries} onChange={this.onEntriesChange}
            setCursor={this.setCursor}
            cursor={this.state.cursor}
            isInSelection={this.isInSelection}
            navigateToChild={this.navigateToChild}
            transformToBlob={this.transformToBlob} />}
      </div>
      {this.renderKeyboard()}
    </div>;
  }
}



/*
  Tree node editor stores internally entries in following format:
    elements: ["entryId1", "entryId2", ["entryId3", {refernce-to-tree}], ...]
    key_entryId1: "..."
    value_entryId1: "..."
    key_entryId2: "..."
    value_entryId2: "..."
    value_entryId3: "..."

  both keys and one-line blob values can be edited
  if value is another three, then it only possible to navigate to it
*/



class EntryKeyInput0 extends React.Component {
  constructor() {
    super();
    this.state = { value: null };

    this.updateField = this.updateField.bind(this);
    this.onInputKeyDown = this.onInputKeyDown.bind(this);
    // this.onGlobalKeyDown = this.onGlobalKeyDown.bind(this);
    this.onBlur = this.onBlur.bind(this);
    this.onFocus = this.onFocus.bind(this);

    this._prevKeyIsColon = false;
  }

  componentWillMount() {
    this.setState({value: this.props.initialValue});
    // document.addEventListener('keydown', this.onGlobalKeyDown);
  }

  componentDidMount() {
    if (this.props.hasCursor) {
      this.props.forwardedRef.current.focus();
    }
  }

  componentWillReceiveProps(props) {
    // this.setState({value: this.props.value});

    if (this.props.hasCursor && !props.hasCursor) {
      this.props.forwardedRef.current.blur();
    }

    if (!(this.props.hasSelection || props.hasSelection) && !this.props.hasCursor && props.hasCursor) {
      this.props.forwardedRef.current.focus();
    }

    if (props.initialValue != this.props.initialValue) {
      this.setState({value: props.initialValue});
    }
  }

  // componentWillUnmount() {
  //   document.removeEventListener('keydown', this.onGlobalKeyDown);
  // }

  updateField(e) {
    this.setState({value: e.target.value});

    if (this._storeTimeout) {
      clearTimeout(this._storeTimeout);
      this._storeTimeout = null;
    }
    this._storeTimeout = setTimeout(() => {
      clearTimeout(this._storeTimeout);
      this.storeValue();
      this._storeTimeout = null;
    }, 500);
  }

  // onGlobalKeyDown(e) {
  //   const elt = this.props.forwardedRef.current;
  //   if (e.key == "Enter" && this.props.hasCursor && document.activeElement != elt) {
  //     elt.focus();
  //   }
  // }

  storeValue() {
    if (this.state.value != this.props.initialValue) {
      this.props.onChange(this.state.value);
    }
  }

  onInputKeyDown(e) {
    const key = this.state.value;         // content of this input
    const value = this.props.entryValue;  // content of paired input

    const onlyKeyFieldIsRendered = (value == null);
    const spaceAndColonPressed = ((e.key === " ") && this._prevKeyIsColon);
    const nonEmptyKeyEnterPressed = ((e.key === "Enter") && !!key);

    if (onlyKeyFieldIsRendered && (spaceAndColonPressed || nonEmptyKeyEnterPressed)) {
      // create value input
      e.preventDefault();
      let newKeyContent = key;
      if (this._prevKeyIsColon) {
        newKeyContent = key.slice(0, key.length-1);
      }

      this.setState({value: newKeyContent});
      this.props.onChange(newKeyContent);
      this.props.focusEntryValue();
    } else if (e.key === "Backspace" && !value && !key) {
      // if key and value are empty, and user hits backspace,
      // then remove this entry and focus previous entry value
      e.preventDefault();

      this.props.deleteEntryAndFocusPrevious();
    } else if (e.key == "Escape") {
      // if user hit Esc -- remove focus from input
      // will navigate between items rather than between text characters
      const elt = this.props.forwardedRef.current;
      elt.blur();
    }

    this._prevKeyIsColon = (e.key === ":");
  }

  onBlur(e) {
    this._prevKeyIsColon = false;

    this.storeValue();

    // TODO: remove cursor when user clicked outside the node window
    // so we would not have this state when cell has cursor, but input not focused
    // if (this.props.hasCursor) {
    //   this.props.clearCursor();
    // }
  }

  onFocus() {
    this.props.setCursor();
  }

  render() {
    if (this.state.value == null) { return null; }

    // style: https://stackoverflow.com/a/43488899
    const style = {width: `${this.state.value.length+2}ch`};

    let className = "entry-key";
    if (this.props.hasCursor) { className += " cursor"; }
    if (!this.props.isEffective) { className += " muted"; }

    let colonDecoration = null;
    if (this.state.value) {
      colonDecoration = <span className="text-decoration">:</span>;
    }

    return <span className="entry-key-container"><input onChange={this.updateField} value={this.state.value} onKeyDown={this.onInputKeyDown} onFocus={this.onFocus} ref={this.props.forwardedRef} onBlur={this.onBlur} className={className} style={style} />{colonDecoration}</span>
  }
}

// more info about this trick with refs:
// https://reactjs.org/docs/forwarding-refs.html#forwarding-refs-to-dom-components
const EntryKeyInput = React.forwardRef((props, ref) => <EntryKeyInput0 forwardedRef={ref} {...props} />);



class EntryValueInput0 extends React.Component {
  constructor() {
    super();
    this.state = { value: null };

    this.updateField = this.updateField.bind(this);
    this.onInputKeyDown = this.onInputKeyDown.bind(this);
    // this.onGlobalKeyDown = this.onGlobalKeyDown.bind(this);
    this.onFocus = this.onFocus.bind(this);
    this.onBlur = this.onBlur.bind(this);
  }

  componentWillMount() {
    this.setState({value: this.props.initialValue});

    // document.addEventListener('keydown', this.onGlobalKeyDown);
  }

  componentDidMount() {
    if (this.props.hasCursor) {
      this.props.forwardedRef.current.focus();
    }
  }

  // componentWillUnmount() {
  //   document.removeEventListener('keydown', this.onGlobalKeyDown);
  // }

  componentWillReceiveProps(props) {
    // this.setState({value: this.props.value});

    if (this.props.hasCursor && !props.hasCursor) {
      this.props.forwardedRef.current.blur();
    }

    if (!(this.props.hasSelection || props.hasSelection) && !this.props.hasCursor && props.hasCursor) {
      this.props.forwardedRef.current.focus();
    }

    if (props.initialValue != this.props.initialValue) {
      this.setState({value: props.initialValue});
    }
  }

  // componentDidUpdate() {
  //   if (this.props.hasCursor && document.activeElement != this.props.forwardedRef.current) {
  //     this.props.forwardedRef.current.focus();
  //   }
  // }

  updateField(e) {
    this.setState({value: e.target.value});

    if (this._storeTimeout) {
      clearTimeout(this._storeTimeout);
      this._storeTimeout = null;
    }
    this._storeTimeout = setTimeout(() => {
      clearTimeout(this._storeTimeout);
      this.storeValue();
      this._storeTimeout = null;
    }, 500);
  }

  // onGlobalKeyDown(e) {
  //   const elt = this.props.forwardedRef.current;
  //   if (e.key == "Enter" && this.props.hasCursor && document.activeElement != elt) {
  //     elt.focus();
  //   }
  // }

  onInputKeyDown(e) {
    const value = this.state.value;

    if (e.key === "Backspace") {
      if (!value) {
        e.preventDefault();

        // if user hits Backspace and value field is empty
        // then swith to blob edit, if it was the only field
        // otherwise just remove value field and switch to editing key field
        this.props.focusKeyOrEditBlob();
        return;
      }
    }

    if (e.key == "Escape") {
      // if user hit Esc -- remove focus from input
      // will navigate between items rather than between text characters
      const elt = this.props.forwardedRef.current;
      elt.blur();
    }
  }

  storeValue() {
    if (this.state.value != this.props.initialValue) {
      this.props.onChange(this.state.value);
    }
  }

  onFocus() {
    this.props.setCursor();
  }

  onBlur() {
    this.storeValue();
    // this.props.onChange(this.state.value);

    // if (this.props.hasCursor) {
    //   this.props.clearCursor();
    // }
  }

  render() {
    if (this.state.value == null) { return null; }

    let className = "entry-value";
    if (this.props.hasCursor) { className += " cursor"; }
    if (!this.props.isEffective) { className += " muted"; }

    const style = {width: `${(this.state.value || "").length+2}ch`};
    return <input ref={this.props.forwardedRef} value={this.state.value} onKeyDown={this.onInputKeyDown} onChange={this.updateField} onFocus={this.onFocus} className={className} style={style} onBlur={this.onBlur} />;
  }
}

const EntryValueInput = React.forwardRef((props, ref) => <EntryValueInput0 forwardedRef={ref} {...props} />);



class TreeNodeItem extends React.Component {
  constructor() {
    super();
    this.onClick = this.onClick.bind(this);
    // this.onGlobalKeyDown = this.onGlobalKeyDown.bind(this);
    this.selectAsHovered = this.selectAsHovered.bind(this);
    this.clearHovering = this.clearHovering.bind(this);
    this.updateHovered = this.updateHovered.bind(this);
    this.clickToNavigate = this.clickToNavigate.bind(this);

    this.state = {
      // this variable is used only by toplevel TreeNodeItem
      hoveredId: null,
    };
  }

  componentWillMount() {
    document.addEventListener('keydown', this.onGlobalKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onGlobalKeyDown);
  }

  onClick(e) {
    // nested tree nodes won't have cursor,
    // thus, won't be selected. Only top one
    if (this.props.setCursor) {
      this.props.setCursor();
    }
  }

  selectAsHovered(id, e) {
    // highlight only deepest tree, do not propagate movement event to parents
    e.stopPropagation();

    if (this.props.toplevel) {
      if (this.state.hoveredId != id) {
        this.updateHovered(id);
      }
    } else {
      if (this.props.hoveredId != id) {
        this.props.updateHovered(id);
      }
    }
  }

  clearHovering(e) {
    this.setState({hoveredId: null});
  }

  updateHovered(id) {
    this.setState({hoveredId: id});
  }

  clickToNavigate(path, e) {
    // consider only deepest child click
    e.stopPropagation();

    this.props.navigateToChild(path);
  }

  render() {
    const rows = [];

    for (const i in this.props.value) {
      const { key, ref, value } = this.props.value[i];
      let valueNode = null;

      const path = this.props.path.slice();
      path.push(key);

      if (!value && !!ref) {
        valueNode = <td>...</td>;
      } else if (typeof value == 'string') {
        if (value.indexOf("\n") != -1) {
          valueNode = <td><pre>{value}</pre></td>;
        } else {
          valueNode = <td>{value}</td>;
        }
      } else {
        // only the deepest key-value pair should be highlighted as hovered
        // this is for convenient navigation in the middle of the tree
        const hoveredId = this.props.toplevel ? this.state.hoveredId : this.props.hoveredId;
        const updateHovered = this.props.toplevel ? this.updateHovered : this.props.updateHovered;

        valueNode = <td className="tree-cell">
          <TreeNodeItem path={path} value={value} isEffective={this.props.isEffective} hoveredId={hoveredId} updateHovered={updateHovered} navigateToChild={this.props.navigateToChild} />
        </td>;
      }

      const currentId = path.join("/");
      let className = "entry-tree-pair";
      if (this.props.toplevel) {
        if (this.state.hoveredId == currentId) {
          className += " hovered";
        }
      } else {
        if (this.props.hoveredId == currentId) {
          className += " hovered";
        }
      }

      rows.push(<tr key={i} className={className} onMouseOver={this.selectAsHovered.bind(this, currentId)} onClick={this.clickToNavigate.bind(this, path)}>
        <td>{key}<span className="text-decoration">:&nbsp;</span></td>{valueNode}
      </tr>);
    }

    let className = "entry-tree-value";
    if (this.props.hasCursor) { className += " cursor"; }
    if (!this.props.isEffective) { className += " muted"; }

    const onMouseLeave = this.props.toplevel ? this.clearHovering : undefined;

    return <table onMouseLeave={onMouseLeave} cellSpacing="0" cellPadding="0" className={className} onClick={this.onClick}>
      <tbody>{rows}</tbody>
    </table>;
  }
}



class TreeNodeEditor extends React.Component {
  constructor() {
    super();

    this.renderEntries = this.renderEntries.bind(this);
    this.navigateToChild = this.navigateToChild.bind(this);

    this.state = {
    };

    this._refs = {};

    this._toFocusAfterRender = null;
    this._prevKeyIsColon = false;
  }

  componentWillMount() {
    this.createRefsAndFillInputs(this.props);
  }

  componentWillReceiveProps(props) {
    // this comparison relies on hope that nobody modified data on props.entries reference
    if (props.entries != this.props.entries) {
      this.createRefsAndFillInputs(props);
    }
  }

  createRefsAndFillInputs(props) {
    this._refs = {};

    for (const i in props.entries) {
      const entryId = props.entries[i].id;
      this._refs[`key_${entryId}`] = React.createRef();

      // some of value_* refs might be unused,
      // because we may have tree as a value
      this._refs[`value_${entryId}`] = React.createRef();
    }
  }

  overwriteKey(entryId, value) {
    const idx = this.props.entries.findIndex(({ id }) => id == entryId);
    const entries = this.props.entries.slice();
    entries[idx] = Object.assign({}, entries[idx], { key: value });
    this.props.onChange(entries);
  }

  focusEntryValue(entryId) {
    const idx = this.props.entries.findIndex(({ id }) => (id == entryId));
    this.setCursor([idx, 1]);
  }

  deleteEntryAndFocusPrevious(entryId) {
    console.log("deleteEntryAndFocusPrevious")
    // debugger
    delete this._refs[`key_${entryId}`];
    delete this._refs[`value_${entryId}`];

    const idx = this.props.entries.findIndex(({ id }) => (id == entryId));
    const entries = this.props.entries.slice();
    entries.splice(idx, 1);
    this.props.onChange(entries);

    let entryIdToFocus = null;
    const idxToFocus = (idx <= 0) ? 0 : (idx-1);
    this.setCursor([idxToFocus, 1]);
  }

  focusKeyOrEditBlob(entryId) {
    // if user hits Backspace or Esc and value field is empty
    // then swith to blob edit, if it was the only entry in tree
    // otherwise just remove value field and switch to editing key field
    const idx = this.props.entries.findIndex(({ id }) => (id == entryId));
    const { key } = this.props.entries[idx];

    if (this.props.entries.length == 1) {
      this.props.transformToBlob(key + ":");
    } else {
      this.setCursor([idx, 0]);
    }
  }



  setCursor(key) {
    this.props.setCursor(key);
  }

  navigateToChild(path) {
    this.props.navigateToChild(path);
  }

  overwriteValue(entryId, newValue) {
    const newEntries = [];
    for (const i in this.props.entries) {
      const { id, key, value, ref } = this.props.entries[i];
      if (id == entryId) {
        // since we have overwritten value, old ref would point to old value
        // set ref to null to avoid confusion
        newEntries.push({ id, key, value: newValue, ref: null });
      } else {
        newEntries.push({ id, key, value, ref });
      }
    }

    this.props.onChange(newEntries);
  }

  onClickSetCursor(cursor, e) {
    e.preventDefault();
    // debugger
    this.setCursor(cursor);
  }

  renderEntries() {
    const nodes = [];
    const activeKeys = new Set();
    for (let i in this.props.entries) {
      i = parseInt(i); // for loop gives us strings
      const { id: entryId, key, value } = this.props.entries[i];

      // is this entry stored, or just tempotary displayed for convenience of UI
      const isEffective = !!key && !activeKeys.has(key);
      if (!!key) { activeKeys.add(key); }

      let valueNode = null;

      const keyHasCursor = this.props.cursor && (this.props.cursor[0] == i) && (this.props.cursor[1] == 0);
      const valueHasCursor = this.props.cursor && (this.props.cursor[0] == i) && (this.props.cursor[1] == 1);

      if (typeof value == 'string') {
        valueNode = <EntryValueInput ref={this._refs[`value_${entryId}`]} initialValue={value} hasCursor={valueHasCursor} hasSelection={this.props.isInSelection(i, 1)} isEffective={isEffective} setCursor={this.setCursor.bind(this, [i, 1])} clearCursor={this.setCursor.bind(this, null)} focusKeyOrEditBlob={this.focusKeyOrEditBlob.bind(this, entryId)}  onChange={this.overwriteValue.bind(this, entryId)} />
      } else if (value == null) {
        valueNode = <EntryValueInput ref={this._refs[`value_${entryId}`]} initialValue={""} hasCursor={valueHasCursor} hasSelection={this.props.isInSelection(i, 1)} isEffective={isEffective} setCursor={this.setCursor.bind(this, [i, 1])} clearCursor={this.setCursor.bind(this, null)} focusKeyOrEditBlob={this.focusKeyOrEditBlob.bind(this, entryId)}  onChange={this.overwriteValue.bind(this, entryId)} />
      } else {
        valueNode = <span className="tree-value-container">
          <TreeNodeItem value={value} hasCursor={valueHasCursor} isEffective={isEffective} setCursor={this.setCursor.bind(this, [i, 1])} navigateToChild={this.navigateToChild} path={[key]} toplevel={true} />
        </span>
      }

      let keyClassName = "selectable-cell";
      let valueClassName = "selectable-cell";
      if (this.props.isInSelection(i, 0)) { keyClassName += " selected"; }
      if (this.props.isInSelection(i, 1)) { valueClassName += " selected"; }
      nodes.push(<tr key={entryId}>
        <td onClick={this.onClickSetCursor.bind(this, [i, 0])} className={keyClassName}>
          <EntryKeyInput ref={this._refs[`key_${entryId}`]} initialValue={key} entryValue={value} hasCursor={keyHasCursor} hasSelection={this.props.isInSelection(i, 0)} isEffective={isEffective} setCursor={this.setCursor.bind(this, [i, 0])} clearCursor={this.setCursor.bind(this, null)} onChange={this.overwriteKey.bind(this, entryId)} focusEntryValue={this.focusEntryValue.bind(this, entryId)} deleteEntryAndFocusPrevious={this.deleteEntryAndFocusPrevious.bind(this, entryId)} />
        </td>
        <td onClick={this.onClickSetCursor.bind(this, [i, 1])} className={valueClassName}>
          {valueNode}
        </td>
      </tr>);
    }
    return nodes;
  }

  render() {
    return <div className="tree-node-editor">
      <table cellSpacing="0" cellPadding="0" className="entries">
        <thead><tr><th></th><th></th></tr></thead>
        <tbody>{this.renderEntries()}</tbody>
      </table>
    </div>;
  }
}


// Editor only
class BlobEditor extends React.Component {
  constructor() {
    super();
    this.state = {
    }

    this.onTextareaChange = this.onTextareaChange.bind(this);
    this.onTextareaKeydown = this.onTextareaKeydown.bind(this);

    this._prevKeyIsColon = false;

    this._textareaRef = React.createRef();
  }

  componentDidMount() {
    this._textareaRef.current.focus();
    this.setState({value: this.props.value});
  }

  onTextareaChange(e) {
    this.setState({value: e.target.value});

    if (this._storeTimeout) {
      clearTimeout(this._storeTimeout);
      this._storeTimeout = null;
    }
    this._storeTimeout = setTimeout(() => {
      clearTimeout(this._storeTimeout);
      this.props.onChange(this.state.value);
      this._storeTimeout = null;
    }, 500);
  }

  onTextareaKeydown(e) {
    const isOnelineContent = (this.state.value.indexOf("\n") == -1);
    if (isOnelineContent && e.key == " " && this._prevKeyIsColon) {
      e.preventDefault();
      const withoutColon = this.state.value.slice(0, this.state.value.length-1);
      if (this._storeTimeout) {
        clearTimeout(this._storeTimeout);
        this._storeTimeout = null;
      }
      this.props.transformToTree(withoutColon, "");
    }

    this._prevKeyIsColon = (e.key == ":");
  }

  render() {
    return <div>
      <textarea value={this.state.value} onChange={this.onTextareaChange}
        onKeyDown={this.onTextareaKeydown} ref={this._textareaRef}
        style={{minHeight: 250, minWidth: 400}}
        className="blob-value" />
    </div>;
  }
}
