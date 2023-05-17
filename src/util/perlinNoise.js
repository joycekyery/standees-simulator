//ref :https://dev.to/thormeier/create-useful-noise-patterns-with-academy-award-winning-ken-perlin-3fc6
export default function createPerlinNoise(width, height, gridSize) {
  const fade = (t) => 6 * t ** 5 - 15 * t ** 4 + 10 * t ** 3

  const lerp = (v0, v1, t) => {
    const max = Math.max(v0, v1)
    const min = Math.min(v0, v1)

    const before = `${v0}/${v1}`
    const after = `${min}/${max}`

    // The values don't always come in
    // v0 < v1, so we might need to invert t
    // if v0 > v1, to keep the formula
    // satisfied.
    if (before !== after) {
      t = 1 - t
    }

    return (max - min) * t + min
  }

  class Vector {
    constructor(x, y) {
      this.x = x
      this.y = y
    }

    timesScalar(s) {
      return new Vector(this.x * s, this.y * s)
    }

    plus(other) {
      return new Vector(this.x + other.x, this.y + other.y)
    }

    minus(other) {
      return new Vector(this.x - other.x, this.y - other.y)
    }

    scalarProduct(other) {
      return this.x * other.x + this.y * other.y
    }

    toString() {
      return `(${this.x}, ${this.y})`
    }
  }

  const getRandomGradientVectors = (width, height, gridSize) => {
    const possibleGradientVectors = [
      new Vector(1, 1),
      new Vector(-1, 1),
      new Vector(1, -1),
      new Vector(-1, -1),
    ]

    const gridCellsX = Math.ceil(width / gridSize) + 1
    const gridCellsY = Math.ceil(height / gridSize) + 1

    const gridCells = []

    for (let y = 0; y < gridCellsY; y++) {
      gridCells[y] = []
      for (let x = 0; x < gridCellsX; x++) {
        const gradientVector =
          possibleGradientVectors[Math.floor(Math.random() * 3)]

        gridCells[y].push(gradientVector)
      }
    }

    return gridCells
  }

  const getPerlinValue = (x, y, gridSize, gradientVectors) => {
    // Determine grid cell
    const gridCellX = Math.floor(x / gridSize)
    const gridCellY = Math.floor(y / gridSize)

    // Figure out gradient vectors of that grid cell
    const usedGradientVectors = {
      topLeft: gradientVectors[gridCellY][gridCellX],
      topRight: gradientVectors[gridCellY][gridCellX + 1],
      bottomLeft: gradientVectors[gridCellY + 1][gridCellX],
      bottomRight: gradientVectors[gridCellY + 1][gridCellX + 1],
    }

    // Vectors for the corners - we need these to determine
    // the distance vectors to the pixel from the corners.
    const unitCornerVectors = {
      topLeft: new Vector(0, 0),
      topRight: new Vector(1, 0),
      bottomLeft: new Vector(0, 1),
      bottomRight: new Vector(1, 1),
    }

    // The relative position of the pixel within the grid cell
    const relativePos = new Vector(
      (x % gridSize) / gridSize,
      (y % gridSize) / gridSize
    )

    // The distances of the corners to the pixel
    const distanceVectors = {
      topLeft: relativePos.minus(unitCornerVectors.topLeft),
      topRight: relativePos.minus(unitCornerVectors.topRight),
      bottomLeft: relativePos.minus(unitCornerVectors.bottomLeft),
      bottomRight: relativePos.minus(unitCornerVectors.bottomRight),
    }

    // The influence values we can later on lerp
    const influenceValues = {
      topLeft: usedGradientVectors.topLeft.scalarProduct(
        distanceVectors.topLeft
      ),
      topRight: usedGradientVectors.topRight.scalarProduct(
        distanceVectors.topRight
      ),
      bottomLeft: usedGradientVectors.bottomLeft.scalarProduct(
        distanceVectors.bottomLeft
      ),
      bottomRight: usedGradientVectors.bottomRight.scalarProduct(
        distanceVectors.bottomRight
      ),
    }

    // Fade and lerp
    const fadedX = fade(relativePos.x)
    const fadedY = fade(relativePos.y)

    const lerpedValue = lerp(
      lerp(influenceValues.topLeft, influenceValues.topRight, fadedX),
      lerp(influenceValues.bottomLeft, influenceValues.bottomRight, fadedX),
      fadedY
    )

    // Normalize the value
    return (1 + lerpedValue) / 2
  }

  const canvas = document.createElement('canvas')
  canvas.height = height
  canvas.width = width
  const paintGreyPixel = (canvas, x, y, grayScale) => {
    const context = canvas.getContext('2d')
    context.fillStyle = `rgba(0, 0, 0, ${grayScale})`

    context.fillRect(x, y, 1, 1)
  }

  const gradientVectors = getRandomGradientVectors(width, height, gridSize)

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      paintGreyPixel(
        canvas,
        x,
        y,
        getPerlinValue(x, y, gridSize, gradientVectors)
      )
    }
  }
  return canvas
}
