// setTimeout and setInterval don't exist in
// v8. In fact, they don't have much meaning 
// at all. Host programs (like browsers) control
// async JavaScript execution, and have to 
// implement any timer functionality they need.

function doMath(x, y) {
  return x * y
}
setTimeout(doMath, 100)