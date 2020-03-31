
// The idea is to disrupt the order that user have already seen as little as possible.


// takes editor entries and returns two lists
// the ones that should be stored in repo storage
// and others that have no effect and should be stored in personal storage
window.partitionEditorEntries = (entries) => {
  const activeKeys = new Set();
  const active = [], inactive = [];

  for (const i in entries) {
    const { id, key, value, ref } = entries[i];
    if (!key) {
      inactive.push({ id, key, value, ref });
      continue;
    }

    if (activeKeys.has(key)) {
      inactive.push({ id, key, value, ref });
    } else {
      activeKeys.add(key);
      active.push({ id, key, value, ref });
    }
  }

  return { active, inactive };
}



const NODE_TAG = "node-tag";

function uniqueId() {
  return Math.random().toString(36).substring(5);
}


// We need to read/write order of the entries and temporary entries into a user storage.
// Entries are temporary if their key is empty or if entry with such key is already present in the node.
//
// This information is stored as a tree.
// Since the the structure of the information (tree like) and stored content are very similar
// and can be mixed up, we need to use a level of indirection to unambigiously read/write data.
// Therefore, data is stored in following manner:
//
// For example you edit following tree:
//
// parent:
//   child1:
//     key1: value1
//     '': value2         // not stored in repo, since key is empty
//     key2: value3
//     subchild:
//       key3: value5
//     key1: value4       // not stored in repo, since key is already used above
//
// We store order and unsaved data in following manner:
//
// tree:
//   parent:
//     child1:
//      NODE_TAG: unique-id1
//      subchild:
//        NODE_TAG: unique-id2
// nodes:
//   unique-id1:
//     0:
//       key: key1
//     1:
//       key: ''
//       value: value2
//     2:
//       key: key2
//     3:
//       key: subchild
//     4:
//       key: key1
//       value: value4
//   unique-id2:
//     0:
//       key: key3
//

// This function will receive path and return list of positions:
// input: ["parent", "child1"]
// output: [{key: "key1"}, {key: '', value: "value2", ref: Ref}, {key: "key2"}, {key: "subchild"}, {key: "key1", value: "value4", ref: Ref}]
window.readUserEditorInfo = (userRepo, path) => {
  console.log("readUserEditorInfo")
  return new Promise((resolve, _reject) => {
    userRepo.fetch(null, ["tree"].concat(path), { depth: 2 }).then((storageEntries) => {
      if (!storageEntries.length) { resolve([]); return; }

      let id;
      for (const i in storageEntries) {
        if (storageEntries[i].key == NODE_TAG) {
          id = storageEntries[i].value;
          break;
        }
      }

      if (!id) { resolve([]); return; }

      // we got id, now we need to fetch info
      userRepo.fetch(null, ["nodes", id], { depth: 3 }).then((storageEntries2) => {
        // if everything is correctly stored, we need just to return values of the integer keys in exactly same order
        // const elements = storageEntries2.map(({ value }) => value);
        const result = [];

        for (const i in storageEntries2) {
          // key here is just an index: 0, 1, 2, 3, ...
          const { key: idx, value: elements1 } = storageEntries2[i];

          const element = {};
          for (const j in elements1) {
            const { key, value, ref } = elements1[j];
            // debugger
            switch (key) {
            case 'key': element.key = value; break;
            case 'value': element.value = value; element.ref = ref; break;

            default:
              console.log("Unexpected key in userRepo", key);
              throw {
                m: "Unexpected key in userRepo", key,
                elements: storageEntries2
              };
            }

          }
          result.push(element);
        }
        resolve(result);
      });
    });
  });
};



