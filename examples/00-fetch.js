// browsers implement a `fetch` method
// for making HTTP requests
fetch("https://fly.io").then(function (r) {
  console.log("got response:", {
    status: r.status,
    size: r.body.length
  })
})