import { Cropper } from './Cropper'
import './style.css'

const cropper = new Cropper()

const root = document.getElementById('app')

const cropperRoot = document.createElement('div')
cropperRoot.classList.add('cropper')

const imgInputWrapper = document.createElement('div')
imgInputWrapper.classList.add('img-input')
imgInputWrapper.classList.add('btn')
const imgInputText = document.createElement('span')
imgInputText.classList.add('img-input__text')
imgInputText.innerText = 'LOAD'
const imgInput = document.createElement('input')
imgInput.classList.add('img-input__input')
imgInput.setAttribute('type', 'file')
imgInput.setAttribute('accept', 'image/*')
imgInput.addEventListener('change', () => {
  const imgFile = imgInput.files?.item(0)
  if (imgFile) {
    const reader = new FileReader()
    reader.readAsDataURL(imgFile)
    reader.onload = function() {
      const result = reader.result?.toString()
      if (result) {
        cropper.loadImageUrl(result)
      }
    }
  }
})
imgInputWrapper.appendChild(imgInput)
imgInputWrapper.appendChild(imgInputText)

const cropBtn = document.createElement('button')
cropBtn.classList.add('btn')
cropBtn.innerHTML = 'CROP'
cropBtn.addEventListener('click', function() {
  cropper.makeCrop()
})

const saveBtn = document.createElement('button')
saveBtn.classList.add('btn')
saveBtn.innerHTML = 'SAVE'
saveBtn.addEventListener('click', function() {
  const a = document.createElement('a')
  a.download = 'cropped.png'
  a.href = cropper.getImageDataURL()
  a.click()
})

const buttons = document.createElement('div')
buttons.classList.add('controls')
buttons.appendChild(imgInputWrapper)
buttons.appendChild(cropBtn)
buttons.appendChild(saveBtn)

root?.appendChild(cropperRoot)
root?.appendChild(buttons)

cropper.attach(cropperRoot)