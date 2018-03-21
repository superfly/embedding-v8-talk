// async / await are great! And natively 
// supported in v8. Mostly.
async function run() {
  const resp = await fetch("https://fly.io")
  console.log("got response:", {
    status: resp.status,
    size: resp.body.length
  })
}

run()