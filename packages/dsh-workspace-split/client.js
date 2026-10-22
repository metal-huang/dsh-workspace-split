// GENERATED FILE — edit src/client.js and run `npm run build` instead.
window.__ModuleLoader__.load({
  id: "@local/dsh-workspace-split",
  factory(require) {
    const module = { exports: {} };
    const exports = module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all2) => {
  for (var name in all2)
    __defProp(target, name, { get: all2[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.js
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(client_exports);
var import_react = __toESM(require("react"), 1);

// node_modules/mdast-util-to-string/lib/index.js
var emptyOptions = {};
function toString(value, options) {
  const settings = options || emptyOptions;
  const includeImageAlt = typeof settings.includeImageAlt === "boolean" ? settings.includeImageAlt : true;
  const includeHtml = typeof settings.includeHtml === "boolean" ? settings.includeHtml : true;
  return one(value, includeImageAlt, includeHtml);
}
function one(value, includeImageAlt, includeHtml) {
  if (node(value)) {
    if ("value" in value) {
      return value.type === "html" && !includeHtml ? "" : value.value;
    }
    if (includeImageAlt && "alt" in value && value.alt) {
      return value.alt;
    }
    if ("children" in value) {
      return all(value.children, includeImageAlt, includeHtml);
    }
  }
  if (Array.isArray(value)) {
    return all(value, includeImageAlt, includeHtml);
  }
  return "";
}
function all(values, includeImageAlt, includeHtml) {
  const result = [];
  let index2 = -1;
  while (++index2 < values.length) {
    result[index2] = one(values[index2], includeImageAlt, includeHtml);
  }
  return result.join("");
}
function node(value) {
  return Boolean(value && typeof value === "object");
}

// node_modules/decode-named-character-reference/index.dom.js
var element = document.createElement("i");
function decodeNamedCharacterReference(value) {
  const characterReference2 = "&" + value + ";";
  element.innerHTML = characterReference2;
  const character = element.textContent;
  if (character.charCodeAt(character.length - 1) === 59 && value !== "semi") {
    return false;
  }
  return character === characterReference2 ? false : character;
}

// node_modules/micromark-util-chunked/index.js
function splice(list2, start, remove, items) {
  const end = list2.length;
  let chunkStart = 0;
  let parameters;
  if (start < 0) {
    start = -start > end ? 0 : end + start;
  } else {
    start = start > end ? end : start;
  }
  remove = remove > 0 ? remove : 0;
  if (items.length < 1e4) {
    parameters = Array.from(items);
    parameters.unshift(start, remove);
    list2.splice(...parameters);
  } else {
    if (remove) list2.splice(start, remove);
    while (chunkStart < items.length) {
      parameters = items.slice(chunkStart, chunkStart + 1e4);
      parameters.unshift(start, 0);
      list2.splice(...parameters);
      chunkStart += 1e4;
      start += 1e4;
    }
  }
}
function push(list2, items) {
  if (list2.length > 0) {
    splice(list2, list2.length, 0, items);
    return list2;
  }
  return items;
}

// node_modules/micromark-util-combine-extensions/index.js
var hasOwnProperty = {}.hasOwnProperty;
function combineExtensions(extensions) {
  const all2 = {};
  let index2 = -1;
  while (++index2 < extensions.length) {
    syntaxExtension(all2, extensions[index2]);
  }
  return all2;
}
function syntaxExtension(all2, extension2) {
  let hook;
  for (hook in extension2) {
    const maybe = hasOwnProperty.call(all2, hook) ? all2[hook] : void 0;
    const left = maybe || (all2[hook] = {});
    const right = extension2[hook];
    let code2;
    if (right) {
      for (code2 in right) {
        if (!hasOwnProperty.call(left, code2)) left[code2] = [];
        const value = right[code2];
        constructs(
          // @ts-expect-error Looks like a list.
          left[code2],
          Array.isArray(value) ? value : value ? [value] : []
        );
      }
    }
  }
}
function constructs(existing, list2) {
  let index2 = -1;
  const before = [];
  while (++index2 < list2.length) {
    ;
    (list2[index2].add === "after" ? existing : before).push(list2[index2]);
  }
  splice(existing, 0, 0, before);
}

// node_modules/micromark-util-decode-numeric-character-reference/index.js
function decodeNumericCharacterReference(value, base) {
  const code2 = Number.parseInt(value, base);
  if (
    // C0 except for HT, LF, FF, CR, space.
    code2 < 9 || code2 === 11 || code2 > 13 && code2 < 32 || // Control character (DEL) of C0, and C1 controls.
    code2 > 126 && code2 < 160 || // Lone high surrogates and low surrogates.
    code2 > 55295 && code2 < 57344 || // Noncharacters.
    code2 > 64975 && code2 < 65008 || /* eslint-disable no-bitwise */
    (code2 & 65535) === 65535 || (code2 & 65535) === 65534 || /* eslint-enable no-bitwise */
    // Out of range
    code2 > 1114111
  ) {
    return "\uFFFD";
  }
  return String.fromCodePoint(code2);
}

// node_modules/micromark-util-normalize-identifier/index.js
function normalizeIdentifier(value) {
  return value.replace(/[\t\n\r ]+/g, " ").replace(/^ | $/g, "").toLowerCase().toUpperCase();
}

// node_modules/micromark-util-character/index.js
var asciiAlpha = regexCheck(/[A-Za-z]/);
var asciiAlphanumeric = regexCheck(/[\dA-Za-z]/);
var asciiAtext = regexCheck(/[#-'*+\--9=?A-Z^-~]/);
function asciiControl(code2) {
  return (
    // Special whitespace codes (which have negative values), C0 and Control
    // character DEL
    code2 !== null && (code2 < 32 || code2 === 127)
  );
}
var asciiDigit = regexCheck(/\d/);
var asciiHexDigit = regexCheck(/[\dA-Fa-f]/);
var asciiPunctuation = regexCheck(/[!-/:-@[-`{-~]/);
function markdownLineEnding(code2) {
  return code2 !== null && code2 < -2;
}
function markdownLineEndingOrSpace(code2) {
  return code2 !== null && (code2 < 0 || code2 === 32);
}
function markdownSpace(code2) {
  return code2 === -2 || code2 === -1 || code2 === 32;
}
var unicodePunctuation = regexCheck(/\p{P}|\p{S}/u);
var unicodeWhitespace = regexCheck(/\s/);
function regexCheck(regex) {
  return check;
  function check(code2) {
    return code2 !== null && code2 > -1 && regex.test(String.fromCharCode(code2));
  }
}

// node_modules/micromark-factory-space/index.js
function factorySpace(effects, ok3, type, max) {
  const limit = max ? max - 1 : Infinity;
  let size = 0;
  return start;
  function start(code2) {
    if (markdownSpace(code2)) {
      effects.enter(type);
      return prefix(code2);
    }
    return ok3(code2);
  }
  function prefix(code2) {
    if (markdownSpace(code2) && size++ < limit) {
      effects.consume(code2);
      return prefix;
    }
    effects.exit(type);
    return ok3(code2);
  }
}
function factorySpaceMinMax(effects, ok3, nok, type, min, max) {
  let size = 0;
  return start;
  function start(code2) {
    if (max > 0 && markdownSpace(code2)) {
      effects.enter(type);
      return prefix(code2);
    }
    return after(code2);
  }
  function prefix(code2) {
    if (markdownSpace(code2) && size < max) {
      effects.consume(code2);
      size++;
      return prefix;
    }
    effects.exit(type);
    return after(code2);
  }
  function after(code2) {
    return size >= min ? ok3(code2) : nok(code2);
  }
}

// node_modules/micromark/lib/initialize/content.js
var content = {
  tokenize: initializeContent
};
function initializeContent(effects) {
  const contentStart = effects.attempt(this.parser.constructs.contentInitial, afterContentStartConstruct, paragraphInitial);
  let previous4;
  return contentStart;
  function afterContentStartConstruct(code2) {
    if (code2 === null) {
      effects.consume(code2);
      return;
    }
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return factorySpace(effects, contentStart, "linePrefix");
  }
  function paragraphInitial(code2) {
    effects.enter("paragraph");
    return lineStart(code2);
  }
  function lineStart(code2) {
    const token = effects.enter("chunkText", {
      contentType: "text",
      previous: previous4
    });
    if (previous4) {
      previous4.next = token;
    }
    previous4 = token;
    return data(code2);
  }
  function data(code2) {
    if (code2 === null) {
      effects.exit("chunkText");
      effects.exit("paragraph");
      effects.consume(code2);
      return;
    }
    if (markdownLineEnding(code2)) {
      effects.consume(code2);
      effects.exit("chunkText");
      return lineStart;
    }
    effects.consume(code2);
    return data;
  }
}

// node_modules/micromark-util-edit-map/index.js
var EditMap = class {
  /**
   * Create a new edit map.
   *
   * @returns
   *   New instance.
   */
  constructor() {
    this.index = /* @__PURE__ */ new Map();
    this.map = [];
  }
  /**
   * Create an edit: a remove and/or add at a certain place.
   *
   * @param {number} index
   *   Index at which to apply the edit.
   * @param {number} remove
   *   Count of items to remove at the index.
   * @param {Array<Event>} add
   *   Items to add at the index.
   * @returns {undefined}
   *   Nothing.
   */
  add(index2, remove, add) {
    addImplementation(this, index2, remove, add, false);
  }
  /**
   * Create an edit: but insert `add` before existing additions, instead of
   * after them.
   *
   * @param {number} index
   *   Index at which to apply the edit.
   * @param {number} remove
   *   Count of items to remove at the index.
   * @param {Array<Event>} add
   *   Items to add at the index.
   * @returns {undefined}
   *   Nothing.
   */
  addBefore(index2, remove, add) {
    addImplementation(this, index2, remove, add, true);
  }
  /**
   * Done, change the events.
   *
   * @param {Array<Event>} events
   *   List of events to apply the edits to.
   * @returns {undefined}
   *   Nothing.
   */
  consume(events) {
    this.map.sort(function(a, b) {
      return a[0] - b[0];
    });
    if (this.map.length === 0) {
      return;
    }
    let index2 = this.map.length;
    const vecs = [];
    while (index2 > 0) {
      index2 -= 1;
      vecs.push(events.slice(this.map[index2][0] + this.map[index2][1]), this.map[index2][2]);
      events.length = this.map[index2][0];
    }
    vecs.push(events.slice());
    events.length = 0;
    let slice = vecs.pop();
    while (slice) {
      for (const element2 of slice) {
        events.push(element2);
      }
      slice = vecs.pop();
    }
    this.map.length = 0;
    this.index.clear();
  }
};
function addImplementation(editMap, at, remove, add, before) {
  if (remove === 0 && add.length === 0) {
    return;
  }
  const existing = editMap.index.get(at);
  if (existing) {
    existing[1] += remove;
    if (before) {
      add.push(...existing[2]);
      existing[2] = add;
    } else {
      existing[2].push(...add);
    }
    return;
  }
  const change = [at, remove, add];
  editMap.map.push(change);
  editMap.index.set(at, change);
}

// node_modules/micromark/lib/initialize/document.js
var document2 = {
  tokenize: initializeDocument
};
var containerConstruct = {
  tokenize: tokenizeContainer
};
function initializeDocument(effects) {
  const self = this;
  const stack = [];
  let continued = 0;
  let childFlow;
  let childToken;
  let lineStartOffset;
  return start;
  function start(code2) {
    if (continued < stack.length) {
      const item = stack[continued];
      self.containerState = item[1];
      return effects.attempt(item[0].continuation, documentContinue, checkNewContainers)(code2);
    }
    return checkNewContainers(code2);
  }
  function documentContinue(code2) {
    continued++;
    if (self.containerState._closeFlow) {
      self.containerState._closeFlow = void 0;
      if (childFlow) {
        closeFlow();
      }
      const indexBeforeExits = self.events.length;
      let indexBeforeFlow = indexBeforeExits;
      let point3;
      while (indexBeforeFlow--) {
        if (self.events[indexBeforeFlow][0] === "exit" && self.events[indexBeforeFlow][1].type === "chunkFlow") {
          point3 = self.events[indexBeforeFlow][1].end;
          break;
        }
      }
      exitContainers(continued);
      let index2 = indexBeforeExits;
      while (index2 < self.events.length) {
        self.events[index2][1].end = {
          ...point3
        };
        index2++;
      }
      const editMap = new EditMap();
      editMap.add(indexBeforeFlow + 1, 0, self.events.slice(indexBeforeExits));
      editMap.add(indexBeforeExits, index2 - indexBeforeExits, []);
      editMap.consume(self.events);
      return checkNewContainers(code2);
    }
    return start(code2);
  }
  function checkNewContainers(code2) {
    if (continued === stack.length) {
      if (!childFlow) {
        return documentContinued(code2);
      }
      if (childFlow.currentConstruct && childFlow.currentConstruct.concrete) {
        return flowStart(code2);
      }
      self.interrupt = Boolean(childFlow.currentConstruct && !childFlow._gfmTableDynamicInterruptHack);
    }
    self.containerState = {};
    return effects.check(containerConstruct, thereIsANewContainer, thereIsNoNewContainer)(code2);
  }
  function thereIsANewContainer(code2) {
    if (childFlow) {
      closeFlow();
    }
    exitContainers(continued);
    return documentContinued(code2);
  }
  function thereIsNoNewContainer(code2) {
    self.parser.lazy[self.now().line] = continued !== stack.length;
    lineStartOffset = self.now().offset;
    return flowStart(code2);
  }
  function documentContinued(code2) {
    self.containerState = {};
    return effects.attempt(containerConstruct, containerContinue, flowStart)(code2);
  }
  function containerContinue(code2) {
    continued++;
    stack.push([self.currentConstruct, self.containerState]);
    return documentContinued(code2);
  }
  function flowStart(code2) {
    if (code2 === null) {
      if (childFlow) {
        closeFlow();
      }
      exitContainers(0);
      effects.consume(code2);
      return;
    }
    childFlow = childFlow || self.parser.flow(self.now());
    effects.enter("chunkFlow", {
      _tokenizer: childFlow,
      contentType: "flow",
      previous: childToken
    });
    return flowContinue(code2);
  }
  function flowContinue(code2) {
    if (code2 === null) {
      writeToChild(effects.exit("chunkFlow"), true);
      exitContainers(0);
      effects.consume(code2);
      return;
    }
    if (markdownLineEnding(code2)) {
      effects.consume(code2);
      writeToChild(effects.exit("chunkFlow"));
      continued = 0;
      self.interrupt = void 0;
      return start;
    }
    effects.consume(code2);
    return flowContinue;
  }
  function writeToChild(token, endOfFile) {
    const stream = self.sliceStream(token);
    if (endOfFile) {
      stream.push(null);
    }
    token.previous = childToken;
    if (childToken) {
      childToken.next = token;
    }
    childToken = token;
    childFlow.defineSkip(token.start);
    childFlow.write(stream);
    if (self.parser.lazy[token.start.line]) {
      let index2 = childFlow.events.length;
      while (index2--) {
        if (
          // The token starts before the line ending…
          childFlow.events[index2][1].start.offset < lineStartOffset && // …and either is not ended yet…
          (!childFlow.events[index2][1].end || // …or ends after it.
          childFlow.events[index2][1].end.offset > lineStartOffset)
        ) {
          return;
        }
      }
      const indexBeforeExits = self.events.length;
      let indexBeforeFlow = indexBeforeExits;
      let seen;
      let point3;
      while (indexBeforeFlow--) {
        if (self.events[indexBeforeFlow][0] === "exit" && self.events[indexBeforeFlow][1].type === "chunkFlow") {
          if (seen) {
            point3 = self.events[indexBeforeFlow][1].end;
            break;
          }
          seen = true;
        }
      }
      exitContainers(continued);
      index2 = indexBeforeExits;
      while (index2 < self.events.length) {
        self.events[index2][1].end = {
          ...point3
        };
        index2++;
      }
      const editMap = new EditMap();
      editMap.add(indexBeforeFlow + 1, 0, self.events.slice(indexBeforeExits));
      editMap.add(indexBeforeExits, index2 - indexBeforeExits, []);
      editMap.consume(self.events);
    }
  }
  function exitContainers(size) {
    let index2 = stack.length;
    while (index2-- > size) {
      const entry = stack[index2];
      self.containerState = entry[1];
      entry[0].exit.call(self, effects);
    }
    stack.length = size;
  }
  function closeFlow() {
    childFlow.write([null]);
    childToken = void 0;
    childFlow = void 0;
    self.containerState._closeFlow = void 0;
  }
}
function tokenizeContainer(effects, ok3, nok) {
  return factorySpace(effects, effects.attempt(this.parser.constructs.document, ok3, nok), "linePrefix", this.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4);
}

// node_modules/micromark-util-classify-character/index.js
function classifyCharacter(code2) {
  if (code2 === null || markdownLineEndingOrSpace(code2) || unicodeWhitespace(code2)) {
    return 1;
  }
  if (unicodePunctuation(code2)) {
    return 2;
  }
}

// node_modules/micromark-util-resolve-all/index.js
function resolveAll(constructs2, events, context) {
  const called = [];
  let index2 = -1;
  while (++index2 < constructs2.length) {
    const resolve = constructs2[index2].resolveAll;
    if (resolve && !called.includes(resolve)) {
      events = resolve(events, context);
      called.push(resolve);
    }
  }
  return events;
}

// node_modules/micromark-core-commonmark/lib/attention.js
var attention = {
  name: "attention",
  resolveAll: resolveAllAttention,
  tokenize: tokenizeAttention
};
function resolveAllAttention(events, context) {
  let index2 = -1;
  let nextEvents;
  while (++index2 < events.length) {
    if (events[index2][0] === "enter" && events[index2][1].type === "attentionSequence" && events[index2][1]._close) {
      let open = index2;
      while (open--) {
        if (events[open][0] === "exit" && events[open][1].type === "attentionSequence" && events[open][1]._open && // If the markers are the same:
        context.sliceSerialize(events[open][1]).charCodeAt(0) === context.sliceSerialize(events[index2][1]).charCodeAt(0)) {
          if ((events[open][1]._close || events[index2][1]._open) && (events[index2][1].end.offset - events[index2][1].start.offset) % 3 && !((events[open][1].end.offset - events[open][1].start.offset + events[index2][1].end.offset - events[index2][1].start.offset) % 3)) {
            continue;
          }
          const use = events[open][1].end.offset - events[open][1].start.offset > 1 && events[index2][1].end.offset - events[index2][1].start.offset > 1 ? 2 : 1;
          const start = {
            ...events[open][1].end
          };
          const end = {
            ...events[index2][1].start
          };
          movePoint(start, -use);
          movePoint(end, use);
          const openingSequence = {
            type: use > 1 ? "strongSequence" : "emphasisSequence",
            start,
            end: {
              ...events[open][1].end
            }
          };
          const closingSequence = {
            type: use > 1 ? "strongSequence" : "emphasisSequence",
            start: {
              ...events[index2][1].start
            },
            end
          };
          const text4 = {
            type: use > 1 ? "strongText" : "emphasisText",
            start: {
              ...events[open][1].end
            },
            end: {
              ...events[index2][1].start
            }
          };
          const group = {
            type: use > 1 ? "strong" : "emphasis",
            start: {
              ...openingSequence.start
            },
            end: {
              ...closingSequence.end
            }
          };
          events[open][1].end = {
            ...openingSequence.start
          };
          events[index2][1].start = {
            ...closingSequence.end
          };
          nextEvents = [];
          if (events[open][1].end.offset - events[open][1].start.offset) {
            nextEvents = push(nextEvents, [["enter", events[open][1], context], ["exit", events[open][1], context]]);
          }
          nextEvents = push(nextEvents, [["enter", group, context], ["enter", openingSequence, context], ["exit", openingSequence, context], ["enter", text4, context]]);
          nextEvents = push(nextEvents, resolveAll(context.parser.constructs.insideSpan.null, events.slice(open + 1, index2), context));
          nextEvents = push(nextEvents, [["exit", text4, context], ["enter", closingSequence, context], ["exit", closingSequence, context], ["exit", group, context]]);
          let offset = 0;
          if (events[index2][1].end.offset - events[index2][1].start.offset) {
            offset = 2;
            nextEvents = push(nextEvents, [["enter", events[index2][1], context], ["exit", events[index2][1], context]]);
          }
          splice(events, open - 1, index2 - open + 3, nextEvents);
          index2 = open + nextEvents.length - offset - 2;
          break;
        }
      }
    }
  }
  index2 = -1;
  while (++index2 < events.length) {
    if (events[index2][1].type === "attentionSequence") {
      events[index2][1].type = "data";
    }
  }
  return events;
}
function tokenizeAttention(effects, ok3) {
  const attentionMarkers2 = this.parser.constructs.attentionMarkers.null;
  const previous4 = this.previous;
  const before = classifyCharacter(previous4);
  let marker;
  return start;
  function start(code2) {
    marker = code2;
    effects.enter("attentionSequence");
    return inside(code2);
  }
  function inside(code2) {
    if (code2 === marker) {
      effects.consume(code2);
      return inside;
    }
    const token = effects.exit("attentionSequence");
    const after = classifyCharacter(code2);
    const open = !after || after === 2 && before || attentionMarkers2.includes(code2) && code2 !== 42 && code2 !== 95;
    const close = !before || before === 2 && after || attentionMarkers2.includes(previous4) && previous4 !== 42 && previous4 !== 95;
    token._open = Boolean(marker === 42 ? open : open && (before || !close));
    token._close = Boolean(marker === 42 ? close : close && (after || !open));
    return ok3(code2);
  }
}
function movePoint(point3, offset) {
  point3.column += offset;
  point3.offset += offset;
  point3._bufferIndex += offset;
}

// node_modules/micromark-core-commonmark/lib/autolink.js
var autolink = {
  name: "autolink",
  tokenize: tokenizeAutolink
};
function tokenizeAutolink(effects, ok3, nok) {
  let size = 0;
  return start;
  function start(code2) {
    effects.enter("autolink");
    effects.enter("autolinkMarker");
    effects.consume(code2);
    effects.exit("autolinkMarker");
    effects.enter("autolinkProtocol");
    return open;
  }
  function open(code2) {
    if (asciiAlpha(code2)) {
      effects.consume(code2);
      return schemeOrEmailAtext;
    }
    if (code2 === 64) {
      return nok(code2);
    }
    return emailAtext(code2);
  }
  function schemeOrEmailAtext(code2) {
    if (code2 === 43 || code2 === 45 || code2 === 46 || asciiAlphanumeric(code2)) {
      size = 1;
      return schemeInsideOrEmailAtext(code2);
    }
    return emailAtext(code2);
  }
  function schemeInsideOrEmailAtext(code2) {
    if (code2 === 58) {
      effects.consume(code2);
      size = 0;
      return urlInside;
    }
    if ((code2 === 43 || code2 === 45 || code2 === 46 || asciiAlphanumeric(code2)) && size++ < 32) {
      effects.consume(code2);
      return schemeInsideOrEmailAtext;
    }
    size = 0;
    return emailAtext(code2);
  }
  function urlInside(code2) {
    if (code2 === 62) {
      effects.exit("autolinkProtocol");
      effects.enter("autolinkMarker");
      effects.consume(code2);
      effects.exit("autolinkMarker");
      effects.exit("autolink");
      return ok3;
    }
    if (code2 === null || code2 === 32 || code2 === 60 || asciiControl(code2)) {
      return nok(code2);
    }
    effects.consume(code2);
    return urlInside;
  }
  function emailAtext(code2) {
    if (code2 === 64) {
      effects.consume(code2);
      return emailAtSignOrDot;
    }
    if (asciiAtext(code2)) {
      effects.consume(code2);
      return emailAtext;
    }
    return nok(code2);
  }
  function emailAtSignOrDot(code2) {
    return asciiAlphanumeric(code2) ? emailLabel(code2) : nok(code2);
  }
  function emailLabel(code2) {
    if (code2 === 46) {
      effects.consume(code2);
      size = 0;
      return emailAtSignOrDot;
    }
    if (code2 === 62) {
      effects.exit("autolinkProtocol").type = "autolinkEmail";
      effects.enter("autolinkMarker");
      effects.consume(code2);
      effects.exit("autolinkMarker");
      effects.exit("autolink");
      return ok3;
    }
    return emailValue(code2);
  }
  function emailValue(code2) {
    if ((code2 === 45 || asciiAlphanumeric(code2)) && size++ < 63) {
      const next = code2 === 45 ? emailValue : emailLabel;
      effects.consume(code2);
      return next;
    }
    return nok(code2);
  }
}

// node_modules/micromark-core-commonmark/lib/blank-line.js
var blankLine = {
  partial: true,
  tokenize: tokenizeBlankLine
};
function tokenizeBlankLine(effects, ok3, nok) {
  return start;
  function start(code2) {
    return markdownSpace(code2) ? factorySpace(effects, after, "linePrefix")(code2) : after(code2);
  }
  function after(code2) {
    return code2 === null || markdownLineEnding(code2) ? ok3(code2) : nok(code2);
  }
}

// node_modules/micromark-core-commonmark/lib/block-quote.js
var blockQuote = {
  continuation: {
    tokenize: tokenizeBlockQuoteContinuation
  },
  exit,
  name: "blockQuote",
  tokenize: tokenizeBlockQuoteStart
};
function tokenizeBlockQuoteStart(effects, ok3, nok) {
  const self = this;
  return start;
  function start(code2) {
    if (code2 === 62) {
      const state = self.containerState;
      if (!state.open) {
        effects.enter("blockQuote", {
          _container: true
        });
        state.open = true;
      }
      effects.enter("blockQuotePrefix");
      effects.enter("blockQuoteMarker");
      effects.consume(code2);
      effects.exit("blockQuoteMarker");
      return after;
    }
    return nok(code2);
  }
  function after(code2) {
    if (markdownSpace(code2)) {
      effects.enter("blockQuotePrefixWhitespace");
      effects.consume(code2);
      effects.exit("blockQuotePrefixWhitespace");
      effects.exit("blockQuotePrefix");
      return ok3;
    }
    effects.exit("blockQuotePrefix");
    return ok3(code2);
  }
}
function tokenizeBlockQuoteContinuation(effects, ok3, nok) {
  const self = this;
  return contStart;
  function contStart(code2) {
    if (markdownSpace(code2)) {
      return factorySpace(effects, contBefore, "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code2);
    }
    return contBefore(code2);
  }
  function contBefore(code2) {
    return effects.attempt(blockQuote, ok3, nok)(code2);
  }
}
function exit(effects) {
  effects.exit("blockQuote");
}

// node_modules/micromark-core-commonmark/lib/character-escape.js
var characterEscape = {
  name: "characterEscape",
  tokenize: tokenizeCharacterEscape
};
function tokenizeCharacterEscape(effects, ok3, nok) {
  return start;
  function start(code2) {
    effects.enter("characterEscape");
    effects.enter("escapeMarker");
    effects.consume(code2);
    effects.exit("escapeMarker");
    return inside;
  }
  function inside(code2) {
    if (asciiPunctuation(code2)) {
      effects.enter("characterEscapeValue");
      effects.consume(code2);
      effects.exit("characterEscapeValue");
      effects.exit("characterEscape");
      return ok3;
    }
    return nok(code2);
  }
}

// node_modules/micromark-core-commonmark/lib/character-reference.js
var characterReference = {
  name: "characterReference",
  tokenize: tokenizeCharacterReference
};
function tokenizeCharacterReference(effects, ok3, nok) {
  const self = this;
  let size = 0;
  let max;
  let test;
  return start;
  function start(code2) {
    effects.enter("characterReference");
    effects.enter("characterReferenceMarker");
    effects.consume(code2);
    effects.exit("characterReferenceMarker");
    return open;
  }
  function open(code2) {
    if (code2 === 35) {
      effects.enter("characterReferenceMarkerNumeric");
      effects.consume(code2);
      effects.exit("characterReferenceMarkerNumeric");
      return numeric;
    }
    effects.enter("characterReferenceValue");
    max = 31;
    test = asciiAlphanumeric;
    return value(code2);
  }
  function numeric(code2) {
    if (code2 === 88 || code2 === 120) {
      effects.enter("characterReferenceMarkerHexadecimal");
      effects.consume(code2);
      effects.exit("characterReferenceMarkerHexadecimal");
      effects.enter("characterReferenceValue");
      max = 6;
      test = asciiHexDigit;
      return value;
    }
    effects.enter("characterReferenceValue");
    max = 7;
    test = asciiDigit;
    return value(code2);
  }
  function value(code2) {
    if (code2 === 59 && size) {
      const token = effects.exit("characterReferenceValue");
      if (test === asciiAlphanumeric && !decodeNamedCharacterReference(self.sliceSerialize(token))) {
        return nok(code2);
      }
      effects.enter("characterReferenceMarker");
      effects.consume(code2);
      effects.exit("characterReferenceMarker");
      effects.exit("characterReference");
      return ok3;
    }
    if (test(code2) && size++ < max) {
      effects.consume(code2);
      return value;
    }
    return nok(code2);
  }
}

// node_modules/micromark-core-commonmark/lib/partial-non-lazy-continuation.js
var nonLazyContinuation = {
  partial: true,
  tokenize: tokenizeNonLazyContinuation
};
function tokenizeNonLazyContinuation(effects, ok3, nok) {
  const self = this;
  return start;
  function start(code2) {
    if (code2 === null) {
      return nok(code2);
    }
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return after;
  }
  function after(code2) {
    return self.parser.lazy[self.now().line] ? nok(code2) : ok3(code2);
  }
}

// node_modules/micromark-core-commonmark/lib/code-fenced.js
var codeFenced = {
  concrete: true,
  name: "codeFenced",
  tokenize: tokenizeCodeFenced
};
function tokenizeCodeFenced(effects, ok3, nok) {
  const self = this;
  const closeStart = {
    partial: true,
    tokenize: tokenizeCloseStart
  };
  let initialPrefix = 0;
  let sizeOpen = 0;
  let marker;
  return start;
  function start(code2) {
    return beforeSequenceOpen(code2);
  }
  function beforeSequenceOpen(code2) {
    const tail = self.events[self.events.length - 1];
    initialPrefix = tail && tail[1].type === "linePrefix" ? tail[2].sliceSerialize(tail[1], true).length : 0;
    marker = code2;
    effects.enter("codeFenced");
    effects.enter("codeFencedFence");
    effects.enter("codeFencedFenceSequence");
    return sequenceOpen(code2);
  }
  function sequenceOpen(code2) {
    if (code2 === marker) {
      sizeOpen++;
      effects.consume(code2);
      return sequenceOpen;
    }
    if (sizeOpen < 3) {
      return nok(code2);
    }
    effects.exit("codeFencedFenceSequence");
    return markdownSpace(code2) ? factorySpace(effects, infoBefore, "whitespace")(code2) : infoBefore(code2);
  }
  function infoBefore(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("codeFencedFence");
      return self.interrupt ? ok3(code2) : effects.check(nonLazyContinuation, atNonLazyBreak, after)(code2);
    }
    effects.enter("codeFencedFenceInfo");
    effects.enter("chunkString", {
      contentType: "string"
    });
    return info(code2);
  }
  function info(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("chunkString");
      effects.exit("codeFencedFenceInfo");
      return infoBefore(code2);
    }
    if (markdownSpace(code2)) {
      effects.exit("chunkString");
      effects.exit("codeFencedFenceInfo");
      return factorySpace(effects, metaBefore, "whitespace")(code2);
    }
    if (code2 === 96 && code2 === marker) {
      return nok(code2);
    }
    effects.consume(code2);
    return info;
  }
  function metaBefore(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      return infoBefore(code2);
    }
    effects.enter("codeFencedFenceMeta");
    effects.enter("chunkString", {
      contentType: "string"
    });
    return meta(code2);
  }
  function meta(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("chunkString");
      effects.exit("codeFencedFenceMeta");
      return infoBefore(code2);
    }
    if (code2 === 96 && code2 === marker) {
      return nok(code2);
    }
    effects.consume(code2);
    return meta;
  }
  function atNonLazyBreak(code2) {
    return effects.attempt(closeStart, after, contentBefore)(code2);
  }
  function contentBefore(code2) {
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return contentStart;
  }
  function contentStart(code2) {
    return initialPrefix > 0 && markdownSpace(code2) ? factorySpace(effects, beforeContentChunk, "linePrefix", initialPrefix + 1)(code2) : beforeContentChunk(code2);
  }
  function beforeContentChunk(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      return effects.check(nonLazyContinuation, atNonLazyBreak, after)(code2);
    }
    effects.enter("codeFlowValue");
    return contentChunk(code2);
  }
  function contentChunk(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("codeFlowValue");
      return beforeContentChunk(code2);
    }
    effects.consume(code2);
    return contentChunk;
  }
  function after(code2) {
    effects.exit("codeFenced");
    return ok3(code2);
  }
  function tokenizeCloseStart(effects2, ok4, nok2) {
    let size = 0;
    return startBefore;
    function startBefore(code2) {
      effects2.enter("lineEnding");
      effects2.consume(code2);
      effects2.exit("lineEnding");
      return start2;
    }
    function start2(code2) {
      effects2.enter("codeFencedFence");
      return markdownSpace(code2) ? factorySpace(effects2, beforeSequenceClose, "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code2) : beforeSequenceClose(code2);
    }
    function beforeSequenceClose(code2) {
      if (code2 === marker) {
        effects2.enter("codeFencedFenceSequence");
        return sequenceClose(code2);
      }
      return nok2(code2);
    }
    function sequenceClose(code2) {
      if (code2 === marker) {
        size++;
        effects2.consume(code2);
        return sequenceClose;
      }
      if (size >= sizeOpen) {
        effects2.exit("codeFencedFenceSequence");
        return markdownSpace(code2) ? factorySpace(effects2, sequenceCloseAfter, "whitespace")(code2) : sequenceCloseAfter(code2);
      }
      return nok2(code2);
    }
    function sequenceCloseAfter(code2) {
      if (code2 === null || markdownLineEnding(code2)) {
        effects2.exit("codeFencedFence");
        return ok4(code2);
      }
      return nok2(code2);
    }
  }
}

// node_modules/micromark-core-commonmark/lib/code-indented.js
var codeIndented = {
  name: "codeIndented",
  tokenize: tokenizeCodeIndented
};
var furtherStart = {
  partial: true,
  tokenize: tokenizeFurtherStart
};
function tokenizeCodeIndented(effects, ok3, nok) {
  return start;
  function start(code2) {
    effects.enter("codeIndented");
    return factorySpaceMinMax(effects, atBreak, nok, "linePrefix", 4, 4)(code2);
  }
  function atBreak(code2) {
    if (code2 === null) {
      return after(code2);
    }
    if (markdownLineEnding(code2)) {
      return effects.attempt(furtherStart, atBreak, after)(code2);
    }
    effects.enter("codeFlowValue");
    return inside(code2);
  }
  function inside(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("codeFlowValue");
      return atBreak(code2);
    }
    effects.consume(code2);
    return inside;
  }
  function after(code2) {
    effects.exit("codeIndented");
    return ok3(code2);
  }
}
function tokenizeFurtherStart(effects, ok3, nok) {
  const self = this;
  return furtherStart2;
  function furtherStart2(code2) {
    if (self.parser.lazy[self.now().line]) {
      return nok(code2);
    }
    if (markdownLineEnding(code2)) {
      effects.enter("lineEnding");
      effects.consume(code2);
      effects.exit("lineEnding");
      return furtherStart2;
    }
    return factorySpaceMinMax(effects, ok3, onNotEnoughPrefix, "linePrefix", 4, 4)(code2);
  }
  function onNotEnoughPrefix(code2) {
    return markdownLineEnding(code2) ? furtherStart2(code2) : nok(code2);
  }
}

// node_modules/micromark-core-commonmark/lib/code-text.js
var codeText = {
  name: "codeText",
  previous,
  resolve: resolveCodeText,
  tokenize: tokenizeCodeText
};
function resolveCodeText(events) {
  let tailExitIndex = events.length - 4;
  let headEnterIndex = 3;
  let index2;
  let enter;
  if ((events[headEnterIndex][1].type === "lineEnding" || events[headEnterIndex][1].type === "space") && (events[tailExitIndex][1].type === "lineEnding" || events[tailExitIndex][1].type === "space")) {
    index2 = headEnterIndex;
    while (++index2 < tailExitIndex) {
      if (events[index2][1].type === "codeTextData") {
        events[headEnterIndex][1].type = "codeTextPadding";
        events[tailExitIndex][1].type = "codeTextPadding";
        headEnterIndex += 2;
        tailExitIndex -= 2;
        break;
      }
    }
  }
  index2 = headEnterIndex - 1;
  tailExitIndex++;
  while (++index2 <= tailExitIndex) {
    if (enter === void 0) {
      if (index2 !== tailExitIndex && events[index2][1].type !== "lineEnding") {
        enter = index2;
      }
    } else if (index2 === tailExitIndex || events[index2][1].type === "lineEnding") {
      events[enter][1].type = "codeTextData";
      if (index2 !== enter + 2) {
        events[enter][1].end = events[index2 - 1][1].end;
        events.splice(enter + 2, index2 - enter - 2);
        tailExitIndex -= index2 - enter - 2;
        index2 = enter + 2;
      }
      enter = void 0;
    }
  }
  return events;
}
function previous(code2) {
  return code2 !== 96 || this.events[this.events.length - 1][1].type === "characterEscape";
}
function tokenizeCodeText(effects, ok3, nok) {
  const self = this;
  let sizeOpen = 0;
  let size;
  let token;
  return start;
  function start(code2) {
    effects.enter("codeText");
    effects.enter("codeTextSequence");
    return sequenceOpen(code2);
  }
  function sequenceOpen(code2) {
    if (code2 === 96) {
      effects.consume(code2);
      sizeOpen++;
      return sequenceOpen;
    }
    effects.exit("codeTextSequence");
    return between(code2);
  }
  function between(code2) {
    if (code2 === null) {
      return nok(code2);
    }
    if (code2 === 32) {
      effects.enter("space");
      effects.consume(code2);
      effects.exit("space");
      return between;
    }
    if (code2 === 96) {
      token = effects.enter("codeTextSequence");
      size = 0;
      return sequenceClose(code2);
    }
    if (markdownLineEnding(code2)) {
      effects.enter("lineEnding");
      effects.consume(code2);
      effects.exit("lineEnding");
      return between;
    }
    effects.enter("codeTextData");
    return data(code2);
  }
  function data(code2) {
    if (code2 === null || code2 === 32 || code2 === 96 || markdownLineEnding(code2)) {
      effects.exit("codeTextData");
      return between(code2);
    }
    effects.consume(code2);
    return data;
  }
  function sequenceClose(code2) {
    if (code2 === 96) {
      effects.consume(code2);
      size++;
      return sequenceClose;
    }
    if (size === sizeOpen) {
      effects.exit("codeTextSequence");
      effects.exit("codeText");
      return ok3(code2);
    }
    token.type = "codeTextData";
    return data(code2);
  }
}

// node_modules/micromark-util-subtokenize/lib/splice-buffer.js
var SpliceBuffer = class {
  /**
   * @param {ReadonlyArray<T> | null | undefined} [initial]
   *   Initial items (optional).
   * @returns
   *   Splice buffer.
   */
  constructor(initial) {
    this.left = initial ? [...initial] : [];
    this.right = [];
  }
  /**
   * Array access;
   * does not move the cursor.
   *
   * @param {number} index
   *   Index.
   * @return {T}
   *   Item.
   */
  get(index2) {
    if (index2 < 0 || index2 >= this.left.length + this.right.length) {
      throw new RangeError("Cannot access index `" + index2 + "` in a splice buffer of size `" + (this.left.length + this.right.length) + "`");
    }
    if (index2 < this.left.length) return this.left[index2];
    return this.right[this.right.length - index2 + this.left.length - 1];
  }
  /**
   * The length of the splice buffer, one greater than the largest index in the
   * array.
   */
  get length() {
    return this.left.length + this.right.length;
  }
  /**
   * Remove and return `list[0]`;
   * moves the cursor to `0`.
   *
   * @returns {T | undefined}
   *   Item, optional.
   */
  shift() {
    this.setCursor(0);
    return this.right.pop();
  }
  /**
   * Slice the buffer to get an array;
   * does not move the cursor.
   *
   * @param {number} start
   *   Start.
   * @param {number | null | undefined} [end]
   *   End (optional).
   * @returns {Array<T>}
   *   Array of items.
   */
  slice(start, end) {
    const stop = end === null || end === void 0 ? Number.POSITIVE_INFINITY : end;
    if (stop < this.left.length) {
      return this.left.slice(start, stop);
    }
    if (start > this.left.length) {
      return this.right.slice(this.right.length - stop + this.left.length, this.right.length - start + this.left.length).reverse();
    }
    return this.left.slice(start).concat(this.right.slice(this.right.length - stop + this.left.length).reverse());
  }
  /**
   * Mimics the behavior of Array.prototype.splice() except for the change of
   * interface necessary to avoid segfaults when patching in very large arrays.
   *
   * This operation moves cursor is moved to `start` and results in the cursor
   * placed after any inserted items.
   *
   * @param {number} start
   *   Start;
   *   zero-based index at which to start changing the array;
   *   negative numbers count backwards from the end of the array and values
   *   that are out-of bounds are clamped to the appropriate end of the array.
   * @param {number | null | undefined} [deleteCount=0]
   *   Delete count (default: `0`);
   *   maximum number of elements to delete, starting from start.
   * @param {Array<T> | null | undefined} [items=[]]
   *   Items to include in place of the deleted items (default: `[]`).
   * @return {Array<T>}
   *   Any removed items.
   */
  splice(start, deleteCount, items) {
    const count = deleteCount || 0;
    this.setCursor(Math.trunc(start));
    const removed = this.right.splice(this.right.length - count, Number.POSITIVE_INFINITY);
    if (items) chunkedPush(this.left, items);
    return removed.reverse();
  }
  /**
   * Remove and return the highest-numbered item in the array, so
   * `list[list.length - 1]`;
   * Moves the cursor to `length`.
   *
   * @returns {T | undefined}
   *   Item, optional.
   */
  pop() {
    this.setCursor(Number.POSITIVE_INFINITY);
    return this.left.pop();
  }
  /**
   * Inserts a single item to the high-numbered side of the array;
   * moves the cursor to `length`.
   *
   * @param {T} item
   *   Item.
   * @returns {undefined}
   *   Nothing.
   */
  push(item) {
    this.setCursor(Number.POSITIVE_INFINITY);
    this.left.push(item);
  }
  /**
   * Inserts many items to the high-numbered side of the array.
   * Moves the cursor to `length`.
   *
   * @param {Array<T>} items
   *   Items.
   * @returns {undefined}
   *   Nothing.
   */
  pushMany(items) {
    this.setCursor(Number.POSITIVE_INFINITY);
    chunkedPush(this.left, items);
  }
  /**
   * Inserts a single item to the low-numbered side of the array;
   * Moves the cursor to `0`.
   *
   * @param {T} item
   *   Item.
   * @returns {undefined}
   *   Nothing.
   */
  unshift(item) {
    this.setCursor(0);
    this.right.push(item);
  }
  /**
   * Inserts many items to the low-numbered side of the array;
   * moves the cursor to `0`.
   *
   * @param {Array<T>} items
   *   Items.
   * @returns {undefined}
   *   Nothing.
   */
  unshiftMany(items) {
    this.setCursor(0);
    chunkedPush(this.right, items.reverse());
  }
  /**
   * Move the cursor to a specific position in the array. Requires
   * time proportional to the distance moved.
   *
   * If `n < 0`, the cursor will end up at the beginning.
   * If `n > length`, the cursor will end up at the end.
   *
   * @param {number} n
   *   Position.
   * @return {undefined}
   *   Nothing.
   */
  setCursor(n) {
    if (n === this.left.length || n > this.left.length && this.right.length === 0 || n < 0 && this.left.length === 0) return;
    if (n < this.left.length) {
      const removed = this.left.splice(n, Number.POSITIVE_INFINITY);
      chunkedPush(this.right, removed.reverse());
    } else {
      const removed = this.right.splice(this.left.length + this.right.length - n, Number.POSITIVE_INFINITY);
      chunkedPush(this.left, removed.reverse());
    }
  }
};
function chunkedPush(list2, right) {
  let chunkStart = 0;
  if (right.length < 1e4) {
    list2.push(...right);
  } else {
    while (chunkStart < right.length) {
      list2.push(...right.slice(chunkStart, chunkStart + 1e4));
      chunkStart += 1e4;
    }
  }
}

// node_modules/micromark-util-subtokenize/index.js
function subtokenize(eventsArray) {
  const jumps = {};
  let index2 = -1;
  let event;
  let lineIndex;
  let otherIndex;
  let otherEvent;
  let parameters;
  let subevents;
  let more;
  const events = new SpliceBuffer(eventsArray);
  while (++index2 < events.length) {
    while (index2 in jumps) {
      index2 = jumps[index2];
    }
    event = events.get(index2);
    if (index2 && event[1].type === "chunkFlow" && events.get(index2 - 1)[1].type === "listItemPrefix") {
      subevents = event[1]._tokenizer.events;
      otherIndex = 0;
      if (otherIndex < subevents.length && subevents[otherIndex][1].type === "lineEndingBlank") {
        otherIndex += 2;
      }
      if (otherIndex < subevents.length && subevents[otherIndex][1].type === "content") {
        while (++otherIndex < subevents.length) {
          if (subevents[otherIndex][1].type === "content") {
            break;
          }
          if (subevents[otherIndex][1].type === "chunkText") {
            subevents[otherIndex][1]._isInFirstContentOfListItem = true;
            otherIndex++;
          }
        }
      }
    }
    if (event[0] === "enter") {
      if (event[1].contentType) {
        Object.assign(jumps, subcontent(events, index2));
        index2 = jumps[index2];
        more = true;
      }
    } else if (event[1]._container) {
      otherIndex = index2;
      lineIndex = void 0;
      while (otherIndex--) {
        otherEvent = events.get(otherIndex);
        if (otherEvent[1].type === "lineEnding" || otherEvent[1].type === "lineEndingBlank") {
          if (otherEvent[0] === "enter") {
            if (lineIndex) {
              events.get(lineIndex)[1].type = "lineEndingBlank";
            }
            otherEvent[1].type = "lineEnding";
            lineIndex = otherIndex;
          }
        } else if (otherEvent[1].type === "linePrefix" || otherEvent[1].type === "listItemIndent") {
        } else {
          break;
        }
      }
      if (lineIndex) {
        event[1].end = {
          ...events.get(lineIndex)[1].start
        };
        parameters = events.slice(lineIndex, index2);
        parameters.unshift(event);
        events.splice(lineIndex, index2 - lineIndex + 1, parameters);
      }
    }
  }
  splice(eventsArray, 0, Number.POSITIVE_INFINITY, events.slice(0));
  return !more;
}
function subcontent(events, eventIndex) {
  const token = events.get(eventIndex)[1];
  const context = events.get(eventIndex)[2];
  let startPosition = eventIndex - 1;
  const startPositions = [];
  let tokenizer = token._tokenizer;
  if (!tokenizer) {
    tokenizer = context.parser[token.contentType](token.start);
    if (token._contentTypeTextTrailing) {
      tokenizer._contentTypeTextTrailing = true;
    }
  }
  const childEvents = tokenizer.events;
  const jumps = [];
  const gaps = {};
  let stream;
  let previous4;
  let index2 = -1;
  let current = token;
  let adjust = 0;
  let start = 0;
  const breaks = [start];
  while (current) {
    while (events.get(++startPosition)[1] !== current) {
    }
    startPositions.push(startPosition);
    if (!current._tokenizer) {
      stream = context.sliceStream(current);
      if (!current.next) {
        stream.push(null);
      }
      if (previous4) {
        tokenizer.defineSkip(current.start);
      }
      if (current._isInFirstContentOfListItem) {
        tokenizer._gfmTasklistFirstContentOfListItem = true;
      }
      tokenizer.write(stream);
      if (current._isInFirstContentOfListItem) {
        tokenizer._gfmTasklistFirstContentOfListItem = void 0;
      }
    }
    previous4 = current;
    current = current.next;
  }
  current = token;
  while (++index2 < childEvents.length) {
    if (
      // Find a void token that includes a break.
      childEvents[index2][0] === "exit" && childEvents[index2 - 1][0] === "enter" && childEvents[index2][1].type === childEvents[index2 - 1][1].type && childEvents[index2][1].start.line !== childEvents[index2][1].end.line
    ) {
      start = index2 + 1;
      breaks.push(start);
      current._tokenizer = void 0;
      current.previous = void 0;
      current = current.next;
    }
  }
  tokenizer.events = [];
  if (current) {
    current._tokenizer = void 0;
    current.previous = void 0;
  } else {
    breaks.pop();
  }
  index2 = breaks.length;
  while (index2--) {
    const slice = childEvents.slice(breaks[index2], breaks[index2 + 1]);
    const start2 = startPositions.pop();
    jumps.push([start2, start2 + slice.length - 1]);
    events.splice(start2, 2, slice);
  }
  jumps.reverse();
  index2 = -1;
  while (++index2 < jumps.length) {
    gaps[adjust + jumps[index2][0]] = adjust + jumps[index2][1];
    adjust += jumps[index2][1] - jumps[index2][0] - 1;
  }
  return gaps;
}

// node_modules/micromark-core-commonmark/lib/content.js
var content2 = {
  resolve: resolveContent,
  tokenize: tokenizeContent
};
var continuationConstruct = {
  partial: true,
  tokenize: tokenizeContinuation
};
function resolveContent(events) {
  subtokenize(events);
  return events;
}
function tokenizeContent(effects, ok3) {
  let previous4;
  return chunkStart;
  function chunkStart(code2) {
    effects.enter("content");
    previous4 = effects.enter("chunkContent", {
      contentType: "content"
    });
    return chunkInside(code2);
  }
  function chunkInside(code2) {
    if (code2 === null) {
      return contentEnd(code2);
    }
    if (markdownLineEnding(code2)) {
      return effects.check(continuationConstruct, contentContinue, contentEnd)(code2);
    }
    effects.consume(code2);
    return chunkInside;
  }
  function contentEnd(code2) {
    effects.exit("chunkContent");
    effects.exit("content");
    return ok3(code2);
  }
  function contentContinue(code2) {
    effects.consume(code2);
    effects.exit("chunkContent");
    previous4.next = effects.enter("chunkContent", {
      contentType: "content",
      previous: previous4
    });
    previous4 = previous4.next;
    return chunkInside;
  }
}
function tokenizeContinuation(effects, ok3, nok) {
  const self = this;
  return startLookahead;
  function startLookahead(code2) {
    effects.exit("chunkContent");
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return factorySpace(effects, prefixed, "linePrefix");
  }
  function prefixed(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      return nok(code2);
    }
    const tail = self.events[self.events.length - 1];
    if (!self.parser.constructs.disable.null.includes("codeIndented") && tail && tail[1].type === "linePrefix" && tail[2].sliceSerialize(tail[1], true).length >= 4) {
      return ok3(code2);
    }
    return effects.interrupt(self.parser.constructs.flow, nok, ok3)(code2);
  }
}

// node_modules/micromark-factory-destination/index.js
function factoryDestination(effects, ok3, nok, type, literalType, literalMarkerType, rawType, stringType, max) {
  const limit = max || Number.POSITIVE_INFINITY;
  let balance = 0;
  return start;
  function start(code2) {
    if (code2 === 60) {
      effects.enter(type);
      effects.enter(literalType);
      effects.enter(literalMarkerType);
      effects.consume(code2);
      effects.exit(literalMarkerType);
      return enclosedBefore;
    }
    if (code2 === null || code2 === 32 || code2 === 41 || asciiControl(code2)) {
      return nok(code2);
    }
    effects.enter(type);
    effects.enter(rawType);
    effects.enter(stringType);
    effects.enter("chunkString", {
      contentType: "string"
    });
    return raw(code2);
  }
  function enclosedBefore(code2) {
    if (code2 === 62) {
      effects.enter(literalMarkerType);
      effects.consume(code2);
      effects.exit(literalMarkerType);
      effects.exit(literalType);
      effects.exit(type);
      return ok3;
    }
    effects.enter(stringType);
    effects.enter("chunkString", {
      contentType: "string"
    });
    return enclosed(code2);
  }
  function enclosed(code2) {
    if (code2 === 62) {
      effects.exit("chunkString");
      effects.exit(stringType);
      return enclosedBefore(code2);
    }
    if (code2 === null || code2 === 60 || markdownLineEnding(code2)) {
      return nok(code2);
    }
    effects.consume(code2);
    return code2 === 92 ? enclosedEscape : enclosed;
  }
  function enclosedEscape(code2) {
    if (code2 === 60 || code2 === 62 || code2 === 92) {
      effects.consume(code2);
      return enclosed;
    }
    return enclosed(code2);
  }
  function raw(code2) {
    if (!balance && (code2 === null || code2 === 41 || markdownLineEndingOrSpace(code2))) {
      effects.exit("chunkString");
      effects.exit(stringType);
      effects.exit(rawType);
      effects.exit(type);
      return ok3(code2);
    }
    if (balance < limit && code2 === 40) {
      effects.consume(code2);
      balance++;
      return raw;
    }
    if (code2 === 41) {
      effects.consume(code2);
      balance--;
      return raw;
    }
    if (code2 === null || code2 === 32 || code2 === 40 || asciiControl(code2)) {
      return nok(code2);
    }
    effects.consume(code2);
    return code2 === 92 ? rawEscape : raw;
  }
  function rawEscape(code2) {
    if (code2 === 40 || code2 === 41 || code2 === 92) {
      effects.consume(code2);
      return raw;
    }
    return raw(code2);
  }
}

// node_modules/micromark-factory-label/index.js
function factoryLabel(effects, ok3, nok, type, markerType, stringType) {
  const self = this;
  let size = 0;
  let seen;
  return start;
  function start(code2) {
    effects.enter(type);
    effects.enter(markerType);
    effects.consume(code2);
    effects.exit(markerType);
    effects.enter(stringType);
    return atBreak;
  }
  function atBreak(code2) {
    if (size > 999 || code2 === null || code2 === 91 || code2 === 93 && !seen || // To do: remove in the future once we’ve switched from
    // `micromark-extension-footnote` to `micromark-extension-gfm-footnote`,
    // which doesn’t need this.
    // Hidden footnotes hook.
    /* c8 ignore next 3 */
    code2 === 94 && !size && "_hiddenFootnoteSupport" in self.parser.constructs) {
      return nok(code2);
    }
    if (code2 === 93) {
      effects.exit(stringType);
      effects.enter(markerType);
      effects.consume(code2);
      effects.exit(markerType);
      effects.exit(type);
      return ok3;
    }
    if (markdownLineEnding(code2)) {
      effects.enter("lineEnding");
      effects.consume(code2);
      effects.exit("lineEnding");
      return atBreak;
    }
    effects.enter("chunkString", {
      contentType: "string"
    });
    return labelInside(code2);
  }
  function labelInside(code2) {
    if (code2 === null || code2 === 91 || code2 === 93 || markdownLineEnding(code2) || size++ > 999) {
      effects.exit("chunkString");
      return atBreak(code2);
    }
    effects.consume(code2);
    if (!seen) seen = !markdownSpace(code2);
    return code2 === 92 ? labelEscape : labelInside;
  }
  function labelEscape(code2) {
    if (code2 === 91 || code2 === 92 || code2 === 93) {
      effects.consume(code2);
      size++;
      return labelInside;
    }
    return labelInside(code2);
  }
}

// node_modules/micromark-factory-title/index.js
function factoryTitle(effects, ok3, nok, type, markerType, stringType) {
  let marker;
  return start;
  function start(code2) {
    if (code2 === 34 || code2 === 39 || code2 === 40) {
      effects.enter(type);
      effects.enter(markerType);
      effects.consume(code2);
      effects.exit(markerType);
      marker = code2 === 40 ? 41 : code2;
      return begin;
    }
    return nok(code2);
  }
  function begin(code2) {
    if (code2 === marker) {
      effects.enter(markerType);
      effects.consume(code2);
      effects.exit(markerType);
      effects.exit(type);
      return ok3;
    }
    effects.enter(stringType);
    return atBreak(code2);
  }
  function atBreak(code2) {
    if (code2 === marker) {
      effects.exit(stringType);
      return begin(marker);
    }
    if (code2 === null) {
      return nok(code2);
    }
    if (markdownLineEnding(code2)) {
      effects.enter("lineEnding");
      effects.consume(code2);
      effects.exit("lineEnding");
      return factorySpace(effects, atBreak, "linePrefix");
    }
    effects.enter("chunkString", {
      contentType: "string"
    });
    return inside(code2);
  }
  function inside(code2) {
    if (code2 === marker || code2 === null || markdownLineEnding(code2)) {
      effects.exit("chunkString");
      return atBreak(code2);
    }
    effects.consume(code2);
    return code2 === 92 ? escape : inside;
  }
  function escape(code2) {
    if (code2 === marker || code2 === 92) {
      effects.consume(code2);
      return inside;
    }
    return inside(code2);
  }
}

// node_modules/micromark-factory-whitespace/index.js
function factoryWhitespace(effects, ok3) {
  let seen;
  return start;
  function start(code2) {
    if (markdownLineEnding(code2)) {
      effects.enter("lineEnding");
      effects.consume(code2);
      effects.exit("lineEnding");
      seen = true;
      return start;
    }
    if (markdownSpace(code2)) {
      return factorySpace(effects, start, seen ? "linePrefix" : "lineSuffix")(code2);
    }
    return ok3(code2);
  }
}

// node_modules/micromark-core-commonmark/lib/definition.js
var definition = {
  name: "definition",
  tokenize: tokenizeDefinition
};
var titleBefore = {
  partial: true,
  tokenize: tokenizeTitleBefore
};
function tokenizeDefinition(effects, ok3, nok) {
  const self = this;
  let identifier;
  return start;
  function start(code2) {
    effects.enter("definition");
    return before(code2);
  }
  function before(code2) {
    return factoryLabel.call(
      self,
      effects,
      labelAfter,
      // Note: we don’t need to reset the way `markdown-rs` does.
      nok,
      "definitionLabel",
      "definitionLabelMarker",
      "definitionLabelString"
    )(code2);
  }
  function labelAfter(code2) {
    identifier = normalizeIdentifier(self.sliceSerialize(self.events[self.events.length - 1][1]).slice(1, -1));
    if (code2 === 58) {
      effects.enter("definitionMarker");
      effects.consume(code2);
      effects.exit("definitionMarker");
      return markerAfter;
    }
    return nok(code2);
  }
  function markerAfter(code2) {
    return markdownLineEndingOrSpace(code2) ? factoryWhitespace(effects, destinationBefore)(code2) : destinationBefore(code2);
  }
  function destinationBefore(code2) {
    return factoryDestination(
      effects,
      destinationAfter,
      // Note: we don’t need to reset the way `markdown-rs` does.
      nok,
      "definitionDestination",
      "definitionDestinationLiteral",
      "definitionDestinationLiteralMarker",
      "definitionDestinationRaw",
      "definitionDestinationString"
    )(code2);
  }
  function destinationAfter(code2) {
    return effects.attempt(titleBefore, after, after)(code2);
  }
  function after(code2) {
    return markdownSpace(code2) ? factorySpace(effects, afterWhitespace, "whitespace")(code2) : afterWhitespace(code2);
  }
  function afterWhitespace(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("definition");
      self.parser.defined.push(identifier);
      return ok3(code2);
    }
    return nok(code2);
  }
}
function tokenizeTitleBefore(effects, ok3, nok) {
  return titleBefore2;
  function titleBefore2(code2) {
    return markdownLineEndingOrSpace(code2) ? factoryWhitespace(effects, beforeMarker)(code2) : nok(code2);
  }
  function beforeMarker(code2) {
    return factoryTitle(effects, titleAfter, nok, "definitionTitle", "definitionTitleMarker", "definitionTitleString")(code2);
  }
  function titleAfter(code2) {
    return markdownSpace(code2) ? factorySpace(effects, titleAfterOptionalWhitespace, "whitespace")(code2) : titleAfterOptionalWhitespace(code2);
  }
  function titleAfterOptionalWhitespace(code2) {
    return code2 === null || markdownLineEnding(code2) ? ok3(code2) : nok(code2);
  }
}

// node_modules/micromark-core-commonmark/lib/hard-break-escape.js
var hardBreakEscape = {
  name: "hardBreakEscape",
  tokenize: tokenizeHardBreakEscape
};
function tokenizeHardBreakEscape(effects, ok3, nok) {
  return start;
  function start(code2) {
    effects.enter("hardBreakEscape");
    effects.consume(code2);
    return after;
  }
  function after(code2) {
    if (markdownLineEnding(code2)) {
      effects.exit("hardBreakEscape");
      return ok3(code2);
    }
    return nok(code2);
  }
}

// node_modules/micromark-core-commonmark/lib/heading-atx.js
var headingAtx = {
  name: "headingAtx",
  resolve: resolveHeadingAtx,
  tokenize: tokenizeHeadingAtx
};
function resolveHeadingAtx(events, context) {
  let contentEnd = events.length - 2;
  let contentStart = 3;
  if (events[contentStart][1].type === "whitespace") {
    contentStart += 2;
  }
  if (contentEnd - 2 > contentStart && events[contentEnd][1].type === "whitespace") {
    contentEnd -= 2;
  }
  if (events[contentEnd][1].type === "atxHeadingSequence" && (contentStart === contentEnd - 1 || contentEnd - 4 > contentStart && events[contentEnd - 2][1].type === "whitespace")) {
    contentEnd -= contentStart + 1 === contentEnd ? 2 : 4;
  }
  if (contentEnd > contentStart) {
    const content3 = {
      type: "atxHeadingText",
      start: events[contentStart][1].start,
      end: events[contentEnd][1].end
    };
    const text4 = {
      type: "chunkText",
      start: events[contentStart][1].start,
      end: events[contentEnd][1].end,
      contentType: "text"
    };
    splice(events, contentStart, contentEnd - contentStart + 1, [["enter", content3, context], ["enter", text4, context], ["exit", text4, context], ["exit", content3, context]]);
  }
  return events;
}
function tokenizeHeadingAtx(effects, ok3, nok) {
  let size = 0;
  return start;
  function start(code2) {
    effects.enter("atxHeading");
    return before(code2);
  }
  function before(code2) {
    effects.enter("atxHeadingSequence");
    return sequenceOpen(code2);
  }
  function sequenceOpen(code2) {
    if (code2 === 35 && size++ < 6) {
      effects.consume(code2);
      return sequenceOpen;
    }
    if (code2 === null || markdownLineEndingOrSpace(code2)) {
      effects.exit("atxHeadingSequence");
      return atBreak(code2);
    }
    return nok(code2);
  }
  function atBreak(code2) {
    if (code2 === 35) {
      effects.enter("atxHeadingSequence");
      return sequenceFurther(code2);
    }
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("atxHeading");
      return ok3(code2);
    }
    if (markdownSpace(code2)) {
      return factorySpace(effects, atBreak, "whitespace")(code2);
    }
    effects.enter("atxHeadingText");
    return data(code2);
  }
  function sequenceFurther(code2) {
    if (code2 === 35) {
      effects.consume(code2);
      return sequenceFurther;
    }
    effects.exit("atxHeadingSequence");
    return atBreak(code2);
  }
  function data(code2) {
    if (code2 === null || code2 === 35 || markdownLineEndingOrSpace(code2)) {
      effects.exit("atxHeadingText");
      return atBreak(code2);
    }
    effects.consume(code2);
    return data;
  }
}

// node_modules/micromark-util-html-tag-name/index.js
var htmlBlockNames = [
  "address",
  "article",
  "aside",
  "base",
  "basefont",
  "blockquote",
  "body",
  "caption",
  "center",
  "col",
  "colgroup",
  "dd",
  "details",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "frame",
  "frameset",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "iframe",
  "legend",
  "li",
  "link",
  "main",
  "menu",
  "menuitem",
  "nav",
  "noframes",
  "ol",
  "optgroup",
  "option",
  "p",
  "param",
  "search",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "title",
  "tr",
  "track",
  "ul"
];
var htmlRawNames = ["pre", "script", "style", "textarea"];

// node_modules/micromark-core-commonmark/lib/html-flow.js
var htmlFlow = {
  concrete: true,
  name: "htmlFlow",
  resolveTo: resolveToHtmlFlow,
  tokenize: tokenizeHtmlFlow
};
var blankLineBefore = {
  partial: true,
  tokenize: tokenizeBlankLineBefore
};
function resolveToHtmlFlow(events) {
  let index2 = events.length;
  while (index2--) {
    if (events[index2][0] === "enter" && events[index2][1].type === "htmlFlow") {
      break;
    }
  }
  if (index2 > 1 && events[index2 - 2][1].type === "linePrefix") {
    events[index2][1].start = events[index2 - 2][1].start;
    events[index2 + 1][1].start = events[index2 - 2][1].start;
    events.splice(index2 - 2, 2);
  }
  return events;
}
function tokenizeHtmlFlow(effects, ok3, nok) {
  const self = this;
  let marker;
  let closingTag;
  let buffer;
  let index2;
  let markerB;
  return start;
  function start(code2) {
    return before(code2);
  }
  function before(code2) {
    effects.enter("htmlFlow");
    effects.enter("htmlFlowData");
    effects.consume(code2);
    return open;
  }
  function open(code2) {
    if (code2 === 33) {
      effects.consume(code2);
      return declarationOpen;
    }
    if (code2 === 47) {
      effects.consume(code2);
      closingTag = true;
      return tagCloseStart;
    }
    if (code2 === 63) {
      effects.consume(code2);
      marker = 3;
      return self.interrupt ? ok3 : continuationDeclarationInside;
    }
    if (asciiAlpha(code2)) {
      effects.consume(code2);
      buffer = String.fromCharCode(code2);
      return tagName;
    }
    return nok(code2);
  }
  function declarationOpen(code2) {
    if (code2 === 45) {
      effects.consume(code2);
      marker = 2;
      return commentOpenInside;
    }
    if (code2 === 91) {
      effects.consume(code2);
      marker = 5;
      index2 = 0;
      return cdataOpenInside;
    }
    if (asciiAlpha(code2)) {
      effects.consume(code2);
      marker = 4;
      return self.interrupt ? ok3 : continuationDeclarationInside;
    }
    return nok(code2);
  }
  function commentOpenInside(code2) {
    if (code2 === 45) {
      effects.consume(code2);
      return self.interrupt ? ok3 : continuationDeclarationInside;
    }
    return nok(code2);
  }
  function cdataOpenInside(code2) {
    const value = "CDATA[";
    if (code2 === value.charCodeAt(index2++)) {
      effects.consume(code2);
      if (index2 === value.length) {
        return self.interrupt ? ok3 : continuation;
      }
      return cdataOpenInside;
    }
    return nok(code2);
  }
  function tagCloseStart(code2) {
    if (asciiAlpha(code2)) {
      effects.consume(code2);
      buffer = String.fromCharCode(code2);
      return tagName;
    }
    return nok(code2);
  }
  function tagName(code2) {
    if (code2 === null || code2 === 47 || code2 === 62 || markdownLineEndingOrSpace(code2)) {
      const slash = code2 === 47;
      const name = buffer.toLowerCase();
      if (!slash && !closingTag && htmlRawNames.includes(name)) {
        marker = 1;
        return self.interrupt ? ok3(code2) : continuation(code2);
      }
      if (htmlBlockNames.includes(buffer.toLowerCase())) {
        marker = 6;
        if (slash) {
          effects.consume(code2);
          return basicSelfClosing;
        }
        return self.interrupt ? ok3(code2) : continuation(code2);
      }
      marker = 7;
      return self.interrupt && !self.parser.lazy[self.now().line] ? nok(code2) : closingTag ? completeClosingTagAfter(code2) : completeAttributeNameBefore(code2);
    }
    if (code2 === 45 || asciiAlphanumeric(code2)) {
      effects.consume(code2);
      buffer += String.fromCharCode(code2);
      return tagName;
    }
    return nok(code2);
  }
  function basicSelfClosing(code2) {
    if (code2 === 62) {
      effects.consume(code2);
      return self.interrupt ? ok3 : continuation;
    }
    return nok(code2);
  }
  function completeClosingTagAfter(code2) {
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return completeClosingTagAfter;
    }
    return completeEnd(code2);
  }
  function completeAttributeNameBefore(code2) {
    if (code2 === 47) {
      effects.consume(code2);
      return completeEnd;
    }
    if (code2 === 58 || code2 === 95 || asciiAlpha(code2)) {
      effects.consume(code2);
      return completeAttributeName;
    }
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return completeAttributeNameBefore;
    }
    return completeEnd(code2);
  }
  function completeAttributeName(code2) {
    if (code2 === 45 || code2 === 46 || code2 === 58 || code2 === 95 || asciiAlphanumeric(code2)) {
      effects.consume(code2);
      return completeAttributeName;
    }
    return completeAttributeNameAfter(code2);
  }
  function completeAttributeNameAfter(code2) {
    if (code2 === 61) {
      effects.consume(code2);
      return completeAttributeValueBefore;
    }
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return completeAttributeNameAfter;
    }
    return completeAttributeNameBefore(code2);
  }
  function completeAttributeValueBefore(code2) {
    if (code2 === null || code2 === 60 || code2 === 61 || code2 === 62 || code2 === 96) {
      return nok(code2);
    }
    if (code2 === 34 || code2 === 39) {
      effects.consume(code2);
      markerB = code2;
      return completeAttributeValueQuoted;
    }
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return completeAttributeValueBefore;
    }
    return completeAttributeValueUnquoted(code2);
  }
  function completeAttributeValueQuoted(code2) {
    if (code2 === markerB) {
      effects.consume(code2);
      markerB = null;
      return completeAttributeValueQuotedAfter;
    }
    if (code2 === null || markdownLineEnding(code2)) {
      return nok(code2);
    }
    effects.consume(code2);
    return completeAttributeValueQuoted;
  }
  function completeAttributeValueUnquoted(code2) {
    if (code2 === null || code2 === 34 || code2 === 39 || code2 === 47 || code2 === 60 || code2 === 61 || code2 === 62 || code2 === 96 || markdownLineEndingOrSpace(code2)) {
      return completeAttributeNameAfter(code2);
    }
    effects.consume(code2);
    return completeAttributeValueUnquoted;
  }
  function completeAttributeValueQuotedAfter(code2) {
    if (code2 === 47 || code2 === 62 || markdownSpace(code2)) {
      return completeAttributeNameBefore(code2);
    }
    return nok(code2);
  }
  function completeEnd(code2) {
    if (code2 === 62) {
      effects.consume(code2);
      return completeAfter;
    }
    return nok(code2);
  }
  function completeAfter(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      return continuation(code2);
    }
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return completeAfter;
    }
    return nok(code2);
  }
  function continuation(code2) {
    if (code2 === 45 && marker === 2) {
      effects.consume(code2);
      return continuationCommentInside;
    }
    if (code2 === 60 && marker === 1) {
      effects.consume(code2);
      return continuationRawTagOpen;
    }
    if (code2 === 62 && marker === 4) {
      effects.consume(code2);
      return continuationClose;
    }
    if (code2 === 63 && marker === 3) {
      effects.consume(code2);
      return continuationDeclarationInside;
    }
    if (code2 === 93 && marker === 5) {
      effects.consume(code2);
      return continuationCdataInside;
    }
    if (markdownLineEnding(code2) && (marker === 6 || marker === 7)) {
      effects.exit("htmlFlowData");
      return effects.check(blankLineBefore, continuationAfter, continuationStart)(code2);
    }
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("htmlFlowData");
      return continuationStart(code2);
    }
    effects.consume(code2);
    return continuation;
  }
  function continuationStart(code2) {
    return effects.check(nonLazyContinuation, continuationStartNonLazy, continuationAfter)(code2);
  }
  function continuationStartNonLazy(code2) {
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return continuationBefore;
  }
  function continuationBefore(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      return continuationStart(code2);
    }
    effects.enter("htmlFlowData");
    return continuation(code2);
  }
  function continuationCommentInside(code2) {
    if (code2 === 45) {
      effects.consume(code2);
      return continuationDeclarationInside;
    }
    return continuation(code2);
  }
  function continuationRawTagOpen(code2) {
    if (code2 === 47) {
      effects.consume(code2);
      buffer = "";
      return continuationRawEndTag;
    }
    return continuation(code2);
  }
  function continuationRawEndTag(code2) {
    if (code2 === 62) {
      const name = buffer.toLowerCase();
      if (htmlRawNames.includes(name)) {
        effects.consume(code2);
        return continuationClose;
      }
      return continuation(code2);
    }
    if (asciiAlpha(code2) && buffer.length < 8) {
      effects.consume(code2);
      buffer += String.fromCharCode(code2);
      return continuationRawEndTag;
    }
    return continuation(code2);
  }
  function continuationCdataInside(code2) {
    if (code2 === 93) {
      effects.consume(code2);
      return continuationDeclarationInside;
    }
    return continuation(code2);
  }
  function continuationDeclarationInside(code2) {
    if (code2 === 62) {
      effects.consume(code2);
      return continuationClose;
    }
    if (code2 === 45 && marker === 2) {
      effects.consume(code2);
      return continuationDeclarationInside;
    }
    return continuation(code2);
  }
  function continuationClose(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("htmlFlowData");
      return continuationAfter(code2);
    }
    effects.consume(code2);
    return continuationClose;
  }
  function continuationAfter(code2) {
    effects.exit("htmlFlow");
    return ok3(code2);
  }
}
function tokenizeBlankLineBefore(effects, ok3, nok) {
  return start;
  function start(code2) {
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return effects.attempt(blankLine, ok3, nok);
  }
}

// node_modules/micromark-core-commonmark/lib/html-text.js
var htmlText = {
  name: "htmlText",
  tokenize: tokenizeHtmlText
};
function tokenizeHtmlText(effects, ok3, nok) {
  const self = this;
  let marker;
  let index2;
  let returnState;
  return start;
  function start(code2) {
    effects.enter("htmlText");
    effects.enter("htmlTextData");
    effects.consume(code2);
    return open;
  }
  function open(code2) {
    if (code2 === 33) {
      effects.consume(code2);
      return declarationOpen;
    }
    if (code2 === 47) {
      effects.consume(code2);
      return tagCloseStart;
    }
    if (code2 === 63) {
      effects.consume(code2);
      return instruction;
    }
    if (asciiAlpha(code2)) {
      effects.consume(code2);
      return tagOpen;
    }
    return nok(code2);
  }
  function declarationOpen(code2) {
    if (code2 === 45) {
      effects.consume(code2);
      return commentOpenInside;
    }
    if (code2 === 91) {
      effects.consume(code2);
      index2 = 0;
      return cdataOpenInside;
    }
    if (asciiAlpha(code2)) {
      effects.consume(code2);
      return declaration;
    }
    return nok(code2);
  }
  function commentOpenInside(code2) {
    if (code2 === 45) {
      effects.consume(code2);
      return commentEnd;
    }
    return nok(code2);
  }
  function comment(code2) {
    if (code2 === null) {
      return nok(code2);
    }
    if (code2 === 45) {
      effects.consume(code2);
      return commentClose;
    }
    if (markdownLineEnding(code2)) {
      returnState = comment;
      return lineEndingBefore(code2);
    }
    effects.consume(code2);
    return comment;
  }
  function commentClose(code2) {
    if (code2 === 45) {
      effects.consume(code2);
      return commentEnd;
    }
    return comment(code2);
  }
  function commentEnd(code2) {
    return code2 === 62 ? end(code2) : code2 === 45 ? commentClose(code2) : comment(code2);
  }
  function cdataOpenInside(code2) {
    const value = "CDATA[";
    if (code2 === value.charCodeAt(index2++)) {
      effects.consume(code2);
      return index2 === value.length ? cdata : cdataOpenInside;
    }
    return nok(code2);
  }
  function cdata(code2) {
    if (code2 === null) {
      return nok(code2);
    }
    if (code2 === 93) {
      effects.consume(code2);
      return cdataClose;
    }
    if (markdownLineEnding(code2)) {
      returnState = cdata;
      return lineEndingBefore(code2);
    }
    effects.consume(code2);
    return cdata;
  }
  function cdataClose(code2) {
    if (code2 === 93) {
      effects.consume(code2);
      return cdataEnd;
    }
    return cdata(code2);
  }
  function cdataEnd(code2) {
    if (code2 === 62) {
      return end(code2);
    }
    if (code2 === 93) {
      effects.consume(code2);
      return cdataEnd;
    }
    return cdata(code2);
  }
  function declaration(code2) {
    if (code2 === null || code2 === 62) {
      return end(code2);
    }
    if (markdownLineEnding(code2)) {
      returnState = declaration;
      return lineEndingBefore(code2);
    }
    effects.consume(code2);
    return declaration;
  }
  function instruction(code2) {
    if (code2 === null) {
      return nok(code2);
    }
    if (code2 === 63) {
      effects.consume(code2);
      return instructionClose;
    }
    if (markdownLineEnding(code2)) {
      returnState = instruction;
      return lineEndingBefore(code2);
    }
    effects.consume(code2);
    return instruction;
  }
  function instructionClose(code2) {
    return code2 === 62 ? end(code2) : instruction(code2);
  }
  function tagCloseStart(code2) {
    if (asciiAlpha(code2)) {
      effects.consume(code2);
      return tagClose;
    }
    return nok(code2);
  }
  function tagClose(code2) {
    if (code2 === 45 || asciiAlphanumeric(code2)) {
      effects.consume(code2);
      return tagClose;
    }
    return tagCloseBetween(code2);
  }
  function tagCloseBetween(code2) {
    if (markdownLineEnding(code2)) {
      returnState = tagCloseBetween;
      return lineEndingBefore(code2);
    }
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return tagCloseBetween;
    }
    return end(code2);
  }
  function tagOpen(code2) {
    if (code2 === 45 || asciiAlphanumeric(code2)) {
      effects.consume(code2);
      return tagOpen;
    }
    if (code2 === 47 || code2 === 62 || markdownLineEndingOrSpace(code2)) {
      return tagOpenBetween(code2);
    }
    return nok(code2);
  }
  function tagOpenBetween(code2) {
    if (code2 === 47) {
      effects.consume(code2);
      return end;
    }
    if (code2 === 58 || code2 === 95 || asciiAlpha(code2)) {
      effects.consume(code2);
      return tagOpenAttributeName;
    }
    if (markdownLineEnding(code2)) {
      returnState = tagOpenBetween;
      return lineEndingBefore(code2);
    }
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return tagOpenBetween;
    }
    return end(code2);
  }
  function tagOpenAttributeName(code2) {
    if (code2 === 45 || code2 === 46 || code2 === 58 || code2 === 95 || asciiAlphanumeric(code2)) {
      effects.consume(code2);
      return tagOpenAttributeName;
    }
    return tagOpenAttributeNameAfter(code2);
  }
  function tagOpenAttributeNameAfter(code2) {
    if (code2 === 61) {
      effects.consume(code2);
      return tagOpenAttributeValueBefore;
    }
    if (markdownLineEnding(code2)) {
      returnState = tagOpenAttributeNameAfter;
      return lineEndingBefore(code2);
    }
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return tagOpenAttributeNameAfter;
    }
    return tagOpenBetween(code2);
  }
  function tagOpenAttributeValueBefore(code2) {
    if (code2 === null || code2 === 60 || code2 === 61 || code2 === 62 || code2 === 96) {
      return nok(code2);
    }
    if (code2 === 34 || code2 === 39) {
      effects.consume(code2);
      marker = code2;
      return tagOpenAttributeValueQuoted;
    }
    if (markdownLineEnding(code2)) {
      returnState = tagOpenAttributeValueBefore;
      return lineEndingBefore(code2);
    }
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return tagOpenAttributeValueBefore;
    }
    effects.consume(code2);
    return tagOpenAttributeValueUnquoted;
  }
  function tagOpenAttributeValueQuoted(code2) {
    if (code2 === marker) {
      effects.consume(code2);
      marker = void 0;
      return tagOpenAttributeValueQuotedAfter;
    }
    if (code2 === null) {
      return nok(code2);
    }
    if (markdownLineEnding(code2)) {
      returnState = tagOpenAttributeValueQuoted;
      return lineEndingBefore(code2);
    }
    effects.consume(code2);
    return tagOpenAttributeValueQuoted;
  }
  function tagOpenAttributeValueUnquoted(code2) {
    if (code2 === null || code2 === 34 || code2 === 39 || code2 === 60 || code2 === 61 || code2 === 96) {
      return nok(code2);
    }
    if (code2 === 47 || code2 === 62 || markdownLineEndingOrSpace(code2)) {
      return tagOpenBetween(code2);
    }
    effects.consume(code2);
    return tagOpenAttributeValueUnquoted;
  }
  function tagOpenAttributeValueQuotedAfter(code2) {
    if (code2 === 47 || code2 === 62 || markdownLineEndingOrSpace(code2)) {
      return tagOpenBetween(code2);
    }
    return nok(code2);
  }
  function end(code2) {
    if (code2 === 62) {
      effects.consume(code2);
      effects.exit("htmlTextData");
      effects.exit("htmlText");
      return ok3;
    }
    return nok(code2);
  }
  function lineEndingBefore(code2) {
    effects.exit("htmlTextData");
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return lineEndingAfter;
  }
  function lineEndingAfter(code2) {
    return markdownSpace(code2) ? factorySpace(effects, lineEndingAfterPrefix, "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code2) : lineEndingAfterPrefix(code2);
  }
  function lineEndingAfterPrefix(code2) {
    effects.enter("htmlTextData");
    return returnState(code2);
  }
}

// node_modules/micromark-core-commonmark/lib/label-end.js
var labelEnd = {
  name: "labelEnd",
  resolveAll: resolveAllLabelEnd,
  resolveTo: resolveToLabelEnd,
  tokenize: tokenizeLabelEnd
};
var resourceConstruct = {
  tokenize: tokenizeResource
};
var referenceFullConstruct = {
  tokenize: tokenizeReferenceFull
};
var referenceCollapsedConstruct = {
  tokenize: tokenizeReferenceCollapsed
};
function resolveAllLabelEnd(events) {
  let index2 = -1;
  const newEvents = [];
  while (++index2 < events.length) {
    const token = events[index2][1];
    newEvents.push(events[index2]);
    if (token.type === "labelImage" || token.type === "labelLink" || token.type === "labelEnd") {
      const offset = token.type === "labelImage" ? 4 : 2;
      token.type = "data";
      index2 += offset;
    }
  }
  if (events.length !== newEvents.length) {
    splice(events, 0, events.length, newEvents);
  }
  return events;
}
function resolveToLabelEnd(events, context) {
  let index2 = events.length;
  let offset = 0;
  let open;
  let close;
  let media;
  while (index2--) {
    const token = events[index2][1];
    if (open) {
      if (token.type === "link" || token.type === "labelLink" && token._inactive) {
        break;
      }
      if (events[index2][0] === "enter" && token.type === "labelLink") {
        token._inactive = true;
      }
    } else if (close) {
      if (events[index2][0] === "enter" && (token.type === "labelImage" || token.type === "labelLink") && !token._balanced) {
        open = index2;
        if (token.type !== "labelLink") {
          offset = 2;
          break;
        }
      }
    } else if (token.type === "labelEnd") {
      close = index2;
    }
  }
  const group = {
    type: events[open][1].type === "labelLink" ? "link" : "image",
    start: {
      ...events[open][1].start
    },
    end: {
      ...events[events.length - 1][1].end
    }
  };
  const label = {
    type: "label",
    start: {
      ...events[open][1].start
    },
    end: {
      ...events[close][1].end
    }
  };
  const text4 = {
    type: "labelText",
    start: {
      ...events[open + offset + 2][1].end
    },
    end: {
      ...events[close - 2][1].start
    }
  };
  media = [["enter", group, context], ["enter", label, context]];
  media = push(media, events.slice(open + 1, open + offset + 3));
  media = push(media, [["enter", text4, context]]);
  media = push(media, resolveAll(context.parser.constructs.insideSpan.null, events.slice(open + offset + 4, close - 3), context));
  media = push(media, [["exit", text4, context], events[close - 2], events[close - 1], ["exit", label, context]]);
  media = push(media, events.slice(close + 1));
  media = push(media, [["exit", group, context]]);
  splice(events, open, events.length, media);
  return events;
}
function tokenizeLabelEnd(effects, ok3, nok) {
  const self = this;
  const labelStarts = self._labelStarts;
  let labelStart;
  let defined;
  if (labelStarts) {
    while (labelStarts.length > 0 && labelStarts[labelStarts.length - 1]._balanced) {
      labelStarts.pop();
    }
    labelStart = labelStarts[labelStarts.length - 1];
  }
  return start;
  function start(code2) {
    if (!labelStart) {
      return nok(code2);
    }
    if (labelStart._inactive) {
      return labelEndNok(code2);
    }
    defined = self.parser.defined.includes(normalizeIdentifier(self.sliceSerialize({
      start: labelStart.end,
      end: self.now()
    })));
    effects.enter("labelEnd");
    effects.enter("labelMarker");
    effects.consume(code2);
    effects.exit("labelMarker");
    effects.exit("labelEnd");
    return after;
  }
  function after(code2) {
    if (code2 === 40) {
      return effects.attempt(resourceConstruct, labelEndOk, defined ? labelEndOk : labelEndNok)(code2);
    }
    if (code2 === 91) {
      return effects.attempt(referenceFullConstruct, labelEndOk, defined ? referenceNotFull : labelEndNok)(code2);
    }
    return defined ? labelEndOk(code2) : labelEndNok(code2);
  }
  function referenceNotFull(code2) {
    return effects.attempt(referenceCollapsedConstruct, labelEndOk, labelEndNok)(code2);
  }
  function labelEndOk(code2) {
    labelStarts.pop();
    return ok3(code2);
  }
  function labelEndNok(code2) {
    labelStart._balanced = true;
    return nok(code2);
  }
}
function tokenizeResource(effects, ok3, nok) {
  return resourceStart;
  function resourceStart(code2) {
    effects.enter("resource");
    effects.enter("resourceMarker");
    effects.consume(code2);
    effects.exit("resourceMarker");
    return resourceBefore;
  }
  function resourceBefore(code2) {
    return markdownLineEndingOrSpace(code2) ? factoryWhitespace(effects, resourceOpen)(code2) : resourceOpen(code2);
  }
  function resourceOpen(code2) {
    if (code2 === 41) {
      return resourceEnd(code2);
    }
    return factoryDestination(effects, resourceDestinationAfter, resourceDestinationMissing, "resourceDestination", "resourceDestinationLiteral", "resourceDestinationLiteralMarker", "resourceDestinationRaw", "resourceDestinationString", 32)(code2);
  }
  function resourceDestinationAfter(code2) {
    return markdownLineEndingOrSpace(code2) ? factoryWhitespace(effects, resourceBetween)(code2) : resourceEnd(code2);
  }
  function resourceDestinationMissing(code2) {
    return nok(code2);
  }
  function resourceBetween(code2) {
    if (code2 === 34 || code2 === 39 || code2 === 40) {
      return factoryTitle(effects, resourceTitleAfter, nok, "resourceTitle", "resourceTitleMarker", "resourceTitleString")(code2);
    }
    return resourceEnd(code2);
  }
  function resourceTitleAfter(code2) {
    return markdownLineEndingOrSpace(code2) ? factoryWhitespace(effects, resourceEnd)(code2) : resourceEnd(code2);
  }
  function resourceEnd(code2) {
    if (code2 === 41) {
      effects.enter("resourceMarker");
      effects.consume(code2);
      effects.exit("resourceMarker");
      effects.exit("resource");
      return ok3;
    }
    return nok(code2);
  }
}
function tokenizeReferenceFull(effects, ok3, nok) {
  const self = this;
  return referenceFull;
  function referenceFull(code2) {
    return factoryLabel.call(self, effects, referenceFullAfter, referenceFullMissing, "reference", "referenceMarker", "referenceString")(code2);
  }
  function referenceFullAfter(code2) {
    return self.parser.defined.includes(normalizeIdentifier(self.sliceSerialize(self.events[self.events.length - 1][1]).slice(1, -1))) ? ok3(code2) : nok(code2);
  }
  function referenceFullMissing(code2) {
    return nok(code2);
  }
}
function tokenizeReferenceCollapsed(effects, ok3, nok) {
  return referenceCollapsedStart;
  function referenceCollapsedStart(code2) {
    effects.enter("reference");
    effects.enter("referenceMarker");
    effects.consume(code2);
    effects.exit("referenceMarker");
    return referenceCollapsedOpen;
  }
  function referenceCollapsedOpen(code2) {
    if (code2 === 93) {
      effects.enter("referenceMarker");
      effects.consume(code2);
      effects.exit("referenceMarker");
      effects.exit("reference");
      return ok3;
    }
    return nok(code2);
  }
}

// node_modules/micromark-core-commonmark/lib/label-start-image.js
var labelStartImage = {
  name: "labelStartImage",
  resolveAll: labelEnd.resolveAll,
  tokenize: tokenizeLabelStartImage
};
function tokenizeLabelStartImage(effects, ok3, nok) {
  const self = this;
  let labelImage;
  return start;
  function start(code2) {
    effects.enter("labelImage");
    effects.enter("labelImageMarker");
    effects.consume(code2);
    effects.exit("labelImageMarker");
    return open;
  }
  function open(code2) {
    if (code2 === 91) {
      effects.enter("labelMarker");
      effects.consume(code2);
      effects.exit("labelMarker");
      labelImage = effects.exit("labelImage");
      return after;
    }
    return nok(code2);
  }
  function after(code2) {
    if (code2 === 94 && "_hiddenFootnoteSupport" in self.parser.constructs) {
      return nok(code2);
    }
    self._labelStarts = self._labelStarts || [];
    self._labelStarts.push(labelImage);
    return ok3(code2);
  }
}

// node_modules/micromark-core-commonmark/lib/label-start-link.js
var labelStartLink = {
  name: "labelStartLink",
  resolveAll: labelEnd.resolveAll,
  tokenize: tokenizeLabelStartLink
};
function tokenizeLabelStartLink(effects, ok3, nok) {
  const self = this;
  let labelLink;
  return start;
  function start(code2) {
    effects.enter("labelLink");
    effects.enter("labelMarker");
    effects.consume(code2);
    effects.exit("labelMarker");
    labelLink = effects.exit("labelLink");
    return after;
  }
  function after(code2) {
    if (code2 === 94 && "_hiddenFootnoteSupport" in self.parser.constructs) {
      return nok(code2);
    }
    self._labelStarts = self._labelStarts || [];
    self._labelStarts.push(labelLink);
    return ok3(code2);
  }
}

// node_modules/micromark-core-commonmark/lib/line-ending.js
var lineEnding = {
  name: "lineEnding",
  tokenize: tokenizeLineEnding
};
function tokenizeLineEnding(effects, ok3) {
  return start;
  function start(code2) {
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return factorySpace(effects, ok3, "linePrefix");
  }
}

// node_modules/micromark-core-commonmark/lib/thematic-break.js
var thematicBreak = {
  name: "thematicBreak",
  tokenize: tokenizeThematicBreak
};
function tokenizeThematicBreak(effects, ok3, nok) {
  let size = 0;
  let marker;
  return start;
  function start(code2) {
    effects.enter("thematicBreak");
    return before(code2);
  }
  function before(code2) {
    marker = code2;
    return atBreak(code2);
  }
  function atBreak(code2) {
    if (code2 === marker) {
      effects.enter("thematicBreakSequence");
      return sequence(code2);
    }
    if (size >= 3 && (code2 === null || markdownLineEnding(code2))) {
      effects.exit("thematicBreak");
      return ok3(code2);
    }
    return nok(code2);
  }
  function sequence(code2) {
    if (code2 === marker) {
      effects.consume(code2);
      size++;
      return sequence;
    }
    effects.exit("thematicBreakSequence");
    return markdownSpace(code2) ? factorySpace(effects, atBreak, "whitespace")(code2) : atBreak(code2);
  }
}

// node_modules/micromark-core-commonmark/lib/list.js
var list = {
  continuation: {
    tokenize: tokenizeListContinuation
  },
  exit: tokenizeListEnd,
  name: "list",
  tokenize: tokenizeListStart
};
var listItemPrefixWhitespaceConstruct = {
  partial: true,
  tokenize: tokenizeListItemPrefixWhitespace
};
var indentConstruct = {
  partial: true,
  tokenize: tokenizeIndent
};
function tokenizeListStart(effects, ok3, nok) {
  const self = this;
  const tail = self.events[self.events.length - 1];
  let initialSize = tail && tail[1].type === "linePrefix" ? tail[2].sliceSerialize(tail[1], true).length : 0;
  let size = 0;
  return start;
  function start(code2) {
    const kind = self.containerState.type || (code2 === 42 || code2 === 43 || code2 === 45 ? "listUnordered" : "listOrdered");
    if (kind === "listUnordered" ? !self.containerState.marker || code2 === self.containerState.marker : asciiDigit(code2)) {
      if (!self.containerState.type) {
        self.containerState.type = kind;
        effects.enter(kind, {
          _container: true
        });
      }
      if (kind === "listUnordered") {
        effects.enter("listItemPrefix");
        return code2 === 42 || code2 === 45 ? effects.check(thematicBreak, nok, atMarker)(code2) : atMarker(code2);
      }
      if (!self.interrupt || code2 === 49) {
        effects.enter("listItemPrefix");
        effects.enter("listItemValue");
        return inside(code2);
      }
    }
    return nok(code2);
  }
  function inside(code2) {
    if (asciiDigit(code2) && ++size < 10) {
      effects.consume(code2);
      return inside;
    }
    if ((!self.interrupt || size < 2) && (self.containerState.marker ? code2 === self.containerState.marker : code2 === 41 || code2 === 46)) {
      effects.exit("listItemValue");
      return atMarker(code2);
    }
    return nok(code2);
  }
  function atMarker(code2) {
    effects.enter("listItemMarker");
    effects.consume(code2);
    effects.exit("listItemMarker");
    self.containerState.marker = self.containerState.marker || code2;
    return effects.check(
      blankLine,
      // Can’t be empty when interrupting.
      self.interrupt ? nok : onBlank,
      effects.attempt(listItemPrefixWhitespaceConstruct, endOfPrefix, otherPrefix)
    );
  }
  function onBlank(code2) {
    self.containerState.initialBlankLine = true;
    initialSize++;
    return endOfPrefix(code2);
  }
  function otherPrefix(code2) {
    if (markdownSpace(code2)) {
      effects.enter("listItemPrefixWhitespace");
      effects.consume(code2);
      effects.exit("listItemPrefixWhitespace");
      return endOfPrefix;
    }
    return nok(code2);
  }
  function endOfPrefix(code2) {
    self.containerState.size = initialSize + self.sliceSerialize(effects.exit("listItemPrefix"), true).length;
    return ok3(code2);
  }
}
function tokenizeListContinuation(effects, ok3, nok) {
  const self = this;
  self.containerState._closeFlow = void 0;
  return effects.check(blankLine, onBlank, notBlank);
  function onBlank(code2) {
    self.containerState.furtherBlankLines = self.containerState.furtherBlankLines || self.containerState.initialBlankLine;
    return factorySpace(effects, ok3, "listItemIndent", self.containerState.size + 1)(code2);
  }
  function notBlank(code2) {
    if (self.containerState.furtherBlankLines || !markdownSpace(code2)) {
      self.containerState.furtherBlankLines = void 0;
      self.containerState.initialBlankLine = void 0;
      return notInCurrentItem(code2);
    }
    self.containerState.furtherBlankLines = void 0;
    self.containerState.initialBlankLine = void 0;
    return effects.attempt(indentConstruct, ok3, notInCurrentItem)(code2);
  }
  function notInCurrentItem(code2) {
    self.containerState._closeFlow = true;
    self.interrupt = void 0;
    return factorySpace(effects, effects.attempt(list, ok3, nok), "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code2);
  }
}
function tokenizeIndent(effects, ok3, nok) {
  const self = this;
  return factorySpace(effects, afterPrefix, "listItemIndent", self.containerState.size + 1);
  function afterPrefix(code2) {
    const tail = self.events[self.events.length - 1];
    return tail && tail[1].type === "listItemIndent" && tail[2].sliceSerialize(tail[1], true).length === self.containerState.size ? ok3(code2) : nok(code2);
  }
}
function tokenizeListEnd(effects) {
  effects.exit(this.containerState.type);
}
function tokenizeListItemPrefixWhitespace(effects, ok3, nok) {
  const self = this;
  return factorySpace(effects, afterPrefix, "listItemPrefixWhitespace", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4 + 1);
  function afterPrefix(code2) {
    const tail = self.events[self.events.length - 1];
    return !markdownSpace(code2) && tail && tail[1].type === "listItemPrefixWhitespace" ? ok3(code2) : nok(code2);
  }
}

// node_modules/micromark-core-commonmark/lib/setext-underline.js
var setextUnderline = {
  name: "setextUnderline",
  resolveTo: resolveToSetextUnderline,
  tokenize: tokenizeSetextUnderline
};
function resolveToSetextUnderline(events, context) {
  const editMap = new EditMap();
  let index2 = events.length;
  let content3;
  let text4;
  let definition2;
  while (index2--) {
    if (events[index2][0] === "enter") {
      if (events[index2][1].type === "content") {
        content3 = index2;
        break;
      }
      if (events[index2][1].type === "paragraph") {
        text4 = index2;
      }
    } else {
      if (events[index2][1].type === "content") {
        editMap.add(index2, 1, []);
      }
      if (!definition2 && events[index2][1].type === "definition") {
        definition2 = index2;
      }
    }
  }
  const heading = {
    type: "setextHeading",
    start: {
      ...events[content3][1].start
    },
    end: {
      ...events[events.length - 1][1].end
    }
  };
  events[text4][1].type = "setextHeadingText";
  if (definition2) {
    editMap.add(text4, 0, [["enter", heading, context]]);
    editMap.add(definition2 + 1, 0, [["exit", events[content3][1], context]]);
    events[content3][1].end = {
      ...events[definition2][1].end
    };
  } else {
    events[content3][1] = heading;
  }
  editMap.add(events.length, 0, [["exit", heading, context]]);
  editMap.consume(events);
  return events;
}
function tokenizeSetextUnderline(effects, ok3, nok) {
  const self = this;
  let marker;
  return start;
  function start(code2) {
    let index2 = self.events.length;
    let paragraph;
    while (index2--) {
      if (self.events[index2][1].type !== "lineEnding" && self.events[index2][1].type !== "linePrefix" && self.events[index2][1].type !== "content") {
        paragraph = self.events[index2][1].type === "paragraph";
        break;
      }
    }
    if (!self.parser.lazy[self.now().line] && (self.interrupt || paragraph)) {
      effects.enter("setextHeadingLine");
      marker = code2;
      return before(code2);
    }
    return nok(code2);
  }
  function before(code2) {
    effects.enter("setextHeadingLineSequence");
    return inside(code2);
  }
  function inside(code2) {
    if (code2 === marker) {
      effects.consume(code2);
      return inside;
    }
    effects.exit("setextHeadingLineSequence");
    return markdownSpace(code2) ? factorySpace(effects, after, "lineSuffix")(code2) : after(code2);
  }
  function after(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("setextHeadingLine");
      return ok3(code2);
    }
    return nok(code2);
  }
}

// node_modules/micromark/lib/initialize/flow.js
var flow = {
  tokenize: initializeFlow
};
function initializeFlow(effects) {
  const self = this;
  const initial = effects.attempt(
    // Try to parse a blank line.
    blankLine,
    atBlankEnding,
    // Try to parse initial flow (essentially, only code).
    effects.attempt(this.parser.constructs.flowInitial, afterConstruct, factorySpace(effects, effects.attempt(this.parser.constructs.flow, afterConstruct, effects.attempt(content2, afterConstruct)), "linePrefix"))
  );
  return initial;
  function atBlankEnding(code2) {
    if (code2 === null) {
      effects.consume(code2);
      return;
    }
    effects.enter("lineEndingBlank");
    effects.consume(code2);
    effects.exit("lineEndingBlank");
    self.currentConstruct = void 0;
    return initial;
  }
  function afterConstruct(code2) {
    if (code2 === null) {
      effects.consume(code2);
      return;
    }
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    self.currentConstruct = void 0;
    return initial;
  }
}

// node_modules/micromark/lib/initialize/text.js
var resolver = {
  resolveAll: createResolver()
};
var string = initializeFactory("string");
var text = initializeFactory("text");
function initializeFactory(field) {
  return {
    resolveAll: createResolver(field === "text" ? resolveAllLineSuffixes : void 0),
    tokenize: initializeText
  };
  function initializeText(effects) {
    const self = this;
    const constructs2 = this.parser.constructs[field];
    const text4 = effects.attempt(constructs2, start, notText);
    return start;
    function start(code2) {
      return atBreak(code2) ? text4(code2) : notText(code2);
    }
    function notText(code2) {
      if (code2 === null) {
        effects.consume(code2);
        return;
      }
      effects.enter("data");
      effects.consume(code2);
      return data;
    }
    function data(code2) {
      if (atBreak(code2)) {
        effects.exit("data");
        return text4(code2);
      }
      effects.consume(code2);
      return data;
    }
    function atBreak(code2) {
      if (code2 === null) {
        return true;
      }
      const list2 = constructs2[code2];
      let index2 = -1;
      if (list2) {
        while (++index2 < list2.length) {
          const item = list2[index2];
          if (!item.previous || item.previous.call(self, self.previous)) {
            return true;
          }
        }
      }
      return false;
    }
  }
}
function createResolver(extraResolver) {
  return resolveAllText;
  function resolveAllText(events, context) {
    let index2 = -1;
    let enter;
    while (++index2 <= events.length) {
      if (enter === void 0) {
        if (events[index2] && events[index2][1].type === "data") {
          enter = index2;
          index2++;
        }
      } else if (!events[index2] || events[index2][1].type !== "data") {
        if (index2 !== enter + 2) {
          events[enter][1].end = events[index2 - 1][1].end;
          events.splice(enter + 2, index2 - enter - 2);
          index2 = enter + 2;
        }
        enter = void 0;
      }
    }
    return extraResolver ? extraResolver(events, context) : events;
  }
}
function resolveAllLineSuffixes(events, context) {
  const editMap = new EditMap();
  let eventIndex = 0;
  while (++eventIndex <= events.length) {
    if ((eventIndex === events.length || events[eventIndex][1].type === "lineEnding") && events[eventIndex - 1][1].type === "data") {
      const data = events[eventIndex - 1][1];
      const chunks = context.sliceStream(data);
      let index2 = chunks.length;
      let bufferIndex = -1;
      let size = 0;
      let tabs;
      while (index2--) {
        const chunk = chunks[index2];
        if (typeof chunk === "string") {
          bufferIndex = chunk.length;
          while (chunk.charCodeAt(bufferIndex - 1) === 32) {
            size++;
            bufferIndex--;
          }
          if (bufferIndex) {
            break;
          }
          bufferIndex = -1;
        } else if (chunk === -2) {
          tabs = true;
          size++;
        } else if (chunk === -1) {
        } else {
          index2++;
          break;
        }
      }
      if (context._contentTypeTextTrailing && eventIndex === events.length) {
        size = 0;
      }
      if (size) {
        const token = {
          type: eventIndex === events.length || tabs || size < 2 ? "lineSuffix" : "hardBreakTrailing",
          start: {
            _bufferIndex: index2 ? bufferIndex : data.start._bufferIndex + bufferIndex,
            _index: data.start._index + index2,
            line: data.end.line,
            column: data.end.column - size,
            offset: data.end.offset - size
          },
          end: {
            ...data.end
          }
        };
        data.end = {
          ...token.start
        };
        if (data.start.offset === data.end.offset) {
          Object.assign(data, token);
        } else {
          editMap.add(eventIndex, 0, [["enter", token, context], ["exit", token, context]]);
        }
      }
      eventIndex++;
    }
  }
  editMap.consume(events);
  return events;
}

// node_modules/micromark/lib/constructs.js
var constructs_exports = {};
__export(constructs_exports, {
  attentionMarkers: () => attentionMarkers,
  contentInitial: () => contentInitial,
  disable: () => disable,
  document: () => document3,
  flow: () => flow2,
  flowInitial: () => flowInitial,
  insideSpan: () => insideSpan,
  string: () => string2,
  text: () => text2
});
var document3 = {
  [42]: list,
  [43]: list,
  [45]: list,
  [48]: list,
  [49]: list,
  [50]: list,
  [51]: list,
  [52]: list,
  [53]: list,
  [54]: list,
  [55]: list,
  [56]: list,
  [57]: list,
  [62]: blockQuote
};
var contentInitial = {
  [91]: definition
};
var flowInitial = {
  [-2]: codeIndented,
  [-1]: codeIndented,
  [32]: codeIndented
};
var flow2 = {
  [35]: headingAtx,
  [42]: thematicBreak,
  [45]: [setextUnderline, thematicBreak],
  [60]: htmlFlow,
  [61]: setextUnderline,
  [95]: thematicBreak,
  [96]: codeFenced,
  [126]: codeFenced
};
var string2 = {
  [38]: characterReference,
  [92]: characterEscape
};
var text2 = {
  [-5]: lineEnding,
  [-4]: lineEnding,
  [-3]: lineEnding,
  [33]: labelStartImage,
  [38]: characterReference,
  [42]: attention,
  [60]: [autolink, htmlText],
  [91]: labelStartLink,
  [92]: [hardBreakEscape, characterEscape],
  [93]: labelEnd,
  [95]: attention,
  [96]: codeText
};
var insideSpan = {
  null: [attention, resolver]
};
var attentionMarkers = {
  null: [42, 95]
};
var disable = {
  null: []
};

// node_modules/micromark/lib/create-tokenizer.js
function createTokenizer(parser, initialize, from) {
  let point3 = {
    _bufferIndex: -1,
    _index: 0,
    line: from && from.line || 1,
    column: from && from.column || 1,
    offset: from && from.offset || 0
  };
  const columnStart = {};
  const resolveAllConstructs = [];
  let chunks = [];
  let stack = [];
  let consumed = true;
  const effects = {
    attempt: constructFactory(onsuccessfulconstruct),
    check: constructFactory(onsuccessfulcheck),
    consume,
    enter,
    exit: exit3,
    interrupt: constructFactory(onsuccessfulcheck, {
      interrupt: true
    })
  };
  const context = {
    code: null,
    containerState: {},
    defineSkip,
    events: [],
    now,
    parser,
    previous: null,
    sliceSerialize,
    sliceStream,
    write
  };
  let state = initialize.tokenize.call(context, effects);
  let expectedCode;
  if (initialize.resolveAll) {
    resolveAllConstructs.push(initialize);
  }
  return context;
  function write(slice) {
    chunks = push(chunks, slice);
    main();
    if (chunks[chunks.length - 1] !== null) {
      return [];
    }
    addResult(initialize, 0);
    context.events = resolveAll(resolveAllConstructs, context.events, context);
    return context.events;
  }
  function sliceSerialize(token, expandTabs) {
    return serializeChunks(sliceStream(token), expandTabs);
  }
  function sliceStream(token) {
    return sliceChunks(chunks, token);
  }
  function now() {
    const {
      _bufferIndex,
      _index,
      line,
      column,
      offset
    } = point3;
    return {
      _bufferIndex,
      _index,
      line,
      column,
      offset
    };
  }
  function defineSkip(value) {
    columnStart[value.line] = value.column;
    accountForPotentialSkip();
  }
  function main() {
    while (point3._index < chunks.length) {
      const chunk = chunks[point3._index];
      if (typeof chunk === "string") {
        const chunkIndex = point3._index;
        if (point3._bufferIndex < 0) {
          point3._bufferIndex = 0;
        }
        while (point3._index === chunkIndex && point3._bufferIndex < chunk.length) {
          go(chunk.charCodeAt(point3._bufferIndex));
        }
      } else {
        go(chunk);
      }
    }
  }
  function go(code2) {
    consumed = void 0;
    expectedCode = code2;
    state = state(code2);
  }
  function consume(code2) {
    if (markdownLineEnding(code2)) {
      point3.line++;
      point3.column = 1;
      point3.offset += code2 === -3 ? 2 : 1;
      accountForPotentialSkip();
    } else if (code2 !== -1) {
      point3.column++;
      point3.offset++;
    }
    if (point3._bufferIndex < 0) {
      point3._index++;
    } else {
      point3._bufferIndex++;
      if (point3._bufferIndex === // Points w/ non-negative `_bufferIndex` reference
      // strings.
      /** @type {string} */
      chunks[point3._index].length) {
        point3._bufferIndex = -1;
        point3._index++;
      }
    }
    context.previous = code2;
    consumed = true;
  }
  function enter(type, fields) {
    const token = fields || {};
    token.type = type;
    token.start = now();
    context.events.push(["enter", token, context]);
    stack.push(token);
    return token;
  }
  function exit3(type) {
    const token = stack.pop();
    token.end = now();
    context.events.push(["exit", token, context]);
    return token;
  }
  function onsuccessfulconstruct(construct, info) {
    addResult(construct, info.from);
  }
  function onsuccessfulcheck(_, info) {
    info.restore();
  }
  function constructFactory(onreturn, fields) {
    return hook;
    function hook(constructs2, returnState, bogusState) {
      let listOfConstructs;
      let constructIndex;
      let currentConstruct;
      let info;
      return Array.isArray(constructs2) ? (
        /* c8 ignore next 1 */
        handleListOfConstructs(constructs2)
      ) : "tokenize" in constructs2 ? (
        // Looks like a construct.
        handleListOfConstructs([
          /** @type {Construct} */
          constructs2
        ])
      ) : handleMapOfConstructs(constructs2);
      function handleMapOfConstructs(map) {
        return start;
        function start(code2) {
          const left = code2 !== null && map[code2];
          const all2 = code2 !== null && map.null;
          const list2 = [
            // To do: add more extension tests.
            /* c8 ignore next 2 */
            ...Array.isArray(left) ? left : left ? [left] : [],
            ...Array.isArray(all2) ? all2 : all2 ? [all2] : []
          ];
          return handleListOfConstructs(list2)(code2);
        }
      }
      function handleListOfConstructs(list2) {
        listOfConstructs = list2;
        constructIndex = 0;
        if (list2.length === 0) {
          return bogusState;
        }
        return handleConstruct(list2[constructIndex]);
      }
      function handleConstruct(construct) {
        return start;
        function start(code2) {
          info = store();
          currentConstruct = construct;
          if (!construct.partial) {
            context.currentConstruct = construct;
          }
          if (construct.name && context.parser.constructs.disable.null.includes(construct.name)) {
            return nok(code2);
          }
          return construct.tokenize.call(
            // If we do have fields, create an object w/ `context` as its
            // prototype.
            // This allows a “live binding”, which is needed for `interrupt`.
            fields ? Object.assign(Object.create(context), fields) : context,
            effects,
            ok3,
            nok
          )(code2);
        }
      }
      function ok3(code2) {
        consumed = true;
        onreturn(currentConstruct, info);
        return returnState;
      }
      function nok(code2) {
        consumed = true;
        info.restore();
        if (++constructIndex < listOfConstructs.length) {
          return handleConstruct(listOfConstructs[constructIndex]);
        }
        return bogusState;
      }
    }
  }
  function addResult(construct, from2) {
    if (construct.resolveAll && !resolveAllConstructs.includes(construct)) {
      resolveAllConstructs.push(construct);
    }
    if (construct.resolve) {
      splice(context.events, from2, context.events.length - from2, construct.resolve(context.events.slice(from2), context));
    }
    if (construct.resolveTo) {
      context.events = construct.resolveTo(context.events, context);
    }
  }
  function store() {
    const startPoint = now();
    const startPrevious = context.previous;
    const startCurrentConstruct = context.currentConstruct;
    const startEventsIndex = context.events.length;
    const startStack = Array.from(stack);
    return {
      from: startEventsIndex,
      restore
    };
    function restore() {
      point3 = startPoint;
      context.previous = startPrevious;
      context.currentConstruct = startCurrentConstruct;
      context.events.length = startEventsIndex;
      stack = startStack;
      accountForPotentialSkip();
    }
  }
  function accountForPotentialSkip() {
    if (point3.line in columnStart && point3.column < 2) {
      point3.column = columnStart[point3.line];
      point3.offset += columnStart[point3.line] - 1;
    }
  }
}
function sliceChunks(chunks, token) {
  const startIndex = token.start._index;
  const startBufferIndex = token.start._bufferIndex;
  const endIndex = token.end._index;
  const endBufferIndex = token.end._bufferIndex;
  let view;
  if (startIndex === endIndex) {
    view = [chunks[startIndex].slice(startBufferIndex, endBufferIndex)];
  } else {
    view = chunks.slice(startIndex, endIndex);
    if (startBufferIndex > -1) {
      const head = view[0];
      if (typeof head === "string") {
        view[0] = head.slice(startBufferIndex);
      } else {
        view.shift();
      }
    }
    if (endBufferIndex > 0) {
      view.push(chunks[endIndex].slice(0, endBufferIndex));
    }
  }
  return view;
}
function serializeChunks(chunks, expandTabs) {
  let index2 = -1;
  const result = [];
  let atTab;
  while (++index2 < chunks.length) {
    const chunk = chunks[index2];
    let value;
    if (typeof chunk === "string") {
      value = chunk;
    } else {
      switch (chunk) {
        case -5: {
          value = "\r";
          break;
        }
        case -4: {
          value = "\n";
          break;
        }
        case -3: {
          value = "\r\n";
          break;
        }
        case -2: {
          value = expandTabs ? " " : "	";
          break;
        }
        case -1: {
          if (!expandTabs && atTab) {
            continue;
          }
          value = " ";
          break;
        }
        default: {
          value = String.fromCharCode(chunk);
        }
      }
    }
    atTab = chunk === -2;
    result.push(value);
  }
  return result.join("");
}

// node_modules/micromark/lib/parse.js
function parse(options) {
  const settings = options || {};
  const constructs2 = (
    /** @type {FullNormalizedExtension} */
    combineExtensions([constructs_exports, ...settings.extensions || []])
  );
  const parser = {
    constructs: constructs2,
    content: create(content),
    defined: [],
    document: create(document2),
    flow: create(flow),
    lazy: {},
    string: create(string),
    text: create(text)
  };
  return parser;
  function create(initial) {
    return creator;
    function creator(from) {
      return createTokenizer(parser, initial, from);
    }
  }
}

// node_modules/micromark/lib/postprocess.js
function postprocess(events) {
  while (!subtokenize(events)) {
  }
  return events;
}

// node_modules/micromark/lib/preprocess.js
var search = /[\0\t\n\r]/g;
function preprocess() {
  let column = 1;
  let buffer = "";
  let start = true;
  let atCarriageReturn;
  return preprocessor;
  function preprocessor(value, encoding, end) {
    value = buffer + (typeof value === "string" ? value.toString() : new TextDecoder(encoding || void 0).decode(value));
    const chunks = [];
    let startPosition = 0;
    buffer = "";
    if (start) {
      if (value.charCodeAt(0) === 65279) {
        startPosition++;
      }
      start = void 0;
    }
    while (startPosition < value.length) {
      search.lastIndex = startPosition;
      const match = search.exec(value);
      const endPosition = match && match.index !== void 0 ? match.index : value.length;
      const code2 = value.charCodeAt(endPosition);
      if (!match) {
        buffer = value.slice(startPosition);
        break;
      }
      if (code2 === 10 && startPosition === endPosition && atCarriageReturn) {
        chunks.push(-3);
        atCarriageReturn = void 0;
      } else {
        if (atCarriageReturn) {
          chunks.push(-5);
          atCarriageReturn = void 0;
        }
        if (startPosition < endPosition) {
          chunks.push(value.slice(startPosition, endPosition));
          column += endPosition - startPosition;
        }
        switch (code2) {
          case 0: {
            chunks.push(65533);
            column++;
            break;
          }
          case 9: {
            const next = Math.ceil(column / 4) * 4;
            chunks.push(-2);
            while (column++ < next) {
              chunks.push(-1);
            }
            break;
          }
          case 10: {
            chunks.push(-4);
            column = 1;
            break;
          }
          default: {
            atCarriageReturn = true;
            column = 1;
          }
        }
      }
      startPosition = endPosition + 1;
    }
    if (end) {
      if (atCarriageReturn) {
        chunks.push(-5);
      }
      if (buffer) {
        chunks.push(buffer);
      }
      chunks.push(null);
    }
    return chunks;
  }
}

// node_modules/micromark-util-decode-string/index.js
var characterEscapeOrReference = /\\([!-/:-@[-`{-~])|&(#(?:\d{1,7}|x[\da-f]{1,6})|[\da-z]{1,31});/gi;
function decodeString(value) {
  return value.replace(characterEscapeOrReference, decode);
}
function decode($0, $1, $2) {
  if ($1) {
    return $1;
  }
  const head = $2.charCodeAt(0);
  if (head === 35) {
    const head2 = $2.charCodeAt(1);
    const hex = head2 === 120 || head2 === 88;
    return decodeNumericCharacterReference($2.slice(hex ? 2 : 1), hex ? 16 : 10);
  }
  return decodeNamedCharacterReference($2) || $0;
}

// node_modules/unist-util-stringify-position/lib/index.js
function stringifyPosition(value) {
  if (!value || typeof value !== "object") {
    return "";
  }
  if ("position" in value || "type" in value) {
    return position(value.position);
  }
  if ("start" in value || "end" in value) {
    return position(value);
  }
  if ("line" in value || "column" in value) {
    return point(value);
  }
  return "";
}
function point(point3) {
  return index(point3 && point3.line) + ":" + index(point3 && point3.column);
}
function position(pos) {
  return point(pos && pos.start) + "-" + point(pos && pos.end);
}
function index(value) {
  return value && typeof value === "number" ? value : 1;
}

// node_modules/mdast-util-from-markdown/lib/index.js
var own = {}.hasOwnProperty;
function fromMarkdown(value, encoding, options) {
  if (encoding && typeof encoding === "object") {
    options = encoding;
    encoding = void 0;
  }
  return compiler(options)(postprocess(parse(options).document().write(preprocess()(value, encoding, true))));
}
function compiler(options) {
  const config = {
    afterExit: [],
    beforeEnter: [],
    transforms: [],
    canContainEols: ["emphasis", "fragment", "heading", "paragraph", "strong"],
    enter: {
      autolink: opener(link),
      autolinkProtocol: onenterdata,
      autolinkEmail: onenterdata,
      atxHeading: opener(heading),
      blockQuote: opener(blockQuote2),
      characterEscape: onenterdata,
      characterReference: onenterdata,
      codeFenced: opener(codeFlow),
      codeFencedFenceInfo: buffer,
      codeFencedFenceMeta: buffer,
      codeIndented: opener(codeFlow, buffer),
      codeText: opener(codeText2, buffer),
      codeTextData: onenterdata,
      data: onenterdata,
      codeFlowValue: onenterdata,
      definition: opener(definition2),
      definitionDestinationString: buffer,
      definitionLabelString: buffer,
      definitionTitleString: buffer,
      emphasis: opener(emphasis),
      hardBreakEscape: opener(hardBreak),
      hardBreakTrailing: opener(hardBreak),
      htmlFlow: opener(html, buffer),
      htmlFlowData: onenterdata,
      htmlText: opener(html, buffer),
      htmlTextData: onenterdata,
      image: opener(image),
      label: buffer,
      link: opener(link),
      listItem: opener(listItem),
      listItemValue: onenterlistitemvalue,
      listOrdered: opener(list2, onenterlistordered),
      listUnordered: opener(list2),
      paragraph: opener(paragraph),
      reference: onenterreference,
      referenceString: buffer,
      resourceDestinationString: buffer,
      resourceTitleString: buffer,
      setextHeading: opener(heading),
      strong: opener(strong),
      thematicBreak: opener(thematicBreak2)
    },
    exit: {
      atxHeading: closer(),
      atxHeadingSequence: onexitatxheadingsequence,
      autolink: closer(),
      autolinkEmail: onexitautolinkemail,
      autolinkProtocol: onexitautolinkprotocol,
      blockQuote: closer(),
      characterEscapeValue: onexitdata,
      characterReferenceMarkerHexadecimal: onexitcharacterreferencemarker,
      characterReferenceMarkerNumeric: onexitcharacterreferencemarker,
      characterReferenceValue: onexitcharacterreferencevalue,
      characterReference: onexitcharacterreference,
      codeFenced: closer(onexitcodefenced),
      codeFencedFence: onexitcodefencedfence,
      codeFencedFenceInfo: onexitcodefencedfenceinfo,
      codeFencedFenceMeta: onexitcodefencedfencemeta,
      codeFlowValue: onexitdata,
      codeIndented: closer(onexitcodeindented),
      codeText: closer(onexitcodetext),
      codeTextData: onexitdata,
      data: onexitdata,
      definition: closer(),
      definitionDestinationString: onexitdefinitiondestinationstring,
      definitionLabelString: onexitdefinitionlabelstring,
      definitionTitleString: onexitdefinitiontitlestring,
      emphasis: closer(),
      hardBreakEscape: closer(onexithardbreak),
      hardBreakTrailing: closer(onexithardbreak),
      htmlFlow: closer(onexithtmlflow),
      htmlFlowData: onexitdata,
      htmlText: closer(onexithtmltext),
      htmlTextData: onexitdata,
      image: closer(onexitimage),
      label: onexitlabel,
      labelText: onexitlabeltext,
      lineEnding: onexitlineending,
      link: closer(onexitlink),
      listItem: closer(),
      listOrdered: closer(),
      listUnordered: closer(),
      paragraph: closer(),
      referenceString: onexitreferencestring,
      resourceDestinationString: onexitresourcedestinationstring,
      resourceTitleString: onexitresourcetitlestring,
      resource: onexitresource,
      setextHeading: closer(onexitsetextheading),
      setextHeadingLineSequence: onexitsetextheadinglinesequence,
      setextHeadingText: onexitsetextheadingtext,
      strong: closer(),
      thematicBreak: closer()
    }
  };
  configure(config, (options || {}).mdastExtensions || []);
  const data = {};
  return compile;
  function compile(events) {
    let tree = {
      type: "root",
      children: [],
      position: void 0
    };
    const context = {
      stack: [tree],
      tokenStack: [],
      config,
      enter,
      exit: exit3,
      buffer,
      resume,
      data
    };
    const listStack = [];
    const prepared = [];
    let index2 = -1;
    while (++index2 < events.length) {
      prepared.push(events[index2]);
      if (events[index2][1].type === "listOrdered" || events[index2][1].type === "listUnordered") {
        if (events[index2][0] === "enter") {
          listStack.push(prepared.length - 1);
        } else {
          const tail = listStack.pop();
          prepareList(prepared, tail);
        }
      }
    }
    events = prepared;
    index2 = -1;
    while (++index2 < events.length) {
      const handler = config[events[index2][0]];
      if (events[index2][0] === "enter" && config.beforeEnter.length > 0) {
        callListeners(config.beforeEnter, {
          ...context,
          sliceSerialize: events[index2][2].sliceSerialize
        }, events[index2][1]);
      }
      if (own.call(handler, events[index2][1].type)) {
        handler[events[index2][1].type].call({
          ...context,
          sliceSerialize: events[index2][2].sliceSerialize
        }, events[index2][1]);
      }
      if (events[index2][0] === "exit" && config.afterExit.length > 0) {
        callListeners(config.afterExit, {
          ...context,
          sliceSerialize: events[index2][2].sliceSerialize
        }, events[index2][1]);
      }
    }
    if (context.tokenStack.length > 0) {
      const tail = context.tokenStack[context.tokenStack.length - 1];
      const handler = tail[1] || defaultOnError;
      handler.call(context, void 0, tail[0]);
    }
    tree.position = {
      start: point2(events.length > 0 ? events[0][1].start : {
        line: 1,
        column: 1,
        offset: 0
      }),
      end: point2(events.length > 0 ? events[events.length - 2][1].end : {
        line: 1,
        column: 1,
        offset: 0
      })
    };
    index2 = -1;
    while (++index2 < config.transforms.length) {
      tree = config.transforms[index2](tree) || tree;
    }
    return tree;
  }
  function callListeners(listeners, context, token) {
    let index2 = -1;
    while (++index2 < listeners.length) {
      listeners[index2].call(context, token);
    }
  }
  function prepareList(events, start) {
    const end = events.length - 1;
    let index2 = start - 1;
    let containerBalance = -1;
    let listSpread = false;
    let listItem2;
    let lineIndex;
    let firstBlankLineIndex;
    let atMarker;
    const insertions = [];
    while (++index2 <= end) {
      const event = events[index2];
      switch (event[1].type) {
        case "listUnordered":
        case "listOrdered":
        case "blockQuote": {
          if (event[0] === "enter") {
            containerBalance++;
          } else {
            containerBalance--;
          }
          atMarker = void 0;
          break;
        }
        case "lineEndingBlank": {
          if (event[0] === "enter") {
            if (listItem2 && !atMarker && !containerBalance && !firstBlankLineIndex) {
              firstBlankLineIndex = index2;
            }
            atMarker = void 0;
          }
          break;
        }
        case "linePrefix":
        case "listItemValue":
        case "listItemMarker":
        case "listItemPrefix":
        case "listItemPrefixWhitespace": {
          break;
        }
        default: {
          atMarker = void 0;
        }
      }
      if (!containerBalance && event[0] === "enter" && event[1].type === "listItemPrefix" || containerBalance === -1 && event[0] === "exit" && (event[1].type === "listUnordered" || event[1].type === "listOrdered")) {
        if (listItem2) {
          let tailIndex = index2;
          lineIndex = void 0;
          while (tailIndex--) {
            const tailEvent = events[tailIndex];
            if (tailEvent[1].type === "lineEnding" || tailEvent[1].type === "lineEndingBlank") {
              if (tailEvent[0] === "exit") continue;
              if (lineIndex) {
                events[lineIndex][1].type = "lineEndingBlank";
                listSpread = true;
              }
              tailEvent[1].type = "lineEnding";
              lineIndex = tailIndex;
            } else if (tailEvent[1].type === "linePrefix" || tailEvent[1].type === "blockQuotePrefix" || tailEvent[1].type === "blockQuotePrefixWhitespace" || tailEvent[1].type === "blockQuoteMarker" || tailEvent[1].type === "listItemIndent") {
            } else {
              break;
            }
          }
          if (firstBlankLineIndex && (!lineIndex || firstBlankLineIndex < lineIndex)) {
            listItem2._spread = true;
          }
          listItem2.end = Object.assign({}, lineIndex ? events[lineIndex][1].start : event[1].end);
          insertions.push({
            at: lineIndex || index2,
            event: ["exit", listItem2, event[2]]
          });
        }
        if (event[1].type === "listItemPrefix") {
          const item = {
            type: "listItem",
            _spread: false,
            start: Object.assign({}, event[1].start),
            // @ts-expect-error: we’ll add `end` in a second.
            end: void 0
          };
          listItem2 = item;
          insertions.push({
            at: index2,
            event: ["enter", item, event[2]]
          });
          firstBlankLineIndex = void 0;
          atMarker = true;
        }
      }
    }
    const listEvents = events.splice(start);
    let insertion = 0;
    index2 = -1;
    while (++index2 < listEvents.length) {
      while (insertion < insertions.length && insertions[insertion].at === start + index2) {
        events.push(insertions[insertion++].event);
      }
      events.push(listEvents[index2]);
    }
    events[start][1]._spread = listSpread;
  }
  function opener(create, and) {
    return open;
    function open(token) {
      enter.call(this, create(token), token);
      if (and) and.call(this, token);
    }
  }
  function buffer() {
    this.stack.push({
      type: "fragment",
      children: []
    });
  }
  function enter(node2, token, errorHandler) {
    const parent = this.stack[this.stack.length - 1];
    const siblings = parent.children;
    siblings.push(node2);
    this.stack.push(node2);
    this.tokenStack.push([token, errorHandler || void 0]);
    node2.position = {
      start: point2(token.start),
      // @ts-expect-error: `end` will be patched later.
      end: void 0
    };
  }
  function closer(and) {
    return close;
    function close(token) {
      if (and) and.call(this, token);
      exit3.call(this, token);
    }
  }
  function exit3(token, onExitError) {
    const node2 = this.stack.pop();
    const open = this.tokenStack.pop();
    if (!open) {
      throw new Error("Cannot close `" + token.type + "` (" + stringifyPosition({
        start: token.start,
        end: token.end
      }) + "): it\u2019s not open");
    }
    if (open[0].type !== token.type) {
      if (onExitError) {
        onExitError.call(this, token, open[0]);
      } else {
        const handler = open[1] || defaultOnError;
        handler.call(this, token, open[0]);
      }
    }
    node2.position.end = point2(token.end);
  }
  function resume() {
    return toString(this.stack.pop());
  }
  function onenterlistordered() {
    this.data.expectingFirstListItemValue = true;
  }
  function onenterlistitemvalue(token) {
    if (this.data.expectingFirstListItemValue) {
      const ancestor = this.stack[this.stack.length - 2];
      ancestor.start = Number.parseInt(this.sliceSerialize(token), 10);
      this.data.expectingFirstListItemValue = void 0;
    }
  }
  function onexitcodefencedfenceinfo() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.lang = data2;
  }
  function onexitcodefencedfencemeta() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.meta = data2;
  }
  function onexitcodefencedfence() {
    if (this.data.flowCodeInside) return;
    this.buffer();
    this.data.flowCodeInside = true;
  }
  function onexitcodefenced() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2.replace(/^(\r?\n|\r)|(\r?\n|\r)$/g, "");
    this.data.flowCodeInside = void 0;
  }
  function onexitcodeindented() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2.replace(/(\r?\n|\r)$/g, "");
  }
  function onexitdefinitionlabelstring(token) {
    const label = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.label = label;
    node2.identifier = normalizeIdentifier(this.sliceSerialize(token)).toLowerCase();
  }
  function onexitdefinitiontitlestring() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.title = data2;
  }
  function onexitdefinitiondestinationstring() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.url = data2;
  }
  function onexitatxheadingsequence(token) {
    const node2 = this.stack[this.stack.length - 1];
    if (!node2.depth) {
      const depth = this.sliceSerialize(token).length;
      node2.depth = depth;
    }
  }
  function onexitsetextheadingtext() {
    this.data.setextHeadingSlurpLineEnding = true;
  }
  function onexitsetextheadinglinesequence(token) {
    const node2 = this.stack[this.stack.length - 1];
    node2.depth = this.sliceSerialize(token).codePointAt(0) === 61 ? 1 : 2;
  }
  function onexitsetextheading() {
    this.data.setextHeadingSlurpLineEnding = void 0;
  }
  function onenterdata(token) {
    const node2 = this.stack[this.stack.length - 1];
    const siblings = node2.children;
    let tail = siblings[siblings.length - 1];
    if (!tail || tail.type !== "text") {
      tail = text4();
      tail.position = {
        start: point2(token.start),
        // @ts-expect-error: we’ll add `end` later.
        end: void 0
      };
      siblings.push(tail);
    }
    this.stack.push(tail);
  }
  function onexitdata(token) {
    const tail = this.stack.pop();
    tail.value += this.sliceSerialize(token);
    tail.position.end = point2(token.end);
  }
  function onexitlineending(token) {
    const context = this.stack[this.stack.length - 1];
    if (this.data.atHardBreak) {
      const tail = context.children[context.children.length - 1];
      tail.position.end = point2(token.end);
      this.data.atHardBreak = void 0;
      return;
    }
    if (!this.data.setextHeadingSlurpLineEnding && config.canContainEols.includes(context.type)) {
      onenterdata.call(this, token);
      onexitdata.call(this, token);
    }
  }
  function onexithardbreak() {
    this.data.atHardBreak = true;
  }
  function onexithtmlflow() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2;
  }
  function onexithtmltext() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2;
  }
  function onexitcodetext() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2;
  }
  function onexitlink() {
    const node2 = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const referenceType = this.data.referenceType || "shortcut";
      node2.type += "Reference";
      node2.referenceType = referenceType;
      delete node2.url;
      delete node2.title;
    } else {
      delete node2.identifier;
      delete node2.label;
    }
    this.data.referenceType = void 0;
  }
  function onexitimage() {
    const node2 = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const referenceType = this.data.referenceType || "shortcut";
      node2.type += "Reference";
      node2.referenceType = referenceType;
      delete node2.url;
      delete node2.title;
    } else {
      delete node2.identifier;
      delete node2.label;
    }
    this.data.referenceType = void 0;
  }
  function onexitlabeltext(token) {
    const string3 = this.sliceSerialize(token);
    const ancestor = this.stack[this.stack.length - 2];
    ancestor.label = decodeString(string3);
    ancestor.identifier = normalizeIdentifier(string3).toLowerCase();
  }
  function onexitlabel() {
    const fragment = this.stack[this.stack.length - 1];
    const value = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    this.data.inReference = true;
    if (node2.type === "link") {
      const children = fragment.children;
      node2.children = children;
    } else {
      node2.alt = value;
    }
  }
  function onexitresourcedestinationstring() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.url = data2;
  }
  function onexitresourcetitlestring() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.title = data2;
  }
  function onexitresource() {
    this.data.inReference = void 0;
  }
  function onenterreference() {
    this.data.referenceType = "collapsed";
  }
  function onexitreferencestring(token) {
    const label = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.label = label;
    node2.identifier = normalizeIdentifier(this.sliceSerialize(token)).toLowerCase();
    this.data.referenceType = "full";
  }
  function onexitcharacterreferencemarker(token) {
    this.data.characterReferenceType = token.type;
  }
  function onexitcharacterreferencevalue(token) {
    const data2 = this.sliceSerialize(token);
    const type = this.data.characterReferenceType;
    let value;
    if (type) {
      value = decodeNumericCharacterReference(data2, type === "characterReferenceMarkerNumeric" ? 10 : 16);
      this.data.characterReferenceType = void 0;
    } else {
      const result = decodeNamedCharacterReference(data2);
      value = result;
    }
    const tail = this.stack[this.stack.length - 1];
    tail.value += value;
  }
  function onexitcharacterreference(token) {
    const tail = this.stack.pop();
    tail.position.end = point2(token.end);
  }
  function onexitautolinkprotocol(token) {
    onexitdata.call(this, token);
    const node2 = this.stack[this.stack.length - 1];
    node2.url = this.sliceSerialize(token);
  }
  function onexitautolinkemail(token) {
    onexitdata.call(this, token);
    const node2 = this.stack[this.stack.length - 1];
    node2.url = "mailto:" + this.sliceSerialize(token);
  }
  function blockQuote2() {
    return {
      type: "blockquote",
      children: [],
      position: void 0
    };
  }
  function codeFlow() {
    return {
      type: "code",
      lang: null,
      meta: null,
      value: "",
      position: void 0
    };
  }
  function codeText2() {
    return {
      type: "inlineCode",
      value: "",
      position: void 0
    };
  }
  function definition2() {
    return {
      type: "definition",
      identifier: "",
      label: null,
      title: null,
      url: "",
      position: void 0
    };
  }
  function emphasis() {
    return {
      type: "emphasis",
      children: [],
      position: void 0
    };
  }
  function heading() {
    return {
      type: "heading",
      // @ts-expect-error `depth` will be set later.
      depth: 0,
      children: [],
      position: void 0
    };
  }
  function hardBreak() {
    return {
      type: "break",
      position: void 0
    };
  }
  function html() {
    return {
      type: "html",
      value: "",
      position: void 0
    };
  }
  function image() {
    return {
      type: "image",
      title: null,
      url: "",
      alt: null,
      position: void 0
    };
  }
  function link() {
    return {
      type: "link",
      title: null,
      url: "",
      children: [],
      position: void 0
    };
  }
  function list2(token) {
    return {
      type: "list",
      ordered: token.type === "listOrdered",
      start: null,
      spread: token._spread,
      children: [],
      position: void 0
    };
  }
  function listItem(token) {
    return {
      type: "listItem",
      spread: token._spread,
      checked: null,
      children: [],
      position: void 0
    };
  }
  function paragraph() {
    return {
      type: "paragraph",
      children: [],
      position: void 0
    };
  }
  function strong() {
    return {
      type: "strong",
      children: [],
      position: void 0
    };
  }
  function text4() {
    return {
      type: "text",
      value: "",
      position: void 0
    };
  }
  function thematicBreak2() {
    return {
      type: "thematicBreak",
      position: void 0
    };
  }
}
function point2(d) {
  return {
    line: d.line,
    column: d.column,
    offset: d.offset
  };
}
function configure(combined, extensions) {
  let index2 = -1;
  while (++index2 < extensions.length) {
    const value = extensions[index2];
    if (Array.isArray(value)) {
      configure(combined, value);
    } else {
      extension(combined, value);
    }
  }
}
function extension(combined, extension2) {
  let key;
  for (key in extension2) {
    if (own.call(extension2, key)) {
      switch (key) {
        case "canContainEols": {
          const right = extension2[key];
          if (right) {
            combined[key].push(...right);
          }
          break;
        }
        case "transforms": {
          const right = extension2[key];
          if (right) {
            combined[key].push(...right);
          }
          break;
        }
        case "afterExit":
        case "beforeEnter": {
          const right = extension2[key];
          if (right) {
            combined[key].push(right);
          }
          break;
        }
        case "enter":
        case "exit": {
          const right = extension2[key];
          if (right) {
            Object.assign(combined[key], right);
          }
          break;
        }
      }
    }
  }
}
function defaultOnError(left, right) {
  if (left) {
    throw new Error("Cannot close `" + left.type + "` (" + stringifyPosition({
      start: left.start,
      end: left.end
    }) + "): a different token (`" + right.type + "`, " + stringifyPosition({
      start: right.start,
      end: right.end
    }) + ") is open");
  }
  throw new Error("Cannot close document, a token (`" + right.type + "`, " + stringifyPosition({
    start: right.start,
    end: right.end
  }) + ") is still open");
}

