/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import { Alert, Intent, InputGroup } from '@blueprintjs/core';

class PasswordPrompt extends Component {
  constructor(props) {
    super(props);
    this.state = { password: null };
    this.handlePasswordChange = this.handlePasswordChange.bind(this);
  }

  handlePasswordChange(password) {
    this.setState({ password });
  }

  render() {
    const { isOpen, resolve } = this.props;
    return (
      <Alert
        isOpen={isOpen}
        intent={Intent.PRIMARY}
        canEscapeKeyCancel
        confirmButtonText="Unlock workspace"
        icon="cube-add"
        onCancel={() => {
          resolve(null);
        }}
        cancelButtonText="Cancel"
        onConfirm={() => {
          const { password } = this.state;
          this.setState({ password: null });
          resolve(password);
        }}
      >
        <InputGroup
          type="password"
          leftIcon="lock"
          placeholder="Enter password..."
          onChange={e => {
            this.handlePasswordChange(e.target.value);
          }}
        />
      </Alert>
    );
  }
}

export default PasswordPrompt;
