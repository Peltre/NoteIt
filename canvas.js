// Mouse handler function
let captured = false

document.addEventListener('mousemove', (event) => {
    if (dragging) return // Handle mouse pointer escaping while dragging

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
let dragging = false

// Ability to drag post it notes and place them in any part of the screen
function makeDraggable(element, handle, onDrop) {
    let offsetX = 0
    let offsetY = 0

    // Select note to drag it around
    handle.addEventListener('pointerdown', (event) => {
        if (event.target.closest('button')) return // buttons are not draggable

        const rect = element.getBoundingClientRect()
        offsetX = event.clientX - rect.left
        offsetY = event.clientY - rect.top

        dragging = true
        element.style.transform = 'none'
        handle.setPointerCapture(event.pointerId)
    })

    // Move the note itself
    handle.addEventListener('pointermove', (event) => {
        if (!dragging) return
        element.style.left = (event.clientX - offsetX) + 'px'
        element.style.top = (event.clientY - offsetY) + 'px'
    })

    // stop dragging state
    handle.addEventListener('pointerup', () => {
        dragging = false
        if (onDrop) onDrop()
    })
}

// Save function in localStorage
function saveNotes() {
    const notes = [...canvas.querySelectorAll('.note')].map(note => ({
        x: parseInt(note.style.left),
        y: parseInt(note.style.top),
        text: note.querySelector('textarea').value
    }))
    window.api.saveNotes(notes)
}

// Function to create a note
function createNote(x, y, text = '') {
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

    // load initial text and save whenever the user types
    const textarea = note.querySelector('textarea')
    textarea.value = text
    textarea.addEventListener('input', saveNotes)

    // del note and save
    note.querySelector('.deleteNote').addEventListener('click', () => {
        note.remove()
        saveNotes()
    })

    makeDraggable(note, note.querySelector('.noteHeader'), saveNotes)
    canvas.appendChild(note)
    textarea.focus()
}

// New segmented function for adding notes (will be used for shortcuts)
function addNote() {
    noteCount++
    createNote(120 + noteCount * 30, 120 + noteCount * 30)
}

// Listener for the "+" sign in the master bar
addNoteBtn.addEventListener('click', addNote)

// Make masterBar draggable as well
const masterBar = document.querySelector('.masterBar')
makeDraggable(masterBar, masterBar)

// Visibility toggle logic
const toggleNotesBtn = document.getElementById('toggleNotes')
let notesVisible = true

function toggleNotes() {
    notesVisible = !notesVisible
    canvas.classList.toggle('notesHidden', !notesVisible)
    toggleNotesBtn.textContent = notesVisible ? '👁' : '-'
}

toggleNotesBtn.addEventListener('click', toggleNotes)

// global shortcut activation
window.api.onAddNote(addNote)
window.api.onToggleNotes(toggleNotes)

// Load on start
async function loadNotes() {
    const saved = await window.api.loadNotes()
    saved.forEach(n => createNote(n.x, n.y, n.text))
}

loadNotes()