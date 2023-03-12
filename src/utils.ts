interface Padding {
  top: number
  bottom: number
  right: number
  left: number
}

export function getComputedProp(el: HTMLElement, prop: string): string {
  return document.defaultView?.getComputedStyle(el, null)
    .getPropertyValue(prop) || ''
}

function pxtonum(px: string): number {
  return +px.replace('px', '')
}

export function listen<
  ElementT extends HTMLElement | Window,
  EventT extends keyof HTMLElementEventMap
>(
  el: ElementT, event: EventT,
  fn: EventListener, 
) {
  el.addEventListener(event, fn)
  return () => el.removeEventListener(event, fn)
}

export function getPadding(el: HTMLElement) : Padding {
  const top = getComputedProp(el, 'padding-top')
  const bottom = getComputedProp(el, 'padding-bottom')
  const right = getComputedProp(el, 'padding-right')
  const left = getComputedProp(el, 'padding-left')
  return {
    top: pxtonum(top),
    bottom: pxtonum(bottom),
    right: pxtonum(right),
    left: pxtonum(left),
  }
}
