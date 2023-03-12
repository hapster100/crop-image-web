import { getPadding, listen } from "./utils"

class Box {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  
  constructor(x = 0, y = 0, w = 0, h = 0) {
    this.x = x
    this.y = y
    this.w = w
    this.h = h
  }

  copyWith({x = this.x, y = this.y, w = this.w, h = this.h}) {
    return new Box(x, y, w, h)
  }
}

enum MouseAction {
  CropTop,
  CropBottom,
  CropLeft,
  CropRight,
  Move,
  None
}

interface Point {
  readonly x: number,
  readonly y: number
}

function getPosition(e: Event): Point {
  if (e instanceof MouseEvent) {
    return {
      x: e.clientX,
      y: e.clientY,
    }
  }
  if (e instanceof TouchEvent) {
    return {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    }
  }
  return {
    x: 0,
    y: 0,
  }
}

export class Cropper {


  private root: HTMLElement | null
  private canvas: HTMLCanvasElement
  private img: HTMLImageElement
  private crop: Box

  private imgLoadUnsub: () => void
  private resizeUnsub: () => void
  private mousemoveUnsub: () => void
  private mousedownUnsub: () => void
  private touchstartUnsub: () => void

  constructor() {
    this.root = null
    this.canvas = document.createElement('canvas')
    this.img = new Image()
    this.imgLoadUnsub = listen(this.img, 'load', () => {
      console.log(this.img.width, this.img.height)
      this.crop = new Box(0, 0, 1, 1)
      this.draw()
    })

    let resizeTimeout = 0
    this.resizeUnsub = listen(window, 'resize', () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        this.initCanvas()
        this.draw()
        resizeTimeout = 0
      }, 0)
    })

    this.mousemoveUnsub = listen(this.canvas, 'mousemove', (e: Event) => {
      this.getMouseAction(getPosition(e))
    })

    this.mousedownUnsub = listen(this.canvas, 'mousedown', (e: Event) => {
      const pos = getPosition(e)
      const action = this.getMouseAction(pos)
      this.actionStart(pos, action)
    })

    this.touchstartUnsub = listen(this.canvas, 'touchstart', (e: Event) => {
      const pos = getPosition(e)
      const action = this.getMouseAction(pos)
      this.actionStart(pos, action)
    })

    this.crop = new Box(0, 0, 1, 1)
  }

  attach(root: HTMLElement) {
    if (this.root) {
      this.unattach()
    }
    this.root = root
    this.initCanvas()
    this.root.appendChild(this.canvas)
  }

  unattach() {
    this.imgLoadUnsub()
    this.resizeUnsub()
    this.mousemoveUnsub()
    this.mousedownUnsub()
    this.touchstartUnsub()
    this.root?.removeChild(this.canvas)
  }

  private makeAction(
    p: Point, action: MouseAction,
    startX: number, startY: number, startCrop: Box
  ) {
    const imgb = this.getImageBoundary()
    const x = (p.x - this.canvas.offsetLeft - imgb.x) / imgb.w
    const y = (p.y - this.canvas.offsetTop - imgb.y) / imgb.h
    switch(action) {
      case MouseAction.CropBottom:
        this.crop = this.crop.copyWith({
          h: Math.min(1 - this.crop.y, Math.max(0, y - this.crop.y))
        })
        break
      case MouseAction.CropTop:
        const newy = Math.max(0, Math.min(this.crop.h + this.crop.y, y))
        this.crop = this.crop.copyWith({
          y: newy,
          h: this.crop.h + this.crop.y - newy
        })
        break
      case MouseAction.CropRight:
        this.crop = this.crop.copyWith({
          w: Math.min(1 - this.crop.x, Math.max(0, x - this.crop.x))
        })
        break
      case MouseAction.CropLeft:
        const newx = Math.max(0, Math.min(this.crop.w + this.crop.x, x))
        this.crop = this.crop.copyWith({
          x: newx,
          w: this.crop.w + this.crop.x - newx
        })
        break
      case MouseAction.Move:
        this.crop = new Box(
          Math.min(1 - startCrop.w, Math.max(0, x - startX + startCrop.x)),
          Math.min(1 - startCrop.h, Math.max(0, y - startY + startCrop.y)),
          startCrop.w,
          startCrop.h
        )
        break
    }
    this.draw()
  }

  private actionStart(p: Point, action: MouseAction) {
    if (action !== MouseAction.None) {
      const imgb = this.getImageBoundary()
      const startX = (p.x - this.canvas.offsetLeft - imgb.x) / imgb.w
      const startY = (p.y - this.canvas.offsetTop - imgb.y) / imgb.h
      const startCrop = this.crop
      
      let unsubMouseMove = () => {}
      let unsubTouchMove = () => {}
      let unsubMouseUp = () => {}
      let unsubTouchEnd = () => {}

      const handle = (e: Event) => {
        this.makeAction(
          getPosition(e), action, 
          startX, startY, startCrop
        )
      }

      const unsub = () => {
        unsubMouseMove()
        unsubTouchMove()
        unsubMouseUp()
        unsubTouchEnd()
      }

      unsubMouseMove = listen(this.canvas, 'mousemove', handle)
      unsubTouchMove = listen(this.canvas, 'touchmove', handle)
      unsubMouseUp = listen(window, 'mouseup', unsub)
      unsubTouchEnd = listen(window, 'touchend', unsub)
    }
      
  }

  private getMouseAction(p: Point) {
    this.canvas.style.removeProperty('cursor')
    const imgb = this.getImageBoundary()
    const mx = p.x - this.canvas.offsetLeft - imgb.x
    const my = p.y - this.canvas.offsetTop - imgb.y
    const {x, y, h, w} = this.crop

    const inCropX = mx > x * imgb.w && mx < (x + w) * imgb.w
    const inCropY = my > y * imgb.h && my < (y + h) * imgb.h
    
    if (inCropX && Math.abs(my - y * imgb.h) < 20) {
      if (h * imgb.h < 20 && y * imgb.h < 20) {
        this.canvas.style.setProperty('cursor', 'n-resize')
        return MouseAction.CropBottom      
      }
      this.canvas.style.setProperty('cursor', 's-resize')
      return MouseAction.CropTop
    } else if (inCropX && Math.abs(my - (h + y) * imgb.h) < 20) {
      this.canvas.style.setProperty('cursor', 'n-resize')
      return MouseAction.CropBottom
    } else if (inCropY && Math.abs(mx - x * imgb.w) < 20) {
      if (w * imgb.w < 20 && x * imgb.w < 20) {
        this.canvas.style.setProperty('cursor', 'w-resize')
        return MouseAction.CropRight  
      }
      this.canvas.style.setProperty('cursor', 'e-resize')
      return MouseAction.CropLeft
    } else if (inCropY && Math.abs(mx - (w + x) * imgb.w) < 20) {
      this.canvas.style.setProperty('cursor', 'w-resize')
      return MouseAction.CropRight
    } else if (inCropX && inCropY) {
      return MouseAction.Move
    }

    return MouseAction.None
  }

  private initCanvas() {
    if (this.root) {
      const padding = getPadding(this.root)
      this.canvas.height = this.root.clientHeight - padding.top - padding.bottom
      this.canvas.width = this.root.clientWidth - padding.right - padding.left
      this.clear()
    }
  }

  private get ctx(): CanvasRenderingContext2D | null {
    return this.canvas?.getContext('2d') || null
  }

  private clear() {
    if (this.ctx) {
      const { width, height } = this.ctx.canvas
      this.ctx.clearRect(0, 0, width, height)
    }
  }

  private getImageBoundary(): Box {
    if (this.ctx) {
      let k = Math.min(
        this.canvas.width / this.img.width,
        this.canvas.height / this.img.height  
      )
      let w = this.img.width * k
      let h = this.img.height * k
      
      let dx = (this.canvas.width - w) / 2
      let dy = (this.canvas.height - h) / 2



      return new Box(dx, dy, w, h)
    }
    return new Box(0, 0, 0, 0)
  }

  private drawImage() {
    if (this.ctx) {
      const imgBoundary = this.getImageBoundary()
      this.ctx.drawImage(
        this.img,
        0, 0, this.img.width, this.img.height, 
        imgBoundary.x, imgBoundary.y, imgBoundary.w, imgBoundary.h,
      )
    }
  }

  private drawCrop() {
    if (this.ctx) {
      const imgb = this.getImageBoundary()
      const LINE_WIDTH = 4
      this.ctx.save()
      this.ctx.fillStyle = '#000a'
      this.ctx.lineWidth = LINE_WIDTH
      this.ctx.strokeStyle = '#AAF'
      this.ctx.lineCap = 'round'
      const { x, y, w, h} = this.crop
      const cropRects = [
        [    0,     0,         x,         1],
        [    x,     0,         w,         y],
        [x + w,     0, 1 - x - w,         1],
        [    x, y + h,         w, 1 - y - h]
      ]
      const cropLines = [
        [
          imgb.x + imgb.w * x + LINE_WIDTH / 2,
          imgb.y + imgb.h * y + LINE_WIDTH / 2,
          imgb.w * w - LINE_WIDTH, 0
        ],
        [
          imgb.x + imgb.w * x + LINE_WIDTH / 2,
          imgb.y + imgb.h * y + LINE_WIDTH / 2,
          0, imgb.h * h - LINE_WIDTH
        ],
        [
          imgb.x + imgb.w * (x + w) - LINE_WIDTH / 2,
          imgb.y + imgb.h * (y + h) - LINE_WIDTH / 2,
          LINE_WIDTH - imgb.w * w, 0
        ],
        [
          imgb.x + imgb.w * (x + w) - LINE_WIDTH / 2,
          imgb.y + imgb.h * (y + h) - LINE_WIDTH / 2,
          0, LINE_WIDTH - imgb.h * h
        ]

      ]

      for(const [x, y, dx, dy] of cropLines) {
        this.ctx.beginPath()
        this.ctx.moveTo(x, y)
        this.ctx.lineTo(x + dx, y + dy)
        this.ctx.stroke()
        this.ctx.closePath()
      }
      for(const [x, y, w, h] of cropRects) {
        this.ctx.fillRect(
          imgb.x + x * imgb.w, imgb.y + y * imgb.h,
          imgb.w * w, imgb.h * h
        )
      }
      this.ctx.restore()
    }
  }

  getImageDataURL() {
    const cropCanvas = document.createElement('canvas')
    cropCanvas.height = this.img.height * this.crop.h
    cropCanvas.width  = this.img.width * this.crop.w
    cropCanvas.getContext('2d')?.drawImage(
      this.img,
      this.img.width * this.crop.x,
      this.img.height * this.crop.y,
      this.img.width * this.crop.w,
      this.img.height * this.crop.h,
      0, 0, cropCanvas.width, cropCanvas.height,
    )
    return cropCanvas.toDataURL()
  }
  
  makeCrop() {
    this.img.src = this.getImageDataURL()
    return this.img.src
  }

  private draw() {
    this.clear()
    this.drawImage()
    this.drawCrop()
  }

  async loadImageUrl(url: string) {
    this.img.src = url
  }
}
