/* eslint-disable react/prop-types */
import React from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import 'prosemirror-view/style/prosemirror.css';
import './Editor.css';
import MenuBar from './MenuBar';
import { options, menu } from './index';

class Editor extends React.Component {
  constructor(props) {
    super(props);

    this.editorRef = React.createRef();
    const { attributes, nodeViews } = this.props;

    this.view = new EditorView(null, {
      state: EditorState.create(props.options),
      dispatchTransaction: transaction => {
        const { state, transactions } = this.view.state.applyTransaction(
          transaction
        );

        this.view.updateState(state);

        if (transactions.some(tr => tr.docChanged)) {
          const { onChange } = this.props;
          onChange(state.doc);
        }

        this.forceUpdate();
      },
      attributes,
      nodeViews
    });
  }

  componentDidMount() {
    this.editorRef.current.insertBefore(
      this.view.dom,
      this.editorRef.current.firstChild
    );
    const autoFocus = this.props;

    if (autoFocus) {
      this.view.focus();
    }
  }

  render() {
    return (
      <div ref={this.editorRef}>
        <MenuBar menu={menu} view={this.view} />
      </div>
    );
  }
}

export default Editor;
