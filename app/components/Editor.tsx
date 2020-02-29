import React from 'react';
import { TextArea, EditableText } from '@blueprintjs/core';

export default function Editor(props) {
  // eslint-disable-next-line react/prop-types
  const { content, onChange } = props;
  return (
    <div style={{ height: '100%', padding: '20px' }}>
      <h1>
        <EditableText maxLength={30} placeholder="Edit title..." />
      </h1>
      <TextArea
        value={content}
        fill
        style={{ resize: 'none', height: 'calc(100% - 80px)' }}
        onChange={onChange}
      />
    </div>
  );
}
