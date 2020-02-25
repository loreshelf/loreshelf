import React from 'react';
import { TextArea, EditableText } from '@blueprintjs/core';

export default function Editor() {
  return (
    <div style={{ height: '100%', padding: '20px' }}>
      <h1>
        <EditableText maxLength={30} placeholder="Edit title..." />
      </h1>
      <TextArea fill style={{ resize: 'none', height: 'calc(100% - 80px)' }} />
    </div>
  );
}
