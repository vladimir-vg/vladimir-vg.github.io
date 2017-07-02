"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

V.SHELL_LINE_HEIGHT = V.CELL_HEIGHT * 3;
V.SHELL_LINE_TOP_PADDING = V.CELL_HEIGHT;
V.SHELL_SIDELINE_WIDTH = 45;

var ShellIOView = function (_React$Component) {
  _inherits(ShellIOView, _React$Component);

  function ShellIOView() {
    _classCallCheck(this, ShellIOView);

    return _possibleConstructorReturn(this, (ShellIOView.__proto__ || Object.getPrototypeOf(ShellIOView)).apply(this, arguments));
  }

  _createClass(ShellIOView, [{
    key: "onItemSelect",

    // onMouseDown(e) {
    //   // to disable dragging when selecting text
    //   e.stopPropagation();
    // }

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
    key: "renderTextContent",
    value: function renderTextContent(text) {
      var _this2 = this;

      var parts = [];
      var onText = function onText(text, pos) {
        parts.push(React.createElement(
          "tspan",
          { key: pos },
          text
        ));
      };

      var onPid = function onPid(pid, pos) {
        var className = "pid";
        if (_this2.props.hoveredItem && _this2.props.hoveredItem.type == 'proc' && _this2.props.hoveredItem.key == pid) {
          className += " hovered";
        }

        if (_this2.props.selectedItem && _this2.props.selectedItem.type == 'proc' && _this2.props.selectedItem.key == pid) {
          className += " selected";
        }

        parts.push(React.createElement(
          "tspan",
          { key: pos, className: className,
            onClick: _this2.onItemSelect.bind(_this2, 'proc', pid),
            onMouseEnter: _this2.onCellHoverEnter.bind(_this2, 'proc', pid),
            onMouseLeave: _this2.onCellHoverLeave.bind(_this2) },
          pid
        ));
      };

      V.walkInfoText(text, onText, onPid);

      return parts;
    }
  }, {
    key: "render",
    value: function render() {
      var blocks = [];

      for (var i in this.props.tree.shellIO) {
        var e = this.props.tree.shellIO[i];

        var y = e.y * V.CELL_HEIGHT;

        var texts = [];
        var n = 1;
        for (var j in e.blocks) {
          for (var k in e.blocks[j].lines) {
            var line = e.blocks[j].lines[k];
            var prompt = e.blocks[j].prompt;
            var y1 = y + V.SHELL_LINE_HEIGHT * n - V.SHELL_LINE_TOP_PADDING;

            var className = "shell-text";
            if (prompt) {
              texts.push(React.createElement(
                "text",
                { key: 'prompt-' + n, x: -V.SHELL_SIDELINE_WIDTH, y: y1, className: "shell-prompt-left unselectable" },
                prompt
              ));
            } else {
              texts.push(React.createElement(
                "text",
                { key: 'prompt-' + n, x: -V.SHELL_SIDELINE_WIDTH / 2, y: y1, className: "shell-prompt-center unselectable muted" },
                "..."
              ));
              className += " muted";
            }
            texts.push(React.createElement(
              "text",
              { key: n, x: V.CELL_WIDTH, y: y1, className: className },
              this.renderTextContent(line)
            ));

            n += 1;
          }
        }

        var _x = -V.SHELL_SIDELINE_WIDTH;
        // let width = this.props.width+V.SHELL_SIDELINE_WIDTH;
        var _height = e.height;

        var areaWidth = 10000; // right to the end of visible space

        // onMouseDown={this.onMouseDown.bind(this)}
        blocks.push(React.createElement(
          "g",
          { key: i },
          React.createElement("rect", { x: _x, y: y, width: areaWidth, height: _height, className: "shell-area" }),
          React.createElement("line", { x1: _x, y1: y + 0.5, x2: _x + areaWidth, y2: y + 0.5, className: "shell-area-border" }),
          React.createElement("line", { x1: _x, y1: _height + y - 0.5, x2: _x + areaWidth, y2: _height + y - 0.5, className: "shell-area-border" }),
          React.createElement(
            "g",
            null,
            texts
          )
        ));
      }

      var x = -V.SHELL_SIDELINE_WIDTH;
      var width = V.SHELL_SIDELINE_WIDTH;
      var height = this.props.tree.maxY * V.CELL_HEIGHT;

      return React.createElement(
        "g",
        null,
        React.createElement("rect", { x: x, y: -V.CELL_HEIGHT / 2, width: width, height: height + V.CELL_HEIGHT, className: "shell-sideline" }),
        React.createElement(
          "g",
          null,
          blocks
        )
      );
    }
  }]);

  return ShellIOView;
}(React.Component);

;

ShellIOView.propTypes = {
  tree: React.PropTypes.object.isRequired,
  width: React.PropTypes.number.isRequired,
  onItemSelect: React.PropTypes.func.isRequired,
  onItemHover: React.PropTypes.func.isRequired,
  selectedItem: React.PropTypes.object,
  hoveredItem: React.PropTypes.object
};

