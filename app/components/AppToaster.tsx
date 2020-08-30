import { Position, Toaster } from '@blueprintjs/core';

export const AppToaster = Toaster.create({
  position: Position.BOTTOM
});

export const AppUpdateToaster = Toaster.create({
  position: Position.BOTTOM_RIGHT
});
