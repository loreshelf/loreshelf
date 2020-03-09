/* eslint-disable react/prop-types */
import React, { ReactDOM } from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { defaultMarkdownSerializer } from 'prosemirror-markdown';
import 'prosemirror-view/style/prosemirror.css';
import './Editor.css';
import MenuBar from './MenuBar';
import menu from './menu';
import plugins from './plugins';

class Editor extends React.Component {
  constructor(props) {
    super(props);

    this.editorRef = React.createRef();
    const { attributes, nodeViews, doc } = this.props;

    this.view = new EditorView(null, {
      state: EditorState.create({
        doc,
        plugins
      }),
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

    this.state = { top: '-999px' };
    // console.log(this.view.state.doc);
  }

  componentDidMount() {
    this.editorRef.current.insertBefore(
      this.view.dom,
      this.editorRef.current.firstChild
    );
    const { autoFocus } = this.props;

    if (autoFocus) {
      this.view.focus();
    }

    // eslint-disable-next-line react/no-find-dom-node
    const rect = this.editorRef.current.getBoundingClientRect();
    const top = `${rect.y - 25}px`;
    this.setState({ top });
  }

  componentDidUpdate() {
    const { doc } = this.props;
    if (this.view.state.doc !== doc) {
      this.view.updateState(
        EditorState.create({
          doc,
          plugins
        })
      );
      this.forceUpdate();
    }
  }

  get content() {
    return defaultMarkdownSerializer.serialize(this.view.state.doc);
  }

  render() {
    const { top } = this.state;
    return (
      <div ref={this.editorRef}>
        <MenuBar menu={menu} view={this.view} top={top} />
      </div>
    );
  }
}

export default Editor;