// node_modules/micromark-extension-gfm-autolink-literal/lib/syntax.js
var wwwPrefix = {
  tokenize: tokenizeWwwPrefix,
  partial: true
};
var domain = {
  tokenize: tokenizeDomain,
  partial: true
};
var path = {
  tokenize: tokenizePath,
  partial: true
};
var trail = {
  tokenize: tokenizeTrail,
  partial: true
};
var emailDomainDotTrail = {
  tokenize: tokenizeEmailDomainDotTrail,
  partial: true
};
var wwwAutolink = {
  name: "wwwAutolink",
  tokenize: tokenizeWwwAutolink,
  previous: previousWww
};
var protocolAutolink = {
  name: "protocolAutolink",
  tokenize: tokenizeProtocolAutolink,
  previous: previousProtocol
};
var emailAutolink = {
  name: "emailAutolink",
  tokenize: tokenizeEmailAutolink,
  previous: previousEmail
};
var text3 = {};
function gfmAutolinkLiteral() {
  return {
    text: text3
  };
}
var code = 48;
while (code < 123) {
  text3[code] = emailAutolink;
  code++;
  if (code === 58) code = 65;
  else if (code === 91) code = 97;
}
text3[43] = emailAutolink;
text3[45] = emailAutolink;
text3[46] = emailAutolink;
text3[95] = emailAutolink;
text3[72] = [emailAutolink, protocolAutolink];
text3[104] = [emailAutolink, protocolAutolink];
text3[87] = [emailAutolink, wwwAutolink];
text3[119] = [emailAutolink, wwwAutolink];
function tokenizeEmailAutolink(effects, ok3, nok) {
  const self = this;
  let dot;
  let data;
  return start;
  function start(code2) {
    if (!gfmAtext(code2) || !previousEmail.call(self, self.previous) || previousUnbalanced(self.events)) {
      return nok(code2);
    }
    effects.enter("literalAutolink");
    effects.enter("literalAutolinkEmail");
    return atext(code2);
  }
  function atext(code2) {
    if (gfmAtext(code2)) {
      effects.consume(code2);
      return atext;
    }
    if (code2 === 64) {
      effects.consume(code2);
      return emailDomain;
    }
    return nok(code2);
  }
  function emailDomain(code2) {
    if (code2 === 46) {
      return effects.check(emailDomainDotTrail, emailDomainAfter, emailDomainDot)(code2);
    }
    if (code2 === 45 || code2 === 95 || asciiAlphanumeric(code2)) {
      data = true;
      effects.consume(code2);
      return emailDomain;
    }
    return emailDomainAfter(code2);
  }
  function emailDomainDot(code2) {
    effects.consume(code2);
    dot = true;
    return emailDomain;
  }
  function emailDomainAfter(code2) {
    if (data && dot && asciiAlpha(self.previous)) {
      effects.exit("literalAutolinkEmail");
      effects.exit("literalAutolink");
      return ok3(code2);
    }
    return nok(code2);
  }
}
function tokenizeWwwAutolink(effects, ok3, nok) {
  const self = this;
  return wwwStart;
  function wwwStart(code2) {
    if (code2 !== 87 && code2 !== 119 || !previousWww.call(self, self.previous) || previousUnbalanced(self.events)) {
      return nok(code2);
    }
    effects.enter("literalAutolink");
    effects.enter("literalAutolinkWww");
    return effects.check(wwwPrefix, effects.attempt(domain, effects.attempt(path, wwwAfter), nok), nok)(code2);
  }
  function wwwAfter(code2) {
    effects.exit("literalAutolinkWww");
    effects.exit("literalAutolink");
    return ok3(code2);
  }
}
function tokenizeProtocolAutolink(effects, ok3, nok) {
  const self = this;
  let buffer = "";
  let seen = false;
  return protocolStart;
  function protocolStart(code2) {
    if ((code2 === 72 || code2 === 104) && previousProtocol.call(self, self.previous) && !previousUnbalanced(self.events)) {
      effects.enter("literalAutolink");
      effects.enter("literalAutolinkHttp");
      buffer += String.fromCodePoint(code2);
      effects.consume(code2);
      return protocolPrefixInside;
    }
    return nok(code2);
  }
  function protocolPrefixInside(code2) {
    if (asciiAlpha(code2) && buffer.length < 5) {
      buffer += String.fromCodePoint(code2);
      effects.consume(code2);
      return protocolPrefixInside;
    }
    if (code2 === 58) {
      const protocol = buffer.toLowerCase();
      if (protocol === "http" || protocol === "https") {
        effects.consume(code2);
        return protocolSlashesInside;
      }
    }
    return nok(code2);
  }
  function protocolSlashesInside(code2) {
    if (code2 === 47) {
      effects.consume(code2);
      if (seen) {
        return afterProtocol;
      }
      seen = true;
      return protocolSlashesInside;
    }
    return nok(code2);
  }
  function afterProtocol(code2) {
    return code2 === null || asciiControl(code2) || markdownLineEndingOrSpace(code2) || unicodeWhitespace(code2) || unicodePunctuation(code2) ? nok(code2) : effects.attempt(domain, effects.attempt(path, protocolAfter), nok)(code2);
  }
  function protocolAfter(code2) {
    effects.exit("literalAutolinkHttp");
    effects.exit("literalAutolink");
    return ok3(code2);
  }
}
function tokenizeWwwPrefix(effects, ok3, nok) {
  let size = 0;
  return wwwPrefixInside;
  function wwwPrefixInside(code2) {
    if ((code2 === 87 || code2 === 119) && size < 3) {
      size++;
      effects.consume(code2);
      return wwwPrefixInside;
    }
    if (code2 === 46 && size === 3) {
      effects.consume(code2);
      return wwwPrefixAfter;
    }
    return nok(code2);
  }
  function wwwPrefixAfter(code2) {
    return code2 === null ? nok(code2) : ok3(code2);
  }
}
function tokenizeDomain(effects, ok3, nok) {
  let underscoreInLastSegment;
  let underscoreInLastLastSegment;
  let seen;
  return domainInside;
  function domainInside(code2) {
    if (code2 === 46 || code2 === 95) {
      return effects.check(trail, domainAfter, domainAtPunctuation)(code2);
    }
    if (code2 === null || markdownLineEndingOrSpace(code2) || unicodeWhitespace(code2) || code2 !== 45 && unicodePunctuation(code2)) {
      return domainAfter(code2);
    }
    seen = true;
    effects.consume(code2);
    return domainInside;
  }
  function domainAtPunctuation(code2) {
    if (code2 === 95) {
      underscoreInLastSegment = true;
    } else {
      underscoreInLastLastSegment = underscoreInLastSegment;
      underscoreInLastSegment = void 0;
    }
    effects.consume(code2);
    return domainInside;
  }
  function domainAfter(code2) {
    if (underscoreInLastLastSegment || underscoreInLastSegment || !seen) {
      return nok(code2);
    }
    return ok3(code2);
  }
}
function tokenizePath(effects, ok3) {
  let sizeOpen = 0;
  let sizeClose = 0;
  return pathInside;
  function pathInside(code2) {
    if (code2 === 40) {
      sizeOpen++;
      effects.consume(code2);
      return pathInside;
    }
    if (code2 === 41 && sizeClose < sizeOpen) {
      return pathAtPunctuation(code2);
    }
    if (code2 === 33 || code2 === 34 || code2 === 38 || code2 === 39 || code2 === 41 || code2 === 42 || code2 === 44 || code2 === 46 || code2 === 58 || code2 === 59 || code2 === 60 || code2 === 63 || code2 === 93 || code2 === 95 || code2 === 126) {
      return effects.check(trail, ok3, pathAtPunctuation)(code2);
    }
    if (code2 === null || markdownLineEndingOrSpace(code2) || unicodeWhitespace(code2)) {
      return ok3(code2);
    }
    effects.consume(code2);
    return pathInside;
  }
  function pathAtPunctuation(code2) {
    if (code2 === 41) {
      sizeClose++;
    }
    effects.consume(code2);
    return pathInside;
  }
}
function tokenizeTrail(effects, ok3, nok) {
  return trail2;
  function trail2(code2) {
    if (code2 === 33 || code2 === 34 || code2 === 39 || code2 === 41 || code2 === 42 || code2 === 44 || code2 === 46 || code2 === 58 || code2 === 59 || code2 === 63 || code2 === 95 || code2 === 126) {
      effects.consume(code2);
      return trail2;
    }
    if (code2 === 38) {
      effects.consume(code2);
      return trailCharacterReferenceStart;
    }
    if (code2 === 93) {
      effects.consume(code2);
      return trailBracketAfter;
    }
    if (
      // `<` is an end.
      code2 === 60 || // So is whitespace.
      code2 === null || markdownLineEndingOrSpace(code2) || unicodeWhitespace(code2)
    ) {
      return ok3(code2);
    }
    return nok(code2);
  }
  function trailBracketAfter(code2) {
    if (code2 === null || code2 === 40 || code2 === 91 || markdownLineEndingOrSpace(code2) || unicodeWhitespace(code2)) {
      return ok3(code2);
    }
    return trail2(code2);
  }
  function trailCharacterReferenceStart(code2) {
    return asciiAlpha(code2) ? trailCharacterReferenceInside(code2) : nok(code2);
  }
  function trailCharacterReferenceInside(code2) {
    if (code2 === 59) {
      effects.consume(code2);
      return trail2;
    }
    if (asciiAlpha(code2)) {
      effects.consume(code2);
      return trailCharacterReferenceInside;
    }
    return nok(code2);
  }
}
function tokenizeEmailDomainDotTrail(effects, ok3, nok) {
  return start;
  function start(code2) {
    effects.consume(code2);
    return after;
  }
  function after(code2) {
    return asciiAlphanumeric(code2) ? nok(code2) : ok3(code2);
  }
}
function previousWww(code2) {
  return code2 === null || code2 === 40 || code2 === 42 || code2 === 95 || code2 === 91 || code2 === 93 || code2 === 126 || markdownLineEndingOrSpace(code2);
}
function previousProtocol(code2) {
  return !asciiAlpha(code2);
}
function previousEmail(code2) {
  return !(code2 === 47 || gfmAtext(code2));
}
function gfmAtext(code2) {
  return code2 === 43 || code2 === 45 || code2 === 46 || code2 === 95 || asciiAlphanumeric(code2);
}
function previousUnbalanced(events) {
  let index2 = events.length;
  let result = false;
  while (index2--) {
    const token = events[index2][1];
    if ((token.type === "labelLink" || token.type === "labelImage") && !token._balanced) {
      result = true;
      break;
    }
    if (token._gfmAutolinkLiteralWalkedInto) {
      result = false;
      break;
    }
  }
  if (events.length > 0 && !result) {
    events[events.length - 1][1]._gfmAutolinkLiteralWalkedInto = true;
  }
  return result;
}

