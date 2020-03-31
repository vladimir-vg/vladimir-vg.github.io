
/*
  Storage.

  All values in Storage have opaque references.

  API:
    Value = Tree | Blob | Reference

    fetchOpts = {
        depth: nLevel,    // number of levels to fetch from tree,
    }

    /// {maxChildren: nCount, maxBlobChildSize: nBytes, maxBlobChunk: nBytes}

    fetch(Reference, path [String], fetchOptions)
      -> Tree | Blob | {Tree, restChildren Reference} | {Blob, restBlob Reference} | NODATA
    fetch(null, path [String], fetchOptions)
      -> Tree | Blob | {Tree, restChildren Reference} | {Blob, restBlob Reference} | NODATA

    // to remove entry user should create new version of parent tree without this entry
    // and overwrite
    update(path [String], Value)
      -> {toplevelRef Reference, childRef Reference}

    transaction(callback)

    removeToplevel(key)

    Some of the edits in tree may require to update two places simultaneously.
    For example commenting out statement in code changes executable source and metadata (comments).
    We need to store two these changes as single change, so user could revert it back in one step.

  When we updated a subtree, should all parent references change? I guess so.

  What if someone changed toplevel tree when we worked with it? Who overwrites values?
  How should we sync? Maybe there should be parallel versions of tree for each user,
  which later could be merged, if there is such a need.

  So, toplevel values would be protected for current session.
  Okay, what if I want to fetch fresh changes made by someone else?
  I gonna ignore this case for a while.

  Idea: all users always work in their personal version of branch that is not possible to
  modify any other user without explicit action from the owner.

*/

const StorageContext = React.createContext(null);

window.ComputeReference = (value) => {
  // value supposed to be either a string or a list of pairs [{key, ref}, ...]
  if (typeof value == 'string') {
    return window.md5("binary-" + value);
  }

  // add prefixes to the hashed string, so that
  // empty node would not equal to empty string

  if (typeof value == 'object') {
    let toBeHashed = "node-";
    for (const i in value) {
      const { key, ref } = value[i];
      if (!key) { console.error("Incorrect value in ref constructor", value); debugger; throw "Error"; }
      if (!ref) { console.error("Incorrect value in ref constructor", value); debugger; throw "Error"; }
      toBeHashed += key + "/" + ref + "\n";
    }

    return window.md5(toBeHashed);
  }
};



// just a constant to compare against
const NO_DATA = window.Symbol("NO_DATA");


class MemStorage {
  constructor() {
    this._storage = {};
  }

  get(key) { return this._storage[key]; }
  set(key, value) { this._storage[key] = value; }
  has(key) { return key in this._storage; }
  del(key) { delete this._storage[key]; }
}


// localStorage
class LSStorage {
  constructor({ prefix }) {
    this._prefix = prefix || '';
  }

  get(key) { return JSON.parse(window.localStorage.getItem(this._prefix+key)); }
  set(key, value) { window.localStorage.setItem(this._prefix+key, JSON.stringify(value)); }
  has(key) { return (null != window.localStorage.getItem(this._prefix+key)); }
  del(key) { window.localStorage.removeItem(this._prefix+key); }
}



class Storage {
  constructor({ objectPrefix }) {
    this._objectStorage = new LSStorage({ prefix: objectPrefix });
  }

  repo({ toplevelPrefix: key }) {
    return new Repo({ storage: this, toplevelPrefix: key});
  }

  set(key, value) { return this._objectStorage.set(key, value); }
  get(key) { return this._objectStorage.get(key); }
  has(key) { return this._objectStorage.has(key); }
}



// simple implementation
// This storage may be replaced
// with better implementation of same interface
class Repo {
  constructor({ toplevelPrefix, storage }) {
    // string -> ref
    // reminds tags or branches in git
    //
    // When tree is changed, toplevel entry is simply overwritten with new ref
    // this._toplevel = {};
    // new LSObjectStorage({prefix: 'toplevel'});
    this._toplevel = new LSStorage({ prefix: toplevelPrefix });
    this._storage = storage;
  }

  storeJSONObject(value) {
    for (const key in value) {
      const { ref } = this._storeJSONObject(value[key]);
      this._toplevel.set(key, ref);
      // this._toplevel[key] = ref;
    }
  }

  _storeJSONObject(value) {
    const valueToStore = [];
    for (const key in value) {
      if (typeof value[key] == 'string') {
        const childRef = window.ComputeReference(value[key]);
        this._storage.set(childRef, { ref: childRef, value: value[key] });
        // this._storage[childRef] = { childRef, value: value[key] };
        valueToStore.push({ key, ref: childRef });
      } else {
        const { ref: childRef, value: storedValue } = this._storeJSONObject(value[key]);
        // this._storage[childRef] = { childRef, value: storedValue };
        this._storage.set(childRef, { ref: childRef, value: storedValue });
        valueToStore.push({ key, ref: childRef });
      }
    }

    valueToStore.sort((a,b) => {
      if (a.key == b.key) { return 0; }
      else if (a.key < b.key) { return -1; }
      else { return 1; }
    });

    const ref = window.ComputeReference(valueToStore);
    this._storage.set(ref, { ref, value: valueToStore });
    // this._storage[ref] = { ref, value: valueToStore };
    return { ref, value: valueToStore };
  }

