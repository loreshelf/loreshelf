import HTML5Backend from 'react-dnd-html5-backend';

const DragAndDropBackend = (...args) => {
  const instance = new HTML5Backend(...args);

  const listeners = [
    'handleTopDragStart',
    'handleTopDragStartCapture',
    'handleTopDragEndCapture',
    'handleTopDragEnter',
    'handleTopDragEnterCapture',
    'handleTopDragLeaveCapture',
    'handleTopDragOver',
    'handleTopDragOverCapture',
    'handleTopDrop',
    'handleTopDropCapture'
  ];
  listeners.forEach(name => {
    const original = instance[name];
    instance[name] = (e, ...extraArgs) => {
      if (!e.dataTransfer.getData('text/plain')) {
        original(e, ...extraArgs);
      }
    };
  });

  return instance;
};

export default DragAndDropBackend;