// node_modules/micromark-extension-gfm-footnote/lib/syntax.js
var indent = {
  tokenize: tokenizeIndent2,
  partial: true
};
function gfmFootnote() {
  return {
    document: {
      [91]: {
        name: "gfmFootnoteDefinition",
        tokenize: tokenizeDefinitionStart,
        continuation: {
          tokenize: tokenizeDefinitionContinuation
        },
        exit: gfmFootnoteDefinitionEnd
      }
    },
    text: {
      [91]: {
        name: "gfmFootnoteCall",
        tokenize: tokenizeGfmFootnoteCall
      },
      [93]: {
        name: "gfmPotentialFootnoteCall",
        add: "after",
        tokenize: tokenizePotentialGfmFootnoteCall,
        resolveTo: resolveToPotentialGfmFootnoteCall
      }
    }
  };
}
function tokenizePotentialGfmFootnoteCall(effects, ok3, nok) {
  const self = this;
  let index2 = self.events.length;
  const defined = self.parser.gfmFootnotes || (self.parser.gfmFootnotes = []);
  let labelStart;
  while (index2--) {
    const token = self.events[index2][1];
    if (token.type === "labelImage") {
      labelStart = token;
      break;
    }
    if (token.type === "gfmFootnoteCall" || token.type === "labelLink" || token.type === "label" || token.type === "image" || token.type === "link") {
      break;
    }
  }
  return start;
  function start(code2) {
    if (!labelStart || !labelStart._balanced) {
      return nok(code2);
    }
    const id = normalizeIdentifier(self.sliceSerialize({
      start: labelStart.end,
      end: self.now()
    }));
    if (id.codePointAt(0) !== 94 || !defined.includes(id.slice(1))) {
      return nok(code2);
    }
    effects.enter("gfmFootnoteCallLabelMarker");
    effects.consume(code2);
    effects.exit("gfmFootnoteCallLabelMarker");
    return ok3(code2);
  }
}
function resolveToPotentialGfmFootnoteCall(events, context) {
  let index2 = events.length;
  let labelStart;
  while (index2--) {
    if (events[index2][1].type === "labelImage" && events[index2][0] === "enter") {
      labelStart = events[index2][1];
      break;
    }
  }
  events[index2 + 1][1].type = "data";
  events[index2 + 3][1].type = "gfmFootnoteCallLabelMarker";
  const call = {
    type: "gfmFootnoteCall",
    start: Object.assign({}, events[index2 + 3][1].start),
    end: Object.assign({}, events[events.length - 1][1].end)
  };
  const marker = {
    type: "gfmFootnoteCallMarker",
    start: Object.assign({}, events[index2 + 3][1].end),
    end: Object.assign({}, events[index2 + 3][1].end)
  };
  marker.end.column++;
  marker.end.offset++;
  marker.end._bufferIndex++;
  const string3 = {
    type: "gfmFootnoteCallString",
    start: Object.assign({}, marker.end),
    end: Object.assign({}, events[events.length - 1][1].start)
  };
  const chunk = {
    type: "chunkString",
    contentType: "string",
    start: Object.assign({}, string3.start),
    end: Object.assign({}, string3.end)
  };
  const replacement = [
    // Take the `labelImageMarker` (now `data`, the `!`)
    events[index2 + 1],
    events[index2 + 2],
    ["enter", call, context],
    // The `[`
    events[index2 + 3],
    events[index2 + 4],
    // The `^`.
    ["enter", marker, context],
    ["exit", marker, context],
    // Everything in between.
    ["enter", string3, context],
    ["enter", chunk, context],
    ["exit", chunk, context],
    ["exit", string3, context],
    // The ending (`]`, properly parsed and labelled).
    events[events.length - 2],
    events[events.length - 1],
    ["exit", call, context]
  ];
  events.splice(index2, events.length - index2 + 1, ...replacement);
  return events;
}
function tokenizeGfmFootnoteCall(effects, ok3, nok) {
  const self = this;
  const defined = self.parser.gfmFootnotes || (self.parser.gfmFootnotes = []);
  let size = 0;
  let data;
  return start;
  function start(code2) {
    effects.enter("gfmFootnoteCall");
    effects.enter("gfmFootnoteCallLabelMarker");
    effects.consume(code2);
    effects.exit("gfmFootnoteCallLabelMarker");
    return callStart;
  }
  function callStart(code2) {
    if (code2 !== 94) return nok(code2);
    effects.enter("gfmFootnoteCallMarker");
    effects.consume(code2);
    effects.exit("gfmFootnoteCallMarker");
    effects.enter("gfmFootnoteCallString");
    effects.enter("chunkString").contentType = "string";
    return callData;
  }
  function callData(code2) {
    if (
      // Too long.
      size > 999 || // Closing brace with nothing.
      code2 === 93 && !data || // Space or tab is not supported by GFM for some reason.
      // `\n` and `[` not being supported makes sense.
      code2 === null || code2 === 91 || markdownLineEndingOrSpace(code2)
    ) {
      return nok(code2);
    }
    if (code2 === 93) {
      effects.exit("chunkString");
      const token = effects.exit("gfmFootnoteCallString");
      if (!defined.includes(normalizeIdentifier(self.sliceSerialize(token)))) {
        return nok(code2);
      }
      effects.enter("gfmFootnoteCallLabelMarker");
      effects.consume(code2);
      effects.exit("gfmFootnoteCallLabelMarker");
      effects.exit("gfmFootnoteCall");
      return ok3;
    }
    if (!markdownLineEndingOrSpace(code2)) {
      data = true;
    }
    size++;
    effects.consume(code2);
    return code2 === 92 ? callEscape : callData;
  }
  function callEscape(code2) {
    if (code2 === 91 || code2 === 92 || code2 === 93) {
      effects.consume(code2);
      size++;
      return callData;
    }
    return callData(code2);
  }
}
function tokenizeDefinitionStart(effects, ok3, nok) {
  const self = this;
  const defined = self.parser.gfmFootnotes || (self.parser.gfmFootnotes = []);
  let identifier;
  let size = 0;
  let data;
  return start;
  function start(code2) {
    effects.enter("gfmFootnoteDefinition")._container = true;
    effects.enter("gfmFootnoteDefinitionLabel");
    effects.enter("gfmFootnoteDefinitionLabelMarker");
    effects.consume(code2);
    effects.exit("gfmFootnoteDefinitionLabelMarker");
    return labelAtMarker;
  }
  function labelAtMarker(code2) {
    if (code2 === 94) {
      effects.enter("gfmFootnoteDefinitionMarker");
      effects.consume(code2);
      effects.exit("gfmFootnoteDefinitionMarker");
      effects.enter("gfmFootnoteDefinitionLabelString");
      effects.enter("chunkString").contentType = "string";
      return labelInside;
    }
    return nok(code2);
  }
  function labelInside(code2) {
    if (
      // Too long.
      size > 999 || // Closing brace with nothing.
      code2 === 93 && !data || // Space or tab is not supported by GFM for some reason.
      // `\n` and `[` not being supported makes sense.
      code2 === null || code2 === 91 || markdownLineEndingOrSpace(code2)
    ) {
      return nok(code2);
    }
    if (code2 === 93) {
      effects.exit("chunkString");
      const token = effects.exit("gfmFootnoteDefinitionLabelString");
      identifier = normalizeIdentifier(self.sliceSerialize(token));
      effects.enter("gfmFootnoteDefinitionLabelMarker");
      effects.consume(code2);
      effects.exit("gfmFootnoteDefinitionLabelMarker");
      effects.exit("gfmFootnoteDefinitionLabel");
      return labelAfter;
    }
    if (!markdownLineEndingOrSpace(code2)) {
      data = true;
    }
    size++;
    effects.consume(code2);
    return code2 === 92 ? labelEscape : labelInside;
  }
  function labelEscape(code2) {
    if (code2 === 91 || code2 === 92 || code2 === 93) {
      effects.consume(code2);
      size++;
      return labelInside;
    }
    return labelInside(code2);
  }
  function labelAfter(code2) {
    if (code2 === 58) {
      effects.enter("definitionMarker");
      effects.consume(code2);
      effects.exit("definitionMarker");
      if (!defined.includes(identifier)) {
        defined.push(identifier);
      }
      return factorySpace(effects, whitespaceAfter, "gfmFootnoteDefinitionWhitespace");
    }
    return nok(code2);
  }
  function whitespaceAfter(code2) {
    return ok3(code2);
  }
}
function tokenizeDefinitionContinuation(effects, ok3, nok) {
  return effects.check(blankLine, ok3, effects.attempt(indent, ok3, nok));
}
function gfmFootnoteDefinitionEnd(effects) {
  effects.exit("gfmFootnoteDefinition");
}
function tokenizeIndent2(effects, ok3, nok) {
  const self = this;
  return factorySpace(effects, afterPrefix, "gfmFootnoteDefinitionIndent", 4 + 1);
  function afterPrefix(code2) {
    const tail = self.events[self.events.length - 1];
    return tail && tail[1].type === "gfmFootnoteDefinitionIndent" && tail[2].sliceSerialize(tail[1], true).length === 4 ? ok3(code2) : nok(code2);
  }
}

