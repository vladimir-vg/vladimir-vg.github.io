"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var SelectedItemInfo = function (_React$Component) {
  _inherits(SelectedItemInfo, _React$Component);

  function SelectedItemInfo() {
    _classCallCheck(this, SelectedItemInfo);

    return _possibleConstructorReturn(this, (SelectedItemInfo.__proto__ || Object.getPrototypeOf(SelectedItemInfo)).apply(this, arguments));
  }

  _createClass(SelectedItemInfo, [{
    key: "onItemSelect",
    value: function onItemSelect(type, key) {
      this.props.onItemSelect({ type: type, key: key });
    }
  }, {
    key: "onCellHoverEnter",
    value: function onCellHoverEnter(type, key) {
      this.props.onItemHover({ type: type, key: key });
    }
  }, {
    key: "onCellHoverLeave",
    value: function onCellHoverLeave() {
      this.props.onItemHover(null);
    }
  }, {
    key: "renderPid",
    value: function renderPid(pid, key) {
      key = key || pid;
      var className = "pid";
      if (this.props.hoveredItem && this.props.hoveredItem.type == 'proc' && this.props.hoveredItem.key == pid) {
        className += " hovered";
      }

      if (this.props.selectedItem && this.props.selectedItem.type == 'proc' && this.props.selectedItem.key == pid) {
        className += " selected";
      }

      return React.createElement(
        "span",
        { key: key, className: className,
          onClick: this.onItemSelect.bind(this, 'proc', pid),
          onMouseEnter: this.onCellHoverEnter.bind(this, 'proc', pid),
          onMouseLeave: this.onCellHoverLeave.bind(this) },
        pid
      );
    }
  }, {
    key: "renderTextContent",
    value: function renderTextContent(text) {
      var _this2 = this;

      if (!text) return "";

      var parts = [];
      var onText = function onText(text, pos) {
        parts.push(React.createElement(
          "span",
          { key: pos },
          text
        ));
      };

      var onPid = function onPid(pid, pos) {
        parts.push(_this2.renderPid(pid, pos));
      };

      V.walkInfoText(text, onText, onPid);

      return parts;
    }
  }, {
    key: "tryRenderPid",
    value: function tryRenderPid(pid, key) {
      if (!pid) return null;
      if (pid[0] != '<') return pid;
      return this.renderPid(pid, key);
    }
  }, {
    key: "renderProc",
    value: function renderProc() {
      var proc = this.props.tree.procs[this.props.selectedItem.key];
      var registered = null;
      var terminatedAttr = null;
      var terminated = null;
      if (proc.atom) {
        registered = React.createElement(
          "div",
          null,
          "registered as: ",
          React.createElement(
            "code",
            null,
            proc.atom
          )
        );
      }
      if (proc.reason) {
        terminatedAttr = React.createElement(
          "div",
          null,
          React.createElement("br", null),
          React.createElement(
            "div",
            null,
            "termination reason:"
          )
        );
        terminated = React.createElement(
          "pre",
          null,
          this.renderTextContent(proc.reason)
        );
      }
      return React.createElement(
        "div",
        null,
        React.createElement(
          "div",
          { className: "attrs" },
          React.createElement(
            "div",
            null,
            "process: ",
            this.tryRenderPid(proc.pid)
          ),
          React.createElement(
            "div",
            null,
            "parent: ",
            this.tryRenderPid(proc.parent)
          ),
          React.createElement(
            "div",
            null,
            "spawn as: ",
            React.createElement(
              "code",
              null,
              proc.mfa
            )
          ),
          registered,
          terminatedAttr
        ),
        terminated
      );
    }
  }, {
    key: "renderMessageSend",
    value: function renderMessageSend() {
      var send = this.props.tree.sends[this.props.selectedItem.key];
      var receiver = null;

      if (send.to && send.toAtom) {
        receiver = React.createElement(
          "span",
          null,
          this.tryRenderPid(send.to, 'to'),
          " (",
          React.createElement(
            "code",
            null,
            send.toAtom
          ),
          ")"
        );
      } else if (send.to) {
        receiver = React.createElement(
          "span",
          null,
          this.tryRenderPid(send.to, 'to')
        );
      } else {
        receiver = React.createElement(
          "code",
          null,
          send.toAtom
        );
      }

      return React.createElement(
        "div",
        null,
        React.createElement(
          "div",
          { className: "attrs" },
          "message ",
          this.tryRenderPid(send.from, 'from'),
          " \u2192 ",
          receiver
        ),
        React.createElement(
          "pre",
          null,
          this.renderTextContent(send.term)
        )
      );
    }
  }, {
    key: "render",
    value: function render() {
      if (!this.props.selectedItem) {
        return null;
      }

      var body = null;
      if (this.props.selectedItem.type == 'proc') {
        body = this.renderProc();
      } else if (this.props.selectedItem.type == 'send') {
        body = this.renderMessageSend();
      }

      return React.createElement(
        "div",
        { className: "selected-item-info" },
        body
      );
    }
  }]);

  return SelectedItemInfo;
}(React.Component);

;

SelectedItemInfo.propTypes = {
  tree: React.PropTypes.object.isRequired,
  onItemSelect: React.PropTypes.func.isRequired,
  onItemHover: React.PropTypes.func.isRequired,
  selectedItem: React.PropTypes.object,
  hoveredItem: React.PropTypes.object
};

