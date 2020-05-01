import { Intent } from '@blueprintjs/core';

const MARKDOWN_ICONS = [
  {
    code: '[ ]',
    name: 'none',
    icon: 'circle'
  },
  {
    code: '[x]',
    name: 'yes',
    icon: 'tick-circle',
    intent: Intent.SUCCESS
  },
  {
    code: '[-]',
    name: 'no',
    icon: 'delete',
    intent: Intent.DANGER
  },
  {
    code: '[/]',
    name: 'not',
    icon: 'disable',
    intent: Intent.DANGER
  },
  {
    code: '[?]',
    name: 'question',
    icon: 'help'
  },
  {
    code: '[.]',
    name: 'dot',
    icon: 'selection'
  },
  {
    code: '[+]',
    name: 'pinned',
    icon: 'pin',
    intent: Intent.PRIMARY
  },
  {
    code: '[!]',
    name: 'warning',
    icon: 'warning-sign',
    intent: Intent.WARNING
  },
  {
    code: '[i]',
    name: 'info',
    icon: 'info-sign'
  },
  {
    code: '[*]',
    name: 'star',
    icon: 'star-empty',
    intent: Intent.WARNING
  }
];

export function findMarkdownIcon(icon) {
  for (let i = 0; i < MARKDOWN_ICONS.length; i += 1) {
    const mdi = MARKDOWN_ICONS[i];
    if (mdi.icon === icon) {
      return mdi;
    }
  }
  return null;
}

export default MARKDOWN_ICONS;