// node_modules/micromark-extension-gfm-strikethrough/lib/syntax.js
function gfmStrikethrough(options) {
  const options_ = options || {};
  let single = options_.singleTilde;
  const tokenizer = {
    name: "strikethrough",
    tokenize: tokenizeStrikethrough,
    resolveAll: resolveAllStrikethrough
  };
  if (single === null || single === void 0) {
    single = true;
  }
  return {
    text: {
      [126]: tokenizer
    },
    insideSpan: {
      null: [tokenizer]
    },
    attentionMarkers: {
      null: [126]
    }
  };
  function resolveAllStrikethrough(events, context) {
    let index2 = -1;
    while (++index2 < events.length) {
      if (events[index2][0] === "enter" && events[index2][1].type === "strikethroughSequenceTemporary" && events[index2][1]._close) {
        let open = index2;
        while (open--) {
          if (events[open][0] === "exit" && events[open][1].type === "strikethroughSequenceTemporary" && events[open][1]._open && // If the sizes are the same:
          events[index2][1].end.offset - events[index2][1].start.offset === events[open][1].end.offset - events[open][1].start.offset) {
            events[index2][1].type = "strikethroughSequence";
            events[open][1].type = "strikethroughSequence";
            const strikethrough = {
              type: "strikethrough",
              start: Object.assign({}, events[open][1].start),
              end: Object.assign({}, events[index2][1].end)
            };
            const text4 = {
              type: "strikethroughText",
              start: Object.assign({}, events[open][1].end),
              end: Object.assign({}, events[index2][1].start)
            };
            const nextEvents = [["enter", strikethrough, context], ["enter", events[open][1], context], ["exit", events[open][1], context], ["enter", text4, context]];
            const insideSpan2 = context.parser.constructs.insideSpan.null;
            if (insideSpan2) {
              splice(nextEvents, nextEvents.length, 0, resolveAll(insideSpan2, events.slice(open + 1, index2), context));
            }
            splice(nextEvents, nextEvents.length, 0, [["exit", text4, context], ["enter", events[index2][1], context], ["exit", events[index2][1], context], ["exit", strikethrough, context]]);
            splice(events, open - 1, index2 - open + 3, nextEvents);
            index2 = open + nextEvents.length - 2;
            break;
          }
        }
      }
    }
    index2 = -1;
    while (++index2 < events.length) {
      if (events[index2][1].type === "strikethroughSequenceTemporary") {
        events[index2][1].type = "data";
      }
    }
    return events;
  }
  function tokenizeStrikethrough(effects, ok3, nok) {
    const previous4 = this.previous;
    const events = this.events;
    let size = 0;
    return start;
    function start(code2) {
      if (previous4 === 126 && events[events.length - 1][1].type !== "characterEscape") {
        return nok(code2);
      }
      effects.enter("strikethroughSequenceTemporary");
      return more(code2);
    }
    function more(code2) {
      const before = classifyCharacter(previous4);
      if (code2 === 126) {
        if (size > 1) return nok(code2);
        effects.consume(code2);
        size++;
        return more;
      }
      if (size < 2 && !single) return nok(code2);
      const token = effects.exit("strikethroughSequenceTemporary");
      const after = classifyCharacter(code2);
      token._open = !after || after === 2 && Boolean(before);
      token._close = !before || before === 2 && Boolean(after);
      return ok3(code2);
    }
  }
}

