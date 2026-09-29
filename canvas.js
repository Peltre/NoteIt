// Mouse handler function
let captured = false

document.addEventListener('mousemove', (event) => {
    const hoverInteractive = event.target.closest('.interactive') !== null

    if (hoverInteractive && !captured) {
        captured = true
        window.api.captureMouse()
    } else if (!hoverInteractive && captured) {
        captured = false
        window.api.breachMouse()
    }
})

// Creating post-it notes
const canvas = document.getElementById('canvas')
const addNoteBtn = document.getElementById('addNote')
let noteCount = 0

function createNote(x, y) {
    const note = document.createElement('div')
    note.className = 'note interactive'
    note.style.left = x + 'px'
    note.style.top = y + 'px'

    note.innerHTML = `
        <div class="noteHeader">
            <button class="deleteNote" title="Eliminar">✕</button>
        </div>
        <textarea placeholder="Escribe aquí..."></textarea>
    `

    note.querySelector('.deleteNote').addEventListener('click', () => {
        note.remove()
    })

    canvas.appendChild(note)
    note.querySelector('textarea').focus()
}

addNoteBtn.addEventListener('click', () => {
    noteCount++
    createNote(120 + noteCount * 30, 120 + noteCount * 30)
})