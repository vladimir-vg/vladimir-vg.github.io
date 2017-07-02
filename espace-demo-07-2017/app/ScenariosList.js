"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ScenariosList = function (_React$Component) {
  _inherits(ScenariosList, _React$Component);

  function ScenariosList() {
    _classCallCheck(this, ScenariosList);

    return _possibleConstructorReturn(this, (ScenariosList.__proto__ || Object.getPrototypeOf(ScenariosList)).apply(this, arguments));
  }

  _createClass(ScenariosList, [{
    key: "forceReload",


    // currently router is not used yet
    // force reload after location hash change
    // quick and dirty
    value: function forceReload() {
      window.location.reload();
    }
  }, {
    key: "renderScenarioBlock",
    value: function renderScenarioBlock(block) {
      var items = [];
      for (var i in block.items) {
        var path = "/espace-demo-07-2017/#/" + block.dir + "/" + block.items[i];
        items.push(React.createElement(
          "div",
          { key: block.items[i] },
          React.createElement(
            "a",
            { href: path, onClick: this.forceReload.bind(this), className: "item" },
            block.items[i]
          )
        ));
      }

      return React.createElement(
        "div",
        { key: block.dir, className: "scenarios-list-block" },
        React.createElement(
          "h1",
          null,
          block.dir
        ),
        React.createElement(
          "div",
          null,
          items
        )
      );
    }
  }, {
    key: "render",
    value: function render() {
      var blocks = [];
      for (var i in this.props.scenarios) {
        blocks.push(this.renderScenarioBlock(this.props.scenarios[i]));
      }

      return React.createElement(
        "div",
        null,
        blocks
      );
    }
  }]);

  return ScenariosList;
}(React.Component);

;

ScenariosList.propTypes = {
  scenarios: React.PropTypes.array.isRequired
};

