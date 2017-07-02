'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var HoverSelection = function (_React$Component) {
  _inherits(HoverSelection, _React$Component);

  function HoverSelection() {
    _classCallCheck(this, HoverSelection);

    return _possibleConstructorReturn(this, (HoverSelection.__proto__ || Object.getPrototypeOf(HoverSelection)).apply(this, arguments));
  }

  _createClass(HoverSelection, [{
    key: 'onItemSelect',
    value: function onItemSelect(type, key) {
      this.props.onItemSelect({ type: type, key: key });
    }
  }, {
    key: 'onCellHoverEnter',
    value: function onCellHoverEnter(type, key) {
      this.props.onItemHover({ type: type, key: key });
    }
  }, {
    key: 'onCellHoverLeave',
    value: function onCellHoverLeave() {
      this.props.onItemHover(null);
    }
  }, {
    key: 'renderHoverSelection',
    value: function renderHoverSelection() {
      var rectWidth = 10000;
      var maxY = this.props.tree.maxY;
      var rects = [];

      for (var pid in this.props.tree.procs) {
        var proc = this.props.tree.procs[pid];

        var x = proc.x * (V.CELL_WIDTH + V.CELL_GUTTER) + V.CELL_GUTTER;
        var y = proc.startedY * V.CELL_HEIGHT;
        var width = V.CELL_WIDTH;
        var height = ((proc.stoppedY || maxY) - proc.startedY) * V.CELL_HEIGHT;

        rects.push(React.createElement('rect', { key: 'start-' + pid,
          x: 0, y: y - V.CELL_HEIGHT / 2, width: rectWidth, height: V.CELL_HEIGHT,
          onMouseEnter: this.onCellHoverEnter.bind(this, 'proc', pid), onMouseLeave: this.onCellHoverLeave.bind(this),
          onClick: this.onItemSelect.bind(this, 'proc', pid), className: 'cell-hover' }));
        rects.push(React.createElement('rect', { key: 'end-' + pid,
          x: 0, y: y + height - V.CELL_HEIGHT / 2, width: rectWidth, height: V.CELL_HEIGHT,
          onMouseEnter: this.onCellHoverEnter.bind(this, 'proc', pid), onMouseLeave: this.onCellHoverLeave.bind(this),
          onClick: this.onItemSelect.bind(this, 'proc', pid), className: 'cell-hover' }));
      }

      for (var i in this.props.tree.sends) {
        var e = this.props.tree.sends[i];
        var _y = e.y * V.CELL_HEIGHT;

        var className = "cell-hover";
        if (this.props.selectedItem && this.props.selectedItem.type == 'send' && this.props.selectedItem.key == i) {
          className += " selected";
        }

        rects.push(React.createElement('rect', { key: 'send-' + e.y + '-' + e.from + '-' + e.to,
          x: -V.CELL_WIDTH, y: _y - V.CELL_HEIGHT / 2, width: rectWidth, height: V.CELL_HEIGHT,
          onMouseEnter: this.onCellHoverEnter.bind(this, 'send', i), onMouseLeave: this.onCellHoverLeave.bind(this),
          onClick: this.onItemSelect.bind(this, 'send', i), className: className }));
      }

      return rects;
    }
  }, {
    key: 'render',
    value: function render() {
      return React.createElement(
        'g',
        null,
        React.createElement(
          'g',
          null,
          this.renderHoverSelection()
        )
      );
    }
  }]);

  return HoverSelection;
}(React.Component);

;

HoverSelection.propTypes = {
  tree: React.PropTypes.object.isRequired,
  onItemSelect: React.PropTypes.func.isRequired,
  onItemHover: React.PropTypes.func.isRequired,
  selectedItem: React.PropTypes.object,
  hoveredItem: React.PropTypes.object
};

