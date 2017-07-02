"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// pixels of empty space around figure that might be visible by dragging
V.WORKSPACE_PADDING = 100;

// utilitary function that splits given text into parts
// and uses giveb callback on each part
V.walkInfoText = function (text, onText, onPid) {
  var pidRe = /(<\d+\.\d+\.\d+>)/g;

  var prevIndex = 0;
  var match = pidRe.exec(text);
  while (match != null) {
    if (prevIndex != match.index) {
      onText(text.slice(prevIndex, match.index), prevIndex);
    }
    onPid(match[0], match.index);

    prevIndex = match.index + match[0].length;
    match = pidRe.exec(text);
  }

  if (prevIndex != text.length) {
    onText(text.slice(prevIndex, text.length), prevIndex);
  }
};

// some messages are shell-related and not really interesting for user
// this function tells them apart
V.isMessageValuable = function (send, tree) {
  var receiverAbsent = send.to && !(send.to in tree.procs);
  var senderToplevel = send.from in tree.procs && !(tree.procs[send.from].parent in tree.procs);
  var receiverToplevel = send.to in tree.procs && !(tree.procs[send.to].parent in tree.procs);

  if (receiverAbsent && send.term.indexOf("{io_request,") == 0) return false;
  if (send.toAtom == 'code_server' && send.term.indexOf("{code_call,") == 0) return false;
  if (senderToplevel && send.term.indexOf("{shell_cmd,") == 0) return false;
  if (receiverToplevel && send.term.indexOf("{shell_rep,") == 0) return false;

  return true;
};