// node_modules/micromark-extension-gfm-table/lib/edit-map.js
var EditMap2 = class {
  /**
   * Create a new edit map.
   */
  constructor() {
    this.map = [];
    this.index = /* @__PURE__ */ new Map();
  }
  /**
   * Create an edit: a remove and/or add at a certain place.
   *
   * @param {number} index
   *   Index at which to apply the edit.
   * @param {number} remove
   *   Count of items to remove at the index.
   * @param {Array<Event>} add
   *   Items to add at the index.
   * @returns {undefined}
   *   Nothing.
   */
  add(index2, remove, add) {
    addImplementation2(this, index2, remove, add);
  }
  // To do: add this when moving to `micromark`.
  // /**
  //  * Create an edit: but insert `add` before existing additions.
  //  *
  //  * @param {number} index
  //  * @param {number} remove
  //  * @param {Array<Event>} add
  //  * @returns {undefined}
  //  */
  // addBefore(index, remove, add) {
  //   addImplementation(this, index, remove, add, true)
  // }
  /**
   * Done, change the events.
   *
   * @param {Array<Event>} events
   *   List of events to apply the edits to.
   * @returns {undefined}
   *   Nothing.
   */
  consume(events) {
    this.map.sort(function(a, b) {
      return a[0] - b[0];
    });
    if (this.map.length === 0) {
      return;
    }
    let index2 = this.map.length;
    const vecs = [];
    while (index2 > 0) {
      index2 -= 1;
      vecs.push(events.slice(this.map[index2][0] + this.map[index2][1]), this.map[index2][2]);
      events.length = this.map[index2][0];
    }
    vecs.push(events.slice());
    events.length = 0;
    let slice = vecs.pop();
    while (slice) {
      for (const element2 of slice) {
        events.push(element2);
      }
      slice = vecs.pop();
    }
    this.map.length = 0;
    this.index.clear();
  }
};
function addImplementation2(editMap, at, remove, add) {
  if (remove === 0 && add.length === 0) {
    return;
  }
  const existing = editMap.index.get(at);
  if (existing) {
    existing[1] += remove;
    existing[2].push(...add);
    return;
  }
  const change = [at, remove, add];
  editMap.map.push(change);
  editMap.index.set(at, change);
}