  // expect value to be a string or to look like that: [{key, ref}, {key, ref}, ...]
  _storeObject(value) {
    if (typeof value == "string") {
      const ref = window.ComputeReference(value);
      this._storage.set(ref, { ref, value });
      // this._storage[ref] = { ref, value };
      return ref;
    }

    let valueToStore;

    // expect array to look like that: [{key, ref} or {key, value}, ...]
    if (Array.isArray(value)) {
      valueToStore = value.slice();

      // convert {key,value} to {key,ref}
      for (const i in valueToStore) {
        let { key, ref, value: value1 } = valueToStore[i];
        if (!key) {
          console.error("Attempt to store entry with empty key", valueToStore[i]);
          throw "Error";
        }
        if (!ref) {
          ref = this._storeObject(value1);
        }
        valueToStore[i] = { key, ref };
      }

    } else {
      console.error("Unknown type of value to store", value);
      throw "Error";
    }

    valueToStore.sort((a,b) => {
      if (a.key == b.key) { return 0; }
      else if (a.key < b.key) { return -1; }
      else { return 1; }
    });

    const ref = window.ComputeReference(valueToStore);
    this._storage.set(ref, { ref, value: valueToStore });
    // this._storage[ref] = { ref, value: valueToStore };
    return ref;
  }

  _deref(ref) {
    if (!this._storage.has(ref)) { debugger }
    console.assert(this._storage.has(ref), "Reference should be present in object storage");
    const { value } = this._storage.get(ref);
    return value;
  }

  // returns promise. In future this implementation may get data from server asynchronously.
  fetch(ref, path, opts) {
    return new Promise((resolve, reject) => {
      if (ref == null && path.length == 0) {
        console.error("Incorrect fetch request", ref, path, opts);
        throw "Error";
      }

      if (ref == null && path.length >= 1) {
        const toplevelKey = path[0];
        const path1 = path.slice(1); // remove first element
        const ref1 = this._toplevel.get(toplevelKey);
        if (!ref1) { resolve(NO_DATA); return; }
        const ref2 = this._findRef(ref1, path1);
        if (ref2 == NO_DATA) { resolve(NO_DATA); return; }
        const result = this._expand(ref2, opts);
        resolve(result);
        return;
      }

      const ref1 = this._findRef(ref, path1);
      if (ref1 == NO_DATA) { resolve(NO_DATA); return; }
      const result = this._expand(ref1, opts);

      resolve(result);
    });
  }

  _expand(ref, opts) {
    opts.depth = (opts.depth || 1);
    // debugger
    const value = this._deref(ref);

    if (typeof value == 'string') {
      return value;
    }

    const output = [];

    for (const i in value) {
      const { key, ref: ref1 } = value[i];
      if (opts.depth > 1) {
        const value1 = this._expand(ref1, Object.assign({}, opts, {depth: opts.depth-1}));
        output.push({key, ref: ref1, value: value1});
      } else {
        output.push({key, ref: ref1});
      }
    }

    return output;
  }

  _findRef(ref, path) {
    console.assert(!!ref, "Non null ref");

    if (path.length == 0) { return ref; }

    const key = path[0];
    const path1 = path.slice(1); // remove first element;
    const value = this._deref(ref);

    // we expect to traverse deeper,
    // but value is a string, does not have children
    // return that there is no data
    if (typeof value == 'string') {
      return NO_DATA;
    }

    for (const i in value) {
      const { key: key1, ref: ref1 } = value[i];
      if (key == key1) {
        return this._findRef(ref1, path1);
      }
    }

    return NO_DATA;
  }



  // returns promise
  update(path, value) {
    return new Promise((resolve, reject) => {
      const toplevelKey = path[0];
      const path1 = path.slice(1, path.length); // without toplevel key

      const childRef = this._storeObject(value);

      let toplevelRef;
      let oldToplevelRef = this._toplevel.get(toplevelKey);
      if (!oldToplevelRef) {
        // empty tree
        oldToplevelRef = this._storeObject([]);
      }
      toplevelRef = this._update(oldToplevelRef, path1, childRef);
      this._toplevel.set(toplevelKey, toplevelRef);

      resolve({ toplevelRef, childRef });
    });
  }

  // returns ref
  // this function does not overwrite toplevel
  // it only constructs new refs
  _update(currentRef, path, valueRef) {
    // if path is empty, we simply return the value
    // toplevel value would be simply replaced
    if (path.length == 0) { return valueRef; }

    const key = path[0];
    const path1 = path.slice(1, path.length);
    const currentTree = this._deref(currentRef);

    let overwritten = false;
    for (const i in currentTree) {
      if (currentTree[i].key == key) {
        currentTree[i].ref = this._update(currentTree[i].ref, path1, valueRef);
        overwritten = true;
        break;
      }
    }

    if (!overwritten) {
      const emptyTree = this._storeObject([]);
      currentTree.push({key, ref: this._update(emptyTree, path1, valueRef)});
    }

    return this._storeObject(currentTree);
  }


  // return promise
  transaction(callback) {
    // allow to run only one transaction per time
    //
    // lock
    // remember all promises of requests that were created during transaction
    // save new references for toplevel entries in special place
    // when all these promises resolve positively overwrite toplevel entries refs
    // unlock
  }



  //
  // convenient editining api that uses fetch and update
  //

  renameKey(ref, path, key) {

  }

  removeEntry(ref, path) {

  }
}
