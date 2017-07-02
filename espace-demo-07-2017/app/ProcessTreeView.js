"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

V.CELL_HEIGHT = 10;
V.CELL_WIDTH = 7;
V.CELL_GUTTER = 6;

V.PROC_BAD_REASON_HEIGHT = 3;

var ProcessTreeView = function (_React$Component) {
  _inherits(ProcessTreeView, _React$Component);

  function ProcessTreeView() {
    _classCallCheck(this, ProcessTreeView);

    return _possibleConstructorReturn(this, (ProcessTreeView.__proto__ || Object.getPrototypeOf(ProcessTreeView)).apply(this, arguments));
  }

  _createClass(ProcessTreeView, [{
    key: "componentDidMount",
    value: function componentDidMount() {
      console.log(this.props.tree);
    }
  }, {
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
    key: "renderSpawnLine",
    value: function renderSpawnLine(x, y, proc) {
      var spawnLine = null;
      if (proc.parent in this.props.tree.procs) {
        var parentProc = this.props.tree.procs[proc.parent];
        var x1 = (parentProc.x + 1) * (V.CELL_WIDTH + V.CELL_GUTTER);
        var x2 = x + V.CELL_WIDTH;
        var dashArray = "" + V.CELL_GUTTER + "," + V.CELL_WIDTH;
        return React.createElement(
          "g",
          null,
          React.createElement("line", { x1: x1 - 0.5, y1: y + 0.5, x2: x1 - 0.5, y2: y - V.CELL_WIDTH / 2 + 0.5, className: "spawn-line" }),
          React.createElement("line", { x1: x1, y1: y + 0.5, x2: x2, y2: y + 0.5, className: "spawn-line", style: { strokeDasharray: dashArray } }),
          React.createElement("line", { x1: x, y1: y + 0.5, x2: x2, y2: y + 0.5, className: "spawn-line" }),
          React.createElement("line", { x1: x2 - 0.5, y1: y + 0.5, x2: x2 - 0.5, y2: y + V.CELL_WIDTH / 2 + 0.5, className: "spawn-line" })
        );
      }

      return null;
    }
  }, {
    key: "renderProcs",
    value: function renderProcs() {
      var maxY = this.props.tree.maxY;
      var procRects = [];

      for (var pid in this.props.tree.procs) {
        var proc = this.props.tree.procs[pid];

        var x = proc.x * (V.CELL_WIDTH + V.CELL_GUTTER) + V.CELL_GUTTER;
        var y = proc.startedY * V.CELL_HEIGHT;
        var width = V.CELL_WIDTH;
        var height = ((proc.stoppedY || maxY) - proc.startedY) * V.CELL_HEIGHT;

        var className = "";
        if (this.props.hoveredItem && this.props.hoveredItem.type == 'proc' && this.props.hoveredItem.key == pid) {
          className += " hovered";
        }

        if (this.props.selectedItem && this.props.selectedItem.type == 'proc' && this.props.selectedItem.key == pid) {
          className += " selected";
        }

        var spawnLine = this.renderSpawnLine(x, y, proc);

        var badReasonRect = null;
        if (proc.reason && proc.reason != 'normal') {
          badReasonRect = React.createElement("rect", { x: x, y: y + height - V.PROC_BAD_REASON_HEIGHT, width: width, height: V.PROC_BAD_REASON_HEIGHT, className: "bad-reason" });
        }

        procRects.push(React.createElement(
          "g",
          { key: pid, className: className },
          React.createElement(
            "g",
            { onClick: this.onItemSelect.bind(this, 'proc', pid),
              onMouseEnter: this.onCellHoverEnter.bind(this, 'proc', proc.pid),
              onMouseLeave: this.onCellHoverLeave.bind(this) },
            React.createElement("rect", { x: x, y: y, width: width, height: height, className: "proc" }),
            badReasonRect
          ),
          spawnLine
        ));
      }

      return procRects;
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
          this.renderProcs()
        )
      );
    }
  }]);

  return ProcessTreeView;
}(React.Component);

;

ProcessTreeView.propTypes = {
  tree: React.PropTypes.object.isRequired,
  onItemSelect: React.PropTypes.func.isRequired,
  onItemHover: React.PropTypes.func.isRequired,
  selectedItem: React.PropTypes.object,
  hoveredItem: React.PropTypes.object
};