// node_modules/micromark-extension-gfm-table/lib/infer.js
function gfmTableAlign(events, index2) {
  let inDelimiterRow = false;
  const align = [];
  while (index2 < events.length) {
    const event = events[index2];
    if (inDelimiterRow) {
      if (event[0] === "enter") {
        if (event[1].type === "tableContent") {
          align.push(events[index2 + 1][1].type === "tableDelimiterMarker" ? "left" : "none");
        }
      } else if (event[1].type === "tableContent") {
        if (events[index2 - 1][1].type === "tableDelimiterMarker") {
          const alignIndex = align.length - 1;
          align[alignIndex] = align[alignIndex] === "left" ? "center" : "right";
        }
      } else if (event[1].type === "tableDelimiterRow") {
        break;
      }
    } else if (event[0] === "enter" && event[1].type === "tableDelimiterRow") {
      inDelimiterRow = true;
    }
    index2 += 1;
  }
  return align;
}

// node_modules/micromark-extension-gfm-table/lib/syntax.js
function gfmTable() {
  return {
    flow: {
      null: {
        name: "table",
        tokenize: tokenizeTable,
        resolveAll: resolveTable
      }
    }
  };
}
function tokenizeTable(effects, ok3, nok) {
  const self = this;
  let size = 0;
  let sizeB = 0;
  let seen;
  return start;
  function start(code2) {
    let index2 = self.events.length - 1;
    while (index2 > -1) {
      const {
        type
      } = self.events[index2][1];
      if (type === "lineEnding" || // Note: markdown-rs uses `whitespace` instead of `linePrefix`
      type === "linePrefix") {
        index2--;
      } else {
        break;
      }
    }
    const tail = index2 > -1 ? self.events[index2][1].type : null;
    const next = tail === "tableHead" || tail === "tableRow" ? bodyRowStart : headRowBefore;
    if (next === bodyRowStart && self.parser.lazy[self.now().line]) {
      return nok(code2);
    }
    return next(code2);
  }
  function headRowBefore(code2) {
    effects.enter("tableHead");
    effects.enter("tableRow");
    return headRowStart(code2);
  }
  function headRowStart(code2) {
    if (code2 === 124) {
      return headRowBreak(code2);
    }
    seen = true;
    sizeB += 1;
    return headRowBreak(code2);
  }
  function headRowBreak(code2) {
    if (code2 === null) {
      return nok(code2);
    }
    if (markdownLineEnding(code2)) {
      if (sizeB > 1) {
        sizeB = 0;
        self.interrupt = true;
        effects.exit("tableRow");
        effects.enter("lineEnding");
        effects.consume(code2);
        effects.exit("lineEnding");
        return headDelimiterStart;
      }
      return nok(code2);
    }
    if (markdownSpace(code2)) {
      return factorySpace(effects, headRowBreak, "whitespace")(code2);
    }
    sizeB += 1;
    if (seen) {
      seen = false;
      size += 1;
    }
    if (code2 === 124) {
      effects.enter("tableCellDivider");
      effects.consume(code2);
      effects.exit("tableCellDivider");
      seen = true;
      return headRowBreak;
    }
    effects.enter("data");
    return headRowData(code2);
  }
  function headRowData(code2) {
    if (code2 === null || code2 === 124 || markdownLineEndingOrSpace(code2)) {
      effects.exit("data");
      return headRowBreak(code2);
    }
    effects.consume(code2);
    return code2 === 92 ? headRowEscape : headRowData;
  }
  function headRowEscape(code2) {
    if (code2 === 92 || code2 === 124) {
      effects.consume(code2);
      return headRowData;
    }
    return headRowData(code2);
  }
  function headDelimiterStart(code2) {
    self.interrupt = false;
    if (self.parser.lazy[self.now().line]) {
      return nok(code2);
    }
    effects.enter("tableDelimiterRow");
    seen = false;
    if (markdownSpace(code2)) {
      return factorySpace(effects, headDelimiterBefore, "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code2);
    }
    return headDelimiterBefore(code2);
  }
  function headDelimiterBefore(code2) {
    if (code2 === 45 || code2 === 58) {
      return headDelimiterValueBefore(code2);
    }
    if (code2 === 124) {
      seen = true;
      effects.enter("tableCellDivider");
      effects.consume(code2);
      effects.exit("tableCellDivider");
      return headDelimiterCellBefore;
    }
    return headDelimiterNok(code2);
  }
  function headDelimiterCellBefore(code2) {
    if (markdownSpace(code2)) {
      return factorySpace(effects, headDelimiterValueBefore, "whitespace")(code2);
    }
    return headDelimiterValueBefore(code2);
  }
  function headDelimiterValueBefore(code2) {
    if (code2 === 58) {
      sizeB += 1;
      seen = true;
      effects.enter("tableDelimiterMarker");
      effects.consume(code2);
      effects.exit("tableDelimiterMarker");
      return headDelimiterLeftAlignmentAfter;
    }
    if (code2 === 45) {
      sizeB += 1;
      return headDelimiterLeftAlignmentAfter(code2);
    }
    if (code2 === null || markdownLineEnding(code2)) {
      return headDelimiterCellAfter(code2);
    }
    return headDelimiterNok(code2);
  }
  function headDelimiterLeftAlignmentAfter(code2) {
    if (code2 === 45) {
      effects.enter("tableDelimiterFiller");
      return headDelimiterFiller(code2);
    }
    return headDelimiterNok(code2);
  }
  function headDelimiterFiller(code2) {
    if (code2 === 45) {
      effects.consume(code2);
      return headDelimiterFiller;
    }
    if (code2 === 58) {
      seen = true;
      effects.exit("tableDelimiterFiller");
      effects.enter("tableDelimiterMarker");
      effects.consume(code2);
      effects.exit("tableDelimiterMarker");
      return headDelimiterRightAlignmentAfter;
    }
    effects.exit("tableDelimiterFiller");
    return headDelimiterRightAlignmentAfter(code2);
  }
  function headDelimiterRightAlignmentAfter(code2) {
    if (markdownSpace(code2)) {
      return factorySpace(effects, headDelimiterCellAfter, "whitespace")(code2);
    }
    return headDelimiterCellAfter(code2);
  }
  function headDelimiterCellAfter(code2) {
    if (code2 === 124) {
      return headDelimiterBefore(code2);
    }
    if (code2 === null || markdownLineEnding(code2)) {
      if (!seen || size !== sizeB) {
        return headDelimiterNok(code2);
      }
      effects.exit("tableDelimiterRow");
      effects.exit("tableHead");
      return ok3(code2);
    }
    return headDelimiterNok(code2);
  }
  function headDelimiterNok(code2) {
    return nok(code2);
  }
  function bodyRowStart(code2) {
    effects.enter("tableRow");
    return bodyRowBreak(code2);
  }
  function bodyRowBreak(code2) {
    if (code2 === 124) {
      effects.enter("tableCellDivider");
      effects.consume(code2);
      effects.exit("tableCellDivider");
      return bodyRowBreak;
    }
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("tableRow");
      return ok3(code2);
    }
    if (markdownSpace(code2)) {
      return factorySpace(effects, bodyRowBreak, "whitespace")(code2);
    }
    effects.enter("data");
    return bodyRowData(code2);
  }
  function bodyRowData(code2) {
    if (code2 === null || code2 === 124 || markdownLineEndingOrSpace(code2)) {
      effects.exit("data");
      return bodyRowBreak(code2);
    }
    effects.consume(code2);
    return code2 === 92 ? bodyRowEscape : bodyRowData;
  }
  function bodyRowEscape(code2) {
    if (code2 === 92 || code2 === 124) {
      effects.consume(code2);
      return bodyRowData;
    }
    return bodyRowData(code2);
  }
}
function resolveTable(events, context) {
  let index2 = -1;
  let inFirstCellAwaitingPipe = true;
  let rowKind = 0;
  let lastCell = [0, 0, 0, 0];
  let cell = [0, 0, 0, 0];
  let afterHeadAwaitingFirstBodyRow = false;
  let lastTableEnd = 0;
  let currentTable;
  let currentBody;
  let currentCell;
  const map = new EditMap2();
  while (++index2 < events.length) {
    const event = events[index2];
    const token = event[1];
    if (event[0] === "enter") {
      if (token.type === "tableHead") {
        afterHeadAwaitingFirstBodyRow = false;
        if (lastTableEnd !== 0) {
          flushTableEnd(map, context, lastTableEnd, currentTable, currentBody);
          currentBody = void 0;
          lastTableEnd = 0;
        }
        currentTable = {
          type: "table",
          start: Object.assign({}, token.start),
          // Note: correct end is set later.
          end: Object.assign({}, token.end)
        };
        map.add(index2, 0, [["enter", currentTable, context]]);
      } else if (token.type === "tableRow" || token.type === "tableDelimiterRow") {
        inFirstCellAwaitingPipe = true;
        currentCell = void 0;
        lastCell = [0, 0, 0, 0];
        cell = [0, index2 + 1, 0, 0];
        if (afterHeadAwaitingFirstBodyRow) {
          afterHeadAwaitingFirstBodyRow = false;
          currentBody = {
            type: "tableBody",
            start: Object.assign({}, token.start),
            // Note: correct end is set later.
            end: Object.assign({}, token.end)
          };
          map.add(index2, 0, [["enter", currentBody, context]]);
        }
        rowKind = token.type === "tableDelimiterRow" ? 2 : currentBody ? 3 : 1;
      } else if (rowKind && (token.type === "data" || token.type === "tableDelimiterMarker" || token.type === "tableDelimiterFiller")) {
        inFirstCellAwaitingPipe = false;
        if (cell[2] === 0) {
          if (lastCell[1] !== 0) {
            cell[0] = cell[1];
            currentCell = flushCell(map, context, lastCell, rowKind, void 0, currentCell);
            lastCell = [0, 0, 0, 0];
          }
          cell[2] = index2;
        }
      } else if (token.type === "tableCellDivider") {
        if (inFirstCellAwaitingPipe) {
          inFirstCellAwaitingPipe = false;
        } else {
          if (lastCell[1] !== 0) {
            cell[0] = cell[1];
            currentCell = flushCell(map, context, lastCell, rowKind, void 0, currentCell);
          }
          lastCell = cell;
          cell = [lastCell[1], index2, 0, 0];
        }
      }
    } else if (token.type === "tableHead") {
      afterHeadAwaitingFirstBodyRow = true;
      lastTableEnd = index2;
    } else if (token.type === "tableRow" || token.type === "tableDelimiterRow") {
      lastTableEnd = index2;
      if (lastCell[1] !== 0) {
        cell[0] = cell[1];
        currentCell = flushCell(map, context, lastCell, rowKind, index2, currentCell);
      } else if (cell[1] !== 0) {
        currentCell = flushCell(map, context, cell, rowKind, index2, currentCell);
      }
      rowKind = 0;
    } else if (rowKind && (token.type === "data" || token.type === "tableDelimiterMarker" || token.type === "tableDelimiterFiller")) {
      cell[3] = index2;
    }
  }
  if (lastTableEnd !== 0) {
    flushTableEnd(map, context, lastTableEnd, currentTable, currentBody);
  }
  map.consume(context.events);
  index2 = -1;
  while (++index2 < context.events.length) {
    const event = context.events[index2];
    if (event[0] === "enter" && event[1].type === "table") {
      event[1]._align = gfmTableAlign(context.events, index2);
    }
  }
  return events;
}
function flushCell(map, context, range, rowKind, rowEnd, previousCell) {
  const groupName = rowKind === 1 ? "tableHeader" : rowKind === 2 ? "tableDelimiter" : "tableData";
  const valueName = "tableContent";
  if (range[0] !== 0) {
    previousCell.end = Object.assign({}, getPoint(context.events, range[0]));
    map.add(range[0], 0, [["exit", previousCell, context]]);
  }
  const now = getPoint(context.events, range[1]);
  previousCell = {
    type: groupName,
    start: Object.assign({}, now),
    // Note: correct end is set later.
    end: Object.assign({}, now)
  };
  map.add(range[1], 0, [["enter", previousCell, context]]);
  if (range[2] !== 0) {
    const relatedStart = getPoint(context.events, range[2]);
    const relatedEnd = getPoint(context.events, range[3]);
    const valueToken = {
      type: valueName,
      start: Object.assign({}, relatedStart),
      end: Object.assign({}, relatedEnd)
    };
    map.add(range[2], 0, [["enter", valueToken, context]]);
    if (rowKind !== 2) {
      const start = context.events[range[2]];
      const end = context.events[range[3]];
      start[1].end = Object.assign({}, end[1].end);
      start[1].type = "chunkText";
      start[1].contentType = "text";
      if (range[3] > range[2] + 1) {
        const a = range[2] + 1;
        const b = range[3] - range[2] - 1;
        map.add(a, b, []);
      }
    }
    map.add(range[3] + 1, 0, [["exit", valueToken, context]]);
  }
  if (rowEnd !== void 0) {
    previousCell.end = Object.assign({}, getPoint(context.events, rowEnd));
    map.add(rowEnd, 0, [["exit", previousCell, context]]);
    previousCell = void 0;
  }
  return previousCell;
}
function flushTableEnd(map, context, index2, table, tableBody) {
  const exits = [];
  const related = getPoint(context.events, index2);
  if (tableBody) {
    tableBody.end = Object.assign({}, related);
    exits.push(["exit", tableBody, context]);
  }
  table.end = Object.assign({}, related);
  exits.push(["exit", table, context]);
  map.add(index2 + 1, 0, exits);
}
function getPoint(events, index2) {
  const event = events[index2];
  const side = event[0] === "enter" ? "start" : "end";
  return event[1][side];
}

// node_modules/micromark-extension-gfm-task-list-item/lib/syntax.js
var tasklistCheck = {
  name: "tasklistCheck",
  tokenize: tokenizeTasklistCheck
};
function gfmTaskListItem() {
  return {
    text: {
      [91]: tasklistCheck
    }
  };
}
function tokenizeTasklistCheck(effects, ok3, nok) {
  const self = this;
  return open;
  function open(code2) {
    if (
      // Exit if there’s stuff before.
      self.previous !== null || // Exit if not in the first content that is the first child of a list
      // item.
      !self._gfmTasklistFirstContentOfListItem
    ) {
      return nok(code2);
    }
    effects.enter("taskListCheck");
    effects.enter("taskListCheckMarker");
    effects.consume(code2);
    effects.exit("taskListCheckMarker");
    return inside;
  }
  function inside(code2) {
    if (markdownLineEndingOrSpace(code2)) {
      effects.enter("taskListCheckValueUnchecked");
      effects.consume(code2);
      effects.exit("taskListCheckValueUnchecked");
      return close;
    }
    if (code2 === 88 || code2 === 120) {
      effects.enter("taskListCheckValueChecked");
      effects.consume(code2);
      effects.exit("taskListCheckValueChecked");
      return close;
    }
    return nok(code2);
  }
  function close(code2) {
    if (code2 === 93) {
      effects.enter("taskListCheckMarker");
      effects.consume(code2);
      effects.exit("taskListCheckMarker");
      effects.exit("taskListCheck");
      return after;
    }
    return nok(code2);
  }
  function after(code2) {
    if (markdownLineEnding(code2)) {
      return ok3(code2);
    }
    if (markdownSpace(code2)) {
      return effects.check({
        tokenize: spaceThenNonSpace
      }, ok3, nok)(code2);
    }
    return nok(code2);
  }
}
function spaceThenNonSpace(effects, ok3, nok) {
  return factorySpace(effects, after, "whitespace");
  function after(code2) {
    return code2 === null ? nok(code2) : ok3(code2);
  }
}

// node_modules/micromark-extension-gfm/index.js
function gfm(options) {
  return combineExtensions([
    gfmAutolinkLiteral(),
    gfmFootnote(),
    gfmStrikethrough(options),
    gfmTable(),
    gfmTaskListItem()
  ]);
}

// node_modules/ccount/index.js
function ccount(value, character) {
  const source = String(value);
  if (typeof character !== "string") {
    throw new TypeError("Expected character");
  }
  let count = 0;
  let index2 = source.indexOf(character);
  while (index2 !== -1) {
    count++;
    index2 = source.indexOf(character, index2 + character.length);
  }
  return count;
}

// node_modules/devlop/lib/default.js
function ok() {
}

// node_modules/escape-string-regexp/index.js
function escapeStringRegexp(string3) {
  if (typeof string3 !== "string") {
    throw new TypeError("Expected a string");
  }
  return string3.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
}

