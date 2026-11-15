/** Prevent menu/panel events from bubbling into canvas selection or zoom. */
export const stopEvent = (evt: Event) => {
  evt.stopPropagation()
}

/** Stop bubbling to prevent canvas zoom while retaining native panel scrolling. */
export const stopWheel = (evt: Event) => {
  evt.stopPropagation()
}