// This function will receive list of editor entries, extract order and temporary values
// and store it
//
// Since user and project repos are located in same storage, thus, use same object storage,
// we can store values into user repo using references from project repo.
window.storeUserEditorInfo = ({ userRepo, projectRepo, path, entries }) => {
  console.log("storeUserEditorInfo")
  const overwriteEntries = (id, resolve) => {
    const activeKeys = new Set();

    const result = [];

    for (const i in entries) {
      const { key, value, ref } = entries[i];

      if (!key) {
        // empty key, not stored in projectRepo
        // store in editor info
        result.push({ key: i, value: [
          {key: 'key', value: key || ''},
          {key: 'value', value: value || ''}
        ]});

      } else if (activeKeys.has(key)) {
        // entry with this key was already stored in projectRepo
        // so this entry is not stored in projectRepo
        // keep it with value in editor info
        result.push({ key: i, value: [
          {key: 'key', value: key},
          {key: 'value', value: value || ''}
        ]});
      } else {
        // if entry is stored in projectRepo
        // no need to store value
        // just keep the key, to keep order of entries
        activeKeys.add(key);
        result.push({ key: i, value: [
          {key: 'key', value: key || ''}
        ]});
      }
    }

    userRepo.update(["nodes", id], result).then(() => {
      resolve();
    })
  };

  return new Promise((resolve, _reject) => {
    userRepo.fetch(null, ["tree"].concat(path), { depth: 1 }).then((storageEntries) => {
      let id;

      if (storageEntries.length) {
        for (const i in storageEntries) {
          if (storageEntries[i].key == NODE_TAG) {
            id = storageEntries[i].value;
            break;
          }
        }
        // if id is already assigned and in user repo
        if (id) {
          overwriteEntries(id, resolve);
          return;
        }
      }

      // this path wasn't stored before
      // we need to generate an id and store it
      id = uniqueId();
      const path1 = ["tree"].concat(path).concat(NODE_TAG);
      userRepo.update(path1, id).then(() => {
        overwriteEntries(id, resolve);
      });
    });
  });
};



// This function receives editor entries, reorders them according to information stored
// in user storage
//
// If editor entries has entry that is not present in user storage then its position is assigned in following manner:
// 1) If entry was first in editor entries, then assign first position to it in user storage.
// 2) Otherwise take previous entry, find its position in user storage, insert this new entry right after it.
//
// if editorInfo has ignored entries with key K and this K is not present anymore in storage,
// then keys for these entries are set to ''. This is needed to avoiding
// adding entry from editorInfo (first one) to storage just by loading editor info.
window.alignEntriesWithEditorInfo = (entries, editorInfo) => {
  console.log("alignEntriesWithEditorInfo")
  const newEntries = [];
  const entries1 = entries.slice();
  for (const i in editorInfo) {
    const { key } = editorInfo[i];

    let found = false;
    // search for same key in current entries:
    for (let j=0; j<entries1.length; j++) {
      if (entries1[j].key == key) {
        // if key is present, just put it there,
        // ignore possible values in editorInfo
        newEntries.push(entries1[j]);
        entries1.splice(j, 1); // remove entry
        found = true;

        // to keep same index for next iteration
        // we need to check entry that have shifted to the j position
        j--;
      }
    }

    if (!found) {
      const { value, ref } = editorInfo[i];
      newEntries.push({ id: uniqueId(), key, value, ref });
    }
  }

  // we still may have entries left
  //
  // lets just append all unexpected entries
  // we can think about more convenient for behaviour for humans later
  for (const i in entries1) {
    const { id, key, value, ref } = entries1[i];
    newEntries.push({ id, key, value, ref });
  }

  for (const i in newEntries) {
    if (!newEntries[i].id) {
      newEntries[i].id = uniqueId();
    }
  }

  return newEntries;

  // for (const i in entries1) {
  //   // this entry was not in editorInfo
  //   const { id, key, value, ref } = entries1[i];
  //   // check previous position of this entry
  //
  //   let prevKey = null;
  //   let saved = false;
  //   for (const j in entries) {
  //     const oldIndex = entries.findIndex(({ key: key1 }) => (key == key1));
  //     if (oldIndex == 0) {
  //       newEntries.splice(0, 0, { id, key, value, ref });
  //     } else {
  //       // we need to take key that was right before this
  //       // and insert this entry right after
  //     }
  //
  //     if (j == 0) {
  //       if (entries[j].key == key) {
  //         newEntries.splice(0, 0, { id, key, value, ref });
  //         saved = true;
  //         break;
  //       } else {
  //         prevKey = entries[j].key;
  //         continue;
  //       }
  //     }
  //
  //     if (entries[j].key == key) {
  //
  //     }
  //   }
  //
  //   if (!saved) {
  //     // This should never happen
  //     throw "Error. Inconsistent work with entries";
  //   }
  // }
};