// node_modules/unist-util-is/lib/index.js
var convert = (
  // Note: overloads in JSDoc can’t yet use different `@template`s.
  /**
   * @type {(
   *   (<Condition extends string>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & {type: Condition}) &
   *   (<Condition extends Props>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & Condition) &
   *   (<Condition extends TestFunction>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & Predicate<Condition, Node>) &
   *   ((test?: null | undefined) => (node?: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node) &
   *   ((test?: Test) => Check)
   * )}
   */
  /**
   * @param {Test} [test]
   * @returns {Check}
   */
  (function(test) {
    if (test === null || test === void 0) {
      return ok2;
    }
    if (typeof test === "function") {
      return castFactory(test);
    }
    if (typeof test === "object") {
      return Array.isArray(test) ? anyFactory(test) : (
        // Cast because `ReadonlyArray` goes into the above but `isArray`
        // narrows to `Array`.
        propertiesFactory(
          /** @type {Props} */
          test
        )
      );
    }
    if (typeof test === "string") {
      return typeFactory(test);
    }
    throw new Error("Expected function, string, or object as test");
  })
);
function anyFactory(tests) {
  const checks = [];
  let index2 = -1;
  while (++index2 < tests.length) {
    checks[index2] = convert(tests[index2]);
  }
  return castFactory(any);
  function any(...parameters) {
    let index3 = -1;
    while (++index3 < checks.length) {
      if (checks[index3].apply(this, parameters)) return true;
    }
    return false;
  }
}
function propertiesFactory(check) {
  const checkAsRecord = (
    /** @type {Record<string, unknown>} */
    check
  );
  return castFactory(all2);
  function all2(node2) {
    const nodeAsRecord = (
      /** @type {Record<string, unknown>} */
      /** @type {unknown} */
      node2
    );
    let key;
    for (key in check) {
      if (nodeAsRecord[key] !== checkAsRecord[key]) return false;
    }
    return true;
  }
}
function typeFactory(check) {
  return castFactory(type);
  function type(node2) {
    return node2 && node2.type === check;
  }
}
function castFactory(testFunction) {
  return check;
  function check(value, index2, parent) {
    return Boolean(
      looksLikeANode(value) && testFunction.call(
        this,
        value,
        typeof index2 === "number" ? index2 : void 0,
        parent || void 0
      )
    );
  }
}
function ok2() {
  return true;
}
function looksLikeANode(value) {
  return value !== null && typeof value === "object" && "type" in value;
}

// node_modules/unist-util-visit-parents/lib/color.js
function color(d) {
  return d;
}

// node_modules/unist-util-visit-parents/lib/index.js
var empty = [];
var CONTINUE = true;
var EXIT = false;
var SKIP = "skip";
function visitParents(tree, test, visitor, reverse) {
  let check;
  if (typeof test === "function" && typeof visitor !== "function") {
    reverse = visitor;
    visitor = test;
  } else {
    check = test;
  }
  const is2 = convert(check);
  const step = reverse ? -1 : 1;
  factory(tree, void 0, [])();
  function factory(node2, index2, parents) {
    const value = (
      /** @type {Record<string, unknown>} */
      node2 && typeof node2 === "object" ? node2 : {}
    );
    if (typeof value.type === "string") {
      const name = (
        // `hast`
        typeof value.tagName === "string" ? value.tagName : (
          // `xast`
          typeof value.name === "string" ? value.name : void 0
        )
      );
      Object.defineProperty(visit, "name", {
        value: "node (" + color(node2.type + (name ? "<" + name + ">" : "")) + ")"
      });
    }
    return visit;
    function visit() {
      let result = empty;
      let subresult;
      let offset;
      let grandparents;
      if (!test || is2(node2, index2, parents[parents.length - 1] || void 0)) {
        result = toResult(visitor(node2, parents));
        if (result[0] === EXIT) {
          return result;
        }
      }
      if ("children" in node2 && node2.children) {
        const nodeAsParent = (
          /** @type {UnistParent} */
          node2
        );
        if (nodeAsParent.children && result[0] !== SKIP) {
          offset = (reverse ? nodeAsParent.children.length : -1) + step;
          grandparents = parents.concat(nodeAsParent);
          while (offset > -1 && offset < nodeAsParent.children.length) {
            const child = nodeAsParent.children[offset];
            subresult = factory(child, offset, grandparents)();
            if (subresult[0] === EXIT) {
              return subresult;
            }
            offset = typeof subresult[1] === "number" ? subresult[1] : offset + step;
          }
        }
      }
      return result;
    }
  }
}
function toResult(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "number") {
    return [CONTINUE, value];
  }
  return value === null || value === void 0 ? empty : [value];
}

// node_modules/mdast-util-find-and-replace/lib/index.js
function findAndReplace(tree, list2, options) {
  const settings = options || {};
  const ignored = convert(settings.ignore || []);
  const pairs = toPairs(list2);
  let pairIndex = -1;
  while (++pairIndex < pairs.length) {
    visitParents(tree, "text", visitor);
  }
  function visitor(node2, parents) {
    let index2 = -1;
    let grandparent;
    while (++index2 < parents.length) {
      const parent = parents[index2];
      const siblings = grandparent ? grandparent.children : void 0;
      if (ignored(
        parent,
        siblings ? siblings.indexOf(parent) : void 0,
        grandparent
      )) {
        return;
      }
      grandparent = parent;
    }
    if (grandparent) {
      return handler(node2, parents);
    }
  }
  function handler(node2, parents) {
    const parent = parents[parents.length - 1];
    const find = pairs[pairIndex][0];
    const replace2 = pairs[pairIndex][1];
    let start = 0;
    const siblings = parent.children;
    const index2 = siblings.indexOf(node2);
    let change = false;
    let nodes = [];
    find.lastIndex = 0;
    let match = find.exec(node2.value);
    while (match) {
      const position2 = match.index;
      const matchObject = {
        index: match.index,
        input: match.input,
        stack: [...parents, node2]
      };
      let value = replace2(...match, matchObject);
      if (typeof value === "string") {
        value = value.length > 0 ? { type: "text", value } : void 0;
      }
      if (value === false) {
        find.lastIndex = position2 + 1;
      } else {
        if (start !== position2) {
          add({ type: "text", value: node2.value.slice(start, position2) });
        }
        if (Array.isArray(value)) {
          for (const child of value) add(child);
        } else if (value) {
          add(value);
        }
        start = position2 + match[0].length;
        change = true;
      }
      if (!find.global) {
        break;
      }
      match = find.exec(node2.value);
    }
    if (change) {
      if (start < node2.value.length) {
        add({ type: "text", value: node2.value.slice(start) });
      }
      parent.children.splice(index2, 1, ...nodes);
    } else {
      nodes = [node2];
    }
    return index2 + nodes.length;
    function add(child) {
      const previous4 = nodes[nodes.length - 1];
      if (previous4 && previous4.type === "text" && child.type === "text") {
        previous4.value += child.value;
      } else {
        nodes.push(child);
      }
    }
  }
}
function toPairs(tupleOrList) {
  if (!Array.isArray(tupleOrList)) {
    throw new TypeError("Expected find and replace tuple or list of tuples");
  }
  const result = [];
  const list2 = !tupleOrList[0] || Array.isArray(tupleOrList[0]) ? tupleOrList : [tupleOrList];
  let index2 = -1;
  while (++index2 < list2.length) {
    const tuple = list2[index2];
    result.push([toExpression(tuple[0]), toFunction(tuple[1])]);
  }
  return result;
}
function toExpression(find) {
  return typeof find === "string" ? new RegExp(escapeStringRegexp(find), "g") : find;
}
function toFunction(replace2) {
  return typeof replace2 === "function" ? replace2 : function() {
    return replace2;
  };
}

// node_modules/mdast-util-gfm-autolink-literal/lib/index.js
function gfmAutolinkLiteralFromMarkdown() {
  return {
    transforms: [transformGfmAutolinkLiterals],
    enter: {
      literalAutolink: enterLiteralAutolink,
      literalAutolinkEmail: enterLiteralAutolinkValue,
      literalAutolinkHttp: enterLiteralAutolinkValue,
      literalAutolinkWww: enterLiteralAutolinkValue
    },
    exit: {
      literalAutolink: exitLiteralAutolink,
      literalAutolinkEmail: exitLiteralAutolinkEmail,
      literalAutolinkHttp: exitLiteralAutolinkHttp,
      literalAutolinkWww: exitLiteralAutolinkWww
    }
  };
}
function enterLiteralAutolink(token) {
  this.enter({ type: "link", title: null, url: "", children: [] }, token);
}
function enterLiteralAutolinkValue(token) {
  this.config.enter.autolinkProtocol.call(this, token);
}
function exitLiteralAutolinkHttp(token) {
  this.config.exit.autolinkProtocol.call(this, token);
}
function exitLiteralAutolinkWww(token) {
  this.config.exit.data.call(this, token);
  const node2 = this.stack[this.stack.length - 1];
  ok(node2.type === "link");
  node2.url = "http://" + this.sliceSerialize(token);
}
function exitLiteralAutolinkEmail(token) {
  this.config.exit.autolinkEmail.call(this, token);
}
function exitLiteralAutolink(token) {
  this.exit(token);
}
function transformGfmAutolinkLiterals(tree) {
  findAndReplace(
    tree,
    [
      [/(https?:\/\/|www(?=\.))([-.\w]+)([^ \t\r\n]*)/gi, findUrl],
      [/(?<=^|\s|\p{P}|\p{S})([-.\w+]+)@([-\w]+(?:\.[-\w]+)+)/gu, findEmail]
    ],
    { ignore: ["link", "linkReference"] }
  );
}
function findUrl(_, protocol, domain2, path2, match) {
  let prefix = "";
  if (!previous2(match)) {
    return false;
  }
  if (/^w/i.test(protocol)) {
    domain2 = protocol + domain2;
    protocol = "";
    prefix = "http://";
  }
  if (!isCorrectDomain(domain2)) {
    return false;
  }
  const parts = splitUrl(domain2 + path2);
  if (!parts[0]) return false;
  const result = {
    type: "link",
    title: null,
    url: prefix + protocol + parts[0],
    children: [{ type: "text", value: protocol + parts[0] }]
  };
  if (parts[1]) {
    return [result, { type: "text", value: parts[1] }];
  }
  return result;
}
function findEmail(_, atext, label, match) {
  if (
    // Not an expected previous character.
    !previous2(match, true) || // Label ends in not allowed character.
    /[-\d_]$/.test(label)
  ) {
    return false;
  }
  return {
    type: "link",
    title: null,
    url: "mailto:" + atext + "@" + label,
    children: [{ type: "text", value: atext + "@" + label }]
  };
}
function isCorrectDomain(domain2) {
  const parts = domain2.split(".");
  if (parts.length < 2 || parts[parts.length - 1] && (/_/.test(parts[parts.length - 1]) || !/[a-zA-Z\d]/.test(parts[parts.length - 1])) || parts[parts.length - 2] && (/_/.test(parts[parts.length - 2]) || !/[a-zA-Z\d]/.test(parts[parts.length - 2]))) {
    return false;
  }
  return true;
}
function splitUrl(url) {
  const trailExec = /[!"&'),.:;<>?\]}]+$/.exec(url);
  if (!trailExec) {
    return [url, void 0];
  }
  url = url.slice(0, trailExec.index);
  let trail2 = trailExec[0];
  let closingParenIndex = trail2.indexOf(")");
  const openingParens = ccount(url, "(");
  let closingParens = ccount(url, ")");
  while (closingParenIndex !== -1 && openingParens > closingParens) {
    url += trail2.slice(0, closingParenIndex + 1);
    trail2 = trail2.slice(closingParenIndex + 1);
    closingParenIndex = trail2.indexOf(")");
    closingParens++;
  }
  return [url, trail2];
}
function previous2(match, email) {
  const code2 = match.input.charCodeAt(match.index - 1);
  return (match.index === 0 || unicodeWhitespace(code2) || unicodePunctuation(code2)) && // If it’s an email, the previous character should not be a slash.
  (!email || code2 !== 47);
}

// node_modules/mdast-util-gfm-footnote/lib/index.js
footnoteReference.peek = footnoteReferencePeek;
function enterFootnoteCallString() {
  this.buffer();
}
function enterFootnoteCall(token) {
  this.enter({ type: "footnoteReference", identifier: "", label: "" }, token);
}
function enterFootnoteDefinitionLabelString() {
  this.buffer();
}
function enterFootnoteDefinition(token) {
  this.enter(
    { type: "footnoteDefinition", identifier: "", label: "", children: [] },
    token
  );
}
function exitFootnoteCallString(token) {
  const label = this.resume();
  const node2 = this.stack[this.stack.length - 1];
  ok(node2.type === "footnoteReference");
  node2.identifier = normalizeIdentifier(
    this.sliceSerialize(token)
  ).toLowerCase();
  node2.label = label;
}
function exitFootnoteCall(token) {
  this.exit(token);
}
function exitFootnoteDefinitionLabelString(token) {
  const label = this.resume();
  const node2 = this.stack[this.stack.length - 1];
  ok(node2.type === "footnoteDefinition");
  node2.identifier = normalizeIdentifier(
    this.sliceSerialize(token)
  ).toLowerCase();
  node2.label = label;
}
function exitFootnoteDefinition(token) {
  this.exit(token);
}
function footnoteReferencePeek() {
  return "[";
}
function footnoteReference(node2, _, state, info) {
  const tracker = state.createTracker(info);
  let value = tracker.move("[^");
  const exit3 = state.enter("footnoteReference");
  const subexit = state.enter("reference");
  value += tracker.move(
    state.safe(state.associationId(node2), { after: "]", before: value })
  );
  subexit();
  exit3();
  value += tracker.move("]");
  return value;
}
function gfmFootnoteFromMarkdown() {
  return {
    enter: {
      gfmFootnoteCallString: enterFootnoteCallString,
      gfmFootnoteCall: enterFootnoteCall,
      gfmFootnoteDefinitionLabelString: enterFootnoteDefinitionLabelString,
      gfmFootnoteDefinition: enterFootnoteDefinition
    },
    exit: {
      gfmFootnoteCallString: exitFootnoteCallString,
      gfmFootnoteCall: exitFootnoteCall,
      gfmFootnoteDefinitionLabelString: exitFootnoteDefinitionLabelString,
      gfmFootnoteDefinition: exitFootnoteDefinition
    }
  };
}

// node_modules/mdast-util-gfm-strikethrough/lib/index.js
handleDelete.attention = attentionDelete;
handleDelete.peek = peekDelete;
function gfmStrikethroughFromMarkdown() {
  return {
    canContainEols: ["delete"],
    enter: { strikethrough: enterStrikethrough },
    exit: { strikethrough: exitStrikethrough }
  };
}
function enterStrikethrough(token) {
  this.enter({ type: "delete", children: [], position: void 0 }, token);
}
function exitStrikethrough(token) {
  this.exit(token);
}
function handleDelete(node2, _, state, info) {
  const tracker = state.createTracker(info);
  const sequence = state.stack.includes("strikethrough") ? "~" : "~~";
  const exit3 = state.enter("strikethrough");
  let value = tracker.move(sequence);
  value += state.containerPhrasing(node2, {
    ...tracker.current(),
    before: value,
    after: "~"
  });
  value += tracker.move(sequence);
  exit3();
  return value;
}
function attentionDelete() {
  return { construct: "strikethrough", markers: ["~"], sizes: [2, 1] };
}
function peekDelete() {
  return "~";
}

// node_modules/mdast-util-gfm-table/lib/index.js
function gfmTableFromMarkdown() {
  return {
    enter: {
      table: enterTable,
      tableData: enterCell,
      tableHeader: enterCell,
      tableRow: enterRow
    },
    exit: {
      codeText: exitCodeText,
      table: exitTable,
      tableData: exit2,
      tableHeader: exit2,
      tableRow: exit2
    }
  };
}
function enterTable(token) {
  const align = token._align;
  ok(align, "expected `_align` on table");
  this.enter(
    {
      type: "table",
      align: align.map(function(d) {
        return d === "none" ? null : d;
      }),
      children: []
    },
    token
  );
  this.data.inTable = true;
}
function exitTable(token) {
  this.exit(token);
  this.data.inTable = void 0;
}
function enterRow(token) {
  this.enter({ type: "tableRow", children: [] }, token);
}
function exit2(token) {
  this.exit(token);
}
function enterCell(token) {
  this.enter({ type: "tableCell", children: [] }, token);
}
function exitCodeText(token) {
  let value = this.resume();
  if (this.data.inTable) {
    value = value.replace(/\\([\\|])/g, replace);
  }
  const node2 = this.stack[this.stack.length - 1];
  ok(node2.type === "inlineCode");
  node2.value = value;
  this.exit(token);
}
function replace($0, $1) {
  return $1 === "|" ? $1 : $0;
}

// node_modules/mdast-util-gfm-task-list-item/lib/index.js
function gfmTaskListItemFromMarkdown() {
  return {
    exit: {
      taskListCheckValueChecked: exitCheck,
      taskListCheckValueUnchecked: exitCheck,
      paragraph: exitParagraphWithTaskListItem
    }
  };
}
function exitCheck(token) {
  const node2 = this.stack[this.stack.length - 2];
  ok(node2.type === "listItem");
  node2.checked = token.type === "taskListCheckValueChecked";
}
function exitParagraphWithTaskListItem(token) {
  const parent = this.stack[this.stack.length - 2];
  if (parent && parent.type === "listItem" && typeof parent.checked === "boolean") {
    const node2 = this.stack[this.stack.length - 1];
    ok(node2.type === "paragraph");
    const head = node2.children[0];
    if (head && head.type === "text") {
      const siblings = parent.children;
      let index2 = -1;
      let firstParaghraph;
      while (++index2 < siblings.length) {
        const sibling = siblings[index2];
        if (sibling.type === "paragraph") {
          firstParaghraph = sibling;
          break;
        }
      }
      if (firstParaghraph === node2) {
        head.value = head.value.slice(1);
        if (head.value.length === 0) {
          node2.children.shift();
        } else if (node2.position && head.position && typeof head.position.start.offset === "number") {
          head.position.start.column++;
          head.position.start.offset++;
          node2.position.start = Object.assign({}, head.position.start);
        }
      }
    }
  }
  this.exit(token);
}

// node_modules/mdast-util-gfm/lib/index.js
function gfmFromMarkdown() {
  return [
    gfmAutolinkLiteralFromMarkdown(),
    gfmFootnoteFromMarkdown(),
    gfmStrikethroughFromMarkdown(),
    gfmTableFromMarkdown(),
    gfmTaskListItemFromMarkdown()
  ];
}

// node_modules/micromark-extension-math/lib/math-flow.js
var mathFlow = {
  tokenize: tokenizeMathFenced,
  concrete: true,
  name: "mathFlow"
};
var nonLazyContinuation2 = {
  tokenize: tokenizeNonLazyContinuation2,
  partial: true
};
function tokenizeMathFenced(effects, ok3, nok) {
  const self = this;
  const tail = self.events[self.events.length - 1];
  const initialSize = tail && tail[1].type === "linePrefix" ? tail[2].sliceSerialize(tail[1], true).length : 0;
  let sizeOpen = 0;
  return start;
  function start(code2) {
    effects.enter("mathFlow");
    effects.enter("mathFlowFence");
    effects.enter("mathFlowFenceSequence");
    return sequenceOpen(code2);
  }
  function sequenceOpen(code2) {
    if (code2 === 36) {
      effects.consume(code2);
      sizeOpen++;
      return sequenceOpen;
    }
    if (sizeOpen < 2) {
      return nok(code2);
    }
    effects.exit("mathFlowFenceSequence");
    return factorySpace(effects, metaBefore, "whitespace")(code2);
  }
  function metaBefore(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      return metaAfter(code2);
    }
    effects.enter("mathFlowFenceMeta");
    effects.enter("chunkString", {
      contentType: "string"
    });
    return meta(code2);
  }
  function meta(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("chunkString");
      effects.exit("mathFlowFenceMeta");
      return metaAfter(code2);
    }
    if (code2 === 36) {
      return nok(code2);
    }
    effects.consume(code2);
    return meta;
  }
  function metaAfter(code2) {
    effects.exit("mathFlowFence");
    if (self.interrupt) {
      return ok3(code2);
    }
    return effects.attempt(nonLazyContinuation2, beforeNonLazyContinuation, after)(code2);
  }
  function beforeNonLazyContinuation(code2) {
    return effects.attempt({
      tokenize: tokenizeClosingFence,
      partial: true
    }, after, contentStart)(code2);
  }
  function contentStart(code2) {
    return (initialSize ? factorySpace(effects, beforeContentChunk, "linePrefix", initialSize + 1) : beforeContentChunk)(code2);
  }
  function beforeContentChunk(code2) {
    if (code2 === null) {
      return after(code2);
    }
    if (markdownLineEnding(code2)) {
      return effects.attempt(nonLazyContinuation2, beforeNonLazyContinuation, after)(code2);
    }
    effects.enter("mathFlowValue");
    return contentChunk(code2);
  }
  function contentChunk(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("mathFlowValue");
      return beforeContentChunk(code2);
    }
    effects.consume(code2);
    return contentChunk;
  }
  function after(code2) {
    effects.exit("mathFlow");
    return ok3(code2);
  }
  function tokenizeClosingFence(effects2, ok4, nok2) {
    let size = 0;
    return factorySpace(effects2, beforeSequenceClose, "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4);
    function beforeSequenceClose(code2) {
      effects2.enter("mathFlowFence");
      effects2.enter("mathFlowFenceSequence");
      return sequenceClose(code2);
    }
    function sequenceClose(code2) {
      if (code2 === 36) {
        size++;
        effects2.consume(code2);
        return sequenceClose;
      }
      if (size < sizeOpen) {
        return nok2(code2);
      }
      effects2.exit("mathFlowFenceSequence");
      return factorySpace(effects2, afterSequenceClose, "whitespace")(code2);
    }
    function afterSequenceClose(code2) {
      if (code2 === null || markdownLineEnding(code2)) {
        effects2.exit("mathFlowFence");
        return ok4(code2);
      }
      return nok2(code2);
    }
  }
}
function tokenizeNonLazyContinuation2(effects, ok3, nok) {
  const self = this;
  return start;
  function start(code2) {
    if (code2 === null) {
      return ok3(code2);
    }
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return lineStart;
  }
  function lineStart(code2) {
    return self.parser.lazy[self.now().line] ? nok(code2) : ok3(code2);
  }
}

// node_modules/micromark-extension-math/lib/math-text.js
function mathText(options) {
  const options_ = options || {};
  let single = options_.singleDollarTextMath;
  if (single === null || single === void 0) {
    single = true;
  }
  return {
    tokenize: tokenizeMathText,
    resolve: resolveMathText,
    previous: previous3,
    name: "mathText"
  };
  function tokenizeMathText(effects, ok3, nok) {
    const self = this;
    let sizeOpen = 0;
    let size;
    let token;
    return start;
    function start(code2) {
      effects.enter("mathText");
      effects.enter("mathTextSequence");
      return sequenceOpen(code2);
    }
    function sequenceOpen(code2) {
      if (code2 === 36) {
        effects.consume(code2);
        sizeOpen++;
        return sequenceOpen;
      }
      if (sizeOpen < 2 && !single) {
        return nok(code2);
      }
      effects.exit("mathTextSequence");
      return between(code2);
    }
    function between(code2) {
      if (code2 === null) {
        return nok(code2);
      }
      if (code2 === 36) {
        token = effects.enter("mathTextSequence");
        size = 0;
        return sequenceClose(code2);
      }
      if (code2 === 32) {
        effects.enter("space");
        effects.consume(code2);
        effects.exit("space");
        return between;
      }
      if (markdownLineEnding(code2)) {
        effects.enter("lineEnding");
        effects.consume(code2);
        effects.exit("lineEnding");
        return between;
      }
      effects.enter("mathTextData");
      return data(code2);
    }
    function data(code2) {
      if (code2 === null || code2 === 32 || code2 === 36 || markdownLineEnding(code2)) {
        effects.exit("mathTextData");
        return between(code2);
      }
      effects.consume(code2);
      return data;
    }
    function sequenceClose(code2) {
      if (code2 === 36) {
        effects.consume(code2);
        size++;
        return sequenceClose;
      }
      if (size === sizeOpen) {
        effects.exit("mathTextSequence");
        effects.exit("mathText");
        return ok3(code2);
      }
      token.type = "mathTextData";
      return data(code2);
    }
  }
}
function resolveMathText(events) {
  let tailExitIndex = events.length - 4;
  let headEnterIndex = 3;
  let index2;
  let enter;
  if ((events[headEnterIndex][1].type === "lineEnding" || events[headEnterIndex][1].type === "space") && (events[tailExitIndex][1].type === "lineEnding" || events[tailExitIndex][1].type === "space")) {
    index2 = headEnterIndex;
    while (++index2 < tailExitIndex) {
      if (events[index2][1].type === "mathTextData") {
        events[tailExitIndex][1].type = "mathTextPadding";
        events[headEnterIndex][1].type = "mathTextPadding";
        headEnterIndex += 2;
        tailExitIndex -= 2;
        break;
      }
    }
  }
  index2 = headEnterIndex - 1;
  tailExitIndex++;
  while (++index2 <= tailExitIndex) {
    if (enter === void 0) {
      if (index2 !== tailExitIndex && events[index2][1].type !== "lineEnding") {
        enter = index2;
      }
    } else if (index2 === tailExitIndex || events[index2][1].type === "lineEnding") {
      events[enter][1].type = "mathTextData";
      if (index2 !== enter + 2) {
        events[enter][1].end = events[index2 - 1][1].end;
        events.splice(enter + 2, index2 - enter - 2);
        tailExitIndex -= index2 - enter - 2;
        index2 = enter + 2;
      }
      enter = void 0;
    }
  }
  return events;
}
function previous3(code2) {
  return code2 !== 36 || this.events[this.events.length - 1][1].type === "characterEscape";
}

// node_modules/micromark-extension-math/lib/syntax.js
function math(options) {
  return {
    flow: {
      [36]: mathFlow
    },
    text: {
      [36]: mathText(options)
    }
  };
}

// node_modules/mdast-util-math/lib/index.js
function mathFromMarkdown() {
  return {
    enter: {
      mathFlow: enterMathFlow,
      mathFlowFenceMeta: enterMathFlowMeta,
      mathText: enterMathText
    },
    exit: {
      mathFlow: exitMathFlow,
      mathFlowFence: exitMathFlowFence,
      mathFlowFenceMeta: exitMathFlowMeta,
      mathFlowValue: exitMathData,
      mathText: exitMathText,
      mathTextData: exitMathData
    }
  };
  function enterMathFlow(token) {
    const code2 = {
      type: "element",
      tagName: "code",
      properties: { className: ["language-math", "math-display"] },
      children: []
    };
    this.enter(
      {
        type: "math",
        meta: null,
        value: "",
        data: { hName: "pre", hChildren: [code2] }
      },
      token
    );
  }
  function enterMathFlowMeta() {
    this.buffer();
  }
  function exitMathFlowMeta() {
    const data = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    ok(node2.type === "math");
    node2.meta = data;
  }
  function exitMathFlowFence() {
    if (this.data.mathFlowInside) return;
    this.buffer();
    this.data.mathFlowInside = true;
  }
  function exitMathFlow(token) {
    const data = this.resume().replace(/^(\r?\n|\r)|(\r?\n|\r)$/g, "");
    const node2 = this.stack[this.stack.length - 1];
    ok(node2.type === "math");
    this.exit(token);
    node2.value = data;
    const code2 = (
      /** @type {HastElement} */
      node2.data.hChildren[0]
    );
    ok(code2.type === "element");
    ok(code2.tagName === "code");
    code2.children.push({ type: "text", value: data });
    this.data.mathFlowInside = void 0;
  }
  function enterMathText(token) {
    this.enter(
      {
        type: "inlineMath",
        value: "",
        data: {
          hName: "code",
          hProperties: { className: ["language-math", "math-inline"] },
          hChildren: []
        }
      },
      token
    );
    this.buffer();
  }
  function exitMathText(token) {
    const data = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    ok(node2.type === "inlineMath");
    this.exit(token);
    node2.value = data;
    const children = (
      /** @type {Array<HastElementContent>} */
      // @ts-expect-error: we defined it in `enterMathFlow`.
      node2.data.hChildren
    );
    children.push({ type: "text", value: data });
  }
  function exitMathData(token) {
    this.config.enter.data.call(this, token);
    this.config.exit.data.call(this, token);
  }
}

