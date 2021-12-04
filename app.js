window.AudioContext = window.AudioContext || window.webkitAudioContext

let ctx
const oscillators = {}
let volume
let midiConnected

const startButton = document.querySelector('.start')
const slider = document.querySelector('.slider')
const pVolume = document.querySelector('.p-volume')
const pCon = document.querySelector('.connected')
volume = slider.value
pVolume.innerHTML = slider.value

slider.oninput = function() {
    volume = this.value
    pVolume.innerHTML = this.value
}

startButton.addEventListener('click', () => {
    ctx = new AudioContext()
})

function midiToFreq(numb) {
    const a = 440
    return (a / 32) * (2 ** ((numb -9) / 12))
}

if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(success, failure)
}

function success(midiAccess) {
    if (midiAccess.inputs.size === 0) {
        pCon.innerHTML = 'MIDI disabled, please plug MIDI controler and reload page!'
        midiConnected = false
        changeElements(false)
    } else {
        midiConnected = true
        changeElements(true)
    }

    midiAccess.addEventListener('statechange', updateDevices)

    const inputs = midiAccess.inputs
    inputs.forEach((input) => {
        input.addEventListener('midimessage', handleInput)
    })
}

function changeElements(value) {
    if (!value) {
        startButton.style.display = "none"
        slider.style.display = "none"
        pVolume.style.display = "none"
        pCon.style.display = "inline"
    } else {
        startButton.style.display = "inline"
        slider.style.display = "inline"
        pVolume.style.display = "inline"
        pCon.style.display = "none"
    }
}

function handleInput(input) {
    const command = input.data[0]
    const note = input.data[1]
    const velocity = input.data[2]

    switch (command) {
        case 144: // noteOn
            if (velocity > 0) {
                noteOn(note ,velocity)
            } else  {
                noteOff(note)
            }
            break
        case 128: // noteOff
            noteOff(note)
            break 
    }
}

function noteOn(note, velocity) {
    if (!ctx) return console.error('Not Started the program!')
    const osc = ctx.createOscillator()
    const oscGain = ctx.createGain()
    oscGain.gain.value = volume / 80

    const velocityGainAmount = (1 / 127) * velocity
    const velocityGain = ctx.createGain()
    velocityGain.gain.value = velocityGainAmount

    osc.type = 'sine'
    osc.frequency.value = midiToFreq(note)

    osc.connect(oscGain)
    oscGain.connect(velocityGain)
    velocityGain.connect(ctx.destination)

    osc.gain = oscGain
    oscillators[note.toString()] = osc
    osc.start()
}

function noteOff(note) {
    if (!ctx) return console.error('Not Started the program!')
    const osc = oscillators[note.toString()]
    const oscGain = osc.gain

    oscGain.gain.setValueAtTime(oscGain.gain.value, ctx.currentTime)
    oscGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03)

    setTimeout(() => {
        osc.stop()
        osc.disconnect()
    }, 20)

    delete oscillators[note.toString()]
}

// U can turn this ON by uncomment this (and 34 line)
function updateDevices(e) {
    console.log(e)
    if (e.port.type === "input" && e.port.state === "connected") {
        if(!midiConnected) {
            console.log('no connected')
            window.location.reload()
        }
        else {
            console.log('connected')
        }
    }
    else if (e.port.type === "input" && e.port.state === "disconnected") {
        console.log('rozłączono')
        window.location.reload()
    }
    // console.log(`Name: ${e.port.name}, Brand: ${e.port.manufacturer}, State: ${e.port.state}, Type: ${e.port.type}`)
}

function failure() {
    console.error('Could not connect to MIDI device')
}