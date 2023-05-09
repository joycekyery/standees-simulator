import './App.css'
import React, { useEffect } from 'react'
import MagicWand from 'magic-wand-tool'
import openCV from 'react-opencvjs'
function App() {
  useEffect(() => {
    openCV({
      onLoaded: () => console.log('open cv loaded'),
      onFailed: () => console.log('open cv failed to load'),
      version: '4.5.1',
    })
  }, [])

  let colorThreshold = 15
  let blurRadius = 5
  let simplifyTolerant = 0
  let simplifyCount = 30
  let hatchLength = 4
  let hatchOffset = 0

  let imageInfo = {
    width: null,
    height: null,
    context: null,
    tempContext: null,
  }
  let mask = null
  let oldMask = null
  let downPoint = null
  let allowDraw = false
  let addMode = false
  let currentThreshold = colorThreshold
  let cacheInd = null

  document.onkeydown = onKeyDown
  document.onkeyup = onKeyUp
  useEffect(() => {
    showThreshold()
    document.getElementById('blurRadius').value = blurRadius
    setInterval(function () {
      hatchTick()
    }, 300)
  })

  function uploadClick() {
    document.getElementById('file-upload').click()
  }
  function initCanvas(img) {
    var cvs = document.getElementById('resultCanvas')
    cvs.width = img.width
    cvs.height = img.height
    var tempCanvas = document.getElementById('tempCanvas')
    tempCanvas.width = img.width
    tempCanvas.height = img.height
    imageInfo = {
      width: img.width,
      height: img.height,
      context: cvs.getContext('2d', { willReadFrequently: true }),
      tempContext: tempCanvas.getContext('2d', { willReadFrequently: true }),
    }
    mask = null
    cvs.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0)
    imageInfo.data = cvs
      .getContext('2d', { willReadFrequently: true })
      .getImageData(0, 0, imageInfo.width, imageInfo.height)
  }
  function imgChange(inp) {
    if (inp.target.files && inp.target.files[0]) {
      var reader = new FileReader()
      reader.onload = function (e) {
        // var img = document.getElementById('test-picture')
        // img.setAttribute('src', e.target.result)
        var image = document.createElement('img')
        image.alt = 'test'
        image.src = e.target.result
        // image.width=e.target
        // initCanvas(image)
        image.onload = function () {
          initCanvas(image)
        }
        // img.onload = function () {
        //   console.log(img.width)
        //   // initCanvas(img)
        // }
      }
      reader.readAsDataURL(inp.target.files[0])
    }
  }

  function getMousePosition(e) {
    var p = document.getElementById(e.target.id).getBoundingClientRect()
    var x = Math.round((e.clientX || e.pageX) - p.x),
      y = Math.round((e.clientY || e.pageY) - p.y)

    return {
      x: x,
      y: y,
    }
  }

  function onMouseDown(e) {
    if (e.target.id === 'tempCanvas') {
      allowDraw = true
      addMode = e.ctrlKey
      downPoint = getMousePosition(e)
      drawMask(downPoint.x, downPoint.y)
    } else {
      allowDraw = false
      addMode = false
      oldMask = null
    }
  }

  function onMouseMove(e) {
    if (allowDraw) {
      var p = getMousePosition(e)
      if (p.x !== downPoint.x || p.y !== downPoint.y) {
        var dx = p.x - downPoint.x,
          dy = p.y - downPoint.y,
          len = Math.sqrt(dx * dx + dy * dy),
          adx = Math.abs(dx),
          ady = Math.abs(dy),
          sign = adx > ady ? dx / adx : dy / ady
        sign = sign < 0 ? sign / 5 : sign / 3
        var thres = Math.min(
          Math.max(colorThreshold + Math.floor(sign * len), 1),
          255
        )
        //var thres = Math.min(colorThreshold + Math.floor(len / 3), 255);
        if (thres !== currentThreshold) {
          currentThreshold = thres
          drawMask(downPoint.x, downPoint.y)
        }
      }
    }
  }

  function onMouseUp(e) {
    allowDraw = false
    addMode = false
    oldMask = null
    currentThreshold = colorThreshold
  }

  function onKeyDown(e) {
    if (e.keyCode === 17)
      document.getElementById('resultCanvas').classList.add('add-mode')
  }

  function onKeyUp(e) {
    if (e.keyCode === 17)
      document.getElementById('resultCanvas').classList.remove('add-mode')
  }

  function showThreshold() {
    document.getElementById('threshold').innerHTML =
      'Threshold: ' + currentThreshold
  }

  function drawMask(x, y) {
    if (!imageInfo) return

    showThreshold()

    var image = {
      data: imageInfo.data.data,
      width: imageInfo.width,
      height: imageInfo.height,
      bytes: 4,
    }
    if (addMode && !oldMask) {
      oldMask = mask
    }

    let old = oldMask ? oldMask.data : null

    mask = MagicWand.floodFill(image, x, y, currentThreshold, old, true)
    if (mask) mask = MagicWand.gaussBlurOnlyBorder(mask, blurRadius, old)

    if (addMode && oldMask) {
      mask = mask ? concatMasks(mask, oldMask) : oldMask
    }

    drawBorder()
  }

  function hatchTick() {
    hatchOffset = (hatchOffset + 1) % (hatchLength * 2)
    drawBorder(true)
  }

  function drawBorder(noBorder) {
    if (!mask) return

    var x,
      y,
      i,
      j,
      k,
      w = imageInfo.width,
      h = imageInfo.height,
      ctx = imageInfo.tempContext,
      imgData = ctx.createImageData(w, h),
      res = imgData.data

    if (!noBorder) cacheInd = MagicWand.getBorderIndices(mask)

    ctx.clearRect(0, 0, w, h)

    var len = cacheInd.length
    for (j = 0; j < len; j++) {
      i = cacheInd[j]
      x = i % w // calc x by index
      y = (i - x) / w // calc y by index
      k = (y * w + x) * 4
      if ((x + y + hatchOffset) % (hatchLength * 2) < hatchLength) {
        // detect hatch color
        res[k + 3] = 255 // black, change only alpha
      } else {
        res[k] = 255 // white
        res[k + 1] = 255
        res[k + 2] = 255
        res[k + 3] = 255
      }
    }
    // var tempCanvas = document.createElement('canvas')
    // var tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })
    // tempCanvas.width = imageInfo.width
    // tempCanvas.height = imageInfo.height
    // tempCtx.putImageData(imgData, 0, 0)
    // var image = new Image()
    // image.src = tempCanvas.toDataURL('image/png')
    // ctx.drawImage(image, 0, 0)
    ctx.putImageData(imgData, 0, 0)
  }

  function trace() {
    var cs = MagicWand.traceContours(mask)
    cs = MagicWand.simplifyContours(cs, simplifyTolerant, simplifyCount)

    mask = null

    // draw contours
    var ctx = imageInfo.context
    ctx.clearRect(0, 0, imageInfo.width, imageInfo.height)
    //inner
    ctx.beginPath()
    for (var i = 0; i < cs.length; i++) {
      if (!cs[i].inner) continue
      var ps = cs[i].points
      ctx.moveTo(ps[0].x, ps[0].y)
      for (var j = 1; j < ps.length; j++) {
        ctx.lineTo(ps[j].x, ps[j].y)
      }
    }
    ctx.strokeStyle = 'red'
    ctx.stroke()
    //outer
    ctx.beginPath()
    for (i = 0; i < cs.length; i++) {
      if (cs[i].inner) continue
      ps = cs[i].points
      ctx.moveTo(ps[0].x, ps[0].y)
      for (j = 1; j < ps.length; j++) {
        ctx.lineTo(ps[j].x, ps[j].y)
      }
    }
    ctx.strokeStyle = 'blue'
    ctx.stroke()
  }

  function paint(color, alpha) {
    if (!mask) {
      console.log('no mask')
      return
    }

    var rgba = hexToRgb(color, alpha)

    var x,
      y,
      data = mask.data,
      bounds = mask.bounds,
      maskW = mask.width,
      w = imageInfo.width,
      h = imageInfo.height,
      ctx = imageInfo.context,
      imgData = ctx.createImageData(w, h),
      tempContext = imageInfo.tempContext,
      res = imgData.data

    for (y = bounds.minY; y <= bounds.maxY; y++) {
      for (x = bounds.minX; x <= bounds.maxX; x++) {
        if (data[y * maskW + x] === 0) continue
        var k = (y * w + x) * 4
        res[k] = rgba[0]
        res[k + 1] = rgba[1]
        res[k + 2] = rgba[2]
        res[k + 3] = rgba[3]
      }
    }

    mask = null

    // ctx.putImageData(imgData, 0, 0)
    var tempCanvas = document.createElement('canvas')
    var tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })
    tempCanvas.width = imageInfo.width
    tempCanvas.height = imageInfo.height
    tempCtx.putImageData(imgData, 0, 0)
    var image = new Image()
    image.src = tempCanvas.toDataURL('image/png')
    tempContext.clearRect(0, 0, w, h)
    image.onload = function () {
      tempContext.drawImage(image, 0, 0)
    }
  }

  function hexToRgb(hex, alpha) {
    var int = parseInt(hex, 16)
    var r = (int >> 16) & 255
    var g = (int >> 8) & 255
    var b = int & 255

    return [r, g, b, Math.round(alpha * 255)]
  }

  function concatMasks(mask, old) {
    let data1 = old.data,
      data2 = mask.data,
      w1 = old.width,
      w2 = mask.width,
      b1 = old.bounds,
      b2 = mask.bounds,
      b = {
        // bounds for new mask
        minX: Math.min(b1.minX, b2.minX),
        minY: Math.min(b1.minY, b2.minY),
        maxX: Math.max(b1.maxX, b2.maxX),
        maxY: Math.max(b1.maxY, b2.maxY),
      },
      w = old.width, // size for new mask
      h = old.height,
      i,
      j,
      k,
      k1,
      k2,
      len

    let result = new Uint8Array(w * h)

    // copy all old mask
    len = b1.maxX - b1.minX + 1
    i = b1.minY * w + b1.minX
    k1 = b1.minY * w1 + b1.minX
    k2 = b1.maxY * w1 + b1.minX + 1
    // walk through rows (Y)
    for (k = k1; k < k2; k += w1) {
      result.set(data1.subarray(k, k + len), i) // copy row
      i += w
    }

    // copy new mask (only "black" pixels)
    len = b2.maxX - b2.minX + 1
    i = b2.minY * w + b2.minX
    k1 = b2.minY * w2 + b2.minX
    k2 = b2.maxY * w2 + b2.minX + 1
    // walk through rows (Y)
    for (k = k1; k < k2; k += w2) {
      // walk through cols (X)
      for (j = 0; j < len; j++) {
        if (data2[k + j] === 1) result[i + j] = 1
      }
      i += w
    }

    return {
      data: result,
      width: w,
      height: h,
      bounds: b,
    }
  }
  function reverse() {
    var x,
      y,
      k,
      w = imageInfo.width,
      h = imageInfo.height,
      data = mask.data,
      b = {
        // bounds for new mask
        minX: 0,
        minY: 0,
        maxX: w,
        maxY: h,
      }
    // walk through inner values except points on the boundary of the image
    for (y = 0; y < h; y++)
      for (x = 0; x < w; x++) {
        k = y * w + x
        if (data[k] === 0) data[k] = 1
        else data[k] = 0
      }
    mask = {
      // ...mask,
      data: data,
      width: w,
      height: h,
      bounds: b,
    }
    drawBorder()
  }

  function cutImage() {
    if (!mask) {
      console.log('no mask')
      return
    }

    var rgba = hexToRgb('FF0000', 1)

    var x,
      y,
      data = mask.data,
      bounds = mask.bounds,
      maskW = mask.width,
      w = imageInfo.width,
      h = imageInfo.height,
      ctx = imageInfo.context,
      imgData = ctx.createImageData(w, h),
      tempContext = imageInfo.tempContext,
      res = imgData.data

    for (y = bounds.minY; y <= bounds.maxY; y++) {
      for (x = bounds.minX; x <= bounds.maxX; x++) {
        if (data[y * maskW + x] === 0) continue
        var k = (y * w + x) * 4
        res[k] = rgba[0]
        res[k + 1] = rgba[1]
        res[k + 2] = rgba[2]
        res[k + 3] = rgba[3]
      }
    }

    mask = null

    // ctx.putImageData(imgData, 0, 0)
    var tempCanvas = document.createElement('canvas')
    var tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })
    tempCanvas.width = imageInfo.width
    tempCanvas.height = imageInfo.height
    tempCtx.putImageData(imgData, 0, 0)
    var image = new Image()
    image.src = tempCanvas.toDataURL('image/png')
    tempContext.clearRect(0, 0, w, h)
    image.onload = function () {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.drawImage(image, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
    }
  }

  function expandContour() {
    const { cv } = window
    // call the marching ants algorithm
    // to get the outline path of the image
    // (outline=outside path of transparent pixels
    if (cv) {
      var ctx = document.getElementById('resultCanvas')
      ctx.crossOrigin = 'anonymous'
      var src = cv.imread(ctx)
      let dst = new cv.Mat()
      let M = new cv.Mat()
      let ksize = new cv.Size(15, 15)
      M = cv.getStructuringElement(cv.MORPH_ELLIPSE, ksize)
      let anchor = new cv.Point(-1, -1)
      cv.dilate(
        src,
        dst,
        M,
        anchor,
        1,
        cv.BORDER_CONSTANT,
        cv.morphologyDefaultBorderValue()
      )
      cv.imshow('tempCanvas', dst)
    }
  }

  return (
    <div style={{ backgroundColor: 'yellow' }}>
      <div style={{ overflow: 'auto' }}>
        <div className="button" onClick={() => uploadClick()}>
          Upload image and click on it
        </div>
        <div className="button" onClick={() => trace()}>
          Create polygons by current selection
        </div>
        <div
          className="button"
          onClick={() => {
            paint('FF0000', 0.35)
          }}
        >
          Paint the selection
        </div>
        <div className="button" onClick={() => reverse()}>
          reverse the selection
        </div>
        <div className="button" onClick={() => cutImage()}>
          delete the selection
        </div>
        <div className="button" onClick={() => expandContour()}>
          expand Contour
        </div>
        <input
          id="file-upload"
          type="file"
          accept="image/*"
          onChange={(e) => imgChange(e)}
        />
      </div>
      <div style={{ overflow: 'auto' }}>
        <div style={{ float: 'left', marginRight: '10px' }}>Blur radius: </div>
        <input
          id="blurRadius"
          type="text"
          // onChange="onRadiusChange.apply(this, arguments)"
          style={{ float: 'left', width: '20px', marginRight: '10px' }}
        />
        <div id="threshold"></div>
      </div>
      <div>(hold left mouse button and move to change the color threshold)</div>
      <div>(hold the CTRL key to add selection)</div>
      <div className="wrapper">
        <div className="content">
          {/* <img id="test-picture" className="picture" alt="123" /> */}
          <canvas
            className="canvas"
            id="resultCanvas"
            // onMouseUp={(e) => onMouseUp(e)}
            // onMouseDown={(e) => onMouseDown(e)}
            // onMouseMove={(e) => onMouseMove(e)}
          ></canvas>
          <canvas
            className="canvas"
            id="tempCanvas"
            style={{ zIndex: '1' }}
            onMouseUp={(e) => onMouseUp(e)}
            onMouseDown={(e) => onMouseDown(e)}
            onMouseMove={(e) => onMouseMove(e)}
          ></canvas>
        </div>
      </div>
    </div>
  )
}

export default App
