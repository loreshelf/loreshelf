/* eslint-disable import/prefer-default-export */

export function timeSince(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  let interval = Math.floor(seconds / 31536000);

  if (interval > 1) {
    return `${interval} years ago`;
  }
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) {
    return `${interval} months ago`;
  }
  interval = Math.floor(seconds / 86400);
  if (interval > 1) {
    return `${interval} days ago`;
  }
  interval = Math.floor(seconds / 3600);
  if (interval > 1) {
    return `${interval} hours ago`;
  }
  interval = Math.floor(seconds / 60);
  if (interval > 1) {
    return `${interval} minutes ago`;
  }
  return `${Math.floor(seconds)} seconds ago`;
}

export function getMeta(htmlDoc, metaName) {
  const metas = htmlDoc.getElementsByTagName('meta');

  for (let i = 0; i < metas.length; i += 1) {
    const name = metas[i].getAttribute('name');
    if (name && name.toUpperCase() === metaName.toUpperCase()) {
      return metas[i].getAttribute('content');
    }
  }

  return '';
}
