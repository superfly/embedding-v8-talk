// async / await are great!
async function run() {
  const resp = await fetch("https://fly.io")
  console.log("got response:", {
    status: resp.status,
    size: resp.body.length
  })
}

run()