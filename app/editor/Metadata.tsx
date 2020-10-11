class Metadata {
  static myInstance = null;

  constructor() {
    this.storage = new Map();
  }

  /**
   * @returns {CommonDataManager}
   */
  static getInstance() {
    if (Metadata.myInstance == null) {
      Metadata.myInstance = new Metadata();
    }

    return this.myInstance;
  }

  set(key, value) {
    this.storage.set(key.trim(), value.trim());
  }

  get(key) {
    return this.storage.get(key);
  }

  getStorage() {
    return this.storage;
  }

  parse(metadata) {
    `${metadata}`.split('\n').forEach(property => {
      const parts = property.split('=');
      if (parts.length === 2) {
        this.set(parts[0], parts[1]);
      }
    });
  }

  // eslint-disable-next-line class-methods-use-this
  transformToTable(metadata) {
    let table = '| Metadata-key | Metadata-value |\n| --- | --- |';
    `${metadata}`.split('\n').forEach(property => {
      const parts = property.split('=');
      if (parts.length >= 2) {
        table += `\n| ${parts[0]} | ${parts[1]}`;
        for (let i = 2; i < parts.length; i += 1) {
          table += `=${parts[i]}`;
        }
        table += ' |';
      }
    });
    return table;
  }

  // eslint-disable-next-line class-methods-use-this
  transformFromTable(metadata) {
    let table = '| Metadata-key | Metadata-value |\n| --- | --- |';
    `${metadata}`.split('\n').forEach(property => {
      const parts = property.split('=');
      if (parts.length === 2) {
        table += `\n| ${parts[0]} | ${parts[1]} |`;
      }
    });
    return table;
  }
}

export default Metadata;
