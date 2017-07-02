'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var OFFER_TO_RESTART_AFTER = 3000;

var ErlFileInput = function (_React$Component) {
  _inherits(ErlFileInput, _React$Component);

  function ErlFileInput() {
    _classCallCheck(this, ErlFileInput);

    return _possibleConstructorReturn(this, (ErlFileInput.__proto__ || Object.getPrototypeOf(ErlFileInput)).apply(this, arguments));
  }

  _createClass(ErlFileInput, [{
    key: 'onChange',
    value: function onChange() {
      var _this2 = this;

      var hash = window.location.hash;

      if (hash.slice(0, 2) != '#/') {
        console.error("expected to have scenario hash address");
        return;
      }

      var url = '/scenarios/' + hash.slice(2) + "/erlmodules";
      fetch(url, {
        method: 'POST',
        body: new FormData(this.refs.form)
      }).then(function () {
        _this2.refs.form.reset();
      }).catch(function (error) {
        _this2.refs.form.reset();
      });
    }
  }, {
    key: 'render',
    value: function render() {
      return React.createElement(
        'form',
        { ref: 'form', className: 'notice-text' },
        'upload *.erl module: ',
        React.createElement('input', { type: 'file', name: 'modules', accept: '.erl', multiple: true, onChange: this.onChange.bind(this) })
      );
    }
  }]);

  return ErlFileInput;
}(React.Component);

var InputPanel = function (_React$Component2) {
  _inherits(InputPanel, _React$Component2);

  function InputPanel() {
    _classCallCheck(this, InputPanel);

    var _this3 = _possibleConstructorReturn(this, (InputPanel.__proto__ || Object.getPrototypeOf(InputPanel)).call(this));

    _this3.state = {
      text: "",
      showRestartButton: false,
      restartRequested: false,
      moduleName: null
    };
    return _this3;
  }

  _createClass(InputPanel, [{
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(props) {
      if (props.tree.currentPrompt != this.props.tree.currentPrompt) {
        // unlock restart request after prompt became alive again
        this.setState({ restartRequested: false, showRestartButton: false, moduleName: null, text: "" });
      }
    }
  }, {
    key: 'showRestartButton',
    value: function showRestartButton() {
      if (this._showRequestRestartTimeout) clearTimeout(this._showRequestRestartTimeout);
      this._showRequestRestartTimeout = null;

      // if shell is already alive, then just ignore this
      if (this.props.tree.currentPrompt) return;

      this.setState({ showRestartButton: true });
    }
  }, {
    key: 'requestRestart',
    value: function requestRestart() {
      this.props.requestRestart();
      this.setState({ restartRequested: true });
    }
  }, {
    key: 'onTextChange',
    value: function onTextChange(e) {
      var text = e.target.value;
      var match = /-module\(([a-zA-Z-0-9_]+)\)/.exec(text);
      var moduleName = false;
      if (match && match[1]) {
        moduleName = match[1];
      }
      this.setState({ text: e.target.value, moduleName: moduleName });
    }
  }, {
    key: 'sendToShell',
    value: function sendToShell() {
      if (this._showRequestRestartTimeout) clearTimeout(this._showRequestRestartTimeout);
      this._showRequestRestartTimeout = setTimeout(this.showRestartButton.bind(this), OFFER_TO_RESTART_AFTER);

      if (this.state.moduleName) {
        this.props.storeModule(this.state.moduleName, this.state.text);
        this.setState({ text: "", moduleName: null });
      } else {
        this.props.submitInput(this.state.text);
        this.setState({ text: "" });
      }
    }
  }, {
    key: 'onKeyPress',
    value: function onKeyPress(e) {
      // plain Enter makes new line
      // Shift + Enter sends input to remote shell
      if (e.key === 'Enter' && e.shiftKey && this.state.text) {
        this.sendToShell();
      }
    }
  }, {
    key: 'render',
    value: function render() {
      var prompt = "...";
      var inputDisabled = true;
      var promptStyle = {
        width: V.SHELL_SIDELINE_WIDTH,
        marginLeft: V.WORKSPACE_PADDING - V.SHELL_SIDELINE_WIDTH,
        textAlign: 'center'
      };
      if (this.props.tree.currentPrompt) {
        prompt = this.props.tree.currentPrompt;
        inputDisabled = null;
        delete promptStyle.textAlign;
      }

      var buttonSendText = "send to shell";
      var moduleBlock = null;
      if (this.state.moduleName) {
        moduleBlock = React.createElement(
          'div',
          { className: 'notice-text' },
          'will be sent as: ',
          React.createElement(
            'strong',
            null,
            this.state.moduleName,
            '.erl'
          )
        );
        buttonSendText = "store erlang module";
      } else {
        moduleBlock = React.createElement(ErlFileInput, null);
      }

      var content = React.createElement(
        'div',
        null,
        React.createElement('textarea', { rows: '3', disabled: inputDisabled, value: this.state.text,
          onChange: this.onTextChange.bind(this), onKeyPress: this.onKeyPress.bind(this) }),
        moduleBlock
      );

      if (this.state.showRestartButton) {
        var button = React.createElement(
          'button',
          { onClick: this.requestRestart.bind(this), disabled: this.state.restartRequested },
          'restart'
        );
        content = React.createElement(
          'div',
          { className: 'notice-text' },
          'You can ',
          button,
          ' shell if execution takes too long'
        );
      }

      return React.createElement(
        'div',
        { className: 'input-panel' },
        React.createElement(
          'div',
          { style: promptStyle, className: 'prompt' },
          prompt
        ),
        React.createElement(
          'div',
          { className: 'input' },
          content
        ),
        React.createElement(
          'div',
          { className: 'info notice-text' },
          'use Enter to make a new line ',
          React.createElement('br', null),
          'and Shift + Enter to send input to remote shell ',
          React.createElement('br', null),
          React.createElement(
            'button',
            { onClick: this.sendToShell.bind(this), disabled: inputDisabled },
            buttonSendText
          )
        )
      );
    }
  }]);

  return InputPanel;
}(React.Component);

;

InputPanel.propTypes = {
  tree: React.PropTypes.object.isRequired,
  submitInput: React.PropTypes.func.isRequired,
  storeModule: React.PropTypes.func.isRequired,
  requestRestart: React.PropTypes.func.isRequired
};