var App = function (_React$Component) {
  _inherits(App, _React$Component);

  function App() {
    _classCallCheck(this, App);

    var _this = _possibleConstructorReturn(this, (App.__proto__ || Object.getPrototypeOf(App)).call(this));

    _this.state = {
      errorText: null,
      tree: null,
      hoveredItem: null,
      selectedItem: null,
      inputAllowed: false,
      shellStartAllowed: false,
      scenarios: null
    };

    // avoid repeating .bind(this) by doing it once
    _this.startNewShell = _this.startNewShell.bind(_this);
    _this.onModuleStore = _this.onModuleStore.bind(_this);
    _this.onShellInput = _this.onShellInput.bind(_this);
    _this.onRestartRequest = _this.onRestartRequest.bind(_this);
    _this.onItemSelect = _this.onItemSelect.bind(_this);
    _this.onItemHover = _this.onItemHover.bind(_this);
    return _this;
  }

  _createClass(App, [{
    key: "componentDidMount",
    value: function componentDidMount() {
      var hash = window.location.hash;

      V.socket = new WebSocket("ws://" + window.location.host + "/websocket");
      setTimeout(this.checkSocketState.bind(this), 1000);

      if (!hash) {
        this.requestScenarousList();
      } else if (hash.slice(0, 2) == '#/') {
        var parts = hash.slice(2).split('/');
        var url = '/espace-demo-07-2017/scenarios/'+parts[0]+"/"+parts[1]+"/"+parts[1]+".csv";
        this.fetchCsvAndLoad(url);
      } else {
        this.setState({ errorText: 'Wrong ' + hash + ' hash address' });
      }
    }
  }, {
    key: "checkSocketState",
    value: function checkSocketState() {
      if (V.socket.readyState == WebSocket.OPEN) {
        this.setState({ shellStartAllowed: true });
      }
    }
  }, {
    key: "requestScenarousList",
    value: function requestScenarousList() {
      var _this2 = this;

      fetch('/espace-demo-07-2017/scenarios.json').then(function (response) {
        response.json().then(function (items) {
          _this2.setState({ scenarios: items });
        });
      });
    }
  }, {
    key: "startNewShell",
    value: function startNewShell() {
      V.socket.onmessage = function (event) {
        if (event.data.slice(0, 7) == "events ") {
          var rows = JSON.parse(event.data.slice(7));
          var tree = V.processEvents(this.state.tree, rows, 'json');
          this.setState({ tree: tree, inputAllowed: true });
        } else if (event.data.slice(0, 14) == "shell_started ") {
          var path = event.data.slice(14);
          window.location.hash = "/" + path;
        }
      }.bind(this);

      V.socket.send("start_shell");
    }
  }, {
    key: "fetchCsvAndLoad",
    value: function fetchCsvAndLoad(url) {
      var _this3 = this;

      fetch(url).then(function (response) {
        response.text().then(function (text) {
          var rows = CSV.parse(text);
          var keys = rows.shift();
          var tree = V.processEvents(undefined, rows, keys);
          _this3.setState({ tree: tree });
        });
      });
    }
  }, {
    key: "onItemSelect",
    value: function onItemSelect(item) {
      if (!item) {
        this.setState({ selectedItem: null });
      } else if (this.state.selectedItem && this.state.selectedItem.key == item.key && this.state.selectedItem.type == item.type) {
        // toggle in case of same item select
        this.setState({ selectedItem: null });
      } else {
        // if selected pid that not present on page then do nothing
        // for example parent of top process
        if (item.type == 'proc' && !(item.key in this.state.tree.procs)) {
          return;
        }
        this.setState({ selectedItem: item });
      }
    }
  }, {
    key: "onItemHover",
    value: function onItemHover(item) {
      if (!item) {
        this.setState({ hoveredItem: null });
      } else {
        this.setState({ hoveredItem: item });
      }
    }
  }, {
    key: "onShellInput",
    value: function onShellInput(text) {
      V.socket.send("shell_input " + text + "\n");
    }
  }, {
    key: "onRestartRequest",
    value: function onRestartRequest() {
      V.socket.send("shell_restart");
    }
  }, {
    key: "onModuleStore",
    value: function onModuleStore(name, body) {
      V.socket.send("store_module " + name + "\n" + body);
    }
  }, {
    key: "renderMainPage",
    value: function renderMainPage() {
      var shellBlock = null;
      if (this.state.shellStartAllowed) {
        shellBlock = React.createElement(
          "div",
          { className: "head-block" },
          React.createElement(
            "button",
            { className: "btn", onClick: this.startNewShell },
            "Start new shell"
          )
        );
      }
      return React.createElement(
        "div",
        { className: "content-page" },
        shellBlock,
        React.createElement(ScenariosList, { scenarios: this.state.scenarios })
      );
    }
  }, {
    key: "render",
    value: function render() {
      if (this.state.errorText) {
        return React.createElement(
          "div",
          null,
          this.state.errorText
        );
      }

      if (!window.location.hash) {
        if (!this.state.scenarios) {
          return React.createElement(
            "div",
            { className: "content-page" },
            "Loading scenarios..."
          );
        } else {
          return this.renderMainPage();
        }
      }

      var inputPanel = null;
      if (this.state.tree && this.state.inputAllowed) {
        inputPanel = React.createElement(InputPanel, { key: "huy", tree: this.state.tree, storeModule: this.onModuleStore,
          submitInput: this.onShellInput, requestRestart: this.onRestartRequest });
      }

      if (this.state.tree) {
        var paddedWidth = this.state.tree.maxX * (V.CELL_WIDTH + V.CELL_GUTTER);
        var paddedHeight = this.state.tree.maxY * V.CELL_HEIGHT;
        return React.createElement(
          "div",
          { className: "container" },
          React.createElement(
            SvgView,
            { className: "svg-area", padding: V.WORKSPACE_PADDING, paddedWidth: paddedWidth, paddedHeight: paddedHeight },
            React.createElement(HoverSelection, { tree: this.state.tree, selectedItem: this.state.selectedItem, hoveredItem: this.state.hoveredItem,
              onItemSelect: this.onItemSelect, onItemHover: this.onItemHover }),
            React.createElement(ProcessTreeView, { tree: this.state.tree, selectedItem: this.state.selectedItem, hoveredItem: this.state.hoveredItem,
              onItemSelect: this.onItemSelect, onItemHover: this.onItemHover }),
            React.createElement(ShellIOView, { tree: this.state.tree, width: paddedWidth,
              selectedItem: this.state.selectedItem, hoveredItem: this.state.hoveredItem,
              onItemSelect: this.onItemSelect, onItemHover: this.onItemHover }),
            React.createElement(MessageSends, { tree: this.state.tree, selectedItem: this.state.selectedItem, hoveredItem: this.state.hoveredItem,
              onItemSelect: this.onItemSelect, onItemHover: this.onItemHover })
          ),
          React.createElement(
            "div",
            { className: "aside-area" },
            React.createElement(SelectedItemInfo, { tree: this.state.tree,
              selectedItem: this.state.selectedItem, hoveredItem: this.state.hoveredItem,
              onItemSelect: this.onItemSelect, onItemHover: this.onItemHover })
          ),
          React.createElement(
            "div",
            null,
            inputPanel
          )
        );
      }

      return React.createElement(
        "div",
        { className: "content-page" },
        "Loading..."
      );
    }
  }]);

  return App;
}(React.Component);

document.addEventListener("DOMContentLoaded", function (event) {
  ReactDOM.render(React.createElement(App, null), document.getElementById('react-app'));
});

// polyfill
if (typeof Object.assign != 'function') {
  Object.assign = function (target, varArgs) {
    // .length of function is 2
    'use strict';

    if (target == null) {
      // TypeError if undefined or null
      throw new TypeError('Cannot convert undefined or null to object');
    }

    var to = Object(target);

    for (var index = 1; index < arguments.length; index++) {
      var nextSource = arguments[index];

      if (nextSource != null) {
        // Skip over if undefined or null
        for (var nextKey in nextSource) {
          // Avoid bugs when hasOwnProperty is shadowed
          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
    }
    return to;
  };
}

