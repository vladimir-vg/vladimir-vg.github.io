"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var MessageSends = function (_React$Component) {
  _inherits(MessageSends, _React$Component);

  function MessageSends() {
    _classCallCheck(this, MessageSends);

    return _possibleConstructorReturn(this, (MessageSends.__proto__ || Object.getPrototypeOf(MessageSends)).apply(this, arguments));
  }

  _createClass(MessageSends, [{
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
    key: "renderSend",
    value: function renderSend(e) {
      var y = e.y * V.CELL_HEIGHT;
      var x1 = void 0,
          x2 = void 0;
      var outerX = -(V.SHELL_SIDELINE_WIDTH + V.CELL_WIDTH * 2);
      if (e.from in this.props.tree.procs && e.to in this.props.tree.procs) {
        x1 = (this.props.tree.procs[e.from].x + 1) * (V.CELL_WIDTH + V.CELL_GUTTER) - V.CELL_WIDTH / 2;
        x2 = (this.props.tree.procs[e.to].x + 1) * (V.CELL_WIDTH + V.CELL_GUTTER) - V.CELL_WIDTH / 2;
      } else if (!(e.from in this.props.tree.procs)) {
        x1 = outerX;
        x2 = (this.props.tree.procs[e.to].x + 1) * (V.CELL_WIDTH + V.CELL_GUTTER) - V.CELL_WIDTH / 2;
      } else if (!(e.to in this.props.tree.procs)) {
        x1 = (this.props.tree.procs[e.from].x + 1) * (V.CELL_WIDTH + V.CELL_GUTTER) - V.CELL_WIDTH / 2;;
        x2 = outerX;
      }

      var className = "message-send";
      if (!V.isMessageValuable(e, this.props.tree)) {
        className += " muted";
      }

      return React.createElement(
        "g",
        { key: y },
        React.createElement("line", { x1: x1, y1: y - 0.5, x2: x2, y2: y - 0.5, className: className })
      );
    }
  }, {
    key: "renderSelfSend",
    value: function renderSelfSend(e) {
      var y = e.y * V.CELL_HEIGHT;
      var x = (this.props.tree.procs[e.from].x + 1) * (V.CELL_WIDTH + V.CELL_GUTTER);
      var d = Math.min(V.CELL_HEIGHT, V.CELL_WIDTH + V.CELL_GUTTER) * 0.7;
      var r = d / 2;

      var dpath = "M" + (x - r) + " " + y + " A " + r + " " + r + ", 0, 1, 1, " + x + " " + (y + r) + " L " + (x - 3) + " " + (y + r);
      return React.createElement(
        "g",
        { key: y },
        React.createElement("path", { d: dpath, className: "message-self-send" })
      );
    }
  }, {
    key: "renderSends",
    value: function renderSends() {
      var sends = [];

      for (var i in this.props.tree.sends) {
        var e = this.props.tree.sends[i];

        if (!(e.from in this.props.tree.procs) && !(e.to in this.props.tree.procs)) {
          console.error("both sender and receiver are absent", e);
          break;
        }

        if (e.from == e.to) {
          sends.push(this.renderSelfSend(e));
        } else {
          sends.push(this.renderSend(e));
        }
      }

      return sends;
    }
  }, {
    key: "render",
    value: function render() {
      return React.createElement(
        "g",
        null,
        React.createElement(
          "g",
          null,
          this.renderSends()
        )
      );
    }
  }]);

  return MessageSends;
}(React.Component);

;

MessageSends.propTypes = {
  tree: React.PropTypes.object.isRequired,
  onItemSelect: React.PropTypes.func.isRequired,
  onItemHover: React.PropTypes.func.isRequired,
  selectedItem: React.PropTypes.object,
  hoveredItem: React.PropTypes.object
};

