"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var SvgView = function (_React$Component) {
  _inherits(SvgView, _React$Component);

  function SvgView(props) {
    _classCallCheck(this, SvgView);

    var _this = _possibleConstructorReturn(this, (SvgView.__proto__ || Object.getPrototypeOf(SvgView)).call(this));

    _this.state = {
      areaCursor: null

      // Commented out code that was handling dragging and scrolling inside <svg>
      //
      // // global position of the whole figure
      // posX: props.padding,
      // posY: props.padding
    };
    return _this;
  }

  // Commented out code that was handling dragging and scrolling inside <svg>
  //
  // onMouseDown(e) {
  //   this.startDragging(e);
  // }
  // 
  // onMouseMove(e) {
  //   this._lastMousePosX = e.clientX;
  //   this._lastMousePosY = e.clientY;
  // 
  //   this.moveDragging(e);
  // }
  // 
  // onMouseUp() {
  //   this.stopDragging();
  // }
  // 
  // onMouseLeave() {
  //   this.stopDragging();
  // }
  // 
  // onWheel(e) {
  //   let x = this.state.posX;
  //   let y = this.state.posY - e.deltaY;
  //   let t = this.sanitizeXY(x, y);
  //   this.setState({posY: t.y});
  // }
  // 
  // startDragging(e) {
  //   this._isDragging = true;
  //   this._dragStartX = e.clientX;
  //   this._dragStartY = e.clientY;
  //   this.setState({areaCursor: 'move'});
  // }
  // 
  // moveDragging(e) {
  //   if (!this._isDragging) return;
  //   if (this._posMoveAnimationRequest) return;
  // 
  //   // calculating difference from dragging start position, add to initial
  //   var x = this.state.posX + (e.clientX - this._dragStartX);
  //   var y = this.state.posY + (e.clientY - this._dragStartY);
  // 
  //   this.setPosition(x,y);
  // }
  // 
  // // do not allow to move out of padded space
  // sanitizeXY(x,y) {
  //   var viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  //   var viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
  // 
  //   if ((viewportWidth+(-x)) > (this.props.paddedWidth + this.props.padding)) {
  //     x = -(this.props.paddedWidth-viewportWidth+this.props.padding);
  //   }
  //   if (x > this.props.padding) { x = this.props.padding; }
  // 
  //   if ((viewportHeight+(-y)) > (this.props.paddedHeight + this.props.padding)) {
  //     y = -(this.props.paddedHeight-viewportHeight+this.props.padding);
  //   }
  //   if (y > this.props.padding) { y = this.props.padding; }
  // 
  //   return {x: x, y: y};
  // }
  // 
  // setPosition(x,y) {
  //   let t = this.sanitizeXY(x, y);
  //   x = t.x;
  //   y = t.y;
  // 
  //   if (x == this._dragX && y == this._dragY) return;
  // 
  //   this._posMoveAnimationRequest = window.requestAnimationFrame((function () {
  //     // explicitly setting svg figure offset
  //     this.refs.posBase.transform.baseVal.getItem(0).setTranslate(x,y);
  //     this.refs.vposBase.transform.baseVal.getItem(0).setTranslate(0,y);
  //     this._dragX = x;
  //     this._dragY = y;
  // 
  //     this._posMoveAnimationRequest = undefined;
  //   }).bind(this))
  // }
  // 
  // stopDragging() {
  //   this._isDragging = false;
  //   if (this._dragX && this._dragY) {
  //     this.setState({posX: this._dragX, posY: this._dragY});
  //     this._dragX = null;
  //     this._dragY = null;
  //   }
  //   this.setState({areaCursor: null});
  // }

  _createClass(SvgView, [{
    key: "render",
    value: function render() {
      var verticallyMovingChildren = [];
      var allMovingChildren = [];

      React.Children.forEach(this.props.children, function (child) {
        if (child.props.moveOnlyVertically) {
          verticallyMovingChildren.push(child);
        } else {
          allMovingChildren.push(child);
        }
      });

      // Commented out code that was handling dragging and scrolling inside <svg>
      //
      // style={{position: 'fixed', top: 0, left: 0, width:'100%', height: '100%', cursor: this.state.areaCursor}}
      // onWheel={this.onWheel.bind(this)}
      // onMouseMove={this.onMouseMove.bind(this)} onMouseDown={this.onMouseDown.bind(this)}
      // onMouseUp={this.onMouseUp.bind(this)} onMouseLeave={this.onMouseLeave.bind(this)}

      return React.createElement(
        "svg",
        { ref: "svg", className: this.props.className,
          width: this.props.paddedWidth + this.props.padding * 2, height: this.props.paddedHeight + this.props.padding * 2 },
        React.createElement(
          "defs",
          null,
          React.createElement(
            "marker",
            { id: "markerSendStart", markerWidth: "8", markerHeight: "8", refX: "5", refY: "5" },
            React.createElement("circle", { cx: "5", cy: "5", r: "2", className: "marker-send-start" })
          ),
          React.createElement(
            "marker",
            { id: "markerSendEnd", markerWidth: "11", markerHeight: "11", refX: "6", refY: "4.5", orient: "auto" },
            React.createElement("path", { d: "M0,2 L0,7 L6,4 L0,2", className: "marker-send-end" })
          ),
          React.createElement(
            "marker",
            { id: "muted-markerSendStart", markerWidth: "8", markerHeight: "8", refX: "5", refY: "5" },
            React.createElement("circle", { cx: "5", cy: "5", r: "2", className: "muted marker-send-start" })
          ),
          React.createElement(
            "marker",
            { id: "muted-markerSendEnd", markerWidth: "11", markerHeight: "11", refX: "6", refY: "4.5", orient: "auto" },
            React.createElement("path", { d: "M0,2 L0,7 L6,4 L0,2", className: "muted marker-send-end" })
          )
        ),
        React.createElement(
          "g",
          { ref: "vposBase", transform: "translate(" + this.props.padding + "," + this.props.padding + ")" },
          verticallyMovingChildren
        ),
        React.createElement(
          "g",
          { ref: "posBase", transform: "translate(" + this.props.padding + "," + this.props.padding + ")" },
          allMovingChildren
        )
      );
    }
  }]);

  return SvgView;
}(React.Component);

SvgView.propTypes = {
  className: React.PropTypes.string,
  padding: React.PropTypes.number.isRequired,
  paddedWidth: React.PropTypes.number.isRequired,
  paddedHeight: React.PropTypes.number.isRequired
};