// src/client.js
var h = import_react.default.createElement;
var { useState, useEffect, useCallback, useSyncExternalStore, useRef } = import_react.default;
var DEFAULT_MAX_CELLS = 20;
var OPEN_TIMEOUT_MS = 15e3;
var openChain = Promise.resolve();
function enqueueOpen(task) {
  const run = openChain.then(task, task);
  openChain = run.catch(() => {
  });
  return run;
}
var LS_KEY = "dsws-layout";
function loadLayout() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveLayout(gridSize, cells, inSplit) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ gridSize, cells, inSplit }));
  } catch {
  }
}
var MD_EXTENSIONS = [gfm(), math()];
var MD_MDAST_EXTENSIONS = [gfmFromMarkdown(), mathFromMarkdown()];
var mdCache = /* @__PURE__ */ new Map();
function parseMarkdown(text4) {
  const hit = mdCache.get(text4);
  if (hit !== void 0) return hit;
  let tree;
  try {
    tree = fromMarkdown(text4, { extensions: MD_EXTENSIONS, mdastExtensions: MD_MDAST_EXTENSIONS });
  } catch {
    tree = { type: "root", children: [{ type: "paragraph", children: [{ type: "text", value: text4 }] }] };
  }
  if (mdCache.size > 200) mdCache.clear();
  mdCache.set(text4, tree);
  return tree;
}
var mdBlockGap = 16;
var mdStyles = {
  root: {
    minWidth: 0,
    overflowWrap: "anywhere",
    font: "var(--dsw-font-markdown-base, inherit)",
    color: "var(--dsw-alias-label-primary, inherit)"
  },
  p: { margin: `${mdBlockGap}px 0` },
  h: (level) => ({
    font: `var(--dsw-font-markdown-h${Math.min(level, 4)}, inherit)`,
    margin: level >= 4 ? "16px 0" : "32px 0 16px"
  }),
  ul: { margin: `${mdBlockGap}px 0`, paddingLeft: 18 },
  li: { marginTop: 6 },
  blockquote: {
    borderLeft: "2px solid var(--dsw-alias-label-caption, #888)",
    margin: `${mdBlockGap}px 0 0`,
    paddingLeft: 14
  },
  hr: { border: "none", height: "0.5px", margin: "32px 0", background: "var(--dsw-alias-border-l2, #4a4a4a)" },
  inlineCode: {
    font: "var(--dsw-font-markdown-code, inherit)",
    fontFamily: "var(--ds-font-family-code, monospace)",
    fontSize: "0.875em",
    background: "var(--dsw-alias-markdown-inline-code, rgba(128,128,128,.16))",
    border: "0.5px solid var(--dsw-alias-border-l1, #4a4a4a)",
    borderRadius: "var(--dsw-radius-sm, 4px)",
    padding: "0 5px"
  },
  link: {
    color: "var(--dsw-alias-link, #4a9eff)",
    fontWeight: 500,
    textDecoration: "none"
  },
  strong: { fontWeight: 600 },
  codeBlock: {
    margin: `${mdBlockGap}px 0`,
    borderRadius: "var(--dsw-radius-lg, 10px)",
    background: "var(--dsw-alias-markdown-code-block, rgba(128,128,128,.10))",
    overflow: "hidden"
  },
  codeBanner: {
    background: "var(--dsw-alias-markdown-code-block-banner, rgba(128,128,128,.14))",
    padding: "9px 14px",
    font: "11px/18px var(--dsw-font-family, inherit)",
    fontFamily: "var(--ds-font-family-code, monospace)",
    fontSize: 11,
    lineHeight: "18px",
    color: "var(--dsw-alias-label-primary, inherit)"
  },
  codePre: {
    font: "var(--dsw-font-markdown-code-block, inherit)",
    fontFamily: "var(--ds-font-family-code, monospace)",
    padding: 16,
    margin: 0,
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    background: "var(--dsw-alias-markdown-code-block, rgba(128,128,128,.10))"
  },
  tableScroll: { maxWidth: "100%", overflowX: "auto", overscrollBehaviorX: "contain", margin: `${mdBlockGap}px 0` },
  table: { borderCollapse: "collapse", width: "max-content", maxWidth: "max-content" },
  th: {
    textAlign: "start",
    padding: "10px 16px",
    borderBottom: "0.5px solid var(--dsw-alias-border-l3, #5a5a5a)",
    font: "var(--dsw-font-markdown-table-head, inherit)",
    fontWeight: 600,
    maxWidth: 320,
    minWidth: 100
  },
  td: {
    padding: "10px 16px",
    borderBottom: "0.5px solid var(--dsw-alias-border-l2, #4a4a4a)",
    font: "var(--dsw-font-markdown-table, inherit)",
    maxWidth: 320,
    minWidth: 100
  },
  math: {
    fontFamily: "var(--ds-font-family-code, monospace)",
    fontSize: "0.875em",
    background: "var(--dsw-alias-markdown-inline-code, rgba(128,128,128,.16))",
    borderRadius: "var(--dsw-radius-sm, 4px)",
    padding: "0 5px"
  },
  mathBlock: {
    margin: `${mdBlockGap}px 0`,
    padding: "10px 14px",
    fontFamily: "var(--ds-font-family-code, monospace)",
    fontSize: "0.875em",
    background: "var(--dsw-alias-markdown-code-block, rgba(128,128,128,.10))",
    borderRadius: "var(--dsw-radius-md, 8px)",
    overflowX: "auto",
    whiteSpace: "pre"
  }
};
function nodeText(node2) {
  if (node2 === void 0 || node2 === null) return "";
  if (node2.type === "text" || node2.type === "inlineCode") return node2.value ?? "";
  if (Array.isArray(node2.children)) return node2.children.map(nodeText).join("");
  return "";
}
function safeHref(url) {
  try {
    const protocol = new URL(url).protocol;
    return protocol === "http:" || protocol === "https:" || protocol === "mailto:" ? url : void 0;
  } catch {
    return void 0;
  }
}
function renderMdNode(node2, key) {
  if (node2 === void 0 || node2 === null) return null;
  switch (node2.type) {
    case "root":
      return node2.children.map((child, i) => renderMdNode(child, `${key}-${i}`));
    case "paragraph":
      return h("p", { key, style: mdStyles.p }, node2.children.map((c, i) => renderMdNode(c, `${key}-${i}`)));
    case "text":
      return node2.value;
    case "strong":
      return h("strong", { key, style: mdStyles.strong }, node2.children.map((c, i) => renderMdNode(c, `${key}-${i}`)));
    case "emphasis":
      return h("em", { key }, node2.children.map((c, i) => renderMdNode(c, `${key}-${i}`)));
    case "delete":
      return h("del", { key }, node2.children.map((c, i) => renderMdNode(c, `${key}-${i}`)));
    case "inlineCode":
      return h("code", { key, style: mdStyles.inlineCode }, node2.value);
    case "link": {
      const href = safeHref(node2.url);
      const children = node2.children.map((c, i) => renderMdNode(c, `${key}-${i}`));
      return href === void 0 ? h("span", { key }, children) : h("a", { key, href, target: "_blank", rel: "noreferrer", style: mdStyles.link }, children);
    }
    case "image":
      return h("span", { key, style: { opacity: 0.7 } }, node2.alt ?? node2.url ?? "");
    case "heading":
      return h(
        `h${Math.min(node2.depth ?? 1, 6)}`,
        { key, style: mdStyles.h(node2.depth ?? 1) },
        node2.children.map((c, i) => renderMdNode(c, `${key}-${i}`))
      );
    case "list": {
      const items = node2.children.map((child, i) => {
        const li = renderMdNode({ ...child, type: "listItem" }, `${key}-li${i}`);
        return li;
      });
      return h(node2.ordered ? "ol" : "ul", {
        key,
        style: mdStyles.ul,
        start: node2.ordered && typeof node2.start === "number" ? node2.start : void 0
      }, items);
    }
    case "listItem": {
      const kids = node2.children.map((c, i) => renderMdNode(c, `${key}-${i}`));
      const checked = node2.checked;
      return h(
        "li",
        { key, style: mdStyles.li },
        checked === void 0 || checked === null ? kids : [
          h("input", {
            key: `${key}-cb`,
            type: "checkbox",
            checked: Boolean(checked),
            readOnly: true,
            style: { margin: "0 8px 0 0", accentColor: "var(--dsw-alias-label-secondary, #888)" }
          }),
          ...kids
        ]
      );
    }
    case "blockquote":
      return h(
        "blockquote",
        { key, style: mdStyles.blockquote },
        node2.children.map((c, i) => renderMdNode(c, `${key}-${i}`))
      );
    case "thematicBreak":
      return h("hr", { key, style: mdStyles.hr });
    case "code":
      return h(
        "div",
        { key, style: mdStyles.codeBlock },
        node2.lang ? h(
          "div",
          { style: mdStyles.codeBanner },
          h("span", { style: { fontFamily: "var(--ds-font-family-code, monospace)", fontSize: 11 } }, node2.lang)
        ) : null,
        h(
          "pre",
          { style: mdStyles.codePre },
          h("code", { style: { fontFamily: "inherit" } }, node2.value ?? "")
        )
      );
    case "table": {
      const rows = node2.children;
      const renderRow = (row, r, isHead) => h(
        "tr",
        { key: `${key}-r${r}` },
        row.children.map((cell, c) => {
          const Tag = isHead ? "th" : "td";
          return h(Tag, {
            key: `${key}-r${r}c${c}`,
            style: isHead ? mdStyles.th : mdStyles.td
          }, cell.children.map((x, i) => renderMdNode(x, `${key}-r${r}c${c}-${i}`)));
        })
      );
      return h(
        "div",
        { key, style: mdStyles.tableScroll },
        h(
          "table",
          { style: mdStyles.table },
          rows.length > 0 ? h("thead", null, renderRow(rows[0], 0, true)) : null,
          rows.length > 1 ? h("tbody", null, rows.slice(1).map((row, i) => renderRow(row, i + 1, false))) : null
        )
      );
    }
    case "math":
      return h("div", { key, style: mdStyles.mathBlock }, node2.value ?? "");
    case "inlineMath":
      return h("code", { key, style: mdStyles.math }, node2.value ?? "");
    case "break":
      return h("br", { key });
    case "footnoteReference":
      return h("sup", { key, style: { fontSize: "0.75em", opacity: 0.8 } }, `[${node2.identifier ?? ""}]`);
    case "footnoteDefinition":
      return null;
    case "html":
      return h("span", { key }, node2.value ?? "");
    case "definition":
    case "yaml":
    case "toml":
      return null;
    default:
      return h("span", { key }, nodeText(node2));
  }
}
function Markdown(props) {
  const tree = parseMarkdown(props.text ?? "");
  return h("div", { style: mdStyles.root }, renderMdNode(tree, props.k));
}
function SplitButton(props) {
  const variant = props?.variant ?? "inline";
  if (variant === "sidebar") {
    const [hover, setHover] = useState(false);
    return h("button", {
      className: "dsws-icon-btn",
      title: "\u5207\u6362\u5206\u5C4F\u89C6\u56FE",
      "aria-label": "\u5207\u6362\u5206\u5C4F\u89C6\u56FE",
      style: {
        position: "relative",
        flex: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        border: "none",
        borderRadius: "var(--dsw-radius-sm, 6px)",
        padding: 0,
        background: hover ? "var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.14))" : "transparent",
        cursor: "pointer",
        color: hover ? "var(--dsw-alias-label-primary, inherit)" : "var(--dsw-alias-label-secondary, #888)",
        fontSize: 15,
        lineHeight: 1,
        // The footer action slot owns a 28px row above the account row; push
        // this control to that row's trailing edge and drop it one row down so
        // it reads as part of the account row itself.
        marginLeft: "auto",
        marginRight: 4,
        transform: "translateY(40px)"
      },
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      onClick: () => {
        try {
          window.__dswsToggle?.();
        } catch (_e) {
        }
      }
    }, "\u229E");
  }
  return h("button", {
    title: "\u5207\u6362\u5206\u5C4F\u89C6\u56FE",
    style: {
      padding: "4px 10px",
      fontSize: 12,
      lineHeight: "18px",
      border: "0.5px solid var(--dsw-alias-border-l2, #555)",
      borderRadius: "var(--dsw-radius-sm, 6px)",
      background: "transparent",
      color: "var(--dsw-alias-label-primary, inherit)",
      cursor: "pointer"
    },
    onClick: () => {
      try {
        window.__dswsToggle?.();
      } catch (_e) {
      }
    }
  }, "\u229E \u5206\u5C4F");
}
var composerWrapStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: "6px 8px",
  flexShrink: 0
};
var composerCardStyle = {
  boxSizing: "border-box",
  display: "flex",
  alignItems: "flex-end",
  gap: 8,
  borderRadius: "var(--dsw-radius-panel, 12px)",
  background: "var(--dsw-specific-input-major, var(--dsw-alias-bg-elevated, #2a2a2a))",
  boxShadow: "var(--dsw-elevation-soft, 0 1px 2px rgba(0,0,0,.12))",
  padding: "6px 8px 6px 12px"
};
var composerInputStyle = {
  flex: 1,
  resize: "none",
  border: "none",
  outline: "none",
  padding: 0,
  fontSize: "var(--dsh-content-font-size, 13px)",
  lineHeight: "calc(20px + var(--dsh-content-font-delta, 0px))",
  fontFamily: "var(--dsw-font-family, inherit)",
  background: "transparent",
  color: "var(--dsw-alias-label-primary, inherit)",
  caretColor: "var(--dsw-alias-state-business-primary, #4a9eff)",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
  minHeight: 20,
  maxHeight: 80
};
var composerBtnStyle = {
  flex: "none",
  padding: "3px 10px",
  fontSize: 12,
  lineHeight: "18px",
  cursor: "pointer",
  border: "none",
  borderRadius: "var(--dsw-radius-md, 8px)",
  background: "var(--dsw-alias-state-business-primary, #4a9eff)",
  color: "#fff"
};
function eventStyle(kind) {
  const base = {
    maxWidth: "82%",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    fontSize: "var(--dsh-content-font-size, 13px)",
    lineHeight: "calc(20px + var(--dsh-content-font-delta, 0px))",
    color: "var(--dsw-alias-label-primary, inherit)",
    marginBottom: 8
  };
  if (kind === "user") return {
    ...base,
    alignSelf: "flex-end",
    background: "var(--dsw-specific-bubble, var(--dsw-alias-interactive-bg-hover, #2f3b4a))",
    borderRadius: "var(--dsw-radius-xl, 16px)",
    padding: "10px 16px",
    boxSizing: "border-box"
  };
  if (kind === "assistant") return {
    ...base,
    alignSelf: "stretch",
    maxWidth: "100%",
    whiteSpace: "normal",
    background: "transparent",
    padding: "2px 0"
  };
  if (kind === "tool") return {
    ...base,
    alignSelf: "flex-start",
    color: "var(--dsw-alias-label-tertiary, #888)",
    fontSize: "var(--dsh-content-font-size-secondary, 12px)",
    lineHeight: "calc(18px + var(--dsh-content-font-delta-secondary, 0px))",
    fontFamily: "var(--dsw-font-markdown-code-block-small, monospace)",
    padding: "2px 0"
  };
  if (kind === "divider") return {
    ...base,
    maxWidth: "100%",
    alignSelf: "stretch",
    textAlign: "center",
    color: "var(--dsw-alias-label-caption, #999)",
    fontSize: "var(--dsh-content-font-size-secondary, 11px)",
    padding: "2px 0",
    marginBottom: 6
  };
  return base;
}
function CellView(props) {
  const { sessions, sessionId } = props;
  const [binding, setBinding] = useState(null);
  const [error, setError] = useState(null);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [retry, setRetry] = useState(0);
  const refRef = useRef(null);
  const openTimerRef = useRef(null);
  const bodyRef = useRef(null);
  const textareaRef = useRef(null);
  const catalogSubscribe = useCallback((cb) => sessions.list.subscribe(cb), [sessions]);
  const catalogSnapshot = useCallback(() => sessions.list.getSnapshot(), [sessions]);
  const catalog = useSyncExternalStore(catalogSubscribe, catalogSnapshot);
  const cataloged = !!sessionId && !!catalog?.ids?.includes(sessionId);
  useEffect(() => {
    if (!sessionId || !cataloged) {
      if (!sessionId) {
        setBinding(null);
        setError(null);
      }
      return;
    }
    let cancelled = false;
    let reference = null;
    const controller = new AbortController();
    openTimerRef.current = setTimeout(() => {
      if (cancelled) return;
      try {
        controller.abort();
      } catch {
      }
      setError(`\u6253\u5F00\u4F1A\u8BDD\u8D85\u65F6\uFF08${OPEN_TIMEOUT_MS / 1e3}s\uFF09`);
    }, OPEN_TIMEOUT_MS);
    const finish = () => clearTimeout(openTimerRef.current);
    enqueueOpen(() => {
      if (cancelled) return Promise.resolve();
      try {
        reference = sessions.retain(sessionId, { source: "controllerOperation", signal: controller.signal });
        refRef.current = reference;
        return Promise.resolve(reference.ready).then((b) => {
          if (cancelled) return;
          finish();
          setBinding(b);
        }, (e) => {
          if (cancelled) return;
          finish();
          setError(String(e));
        });
      } catch (e) {
        finish();
        setError(String(e));
        return Promise.resolve();
      }
    });
    return () => {
      cancelled = true;
      clearTimeout(openTimerRef.current);
      try {
        controller.abort();
      } catch {
      }
      try {
        refRef.current?.release();
      } catch {
      }
      refRef.current = null;
      setBinding(null);
    };
  }, [sessionId, cataloged, sessions, retry]);
  const [events, setEvents] = useState([]);
  useEffect(() => {
    if (!binding?.eventSource) return;
    const es = binding.eventSource;
    const update = () => {
      const w = es.getSnapshot();
      setEvents(w?.entries ?? []);
    };
    update();
    return es.subscribe(update);
  }, [binding]);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!binding?.session) return;
    const sess = binding.session;
    const update = () => {
      const s = sess.getSnapshot();
      setRunning(s?.running ?? false);
    };
    update();
    return sess.subscribe(update);
  }, [binding]);
  const followRef = useRef(true);
  useEffect(() => {
    const el = bodyRef.current;
    if (el && followRef.current) el.scrollTop = el.scrollHeight;
  }, [events.length]);
  const onScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    followRef.current = atBottom;
    if (el.scrollTop < 48) {
      const sess = binding?.session;
      const snap = sess?.getSnapshot();
      if (sess && snap?.hasMore && !snap.loadingOlder) {
        const before = el.scrollHeight;
        sess.loadOlder().then(() => {
          const grown = bodyRef.current;
          if (grown) grown.scrollTop += grown.scrollHeight - before;
        }).catch(() => {
        });
      }
    }
  }, [binding]);
  const send = useCallback(async () => {
    const text4 = inputText.trim();
    if (!text4 || !binding?.session || sending) return;
    setSending(true);
    try {
      await binding.session.prompt([{ type: "text", text: text4 }], "queue");
      setInputText("");
    } catch (_e) {
    }
    setSending(false);
    textareaRef.current?.focus();
  }, [inputText, binding, sending]);
  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };
  if (!sessionId) {
    return h("div", { style: { textAlign: "center", marginTop: 40, color: "var(--dsw-alias-label-caption, #999)", flex: 1 } }, "\u4ECE\u4E0A\u65B9\u9009\u62E9\u4F1A\u8BDD");
  }
  if (error) {
    return h(
      "div",
      { style: { padding: 12, flex: 1, color: "var(--dsw-alias-label-secondary, #888)" } },
      h("div", { style: { marginBottom: 8 } }, `\u52A0\u8F7D\u5931\u8D25: ${error}`),
      h("button", {
        style: { ...composerBtnStyle, alignSelf: "flex-start" },
        onClick: () => {
          setError(null);
          setBinding(null);
          setRetry((n) => n + 1);
        }
      }, "\u91CD\u8BD5")
    );
  }
  if (!cataloged) {
    return h("div", { style: { padding: 12, color: "var(--dsw-alias-label-secondary, #888)", flex: 1 } }, "\u7B49\u5F85\u4F1A\u8BDD\u76EE\u5F55\u2026");
  }
  if (!binding) {
    return h("div", { style: { padding: 12, color: "var(--dsw-alias-label-secondary, #888)", flex: 1 } }, "\u52A0\u8F7D\u4E2D\u2026");
  }
  const visible = events;
  return h(
    import_react.default.Fragment,
    null,
    h(
      "div",
      {
        ref: bodyRef,
        onScroll,
        style: { display: "flex", flexDirection: "column", flex: 1, overflow: "auto", padding: "10px 12px", minHeight: 0 }
      },
      visible.map((entry, idx) => {
        const ev = entry.event;
        const type = ev?.type ?? "unknown";
        let text4 = "";
        let kind = "other";
        if (type === "user/message") {
          const blocks = ev?.data?.content ?? [];
          text4 = blocks.filter((b) => b.type === "text").map((b) => b.text).join("");
          kind = "user";
        } else if (type === "assistant/message") {
          const blocks = ev?.data?.message?.content ?? [];
          text4 = blocks.filter((b) => b.type === "text").map((b) => b.text).join("");
          kind = "assistant";
        } else if (type === "assistant/live-chunk") {
          text4 = ev?.data?.chunk?.text ?? "";
          kind = "assistant";
        } else if (type === "tool/result") {
          text4 = `[tool] ${ev?.data?.name ?? ""}`;
          kind = "tool";
        } else if (type === "turn/start") {
          text4 = `\u2014 \u7B2C ${ev?.data?.turn} \u8F6E \u2014`;
          kind = "divider";
        } else {
          return null;
        }
        if (!text4) return null;
        if (kind === "assistant") {
          return h("div", { key: idx, style: eventStyle(kind) }, h(Markdown, { text: text4, k: `m${idx}` }));
        }
        return h("div", { key: idx, style: eventStyle(kind) }, text4);
      })
    ),
    h(
      "div",
      { style: composerWrapStyle },
      h(
        "div",
        { style: composerCardStyle },
        h("textarea", {
          ref: textareaRef,
          value: inputText,
          onChange: (e) => setInputText(e.target.value),
          onKeyDown,
          placeholder: "\u8F93\u5165\u6D88\u606F\u2026",
          rows: 1,
          style: composerInputStyle
        }),
        h("button", {
          onClick: send,
          disabled: !inputText.trim() || sending,
          style: { ...composerBtnStyle, opacity: !inputText.trim() || sending ? 0.4 : 1 }
        }, "\u53D1\u9001")
      )
    )
  );
}
function SplitMain(props) {
  const sessions = props.__sessions;
  const subscribe = useCallback((cb) => sessions.list.subscribe(cb), [sessions]);
  const getSnapshot = useCallback(() => sessions.list.getSnapshot(), [sessions]);
  const list2 = useSyncExternalStore(subscribe, getSnapshot);
  const saved = useRef(loadLayout()).current;
  const [gridSize, setGridSize] = useState(saved?.gridSize ?? 2);
  const [activeCell, setActiveCell] = useState(0);
  const [cells, setCells] = useState(() => {
    const s = saved?.cells ?? [];
    const size = (saved?.gridSize ?? 2) ** 2;
    const arr = Array(size).fill(null);
    for (let i = 0; i < Math.min(s.length, size); i++) arr[i] = s[i] ?? null;
    return arr;
  });
  const items = list2?.ids?.map((id) => list2.byId[id]).filter(Boolean) ?? [];
  const nonBlank = items.filter((s) => !s.blank);
  const runningMap = useRef({});
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const unsubs = [];
    for (const s of nonBlank) {
      try {
        const info = sessions.retainInfo(s.id);
        const unsub = info.subscribe(() => {
          const snap = info.getSnapshot();
          const wasRunning = runningMap.current[s.id];
          const nowRunning = (snap?.retainedBy?.mainView ?? 0) > 0;
          if (wasRunning !== nowRunning) {
            runningMap.current[s.id] = nowRunning;
            forceUpdate((n) => n + 1);
          }
        });
        unsubs.push(unsub);
      } catch {
      }
    }
    return () => unsubs.forEach((u) => {
      try {
        u();
      } catch {
      }
    });
  }, [nonBlank.length]);
  const maxCells = props.__maxCells ?? DEFAULT_MAX_CELLS;
  const total = Math.min(gridSize * gridSize, maxCells);
  const setCell = (idx, sessionId) => {
    setCells((prev) => {
      const next = [...prev];
      next[idx] = sessionId;
      return next;
    });
  };
  useEffect(() => {
    const size = Math.min(gridSize * gridSize, maxCells);
    setCells((prev) => {
      const next = Array(size).fill(null);
      for (let i = 0; i < Math.min(prev.length, size); i++) next[i] = prev[i];
      return next;
    });
  }, [gridSize, maxCells]);
  useEffect(() => {
    saveLayout(gridSize, cells, window.__dswsInSplit ?? false);
  }, [gridSize, cells]);
  useEffect(() => {
    if (list2?.phase !== "ready") return;
    const known = new Set(list2.ids ?? []);
    setCells((prev) => {
      if (prev.every((c) => c === null || known.has(c))) return prev;
      return prev.map((c) => c !== null && known.has(c) ? c : null);
    });
  }, [list2]);
  const cellStyle = {
    borderTop: "0.5px solid var(--dsw-alias-border-l3, #444)",
    borderLeft: "0.5px solid var(--dsw-alias-border-l3, #444)",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    minHeight: 0,
    minWidth: 0,
    background: "var(--dsw-alias-bg-base, transparent)"
  };
  const cellHeaderStyle = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
    minHeight: 30,
    padding: "6px 12px",
    borderBottom: "0.5px solid var(--dsw-alias-border-l3, #444)",
    fontSize: 13,
    lineHeight: "16px",
    fontWeight: 500,
    color: "var(--dsw-alias-label-primary, inherit)"
  };
  const selectStyle = {
    fontSize: 12,
    padding: "2px 6px",
    maxWidth: 160,
    background: "var(--dsw-specific-input-major, transparent)",
    color: "var(--dsw-alias-label-primary, inherit)",
    border: "0.5px solid var(--dsw-alias-border-l2, #555)",
    borderRadius: "var(--dsw-radius-sm, 6px)"
  };
  const dotStyle = (running) => ({
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
    background: running ? "var(--dsw-alias-state-success, #4caf50)" : "var(--dsw-alias-label-caption, #999)",
    transition: "background 0.3s"
  });
  const toolbarStyle = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    minHeight: 38,
    padding: "6px 20px",
    flexShrink: 0,
    borderBottom: "0.5px solid var(--dsw-alias-border-l3, #444)",
    color: "var(--dsw-alias-label-primary, inherit)"
  };
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
    gap: 0,
    padding: 0,
    borderRight: "0.5px solid var(--dsw-alias-border-l3, #444)",
    borderBottom: "0.5px solid var(--dsw-alias-border-l3, #444)",
    boxSizing: "border-box",
    flex: 1,
    minHeight: 0,
    overflow: "hidden"
  };
  const btnStyle = {
    padding: "2px 8px",
    fontSize: 12,
    lineHeight: "18px",
    cursor: "pointer",
    border: "0.5px solid var(--dsw-alias-border-l2, #555)",
    borderRadius: "var(--dsw-radius-sm, 6px)",
    background: "transparent",
    color: "var(--dsw-alias-label-primary, inherit)"
  };
  return h(
    "div",
    { style: { display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" } },
    h(
      "div",
      { style: toolbarStyle },
      h("span", { style: { fontWeight: 600, fontSize: 15 } }, "\u5206\u5C4F\u89C6\u56FE"),
      h(
        "span",
        { style: { fontSize: 12, color: "var(--dsw-alias-label-secondary, #888)" } },
        `${nonBlank.length} \u4E2A\u4F1A\u8BDD \xB7 ${total}/${maxCells} \u683C`
      ),
      h(
        "div",
        { style: { marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" } },
        h("span", { style: { fontSize: 12 } }, "\u7F51\u683C:"),
        [1, 2, 3, 4, 5].map(
          (n) => h("button", {
            key: n,
            style: { ...btnStyle, fontWeight: gridSize === n ? 700 : 400 },
            onClick: () => setGridSize(n),
            title: `${n}\xD7${n} = ${n * n} \u683C`
          }, `${n}\xD7${n}`)
        ),
        h("button", {
          style: btnStyle,
          onClick: () => {
            try {
              window.__dswsToggle?.();
            } catch (_e) {
            }
          }
        }, "\u9000\u51FA\u5206\u5C4F")
      )
    ),
    h(
      "div",
      { style: gridStyle },
      Array.from({ length: total }, (_, i) => {
        const sid = cells[i];
        const sess = sid ? nonBlank.find((s) => s.id === sid) : null;
        const isActive = i === activeCell;
        return h(
          "div",
          {
            key: i,
            style: {
              ...cellStyle,
              // Inset ring marks the active tile without touching the shared
              // dividers or shifting the tile's box.
              boxShadow: isActive ? "inset 0 0 0 1.5px var(--dsw-alias-state-business-primary, #4a9eff)" : "none"
            },
            onMouseDown: () => setActiveCell(i)
          },
          h(
            "div",
            {
              style: {
                ...cellHeaderStyle,
                background: isActive ? "var(--dsw-alias-interactive-bg-hover, #2f3b4a)" : "transparent"
              }
            },
            sess ? h(
              import_react.default.Fragment,
              null,
              h("span", { style: dotStyle(sess.running) }),
              h("span", null, sess.displayTitle || sess.title || sess.id.slice(0, 8))
            ) : h("span", { style: { color: "var(--dsw-alias-label-caption, #999)" } }, `\u683C ${i + 1}`),
            h(
              "select",
              {
                style: { ...selectStyle, marginLeft: "auto" },
                value: sid ?? "",
                onChange: (e) => setCell(i, e.target.value || null)
              },
              h("option", { value: "" }, "\u9009\u62E9\u4F1A\u8BDD\u2026"),
              nonBlank.map(
                (s) => h(
                  "option",
                  { key: s.id, value: s.id },
                  (s.displayTitle || s.title || s.id.slice(0, 8)) + (s.running ? " \u25CF" : "")
                )
              )
            )
          ),
          h(CellView, { sessions, sessionId: sid })
        );
      })
    )
  );
}
var inject = ["slots", "layout", "sessions"];
function apply(ctx, config) {
  const maxCells = config?.maxCells ?? DEFAULT_MAX_CELLS;
  const saved = loadLayout();
  let inSplit = saved?.inSplit ?? false;
  window.__dswsInSplit = inSplit;
  window.__dswsToggle = () => {
    inSplit = !inSplit;
    window.__dswsInSplit = inSplit;
    try {
      ctx.layout.selectPanel(inSplit ? "split" : null);
    } catch (_e) {
    }
    const cur = loadLayout() ?? {};
    saveLayout(cur.gridSize ?? 2, cur.cells ?? [], inSplit);
  };
  ctx.effect(() => () => {
    try {
      delete window.__dswsToggle;
      delete window.__dswsInSplit;
    } catch (_e) {
    }
  }, "workspace-split: cleanup");
  ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
    name: "sidebar.footer.action",
    id: "workspace-split-sidebar",
    order: 5
  }, function SidebarSplitButton() {
    return h(SplitButton, { variant: "sidebar" });
  }));
  ctx.slots.inject("conversation.hero.options", () => ctx.slots.register({
    name: "conversation.hero.options",
    id: "workspace-split-btn-hero",
    order: 5
  }, SplitButton));
  const sessionsRef = ctx.sessions;
  ctx.slots.inject("main", () => ctx.slots.register({
    name: "main",
    key: "split"
  }, function SplitPanel() {
    return h(SplitMain, { __sessions: sessionsRef, __maxCells: maxCells });
  }));
  if (inSplit) {
    try {
      ctx.layout.selectPanel("split");
    } catch (_e) {
    }
  }
}

    return module.exports;
  },
});
