import { Intent } from '@blueprintjs/core';

const MARKDOWN_ICONS = [
  {
    code: '[ ]',
    name: 'none',
    icon: 'circle',
    svg:
      '<svg data-icon="circle" width="16" height="16" viewBox="0 0 16 16" style="fill: hsla(204, 33%, 97%, 1);"><desc>circle</desc><path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" fill-rule="evenodd"></path></svg>'
  },
  {
    code: '[x]',
    name: 'yes',
    icon: 'tick-circle',
    intent: Intent.SUCCESS,
    svg:
      '<svg data-icon="tick-circle" width="16" height="16" viewBox="0 0 16 16" style="fill: #3dcc91;"><desc>tick-circle</desc><path d="M8 16c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm4-11c-.28 0-.53.11-.71.29L7 9.59l-2.29-2.3a1.003 1.003 0 00-1.42 1.42l3 3c.18.18.43.29.71.29s.53-.11.71-.29l5-5A1.003 1.003 0 0012 5z" fill-rule="evenodd"></path></svg>'
  },
  {
    code: '[-]',
    name: 'no',
    icon: 'delete',
    intent: Intent.DANGER,
    svg:
      '<svg data-icon="delete" width="16" height="16" viewBox="0 0 16 16" style="fill: #db3737;"><desc>delete</desc><path d="M11.99 4.99a1.003 1.003 0 00-1.71-.71l-2.29 2.3L5.7 4.29a.965.965 0 00-.71-.3 1.003 1.003 0 00-.71 1.71l2.29 2.29-2.29 2.29A1.003 1.003 0 005.7 11.7l2.29-2.29 2.29 2.29a1.003 1.003 0 001.42-1.42L9.41 7.99 11.7 5.7c.18-.18.29-.43.29-.71zm-4-5c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.68 6-6 6z" fill-rule="evenodd"></path></svg>'
  },
  {
    code: '[/]',
    name: 'not',
    icon: 'disable',
    intent: Intent.DANGER,
    svg:
      '<svg data-icon="disable" width="16" height="16" viewBox="0 0 16 16" style="fill: #db3737;"><desc>disable</desc><path d="M7.99-.01c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm-6 8c0-3.31 2.69-6 6-6 1.3 0 2.49.42 3.47 1.12l-8.35 8.35c-.7-.98-1.12-2.17-1.12-3.47zm6 6c-1.3 0-2.49-.42-3.47-1.12l8.35-8.35c.7.98 1.12 2.17 1.12 3.47 0 3.32-2.68 6-6 6z" fill-rule="evenodd"></path></svg>'
  },
  {
    code: '[?]',
    name: 'question',
    icon: 'help',
    svg:
      '<svg data-icon="help" width="16" height="16" viewBox="0 0 16 16" style="fill: hsla(204, 33%, 97%, 1);"><desc>help</desc><path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm1 13H7v-2h2v2zm1.93-6.52c-.14.32-.35.64-.62.97L9.25 8.83c-.12.15-.24.29-.28.42-.04.13-.09.3-.09.52V10H7.12V8.88s.05-.51.21-.71L8.4 6.73c.22-.26.35-.49.44-.68.09-.19.12-.38.12-.58 0-.3-.1-.55-.28-.75-.18-.19-.44-.28-.76-.28-.33 0-.59.1-.78.29-.19.19-.33.46-.4.81-.03.11-.1.15-.2.14l-1.7-.25c-.12-.01-.16-.08-.14-.19.12-.82.46-1.47 1.03-1.94.57-.48 1.32-.72 2.25-.72.47 0 .9.07 1.29.22s.72.34 1 .59c.28.25.49.55.65.89.15.35.22.72.22 1.12s-.07.75-.21 1.08z" fill-rule="evenodd"></path></svg>'
  },
  {
    code: '[.]',
    name: 'dot',
    icon: 'selection',
    svg:
      '<svg data-icon="selection" width="16" height="16" viewBox="0 0 16 16" style="fill: hsla(204, 33%, 97%, 1);"><desc>selection</desc><path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-9C6.34 5 5 6.34 5 8s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill-rule="evenodd"></path></svg>'
  },
  {
    code: '[+]',
    name: 'pin',
    icon: 'pin',
    intent: Intent.PRIMARY,
    svg:
      '<svg data-icon="pin" width="16" height="16" viewBox="0 0 16 16" style="fill: #0081C9;"><desc>pin</desc><path d="M9.41.92c-.51.51-.41 1.5.15 2.56L4.34 7.54C2.8 6.48 1.45 6.05.92 6.58l3.54 3.54-3.54 4.95 4.95-3.54 3.54 3.54c.53-.53.1-1.88-.96-3.42l4.06-5.22c1.06.56 2.04.66 2.55.15L9.41.92z" fill-rule="evenodd"></path></svg>'
  },
  {
    code: '[!]',
    name: 'warning',
    icon: 'warning-sign',
    intent: Intent.WARNING,
    svg:
      '<svg data-icon="warning-sign" width="16" height="16" viewBox="0 0 16 16" style="fill: #ffb366;"><desc>warning-sign</desc><path d="M15.84 13.5l.01-.01-7-12-.01.01c-.17-.3-.48-.5-.85-.5s-.67.2-.85.5l-.01-.01-7 12 .01.01c-.09.15-.15.31-.15.5 0 .55.45 1 1 1h14c.55 0 1-.45 1-1 0-.19-.06-.35-.15-.5zm-6.85-.51h-2v-2h2v2zm0-3h-2v-5h2v5z" fill-rule="evenodd"></path></svg>'
  },
  {
    code: '[i]',
    name: 'info',
    icon: 'info-sign',
    svg:
      '<svg data-icon="info-sign" width="16" height="16" viewBox="0 0 16 16" style="fill: hsla(204, 33%, 97%, 1);"><desc>info-sign</desc><path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zM7 3h2v2H7V3zm3 10H6v-1h1V7H6V6h3v6h1v1z" fill-rule="evenodd"></path></svg>'
  },
  {
    code: '[*]',
    name: 'star',
    icon: 'star-empty',
    intent: Intent.WARNING,
    svg:
      '<svg data-icon="star-empty" width="16" height="16" viewBox="0 0 16 16" style="fill: #ffb366;"><desc>star-empty</desc><path d="M16 6.11l-5.53-.84L8 0 5.53 5.27 0 6.11l4 4.1L3.06 16 8 13.27 12.94 16 12 10.21l4-4.1zM4.91 13.2l.59-3.62L3 7.02l3.45-.53L8 3.2l1.55 3.29 3.45.53-2.5 2.56.59 3.62L8 11.49 4.91 13.2z" fill-rule="evenodd"></path></svg>'
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
