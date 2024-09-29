

document.addEventListener('DOMContentLoaded', function () {
    
    const socket = io()
    const term = new Terminal({
        convertEol: true,
        rows: 40,
        cols: 120,
        cursorBlink: true,
        allowProposedApi: true, 
        theme: {
            background: '#282c34'
        }
    })

    term.open(document.getElementById('terminal'))

    const webglAddon = new WebglAddon()
    term.loadAddon(webglAddon)
    const urlParams = new URLSearchParams(window.location.search)
    const serverId = urlParams.get('serverId')
  
    // Emit the 'startSession' event and pass the serverId to the server
    socket.emit('startSession', { serverId })
  
    // Listen for output from the server and display it in the terminal
    socket.on('output', (data) => {
      term.write(data)
    })
  
    // Send input from the terminal to the server
    term.onData((input) => {
      socket.emit('input', input)
    })
    if (webglAddon) {
        console.log('WebGL renderer initialized.')
    } else {
        console.log('WebGL renderer failed, falling back to default renderer.')
    }
})


